"""Admin: users (create, edit, deactivate, reset password, link a worker login)."""
import secrets
import string

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import require_roles
from app.constants import OrgType, Role
from app.db import get_db
from app.deps import Pagination
from app.models import Contractor, OrgUnit, User, Worker
from app.routers.org import subtree_ids
from app.security import hash_password

router = APIRouter(prefix="/users", tags=["Admin: users"])

VIEWERS = (Role.MINE_MANAGER, Role.AREA_GM, Role.SUBSIDIARY_ADMIN, Role.CIL_ADMIN)
EDITORS = (Role.MINE_MANAGER, Role.SUBSIDIARY_ADMIN, Role.CIL_ADMIN)

# Which org level each role sits at
ROLE_LEVEL = {Role.CIL_ADMIN: {OrgType.CIL}, Role.SUBSIDIARY_ADMIN: {OrgType.SUBSIDIARY}, Role.AREA_GM: {OrgType.AREA},
              Role.REGULATOR: {OrgType.SUBSIDIARY, OrgType.AREA},
              Role.MINE_MANAGER: {OrgType.MINE}, Role.SAFETY_OFFICER: {OrgType.MINE}, Role.SUPERVISOR: {OrgType.MINE},
              Role.WORKER: {OrgType.MINE}, Role.CONTRACTOR_ADMIN: {OrgType.MINE}}
# Which roles each editor may create / edit (inside their own part of the org tree)
CAN_MANAGE = {Role.CIL_ADMIN: set(Role.ALL),
              Role.SUBSIDIARY_ADMIN: {Role.AREA_GM, Role.MINE_MANAGER, Role.SAFETY_OFFICER, Role.SUPERVISOR,
                                      Role.WORKER, Role.CONTRACTOR_ADMIN},
              Role.MINE_MANAGER: {Role.SAFETY_OFFICER, Role.SUPERVISOR, Role.WORKER, Role.CONTRACTOR_ADMIN}}


class UserCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    phone: str = Field(pattern=r"^\d{10,15}$")
    role: str
    org_unit_id: int
    language: str = Field(default="en", max_length=5)
    password: str | None = Field(default=None, min_length=8, max_length=128,
                                 description="leave empty to get a one-time temporary password")
    worker_id: int | None = Field(default=None, description="for role=worker: link this login to a worker record")


class UserUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    role: str | None = None
    org_unit_id: int | None = None
    language: str | None = Field(default=None, max_length=5)
    is_active: bool | None = None
    worker_id: int | None = None


def _temp_password() -> str:
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(10))


def _out(db: Session, u: User, temporary_password: str | None = None) -> dict:
    unit = db.get(OrgUnit, u.org_unit_id)
    worker_id = db.scalar(select(Worker.id).where(Worker.user_id == u.id))
    data = {"id": u.id, "name": u.name, "phone": u.phone, "role": u.role, "language": u.language,
            "is_active": u.is_active, "org_unit_id": u.org_unit_id, "org_name": unit.name if unit else None,
            "org_type": unit.type if unit else None, "worker_id": worker_id, "created_at": u.created_at}
    if temporary_password:
        data["temporary_password"] = temporary_password
    return data


def _check_placement(db: Session, editor: User, role: str, org_unit_id: int) -> OrgUnit:
    if role not in Role.ALL:
        raise HTTPException(status_code=422, detail=f"Unknown role '{role}'.")
    if role not in CAN_MANAGE.get(editor.role, set()):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"You cannot create or edit a {role}.")
    unit = db.get(OrgUnit, org_unit_id)
    if unit is None:
        raise HTTPException(status_code=422, detail="org_unit_id not found.")
    if unit.id not in subtree_ids(db, editor.org_unit_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This place is outside your area.")
    if unit.type not in ROLE_LEVEL[role]:
        raise HTTPException(status_code=422, detail=f"A {role} must belong to a {' or '.join(sorted(ROLE_LEVEL[role]))}.")
    return unit


def _link_worker(db: Session, user: User, worker_id: int | None) -> None:
    if worker_id is None:
        return
    if user.role != Role.WORKER:
        raise HTTPException(status_code=422, detail="Only a worker login can be linked to a worker record.")
    worker = db.get(Worker, worker_id)
    contractor = db.get(Contractor, worker.contractor_id) if worker and worker.contractor_id else None
    if worker is None or contractor is None or contractor.mine_id != user.org_unit_id:
        raise HTTPException(status_code=422, detail="The worker must belong to a contractor of the same mine.")
    if worker.user_id not in (None, user.id):
        raise HTTPException(status_code=409, detail="This worker is already linked to another login.")
    for old in db.scalars(select(Worker).where(Worker.user_id == user.id, Worker.id != worker_id)):
        old.user_id = None
    worker.user_id = user.id


def _load(db: Session, editor: User, user_id: int) -> User:
    user = db.get(User, user_id)
    if user is None or user.org_unit_id not in subtree_ids(db, editor.org_unit_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found in your area.")
    return user


@router.get("")
def list_users(org_id: int | None = None, role: str | None = None, q: str | None = None,
               active: bool | None = None, paging: Pagination = Depends(),
               user: User = Depends(require_roles(*VIEWERS)), db: Session = Depends(get_db)):
    """People in the user's part of the org tree (optionally below org_id)."""
    ids = subtree_ids(db, user.org_unit_id)
    if org_id is not None:
        ids &= subtree_ids(db, org_id)
    query = select(User).where(User.org_unit_id.in_(ids))
    if role:
        query = query.where(User.role == role)
    if q:
        query = query.where(User.name.ilike(f"%{q}%") | User.phone.ilike(f"%{q}%"))
    if active is not None:
        query = query.where(User.is_active.is_(active))
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    items = list(db.scalars(query.order_by(User.role, User.name).offset(paging.offset).limit(paging.page_size)))
    return {"items": [_out(db, u) for u in items], "total": total, "page": paging.page, "page_size": paging.page_size}


@router.post("", status_code=status.HTTP_201_CREATED)
def create_user(body: UserCreate, editor: User = Depends(require_roles(*EDITORS)), db: Session = Depends(get_db)):
    """Create a login. Without a password, a one-time `temporary_password` is returned (show it once)."""
    _check_placement(db, editor, body.role, body.org_unit_id)
    if db.scalar(select(User.id).where(User.phone == body.phone)) is not None:
        raise HTTPException(status_code=409, detail="A user with this phone number already exists.")
    password = body.password or _temp_password()
    user = User(name=body.name.strip(), phone=body.phone, role=body.role, org_unit_id=body.org_unit_id,
                language=body.language, password_hash=hash_password(password), is_active=True)
    db.add(user)
    db.flush()
    _link_worker(db, user, body.worker_id)
    db.commit()
    return _out(db, user, temporary_password=None if body.password else password)


@router.get("/{user_id}")
def get_user(user_id: int, editor: User = Depends(require_roles(*VIEWERS)), db: Session = Depends(get_db)):
    return _out(db, _load(db, editor, user_id))


@router.patch("/{user_id}")
def update_user(user_id: int, body: UserUpdate, editor: User = Depends(require_roles(*EDITORS)),
                db: Session = Depends(get_db)):
    """Edit name / role / place / language, activate or deactivate, or (re)link a worker record."""
    user = _load(db, editor, user_id)
    if user.id == editor.id and (body.is_active is False or body.role not in (None, user.role)):
        raise HTTPException(status_code=422, detail="You cannot deactivate yourself or change your own role.")
    if user.role not in CAN_MANAGE.get(editor.role, set()):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"You cannot edit a {user.role}.")
    changes = body.model_dump(exclude_unset=True)
    worker_id = changes.pop("worker_id", None)
    if "role" in changes or "org_unit_id" in changes:
        _check_placement(db, editor, changes.get("role", user.role), changes.get("org_unit_id", user.org_unit_id))
    for field, value in changes.items():
        setattr(user, field, value.strip() if isinstance(value, str) and field == "name" else value)
    db.flush()
    _link_worker(db, user, worker_id)
    db.commit()
    return _out(db, user)


@router.post("/{user_id}/reset-password")
def reset_password(user_id: int, editor: User = Depends(require_roles(*EDITORS)), db: Session = Depends(get_db)):
    """New one-time temporary password (show it once; the user should change it after logging in)."""
    user = _load(db, editor, user_id)
    if user.role not in CAN_MANAGE.get(editor.role, set()):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"You cannot reset a {user.role}'s password.")
    password = _temp_password()
    user.password_hash = hash_password(password)
    db.commit()
    return {"id": user.id, "temporary_password": password}
