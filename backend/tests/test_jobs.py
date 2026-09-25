"""Module 8: reminders, escalation ladder, digest, demo clock, rules + jobs API (with a fake clock)."""
from datetime import datetime, timedelta

import pytest
from sqlalchemy import func, select

from app.db import SessionLocal
from app.models import Capa, ComplianceTask, Notification, OrgUnit, User
from app.services import jobs
from app.services.clock import DEMO_START, effective_now
from app.utils import utcnow

CIL, BCCL, GM, MANAGER, REGULATOR, CONTRACTOR, OFFICER, SUPERVISOR, WORKER = (
    f"90000000{i:02d}" for i in range(1, 10))


@pytest.fixture(scope="module", autouse=True)
def _data(seeded_data):
    return seeded_data


@pytest.fixture(scope="module")
def ids():
    with SessionLocal() as db:
        users = dict(db.execute(select(User.phone, User.id)).all())
        mine = db.scalar(select(OrgUnit.id).where(OrgUnit.name == "Moonidih UG"))
    return {"gm": users[GM], "bccl": users[BCCL], "cil": users[CIL], "manager": users[MANAGER],
            "worker": users[WORKER], "moonidih": mine}


def new_capa(client, login, mine_id, severity="critical"):
    inspection = client.post("/inspections", json={"mine_id": mine_id}, headers=login(OFFICER)).json()
    finding = client.post(f"/inspections/{inspection['id']}/findings",
                          json={"category": "roof", "description": f"Test {severity} roof problem",
                                "severity": severity}, headers=login(OFFICER)).json()
    with SessionLocal() as db:
        return db.get(Capa, finding["capa_id"])


def run(job, **kwargs):
    with SessionLocal() as db:
        result = getattr(jobs, job)(db, **kwargs)
        db.commit()
        return result


def count(user_id, link=None, kind=None):
    with SessionLocal() as db:
        q = select(func.count()).select_from(Notification).where(Notification.user_id == user_id)
        if link:
            q = q.where(Notification.link == link)
        if kind:
            q = q.where(Notification.kind == kind)
        return db.scalar(q)


def level_of(capa_id):
    with SessionLocal() as db:
        return db.get(Capa, capa_id).escalation_level


# ---------------------------------------------------------------- escalation ladder

def test_capa_climbs_the_ladder_one_step_at_a_time(client, login, ids):
    capa = new_capa(client, login, ids["moonidih"])
    link = f"/capa/{capa.id}"
    run("escalation", now=capa.due_at - timedelta(hours=1))
    assert level_of(capa.id) == 0 and count(ids["gm"], link, "escalation") == 0

    run("escalation", now=capa.due_at + timedelta(hours=1))
    assert level_of(capa.id) == 1 and count(ids["gm"], link, "escalation") == 1
    assert count(ids["manager"], link, "escalation") == 1                    # owner told it escalated
    run("escalation", now=capa.due_at + timedelta(hours=2))                  # same step again: no spam
    assert count(ids["gm"], link, "escalation") == 1

    run("escalation", now=capa.due_at + timedelta(hours=25))                  # another 24 h (critical SLA)
    assert level_of(capa.id) == 2 and count(ids["bccl"], link, "escalation") == 1
    run("escalation", now=capa.due_at + timedelta(hours=49))
    assert level_of(capa.id) == 3 and count(ids["cil"], link, "escalation") == 1
    run("escalation", now=capa.due_at + timedelta(days=30))                   # top of the ladder
    assert level_of(capa.id) == 3 and count(ids["cil"], link, "escalation") == 1

    detail = client.get(f"/capa/{capa.id}", headers=login(MANAGER)).json()
    assert [h["level"] for h in detail["escalation_history"]] == [1, 2, 3]


def test_jump_sends_every_missed_step(client, login, ids):
    capa = new_capa(client, login, ids["moonidih"])
    run("escalation", now=capa.due_at + timedelta(hours=50))                  # server was down for 2 days
    link = f"/capa/{capa.id}"
    assert level_of(capa.id) == 3
    assert [count(ids[k], link, "escalation") for k in ("gm", "bccl", "cil")] == [1, 1, 1]


def test_fixed_capa_never_escalates(client, login, ids):
    capa = new_capa(client, login, ids["moonidih"], severity="medium")
    client.post(f"/capa/{capa.id}/request-closure", json={"note": "Done"}, headers=login(OFFICER))
    run("escalation", now=capa.due_at + timedelta(days=20))
    assert level_of(capa.id) == 0 and count(ids["gm"], f"/capa/{capa.id}", "escalation") == 0


# ---------------------------------------------------------------- reminders

def test_reminders_are_sent_once_per_step(client, login, ids):
    capa = new_capa(client, login, ids["moonidih"], severity="high")          # SLA 72 h, reminder 24 h before
    link = f"/capa/{capa.id}"
    run("reminders", now=capa.created_at + timedelta(hours=10))
    assert count(ids["manager"], link, "reminder") == 0
    run("reminders", now=capa.due_at - timedelta(hours=20))
    assert count(ids["manager"], link, "reminder") == 1
    run("reminders", now=capa.due_at - timedelta(hours=10))
    assert count(ids["manager"], link, "reminder") == 1
    with SessionLocal() as db:
        assert db.get(Capa, capa.id).reminders_sent == [24]
        note = db.scalar(select(Notification).where(Notification.link == link, Notification.kind == "reminder"))
        assert note.title == f"Reminder: CAPA #{capa.id} is due in 20 h"


def test_medium_capa_gets_two_reminders(client, login, ids):
    capa = new_capa(client, login, ids["moonidih"], severity="medium")        # reminders 72 h and 24 h before
    link = f"/capa/{capa.id}"
    run("reminders", now=capa.due_at - timedelta(hours=70))
    run("reminders", now=capa.due_at - timedelta(hours=23))
    run("reminders", now=capa.due_at - timedelta(hours=5))
    assert count(ids["manager"], link, "reminder") == 2


# ---------------------------------------------------------------- tasks, grievances, SOS

def test_overdue_tasks_escalate_as_one_message_per_mine(ids):
    with SessionLocal() as db:
        tasks = list(db.scalars(select(ComplianceTask).where(
            ComplianceTask.mine_id == ids["moonidih"], ComplianceTask.status == "overdue",
            ComplianceTask.escalation_level >= 2).limit(3)))
        assert tasks
        for t in tasks:
            t.escalation_level = 0
        db.commit()
        task_ids = [t.id for t in tasks]
    before = count(ids["gm"], kind="escalation")
    result = run("escalation", now=utcnow())
    assert result["task_groups"] >= 1
    assert count(ids["gm"], kind="escalation") == before + 1                   # one grouped message, not 3
    with SessionLocal() as db:
        assert all(db.get(ComplianceTask, i).escalation_level >= 2 for i in task_ids)


def test_unanswered_grievance_escalates(client, login, ids):
    g = client.post("/grievances", json={"category": "wages", "text": "Wages delayed again this month"},
                    headers=login(WORKER)).json()
    link = f"/grievances/{g['id']}"
    now = utcnow()
    run("escalation", now=now + timedelta(days=3))
    assert count(ids["gm"], link) == 0
    run("escalation", now=now + timedelta(days=8))
    assert count(ids["gm"], link, "escalation") == 1
    run("escalation", now=now + timedelta(days=15))
    assert count(ids["bccl"], link, "escalation") == 1


def test_unanswered_sos_realerts(client, login, ids):
    sos = client.post("/sos", json={"kind": "fire"}, headers=login(WORKER)).json()
    link = f"/observations/{sos['id']}"
    first = count(ids["gm"], link)                                            # the original SOS alert
    created = datetime.fromisoformat(sos["created_at"])
    run("escalation", now=created + timedelta(minutes=16))
    assert count(ids["gm"], link) == first + 1 and count(ids["bccl"], link) == 2
    run("escalation", now=created + timedelta(minutes=31))
    assert count(ids["cil"], link) == 2
    client.post(f"/observations/{sos['id']}/acknowledge", headers=login(MANAGER))
    run("escalation", now=created + timedelta(hours=5))
    assert count(ids["cil"], link) == 2


# ---------------------------------------------------------------- digest, nightly, demo clock

def test_morning_digest_and_nightly(ids):
    before = count(ids["manager"], kind="digest")
    assert run("morning_digest")["digests_sent"] > 0
    assert count(ids["manager"], kind="digest") == before + 1
    assert set(run("nightly")) == {"tasks_created", "tasks_marked_overdue", "contractor_scores_updated"}


def test_stored_contractor_scores_match_the_api(client, login):
    run("nightly")
    live = {r["id"]: r["score"] for r in client.get("/contractors", headers=login(CIL)).json()}
    with SessionLocal() as db:
        from app.models import Contractor
        stored = {c.id: c.score for c in db.scalars(select(Contractor))}
    assert stored == live


def test_demo_clock():
    created = utcnow()
    assert effective_now(created, created + timedelta(minutes=24), speed=60) == created + timedelta(hours=24)
    assert effective_now(created, created + timedelta(minutes=24), speed=1) == created + timedelta(minutes=24)
    old = DEMO_START - timedelta(days=30)                                     # created before the server started
    later = DEMO_START + timedelta(minutes=10)
    assert effective_now(old, later, speed=60) == DEMO_START + timedelta(hours=10)


def test_demo_speed_escalates_in_minutes(client, login, ids):
    capa = new_capa(client, login, ids["moonidih"])
    run("escalation", now=capa.created_at + timedelta(minutes=23), speed=60)
    assert level_of(capa.id) == 0
    run("escalation", now=capa.created_at + timedelta(minutes=25), speed=60)
    assert level_of(capa.id) == 1


# ---------------------------------------------------------------- API

def test_escalation_rules_api(client, login):
    rules = client.get("/config/escalation", headers=login(MANAGER)).json()
    assert [r["severity"] for r in rules] == ["critical", "high", "medium", "low"]
    assert rules[0] == {"severity": "critical", "sla_hours": 24, "reminder_hours": [6],
                        "levels": ["mine_manager", "area_gm", "subsidiary_admin", "cil_admin"]}
    assert client.get("/config/escalation", headers=login(WORKER)).status_code == 403
    changed = [dict(r) for r in rules]
    changed[0]["sla_hours"] = 12
    changed[0]["reminder_hours"] = [3]
    assert client.put("/config/escalation", json={"rules": changed}, headers=login(BCCL)).status_code == 403
    ok = client.put("/config/escalation", json={"rules": changed}, headers=login(CIL))
    assert ok.status_code == 200 and ok.json()[0]["sla_hours"] == 12
    bad = [dict(r) for r in rules]
    bad[1]["levels"] = ["area_gm", "mine_manager"]
    assert client.put("/config/escalation", json={"rules": bad}, headers=login(CIL)).status_code == 422
    assert client.put("/config/escalation", json={"rules": rules[:3]}, headers=login(CIL)).status_code == 422
    assert client.put("/config/escalation", json={"rules": rules}, headers=login(CIL)).json() == rules


def test_jobs_api(client, login):
    status = client.get("/jobs/status", headers=login(CIL)).json()
    assert status["scheduler_running"] is False                               # disabled in tests
    assert set(status["jobs"]) == {"nightly", "reminders", "escalation", "digest"}
    ran = client.post("/jobs/run", params={"job": "escalation"}, headers=login(CIL)).json()
    assert set(ran["result"]) == {"capa_steps", "task_groups", "grievance_steps", "sos_realerts"}
    after = client.get("/jobs/status", headers=login(CIL)).json()["jobs"]["escalation"]
    assert after["runs"] >= 1 and after["error"] is None and after["last_run"]
    assert client.post("/jobs/run", params={"job": "escalation"}, headers=login(MANAGER)).status_code == 403
    assert client.post("/jobs/run", params={"job": "nope"}, headers=login(CIL)).status_code == 422
