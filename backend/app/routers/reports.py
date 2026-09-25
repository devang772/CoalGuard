"""Monthly compliance reports: generate (PDF + Excel), history, download, verify fingerprint.
Approval: POST /approvals with entity="report" (two-person rule)."""
from datetime import timedelta
from typing import Literal

import jwt
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_roles, scope_mine_ids
from app.config import settings
from app.constants import Role
from app.db import get_db
from app.deps import Pagination, get_mine_in_scope
from app.models import OrgUnit, ReportLog, User
from app.security import decode_access_token
from app.services import reports as builder
from app.services import storage
from app.services.approvals import history, verify_approvals
from app.utils import utcnow

router = APIRouter(prefix="/reports", tags=["Reports"])
optional_token = OAuth2PasswordBearer(tokenUrl="/auth/token", auto_error=False)

REPORT_ROLES = (Role.SAFETY_OFFICER, Role.MINE_MANAGER, Role.AREA_GM, Role.SUBSIDIARY_ADMIN, Role.CIL_ADMIN,
                Role.REGULATOR)
MEDIA = {"pdf": "application/pdf", "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}
LINK_HOURS = 12


class ReportRequest(BaseModel):
    month: str = Field(pattern=r"^\d{4}-(0[1-9]|1[0-2])$", examples=["2026-09"])
    mine_id: int | None = Field(default=None, description="one mine; leave empty for all mines in org_id / your area")
    org_id: int | None = Field(default=None, description="area / subsidiary to report on (default: your own)")
    formats: list[Literal["pdf", "xlsx"]] = Field(default=["pdf", "xlsx"], min_length=1)


# ---------------------------------------------------------------- helpers

def signed_url(report_id: int) -> str:
    token = jwt.encode({"rpt": report_id, "exp": utcnow() + timedelta(hours=LINK_HOURS)},
                       settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return f"/reports/{report_id}/file?sig={token}"


def _link_ok(report_id: int, sig: str) -> bool:
    try:
        return jwt.decode(sig, settings.jwt_secret, algorithms=[settings.jwt_algorithm]).get("rpt") == report_id
    except jwt.PyJWTError:
        return False


def report_out(db: Session, r: ReportLog) -> dict:
    names = dict(db.execute(select(User.id, User.name).where(User.id.in_({r.generated_by, r.approved_by} - {None}))).all())
    approvals = history(db, "report", r.id)
    return {"id": r.id, "kind": r.kind, "month": r.month, "format": r.format, "scope_label": r.scope_label,
            "mine_id": r.mine_id, "org_id": r.org_id, "size_bytes": r.size_bytes, "sha256": r.hash,
            "status": r.status, "generated_by": r.generated_by, "generated_by_name": names.get(r.generated_by),
            "approved_by": r.approved_by, "approved_by_name": names.get(r.approved_by), "approved_at": r.approved_at,
            "approvals_verified": verify_approvals(approvals), "stored_in": "cloudinary" if storage.is_cloud_ref(r.file_path) else "local",
            "url": signed_url(r.id), "created_at": r.created_at}


# ---------------------------------------------------------------- endpoints

@router.post("", status_code=status.HTTP_201_CREATED)
def generate(body: ReportRequest, user: User = Depends(require_roles(*REPORT_ROLES)), db: Session = Depends(get_db)):
    """Generate the monthly compliance report for one mine or a whole area, as PDF and/or Excel.
    Files are stored (local or Cloudinary) with a SHA-256 fingerprint; approve them with POST /approvals."""
    if body.mine_id is not None:
        mine = get_mine_in_scope(db, user, body.mine_id)
        mine_ids, org_id, label = [mine.id], mine.id, mine.name
    else:
        org_id = body.org_id or user.org_unit_id
        mine_ids = scope_mine_ids(db, user, org_id=org_id)
        if not mine_ids:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No mines of yours in this scope.")
        label = db.get(OrgUnit, org_id).name
    now = utcnow()
    data = builder.collect(db, mine_ids, body.month, label, user.name, now)
    created = []
    for fmt in body.formats:
        content = builder.to_pdf(data) if fmt == "pdf" else builder.to_xlsx(data)
        try:
            ref = storage.save(content, fmt, kind="reports")
        except storage.StorageError as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
        log = ReportLog(kind="monthly_compliance", mine_id=body.mine_id, org_id=org_id, scope_label=label,
                        month=body.month, format=fmt, file_path=ref, size_bytes=len(content),
                        hash=builder.fingerprint(content), status="generated", generated_by=user.id, created_at=now)
        db.add(log)
        db.flush()
        created.append(log)
    db.commit()
    return {"reports": [report_out(db, r) for r in created],
            "summary": {"compliance_pct": data["compliance"]["compliance_pct"], "tasks_due": data["compliance"]["due"],
                        "incidents": len(data["incidents"]), "capas_opened": data["capas"]["opened"],
                        "suspicious_dispatch_mines": sum(1 for p in data["production"] if p["suspicious_days"] != "-"),
                        "pm10_days_over_limit": sum(e["days_over_limit"] for e in data["environment"])}}


@router.get("")
def report_history(month: str | None = None, mine_id: int | None = None, status_filter: str | None = Query(None, alias="status"),
                   paging: Pagination = Depends(), user: User = Depends(require_roles(*REPORT_ROLES)),
                   db: Session = Depends(get_db)):
    """Reports in the user's area, newest first."""
    allowed = set(scope_mine_ids(db, user))
    query = select(ReportLog).order_by(ReportLog.created_at.desc(), ReportLog.id.desc())
    if month:
        query = query.where(ReportLog.month == month)
    if mine_id:
        query = query.where(ReportLog.mine_id == mine_id)
    if status_filter:
        query = query.where(ReportLog.status == status_filter)
    org_ids = _org_ids_in_scope(db, user)
    visible = [r for r in db.scalars(query)
               if ((r.mine_id in allowed) if r.mine_id is not None else (r.org_id in org_ids))]
    page = visible[paging.offset: paging.offset + paging.page_size]
    return {"items": [report_out(db, r) for r in page], "total": len(visible), "page": paging.page,
            "page_size": paging.page_size}


def _org_ids_in_scope(db: Session, user: User) -> set[int]:
    units = db.execute(select(OrgUnit.id, OrgUnit.parent_id)).all()
    children: dict[int, list[int]] = {}
    for uid, parent in units:
        children.setdefault(parent, []).append(uid)
    found, stack = set(), [user.org_unit_id]
    while stack:
        current = stack.pop()
        if current not in found:
            found.add(current)
            stack.extend(children.get(current, []))
    return found


def _check_access(db: Session, user: User, r: ReportLog) -> None:
    if r.mine_id is not None:
        get_mine_in_scope(db, user, r.mine_id)
    elif r.org_id not in _org_ids_in_scope(db, user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This report is outside your area.")


def get_report_for(db: Session, user: User, report_id: int) -> ReportLog:
    r = db.get(ReportLog, report_id)
    if r is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")
    _check_access(db, user, r)
    return r


@router.get("/{report_id}")
def get_report(report_id: int, user: User = Depends(require_roles(*REPORT_ROLES)), db: Session = Depends(get_db)):
    return report_out(db, get_report_for(db, user, report_id))


@router.get("/{report_id}/file")
def download(report_id: int, sig: str | None = Query(None), token: str | None = Depends(optional_token),
             db: Session = Depends(get_db)):
    """The PDF / Excel file. Works with the signed `url` from the report (no header needed) or a Bearer token."""
    r = db.get(ReportLog, report_id)
    if r is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")
    if not (sig and _link_ok(report_id, sig)):
        if not token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Login or a valid link is required.")
        try:
            user = db.get(User, int(decode_access_token(token)["sub"]))
        except Exception:  # noqa: BLE001
            user = None
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired login.")
        _check_access(db, user, r)
    filename = f"khanan-netra-{r.scope_label.replace(' ', '-').lower()}-{r.month}.{r.format}"
    path = storage.local_path(r.file_path)
    if path is not None:
        return FileResponse(path, media_type=MEDIA[r.format], filename=filename)
    if storage.is_cloud_ref(r.file_path):
        return RedirectResponse(storage.download_url(r.file_path), status_code=307)
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="The report file is missing.")


@router.post("/verify")
def verify_file(file: UploadFile = File(..., description="a PDF / Excel file downloaded from Khanan Netra"),
                user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Is this file exactly as generated? Compares its SHA-256 fingerprint with the report history."""
    content = file.file.read(50 * 1024 * 1024)
    digest = builder.fingerprint(content)
    r = db.scalar(select(ReportLog).where(ReportLog.hash == digest))
    if r is None:
        return {"match": False, "sha256": digest,
                "message": "No report with this fingerprint: the file was changed or was not generated by Khanan Netra."}
    return {"match": True, "sha256": digest, "message": "Unchanged: this file matches the generated report.",
            "report": {"id": r.id, "month": r.month, "format": r.format, "scope_label": r.scope_label,
                       "status": r.status, "created_at": r.created_at}}
