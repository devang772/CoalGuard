"""Fake-but-realistic activity data for the 12 sample mines.

    python -m seed.generate              # 180 days ending today (refuses if data exists)
    python -m seed.generate --reset      # wipe activity data and generate again
    python -m seed.generate --days 60 --seed 7

The same --seed always produces the same data. Mines and users (seed.bootstrap) are kept.

How it works: every mine has a hidden "danger level" per day. It decides how many tasks
slip, how many CAPAs stay open, how many near-misses happen AND how likely an incident is,
so incidents follow the warning signs (something the ML model can genuinely learn).

Planted patterns (keep in sync with the ML/AI module plan):
  1. Kusunda OCP gets riskier every week over the last 8 weeks
  2. Monsoon (Jul-Sep): higher danger, more roof/water problems
  3. Bastacolla OCP: ~6 days where dispatch is far below production
  4. Moonidih UG, "Maa Tara Mining Works": attendance spikes on 5 days by extra workers
     without gate entry, and 5 workers sharing one phone; 3 workers paid below minimum wage
  5. Haul-road spillage findings repeated (different wording) at Kusunda and Bastacolla
  6. PM10 dust spikes at Ashoka OCP
"""
import argparse
import hashlib
import math
import random
import string
from collections import defaultdict, deque
from datetime import date, datetime, time, timedelta

from sqlalchemy import delete, func, insert, select, text
from sqlalchemy.orm import Session

from app import models  # noqa: F401  (register tables)
from app.config import settings
from app.constants import OrgType, Role
from app.db import Base, SessionLocal, engine
from app.models import (Approval, Attendance, AuditLog, Capa, Checklist, ComplianceTask, Contractor,
                        EnvReading, EscalationRule, Evidence, Finding, Grievance, Inspection, MineObligation,
                        MineProfile, Notification, Obligation, Observation, OrgUnit, ProductionLog, ReportLog,
                        User, Worker)
from app.services.applicability import evaluate
from app.services.approvals import GENESIS, approval_hash
from app.services.audit import append_entries
from app.utils import utcnow
from seed import sample_data as S
from seed.bootstrap import bootstrap

IST = timedelta(hours=5, minutes=30)
MONSOON = (7, 8, 9)
SEVERITIES = ["low", "medium", "high", "critical"]

# Child tables first so foreign keys are never broken while deleting.
ACTIVITY_TABLES = [Notification, Approval, AuditLog, ReportLog, Attendance, Worker, Contractor, Grievance,
                   Observation, Capa, Finding, Inspection, ComplianceTask, MineObligation, MineProfile,
                   Obligation, Checklist, Evidence, ProductionLog, EnvReading]

GHOST_CONTRACTOR = "Maa Tara Mining Works"
SHARED_DEVICE = "DEV-SHARED-7F3A"


class Generator:
    def __init__(self, db: Session, days: int, seed: int):
        self.db = db
        self.days = days
        self.rng = random.Random(seed)
        self.now = utcnow()
        self.today = (self.now + IST).date()           # "today" in India
        self.start = self.today - timedelta(days=days - 1)
        self.counts: dict[str, int] = defaultdict(int)

        self.mines = list(db.scalars(select(OrgUnit).where(OrgUnit.type == OrgType.MINE).order_by(OrgUnit.id)))
        self.mine_by_name = {m.name: m for m in self.mines}
        self.sla_hours = {r.severity: r.sla_hours for r in db.scalars(select(EscalationRule))}
        self.people: dict[tuple[int, str], int] = {}
        for u in db.scalars(select(User).order_by(User.id)):
            self.people.setdefault((u.org_unit_id, u.role), u.id)
        self.worker_user = db.scalar(select(User.id).where(User.phone == "9000000009"))
        self.contractor_admin = db.scalar(select(User.id).where(User.phone == "9000000006"))

        self.base_risk = {m.id: self.rng.uniform(0.10, 0.28) for m in self.mines}
        self.base_risk[self.mine_by_name["Kusunda OCP"].id] = 0.25
        self.ramp_start = self.today - timedelta(days=min(56, days - 1))

        self.evidence_rows: list[dict] = []
        self.next_id = defaultdict(int)

    # ------------------------------------------------------------------ helpers
    def new_id(self, table: str) -> int:
        self.next_id[table] += 1
        return self.next_id[table]

    def danger(self, mine: OrgUnit, day: date) -> float:
        level = self.base_risk[mine.id]
        if mine.name == "Kusunda OCP" and day >= self.ramp_start:
            span = max(1, (self.today - self.ramp_start).days)
            level += 0.55 * (day - self.ramp_start).days / span
        if day.month in MONSOON:
            level += 0.20
        return min(level, 0.95)

    def at(self, day: date, hour: float) -> datetime:
        """Local (IST) day + hour -> stored UTC datetime."""
        return datetime.combine(day, time()) + timedelta(hours=hour) - IST

    def point_in(self, mine: OrgUnit) -> tuple[float, float]:
        angle, r = self.rng.uniform(0, 2 * math.pi), self.rng.uniform(0, 0.005)
        return round(mine.center_lat + r * math.sin(angle), 6), round(mine.center_lng + r * math.cos(angle) * 1.1, 6)

    def person(self, mine: OrgUnit, role: str) -> int | None:
        return self.people.get((mine.id, role))

    def days_in_window(self):
        for i in range(self.days):
            yield self.start + timedelta(days=i)

    def pick_severity(self, d: float) -> str:
        weights = [max(0.05, 0.35 - 0.25 * d), 0.40, 0.18 + 0.30 * d, 0.04 + 0.20 * d]
        return self.rng.choices(SEVERITIES, weights)[0]

    def pick_category(self, mine: OrgUnit, day: date) -> str:
        weights = dict(S.CATEGORY_WEIGHTS[mine.mine_type or "OC"])
        if day.month in MONSOON:
            weights["water"] = weights.get("water", 5) * 2.5
            if "roof" in weights:
                weights["roof"] *= 1.5
        return self.rng.choices(list(weights), list(weights.values()))[0]

    def evidence(self, mine: OrgUnit, when: datetime, uploader: int | None, lat: float, lng: float,
                 flags: list[str] | None = None) -> int:
        eid = self.new_id("evidence")
        flags = list(flags or [])
        if not flags and self.rng.random() < 0.06:
            flags = [self.rng.choice(["time_mismatch", "low_gps_accuracy", "no_exif", "outside_boundary"])]
        if "outside_boundary" in flags:
            lat += 0.02
        score = max(20, self.rng.randint(80, 98) - 22 * len(flags))
        self.evidence_rows.append(dict(
            id=eid, file_path=f"seed/evidence_{eid}.jpg", kind="photo",
            sha256=hashlib.sha256(f"evidence-{eid}".encode()).hexdigest(),
            phash=f"{self.rng.getrandbits(64):016x}", lat=lat, lng=lng,
            accuracy=round(self.rng.uniform(4, 18), 1),
            device_time=when - timedelta(seconds=self.rng.randint(5, 90)) - (
                timedelta(minutes=25) if "time_mismatch" in flags else timedelta()),
            server_time=when, device_id=f"DEV-{mine.id:02d}-{self.rng.randint(1, 40):03d}", is_mocked=False,
            exif={"source": "seed"}, trust_score=score, flags=flags, mine_id=mine.id, uploaded_by=uploader,
            created_at=when))
        return eid

    def bulk(self, model, rows: list[dict], chunk: int = 5000) -> None:
        # Core insert (not the ORM bulk path) so rows go in multi-row batches: far fewer database round trips
        conn = self.db.connection()
        for i in range(0, len(rows), chunk):
            conn.execute(insert(model.__table__), rows[i:i + chunk])
        self.counts[model.__tablename__] += len(rows)

    # ------------------------------------------------------------------ steps
    def rules_and_profiles(self) -> dict[int, list[Obligation]]:
        catalogue = []
        for code, title, law_ref, category, frequency, severity, evidence_needed, applies_when in S.OBLIGATIONS:
            catalogue.append(dict(
                id=self.new_id("obligations"), code=code, source="catalogue", applies_when=applies_when,
                title=title, law_ref=law_ref, category=category, frequency=frequency, severity=severity,
                evidence_needed=evidence_needed, status="approved", created_by_ai=False,
                source_text=f"{law_ref}: {title}.", source_document="Sample obligation catalogue",
                approved_at=self.now, created_at=self.now))
        self.bulk(Obligation, catalogue)

        profiles, links = [], []
        active: dict[int, list[dict]] = defaultdict(list)
        for mine in self.mines:
            p = dict(S.MINE_PROFILES[mine.name])
            p.update(ec_number=f"J-11015/{100 + mine.id}/2019-IA.II(M)",
                     cto_valid_till=self.today + timedelta(days=self.rng.randint(40, 700)))
            profiles.append(dict(mine_id=mine.id, updated_by=self.person(mine, Role.MINE_MANAGER), **p))
            for ob in catalogue:
                applies, reason = evaluate(ob["applies_when"], p)
                if applies:
                    links.append(dict(mine_id=mine.id, obligation_id=ob["id"], status="active", reason=reason,
                                      confidence=1.0, source="rules_fallback"))
                    active[mine.id].append(ob)
        self.bulk(MineProfile, profiles)
        self.bulk(MineObligation, links)
        return active

    def due_dates(self, frequency: str) -> list[date]:
        if frequency == "daily":
            first = max(self.start, self.today - timedelta(days=29))
            return [first + timedelta(days=i) for i in range((self.today + timedelta(days=2) - first).days + 1)]
        if frequency == "weekly":
            d = self.start + timedelta(days=(6 - self.start.weekday()) % 7)        # first Sunday
            out = []
            while d <= self.today + timedelta(days=6):
                out.append(d)
                d += timedelta(days=7)
            return out
        if frequency in ("monthly", "quarterly"):
            # due on the last day of each month (monthly) or of Mar/Jun/Sep/Dec (quarterly)
            out, y, m = [], self.start.year, self.start.month
            while True:
                due = date(y + m // 12, m % 12 + 1, 1) - timedelta(days=1)         # last day of month m
                if frequency == "monthly" or m % 3 == 0:
                    out.append(due)
                    if due >= self.today:
                        return out
                y, m = (y + 1, 1) if m == 12 else (y, m + 1)
        # yearly: end of the Indian financial year (31 March)
        return [date(y, 3, 31) for y in range(self.start.year, self.today.year + 2)
                if self.start <= date(y, 3, 31) <= self.today + timedelta(days=366)][:2]

    def tasks(self, active: dict[int, list[dict]]) -> None:
        rows = []
        for mine in self.mines:
            officer = self.person(mine, Role.SAFETY_OFFICER)
            for ob in active[mine.id]:
                for due in self.due_dates(ob["frequency"]):
                    row = dict(obligation_id=ob["id"], mine_id=mine.id, due_date=due, status="pending",
                               escalation_level=0, done_by=None, done_at=None,
                               created_at=self.at(due - timedelta(days=7), 0))
                    if due < self.today:
                        d = self.danger(mine, due)
                        missed = self.rng.random() < 0.03 + 0.35 * d ** 1.5
                        age = (self.today - due).days
                        if missed and age <= 45:
                            row.update(status="overdue", escalation_level=min(3, 1 + (age >= 3) + (age >= 7)))
                        else:
                            late = missed or self.rng.random() < 0.3 * d
                            offset = self.rng.uniform(1, 10) if late else -self.rng.uniform(0, 2)
                            done_at = min(self.at(due, 17) + timedelta(days=offset), self.now)
                            row.update(status="done", done_by=officer, done_at=done_at)
                    elif due == self.today and self.rng.random() < 0.5:
                        row.update(status="done", done_by=officer, done_at=self.now - timedelta(hours=2))
                    rows.append(row)
        self.bulk(ComplianceTask, rows)

    def checklists(self) -> dict[str, int]:
        ids = {}
        rows = []
        for name, mine_type, items in S.CHECKLISTS:
            cid = self.new_id("checklists")
            ids[mine_type or "ANY"] = cid
            rows.append(dict(id=cid, name=name, mine_type=mine_type,
                             items=[{"id": i, "text": t, "category": c} for i, t, c in items], created_at=self.now))
        self.bulk(Checklist, rows)
        return ids

    def inspections(self, checklist_ids: dict[str, int]) -> None:
        insp_rows, finding_rows, capa_rows, approval_rows = [], [], [], []

        def make_inspection(mine, day, kind="internal"):
            iid = self.new_id("inspections")
            started = self.at(day, self.rng.uniform(9, 15))
            lat, lng = self.point_in(mine)
            inspector = self.person(mine, self.rng.choice([Role.SAFETY_OFFICER, Role.SAFETY_OFFICER, Role.MINE_MANAGER]))
            insp_rows.append(dict(id=iid, mine_id=mine.id, inspector_id=inspector, type=kind,
                                  checklist_id=checklist_ids.get(mine.mine_type or "OC"), lat=lat, lng=lng,
                                  status="submitted", checklist_answers=None, notes=None, started_at=started,
                                  submitted_at=started + timedelta(hours=self.rng.uniform(1, 3)), created_at=started))
            return iid, started, inspector

        def make_finding(mine, day, insp, category, description, severity, closure=None):
            iid, started, inspector = insp
            fid = self.new_id("findings")
            created = started + timedelta(minutes=self.rng.randint(10, 90))
            lat, lng = self.point_in(mine)
            photo = self.evidence(mine, created, inspector, lat, lng)
            finding_rows.append(dict(id=fid, inspection_id=iid, mine_id=mine.id, category=category,
                                     description=description, severity=severity, law_ref=None, lat=lat, lng=lng,
                                     photo_evidence_id=photo, created_at=created))
            sla = timedelta(hours=self.sla_hours.get(severity, 168))
            due = created + sla
            capa = dict(id=self.new_id("capas"), finding_id=fid, mine_id=mine.id, owner_id=self.person(mine, Role.MINE_MANAGER), due_at=due,
                        status="open", escalation_level=0, last_escalated_at=None, after_evidence_id=None,
                        closure_requested_by=None, closure_requested_at=None, closure_note=None,
                        closure_checks=None, closure_score=None, closed_at=None, created_at=created)
            d = self.danger(mine, day)
            if closure == "rejected":
                requested = self.now - timedelta(hours=5)
                after = self.evidence(mine, requested, capa["owner_id"], lat + 0.0037, lng, flags=["reused_photo"])
                capa.update(status="rejected", after_evidence_id=after, closure_score=38.0,
                            closure_requested_by=capa["owner_id"], closure_requested_at=requested,
                            closure_note="Roof bolted and area dressed.", closure_checks=[
                    {"name": "Same location", "passed": False, "detail": "411 m from the before-photo (limit 30 m)"},
                    {"name": "Fresh photo (not reused)", "passed": False,
                     "detail": "Matches a photo uploaded earlier at this mine"},
                    {"name": "Trust score", "passed": False, "detail": "38 (minimum 60)"}])
            elif due < self.now:
                recent = (self.now - created).days <= 40
                if recent and self.rng.random() < 0.02 + 0.60 * d ** 2:
                    overdue_h = (self.now - due).total_seconds() / 3600
                    sla_h = sla.total_seconds() / 3600
                    level = 1 + (overdue_h > sla_h) + (overdue_h > 2 * sla_h)
                    capa.update(escalation_level=min(3, level), last_escalated_at=self.now - timedelta(hours=1))
                else:
                    late = self.rng.random() < 0.4 * d
                    closed = (due + timedelta(hours=self.rng.uniform(1, 72))) if late else \
                        (created + sla * self.rng.uniform(0.2, 0.9))
                    self._close(capa, mine, min(closed, self.now), lat, lng)
            else:
                roll = self.rng.random()
                if roll < 0.2:
                    self._close(capa, mine, min(created + sla * 0.3, self.now), lat, lng, status="in_review")
                elif roll < 0.3:
                    self._close(capa, mine, min(created + sla * 0.2, self.now), lat, lng)
            capa_rows.append(capa)
            approver = self.people.get((mine.parent_id, Role.AREA_GM))
            if capa["status"] == "closed" and approver:
                signed = capa["closed_at"].replace(microsecond=0)
                remark = "Verified, fix accepted."
                approval_rows.append(dict(entity="capa", entity_id=capa["id"], approver_id=approver,
                                          decision="approve", remark=remark, created_at=signed,
                                          hash=approval_hash("capa", capa["id"], approver, "approve", remark,
                                                             signed, GENESIS)))

        for mine in self.mines:
            day = self.start
            while day <= self.today:
                for _ in range(self.rng.choice([1, 2, 2, 3])):
                    visit = min(day + timedelta(days=self.rng.randint(0, 6)), self.today)
                    kind = self.rng.choices(["internal", "statutory", "dgms", "spcb"], [80, 10, 6, 4])[0]
                    insp = make_inspection(mine, visit, kind)
                    d = self.danger(mine, visit)
                    for _ in range(self.rng.choices([0, 1, 2, 3], [1 - d, 1, 0.6 + d, 0.3 + 1.5 * d])[0]):
                        category = self.pick_category(mine, visit)
                        make_finding(mine, visit, insp, category, self.rng.choice(S.FINDING_TEXTS[category]),
                                     self.pick_severity(d))
                day += timedelta(days=7)

        # Planted: repeated haul-road spillage at Kusunda (6x) and Bastacolla (5x) in the last 60 days
        window = min(60, self.days)
        for name, times in (("Kusunda OCP", 6), ("Bastacolla OCP", 5)):
            mine = self.mine_by_name[name]
            for k in range(times):
                day = self.today - timedelta(days=int(window * (k + 0.5) / times))
                make_finding(mine, day, make_inspection(mine, day), "haul_road",
                             self.rng.choice(S.SPILLAGE_VARIANTS), self.rng.choice(["medium", "high"]))

        # Planted: one rejected closure at Moonidih for the Satya Proof demo
        mine = self.mine_by_name["Moonidih UG"]
        day = self.today - timedelta(days=2)
        make_finding(mine, day, make_inspection(mine, day), "roof", "Loose roof at the goaf edge", "high",
                     closure="rejected")

        self.bulk(Evidence, self.evidence_rows)
        self.evidence_rows = []
        self.bulk(Inspection, insp_rows)
        self.bulk(Finding, finding_rows)
        self.bulk(Capa, capa_rows)
        self.bulk(Approval, approval_rows)

    def _close(self, capa: dict, mine: OrgUnit, when: datetime, lat: float, lng: float, status="closed") -> None:
        after = self.evidence(mine, when, capa["owner_id"], lat + 0.00008, lng + 0.00005)
        distance = self.rng.randint(4, 22)
        trust = next(e["trust_score"] for e in reversed(self.evidence_rows) if e["id"] == after)
        capa.update(status=status, after_evidence_id=after, closure_score=float(trust),
                    closure_requested_by=capa["owner_id"],
                    closure_requested_at=when - timedelta(hours=2) if status == "closed" else when,
                    closure_note="Fixed and verified on site.",
                    closed_at=when if status == "closed" else None, closure_checks=[
                        {"name": "Same location", "passed": True, "detail": f"{distance} m from the before-photo"},
                        {"name": "Fresh photo (not reused)", "passed": True, "detail": "No match with older photos"},
                        {"name": "Trust score", "passed": trust >= 60, "detail": str(trust)}])

    def observations(self) -> None:
        rows = []
        for mine in self.mines:
            officer = self.person(mine, Role.SAFETY_OFFICER)
            recent_near_miss: deque[int] = deque(maxlen=14)
            for day in self.days_in_window():
                d = self.danger(mine, day)
                today_nm = 0
                for kind, p in (("near_miss", 0.03 + 0.40 * d ** 2), ("unsafe_condition", 0.02 + 0.25 * d ** 2),
                                ("unsafe_act", 0.02 + 0.15 * d ** 2)):
                    if self.rng.random() < p:
                        today_nm += kind == "near_miss"
                        rows.append(self._observation(mine, day, kind, officer, d))
                recent_near_miss.append(today_nm)
                p_incident = 0.001 + 0.12 * d ** 2.5 * (1 + 0.10 * sum(recent_near_miss))
                if self.rng.random() < p_incident:
                    rows.append(self._observation(mine, day, "incident", officer, d))
        # Planted: recent SOS alerts (one still unacknowledged)
        for name, ago, acked in (("Kusunda OCP", 6, True), ("Lingaraj OCP", 9, True), ("Moonidih UG", 1, False)):
            mine = self.mine_by_name[name]
            day = self.today - timedelta(days=min(ago, self.days - 1))
            when = self.at(day, 11.5)
            lat, lng = self.point_in(mine)
            rows.append(dict(mine_id=mine.id, reporter_id=self.person(mine, Role.SAFETY_OFFICER), type="sos",
                             category="other", text="SOS emergency alert", severity="critical", lat=lat, lng=lng,
                             location_text=None, source="app", language="en", transcript=None, anonymous=False,
                             evidence_id=None, acknowledged_by=self.person(mine, Role.MINE_MANAGER) if acked else None,
                             acknowledged_at=when + timedelta(minutes=4) if acked else None, created_at=when))
        self.bulk(Evidence, self.evidence_rows)
        self.evidence_rows = []
        self.bulk(Observation, rows)

    def _observation(self, mine: OrgUnit, day: date, kind: str, officer: int | None, d: float) -> dict:
        when = self.at(day, self.rng.uniform(7, 18))
        lat, lng = self.point_in(mine)
        row = dict(mine_id=mine.id, reporter_id=officer, type=kind, category=None, text="", severity="medium",
                   lat=lat, lng=lng, location_text=None, source="app", language="en", transcript=None,
                   anonymous=False, evidence_id=None, acknowledged_by=None, acknowledged_at=None, created_at=when)
        if kind != "incident" and self.rng.random() < 0.2:
            transcript, vtype, category, severity, hazard = self.rng.choice(S.HINDI_VOICE)
            reporter = self.worker_user if mine.name == "Moonidih UG" else officer
            row.update(type=vtype, category=category, text=hazard, severity=severity, source="voice",
                       language="hi", transcript=transcript, reporter_id=reporter)
            return row
        category = self.pick_category(mine, day)
        severity = self.rng.choice(["high", "critical"]) if kind == "incident" else self.pick_severity(d * 0.7)
        row.update(category=category, text=self.rng.choice(S.OBSERVATION_TEXTS[kind]), severity=severity)
        if self.rng.random() < 0.5:
            row["evidence_id"] = self.evidence(mine, when, officer, lat, lng)
        return row

    def workforce(self) -> None:
        contractor_rows, worker_rows = [], []
        ghost_extra: list[int] = []
        ghost_regular: list[int] = []
        workers_by_mine: dict[int, list[dict]] = defaultdict(list)
        kusunda = self.mine_by_name["Kusunda OCP"].id
        for mine_name, names in S.CONTRACTORS.items():
            mine = self.mine_by_name[mine_name]
            for name in names:
                cid = self.new_id("contractors")
                licence = self.today + timedelta(days=self.rng.randint(60, 700))
                if name == "Jharkhand Earthmovers":
                    licence = self.today + timedelta(days=15)              # expiring soon
                if name == "Hazaribagh Contractors":
                    licence = self.today - timedelta(days=10)              # expired
                contractor_rows.append(dict(
                    id=cid, name=name, licence_no=f"CLRA/{mine.code[5:9]}/{2023 + cid % 3}/{100 + cid}",
                    licence_valid_till=licence, insurance_valid_till=self.today + timedelta(days=self.rng.randint(20, 400)),
                    pf_code=f"JHRAN{1000 + cid}", esi_code=f"ESI{2000 + cid}", mine_id=mine.id,
                    admin_user_id=self.contractor_admin if name == "Shree Ganesh Enterprises" else None,
                    score=round(self.rng.uniform(70, 95), 1), created_at=self.at(self.start, 10)))
                extra = 12 if name == GHOST_CONTRACTOR else 0
                for n in range(40 + extra):
                    wid = self.new_id("workers")
                    expired_share = 0.30 if mine.id == kusunda else 0.05
                    training = (self.today - timedelta(days=self.rng.randint(5, 90))) if self.rng.random() < expired_share \
                        else self.today + timedelta(days=self.rng.randint(30, 700))
                    medical = (self.today - timedelta(days=self.rng.randint(5, 60))) if self.rng.random() < 0.03 \
                        else self.today + timedelta(days=self.rng.randint(30, 700))
                    worker = dict(
                        id=wid, contractor_id=cid, user_id=None,
                        name=f"{self.rng.choice(S.FIRST_NAMES)} {self.rng.choice(S.LAST_NAMES)}",
                        phone=f"7{wid:09d}", device_id=f"DEV-W{wid:05d}",
                        bank_acc_hash=hashlib.sha256(f"bank-{wid}".encode()).hexdigest(),
                        training_valid_till=training, medical_valid_till=medical,
                        daily_wage=float(self.rng.randrange(460, 720, 10)), is_active=True,
                        created_at=self.at(self.start, 10))
                    if name == GHOST_CONTRACTOR:
                        if n < 5:                                           # 5 workers share one phone
                            worker["device_id"] = SHARED_DEVICE
                        if n in (5, 6):                                     # 2 share a bank account
                            worker["bank_acc_hash"] = hashlib.sha256(b"bank-shared").hexdigest()
                        if n in (7, 8, 9):                                  # below minimum wage
                            worker["daily_wage"] = 310.0
                        (ghost_extra if n >= 40 else ghost_regular).append(wid)
                        if n >= 40:
                            worker["device_id"] = SHARED_DEVICE
                    if name == "Shree Ganesh Enterprises" and n == 0:
                        worker.update(name="Birsa Hansda", user_id=self.worker_user, phone="9000000009",
                                      training_valid_till=self.today + timedelta(days=300))
                    worker_rows.append(worker)
                    if n < 40:
                        workers_by_mine[mine.id].append(worker)
        self.bulk(Contractor, contractor_rows)
        self.bulk(Worker, worker_rows)
        self.attendance(workers_by_mine, [w for w in worker_rows if w["id"] in set(ghost_extra)], set(ghost_regular))

    def attendance(self, workers_by_mine, ghost_extra: list[dict], ghost_regular: set[int]) -> None:
        rows = []
        first = max(self.start, self.today - timedelta(days=89))
        span = (self.today - first).days
        spike_days = {self.today - timedelta(days=int(span * f)) for f in (0.08, 0.2, 0.35, 0.5, 0.7)}

        def record(worker, mine, day, gate=True):
            when = self.at(day, self.rng.uniform(6, 7.5))
            lat, lng = self.point_in(mine)
            valid, reason = True, None
            if worker["training_valid_till"] < day:
                valid, reason = False, f"Safety training expired on {worker['training_valid_till']:%d %b %Y}"
            elif self.rng.random() < 0.01:
                lat += 0.02
                valid, reason = False, "Outside mine boundary (about 2 km away)"
            rows.append(dict(worker_id=worker["id"], mine_id=mine.id, time=when, lat=lat, lng=lng,
                             accuracy=round(self.rng.uniform(5, 25), 1), selfie_evidence_id=None,
                             device_id=worker["device_id"], gate_entry=gate, source="self", marked_by=None,
                             valid=valid, reason=reason,
                             created_at=when))

        for mine in self.mines:
            for i in range(span + 1):
                day = first + timedelta(days=i)
                if day.weekday() == 6:                                      # Sunday off
                    continue
                for worker in workers_by_mine[mine.id]:
                    if self.rng.random() < 0.88:
                        gate = not (worker["id"] in ghost_regular and self.rng.random() < 0.3)
                        record(worker, mine, day, gate)
                if mine.name == "Moonidih UG" and day in spike_days:
                    for worker in ghost_extra:                              # ghost shift
                        record(worker, mine, day, gate=False)
        self.bulk(Attendance, rows)

    def operations(self) -> None:
        prod, env = [], []
        bastacolla, ashoka = self.mine_by_name["Bastacolla OCP"].id, self.mine_by_name["Ashoka OCP"].id
        n = self.days
        gap_days = {self.today - timedelta(days=int(n * f)) for f in (0.05, 0.18, 0.33, 0.47, 0.66, 0.85)}
        dust_days = {self.today - timedelta(days=int(n * f)) for f in (0.03, 0.12, 0.29, 0.41, 0.58, 0.77)}
        for mine in self.mines:
            capacity_t = S.MINE_PROFILES[mine.name]["production_capacity_mtpa"] * 1_000_000 / 330
            for day in self.days_in_window():
                produced = capacity_t * self.rng.uniform(0.85, 1.10)
                produced *= 0.8 if day.month in MONSOON else 1.0
                produced *= 0.6 if day.weekday() == 6 else 1.0
                ratio = self.rng.uniform(0.45, 0.55) if (mine.id == bastacolla and day in gap_days) \
                    else self.rng.uniform(0.92, 1.04)
                prod.append(dict(mine_id=mine.id, date=day, produced_t=round(produced, 1),
                                 dispatched_t=round(produced * ratio, 1)))
                pm10 = self.rng.uniform(55, 95) if mine.mine_type == "OC" else self.rng.uniform(35, 65)
                pm10 *= 0.7 if day.month in MONSOON else 1.0
                if mine.id == ashoka and day in dust_days:
                    pm10 = self.rng.uniform(180, 260)
                env.append(dict(mine_id=mine.id, time=self.at(day, 12), pm10=round(pm10, 1),
                                noise=round(self.rng.uniform(68, 84), 1)))
        self.bulk(ProductionLog, prod)
        self.bulk(EnvReading, env)

    def grievances(self) -> None:
        rows, used = [], set()
        moonidih = self.mine_by_name["Moonidih UG"]
        for _ in range(25):
            mine = moonidih if self.rng.random() < 0.3 else self.rng.choice(self.mines)
            category = self.rng.choice(list(S.GRIEVANCES))
            when = self.at(self.start + timedelta(days=self.rng.randint(0, self.days - 1)), self.rng.uniform(8, 20))
            anonymous = category == "harassment" or mine is not moonidih or self.rng.random() < 0.5
            token = "GRV-" + "".join(self.rng.choices(string.ascii_uppercase + string.digits, k=4))
            while token in used:
                token = "GRV-" + "".join(self.rng.choices(string.ascii_uppercase + string.digits, k=4))
            used.add(token)
            age = (self.now - when).days
            status = "closed" if age > 60 else "resolved" if age > 30 else self.rng.choice(["new", "in_progress"])
            rows.append(dict(token=token, mine_id=mine.id, category=category,
                             text=self.rng.choice(S.GRIEVANCES[category]), anonymous=anonymous,
                             user_id=None if anonymous else self.worker_user, status=status,
                             response="Issue checked and resolved by the mine office." if status in ("resolved", "closed") else None,
                             sentiment=self.rng.choice(["negative", "negative", "neutral"]),
                             created_at=when, updated_at=when + timedelta(days=min(age, self.rng.randint(0, 10)))))
        self.bulk(Grievance, rows)

    def notifications(self) -> None:
        rows = []
        overdue = self.db.execute(
            select(Capa.id, Capa.mine_id, Capa.escalation_level, Finding.description)
            .join(Finding, Finding.id == Capa.finding_id)
            .where(Capa.status == "open", Capa.escalation_level > 0).order_by(Capa.due_at.desc()).limit(12)).all()
        area_of = {m.id: m.parent_id for m in self.mines}
        for capa_id, mine_id, level, text_ in overdue:
            mine = next(m for m in self.mines if m.id == mine_id)
            rows.append(dict(user_id=self.person(mine, Role.MINE_MANAGER), title=f"CAPA #{capa_id} is overdue",
                             body=f"{mine.name}: {text_}", level="warning", kind="capa", link=f"/capa/{capa_id}", read=False,
                             created_at=self.now - timedelta(hours=self.rng.randint(1, 48))))
            if level >= 2 and self.people.get((area_of[mine_id], Role.AREA_GM)):
                rows.append(dict(user_id=self.people[(area_of[mine_id], Role.AREA_GM)],
                                 title=f"CAPA #{capa_id} escalated to you", body=f"{mine.name}: {text_}",
                                 level="critical", kind="capa", link=f"/capa/{capa_id}", read=False,
                                 created_at=self.now - timedelta(hours=self.rng.randint(1, 24))))
        self.bulk(Notification, [r for r in rows if r["user_id"]])

    # ------------------------------------------------------------------ run
    def run(self) -> dict[str, int]:
        active = self.rules_and_profiles()
        self.tasks(active)
        self.inspections(self.checklists())
        self.observations()
        self.workforce()
        self.operations()
        self.grievances()
        self.db.flush()
        self.notifications()
        return dict(self.counts)


def has_activity(db: Session) -> bool:
    return (db.scalar(select(func.count()).select_from(Obligation)) or 0) > 0


def reset_activity(db: Session) -> None:
    for model in ACTIVITY_TABLES:
        db.execute(delete(model))


def fix_sequences(db: Session) -> None:
    """Explicit ids were inserted, so move Postgres id counters past them."""
    if db.get_bind().dialect.name != "postgresql":
        return
    for table in Base.metadata.sorted_tables:
        if "id" in table.c:
            db.execute(text(f"SELECT setval(pg_get_serial_sequence('{table.name}', 'id'), "
                            f"COALESCE((SELECT MAX(id) FROM {table.name}), 0) + 1, false)"))


def generate(db: Session, days: int = 180, reset: bool = False, seed: int = 42) -> dict[str, int]:
    if days < 14:
        raise ValueError("Use at least 14 days.")
    bootstrap(db)
    if has_activity(db):
        if not reset:
            raise RuntimeError("Activity data already exists. Run with --reset to replace it.")
        reset_activity(db)
    counts = Generator(db, days, seed).run()
    fix_sequences(db)
    # First link of the tamper-proof history: records that the sample data was created (bulk inserts are
    # not recorded one by one). Every change made through the app after this is chained to it.
    append_entries(db.connection(), [{"table_name": "system", "record_id": 0, "action": "seed", "user_id": None,
                                      "mine_id": None, "data": {"days": days, "seed": seed, "counts": counts}}])
    db.commit()
    return counts


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate sample activity data for Khanan Netra.")
    parser.add_argument("--days", type=int, default=180, help="how many days of history (default 180)")
    parser.add_argument("--reset", action="store_true", help="delete existing activity data first")
    parser.add_argument("--seed", type=int, default=42, help="random seed (same seed = same data)")
    args = parser.parse_args()

    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        try:
            counts = generate(db, days=args.days, reset=args.reset, seed=args.seed)
        except RuntimeError as exc:
            raise SystemExit(str(exc))
    print(f"Generated {args.days} days of sample data (seed {args.seed}):")
    for table, n in sorted(counts.items()):
        print(f"  {table:<18} {n:>7,}")
    print(f"Minimum wage used for checks: Rs {settings.min_daily_wage:.0f}/day (sample value)")


if __name__ == "__main__":
    main()
