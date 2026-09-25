"""File storage for photos and generated reports: the local uploads folder or Cloudinary.

Every saved file gets a *reference* string, stored in the database:
    local:       "2026/09/<uuid>.jpg"                                   (relative to UPLOAD_DIR)
    cloudinary:  "cloudinary:<resource_type>:<public_id>[.<format>]"    e.g. "cloudinary:image:khanan-netra/evidence/2026/09/<uuid>.jpg"
The reference says where the file lives, so switching STORAGE_BACKEND later does not break older files.

Cloudinary files are uploaded as type "private": they have no public link. Our API checks permissions and then
redirects to a Cloudinary download link that expires after CLOUDINARY_LINK_MINUTES.
"""
import io
import logging
import tempfile
import time
import urllib.request
import uuid
from pathlib import Path
from urllib.parse import urlparse

from app.config import settings
from app.utils import utcnow

log = logging.getLogger(__name__)
BACKEND_DIR = Path(__file__).resolve().parents[2]
CLOUD_PREFIX = "cloudinary:"
RAW_EXTENSIONS = {"pdf", "xlsx", "csv", "json", "txt"}          # uploaded as Cloudinary "raw" files


class StorageError(RuntimeError):
    """The storage service could not save or return a file."""


# ---------------------------------------------------------------- helpers

def upload_root() -> Path:
    root = Path(settings.upload_dir)
    return root if root.is_absolute() else BACKEND_DIR / root


def is_cloud_ref(ref: str) -> bool:
    return ref.startswith(CLOUD_PREFIX)


def _new_name(kind: str, ext: str) -> str:
    now = utcnow()
    return f"{kind}/{now:%Y}/{now:%m}/{uuid.uuid4().hex}.{ext}"


# ---------------------------------------------------------------- Cloudinary

def cloudinary_config() -> dict:
    """cloud_name / api_key / api_secret from CLOUDINARY_URL or the three separate settings."""
    if settings.cloudinary_url:
        parsed = urlparse(settings.cloudinary_url)
        if parsed.scheme != "cloudinary" or not (parsed.hostname and parsed.username and parsed.password):
            raise StorageError("CLOUDINARY_URL must look like cloudinary://<api_key>:<api_secret>@<cloud_name>")
        return {"cloud_name": parsed.hostname, "api_key": parsed.username, "api_secret": parsed.password}
    values = {"cloud_name": settings.cloudinary_cloud_name, "api_key": settings.cloudinary_api_key,
              "api_secret": settings.cloudinary_api_secret}
    if not all(values.values()):
        raise StorageError("STORAGE_BACKEND=cloudinary needs CLOUDINARY_URL (or CLOUDINARY_CLOUD_NAME, "
                           "CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET).")
    return values


def _cloudinary():
    import cloudinary
    cloudinary.config(secure=True, **cloudinary_config())
    return cloudinary


def _cloud_upload(data: bytes, public_id: str, resource_type: str) -> dict:
    """Thin wrapper around the SDK (tests replace this)."""
    import cloudinary.uploader
    _cloudinary()
    return cloudinary.uploader.upload(io.BytesIO(data), public_id=public_id, resource_type=resource_type,
                                      type="private", overwrite=False, unique_filename=False)


def _cloud_download_url(public_id: str, fmt: str, resource_type: str, expires_at: int) -> str:
    """Thin wrapper around the SDK (tests replace this)."""
    import cloudinary.utils
    _cloudinary()
    return cloudinary.utils.private_download_url(public_id, fmt, resource_type=resource_type, type="private",
                                                 expires_at=expires_at)


def _parse_cloud_ref(ref: str) -> tuple[str, str, str]:
    """-> (resource_type, public_id, format)"""
    resource_type, rest = ref[len(CLOUD_PREFIX):].split(":", 1)
    if resource_type == "raw":
        return resource_type, rest, ""                            # raw public ids keep their extension
    public_id, _, fmt = rest.rpartition(".")
    return resource_type, public_id, fmt


# ---------------------------------------------------------------- public API

def save(data: bytes, ext: str, kind: str = "evidence") -> str:
    """Store the bytes and return the reference to keep in the database."""
    ext = ext.lower().lstrip(".")
    name = _new_name(kind, ext)
    if settings.storage_backend == "cloudinary":
        resource_type = "raw" if ext in RAW_EXTENSIONS else "image"
        base = f"{settings.cloudinary_folder.strip('/')}/{name}"
        public_id = base if resource_type == "raw" else base.rsplit(".", 1)[0]
        try:
            result = _cloud_upload(data, public_id, resource_type)
        except StorageError:
            raise
        except Exception as exc:  # noqa: BLE001 - network / auth / quota problems
            log.exception("Cloudinary upload failed")
            raise StorageError("The photo storage service is not reachable right now. Please try again.") from exc
        stored_id = result.get("public_id", public_id)
        fmt = result.get("format") or ext
        return f"{CLOUD_PREFIX}{resource_type}:{stored_id}" + ("" if resource_type == "raw" else f".{fmt}")
    if settings.storage_backend != "local":
        raise StorageError(f"Unknown STORAGE_BACKEND '{settings.storage_backend}' (use local or cloudinary).")
    target = upload_root() / name
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    return name


def local_path(ref: str) -> Path | None:
    """The file on local disk, or None (missing, sample data, or stored in the cloud)."""
    if is_cloud_ref(ref):
        return None
    path = (upload_root() / ref).resolve()
    if upload_root().resolve() not in path.parents or not path.is_file():
        return None
    return path


def download_url(ref: str) -> str | None:
    """A short-lived Cloudinary download link (None for local files)."""
    if not is_cloud_ref(ref):
        return None
    resource_type, public_id, fmt = _parse_cloud_ref(ref)
    expires_at = int(time.time()) + settings.cloudinary_link_minutes * 60
    return _cloud_download_url(public_id, fmt, resource_type, expires_at)


def readable_copy(ref: str) -> Path | None:
    """A path that can be opened like a normal file (downloads a temporary copy of cloud files).
    Used by code that needs a real file, e.g. the ML teammate's photo check."""
    path = local_path(ref)
    if path is not None or not is_cloud_ref(ref):
        return path
    try:
        with urllib.request.urlopen(download_url(ref), timeout=20) as response:    # noqa: S310 - our own signed URL
            data = response.read()
    except Exception:  # noqa: BLE001
        log.exception("Could not download %s from Cloudinary", ref)
        return None
    suffix = "." + (ref.rsplit(".", 1)[-1] if "." in ref.rsplit("/", 1)[-1] else "bin")
    cache = Path(tempfile.gettempdir()) / "khanan-netra-cache"
    cache.mkdir(exist_ok=True)
    target = cache / (uuid.uuid5(uuid.NAMESPACE_URL, ref).hex + suffix)
    target.write_bytes(data)
    return target


def check_configuration() -> str:
    """Called at startup: fail early with a clear message if Cloudinary is selected but not configured."""
    if settings.storage_backend == "cloudinary":
        cloud = cloudinary_config()["cloud_name"]
        return f"cloudinary (cloud '{cloud}', folder '{settings.cloudinary_folder}', private files)"
    if settings.storage_backend != "local":
        raise StorageError(f"Unknown STORAGE_BACKEND '{settings.storage_backend}' (use local or cloudinary).")
    return f"local folder {upload_root()}"
