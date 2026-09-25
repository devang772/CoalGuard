"""Contractors (with fraud alerts + score) and their workers."""
from collections import Counter
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import require_roles, scope_mine_ids
from app.config import settings
from app.constants import Role
from app.db import get_db
from app.deps import get_mine_in_scope
from app.models import Attendance, Contractor, OrgUnit, User, Worker
from app.schemas import (ContractorDetail, ContractorIn, ContractorOut, ContractorUpdate, FraudAlert, WorkerIn,
                         WorkerOut, WorkerUpdate)
from app.services.fraud import contractor_alerts, contractor_score
from app.services.workforce import hash_bank_account, validity
from app.utils import ist_day_start_utc, today_ist

router = APIRouter(tags=["Contractors & Workers"])

VIEWERS = (Role.SUPERVISOR, Role.SAFETY_OFFICER, Role.MINE_MANAGER, Role.AREA_GM, Role.SUBSIDIARY_ADMIN,
           Role.CIL_ADMIN, Role.REGULATOR, Role.CONTRACTOR_ADMIN)
CONTRACTOR_EDITORS = (Role.MINE_MANAGER, Role.SUBSIDIARY_ADMIN, Role.CIL_ADMIN)
WORKER_EDITORS = CONTRACTOR_EDITORS + (Role.CONTRACTOR_ADMIN,)
WORKER_FLAGS = {"shared_device", "shared_bank", "no_gate_entry", "expired_training", "expired_medical",
                "below_min_wage"}


# ---------------------------------------------------------------- scope helpers

def visible_contractors_query(db: Session, user: User, org_id: int | None = None, mine_id: int | None = None):
    """Contractor admins see only their own company; everyone else sees contractors of mines in their area."""
    query = select(Contractor)
    if user.role == Role.CONTRACTOR_ADMIN:
        query = query.where(Contractor.admin_user_id == user.id)
    else:
        query = query.where(Contractor.mine_id.in_(scope_mine_ids(db, user, org_id=org_id)))
    if mine_id is not None:
        query = query.where(Contractor.mine_id == mine_id)
    return query


def load_contractor(db: Session, user: User, contractor_id: int) -> Contractor:
    contractor = db.get(Contractor, contractor_id)
    if contractor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contractor not found.")
    if user.role == Role.CONTRACTOR_ADMIN:
        if contractor.admin_user_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only see your own company.")
    else:
        get_mine_in_scope(db, user, contractor.mine_id)
    return contractor


def load_worker(db: Session, user: User, worker_id: int) -> tuple[Worker, Contractor]:
    worker = db.get(Worker, worker_id)
    if worker is None or worker.contractor_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Worker not found.")
    return worker, load_contractor(db, user, worker.contractor_id)


# ---------------------------------------------------------------- output builders

def _contractor_rows(db: Session, contractors: list[Contractor]) -> list[dict]:
    ids = [c.id for c in contractors]
    alerts = contractor_alerts(db, ids)
    counts = dict(db.execute(select(Worker.contractor_id, func.count()).where(
        Worker.contractor_id.in_(ids), Worker.is_active.is_(True)).group_by(Worker.contractor_id)).all()) if ids else {}
    mines = dict(db.execute(select(OrgUnit.id, OrgUnit.name).where(
        OrgUnit.id.in_({c.mine_id for c in contractors}))).all()) if ids else {}
    rows = []
    for c in contractors:
        a = alerts[c.id]
        rows.append({
            "id": c.id, "name": c.name, "licence_no": c.licence_no, "licence_valid_till": c.licence_valid_till,
            "licence_status": validity(c.licence_valid_till), "insurance_valid_till": c.insurance_valid_till,
            "insurance_status": validity(c.insurance_valid_till), "pf_code": c.pf_code, "esi_code": c.esi_code,
            "mine_id": c.mine_id, "mine_name": mines.get(c.mine_id, ""), "admin_user_id": c.admin_user_id,
            "workers_count": counts.get(c.id, 0), "alerts_count": len(a),
            "high_alerts": sum(1 for x in a if x["severity"] == "high"), "score": contractor_score(a),
            "_alerts": a,
        })
    return rows


def _worker_rows(db: Session, workers: list[Worker], alerts: list[dict]) -> list[dict]:
    names = dict(db.execute(select(Contractor.id, Contractor.name).where(
        Contractor.id.in_({w.contractor_id for w in workers if w.contractor_id}))).all()) if workers else {}
    since = ist_day_start_utc(today_ist() - timedelta(days=30))
    days = dict(db.execute(select(Attendance.worker_id, func.count()).where(
        Attendance.worker_id.in_([w.id for w in workers]), Attendance.valid.is_(True), Attendance.time >= since)
        .group_by(Attendance.worker_id)).all()) if workers else {}
    flags: dict[int, list[str]] = {}
    for alert in alerts:
        if alert["type"] in WORKER_FLAGS:
            for wid in alert["worker_ids"]:
                flags.setdefault(wid, []).append(alert["type"])
    return [{
        "id": w.id, "contractor_id": w.contractor_id, "contractor_name": names.get(w.contractor_id),
        "user_id": w.user_id, "name": w.name, "phone": w.phone, "device_id": w.device_id,
        "bank_account_on_file": bool(w.bank_acc_hash),
        "training_valid_till": w.training_valid_till, "training_status": validity(w.training_valid_till),
        "medical_valid_till": w.medical_valid_till, "medical_status": validity(w.medical_valid_till),
        "daily_wage": w.daily_wage,
        "below_min_wage": w.daily_wage is not None and w.daily_wage < settings.min_daily_wage,
        "is_active": w.is_active, "attendance_days_30d": days.get(w.id, 0), "flags": sorted(set(flags.get(w.id, []))),
    } for w in workers]


def _detail(db: Session, contractor: Contractor) -> dict:
    row = _contractor_rows(db, [contractor])[0]
    alerts = row.pop("_alerts")
    workers = list(db.scalars(select(Worker).where(Worker.contractor_id == contractor.id)))
    since = ist_day_start_utc(today_ist() - timedelta(days=30))
    att = db.execute(select(Attendance.valid, Attendance.gate_entry).where(
        Attendance.worker_id.in_([w.id for w in workers]), Attendance.time >= since)).all() if workers else []
    active = [w for w in workers if w.is_active]
    training = Counter(validity(w.training_valid_till) for w in active)
    medical = Counter(validity(w.medical_valid_till) for w in active)
    row["stats"] = {
        "workers_total": len(workers), "workers_active": len(active),
        "training": dict(training), "medical": dict(medical),
        "below_min_wage": sum(1 for w in active if w.daily_wage is not None and w.daily_wage < settings.min_daily_wage),
        "attendance_30d": {"valid": sum(1 for v, _ in att if v), "invalid": sum(1 for v, _ in att if not v),
                           "without_gate_entry": sum(1 for v, g in att if v and not g)},
    }
    row["alerts"] = alerts
    return row


# ---------------------------------------------------------------- contractors

@router.get("/contractors", response_model=list[ContractorOut])
def list_contractors(org_id: int | None = None, mine_id: int | None = None, q: str | None = None,
                     licence_status: str | None = Query(None, description="valid / expiring / expired"),
                     user: User = Depends(require_roles(*VIEWERS)), db: Session = Depends(get_db)):
    """Contractors in the user's area, lowest score (most problems) first."""
    query = visible_contractors_query(db, user, org_id, mine_id)
    if q:
        query = query.where(Contractor.name.ilike(f"%{q}%") | Contractor.licence_no.ilike(f"%{q}%"))
    rows = _contractor_rows(db, list(db.scalars(query)))
    if licence_status:
        rows = [r for r in rows if r["licence_status"] == licence_status]
    for r in rows:
        r.pop("_alerts")
    return sorted(rows, key=lambda r: (r["score"], r["name"]))


@router.post("/contractors", response_model=ContractorDetail, status_code=status.HTTP_201_CREATED)
def create_contractor(body: ContractorIn, user: User = Depends(require_roles(*CONTRACTOR_EDITORS)),
                      db: Session = Depends(get_db)):
    get_mine_in_scope(db, user, body.mine_id)
    if body.admin_user_id is not None:
        admin = db.get(User, body.admin_user_id)
        if admin is None or admin.role != Role.CONTRACTOR_ADMIN:
            raise HTTPException(status_code=422, detail="admin_user_id must be a contractor_admin user.")
    contractor = Contractor(**body.model_dump(), score=100.0)
    db.add(contractor)
    db.commit()
    return _detail(db, contractor)


@router.get("/contractors/{contractor_id}", response_model=ContractorDetail)
def contractor_360(contractor_id: int, user: User = Depends(require_roles(*VIEWERS)), db: Session = Depends(get_db)):
    """Everything about one contractor: validity, score, alerts, worker and attendance stats."""
    return _detail(db, load_contractor(db, user, contractor_id))


@router.patch("/contractors/{contractor_id}", response_model=ContractorDetail)
def update_contractor(contractor_id: int, body: ContractorUpdate,
                      user: User = Depends(require_roles(*CONTRACTOR_EDITORS)), db: Session = Depends(get_db)):
    contractor = load_contractor(db, user, contractor_id)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(contractor, field, value)
    db.commit()
    return _detail(db, contractor)


@router.get("/contractors/{contractor_id}/alerts", response_model=list[FraudAlert])
def alerts_for(contractor_id: int, user: User = Depends(require_roles(*VIEWERS)), db: Session = Depends(get_db)):
    """Ghost-worker and compliance alerts with the workers involved."""
    load_contractor(db, user, contractor_id)
    return contractor_alerts(db, [contractor_id])[contractor_id]


# ---------------------------------------------------------------- workers

@router.get("/contractors/{contractor_id}/workers", response_model=list[WorkerOut])
def list_workers(contractor_id: int, active: bool | None = None, q: str | None = None,
                 flag: str | None = Query(None, description="only workers with this flag, e.g. shared_device"),
                 user: User = Depends(require_roles(*VIEWERS)), db: Session = Depends(get_db)):
    load_contractor(db, user, contractor_id)
    query = select(Worker).where(Worker.contractor_id == contractor_id).order_by(Worker.name, Worker.id)
    if active is not None:
        query = query.where(Worker.is_active.is_(active))
    if q:
        query = query.where(Worker.name.ilike(f"%{q}%"))
    rows = _worker_rows(db, list(db.scalars(query)), contractor_alerts(db, [contractor_id])[contractor_id])
    return [r for r in rows if flag is None or flag in r["flags"]]


@router.post("/contractors/{contractor_id}/workers", response_model=WorkerOut, status_code=status.HTTP_201_CREATED)
def add_worker(contractor_id: int, body: WorkerIn, user: User = Depends(require_roles(*WORKER_EDITORS)),
               db: Session = Depends(get_db)):
    load_contractor(db, user, contractor_id)
    data = body.model_dump(exclude={"bank_account"})
    worker = Worker(contractor_id=contractor_id, is_active=True, **data,
                    bank_acc_hash=hash_bank_account(body.bank_account) if body.bank_account else None)
    db.add(worker)
    db.commit()
    return _worker_rows(db, [worker], contractor_alerts(db, [contractor_id])[contractor_id])[0]


@router.get("/workers/{worker_id}", response_model=WorkerOut)
def get_worker(worker_id: int, user: User = Depends(require_roles(*VIEWERS)), db: Session = Depends(get_db)):
    worker, contractor = load_worker(db, user, worker_id)
    return _worker_rows(db, [worker], contractor_alerts(db, [contractor.id])[contractor.id])[0]


@router.patch("/workers/{worker_id}", response_model=WorkerOut)
def update_worker(worker_id: int, body: WorkerUpdate, user: User = Depends(require_roles(*WORKER_EDITORS)),
                  db: Session = Depends(get_db)):
    """Edit a worker (e.g. renewed training date) or deactivate with is_active=false."""
    worker, contractor = load_worker(db, user, worker_id)
    changes = body.model_dump(exclude_unset=True)
    if "bank_account" in changes:
        account = changes.pop("bank_account")
        worker.bank_acc_hash = hash_bank_account(account) if account else None
    for field, value in changes.items():
        setattr(worker, field, value)
    db.commit()
    return _worker_rows(db, [worker], contractor_alerts(db, [contractor.id])[contractor.id])[0]
