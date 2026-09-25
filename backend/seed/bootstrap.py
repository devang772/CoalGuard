"""Demo starter data: org tree (12 sample mines) and demo users for every role.
(Escalation rules, checklists and the obligation catalogue are reference data: see seed.reference.)

Runs automatically at startup when the database is empty (AUTO_BOOTSTRAP=true),
or by hand:  python -m seed.bootstrap
Safe to run again: it does nothing if the CIL root already exists.

All names and boundaries are SAMPLE DATA for the demo, not official records.
"""
import math

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import settings
from app.constants import OrgType, Role
from app.models import OrgUnit, User
from app.security import hash_password

# subsidiary -> area -> [(mine name, UG/OC, lat, lng)]
ORG_TREE = {
    ("Bharat Coking Coal Ltd", "BCCL"): {
        ("Jharia Area", "BCCL-JHA"): [
            ("Moonidih UG", "UG", 23.7406, 86.3480),
            ("Bastacolla OCP", "OC", 23.7430, 86.4380),
        ],
        ("Kusunda Area", "BCCL-KUS"): [
            ("Kusunda OCP", "OC", 23.7800, 86.3920),
            ("Dhansar UG", "UG", 23.7920, 86.4190),
        ],
    },
    ("Central Coalfields Ltd", "CCL"): {
        ("Piparwar Area", "CCL-PIP"): [
            ("Ashoka OCP", "OC", 23.7050, 84.8990),
            ("Piparwar OCP", "OC", 23.7340, 84.9560),
        ],
        ("Barka-Sayal Area", "CCL-BSY"): [
            ("Urimari OCP", "OC", 23.7700, 85.3900),
            ("Bhurkunda UG", "UG", 23.7550, 85.4400),
        ],
    },
    ("Mahanadi Coalfields Ltd", "MCL"): {
        ("Talcher Area", "MCL-TAL"): [
            ("Lingaraj OCP", "OC", 20.9660, 85.1780),
            ("Jagannath OCP", "OC", 20.9420, 85.1500),
        ],
        ("Ib Valley Area", "MCL-IBV"): [
            ("Lajkura OCP", "OC", 21.8260, 83.8880),
            ("Samaleswari OCP", "OC", 21.8640, 83.9360),
        ],
    },
}

# Fixed demo logins (password = settings.demo_password). Keep in sync with the frontend prompts.
DEMO_USERS = [
    ("9000000001", "Anil Kumar (CIL Admin)", Role.CIL_ADMIN, "CIL"),
    ("9000000002", "Sunita Singh (BCCL Admin)", Role.SUBSIDIARY_ADMIN, "BCCL"),
    ("9000000003", "Rajesh Prasad (GM Jharia)", Role.AREA_GM, "BCCL-JHA"),
    ("9000000004", "Vikram Mahato (Manager Moonidih)", Role.MINE_MANAGER, "MINE-MOONIDIH-UG"),
    ("9000000005", "Dr. Meera Iyer (DGMS Regulator)", Role.REGULATOR, "BCCL"),
    ("9000000006", "Shree Ganesh Enterprises (Contractor)", Role.CONTRACTOR_ADMIN, "MINE-MOONIDIH-UG"),
    ("9000000007", "Ramesh Kumar (Safety Officer)", Role.SAFETY_OFFICER, "MINE-MOONIDIH-UG"),
    ("9000000008", "Manoj Das (Supervisor)", Role.SUPERVISOR, "MINE-MOONIDIH-UG"),
    ("9000000009", "Birsa Hansda (Worker)", Role.WORKER, "MINE-MOONIDIH-UG"),
]



def mine_code(name: str) -> str:
    return "MINE-" + name.upper().replace(" ", "-")


def mine_polygon(lat: float, lng: float, seed: int) -> dict:
    """An irregular 10-sided polygon about 1.5 km across, as a GeoJSON geometry."""
    points = []
    for i in range(10):
        angle = 2 * math.pi * i / 10
        radius = 0.011 + 0.004 * math.sin(i * 1.7 + seed)          # degrees, ~1.2-1.6 km
        points.append([round(lng + radius * math.cos(angle) * 1.1, 6),
                       round(lat + radius * math.sin(angle), 6)])
    points.append(points[0])                                         # close the ring
    return {"type": "Polygon", "coordinates": [points]}


def bootstrap(db: Session) -> bool:
    """Create starter data. Returns False if it already existed."""
    if db.scalar(select(OrgUnit).where(OrgUnit.code == "CIL")) is not None:
        return False

    units: dict[str, OrgUnit] = {}
    cil = OrgUnit(name="Coal India Limited", code="CIL", type=OrgType.CIL,
                  center_lat=22.57, center_lng=88.36)
    db.add(cil)
    db.flush()
    units["CIL"] = cil

    mine_index = 0
    for (sub_name, sub_code), areas in ORG_TREE.items():
        sub = OrgUnit(name=sub_name, code=sub_code, type=OrgType.SUBSIDIARY, parent_id=cil.id)
        db.add(sub)
        db.flush()
        units[sub_code] = sub
        for (area_name, area_code), mines in areas.items():
            area = OrgUnit(name=area_name, code=area_code, type=OrgType.AREA, parent_id=sub.id)
            db.add(area)
            db.flush()
            units[area_code] = area
            for name, kind, lat, lng in mines:
                mine = OrgUnit(name=name, code=mine_code(name), type=OrgType.MINE, parent_id=area.id,
                               mine_type=kind, center_lat=lat, center_lng=lng,
                               boundary=mine_polygon(lat, lng, mine_index))
                db.add(mine)
                db.flush()
                units[mine.code] = mine
                mine_index += 1

    # centre of each subsidiary / area = average of its mines (used to zoom the map)
    for unit in units.values():
        if unit.type in (OrgType.SUBSIDIARY, OrgType.AREA):
            mines = [u for u in units.values() if u.type == OrgType.MINE and _is_under(u, unit, units)]
            unit.center_lat = round(sum(m.center_lat for m in mines) / len(mines), 4)
            unit.center_lng = round(sum(m.center_lng for m in mines) / len(mines), 4)

    password_hash = hash_password(settings.demo_password)
    taken: set[tuple[str, str]] = set()
    for phone, name, role, code in DEMO_USERS:
        db.add(User(name=name, phone=phone, role=role, org_unit_id=units[code].id,
                    password_hash=password_hash, language="en"))
        taken.add((role, code))

    # Make sure every node on the escalation ladder has someone to notify.
    counter = 1
    for code, unit in units.items():
        needed = {OrgType.MINE: [Role.MINE_MANAGER, Role.SAFETY_OFFICER],
                  OrgType.AREA: [Role.AREA_GM],
                  OrgType.SUBSIDIARY: [Role.SUBSIDIARY_ADMIN]}.get(unit.type, [])
        for role in needed:
            if (role, code) in taken:
                continue
            label = role.replace("_", " ").title()
            db.add(User(name=f"{label}, {unit.name}", phone=f"91{counter:08d}", role=role,
                        org_unit_id=unit.id, password_hash=password_hash, language="en"))
            counter += 1

    db.commit()
    return True


def _is_under(unit: OrgUnit, ancestor: OrgUnit, units: dict[str, OrgUnit]) -> bool:
    by_id = {u.id: u for u in units.values()}
    current = unit
    while current.parent_id is not None:
        if current.parent_id == ancestor.id:
            return True
        current = by_id[current.parent_id]
    return False


if __name__ == "__main__":
    from app import models  # noqa: F401
    from app.db import Base, SessionLocal, engine

    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        created = bootstrap(session)
    print("Starter data created." if created else "Starter data already exists, nothing to do.")
