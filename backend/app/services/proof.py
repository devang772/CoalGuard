"""Satya Proof: automatic trust checks for every uploaded photo.

Score = 100 minus the penalty of every failed check. Each check comes with a plain-language reason.
80-100 verified · 60-79 review · below 60 suspicious.
"""
import hashlib
import io
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import imagehash
from PIL import ExifTags, Image, UnidentifiedImageError
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Evidence, OrgUnit
from app.services.geo import distance_m, format_distance, outside_distance_m
from app.utils import IST_OFFSET

PENALTY = {
    "mock_location": 40, "outside_boundary": 35, "no_location": 30, "reused_photo": 50, "similar_photo": 40,
    "stale_photo": 20, "gps_mismatch": 20, "time_mismatch": 15, "low_gps_accuracy": 10, "no_exif": 10,
}

# Plain-language text for every flag (also used for seeded records that only have flag codes)
FLAG_TEXT = {
    "outside_boundary": "Photo was taken outside the mine boundary",
    "no_location": "Photo has no GPS location",
    "low_gps_accuracy": "GPS location was not precise",
    "mock_location": "A fake-GPS (mock location) app was detected",
    "reused_photo": "Same as (or looks like) a photo uploaded earlier",
    "time_mismatch": "Phone time does not match the real time or the photo's own time",
    "stale_photo": "Photo was taken long before it was uploaded",
    "no_exif": "No camera details in the photo (maybe a screenshot or edited image)",
    "gps_mismatch": "Location stored inside the photo differs from the phone's location",
}


def trust_level(score: int | None) -> str | None:
    if score is None:
        return None
    return "verified" if score >= 80 else "review" if score >= 60 else "suspicious"


class InvalidImage(ValueError):
    pass


@dataclass
class ImageInfo:
    sha256: str
    phash: str
    exif: dict
    width: int
    height: int
    format: str


def _gps_to_decimal(values, ref) -> float | None:
    try:
        d, m, s = (float(v) for v in values)
    except (TypeError, ValueError):
        return None
    value = d + m / 60 + s / 3600
    return -value if ref in ("S", "W") else value


def read_image(data: bytes) -> ImageInfo:
    """Hashes + the useful EXIF fields. Raises InvalidImage if the bytes aren't a real image."""
    try:
        img = Image.open(io.BytesIO(data))
        img.verify()                              # detects truncated / fake files
        img = Image.open(io.BytesIO(data))
    except (UnidentifiedImageError, OSError, SyntaxError) as exc:
        raise InvalidImage("The file is not a valid image.") from exc
    exif_raw = img.getexif()
    exif: dict = {}
    if exif_raw:
        exif["make"] = exif_raw.get(ExifTags.Base.Make)
        exif["model"] = exif_raw.get(ExifTags.Base.Model)
        exif["software"] = exif_raw.get(ExifTags.Base.Software)
        taken = exif_raw.get_ifd(ExifTags.IFD.Exif).get(ExifTags.Base.DateTimeOriginal) \
            or exif_raw.get(ExifTags.Base.DateTime)
        exif["datetime_original"] = str(taken) if taken else None
        gps = exif_raw.get_ifd(ExifTags.IFD.GPSInfo)
        if gps:
            lat = _gps_to_decimal(gps.get(ExifTags.GPS.GPSLatitude), gps.get(ExifTags.GPS.GPSLatitudeRef))
            lng = _gps_to_decimal(gps.get(ExifTags.GPS.GPSLongitude), gps.get(ExifTags.GPS.GPSLongitudeRef))
            if lat is not None and lng is not None:
                exif["gps_lat"], exif["gps_lng"] = round(lat, 6), round(lng, 6)
        exif = {k: (str(v) if v is not None and not isinstance(v, (int, float)) else v)
                for k, v in exif.items() if v is not None}
    return ImageInfo(sha256=hashlib.sha256(data).hexdigest(), phash=str(imagehash.phash(img.convert("RGB"))),
                     exif=exif, width=img.width, height=img.height,
                     format=(img.format or "").upper())


def phash_distance(a: str | None, b: str | None) -> int | None:
    if not a or not b or len(a) != len(b):
        return None
    return bin(int(a, 16) ^ int(b, 16)).count("1")


def parse_client_time(value: str | None) -> datetime | None:
    """ISO time from the phone -> aware UTC. A time without timezone is taken as UTC."""
    if not value:
        return None
    moment = datetime.fromisoformat(value.strip())
    if moment.tzinfo is None:
        return moment.replace(tzinfo=timezone.utc)
    return moment.astimezone(timezone.utc)


def _exif_time_utc(exif: dict) -> datetime | None:
    """Camera time is local phone time; phones in the mines run on IST."""
    raw = exif.get("datetime_original")
    try:
        return (datetime.strptime(raw, "%Y:%m:%d %H:%M:%S").replace(tzinfo=timezone.utc) - IST_OFFSET) if raw else None
    except ValueError:
        return None


def _describe_match(match: Evidence, mines: dict[int, str]) -> str:
    when = (match.created_at + IST_OFFSET).strftime("%d %b %Y")
    where = mines.get(match.mine_id, "another mine") if match.mine_id else "an unknown mine"
    return f"photo #{match.id} uploaded on {when} at {where}"


def assess(db: Session, evidence: Evidence, info: ImageInfo) -> tuple[int, list[str], list[dict]]:
    """Run every check. Returns (trust score, flag codes, checks with reasons)."""
    checks: list[dict] = []
    flags: list[str] = []

    def check(name: str, passed: bool, detail: str, flag: str | None = None) -> None:
        penalty = 0 if passed else PENALTY[flag]
        checks.append({"name": name, "passed": passed, "penalty": penalty, "detail": detail})
        if not passed and flag not in flags:
            flags.append(flag)

    mine = db.get(OrgUnit, evidence.mine_id) if evidence.mine_id else None
    mines = dict(db.execute(select(OrgUnit.id, OrgUnit.name)).all())

    # 1. location inside the mine boundary
    if evidence.lat is None or evidence.lng is None:
        check("Inside the mine boundary", False, "The photo was sent without a GPS location.", "no_location")
    elif mine is not None and mine.boundary:
        away = outside_distance_m(mine.boundary, evidence.lat, evidence.lng)
        check("Inside the mine boundary", away == 0,
              f"Taken inside {mine.name}." if away == 0 else f"Taken {format_distance(away)} outside {mine.name}.",
              "outside_boundary")

    # 2. GPS precision
    if evidence.accuracy is not None:
        ok = evidence.accuracy <= settings.gps_accuracy_limit_m
        check("GPS accuracy", ok, f"Location precise to ±{round(evidence.accuracy)} m." if ok else
              f"Location only precise to ±{round(evidence.accuracy)} m (limit {round(settings.gps_accuracy_limit_m)} m).",
              "low_gps_accuracy")

    # 3. fake GPS app
    check("No fake GPS", not evidence.is_mocked,
          "No mock-location app reported by the phone." if not evidence.is_mocked
          else "The phone reported a mock-location (fake GPS) app.", "mock_location")

    # 4. reused / look-alike photo
    exact = db.scalar(select(Evidence).where(Evidence.sha256 == info.sha256, Evidence.id != evidence.id)
                      .order_by(Evidence.id))
    if exact is not None:
        check("Fresh photo (not reused)", False, f"Exact copy of {_describe_match(exact, mines)}.", "reused_photo")
    else:
        similar, best = None, settings.similar_photo_distance + 1
        for other_id, other_hash in db.execute(select(Evidence.id, Evidence.phash).where(
                Evidence.phash.is_not(None), Evidence.id != evidence.id, Evidence.kind == "photo")):
            dist = phash_distance(info.phash, other_hash)
            if dist is not None and dist < best:
                similar, best = other_id, dist
        if similar is not None:
            match = db.get(Evidence, similar)
            checks.append({"name": "Fresh photo (not reused)", "passed": False, "penalty": PENALTY["similar_photo"],
                           "detail": f"Looks the same as {_describe_match(match, mines)} (resized or cropped copy?)."})
            flags.append("reused_photo")
        else:
            check("Fresh photo (not reused)", True, "No match with any earlier photo.")

    # 5. time checks
    now = evidence.server_time
    skew = timedelta(minutes=settings.clock_skew_minutes)
    exif_time = _exif_time_utc(info.exif)
    if evidence.device_time is not None:
        if evidence.device_time > now + skew:
            check("Time check", False, "The phone's clock is ahead of the real time.", "time_mismatch")
        elif exif_time is not None and abs(exif_time - evidence.device_time) > skew:
            gap = abs(exif_time - evidence.device_time)
            check("Time check", False, f"The photo's own time differs from the phone's time by "
                                       f"{round(gap.total_seconds() / 60)} minutes.", "time_mismatch")
        elif now - evidence.device_time > timedelta(days=settings.stale_photo_days):
            check("Time check", False, f"Taken {(now - evidence.device_time).days} days before it was uploaded.",
                  "stale_photo")
        else:
            check("Time check", True, "Phone time and photo time look right.")

    # 6. camera details (EXIF)
    has_camera = bool(info.exif.get("make") or info.exif.get("model") or info.exif.get("datetime_original"))
    check("Camera details (EXIF)", has_camera, "Real camera details found." if has_camera
          else "No camera details: could be a screenshot, download or edited picture.", "no_exif")

    # 7. GPS inside the photo vs GPS sent by the phone (only if the photo carries GPS)
    if "gps_lat" in info.exif and evidence.lat is not None:
        gap = distance_m(evidence.lat, evidence.lng, info.exif["gps_lat"], info.exif["gps_lng"])
        check("Photo GPS matches phone GPS", gap <= 100,
              "Matches." if gap <= 100 else f"The photo says it was taken {format_distance(gap)} away.", "gps_mismatch")

    score = max(0, 100 - sum(c["penalty"] for c in checks))
    return score, flags, checks


def checks_from_flags(flags: list[str] | None) -> list[dict]:
    """Readable checks for older records that only stored flag codes (e.g. sample data)."""
    return [{"name": FLAG_TEXT.get(f, f), "passed": False, "penalty": PENALTY.get(f, 0), "detail": FLAG_TEXT.get(f, f)}
            for f in flags or []]
