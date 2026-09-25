"""Approve / reject CAPA fixes and generated reports (two-person rule for both)."""
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
from app.services.notify import notify
from app.utils import utcnow

router = APIRouter(prefix="/approvals", tags=["Approvals"])


def _out(db: Session, approval) -> dict:
    name = db.scalar(select(User.name).where(User.id == approval.approver_id))
    return {**ApprovalOut.model_validate(approval).model_dump(), "approver_name": name}


def _decide_report(db: Session, user: User, body: ApprovalCreate):
    from app.routers.reports import get_report_for
    report = get_report_for(db, user, body.entity_id)
    if report.status != "generated":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail=f"This report is already '{report.status}'.")
    if report.generated_by == user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Two-person rule: you generated this report, so someone else must approve it.")
    now = utcnow()
    approval = record_approval(db, "report", report.id, user.id, body.decision, body.remark, now)
    report.status = "approved" if body.decision == "approve" else "rejected"
    if body.decision == "approve":
        report.approved_by, report.approved_at = user.id, now
    notify(db, [report.generated_by], f"Report {report.scope_label} {report.month} ({report.format}) was "
           f"{'approved' if body.decision == 'approve' else 'rejected'}", body.remark or "", kind="report",
           link=f"/reports/{report.id}")
    db.commit()
    return _out(db, approval)


@router.post("", response_model=ApprovalOut, status_code=status.HTTP_201_CREATED)
def decide(body: ApprovalCreate, user: User = Depends(require_roles(*Role.MANAGERS)), db: Session = Depends(get_db)):
    """Approve or reject a submitted CAPA fix or a generated report.
    CAPA: approve -> closed · reject (remark required) -> rejected, the owner must fix it again.
    Report: approve -> approved (signed) · reject (remark required) -> rejected.
    Two-person rule: whoever submitted the fix / generated the report cannot decide on it."""
    if body.entity == "report":
        return _decide_report(db, user, body)
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
    verdict = "approved - CAPA closed" if body.decision == "approve" else "rejected - please fix again"
    notify(db, [capa.owner_id, capa.closure_requested_by], f"Your fix for CAPA #{capa.id} was {verdict}",
           body.remark or "", level="info" if body.decision == "approve" else "warning", kind="capa",
           link=f"/capa/{capa.id}")
    db.commit()
    return _out(db, approval)


@router.get("", response_model=list[ApprovalOut])
def list_approvals(entity: str = Query("capa"), entity_id: int = Query(...),
                   user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Approval history of one record, oldest first."""
    if entity == "report":
        from app.routers.reports import get_report_for
        get_report_for(db, user, entity_id)
    elif entity == "capa":
        load_capa(db, user, entity_id)
    else:
        raise HTTPException(status_code=422, detail="entity must be capa or report.")
    return [_out(db, a) for a in history(db, entity, entity_id)]
