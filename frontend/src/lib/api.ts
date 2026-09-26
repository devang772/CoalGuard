/** HTTP client for the CoalGuard API. It never replaces an unavailable response with demo data. */
const API_BASE = (import.meta.env.VITE_API_URL as string) || "http://localhost:8000";
const browserStorage = typeof window === "undefined" ? null : window.localStorage;
let authToken: string | null = browserStorage?.getItem("coalguard_access_token") ?? null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) browserStorage?.setItem("coalguard_access_token", token);
  else browserStorage?.removeItem("coalguard_access_token");
}
export function getAuthToken() { return authToken || browserStorage?.getItem("coalguard_access_token") || null; }
export function getApiBase() { return API_BASE; }

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };
  if (options.body && !(options.body instanceof FormData) && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const detail = body.detail ?? body.message;
    const err: Error & { status?: number } = new Error(typeof detail === "string" ? detail : `API ${response.status}: ${response.statusText}`);
    err.status = response.status;
    throw err;
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export interface HealthResponse { status: string; database: string; }
export interface BackendUser { id: number; name: string; phone: string; role: string; language: string; org_unit_id: number; org_name: string; org_type: string; mine_id: number | null; mine_name: string | null; }
export interface LoginResponse { access_token: string; token_type: string; user: BackendUser; }
export interface Page<T> { items: T[]; total: number; page: number; size?: number; page_size?: number; pages?: number; }
export interface MineProfileData { working_method: "UG" | "OC" | "MIXED"; depth_m?: number; seam_gas_degree?: 1 | 2 | 3 | null; worker_count: number; contract_worker_count: number; production_capacity_mtpa: number; uses_explosives: boolean; has_conveyor: boolean; has_hemm: boolean; has_washery: boolean; near_water_body: boolean; forest_land: boolean; ec_number: string; cto_valid_till: string; state: string; }
export interface ObligationItem { id: number; mine_id: number; status: "active" | "not_applicable" | "inactive"; reason: string; confidence: number; source: string; remark?: string; obligation: { id: number; code: string; title: string; law_ref: string; category: string; frequency: string; severity: string; evidence_needed: string; }; }
export type Row = Record<string, unknown>;

export const checkHealth = () => apiRequest<HealthResponse>("/health");
export async function loginApi(phone: string, password: string) { const result = await apiRequest<LoginResponse>("/auth/login", { method: "POST", body: JSON.stringify({ phone, password }) }); setAuthToken(result.access_token); return result; }
export const getMeApi = () => apiRequest<BackendUser>("/auth/me");
export const updateProfileApi = (data: { name?: string; language?: string }) => apiRequest<BackendUser>("/auth/me", { method: "PATCH", body: JSON.stringify(data) });
export const changePasswordApi = (current_password: string, new_password: string) => apiRequest<Row>("/auth/change-password", { method: "POST", body: JSON.stringify({ current_password, new_password }) });

export const getMinesApi = (orgId?: number) => apiRequest<Row[]>(`/mines${orgId ? `?org_id=${orgId}` : ""}`);
export const getMineDetailApi = (mineId: number) => apiRequest<Row>(`/mines/${mineId}`);
export const getMineProfileApi = (mineId: number) => apiRequest<MineProfileData>(`/mines/${mineId}/profile`);
export const saveMineProfileApi = (mineId: number, data: MineProfileData) => apiRequest<Row>(`/mines/${mineId}/profile`, { method: "PUT", body: JSON.stringify(data) });
export const getMineObligationsApi = (mineId: number, category?: string) => apiRequest<ObligationItem[]>(`/mines/${mineId}/obligations${category ? `?category=${encodeURIComponent(category)}` : ""}`);
export const decideObligationApi = (mineId: number, linkId: number, status: "active" | "not_applicable", remark?: string) => apiRequest<ObligationItem>(`/mines/${mineId}/obligations/${linkId}`, { method: "PATCH", body: JSON.stringify({ status, remark }) });
export const refreshObligationsApi = (mineId: number) => apiRequest<Row>(`/mines/${mineId}/obligations/refresh`, { method: "POST" });
export const getMineCalendarApi = (mineId: number, month: string) => apiRequest<Row[]>(`/mines/${mineId}/calendar?month=${month}`);
export const getMineComplianceApi = (mineId: number, from?: string, to?: string) => apiRequest<Row>(`/mines/${mineId}/compliance${from ? `?from=${from}${to ? `&to=${to}` : ""}` : ""}`);

export const getDashboardSummaryApi = (orgId?: number) => apiRequest<Row>(`/dashboard/summary${orgId ? `?org_id=${orgId}` : ""}`);
export const getMineDashboardApi = (mineId: number, days?: number) => apiRequest<Row>(`/dashboard/mine/${mineId}${days ? `?days=${days}` : ""}`);
export const getLeaderboardApi = (month?: string, by?: "mine" | "subsidiary") => apiRequest<Row>(`/dashboard/leaderboard?${month ? `month=${month}&` : ""}${by ? `by=${by}` : "by=mine"}`);

function buildQs(params?: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  if (params) for (const [k, v] of Object.entries(params)) if (v !== undefined) qs.set(k, String(v));
  return qs.toString();
}

export const getTasksApi = (params?: Record<string, string | number | undefined>) => { const q = buildQs(params); return apiRequest<Page<Row>>(`/tasks${q ? `?${q}` : ""}`); };
export const getTaskSummaryApi = (orgId?: number, mineId?: number) => apiRequest<Row>(`/tasks/summary${orgId ? `?org_id=${orgId}` : ""}${mineId ? `${orgId ? "&" : "?"}mine_id=${mineId}` : ""}`);
export const completeTaskApi = (taskId: number, body: { remarks?: string; evidence_id?: number | null; client_uuid?: string }) => apiRequest<Row>(`/tasks/${taskId}/complete`, { method: "POST", body: JSON.stringify(body) });
export const generateTasksApi = () => apiRequest<Row>("/tasks/generate", { method: "POST" });
export const getObligationCatalogueApi = (q?: string, category?: string) => apiRequest<Row[]>(`/obligations${q || category ? `?${q ? `q=${encodeURIComponent(q)}&` : ""}${category ? `category=${encodeURIComponent(category)}` : ""}` : ""}`);

export const getInspectionsApi = (params?: Record<string, string | number | undefined>) => { const q = buildQs(params); return apiRequest<Page<Row>>(`/inspections${q ? `?${q}` : ""}`); };
export const getInspectionDetailApi = (id: number) => apiRequest<Row>(`/inspections/${id}`);
export const getChecklistsApi = (mineId?: number) => apiRequest<Row[]>(`/checklists${mineId ? `?mine_id=${mineId}` : ""}`);
export const startInspectionApi = (body: { mine_id: number; type: string; checklist_id?: number; lat?: number; lng?: number; client_uuid?: string }) => apiRequest<Row>("/inspections", { method: "POST", body: JSON.stringify(body) });
export const addFindingApi = (inspectionId: number, body: Row) => apiRequest<Row>(`/inspections/${inspectionId}/findings`, { method: "POST", body: JSON.stringify(body) });
export const submitInspectionApi = (inspectionId: number, body: Row) => apiRequest<Row>(`/inspections/${inspectionId}/submit`, { method: "POST", body: JSON.stringify(body) });

export const getCapasApi = (params?: Record<string, string | number | undefined>) => { const q = buildQs(params); return apiRequest<Page<Row>>(`/capa${q ? `?${q}` : ""}`); };
export const getCapaSummaryApi = () => apiRequest<Row>("/capa/summary");
export const getCapaDetailApi = (id: number) => apiRequest<Row>(`/capa/${id}`);
export const assignCapaApi = (id: number, owner_id: number) => apiRequest<Row>(`/capa/${id}/assign`, { method: "POST", body: JSON.stringify({ owner_id }) });
export const requestCapaClosureApi = (id: number, body: { evidence_id?: number | null; note: string }) => apiRequest<Row>(`/capa/${id}/request-closure`, { method: "POST", body: JSON.stringify(body) });
export const approveCapaApi = (entity_id: number, decision: "approve" | "reject", remark?: string) => apiRequest<Row>("/approvals", { method: "POST", body: JSON.stringify({ entity: "capa", entity_id, decision, remark }) });

export interface RiskModelInfo { trained_at: string; training_rows: number; positive_rows: number; history_from: string; history_to: string; holdout_auc: number | null; label: string; train_seconds: number; }
export const getRiskApi = (orgId?: number) => apiRequest<{ generated_at: string; model: RiskModelInfo; results: Row[] }>(`/ai/risk${orgId ? `?org_id=${orgId}` : ""}`);
export const retrainRiskApi = () => apiRequest<{ model: RiskModelInfo }>("/ai/risk/retrain", { method: "POST" });
export const getAnomaliesApi = (orgId?: number, days = 30) => apiRequest<{ generated_at: string; days: number; total: number; anomalies: Row[] }>(`/ai/anomalies?days=${days}${orgId ? `&org_id=${orgId}` : ""}`);
export const getRecurrenceApi = (orgId?: number, days = 60) => apiRequest<{ generated_at: string; days: number; total: number; violations: Row[] }>(`/ai/recurrence?days=${days}${orgId ? `&org_id=${orgId}` : ""}`);
export const askNetraApi = (query: string) => apiRequest<{ answer: string; sources?: unknown[] }>("/ai/ask-netra", { method: "POST", body: JSON.stringify({ query }) });

export const getGisMinesApi = (orgId?: number) => apiRequest<Row>(`/gis/mines${orgId ? `?org_id=${orgId}` : ""}`);
export const getGisPinsApi = (params?: Record<string, string | number | undefined>) => { const q = buildQs(params); return apiRequest<Row[]>(`/gis/pins${q ? `?${q}` : ""}`); };

export async function uploadEvidenceApi(file: File, mineId: number, fields: Record<string, string | number | boolean | undefined> = {}) {
  const body = new FormData();
  body.append("file", file);
  body.append("mine_id", String(mineId));
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== "") body.append(key, String(value));
  }
  return apiRequest<Row>("/evidence", { method: "POST", body, headers: {} });
}
export const getRecentEvidenceApi = () => apiRequest<Row[]>("/evidence/recent");
export const getEvidenceApi = (id: number) => apiRequest<Row>(`/evidence/${id}`);

export const getObservationsApi = (params?: Record<string, string | number | undefined>) => { const q = buildQs(params); return apiRequest<Page<Row>>(`/observations${q ? `?${q}` : ""}`); };
export const createObservationApi = (body: Row) => apiRequest<Row>("/observations", { method: "POST", body: JSON.stringify(body) });
export const acknowledgeObservationApi = (id: number) => apiRequest<Row>(`/observations/${id}/acknowledge`, { method: "POST" });
export const convertObservationApi = (id: number) => apiRequest<Row>(`/observations/${id}/convert`, { method: "POST" });
export const createSosApi = (body: { kind: string; note?: string; lat?: number; lng?: number; accuracy?: number; mine_id?: number }) => apiRequest<Row>("/sos", { method: "POST", body: JSON.stringify(body) });
export const getActiveSosApi = () => apiRequest<Row[]>("/sos/active");

export const getAttendanceApi = (params?: Record<string, string | number | undefined>) => { const q = buildQs(params); return apiRequest<Page<Row>>(`/attendance${q ? `?${q}` : ""}`); };
export const getAttendanceSummaryApi = (params?: Record<string, string | undefined>) => { const qs = new URLSearchParams(); if (params) for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v); const q = qs.toString(); return apiRequest<Row>(`/attendance/summary${q ? `?${q}` : ""}`); };
export const getMyAttendanceApi = (from?: string, to?: string) => apiRequest<Row[]>(`/attendance/me${from ? `?from=${from}${to ? `&to=${to}` : ""}` : ""}`);
export const markAttendanceApi = (body: Row) => apiRequest<Row>("/attendance", { method: "POST", body: JSON.stringify(body) });

export const getContractorsApi = (params?: Record<string, string | number | undefined>) => { const q = buildQs(params); return apiRequest<Row[]>(`/contractors${q ? `?${q}` : ""}`); };
export const getContractorDetailApi = (id: number) => apiRequest<Row>(`/contractors/${id}`);
export const getContractorAlertsApi = (id: number) => apiRequest<Row[]>(`/contractors/${id}/alerts`);
export const getContractorWorkersApi = (id: number, params?: Record<string, string | undefined>) => { const qs = new URLSearchParams(); if (params) for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v); const q = qs.toString(); return apiRequest<Row[]>(`/contractors/${id}/workers${q ? `?${q}` : ""}`); };
export const createContractorApi = (body: Row) => apiRequest<Row>("/contractors", { method: "POST", body: JSON.stringify(body) });
export const updateContractorApi = (id: number, body: Row) => apiRequest<Row>(`/contractors/${id}`, { method: "PATCH", body: JSON.stringify(body) });
export const createWorkerApi = (contractorId: number, body: Row) => apiRequest<Row>(`/contractors/${contractorId}/workers`, { method: "POST", body: JSON.stringify(body) });
export const updateWorkerApi = (workerId: number, body: Row) => apiRequest<Row>(`/workers/${workerId}`, { method: "PATCH", body: JSON.stringify(body) });

export const getGrievancesApi = (params?: Record<string, string | number | undefined>) => { const q = buildQs(params); return apiRequest<Page<Row>>(`/grievances${q ? `?${q}` : ""}`); };
export const getGrievanceDetailApi = (id: number) => apiRequest<Row>(`/grievances/${id}`);
export const submitGrievanceApi = (body: { category: string; text: string; anonymous: boolean; language?: string }) => apiRequest<Row>("/grievances", { method: "POST", body: JSON.stringify(body) });
export const updateGrievanceApi = (id: number, body: { status?: string; response?: string }) => apiRequest<Row>(`/grievances/${id}`, { method: "PATCH", body: JSON.stringify(body) });
export const trackGrievanceApi = (token: string) => apiRequest<Row>(`/grievances/track/${token}`);

export const getNotificationsApi = (params?: Record<string, string | undefined>) => { const qs = new URLSearchParams(); if (params) for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v); const q = qs.toString(); return apiRequest<Page<Row>>(`/notifications${q ? `?${q}` : ""}`); };
export const getUnreadCountApi = () => apiRequest<{ unread: number }>("/notifications/unread-count");
export const markNotificationReadApi = (id: number) => apiRequest<Row>(`/notifications/${id}/read`, { method: "POST" });
export const markAllNotificationsReadApi = () => apiRequest<{ marked_read: number }>("/notifications/read-all", { method: "POST" });

export const getReportsApi = (params?: Record<string, string | number | undefined>) => { const q = buildQs(params); return apiRequest<Page<Row>>(`/reports${q ? `?${q}` : ""}`); };
export const generateReportApi = (month: string, mineId?: number, orgId?: number) => apiRequest<{ reports: Row[]; summary?: Row }>("/reports", { method: "POST", body: JSON.stringify({ month, mine_id: mineId ?? null, org_id: orgId ?? null, formats: ["pdf", "xlsx"] }) });
export const getReportDetailApi = (id: number) => apiRequest<Row>(`/reports/${id}`);
export const verifyReportApi = (file: File) => { const body = new FormData(); body.append("file", file); return apiRequest<{ match: boolean; sha256: string; message: string; report?: Row }>("/reports/verify", { method: "POST", body, headers: {} }); };
export const approveReportApi = (entity_id: number, decision: "approve" | "reject", remark?: string) => apiRequest<Row>("/approvals", { method: "POST", body: JSON.stringify({ entity: "report", entity_id, decision, remark }) });

export const getUsersApi = (params?: Record<string, string | number | undefined>) => { const q = buildQs(params); return apiRequest<Page<Row>>(`/users${q ? `?${q}` : ""}`); };
export const getUserDetailApi = (id: number) => apiRequest<Row>(`/users/${id}`);
export const createUserApi = (body: Row) => apiRequest<Row>("/users", { method: "POST", body: JSON.stringify(body) });
export const updateUserApi = (id: number, body: Row) => apiRequest<Row>(`/users/${id}`, { method: "PATCH", body: JSON.stringify(body) });
export const resetPasswordApi = (id: number) => apiRequest<{ temporary_password?: string }>(`/users/${id}/reset-password`, { method: "POST" });

export const getEscalationConfigApi = () => apiRequest<Row[]>("/config/escalation");
export const saveEscalationConfigApi = (rules: Row[]) => apiRequest<Row[]>("/config/escalation", { method: "PUT", body: JSON.stringify({ rules }) });
export const getJobsStatusApi = () => apiRequest<Row>("/jobs/status");
export const runJobApi = (job: "escalation" | "nightly" | "reminders" | "digest") => apiRequest<Row>(`/jobs/run?job=${job}`, { method: "POST" });

export const getAuditLogsApi = (params?: Record<string, string | number | undefined>) => { const q = buildQs(params); return apiRequest<Page<Row>>(`/audit/recent${q ? `?${q}` : ""}`); };
export const verifyAuditChainApi = () => apiRequest<Row>("/audit/verify");
export const getAuditRecordApi = (table: string, recordId: number) => apiRequest<Row[]>(`/audit/${table}/${recordId}`);

export const getOrgTreeApi = () => apiRequest<Row>("/org/tree");
export const getOrgUnitsApi = (type?: string) => apiRequest<Row[]>(`/org/units${type ? `?type=${type}` : ""}`);
export const searchApi = (q: string) => apiRequest<{ q: string; results: Row[] }>(`/search?q=${encodeURIComponent(q)}`);
