"""End-to-end checks from the integration audit (runs last: it adds a 13th mine and new users).

Covers: timezone-aware times, readable validation errors, photo details inside tasks / findings / attendance,
photo privacy for workers, all 15 profile fields driving rules, date-based CTO task, admin users + org units,
profile / password, My Reports, search, first-admin command.
"""
from datetime import datetime, timedelta

import pytest
from sqlalchemy import select

from app.db import SessionLocal
from app.models import ComplianceTask, MineObligation, Obligation, OrgUnit, Worker
from app.utils import today_ist
from tests.photos import iso_z, make_photo, now_utc

CIL, BCCL, GM, MANAGER, REGULATOR, CONTRACTOR, OFFICER, SUPERVISOR, WORKER = (
    f"90000000{i:02d}" for i in range(1, 10))


@pytest.fixture(scope="module", autouse=True)
def _data(seeded_data):
    return seeded_data


def unit_id(name):
    with SessionLocal() as db:
        return db.scalar(select(OrgUnit.id).where(OrgUnit.name == name))


def active_codes(mine_id):
    with SessionLocal() as db:
        return set(db.scalars(select(Obligation.code).join(MineObligation, MineObligation.obligation_id == Obligation.id)
                              .where(MineObligation.mine_id == mine_id, MineObligation.status == "active")))


def headers_for(client, phone, password):
    r = client.post("/auth/login", json={"phone": phone, "password": password})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def upload(client, headers, mine_id, scene):
    with SessionLocal() as db:
        m = db.get(OrgUnit, mine_id)
    form = {"mine_id": str(mine_id), "lat": str(m.center_lat), "lng": str(m.center_lng), "accuracy": "8",
            "device_time": iso_z(now_utc())}
    return client.post("/evidence", data=form, files={"file": ("p.jpg", make_photo(scene), "image/jpeg")},
                       headers=headers).json()


# ---------------------------------------------------------------- API format

def test_times_carry_their_timezone(client, login):
    capa = client.get("/capa", params={"page_size": 1}, headers=login(CIL)).json()["items"][0]      # response model
    pin = client.get("/gis/pins", headers=login(CIL)).json()[0]                                      # plain dict
    for value in (capa["due_at"], capa["created_at"], pin["created_at"]):
        assert value.endswith("Z") or value.endswith("+00:00"), value
        assert datetime.fromisoformat(value).utcoffset() == timedelta(0)


def test_validation_errors_are_one_readable_sentence(client, login):
    r = client.post("/approvals", json={"entity": "capa", "entity_id": 1, "decision": "reject"}, headers=login(GM))
    assert r.status_code == 422
    body = r.json()
    assert body["detail"] == "A remark is required when rejecting" and isinstance(body["errors"], list)
    r = client.post("/observations", json={"type": "near_miss"}, headers=login(WORKER))
    assert r.json()["detail"] == "text: Field required"


# ---------------------------------------------------------------- photos inside responses + privacy

def test_photo_details_inside_tasks_findings_attendance(client, login):
    moonidih = unit_id("Moonidih UG")
    officer = login(OFFICER)
    photo = upload(client, officer, moonidih, 701)
    task = client.get("/tasks", params={"due": "today", "status": "pending", "page_size": 1}, headers=officer).json()["items"][0]
    done = client.post(f"/tasks/{task['id']}/complete", json={"evidence_id": photo["id"]}, headers=officer).json()
    assert done["evidence"]["url"].startswith(f"/evidence/{photo['id']}/file?sig=") and done["evidence"]["trust_score"] == 100

    inspection = client.post("/inspections", json={"mine_id": moonidih}, headers=officer).json()
    finding_photo = upload(client, officer, moonidih, 702)
    client.post(f"/inspections/{inspection['id']}/findings", json={"category": "fire", "description": "No extinguisher",
                "severity": "low", "photo_evidence_id": finding_photo["id"]}, headers=officer)
    detail = client.get(f"/inspections/{inspection['id']}", headers=login(MANAGER)).json()
    assert detail["findings"][0]["photo"]["id"] == finding_photo["id"]
    capa_item = client.get("/capa", params={"mine_id": moonidih, "page_size": 200}, headers=login(MANAGER)).json()["items"]
    assert any(c["finding"]["photo"] and c["finding"]["photo"]["id"] == finding_photo["id"] for c in capa_item)

    with SessionLocal() as db:
        birsa = db.scalar(select(Worker).where(Worker.name == "Birsa Hansda"))
        from app.models import Attendance
        from app.utils import ist_day_start_utc
        for a in db.scalars(select(Attendance).where(Attendance.worker_id == birsa.id,
                                                     Attendance.time >= ist_day_start_utc(today_ist()))):
            db.delete(a)
        db.commit()
    worker = login(WORKER)
    selfie = upload(client, worker, moonidih, 703)
    with SessionLocal() as db:
        m = db.get(OrgUnit, moonidih)
    marked = client.post("/attendance", json={"lat": m.center_lat, "lng": m.center_lng, "selfie_evidence_id": selfie["id"]},
                         headers=worker).json()
    assert marked["valid"] and marked["selfie"]["id"] == selfie["id"]

    # privacy: a worker can open their own photo, not a colleague's by id
    assert client.get(f"/evidence/{selfie['id']}", headers=worker).status_code == 200
    assert client.get(f"/evidence/{photo['id']}", headers=worker).status_code == 403
    assert client.get("/evidence", params={"ids": f"{photo['id']},{selfie['id']}"}, headers=worker).json()[0]["id"] == selfie["id"]


# ---------------------------------------------------------------- all 15 profile fields drive rules

def test_every_profile_field_changes_rules(client, login):
    moonidih, kusunda, ashoka, lingaraj = (unit_id(n) for n in ("Moonidih UG", "Kusunda OCP", "Ashoka OCP", "Lingaraj OCP"))
    m, k, a, lg = (active_codes(i) for i in (moonidih, kusunda, ashoka, lingaraj))
    assert {"SAF-STRATA-W", "SAF-HEAT-W"} <= m                   # underground + depth 380 m
    assert "SAF-SLOPE-M" in k and "SAF-SLOPE-M" not in a         # open-cast 140 m deep vs 95 m
    assert "ENV-WASHERY-M" in m and "ENV-WASHERY-M" not in k     # has washery
    assert "ENV-CAAQMS-W" in a and "ENV-CAAQMS-W" not in m       # 15 MTPA vs 0.6 MTPA
    assert "ENV-JSPCB-M" in m and "ENV-OSPCB-M" in lg and "ENV-JSPCB-M" not in lg   # state
    assert {"ENV-EC-Q", "ENV-CTO-Y"} <= m                        # EC number and CTO date on file
    links = client.get(f"/mines/{moonidih}/obligations", headers=login(MANAGER)).json()
    reasons = {l["obligation"]["code"]: l["reason"] for l in links}
    assert "380 m deep" in reasons["SAF-STRATA-W"] and "Environmental Clearance J-11015" in reasons["ENV-EC-Q"]
    assert "Consent to Operate expires on" in reasons["ENV-CTO-Y"] and "Jharkhand" in reasons["ENV-JSPCB-M"]


# ---------------------------------------------------------------- admin: new mine, its manager, profile, CTO task

@pytest.fixture(scope="module")
def new_mine(client, login):
    area = unit_id("Kusunda Area")
    lat, lng = 23.8100, 86.3700
    ring = [[lng - 0.01, lat - 0.01], [lng + 0.01, lat - 0.01], [lng + 0.01, lat + 0.01], [lng - 0.01, lat + 0.01],
            [lng - 0.01, lat - 0.01]]
    body = {"name": "Govindpur UG", "type": "mine", "parent_id": area, "mine_type": "UG",
            "boundary": {"type": "Polygon", "coordinates": [ring]}}
    assert client.post("/org/units", json=body, headers=login(MANAGER)).status_code == 403
    assert client.post("/org/units", json={**body, "boundary": {"type": "Polygon", "coordinates": [[[1, 1], [2, 2]]]}},
                       headers=login(BCCL)).status_code == 422
    r = client.post("/org/units", json=body, headers=login(BCCL))
    assert r.status_code == 201, r.text
    mine = r.json()
    assert mine["code"] == "MINE-GOVINDPUR-UG" and abs(mine["center_lat"] - lat) < 0.001
    assert client.post("/org/units", json=body, headers=login(BCCL)).status_code == 409          # same code again
    return mine


def test_admins_add_units_only_in_their_area(client, login, new_mine):
    assert client.post("/org/units", json={"name": "New Subsidiary", "type": "subsidiary", "parent_id": unit_id("Coal India Limited")},
                       headers=login(BCCL)).status_code == 403
    assert client.post("/org/units", json={"name": "Talcher North", "type": "area", "parent_id": unit_id("Mahanadi Coalfields Ltd")},
                       headers=login(BCCL)).status_code == 403
    assert new_mine["id"] in [m["id"] for m in client.get("/mines", headers=login(CIL)).json()]
    assert any(f["id"] == new_mine["id"] for f in client.get("/gis/mines", headers=login(BCCL)).json()["features"])
    renamed = client.patch(f"/org/units/{new_mine['id']}", json={"name": "Govindpur UG (Block II)"}, headers=login(BCCL))
    assert renamed.status_code == 200 and renamed.json()["name"] == "Govindpur UG (Block II)"


def test_new_manager_fills_profile_and_gets_date_based_cto_task(client, login, new_mine):
    created = client.post("/users", json={"name": "Asha Kumari", "phone": "9123456780", "role": "mine_manager",
                                          "org_unit_id": new_mine["id"]}, headers=login(BCCL))
    assert created.status_code == 201, created.text
    temp = created.json()["temporary_password"]
    manager = headers_for(client, "9123456780", temp)
    assert client.post("/auth/change-password", json={"current_password": "wrong", "new_password": "NewPass123"},
                       headers=manager).status_code == 400
    assert client.post("/auth/change-password", json={"current_password": temp, "new_password": "NewPass123"},
                       headers=manager).json() == {"changed": True}
    manager = headers_for(client, "9123456780", "NewPass123")
    assert client.patch("/auth/me", json={"language": "hi"}, headers=manager).json()["language"] == "hi"

    cto = today_ist() + timedelta(days=200)
    profile = {"working_method": "UG", "depth_m": 320, "seam_gas_degree": 3, "worker_count": 400,
               "contract_worker_count": 50, "production_capacity_mtpa": 0.4, "uses_explosives": True,
               "has_conveyor": True, "has_hemm": False, "has_washery": False, "near_water_body": True,
               "forest_land": False, "ec_number": "J-11015/999/2020-IA.II(M)", "cto_valid_till": str(cto),
               "state": "Jharkhand"}
    saved = client.put(f"/mines/{new_mine['id']}/profile", json=profile, headers=manager).json()
    added = set(saved["obligations"]["added"])
    assert {"SAF-STRATA-W", "SAF-GASMON-D", "ENV-CTO-Y", "ENV-EC-Q", "ENV-JSPCB-M", "ENV-DRAIN-M"} <= added
    assert saved["obligations"]["tasks_created"] > 0

    def cto_tasks():
        with SessionLocal() as db:
            cto_id = db.scalar(select(Obligation.id).where(Obligation.code == "ENV-CTO-Y"))
            return [(t.due_date, t.status) for t in db.scalars(select(ComplianceTask).where(
                ComplianceTask.mine_id == new_mine["id"], ComplianceTask.obligation_id == cto_id))]

    assert cto_tasks() == [(cto - timedelta(days=90), "pending")]
    later = cto + timedelta(days=365)                         # CTO renewed: the task moves to the new date
    client.put(f"/mines/{new_mine['id']}/profile", json={**profile, "cto_valid_till": str(later)}, headers=manager)
    assert cto_tasks() == [(later - timedelta(days=90), "pending")]
    soon = today_ist() + timedelta(days=30)                   # expiring soon: the task is already overdue
    client.put(f"/mines/{new_mine['id']}/profile", json={**profile, "cto_valid_till": str(soon)}, headers=manager)
    assert cto_tasks() == [(soon - timedelta(days=90), "overdue")]


def test_user_admin_rules(client, login, new_mine):
    moonidih = unit_id("Moonidih UG")
    assert client.post("/users", json={"name": "X Reg", "phone": "9123456781", "role": "regulator",
                                       "org_unit_id": unit_id("Bharat Coking Coal Ltd")}, headers=login(BCCL)).status_code == 403
    assert client.post("/users", json={"name": "X GM", "phone": "9123456782", "role": "area_gm",
                                       "org_unit_id": unit_id("Talcher Area")}, headers=login(BCCL)).status_code == 403
    assert client.post("/users", json={"name": "X GM", "phone": "9123456782", "role": "area_gm",
                                       "org_unit_id": moonidih}, headers=login(BCCL)).status_code == 422
    assert client.post("/users", json={"name": "Dup", "phone": MANAGER, "role": "worker",
                                       "org_unit_id": moonidih}, headers=login(MANAGER)).status_code == 409
    assert client.post("/users", json={"name": "Up", "phone": "9123456783", "role": "area_gm",
                                       "org_unit_id": moonidih}, headers=login(MANAGER)).status_code == 403

    # the mine manager onboards a contract worker's login and links it to the worker record
    with SessionLocal() as db:
        worker = db.scalar(select(Worker).where(Worker.user_id.is_(None), Worker.name != "Birsa Hansda",
                                                Worker.contractor_id.in_(select(Worker.contractor_id).where(Worker.name == "Birsa Hansda"))))
    r = client.post("/users", json={"name": worker.name, "phone": "9123456784", "role": "worker",
                                    "org_unit_id": moonidih, "password": "Worker123", "worker_id": worker.id},
                    headers=login(MANAGER))
    assert r.status_code == 201 and r.json()["worker_id"] == worker.id and "temporary_password" not in r.json()
    new_worker = headers_for(client, "9123456784", "Worker123")
    assert client.get("/attendance/me", headers=new_worker).status_code == 200

    uid = r.json()["id"]
    reset = client.post(f"/users/{uid}/reset-password", headers=login(MANAGER)).json()
    assert len(reset["temporary_password"]) == 10
    assert client.patch(f"/users/{uid}", json={"is_active": False}, headers=login(MANAGER)).json()["is_active"] is False
    assert client.post("/auth/login", json={"phone": "9123456784", "password": reset["temporary_password"]}).status_code == 401
    me = client.get("/auth/me", headers=login(MANAGER)).json()
    assert client.patch(f"/users/{me['id']}", json={"is_active": False}, headers=login(MANAGER)).status_code in (403, 422)
    listed = client.get("/users", params={"org_id": moonidih, "role": "worker"}, headers=login(GM)).json()
    assert listed["total"] >= 2 and all(u["org_name"] == "Moonidih UG" for u in listed["items"])
    assert client.get("/users", headers=login(WORKER)).status_code == 403


# ---------------------------------------------------------------- my reports, search, first admin

def test_my_reports(client, login):
    officer = client.get("/me/reports", headers=login(OFFICER)).json()
    kinds = {i["kind"] for i in officer["items"]}
    assert {"finding", "task"} <= kinds
    assert all(i["created_at"] >= officer["items"][-1]["created_at"] for i in officer["items"])
    worker = client.get("/me/reports", params={"kind": "attendance"}, headers=login(WORKER)).json()
    assert worker["items"], "the worker marked attendance earlier in this file"
    latest = worker["items"][0]
    assert latest["status"] == "accepted" and latest["trust_level"] == "verified"      # the selfie attendance above


def test_search(client, login):
    found = client.get("/search", params={"q": "kusunda"}, headers=login(CIL)).json()["results"]
    assert any(r["type"] == "mine" and r["title"] == "Kusunda OCP" for r in found)
    capa_id = client.get("/capa", params={"page_size": 1}, headers=login(MANAGER)).json()["items"][0]["id"]
    by_id = client.get("/search", params={"q": f"#{capa_id}"}, headers=login(MANAGER)).json()["results"]
    assert any(r["type"] == "capa" and r["id"] == capa_id for r in by_id)
    assert any(r["type"] == "contractor" for r in client.get("/search", params={"q": "Maa Tara"}, headers=login(MANAGER)).json()["results"])
    assert not any(r["type"] == "mine" for r in client.get("/search", params={"q": "kusunda"}, headers=login(MANAGER)).json()["results"])
    assert not any(r["type"] in ("contractor", "worker") for r in
                   client.get("/search", params={"q": "Maa Tara"}, headers=login(WORKER)).json()["results"])


def test_create_first_admin():
    from seed.create_admin import create_admin
    with SessionLocal() as db:
        user = create_admin(db, "9555500001", "Real Admin", "StrongPass1")
        assert user.role == "cil_admin" and db.get(OrgUnit, user.org_unit_id).type == "cil"
        with pytest.raises(ValueError):
            create_admin(db, "9555500001", "Again", "StrongPass1")
        with pytest.raises(ValueError):
            create_admin(db, "9555500002", "Weak", "short")
