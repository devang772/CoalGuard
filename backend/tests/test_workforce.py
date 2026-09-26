"""Module 6: contractors, workers, geofenced attendance, ghost-worker / compliance alerts."""
from datetime import date, timedelta

import pytest
from sqlalchemy import select

from app.config import settings
from app.db import SessionLocal
from app.models import Attendance, Contractor, OrgUnit, User, Worker
from app.utils import ist_day_start_utc, today_ist
from seed.generate import SHARED_DEVICE

CIL, BCCL, GM, MANAGER, REGULATOR, CONTRACTOR, OFFICER, SUPERVISOR, WORKER = (
    f"90000000{i:02d}" for i in range(1, 10))


@pytest.fixture(scope="module", autouse=True)
def _data(seeded_data):
    return seeded_data


def contractor_id(name):
    with SessionLocal() as db:
        return db.scalar(select(Contractor.id).where(Contractor.name == name))


def mine(name):
    with SessionLocal() as db:
        m = db.scalar(select(OrgUnit).where(OrgUnit.name == name))
        return {"id": m.id, "lat": m.center_lat, "lng": m.center_lng}


def alerts_of(client, login, name, phone=CIL):
    return {a["type"]: a for a in client.get(f"/contractors/{contractor_id(name)}/alerts", headers=login(phone)).json()}


# ---------------------------------------------------------------- contractors & alerts

def test_contractor_list_scoped_and_ranked(client, login):
    all_rows = client.get("/contractors", headers=login(CIL)).json()
    assert len(all_rows) == 15
    assert [r["score"] for r in all_rows] == sorted(r["score"] for r in all_rows)
    assert all_rows[0]["name"] == "Maa Tara Mining Works"
    jharia = client.get("/contractors", headers=login(GM)).json()
    assert {r["mine_name"] for r in jharia} == {"Moonidih UG", "Bastacolla OCP"} and len(jharia) == 4
    own = client.get("/contractors", headers=login(CONTRACTOR)).json()
    assert [r["name"] for r in own] == ["Shree Ganesh Enterprises"]
    assert client.get(f"/contractors/{contractor_id('Maa Tara Mining Works')}", headers=login(CONTRACTOR)).status_code == 403
    assert client.get("/contractors", headers=login(WORKER)).status_code == 403


def test_ghost_worker_ring_is_caught(client, login):
    a = alerts_of(client, login, "Maa Tara Mining Works")
    assert {"shared_device", "shared_bank", "no_gate_entry", "attendance_spike", "below_min_wage"} <= set(a)
    assert a["shared_device"]["count"] == 17 and SHARED_DEVICE in a["shared_device"]["description"]
    assert a["shared_bank"]["count"] == 2 and a["below_min_wage"]["count"] == 3
    assert "₹310" in a["below_min_wage"]["description"]
    assert all(x["severity"] == "high" for x in a.values() if x["type"] != "expired_medical")
    honest = alerts_of(client, login, "Shree Ganesh Enterprises")
    assert not {"shared_device", "shared_bank", "no_gate_entry", "attendance_spike"} & set(honest)


def test_licence_and_training_alerts(client, login):
    assert "licence_expiring" in alerts_of(client, login, "Jharkhand Earthmovers")
    rows = {r["name"]: r for r in client.get("/contractors", headers=login(CIL)).json()}
    assert rows["Hazaribagh Contractors"]["licence_status"] == "expired"
    assert "licence_expired" in alerts_of(client, login, "Hazaribagh Contractors")
    kusunda = alerts_of(client, login, "Damodar Transport Co.")
    assert kusunda["expired_training"]["count"] >= 5


def test_contractor_360(client, login):
    detail = client.get(f"/contractors/{contractor_id('Maa Tara Mining Works')}", headers=login(MANAGER)).json()
    assert detail["stats"]["workers_active"] == 52 and detail["stats"]["below_min_wage"] == 3
    assert detail["stats"]["attendance_30d"]["without_gate_entry"] > 0
    assert detail["score"] < 50 and len(detail["alerts"]) == detail["alerts_count"]


# ---------------------------------------------------------------- workers

def test_worker_list_flags_and_privacy(client, login):
    cid = contractor_id("Maa Tara Mining Works")
    shared = client.get(f"/contractors/{cid}/workers", params={"flag": "shared_device"}, headers=login(MANAGER)).json()
    assert len(shared) == 17 and all(w["device_id"] == SHARED_DEVICE for w in shared)
    w = shared[0]
    assert "bank_acc_hash" not in w and w["bank_account_on_file"] is True
    assert w["training_status"] in ("valid", "expiring", "expired")


def test_add_workers_and_shared_bank_detection(client, login):
    cid = contractor_id("Shree Ganesh Enterprises")
    body = {"name": "Test Worker One", "bank_account": "1234 5678 9012", "training_valid_till": "2030-01-01",
            "medical_valid_till": "2030-01-01", "daily_wage": 520}
    first = client.post(f"/contractors/{cid}/workers", json=body, headers=login(CONTRACTOR))
    assert first.status_code == 201 and first.json()["bank_account_on_file"] is True
    second = client.post(f"/contractors/{cid}/workers", json={**body, "name": "Test Worker Two",
                                                               "bank_account": "123456789012"}, headers=login(MANAGER))
    assert second.status_code == 201
    with SessionLocal() as db:
        stored = db.get(Worker, first.json()["id"]).bank_acc_hash
    assert "1234" not in stored and len(stored) == 64
    assert "shared_bank" in alerts_of(client, login, "Shree Ganesh Enterprises")
    other = contractor_id("Maa Tara Mining Works")
    assert client.post(f"/contractors/{other}/workers", json=body, headers=login(CONTRACTOR)).status_code == 403
    for wid in (first.json()["id"], second.json()["id"]):
        client.patch(f"/workers/{wid}", json={"is_active": False}, headers=login(MANAGER))
    assert "shared_bank" not in alerts_of(client, login, "Shree Ganesh Enterprises")


# ---------------------------------------------------------------- attendance

@pytest.fixture
def birsa():
    """The demo worker, with any attendance already seeded for today removed."""
    with SessionLocal() as db:
        worker = db.scalar(select(Worker).where(Worker.name == "Birsa Hansda"))
        start = ist_day_start_utc(today_ist())
        for record in db.scalars(select(Attendance).where(Attendance.worker_id == worker.id,
                                                           Attendance.time >= start)):
            db.delete(record)
        db.commit()
        return worker.id


def mark(client, login, phone, place, **extra):
    body = {"lat": place["lat"], "lng": place["lng"], "accuracy": 10, "device_id": "PHONE-1", **extra}
    return client.post("/attendance", json=body, headers=login(phone))


def test_self_attendance_then_gate_entry(client, login, birsa):
    moonidih = mine("Moonidih UG")
    ok = mark(client, login, WORKER, moonidih, client_uuid="att-1")
    assert ok.status_code == 201, ok.text
    body = ok.json()
    assert body["valid"] and body["source"] == "self" and not body["gate_entry"]
    assert body["message"].startswith("Attendance marked at")
    assert mark(client, login, WORKER, moonidih, client_uuid="att-1").status_code == 200          # offline retry
    again = mark(client, login, WORKER, moonidih)
    assert again.status_code == 409 and "already marked today" in again.json()["detail"]
    gate = mark(client, login, SUPERVISOR, moonidih, mode="gate", worker_id=birsa)
    assert gate.status_code == 200 and gate.json()["gate_entry"] is True
    mine_rows = client.get("/attendance/me", headers=login(WORKER)).json()
    assert mine_rows[0]["gate_entry"] is True


def test_demo_mode_allows_many_marks_a_day(client, login, birsa, monkeypatch):
    monkeypatch.setattr(settings, "attendance_allow_multiple", True)
    moonidih = mine("Moonidih UG")
    assert mark(client, login, WORKER, moonidih).status_code == 201
    assert mark(client, login, WORKER, moonidih).status_code == 201
    today = [r for r in client.get("/attendance/me", headers=login(WORKER)).json()
             if r["time"] >= ist_day_start_utc(today_ist()).isoformat()[:19]]
    assert len(today) == 2


def test_attendance_rules_give_reasons(client, login, birsa):
    moonidih = mine("Moonidih UG")
    outside = mark(client, login, WORKER, {"lat": moonidih["lat"] + 0.02, "lng": moonidih["lng"]})
    assert outside.status_code == 201 and outside.json()["valid"] is False
    assert "outside Moonidih UG" in outside.json()["reason"]
    fake = mark(client, login, WORKER, moonidih, is_mocked=True).json()
    assert fake["valid"] is False and "Fake GPS" in fake["reason"]
    cid = contractor_id("Shree Ganesh Enterprises")
    expired = client.post(f"/contractors/{cid}/workers", json={"name": "Expired Training", "training_valid_till":
                          str(today_ist() - timedelta(days=5)), "medical_valid_till": "2030-01-01"},
                          headers=login(MANAGER)).json()
    gate = mark(client, login, SUPERVISOR, moonidih, mode="gate", worker_id=expired["id"]).json()
    assert gate["valid"] is False and "Safety training expired" in gate["reason"]
    assert any(c["name"] == "Safety training valid" and not c["passed"] for c in gate["checks"])


def test_expired_contractor_licence_blocks_work(client, login):
    urimari = mine("Urimari OCP")
    with SessionLocal() as db:
        manager_phone = db.scalar(select(User.phone).where(User.org_unit_id == urimari["id"], User.role == "mine_manager"))
        worker_id = db.scalar(select(Worker.id).where(Worker.contractor_id == contractor_id("Hazaribagh Contractors"),
                                                      Worker.training_valid_till > date.today() + timedelta(days=40))
                              .limit(1))
        start = ist_day_start_utc(today_ist())
        for record in db.scalars(select(Attendance).where(Attendance.worker_id == worker_id, Attendance.time >= start)):
            db.delete(record)
        db.commit()
    r = mark(client, login, manager_phone, urimari, mode="gate", worker_id=worker_id).json()
    assert r["valid"] is False and "licence expired" in r["reason"]


def test_attendance_permissions(client, login, birsa):
    moonidih = mine("Moonidih UG")
    assert mark(client, login, OFFICER, moonidih).status_code == 403                  # not linked to a worker
    assert mark(client, login, WORKER, moonidih, mode="gate", worker_id=birsa).status_code == 403
    assert mark(client, login, SUPERVISOR, moonidih, mode="gate").status_code == 422   # worker_id missing
    other = client.get(f"/contractors/{contractor_id('Maa Tara Mining Works')}/workers",
                       headers=login(MANAGER)).json()[0]["id"]
    assert mark(client, login, CONTRACTOR, moonidih, mode="gate", worker_id=other).status_code == 403
    kusunda_worker = client.get(f"/contractors/{contractor_id('Damodar Transport Co.')}/workers",
                                headers=login(CIL)).json()[0]["id"]
    assert mark(client, login, SUPERVISOR, moonidih, mode="gate", worker_id=kusunda_worker).status_code == 403


def test_attendance_monitor(client, login):
    summary = client.get("/attendance/summary", headers=login(MANAGER)).json()
    assert set(summary) == {"date", "present", "invalid", "without_gate_entry", "outside_boundary", "expired_training"}
    assert summary["invalid"] >= summary["outside_boundary"]
    invalid = client.get("/attendance", params={"valid": "false", "page_size": 100}, headers=login(MANAGER)).json()
    assert all(not r["valid"] and r["reason"] for r in invalid["items"])
    assert {r["mine_name"] for r in invalid["items"]} <= {"Moonidih UG"}
    own = client.get("/attendance", params={"page_size": 200}, headers=login(CONTRACTOR)).json()["items"]
    assert {r["contractor_name"] for r in own} <= {"Shree Ganesh Enterprises"}
    assert client.get("/attendance", headers=login(WORKER)).status_code == 403
