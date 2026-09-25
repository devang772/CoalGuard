"""Approve / reject (currently for CAPA closures; reports come in Module 9)."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_roles
from app.constants import Role
from app.db import get_db
from app.models import User
from app.routers.capa import load_capa
from app.schemas import ApprovalCreate, ApprovalOut
from app.services.approvals import history, record_approval
from app.utils import utcnow

router = APIRouter(prefix="/approvals", tags=["Approvals"])


def _out(db: Session, approval) -> dict:
    name = db.scalar(select(User.name).where(User.id == approval.approver_id))
    return {**ApprovalOut.model_validate(approval).model_dump(), "approver_name": name}


@router.post("", response_model=ApprovalOut, status_code=status.HTTP_201_CREATED)
def decide(body: ApprovalCreate, user: User = Depends(require_roles(*Role.MANAGERS)), db: Session = Depends(get_db)):
    """Approve or reject a submitted CAPA fix.
    approve -> CAPA closed · reject (remark required) -> CAPA rejected, the owner must fix it again.
    Two-person rule: whoever submitted the fix cannot approve or reject it."""
    capa = load_capa(db, user, body.entity_id)
    if capa.status != "in_review":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail=f"Only CAPAs in review can be decided (this one is '{capa.status}').")
    if capa.closure_requested_by == user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Two-person rule: you submitted this fix, so someone else must check it.")
    now = utcnow()
    approval = record_approval(db, "capa", capa.id, user.id, body.decision, body.remark, now)
    if body.decision == "approve":
        capa.status, capa.closed_at = "closed", now
    else:
        capa.status = "rejected"
    db.commit()
    return _out(db, approval)


@router.get("", response_model=list[ApprovalOut])
def list_approvals(entity: str = Query("capa"), entity_id: int = Query(...),
                   user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Approval history of one record, oldest first."""
    if entity != "capa":
        raise HTTPException(status_code=422, detail="Only entity=capa is supported for now.")
    load_capa(db, user, entity_id)
    return [_out(db, a) for a in history(db, entity, entity_id)]
