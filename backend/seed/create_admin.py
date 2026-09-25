"""Create the first CIL admin for a real deployment (no demo data needed).

    python -m seed.create_admin --phone 9876543210 --name "Admin Name"
    (you are asked for the password; or pass --password)

Use with AUTO_BOOTSTRAP=false and an empty database. The admin then adds subsidiaries, areas, mines
(POST /org/units) and people (POST /users) through the API.
"""
import argparse
import getpass

from sqlalchemy import select

from app import models  # noqa: F401  (register tables)
from app.constants import OrgType, Role
from app.db import Base, SessionLocal, engine
from app.models import OrgUnit, User
from app.security import hash_password


def create_admin(db, phone: str, name: str, password: str, org_name: str = "Coal India Limited") -> User:
    if not phone.isdigit() or not 10 <= len(phone) <= 15:
        raise ValueError("phone must be 10-15 digits")
    if len(password) < 8:
        raise ValueError("password must have at least 8 characters")
    if db.scalar(select(User.id).where(User.phone == phone)) is not None:
        raise ValueError("a user with this phone already exists")
    root = db.scalar(select(OrgUnit).where(OrgUnit.type == OrgType.CIL))
    if root is None:
        root = OrgUnit(name=org_name, code="CIL", type=OrgType.CIL, center_lat=22.57, center_lng=88.36)
        db.add(root)
        db.flush()
    user = User(name=name, phone=phone, role=Role.CIL_ADMIN, org_unit_id=root.id, language="en",
                password_hash=hash_password(password), is_active=True)
    db.add(user)
    db.commit()
    return user


def main() -> None:
    parser = argparse.ArgumentParser(description="Create the first CIL admin.")
    parser.add_argument("--phone", required=True)
    parser.add_argument("--name", required=True)
    parser.add_argument("--password", help="leave out to type it safely")
    args = parser.parse_args()
    password = args.password or getpass.getpass("Password (min 8 characters): ")
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        try:
            user = create_admin(db, args.phone, args.name, password)
        except ValueError as exc:
            raise SystemExit(f"Not created: {exc}")
    print(f"Created CIL admin #{user.id} ({user.name}, {user.phone}). Log in and add subsidiaries, areas, mines and users.")


if __name__ == "__main__":
    main()
