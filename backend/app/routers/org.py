"""Organisation tree (CIL > Subsidiary > Area > Mine): view, and add / edit units (admins)."""
import re

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from shapely.geometry import shape
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import get_current_user, require_roles
from app.constants import OrgType, Role
from app.db import get_db
from app.models import OrgUnit, User
from app.schemas import OrgNode, OrgUnitOut

router = APIRouter(prefix="/org", tags=["Organisation"])

PARENT_TYPE = {OrgType.SUBSIDIARY: OrgType.CIL, OrgType.AREA: OrgType.SUBSIDIARY, OrgType.MINE: OrgType.AREA}
UNIT_EDITORS = (Role.SUBSIDIARY_ADMIN, Role.CIL_ADMIN)


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


def subtree_ids(db: Session, root_id: int) -> set[int]:
    return {u.id for u in _subtree(db, root_id)}


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


# ---------------------------------------------------------------- add / edit (admins)

class UnitCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    type: str = Field(description="subsidiary / area / mine")
    parent_id: int
    code: str | None = Field(default=None, max_length=40, description="default: made from the name")
    mine_type: str | None = Field(default=None, description="mines: UG or OC")
    boundary: dict | None = Field(default=None, description="mines: GeoJSON Polygon of the lease (lng, lat order)")


class UnitUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    mine_type: str | None = None
    boundary: dict | None = None


def _check_boundary(boundary: dict) -> tuple[float, float]:
    """Valid GeoJSON Polygon inside India's rough bounding box; returns its centre (lat, lng)."""
    try:
        polygon = shape(boundary)
    except Exception:  # noqa: BLE001
        raise HTTPException(status_code=422, detail="boundary must be a GeoJSON Polygon.")
    if boundary.get("type") != "Polygon" or not polygon.is_valid or polygon.is_empty:
        raise HTTPException(status_code=422, detail="boundary must be a valid, non-empty GeoJSON Polygon.")
    min_lng, min_lat, max_lng, max_lat = polygon.bounds
    if not (6 <= min_lat and max_lat <= 38 and 68 <= min_lng and max_lng <= 98):
        raise HTTPException(status_code=422, detail="boundary coordinates must be [longitude, latitude] inside India.")
    centre = polygon.centroid
    return round(centre.y, 6), round(centre.x, 6)


def _editable(db: Session, user: User, unit_id: int) -> None:
    if unit_id not in subtree_ids(db, user.org_unit_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This place is outside your area.")


def _unit_out(u: OrgUnit) -> dict:
    return {"id": u.id, "name": u.name, "code": u.code, "type": u.type, "parent_id": u.parent_id,
            "mine_type": u.mine_type, "boundary": u.boundary, "center_lat": u.center_lat, "center_lng": u.center_lng}


@router.post("/units", status_code=status.HTTP_201_CREATED)
def add_unit(body: UnitCreate, user: User = Depends(require_roles(*UNIT_EDITORS)), db: Session = Depends(get_db)):
    """Add a subsidiary (CIL admin), an area or a mine (inside your part of the tree). A mine needs `mine_type`
    and a `boundary`; its manager then fills the mine profile, which creates its obligations and tasks."""
    if body.type not in PARENT_TYPE:
        raise HTTPException(status_code=422, detail="type must be subsidiary, area or mine.")
    if body.type == OrgType.SUBSIDIARY and user.role != Role.CIL_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the CIL admin can add a subsidiary.")
    parent = db.get(OrgUnit, body.parent_id)
    if parent is None or parent.type != PARENT_TYPE[body.type]:
        raise HTTPException(status_code=422, detail=f"A {body.type} must be placed under a {PARENT_TYPE[body.type]}.")
    _editable(db, user, parent.id)
    code = (body.code or ("MINE-" if body.type == OrgType.MINE else "") + re.sub(r"[^A-Z0-9]+", "-", body.name.upper())).strip("-")
    if db.scalar(select(OrgUnit.id).where(OrgUnit.code == code)) is not None:
        raise HTTPException(status_code=409, detail=f"The code '{code}' is already used; send a different code.")
    unit = OrgUnit(name=body.name.strip(), code=code, type=body.type, parent_id=parent.id)
    if body.type == OrgType.MINE:
        if body.mine_type not in ("UG", "OC") or body.boundary is None:
            raise HTTPException(status_code=422, detail="A mine needs mine_type (UG or OC) and a boundary.")
        unit.mine_type, unit.boundary = body.mine_type, body.boundary
        unit.center_lat, unit.center_lng = _check_boundary(body.boundary)
    else:
        unit.center_lat, unit.center_lng = parent.center_lat, parent.center_lng
    db.add(unit)
    db.commit()
    return _unit_out(unit)


@router.patch("/units/{unit_id}")
def edit_unit(unit_id: int, body: UnitUpdate, user: User = Depends(require_roles(*UNIT_EDITORS)),
              db: Session = Depends(get_db)):
    """Rename a unit, or correct a mine's type / boundary (the map, geofence and photo checks use it at once)."""
    unit = db.get(OrgUnit, unit_id)
    if unit is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unit not found.")
    _editable(db, user, unit.id)
    if unit.id == user.org_unit_id and user.role != Role.CIL_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You cannot edit your own top unit.")
    changes = body.model_dump(exclude_unset=True)
    if unit.type != OrgType.MINE and ({"mine_type", "boundary"} & set(changes)):
        raise HTTPException(status_code=422, detail="Only mines have a type and a boundary.")
    if "mine_type" in changes and changes["mine_type"] not in ("UG", "OC"):
        raise HTTPException(status_code=422, detail="mine_type must be UG or OC.")
    if "boundary" in changes:
        unit.center_lat, unit.center_lng = _check_boundary(changes["boundary"])
    for field, value in changes.items():
        setattr(unit, field, value.strip() if field == "name" else value)
    db.commit()
    return _unit_out(unit)
