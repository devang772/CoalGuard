"""Geofenced attendance: self (worker's phone + selfie) or gate (kiosk), with plain-language reasons."""
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_roles, scope_mine_ids
from app.constants import Role
from app.config import settings
from app.db import get_db
from app.deps import Pagination, check_evidence
from app.models import Attendance, Contractor, Evidence, OrgUnit, User, Worker
from app.routers.contractors import VIEWERS, visible_contractors_query
from app.schemas import AttendanceMark, AttendanceOut, AttendanceResult, Page
from app.services.evidence import evidence_brief
from app.services.workforce import attendance_checks, local_time_text, todays_valid_record
from app.utils import ist_day_start_utc, today_ist, utcnow

router = APIRouter(prefix="/attendance", tags=["Attendance"])

GATE_MARKERS = (Role.SUPERVISOR, Role.SAFETY_OFFICER, Role.MINE_MANAGER, Role.CONTRACTOR_ADMIN)


def _rows(db: Session, records: list[Attendance]) -> list[dict]:
    if not records:
        return []
    workers = {w.id: w for w in db.scalars(select(Worker).where(Worker.id.in_({r.worker_id for r in records})))}
    contractors = dict(db.execute(select(Contractor.id, Contractor.name).where(
        Contractor.id.in_({w.contractor_id for w in workers.values() if w.contractor_id}))).all())
    mines = dict(db.execute(select(OrgUnit.id, OrgUnit.name).where(OrgUnit.id.in_({r.mine_id for r in records}))).all())
    out = []
    for r in records:
        w = workers.get(r.worker_id)
        out.append({"id": r.id, "worker_id": r.worker_id, "worker_name": w.name if w else "",
                    "contractor_id": w.contractor_id if w else None,
                    "contractor_name": contractors.get(w.contractor_id) if w else None,
                    "mine_id": r.mine_id, "mine_name": mines.get(r.mine_id, ""), "time": r.time, "lat": r.lat,
                    "lng": r.lng, "valid": r.valid, "reason": r.reason, "gate_entry": r.gate_entry,
                    "source": r.source, "selfie_evidence_id": r.selfie_evidence_id,
                    "selfie": evidence_brief(db, r.selfie_evidence_id)})
    return out


@router.post("", response_model=AttendanceResult, status_code=status.HTTP_201_CREATED)
def mark_attendance(body: AttendanceMark, response: Response, user: User = Depends(get_current_user),
                    db: Session = Depends(get_db)):
    """Mark attendance.
    - mode "self": a worker marks their own attendance (their login must be linked to a worker record).
    - mode "gate": a supervisor / safety officer / mine manager / contractor admin marks a worker at the gate
      (this is the gate entry).
    Every rule is checked (active worker, contractor licence, safety training, medical, fake GPS, inside the
    mine, selfie trust). Invalid attempts are saved too, with the reason. Only one valid record per day;
    a gate scan after a self-mark just adds the gate entry to that record. With ATTENDANCE_ALLOW_MULTIPLE
    (demo default) every mark is saved as a new record instead."""
    if body.client_uuid:
        existing = db.scalar(select(Attendance).where(Attendance.client_uuid == body.client_uuid))
        if existing is not None:
            response.status_code = status.HTTP_200_OK
            return {**_rows(db, [existing])[0], "checks": [], "message": "Already received."}

    if body.mode == "self":
        worker = db.scalar(select(Worker).where(Worker.user_id == user.id))
        if worker is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="Your login is not linked to a worker record. Ask your supervisor.")
        if body.worker_id is not None and body.worker_id != worker.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can mark only your own attendance.")
    else:
        if user.role not in GATE_MARKERS:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only gate staff can use gate mode.")
        if body.worker_id is None:
            raise HTTPException(status_code=422, detail="worker_id is required in gate mode.")
        worker = db.get(Worker, body.worker_id)
        if worker is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found.")
    contractor = db.get(Contractor, worker.contractor_id) if worker.contractor_id else None
    if contractor is None:
        raise HTTPException(status_code=422, detail="This worker is not attached to a contractor.")
    if body.mode == "gate":
        if user.role == Role.CONTRACTOR_ADMIN and contractor.admin_user_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This worker is not in your company.")
        if user.role != Role.CONTRACTOR_ADMIN and contractor.mine_id not in scope_mine_ids(db, user):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This worker's mine is outside your area.")
    mine = db.get(OrgUnit, contractor.mine_id)
    today, now = today_ist(), utcnow()

    existing = None if settings.attendance_allow_multiple else todays_valid_record(db, worker.id, today)
    if existing is not None:
        if body.mode == "gate" and not existing.gate_entry:
            existing.gate_entry = True
            db.commit()
            response.status_code = status.HTTP_200_OK
            return {**_rows(db, [existing])[0], "checks": [],
                    "message": f"Gate entry added to today's attendance ({local_time_text(existing.time)})."}
        raise HTTPException(status_code=status.HTTP_409_CONFLICT,
                            detail=f"Attendance already marked today at {local_time_text(existing.time)}.")

    check_evidence(db, body.selfie_evidence_id, mine.id)
    selfie = db.get(Evidence, body.selfie_evidence_id) if body.selfie_evidence_id else None
    checks = attendance_checks(db, worker, contractor, mine, body.lat, body.lng, body.is_mocked, selfie, today)
    failed = [c["detail"] for c in checks if not c["passed"]]
    record = Attendance(worker_id=worker.id, mine_id=mine.id, time=now, lat=body.lat, lng=body.lng,
                        accuracy=body.accuracy, selfie_evidence_id=body.selfie_evidence_id,
                        device_id=body.device_id, gate_entry=body.mode == "gate", source=body.mode,
                        marked_by=user.id, valid=not failed, reason="; ".join(failed) or None,
                        client_uuid=body.client_uuid, created_at=now)
    db.add(record)
    db.commit()
    message = (f"Attendance marked at {local_time_text(now)}." if not failed
               else "Attendance NOT accepted: " + failed[0])
    return {**_rows(db, [record])[0], "checks": checks, "message": message}


@router.get("", response_model=Page[AttendanceOut])
def list_attendance(org_id: int | None = None, mine_id: int | None = None, contractor_id: int | None = None,
                    day: date | None = Query(None, alias="date", description="Indian date, default today"),
                    valid: bool | None = None, gate_entry: bool | None = None,
                    paging: Pagination = Depends(),
                    user: User = Depends(require_roles(*VIEWERS)), db: Session = Depends(get_db)):
    """Attendance for one day (default today), newest first."""
    contractors = list(db.scalars(visible_contractors_query(db, user, org_id, mine_id)))
    if contractor_id is not None:
        contractors = [c for c in contractors if c.id == contractor_id]
        if not contractors:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Contractor outside your area.")
    day = day or today_ist()
    start = ist_day_start_utc(day)
    query = (select(Attendance).join(Worker, Worker.id == Attendance.worker_id)
             .where(Worker.contractor_id.in_([c.id for c in contractors]),
                    Attendance.time >= start, Attendance.time < start + timedelta(days=1)))
    if valid is not None:
        query = query.where(Attendance.valid.is_(valid))
    if gate_entry is not None:
        query = query.where(Attendance.gate_entry.is_(gate_entry))
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    records = list(db.scalars(query.order_by(Attendance.time.desc(), Attendance.id.desc())
                              .offset(paging.offset).limit(paging.page_size)))
    return {"items": _rows(db, records), "total": total, "page": paging.page, "page_size": paging.page_size}


@router.get("/summary")
def attendance_summary(org_id: int | None = None, mine_id: int | None = None,
                       day: date | None = Query(None, alias="date"),
                       user: User = Depends(require_roles(*VIEWERS)), db: Session = Depends(get_db)):
    """Counts for the Attendance Monitor KPI chips."""
    contractors = list(db.scalars(visible_contractors_query(db, user, org_id, mine_id)))
    day = day or today_ist()
    start = ist_day_start_utc(day)
    rows = db.execute(select(Attendance.valid, Attendance.gate_entry, Attendance.reason)
                      .join(Worker, Worker.id == Attendance.worker_id)
                      .where(Worker.contractor_id.in_([c.id for c in contractors]),
                             Attendance.time >= start, Attendance.time < start + timedelta(days=1))).all()
    reasons = [(r or "").lower() for v, _, r in rows if not v]
    return {"date": day, "present": sum(1 for v, _, _ in rows if v), "invalid": len(reasons),
            "without_gate_entry": sum(1 for v, g, _ in rows if v and not g),
            "outside_boundary": sum(1 for r in reasons if "outside" in r),
            "expired_training": sum(1 for r in reasons if "training" in r)}


@router.get("/me", response_model=list[AttendanceOut])
def my_attendance(from_date: date | None = Query(None, alias="from"), to_date: date | None = Query(None, alias="to"),
                  user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """The logged-in worker's own attendance (default: last 30 days)."""
    worker = db.scalar(select(Worker).where(Worker.user_id == user.id))
    if worker is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Your login is not linked to a worker record.")
    to_date = to_date or today_ist()
    from_date = from_date or to_date - timedelta(days=30)
    records = list(db.scalars(select(Attendance).where(
        Attendance.worker_id == worker.id, Attendance.time >= ist_day_start_utc(from_date),
        Attendance.time < ist_day_start_utc(to_date + timedelta(days=1))).order_by(Attendance.time.desc())))
    return _rows(db, records)
