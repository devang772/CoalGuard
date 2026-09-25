from datetime import timedelta

import pytest
from sqlalchemy import func, select

from app.db import SessionLocal
from app.models import (Attendance, Capa, ComplianceTask, Finding, MineObligation, MineProfile, Obligation,
                        OrgUnit, ProductionLog, Worker)
from app.services.applicability import evaluate
from seed import sample_data as S
from seed.generate import SHARED_DEVICE, generate

DAYS = 21


@pytest.fixture(scope="module")
def seeded(client):          # client fixture runs app startup (tables + bootstrap)
    with SessionLocal() as db:
        counts = generate(db, days=DAYS, reset=True, seed=42)
    return counts


def _mine(db, name):
    return db.scalar(select(OrgUnit).where(OrgUnit.name == name))


def _active_codes(db, mine_name):
    mine = _mine(db, mine_name)
    return set(db.scalars(select(Obligation.code).join(MineObligation, MineObligation.obligation_id == Obligation.id)
                          .where(MineObligation.mine_id == mine.id, MineObligation.status == "active")))


# ---------------------------------------------------------------- applicability rules

def test_evaluate_rules():
    ug = {"working_method": "UG", "seam_gas_degree": 2, "uses_explosives": True, "worker_count": 50}
    assert evaluate(None, ug) == (True, "Applies to all coal mines.")
    ok, reason = evaluate({"working_method": ["UG", "MIXED"], "uses_explosives": True}, ug)
    assert ok and "underground" in reason and "uses explosives" in reason
    assert evaluate({"working_method": ["OC"]}, ug)[0] is False
    assert evaluate({"seam_gas_degree": {"min": 2}}, ug)[0] is True
    assert evaluate({"seam_gas_degree": {"min": 3}}, ug)[0] is False
    assert evaluate({"worker_count": {"min": 100}}, ug)[0] is False
    assert evaluate({"seam_gas_degree": {"min": 2}}, {"seam_gas_degree": None})[0] is False


# ---------------------------------------------------------------- generated data

def test_counts(seeded):
    with SessionLocal() as db:           # the catalogue is reference data, installed before the generator runs
        assert db.scalar(select(func.count()).select_from(Obligation).where(Obligation.source == "catalogue"))             == len(S.OBLIGATIONS)
    assert seeded["mine_profiles"] == 12
    for table in ("compliance_tasks", "inspections", "findings", "observations", "contractors",
                  "workers", "attendance", "production_logs", "env_readings", "grievances"):
        assert seeded[table] > 0, table
    assert seeded["capas"] == seeded["findings"]


def test_rules_follow_mine_profile(seeded):
    with SessionLocal() as db:
        moonidih, kusunda = _active_codes(db, "Moonidih UG"), _active_codes(db, "Kusunda OCP")
        assert {"SAF-ROOF-D", "SAF-GAS-D", "SAF-GASMON-D"} <= moonidih   # underground, gas degree II
        assert "SAF-HAUL-D" not in moonidih
        assert {"SAF-HAUL-D", "SAF-HEMM-D", "ENV-DRAIN-M"} <= kusunda    # open-cast, HEMM, near water
        assert "SAF-ROOF-D" not in kusunda
        assert "SAF-GASMON-D" not in _active_codes(db, "Dhansar UG")    # gas degree I
        assert "SAF-EXPL-D" not in _active_codes(db, "Bhurkunda UG")    # no explosives
        assert db.scalar(select(func.count()).select_from(MineObligation).where(MineObligation.reason == "")) == 0


def test_task_dates_and_statuses(seeded):
    with SessionLocal() as db:
        tasks = db.execute(select(ComplianceTask.due_date, ComplianceTask.status, ComplianceTask.done_at,
                                  Obligation.frequency)
                           .join(Obligation, Obligation.id == ComplianceTask.obligation_id)).all()
        today = max(t.due_date for t in tasks if t.frequency == "daily") - timedelta(days=2)
        for due, status, done_at, freq in tasks:
            if freq == "daily":
                assert today - timedelta(days=DAYS) < due <= today + timedelta(days=2)
            if status == "done":
                assert done_at is not None
            if status == "overdue":
                assert due < today
        assert {t.status for t in tasks} >= {"done", "pending"}


def test_every_mine_has_a_profile(seeded):
    with SessionLocal() as db:
        assert db.scalar(select(func.count()).select_from(MineProfile)) == 12


def test_production_is_sane_and_gap_planted(seeded):
    with SessionLocal() as db:
        rows = db.execute(select(ProductionLog.mine_id, ProductionLog.produced_t, ProductionLog.dispatched_t)).all()
        assert all(p > 0 and d >= 0 for _, p, d in rows)
        bastacolla = _mine(db, "Bastacolla OCP").id
        gaps = [1 for m, p, d in rows if m == bastacolla and d / p < 0.6]
        assert len(gaps) >= 4


def test_ghost_workers_planted(seeded):
    with SessionLocal() as db:
        shared = db.scalar(select(func.count()).select_from(Worker).where(Worker.device_id == SHARED_DEVICE))
        assert shared >= 5
        no_gate = db.scalar(select(func.count()).select_from(Attendance).where(Attendance.gate_entry.is_(False)))
        assert no_gate > 0


def test_recurring_spillage_planted(seeded):
    with SessionLocal() as db:
        kusunda = _mine(db, "Kusunda OCP").id
        spills = db.scalar(select(func.count()).select_from(Finding).where(
            Finding.mine_id == kusunda, Finding.category == "haul_road", Finding.description.ilike("%spill%")))
        assert spills >= 6


def test_rejected_closure_planted(seeded):
    with SessionLocal() as db:
        moonidih = _mine(db, "Moonidih UG").id
        rejected = db.scalar(select(Capa).where(Capa.mine_id == moonidih, Capa.status == "rejected"))
        assert rejected is not None
        assert not any(check["passed"] for check in rejected.closure_checks)


def test_refuses_without_reset_and_is_repeatable(seeded):
    with SessionLocal() as db:
        with pytest.raises(RuntimeError):
            generate(db, days=DAYS, reset=False, seed=42)
    with SessionLocal() as db:
        again = generate(db, days=DAYS, reset=True, seed=42)
    assert again == seeded


def test_minimum_days():
    with SessionLocal() as db, pytest.raises(ValueError):
        generate(db, days=5, reset=True)
