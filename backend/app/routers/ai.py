"""AI & ML endpoints: risk forecast, anomalies, recurring violations and Ask Netra.

Every endpoint reads the live database at request time and only covers the mines the caller may see
(optionally narrowed with `org_id` / `mine_id`).
"""
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.ai.anomaly import (detect_all_anomalies, detect_attendance_anomalies, detect_environment_anomalies,
                            detect_production_anomalies)
from app.ai import voice
from app.ai.recurrence import detect_recurring_violations
from app.ai.risk_model import ModelUnavailable, load_model, model_info, predict_risk
from app.auth import get_current_user, scope_mine_ids
from app.db import get_db
from app.models import Capa, ComplianceTask, Obligation, User
from app.utils import utcnow

router = APIRouter(prefix="/ai", tags=["AI & ML Analytics"])

RETRAIN_ROLES = {"cil_admin", "subsidiary_admin"}


def _mines(db: Session, user: User, org_id: int | None, mine_id: int | None) -> list[int]:
    mine_ids = scope_mine_ids(db, user, org_id)
    if mine_id is not None:
        if mine_id not in mine_ids:
            raise HTTPException(status_code=403, detail="This mine is outside your area.")
        return [mine_id]
    return mine_ids


@router.get("/risk")
def get_risk_analytics(org_id: int | None = None, mine_id: int | None = None,
                       user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """XGBoost forecast: chance of an incident at each mine in the next 14 days, from features calculated
    from the database right now. `model` tells when and on how much database history it was trained."""
    mine_ids = _mines(db, user, org_id, mine_id)
    try:
        results = predict_risk(db, mine_ids)
        package = load_model(db)
    except ModelUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"status": "ok", "generated_at": utcnow().isoformat(), "model": model_info(package),
            "total_mines": len(results), "results": results}


@router.post("/risk/retrain")
def retrain_risk_model(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Re-train the risk model on the current database now (admins). It also re-trains by itself every few
    hours and in the nightly job."""
    if user.role not in RETRAIN_ROLES:
        raise HTTPException(status_code=403, detail="Only CIL or subsidiary admins can re-train the model.")
    try:
        package = load_model(db, force_retrain=True)
    except ModelUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"status": "ok", "model": model_info(package)}


@router.get("/anomalies")
def get_anomaly_analytics(category: str | None = Query(None, description="production / environment / attendance"),
                          days: int = Query(30, ge=1, le=180, description="look-back window"),
                          org_id: int | None = None, mine_id: int | None = None,
                          user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """IsolationForest on production vs dispatch; robust spike detection on attendance and PM10."""
    mine_ids = _mines(db, user, org_id, mine_id)
    detectors = {"production": detect_production_anomalies, "environment": detect_environment_anomalies,
                 "attendance": detect_attendance_anomalies}
    if category is not None and category not in detectors:
        raise HTTPException(status_code=422, detail="category must be production, environment or attendance.")
    items = detectors[category](db, mine_ids, days) if category else detect_all_anomalies(db, mine_ids, days)
    if category:
        items.sort(key=lambda item: (item["date"], item["score"]), reverse=True)
    return {"status": "ok", "generated_at": utcnow().isoformat(), "days": days, "total": len(items),
            "anomalies": items}


@router.get("/recurrence")
def get_recurrence_analytics(days: int = Query(60, ge=7, le=365), org_id: int | None = None,
                             mine_id: int | None = None,
                             user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Findings that keep coming back (TF-IDF + clustering on the finding text), from the findings table."""
    mine_ids = _mines(db, user, org_id, mine_id)
    violations = detect_recurring_violations(db, mine_ids, days)
    return {"status": "ok", "generated_at": utcnow().isoformat(), "days": days, "total": len(violations),
            "violations": violations}


MAX_AUDIO_BYTES = 15 * 1024 * 1024


@router.post("/voice")
def voice_report(audio: UploadFile = File(..., description="recording (webm / m4a / wav / mp3 / ogg)"),
                 language: str = Form("hi", description="en / hi / bn / or"),
                 user: User = Depends(get_current_user)):
    """Speak-to-report: Whisper (offline, on this server) turns the recording into text, then the report type,
    category, severity and place are read from it. Nothing is saved here: the app shows the fields for the worker
    to check, then sends them to POST /observations with source "voice"."""
    data = audio.file.read(MAX_AUDIO_BYTES + 1)
    if not data:
        raise HTTPException(status_code=422, detail="The recording is empty.")
    if len(data) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="The recording is too long (max 15 MB, about 1 minute is enough).")
    try:
        result = voice.transcribe(data, language)
    except voice.VoiceUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if not result["transcript"]:
        raise HTTPException(status_code=422, detail="No speech was heard in the recording. Please try again, closer to the phone.")
    return {**result, "structured": voice.structure(result["transcript"]), "engine": f"whisper-{voice.MODEL_NAME}"}


class AskNetraRequest(BaseModel):
    query: str
    mine_id: int | None = None
    language: str | None = "hi"


@router.post("/ask-netra")
def ask_netra_assistant(body: AskNetraRequest, user: User = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    """Keyword search over the obligation catalogue plus the caller's open CAPAs and overdue tasks.

    No language model is connected yet, so the answer is built only from database records (in English)
    and never invents regulatory citations."""
    mine_ids = _mines(db, user, None, body.mine_id)
    terms = [term for term in body.query.casefold().split() if len(term) > 2]
    obligations = list(db.scalars(select(Obligation).order_by(Obligation.id)))
    matches = [item for item in obligations if any(
        term in f"{item.title} {item.law_ref} {item.category} {item.source_text or ''}".casefold()
        for term in terms)][:5]
    open_filter = (Capa.mine_id.in_(mine_ids), Capa.status.in_(["open", "in_review", "rejected"]))
    task_filter = (ComplianceTask.mine_id.in_(mine_ids), ComplianceTask.status == "overdue")
    open_count = db.scalar(select(func.count()).select_from(Capa).where(*open_filter)) if mine_ids else 0
    overdue_count = db.scalar(select(func.count()).select_from(ComplianceTask).where(*task_filter)) if mine_ids else 0
    earliest_capas = list(db.scalars(select(Capa).where(*open_filter).order_by(Capa.due_at).limit(3))) if mine_ids else []
    earliest_tasks = list(db.scalars(select(ComplianceTask).where(*task_filter)
                                     .order_by(ComplianceTask.due_date).limit(3))) if mine_ids else []
    parts: list[str] = []
    if matches:
        parts.append("Matching obligation records: " + "; ".join(f"{item.title} ({item.law_ref})" for item in matches))
    if open_count:
        parts.append(f"Open CAPAs in scope: {open_count}. Earliest due dates: "
                     + ", ".join(str(item.due_at.date()) for item in earliest_capas))
    if overdue_count:
        parts.append(f"Overdue compliance tasks in scope: {overdue_count}. Earliest due dates: "
                     + ", ".join(str(item.due_date) for item in earliest_tasks))
    if not parts:
        parts.append("No matching obligation, open CAPA, or overdue compliance task was found in the records you can access.")
    return {"query": body.query, "answer": "\n\n".join(parts),
            "sources": [{"code": item.code, "title": item.title, "law_ref": item.law_ref} for item in matches],
            "counts": {"open_capas": open_count, "overdue_tasks": overdue_count},
            "engine": "database_search", "trust_score": None}
