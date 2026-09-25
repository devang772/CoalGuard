"""The alarm clock: runs the jobs on a timetable (Indian time) inside the API process."""
import logging
import time
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from app.db import SessionLocal
from app.services.jobs import JOBS
from app.utils import utcnow

log = logging.getLogger(__name__)
IST = ZoneInfo("Asia/Kolkata")

SCHEDULE = {
    "nightly": CronTrigger(hour=0, minute=5, timezone=IST),
    "reminders": IntervalTrigger(minutes=15, timezone=IST),
    "escalation": IntervalTrigger(minutes=5, timezone=IST),
    "digest": CronTrigger(hour=8, minute=0, timezone=IST),
}
SCHEDULE_TEXT = {"nightly": "every night at 00:05 IST", "reminders": "every 15 minutes",
                 "escalation": "every 5 minutes", "digest": "every day at 08:00 IST"}

status: dict[str, dict] = {name: {"schedule": SCHEDULE_TEXT[name], "last_run": None, "duration_ms": None,
                                  "result": None, "error": None, "runs": 0} for name in JOBS}
_scheduler: BackgroundScheduler | None = None


def run_job(name: str) -> dict:
    """Run one job now in its own session and record the outcome."""
    started = time.perf_counter()
    entry = status[name]
    try:
        with SessionLocal() as db:
            result = JOBS[name](db)
            db.commit()
        entry.update(result=result, error=None)
        return result
    except Exception as exc:  # noqa: BLE001 - a failing job must not kill the scheduler
        log.exception("Job %s failed", name)
        entry.update(result=None, error=str(exc))
        raise
    finally:
        entry.update(last_run=utcnow(), duration_ms=round((time.perf_counter() - started) * 1000), runs=entry["runs"] + 1)


def _safe(name: str):
    def runner():
        try:
            run_job(name)
        except Exception:  # noqa: BLE001 - already logged
            pass
    return runner


def start() -> None:
    global _scheduler
    if _scheduler is not None:
        return
    _scheduler = BackgroundScheduler(timezone=IST, job_defaults={"coalesce": True, "max_instances": 1,
                                                                 "misfire_grace_time": 300})
    for name, trigger in SCHEDULE.items():
        _scheduler.add_job(_safe(name), trigger, id=name, name=name)
    _scheduler.start()
    log.info("Scheduler started: %s", ", ".join(f"{n} ({SCHEDULE_TEXT[n]})" for n in SCHEDULE))


def stop() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None


def running() -> bool:
    return _scheduler is not None and _scheduler.running


def next_runs() -> dict[str, str | None]:
    if not running():
        return {name: None for name in SCHEDULE}
    return {job.id: job.next_run_time.isoformat() if job.next_run_time else None for job in _scheduler.get_jobs()}
