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
