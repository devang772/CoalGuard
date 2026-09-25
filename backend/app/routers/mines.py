"""Mines, mine profile, applicable obligations, compliance calendar and compliance %."""
from collections import defaultdict
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_roles, scope_mine_ids
from app.constants import Role
from app.db import get_db
from app.deps import get_mine_in_scope
from app.models import ComplianceTask, MineObligation, MineProfile, Obligation, User
from app.schemas import (CalendarDay, ComplianceOut, MineDetail, MineObligationOut, MineObligationUpdate,
                         MineProfileIn, MineProfileOut, MineSummary, ObligationOut, ProfileSaveResponse)
from app.services.mines import mine_summaries
from app.services.obligation_sync import sync_mine_obligations
from app.services.tasks import compliance_stats, generate_tasks, remove_future_tasks
from app.utils import today_ist, utcnow

router = APIRouter(tags=["Mines & Compliance"])

PROFILE_EDITORS = (Role.MINE_MANAGER, Role.SUBSIDIARY_ADMIN, Role.CIL_ADMIN)
OBLIGATION_DECIDERS = (Role.MINE_MANAGER, Role.AREA_GM, Role.SUBSIDIARY_ADMIN, Role.CIL_ADMIN)


# ---------------------------------------------------------------- mines

@router.get("/mines", response_model=list[MineSummary])
def list_mines(org_id: int | None = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Mines in the user's area with compliance % (last 30 days), overdue tasks, open CAPAs and risk."""
    return mine_summaries(db, scope_mine_ids(db, user, org_id=org_id))


@router.get("/mines/{mine_id}", response_model=MineDetail)
def mine_detail(mine_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    get_mine_in_scope(db, user, mine_id)
    summary = mine_summaries(db, [mine_id])[0]
    summary["profile_filled"] = db.scalar(select(MineProfile.id).where(MineProfile.mine_id == mine_id)) is not None
    return summary


# ---------------------------------------------------------------- profile

@router.get("/mines/{mine_id}/profile", response_model=MineProfileOut)
def get_profile(mine_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    get_mine_in_scope(db, user, mine_id)
    profile = db.scalar(select(MineProfile).where(MineProfile.mine_id == mine_id))
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mine profile not filled yet.")
    return profile


@router.put("/mines/{mine_id}/profile", response_model=ProfileSaveResponse)
def save_profile(mine_id: int, body: MineProfileIn, user: User = Depends(require_roles(*PROFILE_EDITORS)),
                 db: Session = Depends(get_db)):
    """Create or update the mine profile. The ML engine (or the fallback matcher) then decides which
    obligations apply, the mine's obligation list is updated and the current tasks are created."""
    get_mine_in_scope(db, user, mine_id)
    profile = db.scalar(select(MineProfile).where(MineProfile.mine_id == mine_id))
    if profile is None:
        profile = MineProfile(mine_id=mine_id)
        db.add(profile)
    for field, value in body.model_dump().items():
        setattr(profile, field, value)
    profile.updated_by = user.id
    profile.updated_at = utcnow()
    db.flush()
    result = sync_mine_obligations(db, profile)
    db.commit()
    db.refresh(profile)
    return {"profile": profile, "obligations": result.as_dict()}


# ---------------------------------------------------------------- obligations

def _link_out(link: MineObligation) -> dict:
    return {"id": link.id, "mine_id": link.mine_id, "status": link.status, "reason": link.reason,
            "confidence": link.confidence, "source": link.source, "remark": link.remark,
            "decided_by": link.decided_by, "decided_at": link.decided_at, "obligation": link.obligation}


@router.get("/mines/{mine_id}/obligations", response_model=list[MineObligationOut])
def mine_obligations(mine_id: int,
                     status_filter: str | None = Query(None, alias="status",
                                                       description="active / not_applicable / inactive"),
                     category: str | None = None,
                     user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Obligations that apply (or were set aside) for this mine, with the reason."""
    get_mine_in_scope(db, user, mine_id)
    query = (select(MineObligation).join(Obligation, Obligation.id == MineObligation.obligation_id)
             .where(MineObligation.mine_id == mine_id)
             .order_by(Obligation.category, Obligation.frequency, Obligation.title))
    if status_filter:
        query = query.where(MineObligation.status == status_filter)
    if category:
        query = query.where(Obligation.category == category)
    return [_link_out(link) for link in db.scalars(query)]


@router.patch("/mines/{mine_id}/obligations/{link_id}", response_model=MineObligationOut)
def decide_obligation(mine_id: int, link_id: int, body: MineObligationUpdate,
                      user: User = Depends(require_roles(*OBLIGATION_DECIDERS)), db: Session = Depends(get_db)):
    """Mark an obligation 'not_applicable' (remark required) or 'active' again for this mine."""
    get_mine_in_scope(db, user, mine_id)
    link = db.get(MineObligation, link_id)
    if link is None or link.mine_id != mine_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Obligation link not found.")
    link.status = body.status
    link.remark = body.remark
    link.decided_by = user.id
    link.decided_at = utcnow()
    db.flush()
    if body.status == "not_applicable":
        remove_future_tasks(db, mine_id, [link.obligation_id])
    else:
        generate_tasks(db, [mine_id])
    db.commit()
    return _link_out(link)


@router.post("/mines/{mine_id}/obligations/refresh", response_model=ProfileSaveResponse)
def refresh_obligations(mine_id: int, user: User = Depends(require_roles(*PROFILE_EDITORS)),
                        db: Session = Depends(get_db)):
    """Ask the ML engine again with the saved profile (e.g. after the engine learnt new laws)."""
    get_mine_in_scope(db, user, mine_id)
    profile = db.scalar(select(MineProfile).where(MineProfile.mine_id == mine_id))
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fill the mine profile first.")
    result = sync_mine_obligations(db, profile)
    db.commit()
    return {"profile": profile, "obligations": result.as_dict()}


@router.get("/obligations", response_model=list[ObligationOut])
def obligation_catalogue(category: str | None = None, q: str | None = None,
                         user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Every obligation the system knows (from the ML engine or the sample catalogue)."""
    query = select(Obligation).where(Obligation.status == "approved").order_by(Obligation.category, Obligation.title)
    if category:
        query = query.where(Obligation.category == category)
    if q:
        query = query.where(Obligation.title.ilike(f"%{q}%") | Obligation.law_ref.ilike(f"%{q}%"))
    return list(db.scalars(query))


# ---------------------------------------------------------------- calendar & compliance

@router.get("/mines/{mine_id}/calendar", response_model=list[CalendarDay])
def compliance_calendar(mine_id: int, month: str = Query(..., pattern=r"^\d{4}-\d{2}$", examples=["2026-09"]),
                        user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Per day of the month: how many tasks are done, pending and overdue."""
    get_mine_in_scope(db, user, mine_id)
    year, mon = int(month[:4]), int(month[5:])
    if not 1 <= mon <= 12:
        raise HTTPException(status_code=422, detail="month must be YYYY-MM")
    first = date(year, mon, 1)
    last = date(year + mon // 12, mon % 12 + 1, 1) - timedelta(days=1)
    counts: dict[date, dict[str, int]] = defaultdict(lambda: {"done": 0, "pending": 0, "overdue": 0})
    for due, task_status in db.execute(select(ComplianceTask.due_date, ComplianceTask.status).where(
            ComplianceTask.mine_id == mine_id, ComplianceTask.due_date.between(first, last))):
        counts[due][task_status] += 1
    return [{"date": first + timedelta(days=i), **counts[first + timedelta(days=i)]}
            for i in range((last - first).days + 1)]


@router.get("/mines/{mine_id}/compliance", response_model=ComplianceOut)
def mine_compliance(mine_id: int, from_date: date | None = Query(None, alias="from"),
                    to_date: date | None = Query(None, alias="to"),
                    user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Compliance % = tasks done on time / tasks due in the period (default: last 30 days), plus by category."""
    get_mine_in_scope(db, user, mine_id)
    to_date = to_date or today_ist()
    from_date = from_date or to_date - timedelta(days=30)
    return {"from_date": from_date, "to_date": to_date, **compliance_stats(db, [mine_id], from_date, to_date)}
