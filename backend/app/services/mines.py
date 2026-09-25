"""Mine summary numbers shared by the mines list, mine detail and the map."""
from datetime import timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.constants import Role
from app.models import Capa, ComplianceTask, OrgUnit, User
from app.services.risk import mine_risk
from app.services.tasks import compliance_stats
from app.utils import today_ist

COMPLIANCE_WINDOW_DAYS = 30


def mine_summaries(db: Session, mine_ids: list[int]) -> list[dict]:
    if not mine_ids:
        return []
    mines = list(db.scalars(select(OrgUnit).where(OrgUnit.id.in_(mine_ids)).order_by(OrgUnit.name)))
    units = {u.id: u for u in db.scalars(select(OrgUnit))}
    managers = dict(db.execute(select(User.org_unit_id, func.min(User.name)).where(
        User.org_unit_id.in_(mine_ids), User.role == Role.MINE_MANAGER).group_by(User.org_unit_id)).all())
    overdue = dict(db.execute(select(ComplianceTask.mine_id, func.count()).where(
        ComplianceTask.mine_id.in_(mine_ids), ComplianceTask.status == "overdue")
        .group_by(ComplianceTask.mine_id)).all())
    open_capas = dict(db.execute(select(Capa.mine_id, func.count()).where(
        Capa.mine_id.in_(mine_ids), Capa.status.in_(["open", "in_review", "rejected"]))
        .group_by(Capa.mine_id)).all())
    risks = mine_risk(db, mine_ids)
    end = today_ist()
    start = end - timedelta(days=COMPLIANCE_WINDOW_DAYS)
    result = []
    for mine in mines:
        area = units.get(mine.parent_id)
        subsidiary = units.get(area.parent_id) if area else None
        result.append({
            "id": mine.id, "name": mine.name, "code": mine.code, "mine_type": mine.mine_type,
            "subsidiary": subsidiary.code if subsidiary else "", "subsidiary_id": subsidiary.id if subsidiary else 0,
            "area": area.name if area else "", "area_id": area.id if area else 0,
            "center_lat": mine.center_lat, "center_lng": mine.center_lng, "boundary": mine.boundary,
            "manager_name": managers.get(mine.id),
            "compliance_pct": compliance_stats(db, [mine.id], start, end)["compliance_pct"],
            "overdue_tasks": overdue.get(mine.id, 0), "open_capas": open_capas.get(mine.id, 0),
            "risk": risks[mine.id],
        })
    return result
