"""Tamper-proof history (audit chain).

Every create / update / delete of an important record is written to `audit_logs` automatically
(SQLAlchemy after_flush hook). Each entry's hash = SHA-256(previous entry's hash + this entry's content),
so entries form a chain: changing or deleting any entry breaks every hash after it.

verify_chain() also compares each record's CURRENT row with its last recorded snapshot, which catches
edits made directly in the database (outside the app).
"""
import hashlib
import json
from datetime import date, datetime

from sqlalchemy import event, insert, inspect, select, text
from sqlalchemy.orm import Session

from app import models
from app.models import AuditLog
from app.utils import utcnow

GENESIS = "0" * 64
SKIP_FIELDS = {"password_hash"}

# Tables whose changes are recorded (sensor readings and notifications are not)
AUDITED = (models.OrgUnit, models.User, models.MineProfile, models.Obligation, models.MineObligation,
           models.ComplianceTask, models.Checklist, models.Inspection, models.Finding, models.Capa, models.Approval,
           models.Evidence, models.Observation, models.Grievance, models.Contractor, models.Worker,
           models.Attendance, models.ProductionLog, models.EscalationRule, models.ReportLog)
AUDITED_BY_TABLE = {m.__tablename__: m for m in AUDITED}


def _json_value(value):
    if isinstance(value, datetime):
        return value.replace(microsecond=0).isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return value


def snapshot(obj) -> dict:
    mapper = inspect(obj).mapper
    return {attr.key: _json_value(getattr(obj, attr.key))
            for attr in mapper.column_attrs if attr.key not in SKIP_FIELDS}


def canonical(data: dict) -> str:
    return json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False, default=str)


def entry_hash(prev_hash: str, table_name: str, record_id: int, action: str, user_id: int | None,
               created_at: datetime, data: str) -> str:
    body = "|".join([prev_hash, table_name, str(record_id), action, str(user_id or ""),
                     created_at.replace(microsecond=0).isoformat(), data])
    return hashlib.sha256(body.encode("utf-8")).hexdigest()


def _mine_of(obj, data: dict) -> int | None:
    if isinstance(obj, models.OrgUnit):
        return obj.id if obj.type == "mine" else None
    if isinstance(obj, models.User):
        return data.get("org_unit_id")
    return data.get("mine_id")


def append_entries(connection, entries: list[dict]) -> None:
    """Chain and insert entries: [{table_name, record_id, action, user_id, mine_id, data(dict)}]."""
    if not entries:
        return
    if connection.dialect.name == "postgresql":
        connection.execute(text("SELECT pg_advisory_xact_lock(727274)"))     # one writer at a time
    prev = connection.execute(select(AuditLog.hash).order_by(AuditLog.id.desc()).limit(1)).scalar() or GENESIS
    now = utcnow().replace(microsecond=0)
    rows = []
    for e in entries:
        data = canonical(e["data"])
        digest = entry_hash(prev, e["table_name"], e["record_id"], e["action"], e["user_id"], now, data)
        rows.append({"table_name": e["table_name"], "record_id": e["record_id"], "action": e["action"],
                     "user_id": e["user_id"], "mine_id": e["mine_id"], "data": data, "prev_hash": prev,
                     "hash": digest, "created_at": now})
        prev = digest
    connection.execute(insert(AuditLog.__table__), rows)


@event.listens_for(Session, "after_flush")
def _record_changes(session: Session, flush_context) -> None:
    user_id = session.info.get("user_id")
    entries = []
    for action, objects in (("create", session.new), ("update", session.dirty), ("delete", session.deleted)):
        for obj in objects:
            if not isinstance(obj, AUDITED):
                continue
            if action == "update" and not session.is_modified(obj, include_collections=False):
                continue
            data = snapshot(obj)
            entries.append({"table_name": obj.__tablename__, "record_id": data.get("id"), "action": action,
                            "user_id": user_id, "mine_id": _mine_of(obj, data), "data": data})
    entries.sort(key=lambda e: (e["table_name"], e["record_id"] or 0))
    append_entries(session.connection(), entries)


# ---------------------------------------------------------------- verification & history

def verify_chain(db: Session, mine_ids: set[int] | None = None, max_mismatches: int = 20) -> dict:
    total, prev, broken = 0, GENESIS, None
    latest: dict[tuple[str, int], AuditLog] = {}
    for entry in db.scalars(select(AuditLog).order_by(AuditLog.id)).yield_per(1000):
        total += 1
        expected = entry_hash(prev, entry.table_name, entry.record_id, entry.action, entry.user_id,
                              entry.created_at, entry.data)
        if broken is None and (entry.prev_hash != prev or entry.hash != expected):
            broken = {"id": entry.id, "table_name": entry.table_name, "record_id": entry.record_id,
                      "action": entry.action, "created_at": entry.created_at,
                      "problem": "History entry was changed or an entry before it was removed."}
        prev = entry.hash
        if entry.table_name in AUDITED_BY_TABLE:
            latest[(entry.table_name, entry.record_id)] = entry

    mismatches, checked = [], 0
    for (table_name, record_id), entry in latest.items():
        if mine_ids is not None and entry.mine_id not in mine_ids:
            continue
        checked += 1
        recorded = json.loads(entry.data)
        current = db.get(AUDITED_BY_TABLE[table_name], record_id)
        if entry.action == "delete":
            if current is not None:
                mismatches.append({"table_name": table_name, "record_id": record_id,
                                   "problem": "Record was deleted in the app but exists again.", "fields": []})
        elif current is None:
            mismatches.append({"table_name": table_name, "record_id": record_id,
                               "problem": "Record was deleted outside the app.", "fields": []})
        else:
            now_data = json.loads(canonical(snapshot(current)))
            changed = sorted(k for k in set(recorded) | set(now_data) if recorded.get(k) != now_data.get(k))
            if changed:
                mismatches.append({"table_name": table_name, "record_id": record_id,
                                   "problem": "Record was changed outside the app.", "fields": changed})
        if len(mismatches) >= max_mismatches:
            break
    return {"ok": broken is None and not mismatches, "chain_ok": broken is None, "total_entries": total,
            "head_hash": prev if total else None, "broken_at": broken, "records_checked": checked,
            "records_changed_outside_app": mismatches, "checked_at": utcnow()}


def record_history(db: Session, table_name: str, record_id: int) -> list[dict]:
    entries = list(db.scalars(select(AuditLog).where(AuditLog.table_name == table_name,
                                                     AuditLog.record_id == record_id).order_by(AuditLog.id)))
    names = dict(db.execute(select(models.User.id, models.User.name).where(
        models.User.id.in_({e.user_id for e in entries if e.user_id}))).all())
    result, previous = [], {}
    for e in entries:
        data = json.loads(e.data)
        changed = sorted(k for k in set(data) | set(previous) if data.get(k) != previous.get(k)) \
            if e.action == "update" else []
        result.append({"id": e.id, "action": e.action, "user_id": e.user_id, "user_name": names.get(e.user_id),
                       "created_at": e.created_at, "changed_fields": changed,
                       "before": {k: previous.get(k) for k in changed} if changed else None,
                       "data": data, "hash": e.hash, "prev_hash": e.prev_hash})
        previous = data
    return result
