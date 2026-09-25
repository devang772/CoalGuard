"""Map data: mine boundaries (GeoJSON) and pins."""
from datetime import date, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user, scope_mine_ids
from app.db import get_db
from app.deps import resolve_mine_filter
from app.models import Finding, Observation, OrgUnit, User
from app.services.mines import mine_summaries
from app.utils import ist_day_start_utc, today_ist

router = APIRouter(prefix="/gis", tags=["Map (GIS)"])

PIN_TYPES = ("finding", "observation", "incident", "sos")
OBSERVATION_KINDS = {"observation": ["near_miss", "unsafe_act", "unsafe_condition"],
                     "incident": ["incident"], "sos": ["sos"]}
MAX_PINS = 2000


@router.get("/mines")
def gis_mines(org_id: int | None = None, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """GeoJSON FeatureCollection of mine boundaries with status numbers for colouring."""
    features = []
    for m in mine_summaries(db, scope_mine_ids(db, user, org_id=org_id)):
        features.append({
            "type": "Feature", "id": m["id"], "geometry": m["boundary"],
            "properties": {
                "id": m["id"], "name": m["name"], "code": m["code"], "mine_type": m["mine_type"],
                "subsidiary": m["subsidiary"], "area": m["area"],
                "center_lat": m["center_lat"], "center_lng": m["center_lng"],
                "compliance_pct": m["compliance_pct"], "overdue_tasks": m["overdue_tasks"],
                "open_capas": m["open_capas"], "risk_pct": m["risk"]["risk_pct"], "risk_level": m["risk"]["level"],
            },
        })
    return {"type": "FeatureCollection", "features": features}


@router.get("/pins")
def gis_pins(org_id: int | None = None, mine_id: int | None = None,
             types: str = Query(",".join(PIN_TYPES), description="comma list of: finding, observation, incident, sos"),
             severity: str | None = Query(None, description="comma list, e.g. high,critical"),
             from_date: date | None = Query(None, alias="from"), to_date: date | None = Query(None, alias="to"),
             user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Pins for the map (default: last 30 days). SOS pins come first."""
    mine_ids = resolve_mine_filter(db, user, org_id, mine_id)
    wanted = {t.strip() for t in types.split(",") if t.strip() in PIN_TYPES}
    severities = [s.strip() for s in severity.split(",")] if severity else None
    to_date = to_date or today_ist()
    from_date = from_date or to_date - timedelta(days=30)
    start, end = ist_day_start_utc(from_date), ist_day_start_utc(to_date + timedelta(days=1))
    names = dict(db.execute(select(OrgUnit.id, OrgUnit.name).where(OrgUnit.id.in_(mine_ids))).all())
    pins = []

    if "finding" in wanted:
        query = select(Finding).where(Finding.mine_id.in_(mine_ids), Finding.created_at >= start,
                                      Finding.created_at < end, Finding.lat.is_not(None))
        if severities:
            query = query.where(Finding.severity.in_(severities))
        for f in db.scalars(query.order_by(Finding.created_at.desc()).limit(MAX_PINS)):
            pins.append({"id": f"finding-{f.id}", "type": "finding", "subtype": f.category, "lat": f.lat,
                         "lng": f.lng, "severity": f.severity, "title": f.description, "mine_id": f.mine_id,
                         "mine_name": names.get(f.mine_id), "created_at": f.created_at})

    kinds = [k for t in wanted if t in OBSERVATION_KINDS for k in OBSERVATION_KINDS[t]]
    if kinds:
        query = select(Observation).where(Observation.mine_id.in_(mine_ids), Observation.type.in_(kinds),
                                          Observation.created_at >= start, Observation.created_at < end,
                                          Observation.lat.is_not(None))
        if severities:
            query = query.where(Observation.severity.in_(severities))
        for o in db.scalars(query.order_by(Observation.created_at.desc()).limit(MAX_PINS)):
            pin_type = "sos" if o.type == "sos" else "incident" if o.type == "incident" else "observation"
            pins.append({"id": f"observation-{o.id}", "type": pin_type, "subtype": o.type, "lat": o.lat,
                         "lng": o.lng, "severity": o.severity, "title": o.text, "mine_id": o.mine_id,
                         "mine_name": names.get(o.mine_id), "created_at": o.created_at,
                         "acknowledged": o.acknowledged_at is not None if o.type == "sos" else None})

    pins.sort(key=lambda p: (p["type"] != "sos", -p["created_at"].timestamp()))
    return pins[:MAX_PINS]
