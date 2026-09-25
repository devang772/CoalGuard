"""Command dashboard, mine dashboard and leaderboard."""
from datetime import timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import require_roles, scope_mine_ids
from app.constants import Role
from app.db import get_db
from app.deps import get_mine_in_scope
from app.models import Capa, Contractor, Finding, Observation, User
from app.routers.contractors import _contractor_rows
from app.routers.observations import rows as observation_rows
from app.services import dashboard
from app.services.mines import mine_summaries
from app.services.tasks import compliance_stats
from app.utils import today_ist, utcnow

router = APIRouter(prefix="/dashboard", tags=["Dashboards"])

DASHBOARD_ROLES = (Role.SUPERVISOR, Role.SAFETY_OFFICER, Role.MINE_MANAGER, Role.AREA_GM, Role.SUBSIDIARY_ADMIN,
                   Role.CIL_ADMIN, Role.REGULATOR)
MONTH = Query(None, pattern=r"^\d{4}-(0[1-9]|1[0-2])$", description="YYYY-MM, default: this month")


@router.get("/summary")
def command_summary(org_id: int | None = None, user: User = Depends(require_roles(*DASHBOARD_ROLES)),
                    db: Session = Depends(get_db)):
    """Everything for the main dashboard: KPI cards (with the previous 30 days to compare), charts,
    top risky mines and the viewer's latest alerts. Scoped to the user's area (?org_id narrows it)."""
    return dashboard.summary(db, scope_mine_ids(db, user, org_id=org_id), user.id)


@router.get("/mine/{mine_id}")
def mine_dashboard(mine_id: int, days: int = Query(60, ge=7, le=180),
                   user: User = Depends(require_roles(*DASHBOARD_ROLES)), db: Session = Depends(get_db)):
    """One mine: summary + risk reasons, compliance by category, production vs dispatch (suspicious days marked),
    PM10 with the legal limit, open CAPAs, recent field reports and the contractors with the lowest scores."""
    get_mine_in_scope(db, user, mine_id)
    today = today_ist()
    open_capas = db.execute(select(Capa, Finding).join(Finding, Finding.id == Capa.finding_id)
                            .where(Capa.mine_id == mine_id, Capa.status.in_(["open", "rejected", "in_review"]))
                            .order_by(Capa.due_at).limit(10)).all()
    now = utcnow()
    recent = list(db.scalars(select(Observation).where(Observation.mine_id == mine_id)
                             .order_by(Observation.created_at.desc()).limit(10)))
    contractors = _contractor_rows(db, list(db.scalars(select(Contractor).where(Contractor.mine_id == mine_id))))
    for c in contractors:
        c.pop("_alerts")
    return {
        "mine": mine_summaries(db, [mine_id])[0],
        "compliance_30d": compliance_stats(db, [mine_id], today - timedelta(days=30), today),
        **dashboard.mine_series(db, mine_id, days),
        "open_capas": [{"id": c.id, "status": c.status, "severity": f.severity, "category": f.category,
                        "description": f.description, "due_at": c.due_at, "overdue": c.status != "in_review" and c.due_at < now,
                        "escalation_level": c.escalation_level} for c, f in open_capas],
        "recent_observations": observation_rows(db, recent),
        "contractors": sorted(contractors, key=lambda c: c["score"])[:5],
    }


@router.get("/leaderboard")
def leaderboard(month: str | None = MONTH, by: Literal["mine", "subsidiary"] = "mine", org_id: int | None = None,
                user: User = Depends(require_roles(*DASHBOARD_ROLES)), db: Session = Depends(get_db)):
    """Mines (or subsidiaries) ranked by Mine Safety Score (0-100) for a month, with the change vs last month.
    Score = 40% compliance + 25% CAPAs closed on time + 10% photo trust + (25 - 8 per incident) - 2 per overdue
    CAPA (max 10). Each mine row includes the breakdown."""
    mine_ids = scope_mine_ids(db, user, org_id=org_id)
    if not mine_ids:
        raise HTTPException(status_code=404, detail="No mines in this scope.")
    month = month or today_ist().strftime("%Y-%m")
    return {"month": month, "by": by, "rows": dashboard.leaderboard(db, mine_ids, month, by)}
