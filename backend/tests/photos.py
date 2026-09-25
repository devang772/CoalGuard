"""Make realistic test photos in memory (distinct scenes, optional camera EXIF)."""
import io
import random
from datetime import datetime, timedelta, timezone

from PIL import ExifTags, Image, ImageDraw

IST = timedelta(hours=5, minutes=30)


def now_utc() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None, microsecond=0)


def iso_z(moment: datetime) -> str:
    return moment.isoformat() + "Z"


def make_photo(scene: int, *, taken_utc: datetime | None = None, exif: bool = True, fmt: str = "JPEG",
               size: tuple[int, int] = (640, 480)) -> bytes:
    """A different picture for every `scene` number. EXIF time is written in IST like a real phone."""
    rng = random.Random(scene)
    img = Image.new("RGB", size, tuple(rng.randint(0, 255) for _ in range(3)))
    draw = ImageDraw.Draw(img)
    for _ in range(12):
        x0, y0 = rng.randint(0, size[0] - 60), rng.randint(0, size[1] - 60)
        draw.rectangle((x0, y0, x0 + rng.randint(40, 300), y0 + rng.randint(40, 200)),
                       fill=tuple(rng.randint(0, 255) for _ in range(3)))
    out = io.BytesIO()
    if exif and fmt == "JPEG":
        data = img.getexif()
        data[ExifTags.Base.Make] = "Samsung"
        data[ExifTags.Base.Model] = "SM-A525F"
        taken = (taken_utc or now_utc()) + IST
        data.get_ifd(ExifTags.IFD.Exif)[ExifTags.Base.DateTimeOriginal] = taken.strftime("%Y:%m:%d %H:%M:%S")
        img.save(out, format=fmt, exif=data.tobytes(), quality=90)
    else:
        img.save(out, format=fmt)
    return out.getvalue()


def resized(photo: bytes, factor: float = 0.6) -> bytes:
    img = Image.open(io.BytesIO(photo))
    small = img.resize((int(img.width * factor), int(img.height * factor)))
    out = io.BytesIO()
    small.save(out, format="JPEG", exif=img.getexif().tobytes(), quality=85)
    return out.getvalue()
