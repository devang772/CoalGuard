from sqlalchemy import select

from app.auth import scope_mine_ids
from app.db import SessionLocal
from app.models import OrgUnit, User

CIL_ADMIN, BCCL_ADMIN, JHARIA_GM, MOONIDIH_MANAGER, REGULATOR = (
    "9000000001", "9000000002", "9000000003", "9000000004", "9000000005")


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["database"] == "connected"


def test_login_success_returns_token_and_user(client):
    r = client.post("/auth/login", json={"phone": MOONIDIH_MANAGER, "password": "demo123"})
    assert r.status_code == 200
    body = r.json()
    assert body["access_token"]
    assert body["user"]["role"] == "mine_manager"
    assert body["user"]["mine_name"] == "Moonidih UG"
    assert body["user"]["mine_id"] == body["user"]["org_unit_id"]


def test_login_wrong_password(client):
    r = client.post("/auth/login", json={"phone": CIL_ADMIN, "password": "wrong"})
    assert r.status_code == 401


def test_login_unknown_phone(client):
    r = client.post("/auth/login", json={"phone": "9999999999", "password": "demo123"})
    assert r.status_code == 401


def test_swagger_token_endpoint(client):
    r = client.post("/auth/token", data={"username": CIL_ADMIN, "password": "demo123"})
    assert r.status_code == 200
    assert r.json()["token_type"] == "bearer"


def test_me_requires_token(client):
    assert client.get("/auth/me").status_code == 401
    assert client.get("/auth/me", headers={"Authorization": "Bearer not-a-real-token"}).status_code == 401


def test_me_returns_current_user(client, login):
    r = client.get("/auth/me", headers=login(JHARIA_GM))
    assert r.status_code == 200
    body = r.json()
    assert body["role"] == "area_gm"
    assert body["org_name"] == "Jharia Area"
    assert body["mine_id"] is None


def _user(db, phone):
    return db.scalar(select(User).where(User.phone == phone))


def _mine_names(db, ids):
    return sorted(db.scalars(select(OrgUnit.name).where(OrgUnit.id.in_(ids))))


def test_scope_by_role():
    with SessionLocal() as db:
        assert len(scope_mine_ids(db, _user(db, CIL_ADMIN))) == 12
        assert len(scope_mine_ids(db, _user(db, BCCL_ADMIN))) == 4
        assert _mine_names(db, scope_mine_ids(db, _user(db, JHARIA_GM))) == ["Bastacolla OCP", "Moonidih UG"]
        assert _mine_names(db, scope_mine_ids(db, _user(db, MOONIDIH_MANAGER))) == ["Moonidih UG"]
        assert len(scope_mine_ids(db, _user(db, REGULATOR))) == 4


def test_scope_switcher_narrows_but_never_widens():
    with SessionLocal() as db:
        kusunda_area = db.scalar(select(OrgUnit).where(OrgUnit.code == "BCCL-KUS"))
        mcl = db.scalar(select(OrgUnit).where(OrgUnit.code == "MCL"))
        # CIL admin narrowing to Kusunda Area -> only its 2 mines
        assert _mine_names(db, scope_mine_ids(db, _user(db, CIL_ADMIN), org_id=kusunda_area.id)) == [
            "Dhansar UG", "Kusunda OCP"]
        # Jharia GM asking for MCL -> nothing (outside their area)
        assert scope_mine_ids(db, _user(db, JHARIA_GM), org_id=mcl.id) == []


def test_every_ladder_level_has_a_person():
    with SessionLocal() as db:
        for unit in db.scalars(select(OrgUnit)):
            roles = set(db.scalars(select(User.role).where(User.org_unit_id == unit.id)))
            if unit.type == "mine":
                assert "mine_manager" in roles, unit.name
            elif unit.type == "area":
                assert "area_gm" in roles, unit.name
            elif unit.type == "subsidiary":
                assert "subsidiary_admin" in roles, unit.name


def test_mines_have_valid_boundaries():
    with SessionLocal() as db:
        mines = list(db.scalars(select(OrgUnit).where(OrgUnit.type == "mine")))
        assert len(mines) == 12
        for m in mines:
            ring = m.boundary["coordinates"][0]
            assert m.boundary["type"] == "Polygon"
            assert ring[0] == ring[-1] and len(ring) == 11
            assert m.mine_type in ("UG", "OC")


def test_bootstrap_is_idempotent():
    from seed.bootstrap import bootstrap
    with SessionLocal() as db:
        before = db.query(User).count()
        assert bootstrap(db) is False
        assert db.query(User).count() == before
