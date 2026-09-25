from datetime import datetime, timezone


def utcnow() -> datetime:
    """Current UTC time without tzinfo (how all timestamps are stored)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)
