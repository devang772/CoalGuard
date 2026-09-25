from datetime import date, datetime, timedelta, timezone

IST_OFFSET = timedelta(hours=5, minutes=30)


def utcnow() -> datetime:
    """Current time, timezone-aware UTC (the database stores UTC; see app.db.UTCDateTime)."""
    return datetime.now(timezone.utc)


def today_ist() -> date:
    """Today's date in India. Due dates and "today" filters use Indian calendar days."""
    return (utcnow() + IST_OFFSET).date()


def ist_date(moment: datetime) -> date:
    """Indian calendar day of a UTC timestamp."""
    return (moment + IST_OFFSET).date()


def ist_day_start_utc(day: date) -> datetime:
    """The UTC moment at which an Indian calendar day begins."""
    return datetime.combine(day, datetime.min.time(), tzinfo=timezone.utc) - IST_OFFSET
