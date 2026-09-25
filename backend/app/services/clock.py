"""Demo clock: lets reminders and escalations happen faster in a demo.

With DEMO_TIME_SPEED = 60, every real minute that passes after the server started counts as one hour
*for deadline checks*. Time before the server started counts normally, so old sample data is not
suddenly escalated. Stored timestamps are never changed.
"""
from datetime import datetime

from app.config import settings
from app.utils import utcnow

DEMO_START = utcnow()


def effective_now(created_at: datetime, now: datetime | None = None, speed: float | None = None) -> datetime:
    """'Now' as seen by the deadline of an item created at `created_at`."""
    now = now or utcnow()
    speed = settings.demo_time_speed if speed is None else speed
    if speed <= 1:
        return now
    anchor = max(created_at, DEMO_START)
    if now <= anchor:
        return now
    return anchor + (now - anchor) * speed
