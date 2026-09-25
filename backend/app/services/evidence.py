"""Evidence locker: store uploaded photos (local folder or Cloudinary), build safe download links,
describe evidence for the API."""
import io
from datetime import timedelta
from functools import lru_cache
from pathlib import Path

import jwt
from PIL import Image, ImageDraw
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Evidence, User
from app.services import storage
from app.services.proof import checks_from_flags, trust_level
from app.utils import utcnow

EXTENSIONS = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp"}
CONTENT_TYPES = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}
LINK_HOURS = 12


def save_file(data: bytes, image_format: str) -> str:
    """Store the photo (local folder or Cloudinary, per STORAGE_BACKEND) and return its storage reference.
    Raises storage.StorageError if the storage service is unavailable."""
    return storage.save(data, EXTENSIONS[image_format], kind="evidence")


def file_on_disk(evidence: Evidence) -> Path | None:
    """A readable file for this evidence (a temporary copy for cloud files), or None for sample data."""
    return storage.readable_copy(evidence.file_path)


def stored_in(evidence: Evidence) -> str:
    if evidence.file_path.startswith("seed/"):
        return "sample"
    return "cloudinary" if storage.is_cloud_ref(evidence.file_path) else "local"


# ---------------------------------------------------------------- signed links (so <img src> works without headers)

def signed_url(evidence_id: int) -> str:
    token = jwt.encode({"evd": evidence_id, "exp": utcnow() + timedelta(hours=LINK_HOURS)},
                       settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return f"/evidence/{evidence_id}/file?sig={token}"


def link_is_valid(evidence_id: int, sig: str) -> bool:
    try:
        return jwt.decode(sig, settings.jwt_secret, algorithms=[settings.jwt_algorithm]).get("evd") == evidence_id
    except jwt.PyJWTError:
        return False


@lru_cache(maxsize=64)
def placeholder_png(evidence_id: int) -> bytes:
    """Grey picture for sample-data records that have no real file."""
    img = Image.new("RGB", (640, 480), (203, 213, 225))
    draw = ImageDraw.Draw(img)
    draw.rectangle((20, 20, 620, 460), outline=(100, 116, 139), width=4)
    draw.text((240, 220), f"Sample photo #{evidence_id}", fill=(30, 41, 59))
    draw.text((225, 245), "(no image file in sample data)", fill=(71, 85, 105))
    out = io.BytesIO()
    img.save(out, format="PNG")
    return out.getvalue()


# ---------------------------------------------------------------- API shape

def evidence_out(db: Session, evidence: Evidence, names: dict[int, str] | None = None) -> dict:
    if names is None:
        names = dict(db.execute(select(User.id, User.name).where(User.id == evidence.uploaded_by)).all()) \
            if evidence.uploaded_by else {}
    return {
        "id": evidence.id, "kind": evidence.kind, "url": signed_url(evidence.id),
        "mine_id": evidence.mine_id, "lat": evidence.lat, "lng": evidence.lng, "accuracy": evidence.accuracy,
        "device_time": evidence.device_time, "server_time": evidence.server_time,
        "device_id": evidence.device_id, "is_mocked": evidence.is_mocked,
        "trust_score": evidence.trust_score, "trust_level": trust_level(evidence.trust_score),
        "flags": evidence.flags or [],
        "checks": evidence.checks if evidence.checks is not None else checks_from_flags(evidence.flags),
        "exif": evidence.exif or {}, "sha256": evidence.sha256,
        "uploaded_by": evidence.uploaded_by, "uploaded_by_name": names.get(evidence.uploaded_by),
        "is_sample": evidence.file_path.startswith("seed/"), "stored_in": stored_in(evidence),
        "created_at": evidence.created_at,
    }


def evidence_brief(db: Session, evidence_id: int | None) -> dict | None:
    """Short form used inside CAPA / task responses."""
    if evidence_id is None:
        return None
    ev = db.get(Evidence, evidence_id)
    if ev is None:
        return None
    return {"id": ev.id, "url": signed_url(ev.id), "lat": ev.lat, "lng": ev.lng, "device_time": ev.device_time,
            "trust_score": ev.trust_score, "trust_level": trust_level(ev.trust_score), "flags": ev.flags or []}
