"""Numbers for the command dashboard, the mine dashboard and the leaderboard."""
from collections import defaultdict
from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import settings
from app.models import (Attendance, Capa, ComplianceTask, EnvReading, Evidence, Finding, Notification, Observation,
                        OrgUnit, ProductionLog)
from app.services.risk import mine_risk
from app.services.tasks import compliance_stats
from app.utils import IST_OFFSET, ist_day_start_utc, today_ist, utcnow

WARNING_TYPES = ("near_miss", "unsafe_condition", "unsafe_act")
SUSPICIOUS_DISPATCH_RATIO = 0.8          # dispatched / produced below this = worth checking


# ---------------------------------------------------------------- small helpers

def month_bounds(month: str) -> tuple[date, date]:
    year, mon = int(month[:4]), int(month[5:7])
    first = date(year, mon, 1)
    return first, date(year + mon // 12, mon % 12 + 1, 1) - timedelta(days=1)


def previous_month(month: str) -> str:
    first, _ = month_bounds(month)
    return (first - timedelta(days=1)).strftime("%Y-%m")


def last_months(n: int, today: date) -> list[str]:
    months, current = [], today.replace(day=1)
    for _ in range(n):
        months.append(current.strftime("%Y-%m"))
        current = (current - timedelta(days=1)).replace(day=1)
    return list(reversed(months))


def _count(db: Session, query) -> int:
    return db.scalar(select(func.count()).select_from(query.subquery())) or 0


def _observations(db: Session, mine_ids, types, start, end) -> int:
    return _count(db, select(Observation.id).where(Observation.mine_id.in_(mine_ids), Observation.type.in_(types),
                                                   Observation.created_at >= start, Observation.created_at < end))


def _avg_trust(db: Session, mine_ids, start, end) -> float | None:
    value = db.scalar(select(func.avg(Evidence.trust_score)).where(
        Evidence.mine_id.in_(mine_ids), Evidence.created_at >= start, Evidence.created_at < end))
    return round(float(value), 1) if value is not None else None


def _valid_attendance(db: Session, mine_ids, day: date) -> tuple[int, int]:
    start = ist_day_start_utc(day)
    rows = db.execute(select(Attendance.valid, func.count()).where(
        Attendance.mine_id.in_(mine_ids), Attendance.time >= start, Attendance.time < start + timedelta(days=1))
        .group_by(Attendance.valid)).all()
    counts = {bool(v): n for v, n in rows}
    return counts.get(True, 0), counts.get(False, 0)


def _delta(now, before):
    return None if now is None or before is None else round(now - before, 1)


# ---------------------------------------------------------------- command dashboard

def summary(db: Session, mine_ids: list[int], viewer_id: int) -> dict:
    today, now = today_ist(), utcnow()
    last30, prev30 = today - timedelta(days=30), today - timedelta(days=60)
    s_now, s_30, s_60 = ist_day_start_utc(today + timedelta(days=1)), ist_day_start_utc(last30), ist_day_start_utc(prev30)

    comp_now = compliance_stats(db, mine_ids, last30, today)
    comp_prev = compliance_stats(db, mine_ids, prev30, last30 - timedelta(days=1))

    open_capas = db.execute(select(Capa.created_at, Capa.due_at, Capa.status).where(
        Capa.mine_id.in_(mine_ids), Capa.status.in_(["open", "in_review", "rejected"]))).all()
    ageing = {"lt7": 0, "d7_30": 0, "gt30": 0}
    for created, _, _ in open_capas:
        age = now - created
        ageing["lt7" if age < timedelta(days=7) else "d7_30" if age <= timedelta(days=30) else "gt30"] += 1

    incidents_now = _observations(db, mine_ids, ["incident"], s_30, s_now)
    incidents_prev = _observations(db, mine_ids, ["incident"], s_60, s_30)
    near_now = _observations(db, mine_ids, ["near_miss"], s_30, s_now)
    near_prev = _observations(db, mine_ids, ["near_miss"], s_60, s_30)
    trust_now, trust_prev = _avg_trust(db, mine_ids, s_30, s_now), _avg_trust(db, mine_ids, s_60, s_30)
    present, invalid = _valid_attendance(db, mine_ids, today)
    present_last_week, _ = _valid_attendance(db, mine_ids, today - timedelta(days=7))

    risks = mine_risk(db, mine_ids)
    names = dict(db.execute(select(OrgUnit.id, OrgUnit.name).where(OrgUnit.id.in_(mine_ids))).all())
    top = sorted(risks.items(), key=lambda kv: -kv[1]["risk_pct"])[:5]

    trend, incidents_trend = [], []
    for month in last_months(6, today):
        first, last = month_bounds(month)
        trend.append({"month": month, "pct": compliance_stats(db, mine_ids, first, min(last, today))["compliance_pct"]})
        a, b = ist_day_start_utc(first), ist_day_start_utc(last + timedelta(days=1))
        incidents_trend.append({"month": month, "incidents": _observations(db, mine_ids, ["incident"], a, b),
                                "near_miss": _observations(db, mine_ids, ["near_miss"], a, b)})

    by_category: dict[str, dict] = defaultdict(lambda: {"open": 0, "closed": 0})
    for category, cstatus in db.execute(select(Finding.category, Capa.status).join(Finding, Finding.id == Capa.finding_id)
                                        .where(Capa.mine_id.in_(mine_ids), Capa.created_at >= ist_day_start_utc(today - timedelta(days=90)))):
        by_category[category]["closed" if cstatus == "closed" else "open"] += 1

    alerts = db.scalars(select(Notification).where(Notification.user_id == viewer_id,
                                                   Notification.level.in_(["warning", "critical"]))
                        .order_by(Notification.created_at.desc()).limit(10))
    return {
        "scope": {"mines": len(mine_ids), "as_of": today},
        "compliance_pct": comp_now["compliance_pct"], "compliance_pct_previous": comp_prev["compliance_pct"],
        "compliance_delta": _delta(comp_now["compliance_pct"], comp_prev["compliance_pct"]),
        "overdue_tasks": _count(db, select(ComplianceTask.id).where(ComplianceTask.mine_id.in_(mine_ids),
                                                                     ComplianceTask.status == "overdue")),
        "open_capas": {"total": len(open_capas), **ageing,
                       "overdue": sum(1 for _, due, st in open_capas if st != "in_review" and due < now)},
        "incidents_month": incidents_now, "incidents_previous": incidents_prev,
        "near_miss_month": near_now, "near_miss_previous": near_prev,
        "avg_trust_score": trust_now, "avg_trust_score_previous": trust_prev,
        "active_workers_today": present, "active_workers_same_day_last_week": present_last_week,
        "invalid_attendance_today": invalid,
        "active_sos": _count(db, select(Observation.id).where(Observation.mine_id.in_(mine_ids),
                                                              Observation.type == "sos",
                                                              Observation.acknowledged_at.is_(None))),
        "top_risky_mines": [{"mine_id": mid, "mine_name": names.get(mid, ""), **r,
                             "top_reason": r["reasons"][0]["factor"] if r["reasons"] else None} for mid, r in top],
        "compliance_trend": trend, "incidents_trend": incidents_trend,
        "capa_by_category": sorted(({"category": k, **v} for k, v in by_category.items()),
                                   key=lambda x: -(x["open"] + x["closed"])),
        "recent_alerts": [{"id": n.id, "title": n.title, "body": n.body, "level": n.level, "kind": n.kind,
                           "link": n.link, "read": n.read, "created_at": n.created_at} for n in alerts],
    }


# ---------------------------------------------------------------- mine dashboard

def mine_series(db: Session, mine_id: int, days: int = 60) -> dict:
    today = today_ist()
    since = today - timedelta(days=days)
    production = []
    for d, produced, dispatched in db.execute(select(ProductionLog.date, ProductionLog.produced_t,
                                                     ProductionLog.dispatched_t)
                                              .where(ProductionLog.mine_id == mine_id, ProductionLog.date >= since)
                                              .order_by(ProductionLog.date)):
        ratio = dispatched / produced if produced else None
        production.append({"date": d, "produced_t": produced, "dispatched_t": dispatched,
                           "dispatch_ratio": round(ratio, 2) if ratio is not None else None,
                           "suspicious": ratio is not None and ratio < SUSPICIOUS_DISPATCH_RATIO})
    env = []
    for moment, pm10, noise in db.execute(select(EnvReading.time, EnvReading.pm10, EnvReading.noise)
                                          .where(EnvReading.mine_id == mine_id,
                                                 EnvReading.time >= ist_day_start_utc(since))
                                          .order_by(EnvReading.time)):
        env.append({"date": (moment + IST_OFFSET).date(), "pm10": pm10, "noise": noise,
                    "over_limit": pm10 is not None and pm10 > settings.pm10_limit})
    return {"production": production, "environment": env, "pm10_limit": settings.pm10_limit,
            "suspicious_dispatch_days": sum(1 for p in production if p["suspicious"]),
            "pm10_days_over_limit": sum(1 for e in env if e["over_limit"])}


# ---------------------------------------------------------------- leaderboard

def mine_scores(db: Session, mine_ids: list[int], month: str) -> dict[int, dict]:
    """Mine Safety Score 0-100 for one month:
    40% compliance + 25% CAPAs closed on time + 10% average photo trust + 25 points minus 8 per incident,
    minus 2 per CAPA still overdue (max 10)."""
    first, last = month_bounds(month)
    last = min(last, today_ist())
    start, end = ist_day_start_utc(first), ist_day_start_utc(last + timedelta(days=1))
    now = utcnow()
    result = {}
    for mine_id in mine_ids:
        compliance = compliance_stats(db, [mine_id], first, last)["compliance_pct"]
        due = db.execute(select(Capa.status, Capa.closed_at, Capa.due_at).where(
            Capa.mine_id == mine_id, Capa.due_at >= start, Capa.due_at < end)).all()
        on_time = sum(1 for st, closed, d in due if st == "closed" and closed is not None and closed <= d)
        capa_pct = round(100 * on_time / len(due), 1) if due else None
        incidents = _observations(db, [mine_id], ["incident"], start, end)
        overdue = _count(db, select(Capa.id).where(Capa.mine_id == mine_id, Capa.status.in_(["open", "rejected"]),
                                                   Capa.due_at < min(end, now)))
        trust = _avg_trust(db, [mine_id], start, end)
        parts = {"compliance": 0.40 * (compliance if compliance is not None else 100),
                 "capa_on_time": 0.25 * (capa_pct if capa_pct is not None else 100),
                 "photo_trust": 0.10 * (trust if trust is not None else 100),
                 "no_incidents": max(0.0, 25 - 8 * incidents),
                 "overdue_penalty": -min(10, 2 * overdue)}
        result[mine_id] = {"safety_score": round(max(0.0, min(100.0, sum(parts.values()))), 1),
                           "compliance_pct": compliance, "capa_on_time_pct": capa_pct, "incidents": incidents,
                           "overdue_capas": overdue, "avg_trust_score": trust,
                           "breakdown": {k: round(v, 1) for k, v in parts.items()}}
    return result


def leaderboard(db: Session, mine_ids: list[int], month: str, by: str = "mine") -> list[dict]:
    units = {u.id: u for u in db.scalars(select(OrgUnit))}
    now_scores, prev_scores = mine_scores(db, mine_ids, month), mine_scores(db, mine_ids, previous_month(month))

    def subsidiary_of(mine_id: int) -> OrgUnit:
        return units[units[units[mine_id].parent_id].parent_id]

    if by == "subsidiary":
        groups: dict[int, list[int]] = defaultdict(list)
        for mid in mine_ids:
            groups[subsidiary_of(mid).id].append(mid)
        rows = []
        for sid, mids in groups.items():
            avg = lambda scores: round(sum(scores[m]["safety_score"] for m in mids) / len(mids), 1)  # noqa: E731
            rows.append({"id": sid, "name": units[sid].name, "code": units[sid].code, "mines": len(mids),
                         "safety_score": avg(now_scores), "previous_score": avg(prev_scores),
                         "incidents": sum(now_scores[m]["incidents"] for m in mids),
                         "overdue_capas": sum(now_scores[m]["overdue_capas"] for m in mids)})
    else:
        rows = [{"id": mid, "name": units[mid].name, "subsidiary": subsidiary_of(mid).code,
                 "area": units[units[mid].parent_id].name, **now_scores[mid],
                 "previous_score": prev_scores[mid]["safety_score"]} for mid in mine_ids]
    rows.sort(key=lambda r: (-r["safety_score"], r["name"]))
    for rank, row in enumerate(rows, start=1):
        row["rank"] = rank
        diff = row["safety_score"] - row["previous_score"]
        row["trend"] = "up" if diff > 1 else "down" if diff < -1 else "same"
    return rows
