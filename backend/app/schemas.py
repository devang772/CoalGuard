"""Request and response shapes (what the API accepts and returns)."""
from datetime import date, datetime
from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, Field, model_validator

T = TypeVar("T")


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int


# ---------------------------------------------------------------- shared

class EvidenceBrief(BaseModel):
    id: int
    url: str
    lat: float | None
    lng: float | None
    device_time: datetime | None
    trust_score: int | None
    trust_level: str | None
    flags: list[str]


# ---------------------------------------------------------------- auth

class LoginRequest(BaseModel):
    phone: str = Field(min_length=10, max_length=15, examples=["9000000001"])
    password: str = Field(min_length=1, examples=["demo123"])


class UserOut(BaseModel):
    id: int
    name: str
    phone: str
    role: str
    language: str
    org_unit_id: int
    org_name: str
    org_type: str
    mine_id: int | None = None
    mine_name: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------------------------------------------------------------- org & mines

class OrgNode(BaseModel):
    id: int
    name: str
    code: str
    type: str
    center_lat: float | None = None
    center_lng: float | None = None
    children: list["OrgNode"] = []


class OrgUnitOut(ORMModel):
    id: int
    name: str
    code: str
    type: str
    parent_id: int | None
    mine_type: str | None
    center_lat: float | None
    center_lng: float | None


class RiskOut(BaseModel):
    risk_pct: float
    level: Literal["low", "medium", "high"]
    reasons: list[dict] = []
    source: str


class MineSummary(BaseModel):
    id: int
    name: str
    code: str
    mine_type: str | None
    subsidiary: str
    area: str
    center_lat: float | None
    center_lng: float | None
    manager_name: str | None
    compliance_pct: float | None
    overdue_tasks: int
    open_capas: int
    risk: RiskOut


class MineDetail(MineSummary):
    boundary: dict | None
    subsidiary_id: int
    area_id: int
    profile_filled: bool


# ---------------------------------------------------------------- mine profile

class MineProfileIn(BaseModel):
    working_method: Literal["UG", "OC", "MIXED"]
    depth_m: float | None = Field(default=None, ge=0, le=2000)
    seam_gas_degree: Literal[1, 2, 3] | None = None
    worker_count: int = Field(ge=0, le=100_000)
    contract_worker_count: int = Field(default=0, ge=0, le=100_000)
    production_capacity_mtpa: float | None = Field(default=None, ge=0, le=200)
    uses_explosives: bool = False
    has_conveyor: bool = False
    has_hemm: bool = False
    has_washery: bool = False
    near_water_body: bool = False
    forest_land: bool = False
    ec_number: str | None = Field(default=None, max_length=60)
    cto_valid_till: date | None = None
    state: str | None = Field(default=None, max_length=40)

    @model_validator(mode="after")
    def gas_degree_only_underground(self):
        if self.working_method == "OC" and self.seam_gas_degree is not None:
            raise ValueError("seam_gas_degree applies only to underground (UG) or MIXED mines")
        return self


class MineProfileOut(MineProfileIn, ORMModel):
    mine_id: int
    updated_by: int | None
    updated_at: datetime

    @model_validator(mode="after")
    def gas_degree_only_underground(self):   # stored data is trusted; skip the input check
        return self


class SyncSummary(BaseModel):
    source: Literal["ml_engine", "rules_fallback"]
    added: list[str]
    removed: list[str]
    kept_not_applicable: list[str]
    unchanged: int
    tasks_created: int
    tasks_removed: int
    note: str | None


class ProfileSaveResponse(BaseModel):
    profile: MineProfileOut
    obligations: SyncSummary


# ---------------------------------------------------------------- obligations

class ObligationOut(ORMModel):
    id: int
    code: str | None
    title: str
    law_ref: str
    category: str
    frequency: str
    severity: str
    evidence_needed: str
    source: str
    source_text: str | None = None
    due_rule: dict | None = None      # date-based due date, e.g. {"field": "cto_valid_till", "days_before": 90}


class MineObligationOut(BaseModel):
    id: int
    mine_id: int
    status: Literal["active", "not_applicable", "inactive"]
    reason: str
    confidence: float
    source: str
    remark: str | None
    decided_by: int | None
    decided_at: datetime | None
    obligation: ObligationOut


class MineObligationUpdate(BaseModel):
    status: Literal["active", "not_applicable"]
    remark: str | None = Field(default=None, max_length=1000)

    @model_validator(mode="after")
    def remark_needed(self):
        if self.status == "not_applicable" and not (self.remark and self.remark.strip()):
            raise ValueError("A remark is required when marking an obligation not applicable")
        return self


# ---------------------------------------------------------------- tasks

class TaskObligation(BaseModel):
    id: int
    code: str | None
    title: str
    law_ref: str
    category: str
    frequency: str
    severity: str
    evidence_needed: str


class TaskOut(BaseModel):
    id: int
    mine_id: int
    mine_name: str
    due_date: date
    status: Literal["pending", "done", "overdue"]
    escalation_level: int
    days_overdue: int
    done_by: int | None
    done_by_name: str | None
    done_at: datetime | None
    remarks: str | None
    evidence_id: int | None
    evidence: EvidenceBrief | None = None            # signed image link + trust score of the proof photo
    obligation: TaskObligation


class TaskComplete(BaseModel):
    remarks: str | None = Field(default=None, max_length=2000)
    evidence_id: int | None = None
    client_uuid: str | None = Field(default=None, max_length=64)


class TaskSummary(BaseModel):
    due_today: int
    due_this_week: int
    overdue: int
    done_today: int
    pending: int


class GenerateResult(BaseModel):
    created: int
    marked_overdue: int


class CalendarDay(BaseModel):
    date: date
    done: int
    pending: int
    overdue: int


class ComplianceOut(BaseModel):
    from_date: date
    to_date: date
    due: int
    done_on_time: int
    done_late: int
    overdue: int
    compliance_pct: float | None
    by_category: list[dict]


# ---------------------------------------------------------------- checklists & inspections

FINDING_CATEGORIES = Literal["roof", "haul_road", "conveyor", "electrical", "fire", "water", "dust", "ppe",
                             "machinery", "explosives", "other"]
SeverityLiteral = Literal["low", "medium", "high", "critical"]


class ChecklistOut(ORMModel):
    id: int
    name: str
    mine_type: str | None
    items: list[dict]


class ChecklistAnswer(BaseModel):
    item_id: str = Field(max_length=40)
    answer: Literal["ok", "not_ok", "na"]


class InspectionCreate(BaseModel):
    mine_id: int
    type: Literal["internal", "statutory", "dgms", "spcb"] = "internal"
    checklist_id: int | None = None
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)
    client_uuid: str | None = Field(default=None, max_length=64)


class InspectionSubmit(BaseModel):
    checklist_answers: list[ChecklistAnswer] = []
    notes: str | None = Field(default=None, max_length=4000)


class FindingCreate(BaseModel):
    category: FINDING_CATEGORIES
    description: str = Field(min_length=3, max_length=2000)
    severity: SeverityLiteral
    law_ref: str | None = Field(default=None, max_length=200)
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)
    photo_evidence_id: int | None = None
    checklist_item_id: str | None = Field(default=None, max_length=40)
    client_uuid: str | None = Field(default=None, max_length=64)


class FindingOut(ORMModel):
    id: int
    inspection_id: int | None
    mine_id: int
    category: str
    description: str
    severity: str
    law_ref: str | None
    lat: float | None
    lng: float | None
    photo_evidence_id: int | None
    photo: EvidenceBrief | None = None                # signed image link + trust score
    checklist_item_id: str | None
    created_at: datetime
    capa_id: int | None = None
    capa_status: str | None = None
    capa_due_at: datetime | None = None


class InspectionOut(BaseModel):
    id: int
    mine_id: int
    mine_name: str
    inspector_id: int
    inspector_name: str
    type: str
    status: Literal["in_progress", "submitted"]
    checklist_id: int | None
    lat: float | None
    lng: float | None
    started_at: datetime
    submitted_at: datetime | None
    findings_count: int
    critical_count: int


class InspectionDetail(InspectionOut):
    checklist_answers: list[dict] | None
    notes: str | None
    findings: list[FindingOut]


# ---------------------------------------------------------------- CAPA & approvals

class PersonOut(BaseModel):
    id: int
    name: str
    role: str


class CapaOut(BaseModel):
    id: int
    mine_id: int
    mine_name: str
    status: Literal["open", "in_review", "closed", "rejected"]
    owner: PersonOut | None
    due_at: datetime
    overdue: bool
    hours_left: float
    escalation_level: int
    finding: FindingOut
    closure_requested_by: PersonOut | None
    closure_requested_at: datetime | None
    closure_note: str | None
    after_evidence_id: int | None
    closure_checks: list[dict] | None
    closure_score: float | None
    closed_at: datetime | None
    created_at: datetime


class ApprovalOut(ORMModel):
    id: int
    entity: str
    entity_id: int
    approver_id: int
    approver_name: str | None = None
    decision: Literal["approve", "reject"]
    remark: str | None
    hash: str
    created_at: datetime


class CapaDetail(CapaOut):
    approvals: list[ApprovalOut]
    approvals_verified: bool
    before_photo: EvidenceBrief | None = None
    after_photo: EvidenceBrief | None = None
    escalation_history: list[dict] = []


class CapaSummary(BaseModel):
    by_status: dict[str, int]
    overdue: int
    open_by_severity: dict[str, int]
    open_ageing: dict[str, int]


class CapaAssign(BaseModel):
    owner_id: int


class CapaCloseRequest(BaseModel):
    evidence_id: int | None = None
    note: str | None = Field(default=None, max_length=2000)


class ApprovalCreate(BaseModel):
    entity: Literal["capa", "report"]
    entity_id: int
    decision: Literal["approve", "reject"]
    remark: str | None = Field(default=None, max_length=2000)

    @model_validator(mode="after")
    def remark_needed_for_reject(self):
        if self.decision == "reject" and not (self.remark and self.remark.strip()):
            raise ValueError("A remark is required when rejecting")
        return self


# ---------------------------------------------------------------- contractors, workers, attendance

Validity = Literal["valid", "expiring", "expired", "unknown"]


class FraudAlert(BaseModel):
    id: str
    contractor_id: int
    type: str
    severity: Literal["low", "medium", "high"]
    title: str
    description: str
    worker_ids: list[int]
    count: int


class ContractorOut(BaseModel):
    id: int
    name: str
    licence_no: str
    licence_valid_till: date | None
    licence_status: Validity
    insurance_valid_till: date | None
    insurance_status: Validity
    pf_code: str | None
    esi_code: str | None
    mine_id: int
    mine_name: str
    admin_user_id: int | None
    workers_count: int
    alerts_count: int
    high_alerts: int
    score: float


class ContractorDetail(ContractorOut):
    stats: dict
    alerts: list[FraudAlert]


class ContractorIn(BaseModel):
    name: str = Field(min_length=2, max_length=150)
    licence_no: str = Field(min_length=2, max_length=60)
    licence_valid_till: date | None = None
    insurance_valid_till: date | None = None
    pf_code: str | None = Field(default=None, max_length=40)
    esi_code: str | None = Field(default=None, max_length=40)
    mine_id: int
    admin_user_id: int | None = None


class ContractorUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=150)
    licence_no: str | None = Field(default=None, min_length=2, max_length=60)
    licence_valid_till: date | None = None
    insurance_valid_till: date | None = None
    pf_code: str | None = Field(default=None, max_length=40)
    esi_code: str | None = Field(default=None, max_length=40)
    admin_user_id: int | None = None


class WorkerOut(BaseModel):
    id: int
    contractor_id: int | None
    contractor_name: str | None
    user_id: int | None
    name: str
    phone: str | None
    device_id: str | None
    bank_account_on_file: bool
    training_valid_till: date | None
    training_status: Validity
    medical_valid_till: date | None
    medical_status: Validity
    daily_wage: float | None
    below_min_wage: bool
    is_active: bool
    attendance_days_30d: int
    flags: list[str]


class WorkerIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    phone: str | None = Field(default=None, max_length=15)
    device_id: str | None = Field(default=None, max_length=100)
    bank_account: str | None = Field(default=None, min_length=6, max_length=34,
                                     description="stored only as a keyed fingerprint, never as the number")
    training_valid_till: date | None = None
    medical_valid_till: date | None = None
    daily_wage: float | None = Field(default=None, ge=0, le=100_000)


class WorkerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    phone: str | None = Field(default=None, max_length=15)
    device_id: str | None = Field(default=None, max_length=100)
    bank_account: str | None = Field(default=None, min_length=6, max_length=34)
    training_valid_till: date | None = None
    medical_valid_till: date | None = None
    daily_wage: float | None = Field(default=None, ge=0, le=100_000)
    is_active: bool | None = None


class AttendanceMark(BaseModel):
    worker_id: int | None = Field(default=None, description="gate mode: the worker being marked; self mode: omit")
    mode: Literal["self", "gate"] = "self"
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)
    accuracy: float | None = None
    selfie_evidence_id: int | None = None
    device_id: str | None = Field(default=None, max_length=100)
    is_mocked: bool = False
    client_uuid: str | None = Field(default=None, max_length=64)


class AttendanceOut(BaseModel):
    id: int
    worker_id: int
    worker_name: str
    contractor_id: int | None
    contractor_name: str | None
    mine_id: int
    mine_name: str
    time: datetime
    lat: float | None
    lng: float | None
    valid: bool
    reason: str | None
    gate_entry: bool
    source: str
    selfie_evidence_id: int | None
    selfie: EvidenceBrief | None = None


class AttendanceResult(AttendanceOut):
    checks: list[dict]
    message: str


# ---------------------------------------------------------------- field reports, SOS, grievances, notifications

ObservationType = Literal["unsafe_act", "unsafe_condition", "near_miss", "incident"]


class ObservationCreate(BaseModel):
    mine_id: int | None = Field(default=None, description="default: the user's own mine")
    type: ObservationType
    category: FINDING_CATEGORIES = "other"
    text: str = Field(min_length=3, max_length=2000)
    severity: SeverityLiteral = "medium"
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)
    location_text: str | None = Field(default=None, max_length=200, examples=["Seam 3, Level 2"])
    evidence_id: int | None = None
    source: Literal["app", "voice"] = "app"
    language: str = Field(default="en", max_length=5)
    transcript: str | None = Field(default=None, max_length=4000)
    anonymous: bool = False
    client_uuid: str | None = Field(default=None, max_length=64)


class ObservationOut(BaseModel):
    id: int
    mine_id: int
    mine_name: str
    type: str
    category: str | None
    text: str
    severity: str
    lat: float | None
    lng: float | None
    location_text: str | None
    source: str
    language: str
    transcript: str | None
    anonymous: bool
    reporter_id: int | None
    reporter_name: str | None
    evidence: EvidenceBrief | None
    finding_id: int | None
    capa_id: int | None
    capa_status: str | None
    acknowledged_by: int | None
    acknowledged_by_name: str | None
    acknowledged_at: datetime | None
    response_minutes: float | None
    created_at: datetime


class SosCreate(BaseModel):
    mine_id: int | None = Field(default=None, description="default: the user's own mine")
    kind: Literal["fire", "roof_fall", "gas", "injury", "flooding", "other"] = "other"
    note: str | None = Field(default=None, max_length=500)
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)
    accuracy: float | None = None
    client_uuid: str | None = Field(default=None, max_length=64)


class SosResult(ObservationOut):
    notified: int


GrievanceCategory = Literal["wages", "safety", "harassment", "facilities", "leave", "other"]
GrievanceStatus = Literal["new", "in_progress", "resolved", "closed"]


class GrievanceCreate(BaseModel):
    mine_id: int | None = Field(default=None, description="default: the user's own mine")
    category: GrievanceCategory
    text: str = Field(min_length=5, max_length=4000)
    anonymous: bool = True
    language: str = Field(default="en", max_length=5)
    client_uuid: str | None = Field(default=None, max_length=64)


class GrievanceReceipt(BaseModel):
    id: int
    token: str
    status: GrievanceStatus
    anonymous: bool
    message: str


class GrievanceTrack(BaseModel):
    token: str
    category: str
    status: GrievanceStatus
    response: str | None
    responded_at: datetime | None
    created_at: datetime
    updated_at: datetime


class GrievanceOut(BaseModel):
    id: int
    token: str
    mine_id: int
    mine_name: str
    category: str
    text: str
    anonymous: bool
    reporter_name: str | None
    status: GrievanceStatus
    response: str | None
    responded_by_name: str | None
    responded_at: datetime | None
    language: str
    created_at: datetime
    updated_at: datetime


class GrievanceUpdate(BaseModel):
    status: GrievanceStatus | None = None
    response: str | None = Field(default=None, max_length=4000)

    @model_validator(mode="after")
    def something_to_change(self):
        if self.status is None and not (self.response and self.response.strip()):
            raise ValueError("Send a new status and/or a response")
        return self


class NotificationOut(ORMModel):
    id: int
    title: str
    body: str
    level: Literal["info", "warning", "critical"]
    kind: str
    link: str | None
    read: bool
    created_at: datetime


class NotificationPage(Page[NotificationOut]):
    unread: int
