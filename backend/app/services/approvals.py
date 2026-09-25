"""Tamper-evident approvals.

Each approval stores a SHA-256 fingerprint of (entity, entity id, approver, decision, remark, time)
plus the fingerprint of the previous approval for the same record, so approvals of one record form a
small chain. Editing any saved approval later breaks its fingerprint (see verify_approvals).
"""
import hashlib
import json
from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Approval

GENESIS = "0" * 64


def approval_hash(entity: str, entity_id: int, approver_id: int, decision: str, remark: str | None,
                  created_at: datetime, prev_hash: str) -> str:
    payload = json.dumps({"entity": entity, "entity_id": entity_id, "approver_id": approver_id,
                          "decision": decision, "remark": remark or "",
                          "created_at": created_at.isoformat(timespec="seconds"), "prev": prev_hash},
                         sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def history(db: Session, entity: str, entity_id: int) -> list[Approval]:
    return list(db.scalars(select(Approval).where(Approval.entity == entity, Approval.entity_id == entity_id)
                           .order_by(Approval.created_at, Approval.id)))


def record_approval(db: Session, entity: str, entity_id: int, approver_id: int, decision: str,
                    remark: str | None, created_at: datetime) -> Approval:
    previous = history(db, entity, entity_id)
    prev_hash = previous[-1].hash if previous else GENESIS
    approval = Approval(entity=entity, entity_id=entity_id, approver_id=approver_id, decision=decision,
                        remark=remark, created_at=created_at.replace(microsecond=0),
                        hash=approval_hash(entity, entity_id, approver_id, decision, remark,
                                           created_at.replace(microsecond=0), prev_hash))
    db.add(approval)
    db.flush()
    return approval


def verify_approvals(approvals: list[Approval]) -> bool:
    """True if every fingerprint in this record's approval chain still matches."""
    prev = GENESIS
    for a in approvals:
        if a.hash != approval_hash(a.entity, a.entity_id, a.approver_id, a.decision, a.remark, a.created_at, prev):
            return False
        prev = a.hash
    return True
