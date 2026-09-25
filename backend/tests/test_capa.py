"""Module 4: checklists, inspections, findings -> automatic CAPA, CAPA board, approvals (two-person rule)."""
from datetime import datetime

import pytest
from sqlalchemy import select

from app.db import SessionLocal
from app.models import Approval, OrgUnit
from app.services.approvals import verify_approvals

CIL, BCCL, GM, MANAGER, REGULATOR, CONTRACTOR, OFFICER, SUPERVISOR, WORKER = (
    f"90000000{i:02d}" for i in range(1, 10))


@pytest.fixture(scope="module", autouse=True)
def _data(seeded_data):
    return seeded_data


def mine_id(name):
    with SessionLocal() as db:
        return db.scalar(select(OrgUnit.id).where(OrgUnit.name == name))


def me(client, login, phone):
    return client.get("/auth/me", headers=login(phone)).json()


def start(client, login, phone=OFFICER, mine="Moonidih UG", **extra):
    body = {"mine_id": mine_id(mine), "type": "internal", "lat": 23.7406, "lng": 86.3480, **extra}
    return client.post("/inspections", json=body, headers=login(phone))


def add_finding(client, login, inspection_id, severity="critical", phone=OFFICER, **extra):
    body = {"category": "roof", "description": "Crack in roof near junction", "severity": severity, **extra}
    return client.post(f"/inspections/{inspection_id}/findings", json=body, headers=login(phone))


def hours_between(a: str, b: str) -> float:
    return (datetime.fromisoformat(b) - datetime.fromisoformat(a)).total_seconds() / 3600


# ---------------------------------------------------------------- checklists

def test_checklists_fit_the_mine(client, login):
    ug = {c["name"] for c in client.get("/checklists", params={"mine_id": mine_id("Moonidih UG")},
                                        headers=login(OFFICER)).json()}
    assert ug == {"Underground Roof Support Inspection", "Conveyor Safety Check"}
    oc = {c["name"] for c in client.get("/checklists", params={"mine_id": mine_id("Kusunda OCP")},
                                        headers=login(CIL)).json()}
    assert oc == {"Daily Haul Road Inspection", "Conveyor Safety Check"}
    assert len(client.get("/checklists", headers=login(WORKER)).json()) == 3


# ---------------------------------------------------------------- inspections & findings

def test_start_inspection_permissions_and_offline_retry(client, login):
    assert start(client, login, WORKER).status_code == 403
    assert start(client, login, CONTRACTOR).status_code == 403
    assert start(client, login, OFFICER, mine="Kusunda OCP").status_code == 403
    first = start(client, login, client_uuid="insp-uuid-1")
    assert first.status_code == 201 and first.json()["status"] == "in_progress"
    retry = start(client, login, client_uuid="insp-uuid-1")
    assert retry.status_code == 200 and retry.json()["id"] == first.json()["id"]
    assert start(client, login, SUPERVISOR, client_uuid="insp-uuid-1").status_code == 409


def test_regulator_can_only_record_dgms_in_region(client, login):
    assert start(client, login, REGULATOR).status_code == 403                       # internal type
    assert start(client, login, REGULATOR, type="dgms").status_code == 201          # BCCL mine
    assert start(client, login, REGULATOR, mine="Lingaraj OCP", type="dgms").status_code == 403   # MCL


def test_finding_creates_capa_with_owner_and_deadline(client, login):
    inspection = start(client, login).json()
    manager_id = me(client, login, MANAGER)["id"]
    critical = add_finding(client, login, inspection["id"], "critical")
    assert critical.status_code == 201
    f = critical.json()
    assert f["capa_id"] and f["capa_status"] == "open"
    assert f["lat"] == 23.7406                                                        # taken from the inspection
    assert round(hours_between(f["created_at"], f["capa_due_at"])) == 24
    high = add_finding(client, login, inspection["id"], "high", category="water", description="Water at face").json()
    assert round(hours_between(high["created_at"], high["capa_due_at"])) == 72
    capa = client.get(f"/capa/{f['capa_id']}", headers=login(MANAGER)).json()
    assert capa["owner"]["id"] == manager_id and capa["hours_left"] > 23

    retry = add_finding(client, login, inspection["id"], "low", client_uuid="finding-uuid-1")
    again = add_finding(client, login, inspection["id"], "low", client_uuid="finding-uuid-1")
    assert retry.status_code == 201 and again.status_code == 200 and again.json()["id"] == retry.json()["id"]
    detail = client.get(f"/inspections/{inspection['id']}", headers=login(MANAGER)).json()
    assert detail["findings_count"] == 3 and detail["critical_count"] == 1


def test_finding_rules(client, login):
    inspection = start(client, login).json()
    assert add_finding(client, login, inspection["id"], phone=SUPERVISOR).status_code == 403   # not the inspector
    assert add_finding(client, login, inspection["id"], photo_evidence_id=999999).status_code == 422
    assert add_finding(client, login, inspection["id"], severity="extreme").status_code == 422
    submitted = client.post(f"/inspections/{inspection['id']}/submit",
                            json={"checklist_answers": [{"item_id": "RS-2", "answer": "not_ok"}], "notes": "Done"},
                            headers=login(OFFICER))
    assert submitted.status_code == 200 and submitted.json()["status"] == "submitted"
    assert submitted.json()["checklist_answers"] == [{"item_id": "RS-2", "answer": "not_ok"}]
    assert add_finding(client, login, inspection["id"]).status_code == 409
    assert client.post(f"/inspections/{inspection['id']}/submit", json={}, headers=login(OFFICER)).status_code == 409


def test_inspection_list_is_scoped(client, login):
    page = client.get("/inspections", params={"page_size": 100}, headers=login(MANAGER)).json()
    assert page["total"] > 0 and {i["mine_name"] for i in page["items"]} == {"Moonidih UG"}
    mine = client.get("/inspections", params={"inspector": "me"}, headers=login(OFFICER)).json()["items"]
    assert mine and all(i["inspector_name"] == "Ramesh Kumar (Safety Officer)" for i in mine)
    dgms = client.get("/inspections", params={"type": "dgms", "page_size": 100}, headers=login(CIL)).json()
    assert all(i["type"] == "dgms" for i in dgms["items"])


# ---------------------------------------------------------------- CAPA board

def test_capa_list_summary_and_filters(client, login):
    page = client.get("/capa", params={"page_size": 200}, headers=login(CIL)).json()
    assert page["total"] > 0
    flags = [c["overdue"] for c in page["items"]]
    assert flags == sorted(flags, reverse=True)                       # overdue first
    mine = client.get("/capa", params={"owner": "me", "status": "open"}, headers=login(MANAGER)).json()["items"]
    assert mine and all(c["owner"]["name"].startswith("Vikram") and c["status"] == "open" for c in mine)
    only_overdue = client.get("/capa", params={"overdue": "true", "page_size": 200}, headers=login(CIL)).json()["items"]
    assert all(c["overdue"] and c["hours_left"] < 0 for c in only_overdue)
    summary = client.get("/capa/summary", headers=login(CIL)).json()
    assert sum(summary["by_status"].values()) == page["total"]
    assert sum(summary["open_ageing"].values()) == sum(summary["open_by_severity"].values())
    assert client.get("/capa", params={"mine_id": mine_id("Kusunda OCP")}, headers=login(MANAGER)).status_code == 403


def test_reassign_owner(client, login):
    inspection = start(client, login).json()
    capa_id = add_finding(client, login, inspection["id"], "medium").json()["capa_id"]
    officer_id = me(client, login, OFFICER)["id"]
    ok = client.post(f"/capa/{capa_id}/assign", json={"owner_id": officer_id}, headers=login(MANAGER))
    assert ok.status_code == 200 and ok.json()["owner"]["id"] == officer_id
    worker_id = me(client, login, WORKER)["id"]
    assert client.post(f"/capa/{capa_id}/assign", json={"owner_id": worker_id}, headers=login(MANAGER)).status_code == 422
    assert client.post(f"/capa/{capa_id}/assign", json={"owner_id": officer_id}, headers=login(OFFICER)).status_code == 403


# ---------------------------------------------------------------- closure & approvals

def _new_capa(client, login, severity="medium"):
    """Medium severity: the after-photo is optional (photo rules are tested in test_proof.py)."""
    inspection = start(client, login).json()
    return add_finding(client, login, inspection["id"], severity).json()["capa_id"]


def decide(client, login, capa_id, decision, phone, remark=None):
    return client.post("/approvals", json={"entity": "capa", "entity_id": capa_id, "decision": decision,
                                           "remark": remark}, headers=login(phone))


def test_close_and_approve_with_two_person_rule(client, login):
    capa_id = _new_capa(client, login)
    assert decide(client, login, capa_id, "approve", GM).status_code == 409            # not in review yet
    assert client.post(f"/capa/{capa_id}/request-closure", json={}, headers=login(WORKER)).status_code == 403
    submitted = client.post(f"/capa/{capa_id}/request-closure", json={"note": "Roof bolted"}, headers=login(MANAGER))
    assert submitted.status_code == 200 and submitted.json()["status"] == "in_review"
    assert submitted.json()["closure_requested_by"]["name"].startswith("Vikram")

    blocked = decide(client, login, capa_id, "approve", MANAGER)
    assert blocked.status_code == 403 and "Two-person rule" in blocked.json()["detail"]
    assert decide(client, login, capa_id, "approve", REGULATOR).status_code == 403
    approved = decide(client, login, capa_id, "approve", GM)
    assert approved.status_code == 201 and len(approved.json()["hash"]) == 64
    capa = client.get(f"/capa/{capa_id}", headers=login(MANAGER)).json()
    assert capa["status"] == "closed" and capa["closed_at"] and capa["approvals_verified"] is True
    assert capa["approvals"][0]["approver_name"] == "Rajesh Prasad (GM Jharia)"
    assert client.post(f"/capa/{capa_id}/request-closure", json={}, headers=login(MANAGER)).status_code == 409


def test_reject_needs_remark_and_can_be_redone(client, login):
    capa_id = _new_capa(client, login)
    client.post(f"/capa/{capa_id}/request-closure", json={"note": "Done"}, headers=login(OFFICER))
    assert decide(client, login, capa_id, "reject", MANAGER).status_code == 422
    rejected = decide(client, login, capa_id, "reject", MANAGER, remark="Photo does not show the fix")
    assert rejected.status_code == 201
    assert client.get(f"/capa/{capa_id}", headers=login(OFFICER)).json()["status"] == "rejected"
    again = client.post(f"/capa/{capa_id}/request-closure", json={"note": "Fixed properly"}, headers=login(OFFICER))
    assert again.json()["status"] == "in_review"
    decide(client, login, capa_id, "approve", MANAGER)
    history = client.get("/approvals", params={"entity": "capa", "entity_id": capa_id}, headers=login(GM)).json()
    assert [a["decision"] for a in history] == ["reject", "approve"]


def test_tampered_approval_is_detected(client, login):
    capa_id = _new_capa(client, login)
    client.post(f"/capa/{capa_id}/request-closure", json={}, headers=login(OFFICER))
    decide(client, login, capa_id, "approve", MANAGER)
    with SessionLocal() as db:
        approval = db.scalar(select(Approval).where(Approval.entity == "capa", Approval.entity_id == capa_id))
        approval.remark = "edited behind the system's back"
        db.commit()
    assert client.get(f"/capa/{capa_id}", headers=login(MANAGER)).json()["approvals_verified"] is False


def test_seeded_closed_capas_have_valid_approvals():
    with SessionLocal() as db:
        approvals = list(db.scalars(select(Approval).where(Approval.remark == "Verified, fix accepted.").limit(20)))
        assert approvals and all(verify_approvals([a]) for a in approvals)
