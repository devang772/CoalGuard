"""Module 5: tamper-proof history (audit chain)."""
import pytest
from sqlalchemy import select, text

from app.db import SessionLocal, engine
from app.models import AuditLog, OrgUnit, User

CIL, BCCL, GM, MANAGER, REGULATOR, CONTRACTOR, OFFICER, SUPERVISOR, WORKER = (
    f"90000000{i:02d}" for i in range(1, 10))


@pytest.fixture(scope="module", autouse=True)
def _data(seeded_data):
    return seeded_data


@pytest.fixture(scope="module")
def capa_id(client, login):
    with SessionLocal() as db:
        mine = db.scalar(select(OrgUnit).where(OrgUnit.name == "Moonidih UG"))
    inspection = client.post("/inspections", json={"mine_id": mine.id}, headers=login(OFFICER)).json()
    finding = client.post(f"/inspections/{inspection['id']}/findings",
                          json={"category": "fire", "description": "Extinguisher missing", "severity": "medium"},
                          headers=login(OFFICER)).json()
    cid = finding["capa_id"]
    client.post(f"/capa/{cid}/request-closure", json={"note": "Installed"}, headers=login(OFFICER))
    client.post("/approvals", json={"entity": "capa", "entity_id": cid, "decision": "approve"}, headers=login(MANAGER))
    return cid


def sql(statement, **params):
    with engine.begin() as conn:
        return conn.execute(text(statement), params)


def test_chain_starts_at_genesis_and_records_the_seed():
    with SessionLocal() as db:
        first = db.scalar(select(AuditLog).order_by(AuditLog.id))
        assert first.prev_hash == "0" * 64                      # first link of the chain
        seed = db.scalar(select(AuditLog).where(AuditLog.table_name == "system", AuditLog.action == "seed"))
        assert seed is not None and '"counts"' in seed.data


def test_changes_are_recorded_with_who_and_what(client, login, capa_id):
    history = client.get(f"/audit/capas/{capa_id}", headers=login(MANAGER)).json()
    assert [h["action"] for h in history] == ["create", "update", "update"]
    assert history[1]["user_name"] == "Ramesh Kumar (Safety Officer)"
    assert "status" in history[1]["changed_fields"] and history[1]["before"]["status"] == "open"
    assert history[2]["data"]["status"] == "closed" and history[2]["user_name"].startswith("Vikram")
    assert history[1]["prev_hash"] != history[1]["hash"]
    recent = client.get("/audit/recent", params={"table": "approvals"}, headers=login(CIL)).json()
    assert recent["total"] >= 1 and recent["items"][0]["table_name"] == "approvals"


def test_passwords_never_enter_the_history():
    with SessionLocal() as db:
        assert db.scalar(select(AuditLog).where(AuditLog.data.like("%password_hash%"))) is None


def test_verify_is_clean_before_tampering(client, login, capa_id):
    result = client.get("/audit/verify", headers=login(CIL)).json()
    assert result["ok"] is True and result["chain_ok"] is True and result["total_entries"] > 1
    assert result["records_changed_outside_app"] == [] and len(result["head_hash"]) == 64


def test_direct_database_edit_is_detected(client, login, capa_id):
    sql("UPDATE capas SET status = 'open' WHERE id = :id", id=capa_id)
    try:
        result = client.get("/audit/verify", headers=login(CIL)).json()
        assert result["ok"] is False and result["chain_ok"] is True
        changed = result["records_changed_outside_app"]
        assert {"table_name": "capas", "record_id": capa_id, "problem": "Record was changed outside the app.",
                "fields": ["status"]} in changed
    finally:
        sql("UPDATE capas SET status = 'closed' WHERE id = :id", id=capa_id)
    assert client.get("/audit/verify", headers=login(CIL)).json()["ok"] is True


def test_edited_history_breaks_the_chain(client, login, capa_id):
    with SessionLocal() as db:
        entry = db.scalar(select(AuditLog).where(AuditLog.table_name == "capas", AuditLog.record_id == capa_id)
                          .order_by(AuditLog.id))
        entry_id, original = entry.id, entry.data
    sql("UPDATE audit_logs SET data = :d WHERE id = :id", d=original.replace('"status":"open"', '"status":"closed"'), id=entry_id)
    try:
        result = client.get("/audit/verify", headers=login(CIL)).json()
        assert result["chain_ok"] is False and result["broken_at"]["id"] == entry_id
    finally:
        sql("UPDATE audit_logs SET data = :d WHERE id = :id", d=original, id=entry_id)
    assert client.get("/audit/verify", headers=login(CIL)).json()["chain_ok"] is True


def test_audit_permissions(client, login, capa_id):
    for phone in (WORKER, OFFICER, SUPERVISOR, CONTRACTOR):
        assert client.get("/audit/verify", headers=login(phone)).status_code == 403
    assert client.get("/audit/verify", headers=login(REGULATOR)).status_code == 200
    assert client.get(f"/audit/capas/{capa_id}", headers=login(GM)).status_code == 200       # Moonidih is in Jharia
    with SessionLocal() as db:
        kusunda_gm = db.scalar(select(User.phone).where(User.name == "Area Gm, Kusunda Area"))
    assert client.get(f"/audit/capas/{capa_id}", headers=login(kusunda_gm)).status_code == 403
    assert client.get("/audit/users/1", headers=login(MANAGER)).status_code == 403            # CIL-level record
    assert client.get("/audit/users/1", headers=login(CIL)).status_code == 200
    assert client.get("/audit/nothing/1", headers=login(CIL)).status_code == 404
