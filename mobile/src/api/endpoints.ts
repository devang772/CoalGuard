import { Platform } from 'react-native';
import {
  TaskItem,
  TaskSummary,
  CAPAItem,
  ClosureCheck,
  VoiceReportResult,
  User,
  AttendanceRecord,
  GrievanceItem,
  NotificationItem,
  EvidenceInfo,
  MyReportItem,
  MapPin,
  InspectionDetail,
  SubmitResult,
} from './types';
import { apiFetch, ApiError, fileUrl, isNetworkError } from './client';
import { enqueueOutboxItem, OutboxEvidence, OutboxItem } from '../offline/outbox';
import { useSettingsStore, CaptureMeta } from '../store/settings';
import { useSyncStore } from '../store/sync';
import { getActiveMineId } from '../store/master';
import { getAppDeviceInfo } from '../lib/deviceInfo';

// ---------------------------------------------------------------- helpers

export function newClientUuid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function toUser(u: any): User {
  return {
    id: String(u.id),
    name: u.name,
    phone: u.phone,
    role: u.role,
    org_unit_id: String(u.org_unit_id),
    org_name: u.org_name ?? null,
    org_type: u.org_type ?? null,
    mine_id: u.mine_id != null ? String(u.mine_id) : null,
    mine_name: u.mine_name ?? null,
    language: u.language || 'hi',
  };
}

function toEvidence(e: any): EvidenceInfo | null {
  if (!e) return null;
  return {
    id: e.id,
    url: fileUrl(e.url),
    lat: e.lat ?? null,
    lng: e.lng ?? null,
    trust_score: e.trust_score ?? null,
    trust_level: e.trust_level ?? null,
    flags: e.flags || [],
  };
}

function escalationLabel(level: number): 'L0' | 'L1' | 'L2' | 'L3' {
  return (['L0', 'L1', 'L2', 'L3'][Math.max(0, Math.min(3, level || 0))] as any);
}

function requireMineId(): number {
  const mineId = getActiveMineId();
  if (!mineId) throw new ApiError('No mine is linked to your account.', 400);
  return mineId;
}

export function isForcedOffline(): boolean {
  return useSettingsStore.getState().forceOffline || !useSyncStore.getState().isOnline;
}

// ---------------------------------------------------------------- auth

export async function checkHealthApi(): Promise<{ status: string; database: string }> {
  return await apiFetch<{ status: string; database: string }>('/health', { timeoutMs: 4000, token: null });
}

export async function loginApi(phone: string, password: string): Promise<{ access_token: string; user: User }> {
  const res = await apiFetch<{ access_token: string; token_type: string; user: any }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone: phone.trim(), password }),
    token: null,
  });
  return { access_token: res.access_token, user: toUser(res.user) };
}

export async function fetchMeApi(token?: string): Promise<User> {
  const res = await apiFetch<any>('/auth/me', token !== undefined ? { token } : {});
  return toUser(res);
}

// ---------------------------------------------------------------- evidence (Satya Proof)

export interface EvidenceUpload {
  uri: string;
  mineId: number;
  meta: CaptureMeta | null;
  clientUuid?: string;
}

/** Uploads a photo or audio recording taken in the app. Throws on failure (network errors are handled by the callers). */
export async function uploadEvidenceApi({ uri, mineId, meta, clientUuid }: EvidenceUpload): Promise<EvidenceInfo> {
  const formData = new FormData();

  const isAudio = uri.includes('audio') || uri.endsWith('.webm') || uri.endsWith('.m4a') || uri.endsWith('.wav') || uri.endsWith('.aac') || uri.endsWith('.mp3');

  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    formData.append('file', blob, isAudio ? 'voice.m4a' : 'photo.jpg');
  } else {
    formData.append('file', { uri, name: isAudio ? 'voice.m4a' : 'photo.jpg', type: isAudio ? 'audio/m4a' : 'image/jpeg' } as any);
  }

  const device = await getAppDeviceInfo();
  formData.append('mine_id', String(mineId));
  if (meta?.lat != null && meta?.lng != null) {
    formData.append('lat', String(meta.lat));
    formData.append('lng', String(meta.lng));
  }
  if (meta?.accuracy != null) formData.append('accuracy', String(meta.accuracy));
  if (meta?.deviceTime) formData.append('device_time', meta.deviceTime);
  formData.append('device_id', device.deviceId);
  formData.append('is_mocked', String(Boolean(meta?.isMocked)));
  if (clientUuid) formData.append('client_uuid', clientUuid);

  const res = await apiFetch<any>('/evidence', { method: 'POST', body: formData, timeoutMs: 60000 });
  return toEvidence(res)!;
}

/**
 * Sends a write to the backend. When the phone is offline (or "force offline" is on) the exact same body is
 * put in the outbox and sent later through POST /sync/bulk. Server-side refusals (4xx) are thrown as errors.
 */
async function submitOrQueue<T>(opts: {
  kind: OutboxItem['kind'];
  clientUuid: string;
  body: Record<string, any>;
  evidence?: OutboxEvidence | null;
  priority?: number;
  send: (body: Record<string, any>) => Promise<T>;
}): Promise<SubmitResult<T>> {
  const { kind, clientUuid, body, evidence, priority = 1, send } = opts;
  const queue = (): SubmitResult<T> => {
    enqueueOutboxItem({
      client_uuid: clientUuid,
      kind,
      payload: { ...body, ...(evidence ? { _evidence: evidence } : {}) },
      file_uris: evidence ? [evidence.uri] : [],
      priority,
    });
    return { queued: true };
  };

  if (isForcedOffline()) return queue();

  try {
    let finalBody = body;
    let uploaded: EvidenceInfo | null = null;
    if (evidence) {
      uploaded = await uploadEvidenceApi({
        uri: evidence.uri,
        mineId: evidence.mine_id,
        meta: evidence.meta,
        clientUuid: `${clientUuid}-photo`,
      });
      finalBody = { ...body, [evidence.field]: uploaded.id };
    }
    const data = await send(finalBody);
    return { queued: false, data, evidence: uploaded };
  } catch (err) {
    if (isNetworkError(err)) return queue();
    throw err;
  }
}

function photoEvidence(field: string, uri: string | null | undefined, meta: CaptureMeta | null | undefined, mineId: number): OutboxEvidence | null {
  if (!uri) return null;
  return { field, uri, meta: meta || null, mine_id: mineId };
}

// ---------------------------------------------------------------- compliance tasks

function toTask(t: any): TaskItem {
  const evidence = toEvidence(t.evidence);
  return {
    id: String(t.id),
    mine_name: t.mine_name,
    obligation: {
      id: String(t.obligation.id),
      title: t.obligation.title,
      law_ref: t.obligation.law_ref,
      category: t.obligation.category,
      evidence_needed: t.obligation.evidence_needed || 'photo',
    },
    due_date: t.due_date,
    status: t.status,
    escalation_level: escalationLabel(t.escalation_level),
    completed_at: t.done_at || undefined,
    done_by_name: t.done_by_name || undefined,
    evidence_id: t.evidence_id ? String(t.evidence_id) : undefined,
    evidence,
    remarks: t.remarks || undefined,
    trust_score: evidence?.trust_score ?? undefined,
    trust_flags: evidence?.flags,
  };
}

export type TaskSegment = 'today' | 'week' | 'overdue' | 'done';

export async function fetchTasksApi(segment: TaskSegment, q?: string): Promise<TaskItem[]> {
  const params = new URLSearchParams({ page_size: '200' });
  if (segment === 'done') params.set('status', 'done');
  else params.set('due', segment);
  if (q && q.trim().length > 0) params.set('q', q.trim());
  const res = await apiFetch<{ items: any[] }>(`/tasks?${params.toString()}`);
  const items = (res.items || []).map(toTask);
  // "Today" / "week" tabs are the work still to do.
  return segment === 'today' || segment === 'week' ? items.filter((t) => t.status !== 'done') : items;
}

export async function fetchTaskApi(taskId: string): Promise<TaskItem> {
  return toTask(await apiFetch<any>(`/tasks/${encodeURIComponent(taskId)}`));
}

export async function fetchTaskSummaryApi(): Promise<TaskSummary> {
  return await apiFetch<TaskSummary>('/tasks/summary');
}

export async function completeTaskApi(
  taskId: string,
  photoUri: string | null,
  meta: CaptureMeta | null,
  remarks: string
): Promise<SubmitResult<TaskItem>> {
  const clientUuid = newClientUuid('task');
  const mineId = requireMineId();
  return submitOrQueue({
    kind: 'task_complete',
    clientUuid,
    body: { task_id: Number(taskId), remarks: remarks || null, client_uuid: clientUuid },
    evidence: photoEvidence('evidence_id', photoUri, meta, mineId),
    send: async (body) => {
      const { task_id, ...rest } = body;
      return toTask(await apiFetch<any>(`/tasks/${task_id}/complete`, { method: 'POST', body: JSON.stringify(rest) }));
    },
  });
}

// ---------------------------------------------------------------- CAPA

function toCapa(c: any): CAPAItem {
  const before = toEvidence(c.before_photo) || toEvidence(c.finding?.photo);
  const after = toEvidence(c.after_photo);
  const level = c.escalation_level || 0;
  return {
    id: String(c.id),
    mine_name: c.mine_name,
    owner_name: c.owner?.name,
    finding: {
      description: c.finding?.description || '',
      category: c.finding?.category || 'other',
      severity: c.finding?.severity || 'medium',
      law_ref: c.finding?.law_ref ?? null,
      lat: c.finding?.lat ?? null,
      lng: c.finding?.lng ?? null,
    },
    before_photo: {
      url: before?.url || '',
      lat: before?.lat ?? c.finding?.lat ?? null,
      lng: before?.lng ?? c.finding?.lng ?? null,
    },
    after_photo: after ? { url: after.url || '', lat: after.lat, lng: after.lng } : undefined,
    due_at: c.due_at,
    status: c.status,
    escalation_level: level === 0 ? 'Assigned' : (escalationLabel(level) as any),
    escalation_step: level,
    overdue: Boolean(c.overdue),
    closure_checks: c.closure_checks || null,
    trust_score: before?.trust_score ?? undefined,
    trust_flags: before?.flags,
  };
}

export async function fetchCapasApi(status: CAPAItem['status']): Promise<CAPAItem[]> {
  const res = await apiFetch<{ items: any[] }>(`/capa?status=${status}&page_size=200`);
  return (res.items || []).map(toCapa);
}

export async function fetchCapaApi(capaId: string): Promise<CAPAItem> {
  return toCapa(await apiFetch<any>(`/capa/${encodeURIComponent(capaId)}`));
}

export async function closeCapaApi(
  capaId: string,
  afterPhotoUri: string,
  meta: CaptureMeta | null
): Promise<SubmitResult<{ passed: boolean; status: string; checks: ClosureCheck[] }>> {
  const clientUuid = newClientUuid('capa-close');
  const mineId = requireMineId();
  return submitOrQueue({
    kind: 'capa_close',
    clientUuid,
    body: { capa_id: Number(capaId), note: 'Rectification completed on ground.' },
    evidence: photoEvidence('evidence_id', afterPhotoUri, meta, mineId),
    send: async (body) => {
      const { capa_id, ...rest } = body;
      const res = await apiFetch<any>(`/capa/${capa_id}/request-closure`, {
        method: 'POST',
        body: JSON.stringify(rest),
      });
      return {
        passed: res.status === 'in_review' || res.status === 'closed',
        status: res.status,
        checks: res.closure_checks || [],
      };
    },
  });
}

// ---------------------------------------------------------------- voice report

/**
 * Sends the recorded audio to the AI voice endpoint (POST /ai/voice). Returns null when the backend has no
 * speech model yet, so the screen lets the user type the report instead.
 */
export async function processVoiceAiApi(audioUri: string, language: string): Promise<VoiceReportResult | null> {
  if (isForcedOffline()) {
    return null;
  }
  const formData = new FormData();
  if (Platform.OS === 'web') {
    const blob = await (await fetch(audioUri)).blob();
    formData.append('audio', blob, 'voice.webm');
  } else {
    formData.append('audio', { uri: audioUri, name: 'voice.m4a', type: 'audio/m4a' } as any);
  }
  formData.append('language', language);

  try {
    const res = await apiFetch<any>('/ai/voice', { method: 'POST', body: formData, timeoutMs: 60000 });
    const s = res.structured || res;
    return {
      transcript: res.transcript || '',
      structured: {
        type: s.type || 'unsafe_condition',
        category: s.category || 'other',
        hazard: s.hazard || s.text || '',
        location_text: s.location_text || '',
        severity: s.severity || 'medium',
      },
    };
  } catch (err) {
    if (isNetworkError(err) || (err instanceof ApiError && (err.status === 404 || err.status === 405 || err.status === 501 || err.status === 503))) {
      return null;
    }
    throw err;
  }
}

// ---------------------------------------------------------------- attendance

export async function markAttendanceApi(opts: {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  isMocked: boolean;
  selfieUri: string;
  selfieMeta: CaptureMeta | null;
  workerId?: number | null;
}): Promise<SubmitResult<{ valid: boolean; reason: string; time: string }>> {
  const clientUuid = newClientUuid('attendance');
  const mineId = requireMineId();
  const device = await getAppDeviceInfo();
  const gate = opts.workerId != null;
  return submitOrQueue({
    kind: 'attendance',
    clientUuid,
    body: {
      mode: gate ? 'gate' : 'self',
      worker_id: gate ? opts.workerId : undefined,
      lat: opts.lat,
      lng: opts.lng,
      accuracy: opts.accuracy,
      is_mocked: opts.isMocked,
      device_id: device.deviceId,
      client_uuid: clientUuid,
    },
    evidence: photoEvidence('selfie_evidence_id', opts.selfieUri, opts.selfieMeta, mineId),
    send: async (body) => {
      const res = await apiFetch<any>('/attendance', { method: 'POST', body: JSON.stringify(body) });
      return { valid: Boolean(res.valid), reason: res.message || res.reason || '', time: res.time };
    },
  });
}

function toAttendance(r: any): AttendanceRecord {
  const at = r.time ? new Date(r.time) : null;
  return {
    id: String(r.id),
    worker_id: String(r.worker_id),
    worker_name: r.worker_name,
    mine_name: r.mine_name,
    date: at ? at.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }) : '',
    time: at ? at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
    valid: Boolean(r.valid),
    reason: r.reason || undefined,
    selfie_url: fileUrl(r.selfie?.url),
    lat: r.lat ?? null,
    lng: r.lng ?? null,
  };
}

/** Workers see their own attendance; supervisors / contractor admins see the attendance they can monitor. */
export async function fetchAttendanceHistoryApi(role?: string): Promise<AttendanceRecord[]> {
  if (role === 'worker') {
    const res = await apiFetch<any[]>('/attendance/me');
    return (res || []).map(toAttendance);
  }
  const res = await apiFetch<{ items: any[] }>('/attendance?page_size=100');
  return (res.items || []).map(toAttendance);
}

// ---------------------------------------------------------------- grievances

export async function submitGrievanceApi(
  category: string,
  text: string,
  anonymous: boolean,
  language: string
): Promise<SubmitResult<{ token: string; status: string }>> {
  const clientUuid = newClientUuid('grievance');
  return submitOrQueue({
    kind: 'grievance',
    clientUuid,
    body: { category, text, anonymous, language, mine_id: getActiveMineId() ?? undefined, client_uuid: clientUuid },
    send: async (body) => {
      const res = await apiFetch<any>('/grievances', { method: 'POST', body: JSON.stringify(body) });
      return { token: res.token, status: res.status };
    },
  });
}

export async function trackGrievanceApi(token: string): Promise<GrievanceItem | null> {
  try {
    const res = await apiFetch<any>(`/grievances/track/${encodeURIComponent(token.trim().toUpperCase())}`);
    return {
      token: res.token,
      category: res.category,
      text: '',
      anonymous: true,
      status: res.status,
      response: res.response || undefined,
      created_at: res.created_at,
      updated_at: res.updated_at,
    };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

// ---------------------------------------------------------------- SOS & field reports

export type SosKind = 'fire' | 'roof_fall' | 'gas' | 'injury' | 'flooding' | 'other';

export async function sendSosApi(opts: {
  kind: SosKind;
  note: string;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
}): Promise<SubmitResult<{ id: number; notified: number }>> {
  const clientUuid = newClientUuid('sos');
  return submitOrQueue({
    kind: 'sos',
    clientUuid,
    priority: 0,
    body: {
      kind: opts.kind,
      note: opts.note,
      lat: opts.lat,
      lng: opts.lng,
      accuracy: opts.accuracy,
      mine_id: getActiveMineId() ?? undefined,
      client_uuid: clientUuid,
    },
    send: async (body) => {
      const res = await apiFetch<any>('/sos', { method: 'POST', body: JSON.stringify(body) });
      return { id: res.id, notified: res.notified ?? 0 };
    },
  });
}

export async function submitObservationApi(data: {
  type: 'unsafe_act' | 'unsafe_condition' | 'near_miss' | 'incident';
  category: string;
  text: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  location_text: string;
  lat: number | null;
  lng: number | null;
  anonymous: boolean;
  photoUri?: string | null;
  photoMeta?: CaptureMeta | null;
  audioUri?: string | null;
  source?: 'app' | 'voice';
  transcript?: string;
  language?: string;
}): Promise<SubmitResult<{ id: number; capa_id: number | null }>> {
  const clientUuid = newClientUuid('observation');
  const mineId = requireMineId();
  const photo = photoEvidence('evidence_id', data.photoUri, data.photoMeta, mineId);
  return submitOrQueue({
    kind: 'observation',
    clientUuid,
    body: {
      mine_id: mineId,
      type: data.type,
      category: data.category,
      text: data.text,
      severity: data.severity,
      lat: data.lat,
      lng: data.lng,
      location_text: data.location_text || null,
      source: data.source || 'app',
      language: data.language || 'en',
      anonymous: data.anonymous,
      transcript: data.transcript || null,
      client_uuid: clientUuid,
    },
    evidence: photo,
    send: async (body) => {
      const res = await apiFetch<any>('/observations', { method: 'POST', body: JSON.stringify(body) });
      return { id: res.id, capa_id: res.capa_id ?? null };
    },
  });
}

// ---------------------------------------------------------------- notifications

function toNotification(n: any): NotificationItem {
  const type: NotificationItem['type'] =
    n.level === 'critical' || n.kind === 'incident' || n.kind === 'sos' || n.kind === 'escalation'
      ? 'escalation'
      : n.kind === 'approval'
      ? 'approval'
      : n.kind === 'rejection'
      ? 'rejection'
      : 'reminder';
  return {
    id: String(n.id),
    title: n.title,
    message: n.body,
    type,
    timestamp: n.created_at,
    read: Boolean(n.read),
    related_id: n.link || undefined,
  };
}

export async function fetchNotificationsApi(pageSize = 50): Promise<{ items: NotificationItem[]; unread: number }> {
  const res = await apiFetch<{ items: any[]; unread: number }>(`/notifications?page_size=${pageSize}`);
  return { items: (res.items || []).map(toNotification), unread: res.unread || 0 };
}

export async function markNotificationReadApi(id: string): Promise<void> {
  await apiFetch<any>(`/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' });
}

// ---------------------------------------------------------------- inspections

export async function fetchChecklistsApi(mineId: number): Promise<{ id: string; name: string; items: any[] }[]> {
  const res = await apiFetch<any[]>(`/checklists?mine_id=${mineId}`);
  return (res || []).map((c) => ({ id: String(c.id), name: c.name, items: c.items || [] }));
}

export async function startInspectionApi(opts: {
  type: 'internal' | 'statutory' | 'dgms' | 'spcb';
  checklistId: number;
  lat: number | null;
  lng: number | null;
}): Promise<InspectionDetail> {
  const res = await apiFetch<any>('/inspections', {
    method: 'POST',
    body: JSON.stringify({
      mine_id: requireMineId(),
      type: opts.type,
      checklist_id: opts.checklistId,
      lat: opts.lat,
      lng: opts.lng,
      client_uuid: newClientUuid('insp'),
    }),
  });
  return toInspection(res);
}

function toInspection(r: any): InspectionDetail {
  return {
    id: String(r.id),
    mine_id: r.mine_id,
    mine_name: r.mine_name,
    type: r.type,
    status: r.status,
    checklist_id: r.checklist_id ?? null,
    started_at: r.started_at,
    submitted_at: r.submitted_at ?? null,
    checklist_answers: r.checklist_answers ?? null,
    findings: (r.findings || []).map((f: any) => ({
      id: String(f.id),
      category: f.category,
      description: f.description,
      severity: f.severity,
      has_photo: Boolean(f.photo_evidence_id),
      checklist_item_id: f.checklist_item_id ?? null,
      capa_id: f.capa_id ?? null,
    })),
  };
}

export async function fetchInspectionDetailApi(inspectionId: string): Promise<InspectionDetail> {
  return toInspection(await apiFetch<any>(`/inspections/${encodeURIComponent(inspectionId)}`));
}

export async function addFindingApi(
  inspectionId: string,
  finding: {
    category: string;
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    lat: number | null;
    lng: number | null;
    checklistItemId?: string | null;
    photoUri?: string | null;
    photoMeta?: CaptureMeta | null;
  }
): Promise<SubmitResult<{ id: number }>> {
  const clientUuid = newClientUuid('finding');
  const mineId = requireMineId();
  return submitOrQueue({
    kind: 'finding',
    clientUuid,
    body: {
      inspection_id: Number(inspectionId),
      category: finding.category,
      description: finding.description,
      severity: finding.severity,
      lat: finding.lat,
      lng: finding.lng,
      checklist_item_id: finding.checklistItemId || null,
      client_uuid: clientUuid,
    },
    evidence: photoEvidence('photo_evidence_id', finding.photoUri, finding.photoMeta, mineId),
    send: async (body) => {
      const { inspection_id, ...rest } = body;
      const res = await apiFetch<any>(`/inspections/${inspection_id}/findings`, {
        method: 'POST',
        body: JSON.stringify(rest),
      });
      return { id: res.id };
    },
  });
}

export async function submitInspectionApi(
  inspectionId: string,
  answers: { item_id: string; answer: 'ok' | 'not_ok' | 'na' }[],
  notes?: string
): Promise<SubmitResult<InspectionDetail>> {
  return submitOrQueue({
    kind: 'inspection_submit',
    clientUuid: newClientUuid('insp-submit'),
    body: { inspection_id: Number(inspectionId), checklist_answers: answers, notes: notes || null },
    send: async (body) => {
      const { inspection_id, ...rest } = body;
      return toInspection(
        await apiFetch<any>(`/inspections/${inspection_id}/submit`, { method: 'POST', body: JSON.stringify(rest) })
      );
    },
  });
}

// ---------------------------------------------------------------- my reports & map

export async function fetchMyReportsApi(): Promise<MyReportItem[]> {
  const res = await apiFetch<{ items: any[] }>('/me/reports?page_size=100');
  return (res.items || []).map((r) => ({
    id: `${r.kind}-${r.id}`,
    kind: r.kind,
    title: r.title,
    status: r.status,
    created_at: r.created_at,
    trust_score: r.trust_score ?? null,
    flags: r.flags || [],
  }));
}

export async function fetchMapPinsApi(mineId: number): Promise<MapPin[]> {
  const res = await apiFetch<any[]>(`/gis/pins?mine_id=${mineId}`);
  return (res || []).map((p) => ({
    id: p.id,
    type: p.type,
    title: p.title,
    severity: p.severity,
    lat: p.lat,
    lng: p.lng,
  }));
}
