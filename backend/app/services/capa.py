"""CAPA (fix-it ticket) rules: automatic creation from a finding, owner, deadline, closure checks."""
import importlib
import logging
from concurrent.futures import ThreadPoolExecutor
from concurrent.futures import TimeoutError as FutureTimeout
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.constants import Role
from app.models import Capa, EscalationRule, Evidence, Finding, User
from app.services.geo import distance_m, format_distance
from app.services.proof import phash_distance
from app.utils import utcnow

log = logging.getLogger(__name__)
_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="ml-photo")

DEFAULT_SLA_HOURS = {"critical": 24, "high": 72, "medium": 168, "low": 360}
AFTER_PHOTO_REQUIRED = ("high", "critical")


def sla_hours(db: Session, severity: str) -> int:
    rule = db.scalar(select(EscalationRule).where(EscalationRule.severity == severity))
    return rule.sla_hours if rule else DEFAULT_SLA_HOURS.get(severity, 168)


def default_owner(db: Session, mine_id: int) -> int | None:
    """The mine manager of the mine (first one if several)."""
    return db.scalar(select(User.id).where(User.org_unit_id == mine_id, User.role == Role.MINE_MANAGER,
                                           User.is_active.is_(True)).order_by(User.id))


def create_capa_for_finding(db: Session, finding: Finding) -> Capa:
    capa = Capa(finding_id=finding.id, mine_id=finding.mine_id, owner_id=default_owner(db, finding.mine_id),
                due_at=finding.created_at + timedelta(hours=sla_hours(db, finding.severity)), status="open")
    db.add(capa)
    db.flush()
    return capa


def _ai_hazard_check(before: Evidence | None, after: Evidence, finding: Finding) -> dict | None:
    """Optional: the ML teammate's app.ai.photo_check.verify_hazard_gone(before_path, after_path, finding_text).
    Skipped (None) when it is missing, fails, is slow, or a photo file is not available."""
    from app.services.evidence import file_on_disk
    try:
        fn = getattr(importlib.import_module("app.ai.photo_check"), "verify_hazard_gone", None)
    except ImportError:
        return None
    before_path = file_on_disk(before) if before else None
    after_path = file_on_disk(after)
    if fn is None or before_path is None or after_path is None:
        return None
    try:
        result = _executor.submit(fn, str(before_path), str(after_path), finding.description).result(
            timeout=settings.ml_timeout_seconds)
        gone = bool(result["hazard_gone"])
    except (FutureTimeout, Exception):  # noqa: BLE001 - the AI check must never block a closure
        log.exception("AI hazard check failed; skipped")
        return None
    return {"name": "AI: hazard no longer visible", "passed": gone,
            "detail": result.get("explanation") or ("The problem is not visible any more." if gone
                                                    else "The problem still seems visible in the after-photo.")}


def closure_checks(db: Session, capa: Capa, after: Evidence | None) -> list[dict]:
    """Satya Proof before/after checks, run when a fix is submitted with an after-photo.
    Any failed check -> the CAPA is rejected automatically; all passed -> it goes to review."""
    if after is None:
        return []
    finding = db.get(Finding, capa.finding_id)
    before = db.get(Evidence, finding.photo_evidence_id) if finding.photo_evidence_id else None
    checks = []

    # 1. same place as the before-photo (or the finding's location)
    ref_lat = before.lat if before and before.lat is not None else finding.lat
    ref_lng = before.lng if before and before.lng is not None else finding.lng
    if after.lat is None or after.lng is None:
        checks.append({"name": "Same location", "passed": False, "detail": "The after-photo has no GPS location."})
    elif ref_lat is None or ref_lng is None:
        checks.append({"name": "Same location", "passed": True, "detail": "No reference location to compare with."})
    else:
        gap = distance_m(ref_lat, ref_lng, after.lat, after.lng)
        limit = settings.closure_max_distance_m
        checks.append({"name": "Same location", "passed": gap <= limit,
                       "detail": f"{format_distance(gap)} from the before-photo" + ("" if gap <= limit else
                                                                                   f" (limit {round(limit)} m)")})

    # 2. a new photo, not an old one and not the before-photo again
    look_alike = phash_distance(before.phash, after.phash) if before is not None else None
    same_as_before = before is not None and (
        before.sha256 == after.sha256
        or (look_alike is not None and look_alike <= settings.similar_photo_distance))
    reused = "reused_photo" in (after.flags or [])
    checks.append({"name": "Fresh photo (not reused)", "passed": not (same_as_before or reused),
                   "detail": "The before-photo was uploaded again." if same_as_before else
                   "Matches a photo uploaded earlier." if reused else "No match with older photos."})

    # 3. taken after the problem was reported
    taken = after.device_time or after.server_time
    after_report = taken >= finding.created_at - timedelta(minutes=5)
    checks.append({"name": "Taken after the problem was reported", "passed": after_report,
                   "detail": "Yes." if after_report else "The after-photo is older than the finding."})

    # 4. overall trust of the after-photo
    trust = after.trust_score or 0
    checks.append({"name": "Trust score", "passed": trust >= settings.closure_min_trust,
                   "detail": f"{trust} (minimum {settings.closure_min_trust})"})

    # 5. optional AI check from the ML teammate
    ai = _ai_hazard_check(before, after, finding)
    if ai is not None:
        checks.append(ai)
    return checks


def is_overdue(capa: Capa) -> bool:
    return capa.status in ("open", "rejected") and capa.due_at < utcnow()
