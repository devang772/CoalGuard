"""Contractors, workers and attendance rules."""
import hashlib
import hmac
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Attendance, Contractor, Evidence, OrgUnit, Worker
from app.services.geo import format_distance, outside_distance_m
from app.utils import IST_OFFSET, ist_day_start_utc, today_ist

EXPIRING_DAYS = 30


def validity(valid_till: date | None, today: date | None = None) -> str:
    """valid / expiring (within 30 days) / expired / unknown."""
    if valid_till is None:
        return "unknown"
    today = today or today_ist()
    if valid_till < today:
        return "expired"
    return "expiring" if valid_till <= today + timedelta(days=EXPIRING_DAYS) else "valid"


def hash_bank_account(account: str) -> str:
    """Keyed fingerprint of a bank account number: equal accounts match, but the number can't be read back."""
    digits = "".join(ch for ch in account if ch.isalnum()).upper()
    return hmac.new(settings.jwt_secret.encode(), f"bank:{digits}".encode(), hashlib.sha256).hexdigest()


def attendance_checks(db: Session, worker: Worker, contractor: Contractor, mine: OrgUnit,
                      lat: float | None, lng: float | None, is_mocked: bool,
                      selfie: Evidence | None, today: date) -> list[dict]:
    """Every rule with passed + a reason the worker can understand."""
    checks = []

    def add(name: str, passed: bool, detail: str) -> None:
        checks.append({"name": name, "passed": passed, "detail": detail})

    add("Worker is active", worker.is_active, "Active." if worker.is_active else "This worker is deactivated.")
    licence = validity(contractor.licence_valid_till, today)
    add("Contractor licence valid", licence != "expired",
        "Valid." if licence != "expired" else
        f"Contractor licence expired on {contractor.licence_valid_till:%d %b %Y}: work not allowed.")
    training = validity(worker.training_valid_till, today)
    add("Safety training valid", training not in ("expired", "unknown"),
        "Valid." if training not in ("expired", "unknown") else
        "No safety training on record: contact your supervisor." if training == "unknown" else
        f"Safety training expired on {worker.training_valid_till:%d %b %Y}: contact your supervisor.")
    medical = validity(worker.medical_valid_till, today)
    add("Medical fitness valid", medical != "expired",
        "Valid." if medical != "expired" else f"Medical check expired on {worker.medical_valid_till:%d %b %Y}.")
    add("No fake GPS", not is_mocked, "OK." if not is_mocked else "Fake GPS (mock location) app detected.")
    if lat is None or lng is None:
        add("Inside the mine boundary", False, "No GPS location was sent.")
    elif mine.boundary:
        away = outside_distance_m(mine.boundary, lat, lng)
        add("Inside the mine boundary", away == 0,
            f"Inside {mine.name}." if away == 0 else f"You are {format_distance(away)} outside {mine.name}.")
    if selfie is not None:
        ok = (selfie.trust_score or 0) >= settings.closure_min_trust
        add("Selfie passed Satya Proof", ok,
            f"Trust score {selfie.trust_score}." if ok else f"Selfie trust score {selfie.trust_score} is too low.")
    return checks


def todays_valid_record(db: Session, worker_id: int, today: date) -> Attendance | None:
    start = ist_day_start_utc(today)
    return db.scalar(select(Attendance).where(
        Attendance.worker_id == worker_id, Attendance.valid.is_(True), Attendance.time >= start,
        Attendance.time < start + timedelta(days=1)).order_by(Attendance.time))


def local_time_text(moment) -> str:
    return (moment + IST_OFFSET).strftime("%I:%M %p").lstrip("0")
