"""The ML features work on live database data: new records change the next answer, and scope is respected.

Runs last (file name) because it re-seeds the shared test database with a longer history (the risk model needs
several months of data to train).
"""
from datetime import timedelta

import pytest
from sqlalchemy import select

from app.db import SessionLocal
from app.models import Finding, Observation, OrgUnit, ProductionLog
from app.utils import today_ist, utcnow


@pytest.fixture(scope="module")
def long_history(client):
    from seed.generate import generate
    with SessionLocal() as db:
        generate(db, days=150, reset=True, seed=7)
        mines = dict(db.execute(select(OrgUnit.name, OrgUnit.id).where(OrgUnit.type == "mine")).all())
    return mines


def _risk(client, headers, **params):
    r = client.get("/ai/risk", headers=headers, params=params)
    assert r.status_code == 200, r.text
    return r.json()


def test_risk_model_trains_on_database_and_predicts_live(client, login, long_history):
    admin = login("9000000001")
    data = _risk(client, admin)
    assert data["model"]["training_rows"] > 100 and data["model"]["positive_rows"] > 0
    assert {r["mine_id"] for r in data["results"]} == set(long_history.values())
    assert all(r["source"] == "ml_model" and 0 <= r["risk_pct"] <= 100 for r in data["results"])

    # add two incidents and five near-misses at one mine: its live features (and nobody else's) must change
    mine = long_history["Moonidih UG"]
    before = {r["mine_id"]: r for r in data["results"]}
    with SessionLocal() as db:
        for kind, n in (("incident", 2), ("near_miss", 5)):
            for i in range(n):
                db.add(Observation(mine_id=mine, type=kind, text=f"test {kind} {i}", severity="high",
                                   created_at=utcnow() - timedelta(hours=i + 1)))
        db.commit()
    after = {r["mine_id"]: r for r in _risk(client, admin)["results"]}
    assert after[mine]["features"]["incidents_12w"] == before[mine]["features"]["incidents_12w"] + 2
    assert after[mine]["features"]["near_miss_4w"] == before[mine]["features"]["near_miss_4w"] + 5
    assert after[mine]["features_as_of"] > before[mine]["features_as_of"]
    other = long_history["Kusunda OCP"]
    assert after[other]["features"] == before[other]["features"]

    # the map / mine list use the same live model
    mines = client.get("/mines", headers=admin).json()
    listed = {m["id"]: m["risk"] for m in (mines["items"] if isinstance(mines, dict) else mines)}
    assert listed[mine]["source"] == "ml_model" and listed[mine]["risk_pct"] == after[mine]["risk_pct"]


def test_ml_endpoints_respect_scope(client, login, long_history):
    manager = login("9000000004")                     # Moonidih UG only
    moonidih = long_history["Moonidih UG"]
    assert [r["mine_id"] for r in _risk(client, manager)["results"]] == [moonidih]
    for path, key in (("/ai/anomalies", "anomalies"), ("/ai/recurrence", "violations")):
        r = client.get(path, headers=manager, params={"days": 150})
        assert r.status_code == 200
        for item in r.json()[key]:
            ids = [item["mine_id"]] if "mine_id" in item else [m["mine_id"] for m in item["by_mine"]]
            assert set(ids) == {moonidih}
    assert client.get("/ai/risk", headers=manager, params={"mine_id": long_history["Kusunda OCP"]}).status_code == 403


def test_recurrence_reads_new_findings(client, login, long_history):
    admin = login("9000000001")
    mine = long_history["Bhurkunda UG"]
    with SessionLocal() as db:
        ids = []
        for text in ("Water seepage flooding the pump sump", "Pump sump flooding with seepage water",
                     "Seepage water flooding near pump sump again"):
            finding = Finding(mine_id=mine, category="zz_test_drainage", description=text, severity="high",
                              created_at=utcnow() - timedelta(days=1))
            db.add(finding)
            db.flush()
            ids.append(finding.id)
        db.commit()
    violations = client.get("/ai/recurrence", headers=admin).json()["violations"]
    cluster = next(v for v in violations if v["category"] == "zz_test_drainage")
    assert set(ids) <= set(cluster["finding_ids"]) and cluster["by_mine"][0]["mine_id"] == mine


def test_production_anomaly_reads_new_log(client, login, long_history):
    admin = login("9000000001")
    mine = long_history["Kusunda OCP"]
    day = today_ist() - timedelta(days=1)
    with SessionLocal() as db:
        log = db.scalar(select(ProductionLog).where(ProductionLog.mine_id == mine, ProductionLog.date == day))
        if log is None:
            log = ProductionLog(mine_id=mine, date=day, produced_t=4000, dispatched_t=4000)
            db.add(log)
        log.produced_t, log.dispatched_t = 5000.0, 500.0          # 4,500 t produced but not dispatched
        db.commit()
    items = client.get("/ai/anomalies", headers=admin, params={"category": "production", "days": 7}).json()["anomalies"]
    assert any(a["mine_id"] == mine and a["date"] == str(day) for a in items)
