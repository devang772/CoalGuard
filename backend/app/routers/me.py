"""The logged-in user's own submissions ("My Reports") and the global search (Ctrl+K)."""
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user, scope_mine_ids

from app.db import get_db
from app.deps import Pagination
from app.models import (Attendance, Capa, ComplianceTask, Contractor, Evidence, Finding, Grievance, Inspection,
                        Obligation, Observation, OrgUnit, User, Worker)
from app.routers.contractors import VIEWERS as CONTRACTOR_VIEWERS
from app.routers.contractors import visible_contractors_query
from app.routers.grievances import HANDLERS as GRIEVANCE_HANDLERS
from app.services.proof import trust_level
from app.utils import ist_date, ist_day_start_utc, today_ist

router = APIRouter(tags=["Me & search"])

KINDS = ("report", "finding", "task", "attendance", "capa_fix", "grievance")


def _trust(db: Session, evidence_id: int | None) -> dict:
    ev = db.get(Evidence, evidence_id) if evidence_id else None
    return {"evidence_id": ev.id if ev else None, "trust_score": ev.trust_score if ev else None,
            "trust_level": trust_level(ev.trust_score) if ev else None, "flags": (ev.flags or []) if ev else []}


@router.get("/me/reports")
def my_reports(kind: str | None = Query(None, description="report / finding / task / attendance / capa_fix / grievance"),
               from_date: date | None = Query(None, alias="from"), to_date: date | None = Query(None, alias="to"),
               paging: Pagination = Depends(), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Everything the user sent in (default: last 60 days), newest first, with its current status and the
    photo trust score. Anonymous reports and grievances are not listed (nothing links them to the user)."""
    to_date = to_date or today_ist()
    from_date = from_date or to_date - timedelta(days=60)
    start, end = ist_day_start_utc(from_date), ist_day_start_utc(to_date + timedelta(days=1))
    items: list[dict] = []
    want = set(KINDS) if kind is None else {kind}

    if "report" in want:
        for o in db.scalars(select(Observation).where(Observation.reporter_id == user.id,
                                                      Observation.created_at >= start, Observation.created_at < end)):
            capa = db.scalar(select(Capa).where(Capa.finding_id == o.finding_id)) if o.finding_id else None
            status = (f"action: {capa.status}" if capa else "acknowledged" if o.acknowledged_at else "submitted")
            items.append({"kind": "report", "id": o.id, "title": f"{o.type.replace('_', ' ')}: {o.text}",
                          "status": status, "created_at": o.created_at, "mine_id": o.mine_id,
                          "link": f"/observations/{o.id}", **_trust(db, o.evidence_id)})
    if "finding" in want:
        rows = db.execute(select(Finding, Capa).join(Inspection, Inspection.id == Finding.inspection_id)
                          .outerjoin(Capa, Capa.finding_id == Finding.id)
                          .where(Inspection.inspector_id == user.id, Finding.created_at >= start,
                                 Finding.created_at < end)).all()
        for f, capa in rows:
            items.append({"kind": "finding", "id": f.id, "title": f"{f.severity} {f.category}: {f.description}",
                          "status": f"capa {capa.status}" if capa else "recorded", "created_at": f.created_at,
                          "mine_id": f.mine_id, "link": f"/capa/{capa.id}" if capa else f"/inspections/{f.inspection_id}",
                          **_trust(db, f.photo_evidence_id)})
    if "task" in want:
        rows = db.execute(select(ComplianceTask, Obligation.title).join(Obligation, Obligation.id == ComplianceTask.obligation_id)
                          .where(ComplianceTask.done_by == user.id, ComplianceTask.done_at >= start,
                                 ComplianceTask.done_at < end)).all()
        for t, title in rows:
            on_time = t.done_at is not None and ist_date(t.done_at) <= t.due_date
            items.append({"kind": "task", "id": t.id, "title": title, "status": "done on time" if on_time else "done late",
                          "created_at": t.done_at, "mine_id": t.mine_id, "link": f"/tasks/{t.id}", **_trust(db, t.evidence_id)})
    if "attendance" in want:
        worker = db.scalar(select(Worker).where(Worker.user_id == user.id))
        if worker is not None:
            for a in db.scalars(select(Attendance).where(Attendance.worker_id == worker.id, Attendance.time >= start,
                                                         Attendance.time < end)):
                items.append({"kind": "attendance", "id": a.id, "title": "Attendance",
                              "status": "accepted" if a.valid else f"refused: {a.reason}", "created_at": a.time,
                              "mine_id": a.mine_id, "link": "/attendance/me", **_trust(db, a.selfie_evidence_id)})
    if "capa_fix" in want:
        for c in db.scalars(select(Capa).where(Capa.closure_requested_by == user.id,
                                               Capa.closure_requested_at >= start, Capa.closure_requested_at < end)):
            failed = [ch["detail"] for ch in (c.closure_checks or []) if not ch.get("passed")]
            items.append({"kind": "capa_fix", "id": c.id, "title": f"Fix for CAPA #{c.id}",
                          "status": c.status + (f": {failed[0]}" if failed and c.status == "rejected" else ""),
                          "created_at": c.closure_requested_at, "mine_id": c.mine_id, "link": f"/capa/{c.id}",
                          **_trust(db, c.after_evidence_id)})
    if "grievance" in want:
        for g in db.scalars(select(Grievance).where(Grievance.user_id == user.id, Grievance.created_at >= start,
                                                    Grievance.created_at < end)):
            items.append({"kind": "grievance", "id": g.id, "title": f"{g.category} ({g.token})", "status": g.status,
                          "created_at": g.created_at, "mine_id": g.mine_id, "link": f"/grievances/track/{g.token}",
                          **_trust(db, None)})

    items.sort(key=lambda i: i["created_at"], reverse=True)
    page = items[paging.offset: paging.offset + paging.page_size]
    return {"items": page, "total": len(items), "page": paging.page, "page_size": paging.page_size}


@router.get("/search")
def search(q: str = Query(..., min_length=2, max_length=60), user: User = Depends(get_current_user),
           db: Session = Depends(get_db)):
    """Global search (web Ctrl+K): mines, CAPAs (by #id or text), inspections (#id), contractors, workers and
    grievance tokens, only inside the user's area. Up to 5 results per type."""
    term, results = q.strip(), []
    mine_ids = scope_mine_ids(db, user)
    number = term.lstrip("#")
    like = f"%{term}%"

    for m in db.scalars(select(OrgUnit).where(OrgUnit.id.in_(mine_ids), OrgUnit.name.ilike(like) | OrgUnit.code.ilike(like))
                        .limit(5)):
        results.append({"type": "mine", "id": m.id, "title": m.name, "subtitle": m.code, "link": f"/mines/{m.id}"})
    capa_query = select(Capa, Finding.description).join(Finding, Finding.id == Capa.finding_id).where(Capa.mine_id.in_(mine_ids))
    capa_query = capa_query.where(Capa.id == int(number)) if number.isdigit() else capa_query.where(Finding.description.ilike(like))
    for c, text in db.execute(capa_query.order_by(Capa.created_at.desc()).limit(5)):
        results.append({"type": "capa", "id": c.id, "title": f"CAPA #{c.id}: {text}", "subtitle": c.status,
                        "link": f"/capa/{c.id}"})
    if number.isdigit():
        insp = db.get(Inspection, int(number))
        if insp is not None and insp.mine_id in mine_ids:
            results.append({"type": "inspection", "id": insp.id, "title": f"Inspection #{insp.id}",
                            "subtitle": insp.type, "link": f"/inspections/{insp.id}"})
    if user.role in CONTRACTOR_VIEWERS:
        visible = visible_contractors_query(db, user)
        for c in db.scalars(visible.where(Contractor.name.ilike(like) | Contractor.licence_no.ilike(like)).limit(5)):
            results.append({"type": "contractor", "id": c.id, "title": c.name, "subtitle": c.licence_no,
                            "link": f"/contractors/{c.id}"})
        contractor_ids = [c.id for c in db.scalars(visible)]
        for w in db.scalars(select(Worker).where(Worker.contractor_id.in_(contractor_ids),
                                                 Worker.name.ilike(like) | Worker.phone.ilike(like)).limit(5)):
            results.append({"type": "worker", "id": w.id, "title": w.name, "subtitle": w.phone,
                            "link": f"/contractors/{w.contractor_id}?worker={w.id}"})
    if user.role in GRIEVANCE_HANDLERS and term.upper().startswith("GRV-"):
        g = db.scalar(select(Grievance).where(Grievance.token == term.upper(), Grievance.mine_id.in_(mine_ids)))
        if g is not None:
            results.append({"type": "grievance", "id": g.id, "title": g.token, "subtitle": g.category,
                            "link": f"/grievances/{g.id}"})
    return {"q": term, "results": results}
