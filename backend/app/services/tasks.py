"""Compliance task maker, overdue marker and compliance % calculation."""
from datetime import date, timedelta

from sqlalchemy import and_, delete, select, update
from sqlalchemy.orm import Session

from app.models import ComplianceTask, MineObligation, Obligation
from app.utils import ist_date, today_ist

DAILY_AHEAD_DAYS = 2        # daily tasks are created for today + next 2 days
WEEKLY_AHEAD_DAYS = 7       # weekly tasks: every Sunday in the next 7 days


def _month_end(year: int, month: int) -> date:
    return date(year + month // 12, month % 12 + 1, 1) - timedelta(days=1)


def upcoming_due_dates(frequency: str, today: date) -> list[date]:
    """Due dates of the current period(s) for one frequency.

    daily: today and the next 2 days · weekly: Sundays within the next 7 days ·
    monthly: last day of this month · quarterly: last day of this quarter (Mar/Jun/Sep/Dec) ·
    yearly: 31 March (end of the Indian financial year), this one or the next.
    """
    if frequency == "daily":
        return [today + timedelta(days=i) for i in range(DAILY_AHEAD_DAYS + 1)]
    if frequency == "weekly":
        return [today + timedelta(days=i) for i in range(WEEKLY_AHEAD_DAYS + 1)
                if (today + timedelta(days=i)).weekday() == 6]
    if frequency == "monthly":
        return [_month_end(today.year, today.month)]
    if frequency == "quarterly":
        quarter_last_month = ((today.month - 1) // 3 + 1) * 3
        return [_month_end(today.year, quarter_last_month)]
    if frequency == "yearly":
        this_year = date(today.year, 3, 31)
        return [this_year if this_year >= today else date(today.year + 1, 3, 31)]
    raise ValueError(f"Unknown frequency: {frequency}")


def generate_tasks(db: Session, mine_ids: list[int] | None = None, today: date | None = None) -> int:
    """Create the current-period tasks for every active mine obligation. Safe to run many times."""
    today = today or today_ist()
    query = (select(MineObligation.mine_id, MineObligation.obligation_id, Obligation.frequency)
             .join(Obligation, Obligation.id == MineObligation.obligation_id)
             .where(MineObligation.status == "active"))
    if mine_ids is not None:
        if not mine_ids:
            return 0
        query = query.where(MineObligation.mine_id.in_(mine_ids))
    wanted = {(mine_id, obligation_id, due)
              for mine_id, obligation_id, frequency in db.execute(query)
              for due in upcoming_due_dates(frequency, today)}
    if not wanted:
        return 0
    existing_query = select(ComplianceTask.mine_id, ComplianceTask.obligation_id, ComplianceTask.due_date).where(
        ComplianceTask.due_date >= today)
    if mine_ids is not None:
        existing_query = existing_query.where(ComplianceTask.mine_id.in_(mine_ids))
    missing = wanted - set(db.execute(existing_query).tuples())
    for mine_id, obligation_id, due in sorted(missing):
        db.add(ComplianceTask(mine_id=mine_id, obligation_id=obligation_id, due_date=due, status="pending"))
    db.flush()
    return len(missing)


def mark_overdue(db: Session, today: date | None = None) -> int:
    """Pending tasks whose due date has passed become overdue."""
    today = today or today_ist()
    result = db.execute(update(ComplianceTask)
                        .where(ComplianceTask.status == "pending", ComplianceTask.due_date < today)
                        .values(status="overdue"))
    return result.rowcount or 0


def remove_future_tasks(db: Session, mine_id: int, obligation_ids: list[int], today: date | None = None) -> int:
    """Delete not-yet-done tasks from today onward (used when an obligation stops applying)."""
    if not obligation_ids:
        return 0
    today = today or today_ist()
    result = db.execute(delete(ComplianceTask).where(
        ComplianceTask.mine_id == mine_id, ComplianceTask.obligation_id.in_(obligation_ids),
        ComplianceTask.due_date >= today, ComplianceTask.status != "done"))
    return result.rowcount or 0


def compliance_stats(db: Session, mine_ids: list[int], start: date, end: date) -> dict:
    """Compliance % = tasks done on or before their due date / tasks that were due in [start, end].

    Only tasks already due (due date before today) count, so today's open tasks don't lower the score.
    """
    end = min(end, today_ist() - timedelta(days=1))
    empty = {"due": 0, "done_on_time": 0, "done_late": 0, "overdue": 0, "compliance_pct": None, "by_category": []}
    if not mine_ids or end < start:
        return empty
    rows = db.execute(select(ComplianceTask.due_date, ComplianceTask.status, ComplianceTask.done_at, Obligation.category)
                      .join(Obligation, Obligation.id == ComplianceTask.obligation_id)
                      .where(ComplianceTask.mine_id.in_(mine_ids),
                             and_(ComplianceTask.due_date >= start, ComplianceTask.due_date <= end))).all()
    stats = dict(empty)
    by_category: dict[str, dict] = {}
    for due, status, done_at, category in rows:
        cat = by_category.setdefault(category, {"category": category, "due": 0, "done_on_time": 0})
        stats["due"] += 1
        cat["due"] += 1
        if status == "done" and done_at is not None and ist_date(done_at) <= due:
            stats["done_on_time"] += 1
            cat["done_on_time"] += 1
        elif status == "done":
            stats["done_late"] += 1
        else:
            stats["overdue"] += 1
    stats["compliance_pct"] = round(100 * stats["done_on_time"] / stats["due"], 1) if stats["due"] else None
    for cat in by_category.values():
        cat["compliance_pct"] = round(100 * cat["done_on_time"] / cat["due"], 1)
    stats["by_category"] = sorted(by_category.values(), key=lambda c: c["category"])
    return stats
