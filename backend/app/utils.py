from datetime import date, datetime, timedelta, timezone

IST_OFFSET = timedelta(hours=5, minutes=30)


def utcnow() -> datetime:
    """Current UTC time without tzinfo (how all timestamps are stored)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def today_ist() -> date:
    """Today's date in India. Due dates and "today" filters use Indian calendar days."""
    return (utcnow() + IST_OFFSET).date()


def ist_date(moment: datetime) -> date:
    """Indian calendar day of a stored (UTC) timestamp."""
    return (moment + IST_OFFSET).date()


def ist_day_start_utc(day: date) -> datetime:
    """The stored-UTC timestamp at which an Indian calendar day begins."""
    return datetime.combine(day, datetime.min.time()) - IST_OFFSET
