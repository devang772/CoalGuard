"""Compliance tasks: list, summary, detail, complete, generate."""
from datetime import date, timedelta
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session, aliased

from app.auth import get_current_user, require_roles
from app.constants import Role
from app.db import get_db
from app.deps import Pagination, get_mine_in_scope, resolve_mine_filter
from app.models import ComplianceTask, Evidence, Obligation, OrgUnit, User
from app.schemas import GenerateResult, Page, TaskComplete, TaskOut, TaskSummary
from app.services.evidence import evidence_brief
from app.services.tasks import generate_tasks, mark_overdue
from app.utils import ist_day_start_utc, today_ist, utcnow

router = APIRouter(prefix="/tasks", tags=["Compliance Tasks"])

TASK_DOERS = tuple(Role.FIELD_OFFICERS)
TASK_GENERATORS = (Role.MINE_MANAGER, Role.SUBSIDIARY_ADMIN, Role.CIL_ADMIN)

DoneBy = aliased(User)


def _base_query():
    return (select(ComplianceTask, Obligation, OrgUnit.name, DoneBy.name)
            .join(Obligation, Obligation.id == ComplianceTask.obligation_id)
            .join(OrgUnit, OrgUnit.id == ComplianceTask.mine_id)
            .outerjoin(DoneBy, DoneBy.id == ComplianceTask.done_by))


def _to_out(db: Session, task: ComplianceTask, ob: Obligation, mine_name: str, done_by_name: str | None,
            today: date) -> dict:
    days_overdue = (today - task.due_date).days if task.status != "done" and task.due_date < today else 0
    return {
        "id": task.id, "mine_id": task.mine_id, "mine_name": mine_name, "due_date": task.due_date,
        "status": task.status, "escalation_level": task.escalation_level, "days_overdue": days_overdue,
        "done_by": task.done_by, "done_by_name": done_by_name, "done_at": task.done_at, "remarks": task.remarks,
        "evidence_id": task.evidence_id, "evidence": evidence_brief(db, task.evidence_id),
        "obligation": {"id": ob.id, "code": ob.code, "title": ob.title, "law_ref": ob.law_ref,
                       "category": ob.category, "frequency": ob.frequency, "severity": ob.severity,
                       "evidence_needed": ob.evidence_needed},
    }


@router.get("", response_model=Page[TaskOut])
def list_tasks(org_id: int | None = None, mine_id: int | None = None,
               status_filter: Literal["pending", "done", "overdue"] | None = Query(None, alias="status"),
               due: Literal["today", "week", "overdue"] | None = Query(
                   None, description="quick tabs: today = due today · week = due in the next 7 days · overdue"),
               category: str | None = None,
               from_date: date | None = Query(None, alias="from"), to_date: date | None = Query(None, alias="to"),
               escalation_level: int | None = Query(None, ge=0, le=3),
               q: str | None = Query(None, description="search in obligation title / law reference"),
               paging: Pagination = Depends(),
               user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Compliance tasks in the user's area. Overdue first, then by due date."""
    today = today_ist()
    mine_ids = resolve_mine_filter(db, user, org_id, mine_id)
    query = _base_query().where(ComplianceTask.mine_id.in_(mine_ids))
    if status_filter:
        query = query.where(ComplianceTask.status == status_filter)
    if due == "today":
        query = query.where(ComplianceTask.due_date == today)
    elif due == "week":
        query = query.where(ComplianceTask.due_date.between(today, today + timedelta(days=6)),
                            ComplianceTask.status != "done")
    elif due == "overdue":
        query = query.where(ComplianceTask.status == "overdue")
    if category:
        query = query.where(Obligation.category == category)
    if from_date:
        query = query.where(ComplianceTask.due_date >= from_date)
    if to_date:
        query = query.where(ComplianceTask.due_date <= to_date)
    if escalation_level is not None:
        query = query.where(ComplianceTask.escalation_level == escalation_level)
    if q:
        query = query.where(Obligation.title.ilike(f"%{q}%") | Obligation.law_ref.ilike(f"%{q}%"))

    total = db.scalar(select(func.count()).select_from(query.subquery()))
    order = case((ComplianceTask.status == "overdue", 0), (ComplianceTask.status == "pending", 1), else_=2)
    rows = db.execute(query.order_by(order, ComplianceTask.due_date, ComplianceTask.id)
                      .offset(paging.offset).limit(paging.page_size)).all()
    return {"items": [_to_out(db, *row, today) for row in rows], "total": total,
            "page": paging.page, "page_size": paging.page_size}


@router.get("/summary", response_model=TaskSummary)
def task_summary(org_id: int | None = None, mine_id: int | None = None,
                 user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Counts for the quick tabs and the mobile home screen."""
    today = today_ist()
    mine_ids = resolve_mine_filter(db, user, org_id, mine_id)
    base = select(func.count()).select_from(ComplianceTask).where(ComplianceTask.mine_id.in_(mine_ids))
    return {
        "due_today": db.scalar(base.where(ComplianceTask.due_date == today)),
        "due_this_week": db.scalar(base.where(ComplianceTask.due_date.between(today, today + timedelta(days=6)),
                                              ComplianceTask.status != "done")),
        "overdue": db.scalar(base.where(ComplianceTask.status == "overdue")),
        "done_today": db.scalar(base.where(ComplianceTask.status == "done",
                                           ComplianceTask.done_at >= ist_day_start_utc(today))),
        "pending": db.scalar(base.where(ComplianceTask.status == "pending")),
    }


@router.post("/generate", response_model=GenerateResult)
def generate_now(org_id: int | None = None, user: User = Depends(require_roles(*TASK_GENERATORS)),
                 db: Session = Depends(get_db)):
    """Create this period's tasks and mark late ones overdue (also runs at server start;
    runs every night from Module 8). Safe to call many times."""
    mine_ids = resolve_mine_filter(db, user, org_id, None)
    created = generate_tasks(db, mine_ids)
    overdue = mark_overdue(db)
    db.commit()
    return {"created": created, "marked_overdue": overdue}


def _load_task(db: Session, user: User, task_id: int):
    row = db.execute(_base_query().where(ComplianceTask.id == task_id)).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")
    get_mine_in_scope(db, user, row[0].mine_id)
    return row


@router.get("/{task_id}", response_model=TaskOut)
def get_task(task_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _to_out(db, *_load_task(db, user, task_id), today_ist())


@router.post("/{task_id}/complete", response_model=TaskOut)
def complete_task(task_id: int, body: TaskComplete, user: User = Depends(require_roles(*TASK_DOERS)),
                  db: Session = Depends(get_db)):
    """Mark a task done. Send the same client_uuid again (offline retry) and you get the same answer."""
    task, *_ = _load_task(db, user, task_id)
    if task.status == "done":
        if body.client_uuid and task.client_uuid == body.client_uuid:
            return _to_out(db, *_load_task(db, user, task_id), today_ist())
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This task is already done.")
    if body.evidence_id is not None:
        evidence = db.get(Evidence, body.evidence_id)
        if evidence is None or (evidence.mine_id is not None and evidence.mine_id != task.mine_id):
            raise HTTPException(status_code=422, detail="Evidence not found for this mine.")
    task.status = "done"
    task.done_by = user.id
    task.done_at = utcnow()
    task.remarks = body.remarks
    task.evidence_id = body.evidence_id
    task.client_uuid = body.client_uuid
    db.commit()
    return _to_out(db, *_load_task(db, user, task_id), today_ist())
