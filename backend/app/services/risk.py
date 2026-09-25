"""Risk % per mine for the map and lists.

Uses the ML teammate's app.ai.risk_model.predict_risk(db, mine_ids) when available.
Until then (or if it fails) a simple, explainable score from overdue work and warning signs is used.
"""
import importlib
import logging
from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Capa, ComplianceTask, Observation
from app.utils import today_ist, utcnow

log = logging.getLogger(__name__)


def risk_level(pct: float) -> str:
    return "high" if pct >= 70 else "medium" if pct >= 40 else "low"


def _counts_by_mine(db: Session, query) -> dict[int, int]:
    return dict(db.execute(query).all())


def simple_risk(db: Session, mine_ids: list[int]) -> dict[int, dict]:
    now, today = utcnow(), today_ist()
    overdue_capas = _counts_by_mine(db, select(Capa.mine_id, func.count()).where(
        Capa.mine_id.in_(mine_ids), Capa.status == "open", Capa.due_at < now).group_by(Capa.mine_id))
    overdue_tasks = _counts_by_mine(db, select(ComplianceTask.mine_id, func.count()).where(
        ComplianceTask.mine_id.in_(mine_ids), ComplianceTask.status == "overdue",
        ComplianceTask.due_date >= today - timedelta(days=30)).group_by(ComplianceTask.mine_id))
    warnings = _counts_by_mine(db, select(Observation.mine_id, func.count()).where(
        Observation.mine_id.in_(mine_ids), Observation.created_at >= now - timedelta(days=14),
        Observation.type.in_(["near_miss", "unsafe_condition", "unsafe_act"])).group_by(Observation.mine_id))
    incidents = _counts_by_mine(db, select(Observation.mine_id, func.count()).where(
        Observation.mine_id.in_(mine_ids), Observation.created_at >= now - timedelta(days=30),
        Observation.type == "incident").group_by(Observation.mine_id))
    monsoon = today.month in (7, 8, 9)
    result = {}
    for mine_id in mine_ids:
        parts = [("Overdue CAPAs", overdue_capas.get(mine_id, 0), 4.0),
                 ("Overdue compliance tasks (30 days)", overdue_tasks.get(mine_id, 0), 0.4),
                 ("Near-misses and unsafe reports (14 days)", warnings.get(mine_id, 0), 2.0),
                 ("Incidents (30 days)", incidents.get(mine_id, 0), 8.0),
                 ("Monsoon season", int(monsoon), 10.0)]
        pct = min(100.0, round(sum(value * weight for _, value, weight in parts), 1))
        reasons = sorted(({"factor": name, "value": value, "impact_pct": round(value * weight, 1)}
                          for name, value, weight in parts if value), key=lambda r: -r["impact_pct"])[:3]
        result[mine_id] = {"risk_pct": pct, "level": risk_level(pct), "reasons": reasons, "source": "simple_score"}
    return result


def mine_risk(db: Session, mine_ids: list[int]) -> dict[int, dict]:
    if not mine_ids:
        return {}
    try:
        module = importlib.import_module("app.ai.risk_model")
        rows = module.predict_risk(db, mine_ids)
        result = {r["mine_id"]: {"risk_pct": r["risk_pct"], "level": r.get("level") or risk_level(r["risk_pct"]),
                                 "reasons": r.get("reasons", []), "source": "ml_model"} for r in rows}
        missing = [m for m in mine_ids if m not in result]
        if missing:
            result.update(simple_risk(db, missing))
        return result
    except ImportError:
        pass
    except Exception:  # noqa: BLE001 - never break the map because of the model
        log.exception("ML risk model failed; using the simple score")
    return simple_risk(db, mine_ids)
