"""Photo evidence: upload (with Satya Proof trust checks), details, and the image file itself."""
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile, status
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user, scope_mine_ids
from app.config import settings
from app.db import get_db
from app.deps import get_mine_in_scope
from app.models import Evidence, User
from app.security import decode_access_token
from app.services.evidence import (CONTENT_TYPES, EXTENSIONS, evidence_out, file_on_disk, link_is_valid,
                                   placeholder_png, save_file)
from app.services.proof import InvalidImage, assess, parse_client_time, read_image
from app.utils import utcnow

router = APIRouter(prefix="/evidence", tags=["Evidence (Satya Proof)"])
optional_token = OAuth2PasswordBearer(tokenUrl="/auth/token", auto_error=False)


def _load(db: Session, user: User, evidence_id: int) -> Evidence:
    evidence = db.get(Evidence, evidence_id)
    if evidence is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence not found.")
    if evidence.mine_id is not None:
        get_mine_in_scope(db, user, evidence.mine_id)
    return evidence


@router.post("", status_code=status.HTTP_201_CREATED)
def upload_evidence(response: Response,
                    file: UploadFile = File(..., description="JPEG, PNG or WebP photo taken in the app"),
                    mine_id: int = Form(...),
                    lat: float | None = Form(None), lng: float | None = Form(None),
                    accuracy: float | None = Form(None, description="GPS accuracy in metres"),
                    device_time: str | None = Form(None, description="when the photo was taken, ISO 8601"),
                    device_id: str | None = Form(None), is_mocked: bool = Form(False),
                    client_uuid: str | None = Form(None),
                    user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Upload a photo. It is checked automatically (location, fake GPS, reused photo, time, camera details)
    and gets a trust score 0-100 with reasons. Use the returned id in findings, tasks and CAPA closures.
    Sending the same client_uuid again returns the existing evidence (offline retry)."""
    if client_uuid:
        existing = db.scalar(select(Evidence).where(Evidence.client_uuid == client_uuid))
        if existing is not None:
            if existing.uploaded_by != user.id:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="client_uuid already used.")
            response.status_code = status.HTTP_200_OK
            return evidence_out(db, existing)
    get_mine_in_scope(db, user, mine_id)
    limit = int(settings.max_upload_mb * 1024 * 1024)
    data = file.file.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            detail=f"Photo is larger than {settings.max_upload_mb:g} MB.")
    try:
        info = read_image(data)
    except InvalidImage as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    if info.format not in EXTENSIONS:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                            detail="Only JPEG, PNG or WebP photos are accepted.")
    try:
        taken_at = parse_client_time(device_time)
    except ValueError:
        raise HTTPException(status_code=422, detail="device_time must be an ISO date-time, e.g. 2026-09-26T10:15:00Z")
    if (lat is None) != (lng is None) or (lat is not None and not (-90 <= lat <= 90 and -180 <= lng <= 180)):
        raise HTTPException(status_code=422, detail="Send both lat and lng with valid values.")

    now = utcnow()
    evidence = Evidence(file_path=save_file(data, info.format), kind="photo", sha256=info.sha256, phash=info.phash,
                        lat=lat, lng=lng, accuracy=accuracy, device_time=taken_at, server_time=now,
                        device_id=device_id, is_mocked=is_mocked, exif=info.exif, mine_id=mine_id,
                        uploaded_by=user.id, client_uuid=client_uuid, content_type=CONTENT_TYPES[info.format],
                        size_bytes=len(data), flags=[], created_at=now)
    db.add(evidence)
    db.flush()
    evidence.trust_score, evidence.flags, evidence.checks = assess(db, evidence, info)
    db.commit()
    return evidence_out(db, evidence)


@router.get("")
def list_evidence(ids: str = Query(..., description="comma-separated ids, e.g. 12,15,40"),
                  user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Details of several evidence records at once (only those in the user's area)."""
    try:
        wanted = [int(i) for i in ids.split(",") if i.strip()][:200]
    except ValueError:
        raise HTTPException(status_code=422, detail="ids must be numbers separated by commas")
    allowed = set(scope_mine_ids(db, user))
    rows = db.scalars(select(Evidence).where(Evidence.id.in_(wanted)))
    return [evidence_out(db, e) for e in rows if e.mine_id is None or e.mine_id in allowed]


@router.get("/{evidence_id}")
def get_evidence(evidence_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Evidence details: trust score, level, checks with reasons, location, times, and a signed image `url`
    (valid 12 h) that can be used directly in <img src> / <Image source>."""
    return evidence_out(db, _load(db, user, evidence_id))


@router.get("/{evidence_id}/file", response_class=FileResponse,
            responses={200: {"content": {"image/jpeg": {}, "image/png": {}}}})
def get_file(evidence_id: int, sig: str | None = Query(None, description="signed link from the evidence `url`"),
             token: str | None = Depends(optional_token), db: Session = Depends(get_db)):
    """The image. Works with the signed `url` (no header needed) or with a normal Bearer token."""
    evidence = db.get(Evidence, evidence_id)
    if evidence is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evidence not found.")
    if not (sig and link_is_valid(evidence_id, sig)):
        if not token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Login or a valid link is required.")
        try:
            user = db.get(User, int(decode_access_token(token)["sub"]))
        except Exception:  # noqa: BLE001
            user = None
        if user is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired login.")
        _load(db, user, evidence_id)
    path = file_on_disk(evidence)
    if path is None:
        return Response(content=placeholder_png(evidence_id), media_type="image/png")
    return FileResponse(path, media_type=evidence.content_type or "image/jpeg")
