"""Small shared helpers for routers."""
from fastapi import HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth import scope_mine_ids
from app.constants import OrgType
from app.models import OrgUnit, User


def get_mine_in_scope(db: Session, user: User, mine_id: int) -> OrgUnit:
    """The mine, or 404 if it doesn't exist / 403 if it is outside the user's area."""
    mine = db.get(OrgUnit, mine_id)
    if mine is None or mine.type != OrgType.MINE:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mine not found.")
    if mine_id not in scope_mine_ids(db, user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This mine is outside your area.")
    return mine


def resolve_mine_filter(db: Session, user: User, org_id: int | None, mine_id: int | None) -> list[int]:
    """Mine ids for a list endpoint: user's scope, narrowed by ?org_id and/or ?mine_id."""
    ids = scope_mine_ids(db, user, org_id=org_id)
    if mine_id is not None:
        if mine_id not in scope_mine_ids(db, user):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This mine is outside your area.")
        ids = [m for m in ids if m == mine_id]
    return ids


class Pagination:
    def __init__(self, page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=200)):
        self.page = page
        self.page_size = page_size

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size
