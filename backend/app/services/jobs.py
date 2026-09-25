"""Background jobs: nightly tasks, reminders, the escalation ladder, and the morning digest.

Each job takes the database session and "now" (so tests can use a fake clock), changes records through
the ORM (so every change lands in the audit chain), sends notifications, and returns what it did.
Every reminder / escalation step is sent only once.
"""
import math
from collections import defaultdict
from datetime import date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.constants import Role
from app.models import (Capa, ComplianceTask, Contractor, EscalationRule, Finding, Grievance, Obligation,
                        Observation, OrgUnit)
from app.services.clock import effective_now
from app.services.fraud import contractor_alerts, contractor_score
from app.services.notify import notify, people_for_mine
from app.services.tasks import generate_tasks, mark_overdue
from app.utils import IST_OFFSET, today_ist, utcnow

DEFAULT_LADDER = [Role.MINE_MANAGER, Role.AREA_GM, Role.SUBSIDIARY_ADMIN, Role.CIL_ADMIN]
TASK_STEPS = [(1, 1), (3, 2), (7, 3)]                 # days late -> level
GRIEVANCE_STEPS = [(7, 1, Role.AREA_GM), (14, 2, Role.SUBSIDIARY_ADMIN)]
SOS_STEPS = [(15, 1, {Role.AREA_GM, Role.SUBSIDIARY_ADMIN}), (30, 2, {Role.CIL_ADMIN})]   # minutes unanswered
LEVEL_NAME = {1: "Area GM", 2: "Subsidiary", 3: "CIL"}


def _rules(db: Session) -> dict[str, EscalationRule]:
    return {r.severity: r for r in db.scalars(select(EscalationRule))}


def _ladder(rule: EscalationRule | None) -> list[str]:
    return list(rule.levels) if rule and rule.levels else DEFAULT_LADDER


def _hours(td: timedelta) -> float:
    return td.total_seconds() / 3600


def _mine_names(db: Session) -> dict[int, str]:
    return dict(db.execute(select(OrgUnit.id, OrgUnit.name)).all())


# ---------------------------------------------------------------- nightly

def refresh_contractor_scores(db: Session) -> int:
    """Store each contractor's current score (the API computes it live; this keeps contractors.score
    correct for reports, SQL and the ML teammate). Only changed scores are written."""
    contractors = list(db.scalars(select(Contractor)))
    alerts = contractor_alerts(db, [c.id for c in contractors])
    changed = 0
    for c in contractors:
        score = contractor_score(alerts[c.id])
        if c.score != score:
            c.score = score
            changed += 1
    db.flush()
    return changed


def nightly(db: Session, today: date | None = None) -> dict:
    """Create this period's tasks, mark late ones overdue, refresh contractor scores."""
    created = generate_tasks(db, today=today)
    overdue = mark_overdue(db, today=today)
    return {"tasks_created": created, "tasks_marked_overdue": overdue,
            "contractor_scores_updated": refresh_contractor_scores(db)}


# ---------------------------------------------------------------- reminders

def reminders(db: Session, now: datetime | None = None, speed: float | None = None) -> dict:
    """Remind CAPA owners before the deadline (hours from escalation_rules.reminder_hours), once per step."""
    now = now or utcnow()
    rules = _rules(db)
    sent = 0
    rows = db.execute(select(Capa, Finding.severity, Finding.description)
                      .join(Finding, Finding.id == Capa.finding_id)
                      .where(Capa.status.in_(["open", "rejected"]), Capa.owner_id.is_not(None))).all()
    names = _mine_names(db)
    for capa, severity, description in rows:
        virtual = effective_now(capa.created_at, now, speed)
        if virtual >= capa.due_at:
            continue                                            # already late: the escalation job handles it
        hours_left = _hours(capa.due_at - virtual)
        done = set(capa.reminders_sent or [])
        due_steps = [h for h in (rules.get(severity).reminder_hours if rules.get(severity) else []) if hours_left <= h]
        new_steps = [h for h in due_steps if h not in done]
        if not new_steps:
            continue
        notify(db, [capa.owner_id], f"Reminder: CAPA #{capa.id} is due in {math.ceil(hours_left)} h",
               f"{names.get(capa.mine_id, '')}: {description}", level="warning" if hours_left <= 24 else "info",
               kind="reminder", link=f"/capa/{capa.id}")
        capa.reminders_sent = sorted(done | set(due_steps), reverse=True)
        sent += 1
    db.flush()
    return {"capa_reminders_sent": sent}


# ---------------------------------------------------------------- escalation ladder

def _escalate_capas(db: Session, now: datetime, speed: float | None, names: dict[int, str]) -> int:
    rules = _rules(db)
    steps = 0
    rows = db.execute(select(Capa, Finding.severity, Finding.description)
                      .join(Finding, Finding.id == Capa.finding_id)
                      .where(Capa.status.in_(["open", "rejected"]))).all()
    for capa, severity, description in rows:
        virtual = effective_now(capa.created_at, now, speed)
        if virtual <= capa.due_at:
            continue
        rule = rules.get(severity)
        ladder = _ladder(rule)
        sla = rule.sla_hours if rule else 168
        target = min(len(ladder) - 1, 1 + int(_hours(virtual - capa.due_at) // sla))
        if target <= capa.escalation_level:
            continue
        late_by = virtual - capa.due_at
        for level in range(capa.escalation_level + 1, target + 1):
            notify(db, people_for_mine(db, capa.mine_id, {ladder[level]}),
                   f"Escalated to you: CAPA #{capa.id} overdue at {names.get(capa.mine_id, '')}",
                   f"{severity.title()} · {description} · late by {_describe(late_by)} · level {level}",
                   level="critical" if severity == "critical" or level >= 2 else "warning",
                   kind="escalation", link=f"/capa/{capa.id}")
            steps += 1
        notify(db, [capa.owner_id], f"CAPA #{capa.id} escalated to {LEVEL_NAME.get(target, 'level ' + str(target))}",
               f"Overdue by {_describe(late_by)}. Please fix it now.", level="warning", kind="escalation",
               link=f"/capa/{capa.id}")
        capa.escalation_level, capa.last_escalated_at = target, now
    return steps


def _escalate_tasks(db: Session, now: datetime, speed: float | None, names: dict[int, str]) -> int:
    rules = _rules(db)
    grouped: dict[tuple[int, int, str], list[str]] = defaultdict(list)   # (mine, level, role) -> task titles
    rows = db.execute(select(ComplianceTask, Obligation.title, Obligation.severity)
                      .join(Obligation, Obligation.id == ComplianceTask.obligation_id)
                      .where(ComplianceTask.status == "overdue")).all()
    for task, title, severity in rows:
        virtual_day = (effective_now(task.created_at, now, speed) + IST_OFFSET).date()
        days_late = (virtual_day - task.due_date).days
        target = max((level for days, level in TASK_STEPS if days_late >= days), default=0)
        if target <= task.escalation_level:
            continue
        ladder = _ladder(rules.get(severity))
        for level in range(task.escalation_level + 1, min(target, len(ladder) - 1) + 1):
            grouped[(task.mine_id, level, ladder[level])].append(title)
        task.escalation_level, task.last_escalated_at = target, now
    for (mine_id, level, role), titles in grouped.items():
        shown = "; ".join(sorted(set(titles))[:5]) + (" …" if len(set(titles)) > 5 else "")
        notify(db, people_for_mine(db, mine_id, {role}),
               f"{len(titles)} overdue compliance task(s) at {names.get(mine_id, '')} escalated to you",
               f"Level {level}: {shown}", level="warning" if level == 1 else "critical", kind="escalation",
               link=f"/tasks?mine_id={mine_id}&due=overdue")
    return len(grouped)


def _escalate_grievances(db: Session, now: datetime, speed: float | None, names: dict[int, str]) -> int:
    steps = 0
    for g in db.scalars(select(Grievance).where(Grievance.status == "new", Grievance.responded_at.is_(None))):
        age_days = (effective_now(g.created_at, now, speed) - g.created_at).days
        for days, level, role in GRIEVANCE_STEPS:
            if age_days >= days and g.escalation_level < level:
                notify(db, people_for_mine(db, g.mine_id, {role}),
                       f"Grievance {g.token} unanswered for {age_days} days", f"{names.get(g.mine_id, '')} · "
                       f"{g.category}: {g.text[:120]}", level="warning", kind="escalation",
                       link=f"/grievances/{g.id}")
                g.escalation_level = level
                steps += 1
    return steps


def _escalate_sos(db: Session, now: datetime, speed: float | None, names: dict[int, str]) -> int:
    steps = 0
    for sos in db.scalars(select(Observation).where(Observation.type == "sos", Observation.acknowledged_at.is_(None))):
        minutes = _hours(effective_now(sos.created_at, now, speed) - sos.created_at) * 60
        for limit, level, roles in SOS_STEPS:
            if minutes >= limit and sos.escalation_level < level:
                notify(db, people_for_mine(db, sos.mine_id, roles),
                       f"🆘 SOS at {names.get(sos.mine_id, '')} still unanswered after {int(minutes)} min",
                       sos.text, level="critical", kind="sos", link=f"/observations/{sos.id}")
                sos.escalation_level = level
                steps += 1
    return steps


def escalation(db: Session, now: datetime | None = None, speed: float | None = None) -> dict:
    """Move late items up the ladder, one step at a time, each step notified once."""
    now = now or utcnow()
    names = _mine_names(db)
    result = {"capa_steps": _escalate_capas(db, now, speed, names),
              "task_groups": _escalate_tasks(db, now, speed, names),
              "grievance_steps": _escalate_grievances(db, now, speed, names),
              "sos_realerts": _escalate_sos(db, now, speed, names)}
    db.flush()
    return result


# ---------------------------------------------------------------- morning digest

def morning_digest(db: Session, today: date | None = None) -> dict:
    """One summary per safety officer / mine manager: tasks due today, overdue tasks, overdue CAPAs."""
    today = today or today_ist()
    now = utcnow()
    due_today, overdue, capas = defaultdict(int), defaultdict(int), defaultdict(int)
    for mine_id, due, task_status in db.execute(select(ComplianceTask.mine_id, ComplianceTask.due_date,
                                                       ComplianceTask.status).where(ComplianceTask.status != "done")):
        if due == today:
            due_today[mine_id] += 1
        if task_status == "overdue":
            overdue[mine_id] += 1
    for (mine_id,) in db.execute(select(Capa.mine_id).where(Capa.status.in_(["open", "rejected"]), Capa.due_at < now)):
        capas[mine_id] += 1
    sent = 0
    for mine in db.scalars(select(OrgUnit).where(OrgUnit.type == "mine")):
        if not (due_today[mine.id] or overdue[mine.id] or capas[mine.id]):
            continue
        sent += notify(db, people_for_mine(db, mine.id, {Role.MINE_MANAGER, Role.SAFETY_OFFICER}),
                       f"Today at {mine.name}: {due_today[mine.id]} task(s) due",
                       f"{overdue[mine.id]} overdue task(s) · {capas[mine.id]} overdue CAPA(s)",
                       kind="digest", link=f"/tasks?mine_id={mine.id}&due=today")
    db.flush()
    return {"digests_sent": sent}


def _describe(delta: timedelta) -> str:
    hours = _hours(delta)
    return f"{hours:.0f} h" if hours < 48 else f"{hours / 24:.0f} days"


JOBS = {"nightly": nightly, "reminders": reminders, "escalation": escalation, "digest": morning_digest}
