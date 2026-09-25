"""Tamper-proof history: verify the chain, recent changes, and the history of one record."""
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import require_roles, scope_mine_ids
from app.constants import Role
from app.db import get_db
from app.deps import Pagination
from app.models import AuditLog, User
from app.services.audit import AUDITED_BY_TABLE, record_history, verify_chain
from app.utils import ist_day_start_utc

router = APIRouter(prefix="/audit", tags=["Audit (tamper-proof history)"])

AUDIT_VIEWERS = (Role.MINE_MANAGER, Role.AREA_GM, Role.SUBSIDIARY_ADMIN, Role.CIL_ADMIN, Role.REGULATOR)


def _visible_mines(db: Session, user: User) -> set[int] | None:
    """None = everything (CIL admin); otherwise the mines in the user's area."""
    return None if user.role == Role.CIL_ADMIN else set(scope_mine_ids(db, user))


@router.get("/verify")
def verify(user: User = Depends(require_roles(*AUDIT_VIEWERS)), db: Session = Depends(get_db)):
    """Re-compute every fingerprint in the history chain, and compare each record with its last recorded
    version (catches edits made directly in the database). `ok: true` = nothing was tampered with."""
    return verify_chain(db, mine_ids=_visible_mines(db, user))


@router.get("/recent")
def recent_changes(table: str | None = None, action: str | None = Query(None, description="create/update/delete"),
                   user_id: int | None = None, mine_id: int | None = None,
                   from_date: date | None = Query(None, alias="from"), to_date: date | None = Query(None, alias="to"),
                   paging: Pagination = Depends(),
                   user: User = Depends(require_roles(*AUDIT_VIEWERS)), db: Session = Depends(get_db)):
    """Latest changes in the user's area, newest first."""
    query = select(AuditLog)
    visible = _visible_mines(db, user)
    if visible is not None:
        query = query.where(AuditLog.mine_id.in_(visible))
    if table:
        query = query.where(AuditLog.table_name == table)
    if action:
        query = query.where(AuditLog.action == action)
    if user_id:
        query = query.where(AuditLog.user_id == user_id)
    if mine_id:
        query = query.where(AuditLog.mine_id == mine_id)
    if from_date:
        query = query.where(AuditLog.created_at >= ist_day_start_utc(from_date))
    if to_date:
        query = query.where(AuditLog.created_at < ist_day_start_utc(to_date + timedelta(days=1)))
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    entries = list(db.scalars(query.order_by(AuditLog.id.desc()).offset(paging.offset).limit(paging.page_size)))
    names = dict(db.execute(select(User.id, User.name).where(User.id.in_({e.user_id for e in entries if e.user_id}))).all())
    items = [{"id": e.id, "table_name": e.table_name, "record_id": e.record_id, "action": e.action,
              "user_id": e.user_id, "user_name": names.get(e.user_id), "mine_id": e.mine_id,
              "created_at": e.created_at, "hash": e.hash, "prev_hash": e.prev_hash} for e in entries]
    return {"items": items, "total": total, "page": paging.page, "page_size": paging.page_size}


@router.get("/{table_name}/{record_id}")
def history(table_name: str, record_id: int, user: User = Depends(require_roles(*AUDIT_VIEWERS)),
            db: Session = Depends(get_db)):
    """Full change history of one record (who, what changed, when), oldest first."""
    if table_name not in AUDITED_BY_TABLE:
        raise HTTPException(status_code=404, detail=f"No history is kept for '{table_name}'.")
    visible = _visible_mines(db, user)
    if visible is not None:
        mines = set(db.scalars(select(AuditLog.mine_id).where(
            AuditLog.table_name == table_name, AuditLog.record_id == record_id)))
        if mines and not (mines & visible):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This record is outside your area.")
        if mines == {None}:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the CIL admin can see this record.")
    return record_history(db, table_name, record_id)
