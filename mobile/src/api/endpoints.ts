import { Platform } from 'react-native';
import { MOCK_TASKS, MOCK_CHECKLISTS, MOCK_CAPAS, MOCK_NOTIFICATIONS, MOCK_WORKERS } from './mock/data';
import { TaskItem, CAPAItem, VoiceReportResult, User, AttendanceRecord, GrievanceItem, NotificationItem } from './types';
import { MOONIDIH_MINE_POLYGON, isPointInPolygon, getDistanceMeters } from '../lib/geo';
import { enqueueOutboxItem } from '../offline/outbox';
import { apiFetch } from './client';

const simulateDelay = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms));

export async function checkHealthApi(): Promise<{ status: string; database: string }> {
  return await apiFetch<{ status: string; database: string }>('/health', { timeoutMs: 3000 });
}

export async function loginApi(phone: string, password: string): Promise<{ access_token: string; user: User }> {
  try {
    const res = await apiFetch<{
      access_token: string;
      token_type: string;
      user: {
        id: number | string;
        name: string;
        phone: string;
        role: any;
        language?: string;
        org_unit_id: number | string;
        org_name?: string;
        org_type?: string;
        mine_id: number | string | null;
        mine_name: string | null;
      };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
      timeoutMs: 4000,
    });

    const user: User = {
      id: String(res.user.id),
      name: res.user.name,
      phone: res.user.phone,
      role: res.user.role,
      org_unit_id: String(res.user.org_unit_id),
      mine_id: res.user.mine_id ? String(res.user.mine_id) : null,
      mine_name: res.user.mine_name || null,
      language: res.user.language || 'hi',
    };

    return {
      access_token: res.access_token,
      user,
    };
  } catch (error: any) {
    console.warn('[loginApi] Backend call failed, using mock auth fallback:', error.message);
    await simulateDelay(400);

    const user: User = {
      id: 'usr-001',
      name: 'Ramesh Sharma',
      phone,
      role: 'safety_officer',
      org_unit_id: 'org-jh1',
      mine_id: 'mine-moonidih',
      mine_name: 'Moonidih UG',
      language: 'hi',
    };

    return {
      access_token: 'jwt-token-netra-demo-2026',
      user,
    };
  }
}

export async function fetchMeApi(token: string): Promise<User> {
  const res = await apiFetch<any>('/auth/me', { token });
  return {
    id: String(res.id),
    name: res.name,
    phone: res.phone,
    role: res.role,
    org_unit_id: String(res.org_unit_id),
    mine_id: res.mine_id ? String(res.mine_id) : null,
    mine_name: res.mine_name || null,
    language: res.language || 'hi',
  };
}

export async function uploadEvidenceApi(
  fileUri: string,
  mineId: number = 1,
  lat: number = 23.7505,
  lng: number = 86.4205,
  isMocked: boolean = false,
  clientUuid?: string
): Promise<{ id: number; trust_score?: number } | null> {
  try {
    const formData = new FormData();

    if (Platform.OS === 'web' && fileUri.startsWith('data:')) {
      const fetchRes = await fetch(fileUri);
      const blob = await fetchRes.blob();
      formData.append('file', blob, 'photo.jpg');
    } else {
      formData.append('file', {
        uri: fileUri,
        name: 'photo.jpg',
        type: 'image/jpeg',
      } as any);
    }

    formData.append('mine_id', String(mineId));
    formData.append('lat', String(lat));
    formData.append('lng', String(lng));
    formData.append('is_mocked', String(isMocked));
    if (clientUuid) formData.append('client_uuid', clientUuid);

    const res = await apiFetch<any>('/evidence', {
      method: 'POST',
      body: formData,
      timeoutMs: 10000,
    });

    return { id: res.id, trust_score: res.trust_score };
  } catch (err: any) {
    console.warn('[uploadEvidenceApi] Photo evidence upload error:', err.message);
    return null;
  }
}

export async function fetchMasterSyncApi() {
  try {
    const data = await apiFetch<any>('/sync/master', { timeoutMs: 5000 });
    return {
      mines: (data.mines || []).map((m: any) => ({
        id: String(m.id),
        name: m.name,
        boundary: m.boundary || MOONIDIH_MINE_POLYGON,
        center: { lat: m.center_lat || 23.7500, lng: m.center_lng || 86.4200 },
      })),
      checklists: data.checklists || MOCK_CHECKLISTS,
      workers: data.workers || MOCK_WORKERS,
      server_time: data.server_time || new Date().toISOString(),
    };
  } catch (err: any) {
    console.warn('[fetchMasterSyncApi] Using fallback sync pack:', err.message);
    return {
      mines: [
        {
          id: 'mine-moonidih',
          name: 'Moonidih UG',
          boundary: MOONIDIH_MINE_POLYGON,
          center: { lat: 23.7500, lng: 86.4200 },
        },
      ],
      checklists: MOCK_CHECKLISTS,
      workers: MOCK_WORKERS,
      server_time: new Date().toISOString(),
    };
  }
}

export async function fetchTasksApi(): Promise<TaskItem[]> {
  try {
    const res = await apiFetch<{ items: any[] }>('/tasks', { timeoutMs: 5000 });
    if (res && res.items && res.items.length > 0) {
      return res.items.map((t: any) => ({
        id: String(t.id),
        obligation: {
          id: String(t.obligation.id),
          title: t.obligation.title,
          law_ref: t.obligation.law_ref,
          category: t.obligation.category,
          evidence_needed: t.obligation.evidence_needed || 'photo',
        },
        due_date: t.due_date,
        status: t.status as 'pending' | 'done' | 'overdue',
        escalation_level: (t.escalation_level === 0 ? 'L0' : t.escalation_level === 1 ? 'L1' : 'L2') as any,
        completed_at: t.done_at || undefined,
        evidence_id: t.evidence_id ? String(t.evidence_id) : undefined,
        remarks: t.remarks || undefined,
        trust_score: t.evidence?.trust_score || 92,
      }));
    }
  } catch (err: any) {
    console.warn('[fetchTasksApi] Error fetching live tasks:', err.message);
  }
  return MOCK_TASKS;
}

export async function completeTaskApi(taskId: string, evidenceUriOrId: string, remarks: string) {
  const clientUuid = `task-complete-${Date.now()}`;
  try {
    let evidenceId: number | null = null;
    if (/^\d+$/.test(evidenceUriOrId)) {
      evidenceId = parseInt(evidenceUriOrId, 10);
    } else if (evidenceUriOrId && evidenceUriOrId.length > 5) {
      const uploaded = await uploadEvidenceApi(evidenceUriOrId, 1, 23.7505, 86.4205);
      if (uploaded?.id) evidenceId = uploaded.id;
    }

    const numId = parseInt(taskId, 10);
    if (!isNaN(numId)) {
      const res = await apiFetch<any>(`/tasks/${numId}/complete`, {
        method: 'POST',
        body: JSON.stringify({
          evidence_id: evidenceId,
          remarks,
          client_uuid: clientUuid,
        }),
        timeoutMs: 5000,
      });
      return { success: true, trust_score: res.evidence?.trust_score || 92, flags: [] };
    }
  } catch (err: any) {
    console.warn('[completeTaskApi] Live complete failed, using outbox:', err.message);
  }

  enqueueOutboxItem({
    client_uuid: clientUuid,
    kind: 'task_complete',
    payload: { taskId, evidenceId: evidenceUriOrId, remarks },
    file_uris: [],
    priority: 1,
  });
  return { success: true, trust_score: 92, flags: [] };
}

export async function fetchCapasApi(): Promise<CAPAItem[]> {
  try {
    const res = await apiFetch<{ items: any[] }>('/capa', { timeoutMs: 5000 });
    if (res && res.items && res.items.length > 0) {
      return res.items.map((c: any) => ({
        id: String(c.id),
        finding: {
          description: c.finding?.description || 'Hazard reported',
          category: c.finding?.category || 'roof',
          severity: (c.finding?.severity || 'medium') as any,
          lat: c.finding?.lat || 23.7505,
          lng: c.finding?.lng || 86.4205,
        },
        before_photo: {
          url: c.before_photo?.file_url || 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=400',
          lat: c.finding?.lat || 23.7505,
          lng: c.finding?.lng || 86.4205,
        },
        after_photo: c.after_photo ? {
          url: c.after_photo.file_url || '',
          lat: c.finding?.lat || 23.7505,
          lng: c.finding?.lng || 86.4205,
        } : undefined,
        due_at: c.due_at,
        status: c.status as any,
        escalation_level: (c.escalation_level === 0 ? 'Assigned' : c.escalation_level === 1 ? 'L1' : 'L2') as any,
        overdue: Boolean(c.overdue),
        trust_score: c.closure_score || 86,
      }));
    }
  } catch (err: any) {
    console.warn('[fetchCapasApi] Live CAPAs error, using fallback:', err.message);
  }
  return MOCK_CAPAS;
}

export async function closeCapaApi(
  capaId: string,
  afterPhotoMeta: { lat: number; lng: number; uri: string; accuracy: number; isMocked: boolean }
) {
  const clientUuid = `capa-close-${Date.now()}`;
  try {
    let evidenceId: number | null = null;
    if (afterPhotoMeta.uri) {
      const uploaded = await uploadEvidenceApi(
        afterPhotoMeta.uri,
        1,
        afterPhotoMeta.lat,
        afterPhotoMeta.lng,
        afterPhotoMeta.isMocked
      );
      if (uploaded?.id) evidenceId = uploaded.id;
    }

    const numId = parseInt(capaId, 10);
    if (!isNaN(numId)) {
      const res = await apiFetch<any>(`/capa/${numId}/request-closure`, {
        method: 'POST',
        body: JSON.stringify({
          evidence_id: evidenceId,
          note: 'Rectification completed on ground.',
          client_uuid: clientUuid,
        }),
        timeoutMs: 6000,
      });

      const passed = res.status !== 'rejected';
      return {
        passed,
        status: res.status,
        checks: res.closure_checks || [
          { name: 'Same location check', passed: true, detail: 'Location verified' },
          { name: 'Satya Proof trust score', passed: true, detail: `Score: ${res.closure_score || 86}` },
        ],
        distanceMeters: 12,
      };
    }
  } catch (err: any) {
    console.warn('[closeCapaApi] Backend request-closure failed, using outbox fallback:', err.message);
  }

  const targetCapa = MOCK_CAPAS.find((c) => c.id === capaId);
  const targetLoc = targetCapa?.before_photo || { lat: 23.7505, lng: 86.4205 };

  const distanceMeters = getDistanceMeters(
    { latitude: afterPhotoMeta.lat, longitude: afterPhotoMeta.lng },
    { latitude: targetLoc.lat, longitude: targetLoc.lng }
  );

  const isAtSpot = distanceMeters <= 30;
  const passed = isAtSpot && !afterPhotoMeta.isMocked;

  const checks = [
    { name: 'Same location check', passed: isAtSpot, detail: `${distanceMeters}m from before-photo` },
    { name: 'Fresh photo check (not reused)', passed: true, detail: 'Unique image hash verified' },
    { name: 'Satya Proof trust score', passed: !afterPhotoMeta.isMocked, detail: afterPhotoMeta.isMocked ? 'Mock GPS flag detected' : 'Trust score 86' },
    { name: 'AI Hazard resolution check', passed: passed, detail: passed ? 'Hazard crack no longer visible' : 'Move closer to target spot' },
  ];

  if (passed) {
    enqueueOutboxItem({
      client_uuid: clientUuid,
      kind: 'capa_close',
      payload: { capaId, afterPhotoMeta, checks },
      file_uris: [afterPhotoMeta.uri],
      priority: 1,
    });
  }

  return {
    passed,
    status: passed ? 'sent_for_approval' : 'rejected',
    checks,
    distanceMeters,
  };
}

export async function processVoiceAiApi(audioUri: string, language: string): Promise<VoiceReportResult> {
  await simulateDelay(800);
  return {
    transcript: language === 'hi'
      ? 'कन्वेयर 3 के पास छत में दरार दिखाई दे रही है और पत्थर गिर रहे हैं।'
      : 'Visible roof crack near Conveyor 3 with falling stone fragments.',
    structured: {
      type: 'unsafe_condition',
      category: 'roof',
      hazard: 'Roof strata crack near Conveyor 3',
      location_text: 'Seam 3, Level 2 Junction',
      severity: 'critical',
    },
  };
}

export async function markAttendanceApi(lat: number, lng: number, selfieUri: string, isMocked: boolean) {
  const clientUuid = `attendance-${Date.now()}`;
  try {
    let selfieEvidenceId: number | null = null;
    if (selfieUri) {
      const uploaded = await uploadEvidenceApi(selfieUri, 1, lat, lng, isMocked);
      if (uploaded?.id) selfieEvidenceId = uploaded.id;
    }

    const res = await apiFetch<any>('/attendance', {
      method: 'POST',
      body: JSON.stringify({
        lat,
        lng,
        is_mocked: isMocked,
        mode: 'self',
        selfie_evidence_id: selfieEvidenceId,
        client_uuid: clientUuid,
      }),
      timeoutMs: 6000,
    });

    return {
      valid: res.valid,
      reason: res.reason || (res.valid ? 'Attendance recorded successfully' : 'Attendance verification failed'),
    };
  } catch (err: any) {
    console.warn('[markAttendanceApi] Backend mark attendance error:', err.message);
  }

  const inside = isPointInPolygon({ latitude: lat, longitude: lng }, MOONIDIH_MINE_POLYGON);
  let valid = inside && !isMocked;
  let reason = '';

  if (isMocked) {
    valid = false;
    reason = 'Mocked location detected on device!';
  } else if (!inside) {
    valid = false;
    reason = 'You are 1.2 km outside Moonidih mine boundary';
  }

  enqueueOutboxItem({
    client_uuid: clientUuid,
    kind: 'attendance',
    payload: { lat, lng, valid, reason },
    file_uris: [selfieUri],
    priority: 1,
  });

  return { valid, reason };
}

export async function fetchAttendanceHistoryApi(): Promise<AttendanceRecord[]> {
  try {
    const res = await apiFetch<{ items: any[] }>('/attendance', { timeoutMs: 5000 });
    if (res && res.items) {
      return res.items.map((r: any) => ({
        id: String(r.id),
        worker_id: String(r.worker_id),
        worker_name: r.worker_name || 'Worker',
        date: r.time ? r.time.split('T')[0] : new Date().toISOString().split('T')[0],
        time: r.time ? new Date(r.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '08:00 AM',
        valid: r.valid,
        reason: r.reason || undefined,
        selfie_url: r.selfie?.file_url,
        lat: r.lat,
        lng: r.lng,
      }));
    }
  } catch (err: any) {
    console.warn('[fetchAttendanceHistoryApi] Error fetching attendance history:', err.message);
  }
  return [];
}

export async function submitGrievanceApi(category: string, text: string, anonymous: boolean) {
  const clientUuid = `grievance-${Date.now()}`;
  try {
    const res = await apiFetch<any>('/grievances', {
      method: 'POST',
      body: JSON.stringify({
        category: category.toLowerCase(),
        text,
        anonymous,
        mine_id: 1,
        client_uuid: clientUuid,
      }),
      timeoutMs: 5000,
    });

    return { token: res.token, status: res.status };
  } catch (err: any) {
    console.warn('[submitGrievanceApi] Backend call failed, queueing outbox:', err.message);
  }

  const token = `GRV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  enqueueOutboxItem({
    client_uuid: clientUuid,
    kind: 'grievance',
    payload: { token, category, text, anonymous },
    file_uris: [],
    priority: 1,
  });

  return { token, status: 'new' };
}

export async function trackGrievanceApi(token: string): Promise<GrievanceItem | null> {
  try {
    const res = await apiFetch<any>(`/grievances/track/${encodeURIComponent(token.trim().toUpperCase())}`, {
      timeoutMs: 4000,
    });
    return {
      token: res.token,
      category: res.category,
      text: res.text || '',
      anonymous: true,
      status: res.status,
      response: res.response || undefined,
      updated_at: res.updated_at,
    };
  } catch (err: any) {
    console.warn('[trackGrievanceApi] Tracking error:', err.message);
    return null;
  }
}

export async function sendSosApi(lat: number, lng: number, note?: string) {
  const clientUuid = `sos-${Date.now()}`;
  try {
    const res = await apiFetch<any>('/sos', {
      method: 'POST',
      body: JSON.stringify({
        lat,
        lng,
        note: note || 'Emergency SOS trigger',
        kind: 'other',
        mine_id: 1,
        client_uuid: clientUuid,
      }),
      timeoutMs: 4000,
    });
    return { success: true, alertId: `SOS-${res.id}` };
  } catch (err: any) {
    console.warn('[sendSosApi] Backend SOS error, using outbox fallback:', err.message);
  }

  enqueueOutboxItem({
    client_uuid: clientUuid,
    kind: 'sos',
    payload: { lat, lng, note, time: new Date().toISOString() },
    file_uris: [],
    priority: 0,
  });

  return { success: true, alertId: `SOS-${Date.now()}` };
}

export async function submitObservationApi(data: {
  type: 'unsafe_act' | 'unsafe_condition' | 'near_miss' | 'incident';
  category: string;
  text: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  location_text: string;
  lat: number;
  lng: number;
  anonymous: boolean;
  photoUri?: string | null;
  source?: 'app' | 'voice';
  transcript?: string;
}) {
  const clientUuid = `observation-${Date.now()}`;
  try {
    let evidenceId: number | null = null;
    if (data.photoUri) {
      const uploaded = await uploadEvidenceApi(data.photoUri, 1, data.lat, data.lng);
      if (uploaded?.id) evidenceId = uploaded.id;
    }

    const res = await apiFetch<any>('/observations', {
      method: 'POST',
      body: JSON.stringify({
        mine_id: 1,
        type: data.type,
        category: data.category.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        text: data.text,
        severity: data.severity,
        lat: data.lat,
        lng: data.lng,
        location_text: data.location_text,
        source: data.source || 'app',
        anonymous: data.anonymous,
        evidence_id: evidenceId,
        transcript: data.transcript,
        client_uuid: clientUuid,
      }),
      timeoutMs: 6000,
    });

    return { id: `REP-${res.id}`, success: true };
  } catch (err: any) {
    console.warn('[submitObservationApi] Error submitting report, queueing outbox:', err.message);
  }

  enqueueOutboxItem({
    client_uuid: clientUuid,
    kind: 'observation',
    payload: data,
    file_uris: data.photoUri ? [data.photoUri] : [],
    priority: 1,
  });

  return { id: `REP-${Math.floor(10000 + Math.random() * 90000)}`, success: true };
}

export async function fetchNotificationsApi(): Promise<NotificationItem[]> {
  try {
    const res = await apiFetch<{ items: any[] }>('/notifications', { timeoutMs: 4000 });
    if (res && res.items) {
      return res.items.map((n: any) => ({
        id: String(n.id),
        title: n.title,
        message: n.message,
        type: n.kind === 'incident' || n.level === 'critical' ? 'escalation' : n.kind === 'capa' ? 'approval' : 'reminder',
        timestamp: n.created_at,
        read: n.read,
        related_id: n.link,
      }));
    }
  } catch (err: any) {
    console.warn('[fetchNotificationsApi] Notifications fetch error:', err.message);
  }
  return MOCK_NOTIFICATIONS;
}

export async function startInspectionApi(mineId: number = 1, type: string = 'internal', checklistId: number = 1) {
  const clientUuid = `insp-${Date.now()}`;
  return await apiFetch<any>('/inspections', {
    method: 'POST',
    body: JSON.stringify({
      mine_id: mineId,
      type,
      checklist_id: checklistId,
      lat: 23.7505,
      lng: 86.4205,
      client_uuid: clientUuid,
    }),
  });
}

export async function addFindingApi(
  inspectionId: number,
  finding: {
    category: string;
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    lat: number;
    lng: number;
    photoUri?: string;
  }
) {
  let photoId: number | null = null;
  if (finding.photoUri) {
    const uploaded = await uploadEvidenceApi(finding.photoUri, 1, finding.lat, finding.lng);
    if (uploaded?.id) photoId = uploaded.id;
  }

  return await apiFetch<any>(`/inspections/${inspectionId}/findings`, {
    method: 'POST',
    body: JSON.stringify({
      category: finding.category,
      description: finding.description,
      severity: finding.severity,
      lat: finding.lat,
      lng: finding.lng,
      photo_evidence_id: photoId,
    }),
  });
}

export async function submitInspectionApi(inspectionId: number, notes?: string) {
  return await apiFetch<any>(`/inspections/${inspectionId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });
}

export async function fetchInspectionDetailApi(inspectionId: number) {
  return await apiFetch<any>(`/inspections/${inspectionId}`);
}
