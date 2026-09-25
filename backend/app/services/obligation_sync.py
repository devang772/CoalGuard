"""Mine profile -> applicable obligations -> tasks.

1. Ask the ML engine (app.ai.obligation_engine.recommend_obligations) which obligations apply.
   If it is missing, raises, returns junk, or takes longer than settings.ml_timeout_seconds,
   use the fallback matcher (app.services.applicability) on the rule catalogue.
2. Update the mine's links carefully:
   new -> active · no longer recommended -> inactive (future tasks removed) ·
   manager's "not_applicable" decisions are always kept.
3. Create the current-period tasks.
"""
import importlib
import logging
from concurrent.futures import ThreadPoolExecutor
from concurrent.futures import TimeoutError as FutureTimeout
from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.constants import Category, Frequency, Severity
from app.models import MineObligation, MineProfile, Obligation
from app.services.applicability import fallback_recommend, profile_to_dict
from app.services.tasks import DATE_FIELDS, generate_tasks, remove_future_tasks

log = logging.getLogger(__name__)
_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="ml-engine")

_REQUIRED = ("code", "title", "category", "frequency", "severity")


@dataclass
class SyncResult:
    source: str                                   # ml_engine / rules_fallback
    added: list[str] = field(default_factory=list)
    removed: list[str] = field(default_factory=list)
    kept_not_applicable: list[str] = field(default_factory=list)
    unchanged: int = 0
    tasks_created: int = 0
    tasks_removed: int = 0
    note: str | None = None

    def as_dict(self) -> dict:
        return self.__dict__.copy()


def _load_ml_engine():
    try:
        module = importlib.import_module("app.ai.obligation_engine")
    except ImportError:
        return None
    return getattr(module, "recommend_obligations", None)


def _valid_ml_item(item) -> bool:
    return (isinstance(item, dict) and all(item.get(k) for k in _REQUIRED)
            and item["category"] in Category.ALL and item["frequency"] in Frequency.ALL
            and item["severity"] in Severity.ALL)


def _ask_ml_engine(profile: dict) -> tuple[list[dict] | None, str | None]:
    """(items, None) on success, (None, reason) when the fallback must be used."""
    engine_fn = _load_ml_engine()
    if engine_fn is None:
        return None, "ML engine not installed yet; used the built-in rule matcher."
    try:
        items = _executor.submit(engine_fn, dict(profile)).result(timeout=settings.ml_timeout_seconds)
    except FutureTimeout:
        log.warning("ML obligation engine timed out after %ss", settings.ml_timeout_seconds)
        return None, "ML engine took too long; used the built-in rule matcher."
    except Exception:  # noqa: BLE001 - any engine failure must not break the save
        log.exception("ML obligation engine failed")
        return None, "ML engine failed; used the built-in rule matcher."
    if not isinstance(items, list):
        return None, "ML engine returned an invalid answer; used the built-in rule matcher."
    good = [i for i in items if _valid_ml_item(i)]
    if len(good) < len(items):
        log.warning("Dropped %d invalid items from the ML engine", len(items) - len(good))
    return good, None


def _valid_due_rule(rule) -> dict | None:
    """Optional date-based due date from the ML engine, e.g. {"field": "cto_valid_till", "days_before": 90}."""
    if not isinstance(rule, dict) or rule.get("field") not in DATE_FIELDS:
        return None
    days = rule.get("days_before", 0)
    if not isinstance(days, int) or not 0 <= days <= 730:
        return None
    return {"field": rule["field"], "days_before": days}


def _upsert_ml_obligations(db: Session, items: list[dict]) -> list[dict]:
    """Store ML obligations in the catalogue (by code) and return recommendations with ids."""
    by_code = {o.code: o for o in db.scalars(select(Obligation).where(
        Obligation.code.in_([i["code"] for i in items])))}
    recommendations = []
    for item in items:
        ob = by_code.get(item["code"])
        if ob is None:
            ob = Obligation(code=item["code"], status="approved", created_by_ai=True)
            db.add(ob)
            by_code[item["code"]] = ob
        ob.source = "ml_engine"
        ob.title = str(item["title"])[:300]
        ob.law_ref = str(item.get("law_ref") or "Not specified")[:200]
        ob.category, ob.frequency, ob.severity = item["category"], item["frequency"], item["severity"]
        ob.evidence_needed = item.get("evidence_needed") or ""
        ob.source_text = item.get("source_text")
        ob.due_rule = _valid_due_rule(item.get("due_rule"))
        db.flush()
        confidence = item.get("confidence", 1.0)
        recommendations.append({
            "obligation_id": ob.id, "code": ob.code, "reason": item.get("reason") or "Recommended by the ML engine.",
            "confidence": float(confidence) if isinstance(confidence, (int, float)) else 1.0,
            "source": "ml_engine"})
    return recommendations


def recommend(db: Session, profile: dict) -> tuple[list[dict], str, str | None]:
    items, note = _ask_ml_engine(profile)
    if items is not None:
        return _upsert_ml_obligations(db, items), "ml_engine", None
    catalogue = db.scalars(select(Obligation).where(Obligation.status == "approved",
                                                    Obligation.source != "ml_engine"))
    return fallback_recommend(catalogue, profile), "rules_fallback", note


def sync_mine_obligations(db: Session, profile: MineProfile) -> SyncResult:
    recommendations, source, note = recommend(db, profile_to_dict(profile))
    result = SyncResult(source=source, note=note)
    links = {link.obligation_id: link for link in db.scalars(
        select(MineObligation).where(MineObligation.mine_id == profile.mine_id))}
    codes = dict(db.execute(select(Obligation.id, Obligation.code).where(
        Obligation.id.in_(set(links) | {r["obligation_id"] for r in recommendations}))).all())

    recommended_ids = set()
    for rec in recommendations:
        recommended_ids.add(rec["obligation_id"])
        link = links.get(rec["obligation_id"])
        if link is None:
            db.add(MineObligation(mine_id=profile.mine_id, obligation_id=rec["obligation_id"], status="active",
                                  reason=rec["reason"], confidence=rec["confidence"], source=rec["source"]))
            result.added.append(codes.get(rec["obligation_id"]) or str(rec["obligation_id"]))
            continue
        link.reason, link.confidence, link.source = rec["reason"], rec["confidence"], rec["source"]
        if link.status == "not_applicable":
            result.kept_not_applicable.append(codes.get(link.obligation_id) or str(link.obligation_id))
        elif link.status == "inactive":
            link.status = "active"
            result.added.append(codes.get(link.obligation_id) or str(link.obligation_id))
        else:
            result.unchanged += 1

    dropped = [link for oid, link in links.items() if oid not in recommended_ids and link.status == "active"]
    for link in dropped:
        link.status = "inactive"
        link.reason = "No longer applies to the current mine profile."
        result.removed.append(codes.get(link.obligation_id) or str(link.obligation_id))
    db.flush()
    result.tasks_removed = remove_future_tasks(db, profile.mine_id, [link.obligation_id for link in dropped])
    result.tasks_created = generate_tasks(db, [profile.mine_id])
    return result
