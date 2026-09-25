"""Grievance box: submit (anonymous by default), track by token, officers reply."""
import secrets
import string

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_roles, user_mine
from app.constants import Role
from app.db import get_db
from app.deps import Pagination, get_mine_in_scope, resolve_mine_filter
from app.models import Grievance, OrgUnit, User
from app.schemas import GrievanceCreate, GrievanceOut, GrievanceReceipt, GrievanceTrack, GrievanceUpdate, Page
from app.services.notify import notify, people_for_mine
from app.utils import utcnow

router = APIRouter(prefix="/grievances", tags=["Grievances"])

HANDLERS = (Role.MINE_MANAGER, Role.AREA_GM, Role.SUBSIDIARY_ADMIN, Role.CIL_ADMIN)
ALWAYS_ANONYMOUS = {"harassment"}
TOKEN_CHARS = string.ascii_uppercase + string.digits


def _new_token(db: Session) -> str:
    while True:
        token = "GRV-" + "".join(secrets.choice(TOKEN_CHARS) for _ in range(6))
        if db.scalar(select(Grievance.id).where(Grievance.token == token)) is None:
            return token


def _rows(db: Session, grievances: list[Grievance]) -> list[dict]:
    if not grievances:
        return []
    ids = {g.user_id for g in grievances if g.user_id and not g.anonymous} | {g.responded_by for g in grievances}
    names = dict(db.execute(select(User.id, User.name).where(User.id.in_({i for i in ids if i}))).all())
    mines = dict(db.execute(select(OrgUnit.id, OrgUnit.name).where(OrgUnit.id.in_({g.mine_id for g in grievances}))).all())
    return [{"id": g.id, "token": g.token, "mine_id": g.mine_id, "mine_name": mines.get(g.mine_id, ""),
             "category": g.category, "text": g.text, "anonymous": g.anonymous,
             "reporter_name": None if g.anonymous else names.get(g.user_id), "status": g.status,
             "response": g.response, "responded_by_name": names.get(g.responded_by), "responded_at": g.responded_at,
             "language": g.language, "created_at": g.created_at, "updated_at": g.updated_at} for g in grievances]


def _receipt(g: Grievance, message: str) -> dict:
    return {"id": g.id, "token": g.token, "status": g.status, "anonymous": g.anonymous, "message": message}


@router.post("", response_model=GrievanceReceipt, status_code=status.HTTP_201_CREATED)
def submit(body: GrievanceCreate, response: Response, user: User = Depends(get_current_user),
           db: Session = Depends(get_db)):
    """Submit a grievance. Anonymous (default, and always for harassment) = no name or user id is stored
    anywhere, not even in the audit history. Keep the token to track it."""
    if body.client_uuid:
        existing = db.scalar(select(Grievance).where(Grievance.client_uuid == body.client_uuid))
        if existing is not None:
            response.status_code = status.HTTP_200_OK
            return _receipt(existing, "Already received.")
    mine_id = body.mine_id
    if mine_id is None:
        own = user_mine(db, user)
        if own is None:
            raise HTTPException(status_code=422, detail="mine_id is required for users above mine level.")
        mine_id = own.id
    get_mine_in_scope(db, user, mine_id)
    anonymous = body.anonymous or body.category in ALWAYS_ANONYMOUS
    now = utcnow()
    g = Grievance(token=_new_token(db), mine_id=mine_id, category=body.category, text=body.text.strip(),
                  anonymous=anonymous, user_id=None if anonymous else user.id, status="new",
                  language=body.language, client_uuid=body.client_uuid, created_at=now, updated_at=now)
    db.add(g)
    db.flush()
    notify(db, people_for_mine(db, mine_id, {Role.MINE_MANAGER}), f"New grievance: {body.category}",
           f"{g.token} · {'anonymous' if anonymous else 'named'}", kind="grievance", link=f"/grievances/{g.id}")
    db.commit()
    return _receipt(g, "Your grievance is registered. Save this token to check its status."
                    + (" Your name is not stored." if anonymous else ""))


@router.get("/track/{token}", response_model=GrievanceTrack)
def track(token: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Status and reply for a token (anyone logged in who has the token; shows no identity)."""
    g = db.scalar(select(Grievance).where(Grievance.token == token.strip().upper()))
    if g is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No grievance with this token.")
    return {"token": g.token, "category": g.category, "status": g.status, "response": g.response,
            "responded_at": g.responded_at, "created_at": g.created_at, "updated_at": g.updated_at}


@router.get("", response_model=Page[GrievanceOut])
def list_grievances(org_id: int | None = None, mine_id: int | None = None,
                    status_filter: str | None = Query(None, alias="status", description="comma list"),
                    category: str | None = None, paging: Pagination = Depends(),
                    user: User = Depends(require_roles(*HANDLERS)), db: Session = Depends(get_db)):
    """Grievances in the user's area: new first, then newest."""
    query = select(Grievance).where(Grievance.mine_id.in_(resolve_mine_filter(db, user, org_id, mine_id)))
    if status_filter:
        query = query.where(Grievance.status.in_([s.strip() for s in status_filter.split(",")]))
    if category:
        query = query.where(Grievance.category == category)
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    order = (Grievance.status != "new", Grievance.created_at.desc(), Grievance.id.desc())
    items = list(db.scalars(query.order_by(*order).offset(paging.offset).limit(paging.page_size)))
    return {"items": _rows(db, items), "total": total, "page": paging.page, "page_size": paging.page_size}


def _load(db: Session, user: User, grievance_id: int) -> Grievance:
    g = db.get(Grievance, grievance_id)
    if g is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Grievance not found.")
    get_mine_in_scope(db, user, g.mine_id)
    return g


@router.get("/{grievance_id}", response_model=GrievanceOut)
def get_grievance(grievance_id: int, user: User = Depends(require_roles(*HANDLERS)), db: Session = Depends(get_db)):
    return _rows(db, [_load(db, user, grievance_id)])[0]


@router.patch("/{grievance_id}", response_model=GrievanceOut)
def respond(grievance_id: int, body: GrievanceUpdate, user: User = Depends(require_roles(*HANDLERS)),
            db: Session = Depends(get_db)):
    """Reply and/or change the status. The reporter sees the reply through the token
    (and, if not anonymous, also gets a notification)."""
    g = _load(db, user, grievance_id)
    now = utcnow()
    if body.response and body.response.strip():
        g.response, g.responded_by, g.responded_at = body.response.strip(), user.id, now
        if g.status == "new" and body.status is None:
            g.status = "in_progress"
    if body.status is not None:
        g.status = body.status
    g.updated_at = now
    if not g.anonymous and g.user_id:
        notify(db, [g.user_id], f"Update on your grievance {g.token}", f"Status: {g.status.replace('_', ' ')}",
               kind="grievance", link=f"/grievances/track/{g.token}")
    db.commit()
    return _rows(db, [g])[0]
