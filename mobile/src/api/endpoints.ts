import { MOCK_TASKS, MOCK_CHECKLISTS, MOCK_CAPAS, MOCK_NOTIFICATIONS, MOCK_WORKERS } from './mock/data';
import { TaskItem, CAPAItem, VoiceReportResult, User } from './types';
import { MOONIDIH_MINE_POLYGON, isPointInPolygon, getDistanceMeters } from '../lib/geo';
import { enqueueOutboxItem } from '../offline/outbox';

// Quick sleep helper for realistic response latency simulation
const simulateDelay = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms));

export async function loginApi(phone: string, password: string): Promise<{ access_token: string; user: User }> {
  await simulateDelay(600);

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

export async function fetchMasterSyncApi() {
  await simulateDelay(300);
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

export async function fetchTasksApi(): Promise<TaskItem[]> {
  await simulateDelay(400);
  return MOCK_TASKS;
}

export async function completeTaskApi(taskId: string, evidenceId: string, remarks: string) {
  await simulateDelay(500);
  enqueueOutboxItem({
    client_uuid: `task-complete-${Date.now()}`,
    kind: 'task_complete',
    payload: { taskId, evidenceId, remarks },
    file_uris: [],
    priority: 1,
  });
  return { success: true, trust_score: 92, flags: [] };
}

export async function fetchCapasApi(): Promise<CAPAItem[]> {
  await simulateDelay(400);
  return MOCK_CAPAS;
}

export async function closeCapaApi(
  capaId: string,
  afterPhotoMeta: { lat: number; lng: number; uri: string; accuracy: number; isMocked: boolean }
) {
  await simulateDelay(800);

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
      client_uuid: `capa-close-${Date.now()}`,
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
  await simulateDelay(1200);

  // Mock speech-to-text and NLP extraction demo
  return {
    transcript: language === 'hi'
      ? 'कन्वेयर 3 के पास छत में दरार दिखाई दे रही है और पत्थर गिर रहे हैं।'
      : 'Visible roof crack near Conveyor 3 with falling stone fragments.',
    structured: {
      type: 'unsafe_condition',
      category: 'roof_support',
      hazard: 'Roof strata crack near Conveyor 3',
      location_text: 'Seam 3, Level 2 Junction',
      severity: 'critical',
    },
  };
}

export async function markAttendanceApi(lat: number, lng: number, selfieUri: string, isMocked: boolean) {
  await simulateDelay(700);

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
    client_uuid: `attendance-${Date.now()}`,
    kind: 'attendance',
    payload: { lat, lng, valid, reason },
    file_uris: [selfieUri],
    priority: 1,
  });

  return { valid, reason };
}

export async function submitGrievanceApi(category: string, text: string, anonymous: boolean) {
  await simulateDelay(500);

  const token = `GRV-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  enqueueOutboxItem({
    client_uuid: `grievance-${Date.now()}`,
    kind: 'grievance',
    payload: { token, category, text, anonymous },
    file_uris: [],
    priority: 1,
  });

  return { token, status: 'new' };
}

export async function sendSosApi(lat: number, lng: number, note?: string) {
  enqueueOutboxItem({
    client_uuid: `sos-${Date.now()}`,
    kind: 'sos',
    payload: { lat, lng, note, time: new Date().toISOString() },
    file_uris: [],
    priority: 0, // High priority SOS
  });

  return { success: true, alertId: `SOS-${Date.now()}` };
}
