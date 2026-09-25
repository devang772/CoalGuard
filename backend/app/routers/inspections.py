"""Checklists, inspections and findings. Every finding automatically gets a CAPA."""
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_roles
from app.constants import Role
from app.db import get_db
from app.deps import Pagination, check_evidence, get_mine_in_scope, resolve_mine_filter
from app.models import Capa, Checklist, Finding, Inspection, OrgUnit, User
from app.schemas import (ChecklistOut, FindingCreate, FindingOut, InspectionCreate, InspectionDetail,
                         InspectionOut, InspectionSubmit, Page)
from app.services.capa import create_capa_for_finding
from app.utils import ist_day_start_utc, utcnow

router = APIRouter(tags=["Inspections"])

INSPECTORS = (Role.SUPERVISOR, Role.SAFETY_OFFICER, Role.MINE_MANAGER, Role.AREA_GM,
              Role.SUBSIDIARY_ADMIN, Role.CIL_ADMIN, Role.REGULATOR)
REGULATOR_TYPES = ("dgms", "spcb")


# ---------------------------------------------------------------- checklists

@router.get("/checklists", response_model=list[ChecklistOut])
def list_checklists(mine_id: int | None = None, user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    """Inspection checklists. With ?mine_id only the ones that fit the mine (UG / OC / both)."""
    query = select(Checklist).order_by(Checklist.id)
    if mine_id is not None:
        mine = get_mine_in_scope(db, user, mine_id)
        if mine.mine_type in ("UG", "OC"):
            query = query.where(or_(Checklist.mine_type.is_(None), Checklist.mine_type == mine.mine_type))
    return list(db.scalars(query))


# ---------------------------------------------------------------- helpers

def _finding_out(finding: Finding, capa: Capa | None) -> dict:
    data = FindingOut.model_validate(finding).model_dump()
    if capa is not None:
        data.update(capa_id=capa.id, capa_status=capa.status, capa_due_at=capa.due_at)
    return data


def _inspection_rows(db: Session, inspections: list[Inspection]) -> list[dict]:
    ids = [i.id for i in inspections]
    counts = {row[0]: (row[1], row[2]) for row in db.execute(
        select(Finding.inspection_id, func.count(), func.sum(case((Finding.severity == "critical", 1), else_=0)))
        .where(Finding.inspection_id.in_(ids)).group_by(Finding.inspection_id))} if ids else {}
    names = dict(db.execute(select(User.id, User.name).where(
        User.id.in_({i.inspector_id for i in inspections}))).all()) if ids else {}
    mines = dict(db.execute(select(OrgUnit.id, OrgUnit.name).where(
        OrgUnit.id.in_({i.mine_id for i in inspections}))).all()) if ids else {}
    rows = []
    for i in inspections:
        total, critical = counts.get(i.id, (0, 0))
        rows.append({"id": i.id, "mine_id": i.mine_id, "mine_name": mines.get(i.mine_id, ""),
                     "inspector_id": i.inspector_id, "inspector_name": names.get(i.inspector_id, ""),
                     "type": i.type, "status": i.status, "checklist_id": i.checklist_id, "lat": i.lat, "lng": i.lng,
                     "started_at": i.started_at, "submitted_at": i.submitted_at,
                     "findings_count": total or 0, "critical_count": critical or 0})
    return rows


def _detail(db: Session, inspection: Inspection) -> dict:
    row = _inspection_rows(db, [inspection])[0]
    findings = list(db.scalars(select(Finding).where(Finding.inspection_id == inspection.id).order_by(Finding.id)))
    capas = {c.finding_id: c for c in db.scalars(select(Capa).where(Capa.finding_id.in_([f.id for f in findings])))}
    row.update(checklist_answers=inspection.checklist_answers, notes=inspection.notes,
               findings=[_finding_out(f, capas.get(f.id)) for f in findings])
    return row


def _load_inspection(db: Session, user: User, inspection_id: int) -> Inspection:
    inspection = db.get(Inspection, inspection_id)
    if inspection is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Inspection not found.")
    get_mine_in_scope(db, user, inspection.mine_id)
    return inspection


def _own_open_inspection(db: Session, user: User, inspection_id: int) -> Inspection:
    inspection = _load_inspection(db, user, inspection_id)
    if inspection.inspector_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the inspector can change this inspection.")
    if inspection.status == "submitted":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This inspection is already submitted and locked.")
    return inspection


# ---------------------------------------------------------------- inspections

@router.post("/inspections", response_model=InspectionDetail, status_code=status.HTTP_201_CREATED)
def start_inspection(body: InspectionCreate, response: Response, user: User = Depends(require_roles(*INSPECTORS)),
                     db: Session = Depends(get_db)):
    """Start an inspection. Regulators may only start DGMS / SPCB inspections.
    Sending the same client_uuid again returns the existing inspection (offline retry)."""
    if body.client_uuid:
        existing = db.scalar(select(Inspection).where(Inspection.client_uuid == body.client_uuid))
        if existing is not None:
            if existing.inspector_id != user.id:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="client_uuid already used.")
            response.status_code = status.HTTP_200_OK
            return _detail(db, existing)
    get_mine_in_scope(db, user, body.mine_id)
    if user.role == Role.REGULATOR and body.type not in REGULATOR_TYPES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Regulators can record only DGMS or SPCB inspections.")
    if body.checklist_id is not None and db.get(Checklist, body.checklist_id) is None:
        raise HTTPException(status_code=422, detail="Checklist not found.")
    now = utcnow()
    inspection = Inspection(mine_id=body.mine_id, inspector_id=user.id, type=body.type, checklist_id=body.checklist_id,
                            lat=body.lat, lng=body.lng, status="in_progress", started_at=now, created_at=now,
                            client_uuid=body.client_uuid)
    db.add(inspection)
    db.commit()
    return _detail(db, inspection)


@router.get("/inspections", response_model=Page[InspectionOut])
def list_inspections(org_id: int | None = None, mine_id: int | None = None,
                     type: str | None = Query(None, description="internal / statutory / dgms / spcb"),
                     status_filter: str | None = Query(None, alias="status", description="in_progress / submitted"),
                     inspector: str | None = Query(None, description="'me' for my own inspections"),
                     from_date: date | None = Query(None, alias="from"), to_date: date | None = Query(None, alias="to"),
                     paging: Pagination = Depends(),
                     user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Inspections in the user's area, newest first."""
    query = select(Inspection).where(Inspection.mine_id.in_(resolve_mine_filter(db, user, org_id, mine_id)))
    if type:
        query = query.where(Inspection.type == type)
    if status_filter:
        query = query.where(Inspection.status == status_filter)
    if inspector == "me":
        query = query.where(Inspection.inspector_id == user.id)
    if from_date:
        query = query.where(Inspection.started_at >= ist_day_start_utc(from_date))
    if to_date:
        query = query.where(Inspection.started_at < ist_day_start_utc(to_date + timedelta(days=1)))
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    items = list(db.scalars(query.order_by(Inspection.started_at.desc(), Inspection.id.desc())
                            .offset(paging.offset).limit(paging.page_size)))
    return {"items": _inspection_rows(db, items), "total": total, "page": paging.page, "page_size": paging.page_size}


@router.get("/inspections/{inspection_id}", response_model=InspectionDetail)
def get_inspection(inspection_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _detail(db, _load_inspection(db, user, inspection_id))


@router.post("/inspections/{inspection_id}/findings", response_model=FindingOut, status_code=status.HTTP_201_CREATED)
def add_finding(inspection_id: int, body: FindingCreate, response: Response,
                user: User = Depends(require_roles(*INSPECTORS)), db: Session = Depends(get_db)):
    """Add a finding. Its CAPA (owner = mine manager, deadline by severity) is created automatically.
    Sending the same client_uuid again returns the existing finding (offline retry)."""
    if body.client_uuid:
        existing = db.scalar(select(Finding).where(Finding.client_uuid == body.client_uuid))
        if existing is not None:
            if existing.inspection_id != inspection_id:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="client_uuid already used.")
            _load_inspection(db, user, inspection_id)
            response.status_code = status.HTTP_200_OK
            return _finding_out(existing, db.scalar(select(Capa).where(Capa.finding_id == existing.id)))
    inspection = _own_open_inspection(db, user, inspection_id)
    check_evidence(db, body.photo_evidence_id, inspection.mine_id)
    now = utcnow()
    finding = Finding(inspection_id=inspection.id, mine_id=inspection.mine_id, category=body.category,
                      description=body.description.strip(), severity=body.severity, law_ref=body.law_ref,
                      lat=body.lat if body.lat is not None else inspection.lat,
                      lng=body.lng if body.lng is not None else inspection.lng,
                      photo_evidence_id=body.photo_evidence_id, checklist_item_id=body.checklist_item_id,
                      client_uuid=body.client_uuid, created_at=now)
    db.add(finding)
    db.flush()
    capa = create_capa_for_finding(db, finding)
    db.commit()
    return _finding_out(finding, capa)


@router.post("/inspections/{inspection_id}/submit", response_model=InspectionDetail)
def submit_inspection(inspection_id: int, body: InspectionSubmit, user: User = Depends(require_roles(*INSPECTORS)),
                      db: Session = Depends(get_db)):
    """Finish the inspection. After this it is locked (no more findings)."""
    inspection = _own_open_inspection(db, user, inspection_id)
    inspection.checklist_answers = [a.model_dump() for a in body.checklist_answers] or None
    inspection.notes = body.notes
    inspection.status = "submitted"
    inspection.submitted_at = utcnow()
    db.commit()
    return _detail(db, inspection)
