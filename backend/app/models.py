"""All database tables.

Every table is defined here up front (even for features built in later modules) so that
the frontend and ML teammates can rely on the final table and column names.
All timestamps are stored in UTC without timezone info (see app.utils.utcnow).
"""
from datetime import date, datetime

from sqlalchemy import (JSON, Boolean, Date, DateTime, Float, ForeignKey, Integer,
                        String, Text, UniqueConstraint)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.utils import utcnow


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)


# ---------------------------------------------------------------- organisation & people

class OrgUnit(TimestampMixin, Base):
    """One node of the tree CIL -> Subsidiary -> Area -> Mine."""
    __tablename__ = "org_units"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    code: Mapped[str] = mapped_column(String(40), unique=True)
    type: Mapped[str] = mapped_column(String(20), index=True)            # constants.OrgType
    parent_id: Mapped[int | None] = mapped_column(ForeignKey("org_units.id"), index=True)
    mine_type: Mapped[str | None] = mapped_column(String(10))            # "UG" / "OC" for mines
    boundary: Mapped[dict | None] = mapped_column(JSON)                  # GeoJSON Polygon geometry
    center_lat: Mapped[float | None] = mapped_column(Float)
    center_lng: Mapped[float | None] = mapped_column(Float)

    parent: Mapped["OrgUnit | None"] = relationship(remote_side="OrgUnit.id")


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(15), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(100))
    role: Mapped[str] = mapped_column(String(30), index=True)            # constants.Role
    org_unit_id: Mapped[int] = mapped_column(ForeignKey("org_units.id"), index=True)
    language: Mapped[str] = mapped_column(String(5), default="en")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    org_unit: Mapped[OrgUnit] = relationship()


# ---------------------------------------------------------------- rules & compliance tasks

class MineProfile(TimestampMixin, Base):
    """Facts about a mine that decide which laws apply to it.
    The mine manager fills this; the ML engine (or the fallback matcher) reads it."""
    __tablename__ = "mine_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    mine_id: Mapped[int] = mapped_column(ForeignKey("org_units.id"), unique=True)
    working_method: Mapped[str] = mapped_column(String(10))              # UG / OC / MIXED
    depth_m: Mapped[float | None] = mapped_column(Float)
    seam_gas_degree: Mapped[int | None] = mapped_column(Integer)         # 1 / 2 / 3 (UG only)
    worker_count: Mapped[int] = mapped_column(Integer, default=0)
    contract_worker_count: Mapped[int] = mapped_column(Integer, default=0)
    production_capacity_mtpa: Mapped[float | None] = mapped_column(Float)
    uses_explosives: Mapped[bool] = mapped_column(Boolean, default=False)
    has_conveyor: Mapped[bool] = mapped_column(Boolean, default=False)
    has_hemm: Mapped[bool] = mapped_column(Boolean, default=False)        # heavy earth-moving machinery
    has_washery: Mapped[bool] = mapped_column(Boolean, default=False)
    near_water_body: Mapped[bool] = mapped_column(Boolean, default=False)
    forest_land: Mapped[bool] = mapped_column(Boolean, default=False)
    ec_number: Mapped[str | None] = mapped_column(String(60))             # Environmental Clearance
    cto_valid_till: Mapped[date | None] = mapped_column(Date)             # Consent to Operate
    state: Mapped[str | None] = mapped_column(String(40))
    updated_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)


class Obligation(TimestampMixin, Base):
    """One entry of the rule catalogue: a repeatable duty from a law / circular / EC condition.
    Filled by the ML engine (source="ml_engine") or the sample catalogue (source="catalogue")."""
    __tablename__ = "obligations"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str | None] = mapped_column(String(40), unique=True)    # stable id, e.g. SAF-ROOF-D
    source: Mapped[str] = mapped_column(String(15), default="manual")    # ml_engine / catalogue / manual
    applies_when: Mapped[dict | None] = mapped_column(JSON)              # fallback matching condition
    title: Mapped[str] = mapped_column(String(300))
    law_ref: Mapped[str] = mapped_column(String(200), default="Not specified")
    category: Mapped[str] = mapped_column(String(20), index=True)        # constants.Category
    frequency: Mapped[str] = mapped_column(String(20))                   # constants.Frequency
    evidence_needed: Mapped[str] = mapped_column(Text, default="")
    severity: Mapped[str] = mapped_column(String(10), default="medium")  # constants.Severity
    status: Mapped[str] = mapped_column(String(10), default="draft", index=True)  # draft/approved
    source_text: Mapped[str | None] = mapped_column(Text)
    source_document: Mapped[str | None] = mapped_column(String(255))
    created_by_ai: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    approved_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime)


class MineObligation(TimestampMixin, Base):
    """Which obligation applies to which mine, and why."""
    __tablename__ = "mine_obligations"
    __table_args__ = (UniqueConstraint("mine_id", "obligation_id", name="uq_mine_obligation"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    mine_id: Mapped[int] = mapped_column(ForeignKey("org_units.id"), index=True)
    obligation_id: Mapped[int] = mapped_column(ForeignKey("obligations.id"), index=True)
    # active; not_applicable = manager decided it does not apply (kept on re-sync);
    # inactive = no longer recommended for the current profile (system decision)
    status: Mapped[str] = mapped_column(String(15), default="active", index=True)
    reason: Mapped[str] = mapped_column(Text, default="")                # why it applies
    confidence: Mapped[float] = mapped_column(Float, default=1.0)
    source: Mapped[str] = mapped_column(String(15), default="rules_fallback")  # ml_engine / rules_fallback
    remark: Mapped[str | None] = mapped_column(Text)                     # manager's note if marked N/A
    decided_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    decided_at: Mapped[datetime | None] = mapped_column(DateTime)

    obligation: Mapped[Obligation] = relationship()


class ComplianceTask(TimestampMixin, Base):
    __tablename__ = "compliance_tasks"
    __table_args__ = (UniqueConstraint("obligation_id", "mine_id", "due_date", name="uq_task_period"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    obligation_id: Mapped[int] = mapped_column(ForeignKey("obligations.id"), index=True)
    mine_id: Mapped[int] = mapped_column(ForeignKey("org_units.id"), index=True)
    due_date: Mapped[date] = mapped_column(Date, index=True)
    status: Mapped[str] = mapped_column(String(10), default="pending", index=True)  # pending/done/overdue
    escalation_level: Mapped[int] = mapped_column(Integer, default=0)
    last_escalated_at: Mapped[datetime | None] = mapped_column(DateTime)
    evidence_id: Mapped[int | None] = mapped_column(ForeignKey("evidence.id"))
    done_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    done_at: Mapped[datetime | None] = mapped_column(DateTime)
    remarks: Mapped[str | None] = mapped_column(Text)
    client_uuid: Mapped[str | None] = mapped_column(String(64), unique=True)

    obligation: Mapped[Obligation] = relationship()


class Checklist(TimestampMixin, Base):
    """Inspection checklist template used by the mobile app."""
    __tablename__ = "checklists"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150))
    mine_type: Mapped[str | None] = mapped_column(String(10))            # UG / OC / null = both
    items: Mapped[list] = mapped_column(JSON, default=list)              # [{id, text, category}]


# ---------------------------------------------------------------- inspections & CAPA

class Inspection(TimestampMixin, Base):
    __tablename__ = "inspections"

    id: Mapped[int] = mapped_column(primary_key=True)
    mine_id: Mapped[int] = mapped_column(ForeignKey("org_units.id"), index=True)
    inspector_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    type: Mapped[str] = mapped_column(String(20), default="internal")    # internal/dgms/spcb/statutory
    checklist_id: Mapped[int | None] = mapped_column(ForeignKey("checklists.id"))
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(15), default="in_progress")  # in_progress/submitted
    checklist_answers: Mapped[list | None] = mapped_column(JSON)          # [{item_id, answer: ok/not_ok/na}]
    notes: Mapped[str | None] = mapped_column(Text)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime)
    client_uuid: Mapped[str | None] = mapped_column(String(64), unique=True)


class Finding(TimestampMixin, Base):
    __tablename__ = "findings"

    id: Mapped[int] = mapped_column(primary_key=True)
    inspection_id: Mapped[int | None] = mapped_column(ForeignKey("inspections.id"), index=True)
    mine_id: Mapped[int] = mapped_column(ForeignKey("org_units.id"), index=True)
    category: Mapped[str] = mapped_column(String(30), index=True)        # roof, haul_road, conveyor, ...
    description: Mapped[str] = mapped_column(Text)
    severity: Mapped[str] = mapped_column(String(10), index=True)
    law_ref: Mapped[str | None] = mapped_column(String(200))
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)
    photo_evidence_id: Mapped[int | None] = mapped_column(ForeignKey("evidence.id"))
    checklist_item_id: Mapped[str | None] = mapped_column(String(40))
    client_uuid: Mapped[str | None] = mapped_column(String(64), unique=True)


class Capa(TimestampMixin, Base):
    """Corrective And Preventive Action: the fix-it ticket for a finding."""
    __tablename__ = "capas"

    id: Mapped[int] = mapped_column(primary_key=True)
    finding_id: Mapped[int] = mapped_column(ForeignKey("findings.id"), unique=True)
    mine_id: Mapped[int] = mapped_column(ForeignKey("org_units.id"), index=True)
    owner_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), index=True)
    due_at: Mapped[datetime] = mapped_column(DateTime, index=True)
    # open -> in_review (fix submitted) -> closed (approved) or rejected (fix not accepted; must be redone)
    status: Mapped[str] = mapped_column(String(12), default="open", index=True)
    escalation_level: Mapped[int] = mapped_column(Integer, default=0)
    last_escalated_at: Mapped[datetime | None] = mapped_column(DateTime)
    closure_requested_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    closure_requested_at: Mapped[datetime | None] = mapped_column(DateTime)
    closure_note: Mapped[str | None] = mapped_column(Text)
    after_evidence_id: Mapped[int | None] = mapped_column(ForeignKey("evidence.id"))
    closure_checks: Mapped[list | None] = mapped_column(JSON)             # [{name, passed, detail}]
    closure_score: Mapped[float | None] = mapped_column(Float)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime)

    finding: Mapped[Finding] = relationship()


class Approval(TimestampMixin, Base):
    __tablename__ = "approvals"

    id: Mapped[int] = mapped_column(primary_key=True)
    entity: Mapped[str] = mapped_column(String(20), index=True)          # capa / obligation / report
    entity_id: Mapped[int] = mapped_column(Integer, index=True)
    approver_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    decision: Mapped[str] = mapped_column(String(10))                    # approve / reject
    remark: Mapped[str | None] = mapped_column(Text)
    hash: Mapped[str] = mapped_column(String(64))


# ---------------------------------------------------------------- evidence (Satya Proof)

class Evidence(TimestampMixin, Base):
    __tablename__ = "evidence"

    id: Mapped[int] = mapped_column(primary_key=True)
    file_path: Mapped[str] = mapped_column(String(300))
    kind: Mapped[str] = mapped_column(String(10), default="photo")       # photo / audio / document
    sha256: Mapped[str] = mapped_column(String(64), index=True)
    phash: Mapped[str | None] = mapped_column(String(32), index=True)
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)
    accuracy: Mapped[float | None] = mapped_column(Float)
    device_time: Mapped[datetime | None] = mapped_column(DateTime)
    server_time: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    device_id: Mapped[str | None] = mapped_column(String(100))
    is_mocked: Mapped[bool] = mapped_column(Boolean, default=False)
    exif: Mapped[dict | None] = mapped_column(JSON)
    trust_score: Mapped[int | None] = mapped_column(Integer)
    flags: Mapped[list] = mapped_column(JSON, default=list)
    checks: Mapped[list | None] = mapped_column(JSON)                    # [{name, passed, penalty, detail}]
    content_type: Mapped[str | None] = mapped_column(String(50))
    size_bytes: Mapped[int | None] = mapped_column(Integer)
    mine_id: Mapped[int | None] = mapped_column(ForeignKey("org_units.id"), index=True)
    uploaded_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    client_uuid: Mapped[str | None] = mapped_column(String(64), unique=True)


# ---------------------------------------------------------------- field reports

class Observation(TimestampMixin, Base):
    """Unsafe act / unsafe condition / near-miss / incident / SOS."""
    __tablename__ = "observations"

    id: Mapped[int] = mapped_column(primary_key=True)
    mine_id: Mapped[int] = mapped_column(ForeignKey("org_units.id"), index=True)
    reporter_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    type: Mapped[str] = mapped_column(String(20), index=True)
    category: Mapped[str | None] = mapped_column(String(30))
    text: Mapped[str] = mapped_column(Text, default="")
    severity: Mapped[str] = mapped_column(String(10), default="medium")
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)
    location_text: Mapped[str | None] = mapped_column(String(200))
    source: Mapped[str] = mapped_column(String(10), default="app")       # app / voice
    language: Mapped[str] = mapped_column(String(5), default="en")
    transcript: Mapped[str | None] = mapped_column(Text)
    anonymous: Mapped[bool] = mapped_column(Boolean, default=False)
    evidence_id: Mapped[int | None] = mapped_column(ForeignKey("evidence.id"))
    acknowledged_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime)
    client_uuid: Mapped[str | None] = mapped_column(String(64), unique=True)


class Grievance(TimestampMixin, Base):
    __tablename__ = "grievances"

    id: Mapped[int] = mapped_column(primary_key=True)
    token: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    mine_id: Mapped[int] = mapped_column(ForeignKey("org_units.id"), index=True)
    category: Mapped[str] = mapped_column(String(30))
    text: Mapped[str] = mapped_column(Text)
    anonymous: Mapped[bool] = mapped_column(Boolean, default=False)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))   # always null when anonymous
    status: Mapped[str] = mapped_column(String(15), default="new", index=True)  # new/in_progress/resolved/closed
    response: Mapped[str | None] = mapped_column(Text)
    sentiment: Mapped[str | None] = mapped_column(String(10))
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, onupdate=utcnow)
    client_uuid: Mapped[str | None] = mapped_column(String(64), unique=True)


# ---------------------------------------------------------------- contractors & workforce

class Contractor(TimestampMixin, Base):
    __tablename__ = "contractors"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(150))
    licence_no: Mapped[str] = mapped_column(String(60))
    licence_valid_till: Mapped[date | None] = mapped_column(Date)
    insurance_valid_till: Mapped[date | None] = mapped_column(Date)
    pf_code: Mapped[str | None] = mapped_column(String(40))
    esi_code: Mapped[str | None] = mapped_column(String(40))
    mine_id: Mapped[int] = mapped_column(ForeignKey("org_units.id"), index=True)
    admin_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    score: Mapped[float] = mapped_column(Float, default=100.0)


class Worker(TimestampMixin, Base):
    __tablename__ = "workers"

    id: Mapped[int] = mapped_column(primary_key=True)
    contractor_id: Mapped[int | None] = mapped_column(ForeignKey("contractors.id"), index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str | None] = mapped_column(String(15))
    device_id: Mapped[str | None] = mapped_column(String(100), index=True)
    bank_acc_hash: Mapped[str | None] = mapped_column(String(64), index=True)
    training_valid_till: Mapped[date | None] = mapped_column(Date)
    medical_valid_till: Mapped[date | None] = mapped_column(Date)
    daily_wage: Mapped[float | None] = mapped_column(Float)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Attendance(TimestampMixin, Base):
    __tablename__ = "attendance"

    id: Mapped[int] = mapped_column(primary_key=True)
    worker_id: Mapped[int] = mapped_column(ForeignKey("workers.id"), index=True)
    mine_id: Mapped[int] = mapped_column(ForeignKey("org_units.id"), index=True)
    time: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)
    accuracy: Mapped[float | None] = mapped_column(Float)
    selfie_evidence_id: Mapped[int | None] = mapped_column(ForeignKey("evidence.id"))
    device_id: Mapped[str | None] = mapped_column(String(100))
    gate_entry: Mapped[bool] = mapped_column(Boolean, default=False)
    source: Mapped[str] = mapped_column(String(10), default="self")      # self (worker's phone) / gate (kiosk)
    marked_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    valid: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    reason: Mapped[str | None] = mapped_column(String(300))
    client_uuid: Mapped[str | None] = mapped_column(String(64), unique=True)


# ---------------------------------------------------------------- operations data

class ProductionLog(Base):
    __tablename__ = "production_logs"
    __table_args__ = (UniqueConstraint("mine_id", "date", name="uq_production_day"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    mine_id: Mapped[int] = mapped_column(ForeignKey("org_units.id"), index=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    produced_t: Mapped[float] = mapped_column(Float)
    dispatched_t: Mapped[float] = mapped_column(Float)


class EnvReading(Base):
    __tablename__ = "env_readings"

    id: Mapped[int] = mapped_column(primary_key=True)
    mine_id: Mapped[int] = mapped_column(ForeignKey("org_units.id"), index=True)
    time: Mapped[datetime] = mapped_column(DateTime, index=True)
    pm10: Mapped[float | None] = mapped_column(Float)
    noise: Mapped[float | None] = mapped_column(Float)


# ---------------------------------------------------------------- alerts, config, audit

class Notification(TimestampMixin, Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text, default="")
    level: Mapped[str] = mapped_column(String(10), default="info")       # info / warning / critical
    link: Mapped[str | None] = mapped_column(String(200))
    read: Mapped[bool] = mapped_column(Boolean, default=False, index=True)


class EscalationRule(Base):
    """SLA and escalation ladder per severity."""
    __tablename__ = "escalation_rules"

    id: Mapped[int] = mapped_column(primary_key=True)
    severity: Mapped[str] = mapped_column(String(10), unique=True)
    sla_hours: Mapped[int] = mapped_column(Integer)
    levels: Mapped[list] = mapped_column(JSON)                           # ordered roles
    reminder_hours: Mapped[list] = mapped_column(JSON, default=list)     # e.g. [72, 24]


class ReportLog(TimestampMixin, Base):
    __tablename__ = "report_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    mine_id: Mapped[int | None] = mapped_column(ForeignKey("org_units.id"))
    month: Mapped[str] = mapped_column(String(7))                        # YYYY-MM
    format: Mapped[str] = mapped_column(String(5))                       # pdf / xlsx
    file_path: Mapped[str] = mapped_column(String(300))
    hash: Mapped[str] = mapped_column(String(64))
    generated_by: Mapped[int | None] = mapped_column(ForeignKey("users.id"))


class AuditLog(Base):
    """Hash-chained history of every change (filled automatically in Module 5)."""
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    table_name: Mapped[str] = mapped_column(String(40), index=True)
    record_id: Mapped[int] = mapped_column(Integer, index=True)
    action: Mapped[str] = mapped_column(String(10))                      # create / update / delete / seed
    user_id: Mapped[int | None] = mapped_column(Integer)
    mine_id: Mapped[int | None] = mapped_column(Integer, index=True)     # for area-scoped history views
    data: Mapped[str] = mapped_column(Text)                              # canonical JSON text
    prev_hash: Mapped[str] = mapped_column(String(64))
    hash: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
