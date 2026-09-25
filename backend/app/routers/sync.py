"""Offline sync for the mobile app.

GET  /sync/master : everything the phone needs to work offline (mines + boundaries, checklists, categories,
                     obligations, upcoming tasks, workers for gate mode).
POST /sync/bulk   : the phone's whole queue. Every item goes through exactly the same rules as the normal
                     endpoint and gets its own result (created / duplicate / error). One bad item never blocks
                     the others. Upload photos first (POST /evidence) and refer to them by id.
"""
import logging
from datetime import timedelta
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field, ValidationError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user, scope_mine_ids
from app.constants import Role
from app.db import get_db
from app.models import (Attendance, Capa, Checklist, ComplianceTask, Finding, Grievance, Inspection,
                        MineObligation, Obligation, Observation, OrgUnit, User, Worker)
from app.routers import attendance, capa, grievances, inspections, observations, tasks
from app.routers.auth import to_user_out
from app.routers.contractors import visible_contractors_query
from app.schemas import (AttendanceMark, CapaCloseRequest, FindingCreate, GrievanceCreate, InspectionCreate,
                         InspectionSubmit, ObservationCreate, SosCreate, TaskComplete)
from app.services.workforce import validity
from app.utils import today_ist, utcnow

router = APIRouter(prefix="/sync", tags=["Offline sync"])
log = logging.getLogger(__name__)

MAX_ITEMS = 200
CATEGORIES = [("roof", "Roof / side", "छत / साइड"), ("haul_road", "Haul road", "हॉल रोड"),
              ("conveyor", "Conveyor", "कन्वेयर"), ("electrical", "Electrical", "बिजली"), ("fire", "Fire", "आग"),
              ("water", "Water / drainage", "पानी / निकासी"), ("dust", "Dust", "धूल"),
              ("ppe", "Safety gear (PPE)", "सुरक्षा उपकरण"), ("machinery", "Machinery", "मशीनरी"),
              ("explosives", "Explosives", "विस्फोटक"), ("other", "Other", "अन्य")]
GATE_ROLES = (Role.SUPERVISOR, Role.SAFETY_OFFICER, Role.MINE_MANAGER, Role.CONTRACTOR_ADMIN)


# ---------------------------------------------------------------- download pack

@router.get("/master")
def master(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """One call after login / when online: all reference data for offline work."""
    today = today_ist()
    mine_ids = scope_mine_ids(db, user)
    mines = list(db.scalars(select(OrgUnit).where(OrgUnit.id.in_(mine_ids)).order_by(OrgUnit.name)))
    kinds = {m.mine_type for m in mines}
    checklists = [c for c in db.scalars(select(Checklist).order_by(Checklist.id))
                  if c.mine_type is None or c.mine_type in kinds]
    obligations = db.execute(select(MineObligation.mine_id, Obligation)
                             .join(Obligation, Obligation.id == MineObligation.obligation_id)
                             .where(MineObligation.mine_id.in_(mine_ids), MineObligation.status == "active")).all()
    upcoming = db.execute(select(ComplianceTask, Obligation.title, Obligation.code)
                          .join(Obligation, Obligation.id == ComplianceTask.obligation_id)
                          .where(ComplianceTask.mine_id.in_(mine_ids), ComplianceTask.status != "done",
                                 ComplianceTask.due_date <= today + timedelta(days=7))
                          .order_by(ComplianceTask.due_date).limit(500)).all()
    workers = []
    if user.role in GATE_ROLES:
        contractors = {c.id: c for c in db.scalars(visible_contractors_query(db, user))}
        for w in db.scalars(select(Worker).where(Worker.contractor_id.in_(list(contractors)),
                                                 Worker.is_active.is_(True)).order_by(Worker.name)):
            workers.append({"id": w.id, "name": w.name, "contractor_id": w.contractor_id,
                            "contractor_name": contractors[w.contractor_id].name,
                            "mine_id": contractors[w.contractor_id].mine_id,
                            "training_status": validity(w.training_valid_till, today),
                            "medical_status": validity(w.medical_valid_till, today)})
    return {
        "server_time": utcnow(), "today": today, "full": True,
        "user": to_user_out(db, user),
        "mines": [{"id": m.id, "name": m.name, "code": m.code, "mine_type": m.mine_type, "boundary": m.boundary,
                   "center_lat": m.center_lat, "center_lng": m.center_lng} for m in mines],
        "checklists": [{"id": c.id, "name": c.name, "mine_type": c.mine_type, "items": c.items} for c in checklists],
        "hazard_categories": [{"key": k, "label_en": en, "label_hi": hi} for k, en, hi in CATEGORIES],
        "observation_types": ["unsafe_act", "unsafe_condition", "near_miss", "incident"],
        "sos_kinds": ["fire", "roof_fall", "gas", "injury", "flooding", "other"],
        "grievance_categories": ["wages", "safety", "harassment", "facilities", "leave", "other"],
        "obligations": [{"mine_id": mine_id, "id": o.id, "code": o.code, "title": o.title, "law_ref": o.law_ref,
                         "category": o.category, "frequency": o.frequency, "severity": o.severity,
                         "evidence_needed": o.evidence_needed} for mine_id, o in obligations],
        "tasks": [{"id": t.id, "mine_id": t.mine_id, "obligation_id": t.obligation_id, "code": code, "title": title,
                   "due_date": t.due_date, "status": t.status, "escalation_level": t.escalation_level}
                  for t, title, code in upcoming],
        "workers": workers,
    }


# ---------------------------------------------------------------- bulk upload

class SyncItem(BaseModel):
    client_uuid: str = Field(min_length=1, max_length=64)
    kind: Literal["observation", "sos", "grievance", "attendance", "inspection", "finding", "inspection_submit",
                  "task_complete", "capa_close"]
    payload: dict[str, Any] = {}


class BulkRequest(BaseModel):
    items: list[SyncItem] = Field(max_length=MAX_ITEMS)


def _inspection_id(db: Session, payload: dict) -> int:
    if payload.get("inspection_id"):
        return int(payload["inspection_id"])
    ref = payload.get("inspection_client_uuid")
    found = db.scalar(select(Inspection.id).where(Inspection.client_uuid == ref)) if ref else None
    if found is None:
        raise HTTPException(status_code=404, detail="Inspection not found: send the inspection earlier in the queue.")
    return found


def _require(user: User, roles) -> None:
    if user.role not in roles:
        raise HTTPException(status_code=403, detail="You do not have permission to do this.")


def _existing(db: Session, model, uuid: str):
    return db.scalar(select(model.id).where(model.client_uuid == uuid))


def _process(db: Session, user: User, item: SyncItem) -> tuple[str, int | None]:
    """Returns (status, server id). Raises HTTPException / ValidationError on failure."""
    p, uuid, resp = dict(item.payload), item.client_uuid, Response()
    simple = {"observation": (Observation, ObservationCreate, observations.create_observation),
              "sos": (Observation, SosCreate, observations.raise_sos),
              "grievance": (Grievance, GrievanceCreate, grievances.submit),
              "attendance": (Attendance, AttendanceMark, attendance.mark_attendance),
              "inspection": (Inspection, InspectionCreate, inspections.start_inspection)}
    if item.kind in simple:
        model, schema, fn = simple[item.kind]
        if (found := _existing(db, model, uuid)) is not None:
            return "duplicate", found
        if item.kind == "inspection":
            _require(user, inspections.INSPECTORS)
        body = schema(**{**p, "client_uuid": uuid})
        return "created", fn(body, resp, user, db)["id"]

    if item.kind == "finding":
        if (found := _existing(db, Finding, uuid)) is not None:
            return "duplicate", found
        _require(user, inspections.INSPECTORS)
        body = FindingCreate(**{k: v for k, v in p.items() if k not in ("inspection_id", "inspection_client_uuid")},
                             client_uuid=uuid)
        return "created", inspections.add_finding(_inspection_id(db, p), body, resp, user, db)["id"]

    if item.kind == "inspection_submit":
        _require(user, inspections.INSPECTORS)
        inspection_id = _inspection_id(db, p)
        existing = db.get(Inspection, inspection_id)
        if existing is not None and existing.status == "submitted" and existing.inspector_id == user.id:
            return "duplicate", inspection_id
        body = InspectionSubmit(**{k: v for k, v in p.items() if k not in ("inspection_id", "inspection_client_uuid")})
        return "created", inspections.submit_inspection(inspection_id, body, user, db)["id"]

    if item.kind == "task_complete":
        _require(user, tasks.TASK_DOERS)
        task = db.get(ComplianceTask, int(p.get("task_id", 0)))
        if task is not None and task.status == "done" and task.client_uuid == uuid:
            return "duplicate", task.id
        body = TaskComplete(remarks=p.get("remarks"), evidence_id=p.get("evidence_id"), client_uuid=uuid)
        return "created", tasks.complete_task(int(p.get("task_id", 0)), body, user, db)["id"]

    # capa_close
    _require(user, Role.FIELD_OFFICERS)
    capa_id = int(p.get("capa_id", 0))
    existing = db.get(Capa, capa_id)
    if (existing is not None and existing.status in ("in_review", "closed")
            and existing.closure_requested_by == user.id and existing.after_evidence_id == p.get("evidence_id")):
        return "duplicate", capa_id
    body = CapaCloseRequest(evidence_id=p.get("evidence_id"), note=p.get("note"))
    return "created", capa.request_closure(capa_id, body, user, db)["id"]


@router.post("/bulk")
def bulk(body: BulkRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Process the offline queue in order. Items: {client_uuid, kind, payload}; payload = the same body as the
    normal endpoint, plus: finding / inspection_submit -> inspection_id or inspection_client_uuid;
    task_complete -> task_id; capa_close -> capa_id. Each item gets {status: created|duplicate|error}."""
    results = []
    for item in body.items:
        entry = {"client_uuid": item.client_uuid, "kind": item.kind}
        try:
            state, server_id = _process(db, user, item)
            entry.update(status=state, server_id=server_id, http_status=200)
        except HTTPException as exc:
            db.rollback()
            entry.update(status="error", server_id=None, http_status=exc.status_code, error=str(exc.detail))
        except ValidationError as exc:
            db.rollback()
            first = exc.errors()[0]
            entry.update(status="error", server_id=None, http_status=422,
                         error=f"{'.'.join(str(x) for x in first['loc'])}: {first['msg']}")
        except Exception:  # noqa: BLE001 - one bad item must not stop the queue
            db.rollback()
            log.exception("Sync item failed: %s", item.client_uuid)
            entry.update(status="error", server_id=None, http_status=500, error="Unexpected error on the server.")
        results.append(entry)
    summary = {s: sum(1 for r in results if r["status"] == s) for s in ("created", "duplicate", "error")}
    return {"results": results, "summary": summary, "server_time": utcnow()}
