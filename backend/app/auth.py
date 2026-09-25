"""Who is calling (get_current_user), what they may do (require_roles),
and which mines they may see (scope_mine_ids)."""
from collections.abc import Callable

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.constants import OrgType
from app.db import get_db
from app.models import OrgUnit, User
from app.security import decode_access_token

# tokenUrl powers the "Authorize" button on the /docs page
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired login. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_access_token(token)
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise unauthorized
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise unauthorized
    db.info["user_id"] = user.id          # the audit chain records who made each change
    return user


def require_roles(*roles: str) -> Callable[..., User]:
    """Dependency factory: allow only the given roles.

    Usage: user: User = Depends(require_roles(Role.CIL_ADMIN, Role.SUBSIDIARY_ADMIN))
    """
    def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="You do not have permission to do this.")
        return user
    return checker


# ------------------------------------------------------------------ org-tree scope

def _descendant_ids(db: Session, root_id: int) -> set[int]:
    """All org unit ids under root_id (including root_id itself)."""
    rows = db.execute(select(OrgUnit.id, OrgUnit.parent_id)).all()
    children: dict[int, list[int]] = {}
    for unit_id, parent_id in rows:
        if parent_id is not None:
            children.setdefault(parent_id, []).append(unit_id)
    found, stack = set(), [root_id]
    while stack:
        current = stack.pop()
        if current in found:
            continue
        found.add(current)
        stack.extend(children.get(current, []))
    return found


def _mine_ids_under(db: Session, root_id: int) -> set[int]:
    ids = _descendant_ids(db, root_id)
    if not ids:
        return set()
    rows = db.scalars(select(OrgUnit.id).where(OrgUnit.id.in_(ids), OrgUnit.type == OrgType.MINE))
    return set(rows)


def scope_mine_ids(db: Session, user: User, org_id: int | None = None) -> list[int]:
    """Mine ids this user is allowed to see.

    Walks down the org tree from the user's own org unit. If org_id is given
    (the Scope Switcher in the web app), the result is narrowed to the mines
    under that org unit, but never widened beyond the user's own scope.
    """
    allowed = _mine_ids_under(db, user.org_unit_id)
    if org_id is not None:
        allowed &= _mine_ids_under(db, org_id)
    return sorted(allowed)


def ensure_mine_access(db: Session, user: User, mine_id: int) -> None:
    """Raise 403 if the user can't see this mine."""
    if mine_id not in scope_mine_ids(db, user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="This mine is outside your area.")


def user_mine(db: Session, user: User) -> OrgUnit | None:
    """The mine the user belongs to, if their org unit is a mine."""
    unit = db.get(OrgUnit, user.org_unit_id)
    return unit if unit is not None and unit.type == OrgType.MINE else None
