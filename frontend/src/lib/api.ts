/**
 * CoalGuard Backend API Client
 * Connects the web frontend to the FastAPI backend service (default: http://localhost:8000)
 */

const API_BASE = (import.meta.env.VITE_API_URL as string) || "http://localhost:8000";

let authToken: string | null = localStorage.getItem("coalguard_access_token");

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    localStorage.setItem("coalguard_access_token", token);
  } else {
    localStorage.removeItem("coalguard_access_token");
  }
}

export function getAuthToken(): string | null {
  return authToken || localStorage.getItem("coalguard_access_token");
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.detail || `HTTP Error ${response.status}: ${response.statusText}`;
    throw new Error(message);
  }

  return response.json();
}

// ---------------------------------------------------------------- Auth & Health

export interface HealthResponse {
  status: string;
  database: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: {
    id: number;
    name: string;
    phone: string;
    role: string;
    language: string;
    org_unit_id: number;
    org_name: string;
    org_type: string;
    mine_id: number | null;
    mine_name: string | null;
  };
}

export async function checkHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/health");
}

export async function loginApi(phone: string, password: string): Promise<LoginResponse> {
  const res = await request<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ phone, password }),
  });
  if (res.access_token) {
    setAuthToken(res.access_token);
  }
  return res;
}

export async function getMeApi() {
  return request<any>("/auth/me");
}

// ---------------------------------------------------------------- Mines & Profile

export interface MineProfileData {
  working_method: "UG" | "OC" | "MIXED";
  depth_m?: number;
  seam_gas_degree?: 1 | 2 | 3;
  worker_count: number;
  contract_worker_count: number;
  production_capacity_mtpa: number;
  uses_explosives: boolean;
  has_conveyor: boolean;
  has_hemm: boolean;
  has_washery: boolean;
  near_water_body: boolean;
  forest_land: boolean;
  ec_number: string;
  cto_valid_till: string;
  state: string;
}

export interface ObligationItem {
  id: number;
  mine_id: number;
  status: "active" | "not_applicable" | "inactive";
  reason: string;
  confidence: number;
  source: string;
  remark?: string;
  obligation: {
    id: number;
    code: string;
    title: string;
    law_ref: string;
    category: string;
    frequency: string;
    severity: string;
    evidence_needed: string;
  };
}

export async function getMinesApi(orgId?: number) {
  const query = orgId ? `?org_id=${orgId}` : "";
  return request<any[]>(`/mines${query}`);
}

export async function getMineDetailApi(mineId: number) {
  return request<any>(`/mines/${mineId}`);
}

export async function getMineProfileApi(mineId: number): Promise<MineProfileData> {
  return request<MineProfileData>(`/mines/${mineId}/profile`);
}

export async function saveMineProfileApi(mineId: number, data: MineProfileData) {
  return request<any>(`/mines/${mineId}/profile`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function getMineObligationsApi(mineId: number, category?: string) {
  const query = category ? `?category=${category}` : "";
  return request<ObligationItem[]>(`/mines/${mineId}/obligations${query}`);
}

export async function decideObligationApi(
  mineId: number,
  linkId: number,
  status: "active" | "not_applicable",
  remark?: string
) {
  return request<ObligationItem>(`/mines/${mineId}/obligations/${linkId}`, {
    method: "PATCH",
    body: JSON.stringify({ status, remark }),
  });
}

// ---------------------------------------------------------------- Inspections & CAPA

export async function getInspectionsApi(mineId?: number) {
  const query = mineId ? `?mine_id=${mineId}` : "";
  return request<any[]>(`/inspections${query}`);
}

export async function getCapasApi(status?: string) {
  const query = status ? `?status=${status}` : "";
  return request<any[]>(`/capa${query}`);
}

// ---------------------------------------------------------------- Attendance & Workforce

export async function getAttendanceApi(date?: string) {
  const query = date ? `?date=${date}` : "";
  return request<any[]>(`/attendance${query}`);
}

export async function getContractorsApi() {
  return request<any[]>("/contractors");
}

// ---------------------------------------------------------------- Grievances & Audit

export async function getGrievancesApi() {
  return request<any[]>("/grievances");
}

export async function getAuditLogsApi() {
  return request<any[]>("/audit");
}

export async function getDashboardSummaryApi(orgId?: number) {
  const query = orgId ? `?org_id=${orgId}` : "";
  return request<any>(`/dashboard/summary${query}`);
}
