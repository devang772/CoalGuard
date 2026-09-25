"""CAPA (Corrective And Preventive Action) board: list, summary, detail, reassign, request closure."""
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, case, func, select
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_roles
from app.constants import Role
from app.db import get_db
from app.deps import Pagination, check_evidence, get_mine_in_scope, resolve_mine_filter
from app.models import Capa, Evidence, Finding, OrgUnit, User
from app.schemas import CapaAssign, CapaCloseRequest, CapaDetail, CapaOut, CapaSummary, FindingOut, Page
from app.services.approvals import history, verify_approvals
from app.services.capa import closure_checks
from app.utils import utcnow

router = APIRouter(prefix="/capa", tags=["CAPA"])

NOT_CLOSED = ("open", "in_review", "rejected")
ACTIVE = ("open", "rejected")          # work still to be done by the owner


def _people(db: Session, ids: set[int | None]) -> dict[int, dict]:
    ids = {i for i in ids if i}
    if not ids:
        return {}
    return {u.id: {"id": u.id, "name": u.name, "role": u.role}
            for u in db.scalars(select(User).where(User.id.in_(ids)))}


def _capa_rows(db: Session, rows: list[tuple[Capa, Finding, str]]) -> list[dict]:
    now = utcnow()
    people = _people(db, {c.owner_id for c, _, _ in rows} | {c.closure_requested_by for c, _, _ in rows})
    result = []
    for capa, finding, mine_name in rows:
        result.append({
            "id": capa.id, "mine_id": capa.mine_id, "mine_name": mine_name, "status": capa.status,
            "owner": people.get(capa.owner_id), "due_at": capa.due_at,
            "overdue": capa.status in ACTIVE and capa.due_at < now,
            "hours_left": round((capa.due_at - now).total_seconds() / 3600, 1),
            "escalation_level": capa.escalation_level,
            "finding": FindingOut.model_validate(finding).model_dump(),
            "closure_requested_by": people.get(capa.closure_requested_by),
            "closure_requested_at": capa.closure_requested_at, "closure_note": capa.closure_note,
            "after_evidence_id": capa.after_evidence_id, "closure_checks": capa.closure_checks,
            "closure_score": capa.closure_score, "closed_at": capa.closed_at, "created_at": capa.created_at,
        })
    return result


def _base_query():
    return (select(Capa, Finding, OrgUnit.name)
            .join(Finding, Finding.id == Capa.finding_id).join(OrgUnit, OrgUnit.id == Capa.mine_id))


def load_capa(db: Session, user: User, capa_id: int) -> Capa:
    capa = db.get(Capa, capa_id)
    if capa is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CAPA not found.")
    get_mine_in_scope(db, user, capa.mine_id)
    return capa


def capa_detail(db: Session, capa: Capa) -> dict:
    row = _capa_rows(db, [tuple(db.execute(_base_query().where(Capa.id == capa.id)).one())])[0]
    approvals = history(db, "capa", capa.id)
    names = {p["id"]: p["name"] for p in _people(db, {a.approver_id for a in approvals}).values()}
    row["approvals"] = [{"id": a.id, "entity": a.entity, "entity_id": a.entity_id, "approver_id": a.approver_id,
                         "approver_name": names.get(a.approver_id), "decision": a.decision, "remark": a.remark,
                         "hash": a.hash, "created_at": a.created_at} for a in approvals]
    row["approvals_verified"] = verify_approvals(approvals)
    return row


@router.get("", response_model=Page[CapaOut])
def list_capas(org_id: int | None = None, mine_id: int | None = None,
               status_filter: str | None = Query(None, alias="status",
                                                 description="comma list: open,in_review,closed,rejected"),
               severity: str | None = Query(None, description="comma list, e.g. high,critical"),
               category: str | None = None,
               owner: str | None = Query(None, description="'me' or a user id"),
               overdue: bool | None = Query(None, description="true = only overdue (open/rejected past due)"),
               paging: Pagination = Depends(),
               user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """CAPAs in the user's area. Overdue first, then by deadline."""
    now = utcnow()
    query = _base_query().where(Capa.mine_id.in_(resolve_mine_filter(db, user, org_id, mine_id)))
    if status_filter:
        query = query.where(Capa.status.in_([s.strip() for s in status_filter.split(",")]))
    if severity:
        query = query.where(Finding.severity.in_([s.strip() for s in severity.split(",")]))
    if category:
        query = query.where(Finding.category == category)
    if owner == "me":
        query = query.where(Capa.owner_id == user.id)
    elif owner:
        if not owner.isdigit():
            raise HTTPException(status_code=422, detail="owner must be 'me' or a user id")
        query = query.where(Capa.owner_id == int(owner))
    is_overdue = and_(Capa.status.in_(ACTIVE), Capa.due_at < now)
    if overdue is True:
        query = query.where(is_overdue)
    elif overdue is False:
        query = query.where(~is_overdue)
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    order = case((is_overdue, 0), (Capa.status.in_(NOT_CLOSED), 1), else_=2)
    rows = db.execute(query.order_by(order, Capa.due_at, Capa.id).offset(paging.offset).limit(paging.page_size)).all()
    return {"items": _capa_rows(db, [tuple(r) for r in rows]), "total": total,
            "page": paging.page, "page_size": paging.page_size}


@router.get("/summary", response_model=CapaSummary)
def capa_summary(org_id: int | None = None, mine_id: int | None = None,
                 user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Counts for the Kanban columns and dashboard cards."""
    now = utcnow()
    mine_ids = resolve_mine_filter(db, user, org_id, mine_id)
    in_scope = Capa.mine_id.in_(mine_ids)
    by_status = {s: 0 for s in ("open", "in_review", "closed", "rejected")}
    by_status.update(dict(db.execute(select(Capa.status, func.count()).where(in_scope).group_by(Capa.status)).all()))
    open_rows = db.execute(select(Finding.severity, Capa.created_at).join(Finding, Finding.id == Capa.finding_id)
                           .where(in_scope, Capa.status.in_(NOT_CLOSED))).all()
    by_severity = {s: 0 for s in ("low", "medium", "high", "critical")}
    ageing = {"lt7": 0, "d7_30": 0, "gt30": 0}
    for severity, created in open_rows:
        by_severity[severity] = by_severity.get(severity, 0) + 1
        age = now - created
        ageing["lt7" if age < timedelta(days=7) else "d7_30" if age <= timedelta(days=30) else "gt30"] += 1
    overdue = db.scalar(select(func.count()).select_from(Capa).where(
        in_scope, Capa.status.in_(ACTIVE), Capa.due_at < now))
    return {"by_status": by_status, "overdue": overdue, "open_by_severity": by_severity, "open_ageing": ageing}


@router.get("/{capa_id}", response_model=CapaDetail)
def get_capa(capa_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """One CAPA with its approval history (and whether the history fingerprints still match)."""
    return capa_detail(db, load_capa(db, user, capa_id))


@router.post("/{capa_id}/assign", response_model=CapaDetail)
def assign_owner(capa_id: int, body: CapaAssign, user: User = Depends(require_roles(*Role.MANAGERS)),
                 db: Session = Depends(get_db)):
    """Hand the CAPA to another person at the same mine (supervisor, safety officer or manager)."""
    capa = load_capa(db, user, capa_id)
    if capa.status == "closed":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This CAPA is already closed.")
    new_owner = db.get(User, body.owner_id)
    if (new_owner is None or not new_owner.is_active or new_owner.org_unit_id != capa.mine_id
            or new_owner.role not in Role.FIELD_OFFICERS):
        raise HTTPException(status_code=422, detail="The new owner must be a supervisor, safety officer or "
                                                    "manager of this mine.")
    capa.owner_id = new_owner.id
    db.commit()
    return capa_detail(db, capa)


@router.post("/{capa_id}/request-closure", response_model=CapaDetail)
def request_closure(capa_id: int, body: CapaCloseRequest,
                    user: User = Depends(require_roles(*Role.FIELD_OFFICERS)), db: Session = Depends(get_db)):
    """'I fixed it': submit the fix (optional after-photo + note). The CAPA moves to in_review and waits for
    a second person to approve (two-person rule). Allowed from open or rejected."""
    capa = load_capa(db, user, capa_id)
    if user.id != capa.owner_id and user.org_unit_id != capa.mine_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Only the owner or staff of this mine can submit the fix.")
    if capa.status not in ACTIVE:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail=f"A fix can't be submitted while the CAPA is '{capa.status}'.")
    check_evidence(db, body.evidence_id, capa.mine_id)
    capa.after_evidence_id = body.evidence_id
    capa.closure_note = body.note
    capa.closure_requested_by = user.id
    capa.closure_requested_at = utcnow()
    checks = closure_checks(db, capa, db.get(Evidence, body.evidence_id) if body.evidence_id else None)
    capa.closure_checks = checks or None
    capa.status = "rejected" if any(not c["passed"] for c in checks) else "in_review"
    db.commit()
    return capa_detail(db, capa)
