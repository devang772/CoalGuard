"""Escalation rules and background jobs (status + "Run now" for demos)."""
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import require_roles
from app.config import settings
from app.constants import Role
from app.db import get_db
from app.models import EscalationRule, User
from app.services import scheduler
from app.services.jobs import JOBS

router = APIRouter(tags=["Admin: escalation & jobs"])

RULE_VIEWERS = (Role.MINE_MANAGER, Role.AREA_GM, Role.SUBSIDIARY_ADMIN, Role.CIL_ADMIN, Role.REGULATOR)
JOB_RUNNERS = (Role.SUBSIDIARY_ADMIN, Role.CIL_ADMIN)
LADDER_ORDER = [Role.MINE_MANAGER, Role.AREA_GM, Role.SUBSIDIARY_ADMIN, Role.CIL_ADMIN]


class RuleIn(BaseModel):
    severity: Literal["low", "medium", "high", "critical"]
    sla_hours: int = Field(ge=1, le=2000, description="hours to fix")
    reminder_hours: list[int] = Field(default=[], description="remind this many hours before the deadline")
    levels: list[str] = Field(description="escalation ladder, starting with mine_manager")

    @model_validator(mode="after")
    def check(self):
        if any(h <= 0 or h >= self.sla_hours for h in self.reminder_hours):
            raise ValueError("each reminder must be more than 0 and less than sla_hours")
        if not 2 <= len(self.levels) <= 4 or self.levels[0] != Role.MINE_MANAGER:
            raise ValueError("levels must have 2-4 roles and start with mine_manager")
        positions = [LADDER_ORDER.index(r) if r in LADDER_ORDER else -1 for r in self.levels]
        if -1 in positions or positions != sorted(set(positions)):
            raise ValueError(f"levels must go upward in this order without repeats: {', '.join(LADDER_ORDER)}")
        return self


class RulesIn(BaseModel):
    rules: list[RuleIn]

    @model_validator(mode="after")
    def all_severities(self):
        if sorted(r.severity for r in self.rules) != ["critical", "high", "low", "medium"]:
            raise ValueError("send exactly one rule for each severity: low, medium, high, critical")
        return self


def _rules_out(db: Session) -> list[dict]:
    order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    rows = sorted(db.scalars(select(EscalationRule)), key=lambda r: order.get(r.severity, 9))
    return [{"severity": r.severity, "sla_hours": r.sla_hours, "reminder_hours": r.reminder_hours or [],
             "levels": r.levels} for r in rows]


@router.get("/config/escalation")
def get_rules(user: User = Depends(require_roles(*RULE_VIEWERS)), db: Session = Depends(get_db)):
    """Hours to fix, reminder times and the escalation ladder for each severity."""
    return _rules_out(db)


@router.put("/config/escalation")
def put_rules(body: RulesIn, user: User = Depends(require_roles(Role.CIL_ADMIN)), db: Session = Depends(get_db)):
    """Replace the escalation rules (CIL admin only: the rules apply to every mine). New deadlines apply to
    CAPAs created from now on; the ladder and reminders apply to all open items. Changes are audited."""
    existing = {r.severity: r for r in db.scalars(select(EscalationRule))}
    for rule in body.rules:
        row = existing.get(rule.severity) or EscalationRule(severity=rule.severity)
        row.sla_hours = rule.sla_hours
        row.reminder_hours = sorted(set(rule.reminder_hours), reverse=True)
        row.levels = rule.levels
        db.add(row)
    db.commit()
    return _rules_out(db)


@router.get("/jobs/status")
def jobs_status(user: User = Depends(require_roles(*RULE_VIEWERS))):
    """When each background job last ran, what it did, and when it runs next."""
    upcoming = scheduler.next_runs()
    return {"scheduler_running": scheduler.running(), "demo_time_speed": settings.demo_time_speed,
            "jobs": {name: {**info, "next_run": upcoming.get(name)} for name, info in scheduler.status.items()}}


@router.post("/jobs/run")
def run_now(job: Literal["nightly", "reminders", "escalation", "digest"] = Query(...),
            user: User = Depends(require_roles(*JOB_RUNNERS))):
    """Run a job immediately (handy in demos: press after creating an overdue CAPA)."""
    if job not in JOBS:
        raise HTTPException(status_code=404, detail="Unknown job.")
    return {"job": job, "result": scheduler.run_job(job)}
