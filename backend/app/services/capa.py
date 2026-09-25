"""CAPA (fix-it ticket) rules: automatic creation from a finding, owner, deadline, closure."""
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.constants import Role
from app.models import Capa, EscalationRule, Evidence, Finding, User
from app.utils import utcnow

DEFAULT_SLA_HOURS = {"critical": 24, "high": 72, "medium": 168, "low": 360}


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


def closure_checks(db: Session, capa: Capa, after: Evidence | None) -> list[dict]:
    """Automatic checks run when a fix is submitted. Module 5 (Satya Proof) fills this in
    (same location, fresh photo, trust score, hazard gone); for now there are none."""
    return []


def is_overdue(capa: Capa) -> bool:
    return capa.status in ("open", "rejected") and capa.due_at < utcnow()
