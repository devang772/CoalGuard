"""Module 3: org tree, mines, mine profile -> obligations -> tasks, tasks API, map data."""
import sys
import time
import types
from datetime import date

import pytest
from sqlalchemy import select

from app.config import settings
from app.db import SessionLocal
from app.models import ComplianceTask, MineObligation, Obligation, OrgUnit
from app.services.tasks import upcoming_due_dates
from app.utils import today_ist

CIL, BCCL, GM, MANAGER, REGULATOR, CONTRACTOR, OFFICER, SUPERVISOR, WORKER = (
    f"90000000{i:02d}" for i in range(1, 10))

DHANSAR_PROFILE = dict(working_method="UG", depth_m=290, seam_gas_degree=1, worker_count=610,
                       contract_worker_count=90, production_capacity_mtpa=0.3, uses_explosives=True,
                       has_conveyor=True, has_hemm=False, has_washery=False, near_water_body=False,
                       forest_land=False, state="Jharkhand")


@pytest.fixture(scope="module", autouse=True)
def _data(seeded_data):
    return seeded_data


def mine_id(name):
    with SessionLocal() as db:
        return db.scalar(select(OrgUnit.id).where(OrgUnit.name == name))


def active_codes(mid):
    with SessionLocal() as db:
        return set(db.scalars(select(Obligation.code).join(MineObligation, MineObligation.obligation_id == Obligation.id)
                              .where(MineObligation.mine_id == mid, MineObligation.status == "active")))


def put_profile(client, login, mid, phone=CIL, **changes):
    return client.put(f"/mines/{mid}/profile", json={**DHANSAR_PROFILE, **changes}, headers=login(phone))


# ---------------------------------------------------------------- due dates

def test_upcoming_due_dates():
    wed = date(2026, 9, 23)
    assert upcoming_due_dates("daily", wed) == [date(2026, 9, 23), date(2026, 9, 24), date(2026, 9, 25)]
    assert upcoming_due_dates("weekly", wed) == [date(2026, 9, 27)]
    assert upcoming_due_dates("monthly", wed) == [date(2026, 9, 30)]
    assert upcoming_due_dates("quarterly", date(2026, 11, 2)) == [date(2026, 12, 31)]
    assert upcoming_due_dates("yearly", date(2026, 3, 31)) == [date(2026, 3, 31)]
    assert upcoming_due_dates("yearly", date(2026, 4, 1)) == [date(2027, 3, 31)]


# ---------------------------------------------------------------- org & mines

def test_org_tree_is_scoped(client, login):
    gm_tree = client.get("/org/tree", headers=login(GM)).json()
    assert gm_tree["name"] == "Jharia Area"
    assert sorted(c["name"] for c in gm_tree["children"]) == ["Bastacolla OCP", "Moonidih UG"]
    cil_tree = client.get("/org/tree", headers=login(CIL)).json()
    assert [c["code"] for c in cil_tree["children"]] == ["BCCL", "CCL", "MCL"]
    mines = client.get("/org/units", params={"type": "mine"}, headers=login(BCCL)).json()
    assert len(mines) == 4


def test_mines_list_and_detail(client, login):
    listed = client.get("/mines", headers=login(GM)).json()
    assert [m["name"] for m in listed] == ["Bastacolla OCP", "Moonidih UG"]
    for m in listed:
        assert m["risk"]["level"] in ("low", "medium", "high")
        assert m["subsidiary"] == "BCCL" and m["area"] == "Jharia Area"
    assert len(client.get("/mines", headers=login(CIL)).json()) == 12
    narrowed = client.get("/mines", params={"org_id": mine_id("Kusunda OCP")}, headers=login(CIL)).json()
    assert [m["name"] for m in narrowed] == ["Kusunda OCP"]

    detail = client.get(f"/mines/{mine_id('Moonidih UG')}", headers=login(MANAGER)).json()
    assert detail["profile_filled"] is True and detail["boundary"]["type"] == "Polygon"
    assert client.get(f"/mines/{mine_id('Kusunda OCP')}", headers=login(MANAGER)).status_code == 403
    assert client.get("/mines/99999", headers=login(CIL)).status_code == 404


# ---------------------------------------------------------------- profile -> obligations -> tasks

def test_profile_read_and_permissions(client, login):
    moonidih, kusunda = mine_id("Moonidih UG"), mine_id("Kusunda OCP")
    profile = client.get(f"/mines/{moonidih}/profile", headers=login(WORKER)).json()
    assert profile["working_method"] == "UG" and profile["seam_gas_degree"] == 2
    assert put_profile(client, login, moonidih, WORKER).status_code == 403
    assert put_profile(client, login, moonidih, REGULATOR).status_code == 403
    assert put_profile(client, login, kusunda, MANAGER).status_code == 403
    bad = put_profile(client, login, mine_id("Dhansar UG"), working_method="OC", seam_gas_degree=2)
    assert bad.status_code == 422


def test_explosives_toggle_updates_obligations_and_tasks(client, login):
    dhansar = mine_id("Dhansar UG")
    off = put_profile(client, login, dhansar, uses_explosives=False)
    assert off.status_code == 200, off.text
    body = off.json()["obligations"]
    assert body["source"] == "rules_fallback" and "not installed" in body["note"]
    assert {"SAF-EXPL-D", "SAF-MAG-W"} <= set(body["removed"])
    assert "SAF-EXPL-D" not in active_codes(dhansar)
    with SessionLocal() as db:
        explosives_id = db.scalar(select(Obligation.id).where(Obligation.code == "SAF-EXPL-D"))
        future = db.scalars(select(ComplianceTask).where(
            ComplianceTask.mine_id == dhansar, ComplianceTask.obligation_id == explosives_id,
            ComplianceTask.due_date >= today_ist(), ComplianceTask.status != "done")).all()
        assert future == []

    on = put_profile(client, login, dhansar, uses_explosives=True).json()["obligations"]
    assert {"SAF-EXPL-D", "SAF-MAG-W"} <= set(on["added"])
    assert on["tasks_created"] >= 3                    # daily explosives task for today + next 2 days
    today_tasks = client.get("/tasks", params={"mine_id": dhansar, "due": "today", "page_size": 200},
                             headers=login(CIL)).json()["items"]
    assert any(t["obligation"]["code"] == "SAF-EXPL-D" for t in today_tasks)


def test_switch_to_opencast_changes_rules(client, login):
    dhansar = mine_id("Dhansar UG")
    result = put_profile(client, login, dhansar, working_method="OC", seam_gas_degree=None,
                         has_hemm=True).json()["obligations"]
    assert "SAF-HAUL-D" in result["added"] and "SAF-ROOF-D" in result["removed"]
    restored = put_profile(client, login, dhansar).json()["obligations"]
    assert "SAF-ROOF-D" in restored["added"] and "SAF-HAUL-D" in restored["removed"]


def test_not_applicable_decision_is_kept(client, login):
    dhansar = mine_id("Dhansar UG")
    links = client.get(f"/mines/{dhansar}/obligations", params={"status": "active"}, headers=login(CIL)).json()
    link = next(l for l in links if l["obligation"]["code"] == "LAB-HOURS-W")
    assert link["reason"] == "Applies to all coal mines."
    url = f"/mines/{dhansar}/obligations/{link['id']}"
    assert client.patch(url, json={"status": "not_applicable"}, headers=login(CIL)).status_code == 422
    assert client.patch(url, json={"status": "not_applicable", "remark": "x"}, headers=login(OFFICER)).status_code == 403
    ok = client.patch(url, json={"status": "not_applicable", "remark": "Covered by area office register"},
                      headers=login(CIL))
    assert ok.status_code == 200 and ok.json()["decided_by"] is not None
    again = put_profile(client, login, dhansar).json()["obligations"]
    assert "LAB-HOURS-W" in again["kept_not_applicable"]
    assert "LAB-HOURS-W" not in active_codes(dhansar)
    back = client.patch(url, json={"status": "active"}, headers=login(CIL))
    assert back.status_code == 200 and "LAB-HOURS-W" in active_codes(dhansar)


# ---------------------------------------------------------------- ML engine plug-in

@pytest.fixture
def fake_engine(monkeypatch):
    module = types.ModuleType("app.ai.obligation_engine")
    monkeypatch.setitem(sys.modules, "app.ai.obligation_engine", module)
    return module


ML_ITEM = {"code": "ML-TEST-1", "title": "Test duty from ML engine", "law_ref": "Test Act", "category": "safety",
           "frequency": "weekly", "severity": "high", "evidence_needed": "Photo", "source_text": "text",
           "reason": "Because the ML engine said so.", "confidence": 0.9}


def test_ml_engine_answer_is_used(client, login, fake_engine):
    received = {}

    def recommend_obligations(profile):
        received.update(profile)
        return [ML_ITEM, {"code": "BROKEN", "category": "nonsense"}]

    fake_engine.recommend_obligations = recommend_obligations
    dhansar = mine_id("Dhansar UG")
    result = put_profile(client, login, dhansar).json()["obligations"]
    assert result["source"] == "ml_engine" and result["added"] == ["ML-TEST-1"]
    assert received["working_method"] == "UG" and received["uses_explosives"] is True
    assert active_codes(dhansar) == {"ML-TEST-1"}
    links = client.get(f"/mines/{dhansar}/obligations", params={"status": "active"}, headers=login(CIL)).json()
    assert links[0]["source"] == "ml_engine" and links[0]["confidence"] == 0.9
    assert links[0]["obligation"]["source"] == "ml_engine"


def test_ml_engine_failure_falls_back(client, login, fake_engine):
    def recommend_obligations(profile):
        raise RuntimeError("model crashed")

    fake_engine.recommend_obligations = recommend_obligations
    result = put_profile(client, login, mine_id("Dhansar UG")).json()["obligations"]
    assert result["source"] == "rules_fallback" and "failed" in result["note"]
    assert "ML-TEST-1" in result["removed"] and "SAF-ROOF-D" in result["added"]


def test_ml_engine_timeout_falls_back(client, login, fake_engine, monkeypatch):
    monkeypatch.setattr(settings, "ml_timeout_seconds", 0.2)

    def recommend_obligations(profile):
        time.sleep(1)
        return [ML_ITEM]

    fake_engine.recommend_obligations = recommend_obligations
    result = put_profile(client, login, mine_id("Dhansar UG")).json()["obligations"]
    assert result["source"] == "rules_fallback" and "too long" in result["note"]


# ---------------------------------------------------------------- tasks API

def test_task_list_filters_and_paging(client, login):
    page = client.get("/tasks", params={"page_size": 5}, headers=login(CIL)).json()
    assert len(page["items"]) == 5 and page["total"] > 5 and page["page"] == 1
    statuses = [t["status"] for t in client.get("/tasks", params={"page_size": 200}, headers=login(CIL)).json()["items"]]
    assert statuses == sorted(statuses, key=["overdue", "pending", "done"].index)
    mine_tasks = client.get("/tasks", params={"page_size": 200}, headers=login(MANAGER)).json()["items"]
    assert {t["mine_name"] for t in mine_tasks} == {"Moonidih UG"}
    overdue = client.get("/tasks", params={"due": "overdue", "page_size": 50}, headers=login(CIL)).json()["items"]
    assert all(t["status"] == "overdue" and t["days_overdue"] > 0 for t in overdue)
    assert client.get("/tasks", params={"mine_id": mine_id("Kusunda OCP")}, headers=login(MANAGER)).status_code == 403
    summary = client.get("/tasks/summary", headers=login(MANAGER)).json()
    assert set(summary) == {"due_today", "due_this_week", "overdue", "done_today", "pending"}


def test_complete_task(client, login):
    items = client.get("/tasks", params={"due": "today", "status": "pending", "page_size": 5},
                       headers=login(OFFICER)).json()["items"]
    task = items[0]
    url = f"/tasks/{task['id']}/complete"
    assert client.post(url, json={}, headers=login(WORKER)).status_code == 403
    assert client.post(url, json={}, headers=login(REGULATOR)).status_code == 403
    done = client.post(url, json={"remarks": "Checked", "client_uuid": "uuid-1"}, headers=login(OFFICER))
    assert done.status_code == 200
    body = done.json()
    assert body["status"] == "done" and body["done_by_name"] == "Ramesh Kumar (Safety Officer)"
    assert client.post(url, json={"client_uuid": "uuid-1"}, headers=login(OFFICER)).status_code == 200
    assert client.post(url, json={"client_uuid": "uuid-2"}, headers=login(OFFICER)).status_code == 409
    assert client.get(f"/tasks/{task['id']}", headers=login(MANAGER)).json()["remarks"] == "Checked"
    assert client.post(url, json={"evidence_id": 999999}, headers=login(OFFICER)).status_code == 409


def test_generate_is_idempotent(client, login):
    client.post("/tasks/generate", headers=login(CIL))
    second = client.post("/tasks/generate", headers=login(CIL)).json()
    assert second == {"created": 0, "marked_overdue": 0}
    assert client.post("/tasks/generate", headers=login(OFFICER)).status_code == 403


def test_calendar_and_compliance(client, login):
    moonidih = mine_id("Moonidih UG")
    month = today_ist().strftime("%Y-%m")
    days = client.get(f"/mines/{moonidih}/calendar", params={"month": month}, headers=login(MANAGER)).json()
    assert days[0]["date"].endswith("-01") and sum(d["done"] + d["pending"] + d["overdue"] for d in days) > 0
    assert client.get(f"/mines/{moonidih}/calendar", params={"month": "2026-13"}, headers=login(MANAGER)).status_code == 422
    comp = client.get(f"/mines/{moonidih}/compliance", headers=login(MANAGER)).json()
    assert 0 <= comp["compliance_pct"] <= 100
    assert comp["due"] == comp["done_on_time"] + comp["done_late"] + comp["overdue"]
    assert {c["category"] for c in comp["by_category"]} <= {"safety", "environment", "labour", "production"}


# ---------------------------------------------------------------- map

def test_gis_mines(client, login):
    fc = client.get("/gis/mines", headers=login(GM)).json()
    assert fc["type"] == "FeatureCollection" and len(fc["features"]) == 2
    feature = fc["features"][0]
    assert feature["geometry"]["type"] == "Polygon"
    assert {"compliance_pct", "risk_pct", "risk_level", "open_capas", "overdue_tasks"} <= set(feature["properties"])


def test_gis_pins(client, login):
    sos = client.get("/gis/pins", params={"types": "sos"}, headers=login(CIL)).json()
    assert len(sos) == 3 and all(p["type"] == "sos" for p in sos)
    assert any(p["acknowledged"] is False for p in sos)
    mixed = client.get("/gis/pins", headers=login(CIL)).json()
    assert mixed[0]["type"] == "sos"
    critical = client.get("/gis/pins", params={"types": "finding", "severity": "critical"}, headers=login(CIL)).json()
    assert critical and all(p["severity"] == "critical" and p["type"] == "finding" for p in critical)
    mine_pins = client.get("/gis/pins", headers=login(MANAGER)).json()
    assert {p["mine_name"] for p in mine_pins} == {"Moonidih UG"}
