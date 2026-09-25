from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.db import get_db
from app.models import OrgUnit, User
from app.schemas import OrgNode, OrgUnitOut

router = APIRouter(prefix="/org", tags=["Organisation"])


def _subtree(db: Session, root_id: int) -> list[OrgUnit]:
    units = list(db.scalars(select(OrgUnit).order_by(OrgUnit.name)))
    children: dict[int, list[OrgUnit]] = {}
    for u in units:
        if u.parent_id is not None:
            children.setdefault(u.parent_id, []).append(u)
    by_id = {u.id: u for u in units}
    found, stack = [], [by_id[root_id]]
    while stack:
        unit = stack.pop()
        found.append(unit)
        stack.extend(children.get(unit.id, []))
    return found


@router.get("/tree", response_model=OrgNode)
def org_tree(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """The org tree below the user's own unit (CIL admin gets the whole tree).
    Used by the web Scope Switcher (Subsidiary > Area > Mine)."""
    units = _subtree(db, user.org_unit_id)
    nodes = {u.id: OrgNode(id=u.id, name=u.name, code=u.code, type=u.type,
                           center_lat=u.center_lat, center_lng=u.center_lng) for u in units}
    for u in sorted(units, key=lambda x: x.name):
        if u.parent_id in nodes and u.id != user.org_unit_id:
            nodes[u.parent_id].children.append(nodes[u.id])
    return nodes[user.org_unit_id]


@router.get("/units", response_model=list[OrgUnitOut])
def org_units(type: str | None = Query(None, description="cil / subsidiary / area / mine"),
              user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Flat list of org units in the user's area, optionally filtered by type."""
    units = _subtree(db, user.org_unit_id)
    return sorted((u for u in units if type is None or u.type == type), key=lambda u: (u.type, u.name))
