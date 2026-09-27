"""Field reports (unsafe act / unsafe condition / near-miss / incident, app or voice) and SOS."""
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_roles, user_mine
from app.constants import Role
from app.db import get_db
from app.deps import Pagination, check_evidence, get_mine_in_scope, resolve_mine_filter
from app.models import Capa, Finding, Observation, OrgUnit, User
from app.schemas import ObservationCreate, ObservationOut, Page, SosCreate, SosResult
from app.services.capa import create_capa_for_finding
from app.services.evidence import evidence_brief
from app.services.notify import MANAGER_AND_GM, SOS_CHAIN, notify, people_for_mine
from app.utils import ist_day_start_utc, utcnow

router = APIRouter(tags=["Field reports & SOS"])

RESPONDERS = (Role.SUPERVISOR, Role.SAFETY_OFFICER, Role.MINE_MANAGER, Role.AREA_GM, Role.SUBSIDIARY_ADMIN,
              Role.CIL_ADMIN)
CONVERTERS = (Role.SAFETY_OFFICER, Role.MINE_MANAGER, Role.AREA_GM, Role.SUBSIDIARY_ADMIN, Role.CIL_ADMIN)
PHOTO_REQUIRED = ("unsafe_condition", "incident")
FINDING_CATEGORIES = {"roof", "haul_road", "conveyor", "electrical", "fire", "water", "dust", "ppe", "machinery",
                      "explosives", "other"}
SOS_KIND_TEXT = {"fire": "Fire", "roof_fall": "Roof fall", "gas": "Gas", "injury": "Injury", "flooding": "Flooding",
                 "other": "Emergency"}


def needs_action(obs: Observation) -> bool:
    """Serious reports become a finding + CAPA automatically."""
    return obs.type == "incident" or (obs.type == "unsafe_condition" and obs.severity in ("high", "critical"))


def rows(db: Session, observations: list[Observation]) -> list[dict]:
    if not observations:
        return []
    user_ids = {o.reporter_id for o in observations} | {o.acknowledged_by for o in observations}
    names = dict(db.execute(select(User.id, User.name).where(User.id.in_({i for i in user_ids if i}))).all())
    mines = dict(db.execute(select(OrgUnit.id, OrgUnit.name).where(
        OrgUnit.id.in_({o.mine_id for o in observations}))).all())
    capas = {c.finding_id: c for c in db.scalars(select(Capa).where(
        Capa.finding_id.in_({o.finding_id for o in observations if o.finding_id})))}
    out = []
    for o in observations:
        capa = capas.get(o.finding_id)
        response = None
        if o.acknowledged_at is not None:
            response = round((o.acknowledged_at - o.created_at).total_seconds() / 60, 1)
        out.append({
            "id": o.id, "mine_id": o.mine_id, "mine_name": mines.get(o.mine_id, ""), "type": o.type,
            "category": o.category, "text": o.text, "severity": o.severity, "lat": o.lat, "lng": o.lng,
            "location_text": o.location_text, "source": o.source, "language": o.language, "transcript": o.transcript,
            "anonymous": o.anonymous, "reporter_id": None if o.anonymous else o.reporter_id,
            "reporter_name": None if o.anonymous else names.get(o.reporter_id),
            "evidence": evidence_brief(db, o.evidence_id), "finding_id": o.finding_id,
            "capa_id": capa.id if capa else None, "capa_status": capa.status if capa else None,
            "acknowledged_by": o.acknowledged_by, "acknowledged_by_name": names.get(o.acknowledged_by),
            "acknowledged_at": o.acknowledged_at, "response_minutes": response, "created_at": o.created_at,
        })
    return out


def _mine_for(db: Session, user: User, mine_id: int | None) -> int:
    if mine_id is None:
        own = user_mine(db, user)
        if own is None:
            raise HTTPException(status_code=422, detail="mine_id is required for users above mine level.")
        mine_id = own.id
    get_mine_in_scope(db, user, mine_id)
    return mine_id


def convert_to_action(db: Session, obs: Observation) -> Capa:
    """Create a finding + CAPA from a field report (once)."""
    if obs.finding_id is not None:
        return db.scalar(select(Capa).where(Capa.finding_id == obs.finding_id))
    finding = Finding(inspection_id=None, mine_id=obs.mine_id,
                      category=obs.category if obs.category in FINDING_CATEGORIES else "other",
                      description=f"[{obs.type.replace('_', ' ')}] {obs.text}"[:2000], severity=obs.severity,
                      lat=obs.lat, lng=obs.lng, photo_evidence_id=obs.evidence_id, created_at=utcnow())
    db.add(finding)
    db.flush()
    obs.finding_id = finding.id
    return create_capa_for_finding(db, finding)


# ---------------------------------------------------------------- field reports

@router.post("/observations", response_model=ObservationOut, status_code=status.HTTP_201_CREATED)
def create_observation(body: ObservationCreate, response: Response, user: User = Depends(get_current_user),
                       db: Session = Depends(get_db)):
    """Report a hazard, near-miss or incident (anyone at the mine, workers too; optionally anonymous).
    A photo is required for unsafe conditions and incidents sent from the form (voice reports may skip it).
    Incidents and high/critical unsafe conditions automatically become a finding + CAPA."""
    if body.client_uuid:
        existing = db.scalar(select(Observation).where(Observation.client_uuid == body.client_uuid))
        if existing is not None:
            response.status_code = status.HTTP_200_OK
            return rows(db, [existing])[0]
    mine_id = _mine_for(db, user, body.mine_id)
    if body.type in PHOTO_REQUIRED and body.source == "app" and body.evidence_id is None:
        raise HTTPException(status_code=422, detail="A photo is required for unsafe conditions and incidents.")
    check_evidence(db, body.evidence_id, mine_id)
    obs = Observation(mine_id=mine_id, reporter_id=None if body.anonymous else user.id, type=body.type,
                      category=body.category, text=body.text.strip(), severity=body.severity, lat=body.lat,
                      lng=body.lng, location_text=body.location_text, source=body.source, language=body.language,
                      transcript=body.transcript, anonymous=body.anonymous, evidence_id=body.evidence_id,
                      client_uuid=body.client_uuid, created_at=utcnow())
    db.add(obs)
    db.flush()
    level = "critical" if obs.type == "incident" or obs.severity == "critical" else "warning" if obs.severity == "high" else "info"
    mine_name = db.get(OrgUnit, mine_id).name if mine_id else "Mine"
    recipients = people_for_mine(db, mine_id, MANAGER_AND_GM)
    if user and user.id not in recipients:
        recipients.append(user.id)

    if needs_action(obs):
        capa = convert_to_action(db, obs)
        notify(db, recipients,
               f"{'Incident' if obs.type == 'incident' else 'Serious hazard'} at {mine_name}",
               f"{obs.text} · CAPA #{capa.id} created", level=level, kind="incident", link=f"/capa/{capa.id}")
    else:
        notify(db, recipients,
               f"Hazard Reported at {mine_name}",
               f"[{obs.type.replace('_', ' ').upper()}] {obs.text}", level=level, kind="incident", link=f"/observations/{obs.id}")
    db.commit()
    return rows(db, [obs])[0]


@router.get("/observations", response_model=Page[ObservationOut])
def list_observations(org_id: int | None = None, mine_id: int | None = None,
                      type: str | None = Query(None, description="comma list: unsafe_act,unsafe_condition,near_miss,incident,sos"),
                      severity: str | None = Query(None, description="comma list"),
                      source: str | None = Query(None, description="app / voice"),
                      acknowledged: bool | None = None,
                      from_date: date | None = Query(None, alias="from"), to_date: date | None = Query(None, alias="to"),
                      paging: Pagination = Depends(),
                      user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Field reports in the user's area. Unacknowledged SOS first, then newest first."""
    query = select(Observation).where(Observation.mine_id.in_(resolve_mine_filter(db, user, org_id, mine_id)))
    if user.role in (Role.WORKER, Role.CONTRACTOR_ADMIN):
        query = query.where(Observation.reporter_id == user.id)          # workers see their own reports only
    if type:
        query = query.where(Observation.type.in_([t.strip() for t in type.split(",")]))
    if severity:
        query = query.where(Observation.severity.in_([s.strip() for s in severity.split(",")]))
    if source:
        query = query.where(Observation.source == source)
    if acknowledged is not None:
        query = query.where(Observation.acknowledged_at.is_not(None) if acknowledged
                            else Observation.acknowledged_at.is_(None))
    if from_date:
        query = query.where(Observation.created_at >= ist_day_start_utc(from_date))
    if to_date:
        query = query.where(Observation.created_at < ist_day_start_utc(to_date + timedelta(days=1)))
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    urgent = case(((Observation.type == "sos") & Observation.acknowledged_at.is_(None), 0), else_=1)
    items = list(db.scalars(query.order_by(urgent, Observation.created_at.desc(), Observation.id.desc())
                            .offset(paging.offset).limit(paging.page_size)))
    return {"items": rows(db, items), "total": total, "page": paging.page, "page_size": paging.page_size}


def _load(db: Session, user: User, observation_id: int) -> Observation:
    obs = db.get(Observation, observation_id)
    if obs is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not found.")
    get_mine_in_scope(db, user, obs.mine_id)
    if user.role in (Role.WORKER, Role.CONTRACTOR_ADMIN) and obs.reporter_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can see only your own reports.")
    return obs


@router.get("/observations/{observation_id}", response_model=ObservationOut)
def get_observation(observation_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return rows(db, [_load(db, user, observation_id)])[0]


@router.post("/observations/{observation_id}/acknowledge", response_model=ObservationOut)
def acknowledge(observation_id: int, user: User = Depends(require_roles(*RESPONDERS)), db: Session = Depends(get_db)):
    """'Seen and handling it'. The first acknowledgement is kept (with the response time)."""
    obs = _load(db, user, observation_id)
    if obs.acknowledged_at is None:
        obs.acknowledged_by, obs.acknowledged_at = user.id, utcnow()
        if obs.type == "sos" and obs.reporter_id and obs.reporter_id != user.id:
            notify(db, [obs.reporter_id], "Help is on the way",
                   f"{user.name} responded to your SOS.", level="critical", kind="sos",
                   link=f"/observations/{obs.id}")
        db.commit()
    return rows(db, [obs])[0]


@router.post("/observations/{observation_id}/convert", response_model=ObservationOut)
def convert(observation_id: int, user: User = Depends(require_roles(*CONVERTERS)), db: Session = Depends(get_db)):
    """Turn any report into a finding + CAPA (done automatically for incidents and serious hazards)."""
    obs = _load(db, user, observation_id)
    if obs.type == "sos":
        raise HTTPException(status_code=422, detail="SOS alerts are handled by acknowledging them.")
    convert_to_action(db, obs)
    db.commit()
    return rows(db, [obs])[0]


# ---------------------------------------------------------------- SOS

@router.post("/sos", response_model=SosResult, status_code=status.HTTP_201_CREATED)
def raise_sos(body: SosCreate, response: Response, user: User = Depends(get_current_user),
              db: Session = Depends(get_db)):
    """Emergency. Alerts the mine manager, safety officers, area GM, subsidiary admin and CIL admin at once
    (critical level, pushed live)."""
    if body.client_uuid:
        existing = db.scalar(select(Observation).where(Observation.client_uuid == body.client_uuid))
        if existing is not None:
            response.status_code = status.HTTP_200_OK
            return {**rows(db, [existing])[0], "notified": 0}
    mine_id = _mine_for(db, user, body.mine_id)
    mine = db.get(OrgUnit, mine_id)
    label = SOS_KIND_TEXT[body.kind]
    obs = Observation(mine_id=mine_id, reporter_id=user.id, type="sos", category=body.kind,
                      text=f"SOS: {label}" + (f": {body.note}" if body.note else ""), severity="critical",
                      lat=body.lat, lng=body.lng, source="app", anonymous=False, client_uuid=body.client_uuid,
                      created_at=utcnow())
    db.add(obs)
    db.flush()
    notified = notify(db, people_for_mine(db, mine_id, SOS_CHAIN, exclude={user.id}),
                      f"🆘 SOS at {mine.name}: {label}", f"From {user.name}" + (f": {body.note}" if body.note else ""),
                      level="critical", kind="sos", link=f"/observations/{obs.id}")
    db.commit()
    return {**rows(db, [obs])[0], "notified": notified}


@router.get("/sos/active", response_model=list[ObservationOut])
def active_sos(org_id: int | None = None, user: User = Depends(require_roles(*RESPONDERS)),
               db: Session = Depends(get_db)):
    """SOS alerts nobody has acknowledged yet (oldest first: most urgent)."""
    query = select(Observation).where(Observation.mine_id.in_(resolve_mine_filter(db, user, org_id, None)),
                                      Observation.type == "sos", Observation.acknowledged_at.is_(None))
    return rows(db, list(db.scalars(query.order_by(Observation.created_at))))
