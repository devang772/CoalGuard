import { getDatabase } from './db';
import { useSyncStore } from '../store/sync';
import type { CaptureMeta } from '../store/settings';

/** A photo that must be uploaded (POST /evidence) before the item is sent; its id goes into `field`. */
export interface OutboxEvidence {
  field: string;
  uri: string;
  meta: CaptureMeta | null;
  mine_id: number;
}

export interface OutboxItem {
  id?: number;
  client_uuid: string;
  kind:
    | 'observation'
    | 'finding'
    | 'task_complete'
    | 'attendance'
    | 'grievance'
    | 'sos'
    | 'capa_close'
    | 'inspection'
    | 'inspection_submit';
  /** The request body of the normal endpoint (snake_case), plus `_evidence` when a photo is attached. */
  payload: any;
  file_uris: string[];
  status: 'pending' | 'uploading' | 'done' | 'failed';
  attempts: number;
  last_error?: string;
  priority: number; // 0 for SOS, 1 for normal
  created_at: string;
}

// Web has no SQLite: the queue lives in memory there. On native it is mirrored to SQLite.
let inMemoryOutbox: OutboxItem[] = [];
let loadedFromDb = false;

function fromRow(r: any): OutboxItem {
  return {
    ...r,
    payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload,
    file_uris: typeof r.file_uris === 'string' ? JSON.parse(r.file_uris) : r.file_uris || [],
    last_error: r.last_error || undefined,
  };
}

/** Loads the queue saved on the device (after an app restart). */
export function loadOutboxFromDb() {
  if (loadedFromDb) return;
  loadedFromDb = true;
  try {
    const db = getDatabase();
    if (db && db.getAllSync) {
      const rows = db.getAllSync(`SELECT * FROM outbox ORDER BY created_at DESC`);
      if (rows && rows.length > 0) {
        inMemoryOutbox = rows.map(fromRow);
      }
    }
  } catch (err) {
    console.warn('Outbox SQLite load failed', err);
  }
  updateStoreCounts();
}

export function enqueueOutboxItem(item: Omit<OutboxItem, 'attempts' | 'status' | 'created_at'>): OutboxItem {
  loadOutboxFromDb();
  const fullItem: OutboxItem = {
    ...item,
    status: 'pending',
    attempts: 0,
    created_at: new Date().toISOString(),
  };

  try {
    const db = getDatabase();
    if (db && db.runSync) {
      db.runSync(
        `INSERT OR REPLACE INTO outbox (client_uuid, kind, payload, file_uris, status, attempts, priority, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          fullItem.client_uuid,
          fullItem.kind,
          JSON.stringify(fullItem.payload),
          JSON.stringify(fullItem.file_uris || []),
          fullItem.status,
          fullItem.attempts,
          fullItem.priority,
          fullItem.created_at,
        ]
      );
    }
  } catch (err) {
    console.warn('Outbox SQLite insert failed, keeping the item in memory', err);
  }

  inMemoryOutbox = [fullItem, ...inMemoryOutbox.filter((x) => x.client_uuid !== fullItem.client_uuid)];
  updateStoreCounts();

  return fullItem;
}

export function getPendingOutboxItems(): OutboxItem[] {
  loadOutboxFromDb();
  return inMemoryOutbox
    .filter((x) => x.status === 'pending' || x.status === 'failed' || x.status === 'uploading')
    .sort((a, b) => a.priority - b.priority || a.created_at.localeCompare(b.created_at));
}

export function getAllOutboxItems(): OutboxItem[] {
  loadOutboxFromDb();
  return [...inMemoryOutbox];
}

export function updateOutboxItemStatus(
  client_uuid: string,
  status: 'pending' | 'uploading' | 'done' | 'failed',
  last_error?: string
) {
  const countAttempt = status === 'done' || status === 'failed';
  try {
    const db = getDatabase();
    if (db && db.runSync) {
      db.runSync(
        `UPDATE outbox SET status = ?, attempts = attempts + ?, last_error = ? WHERE client_uuid = ?`,
        [status, countAttempt ? 1 : 0, last_error || null, client_uuid]
      );
    }
  } catch (e) {}

  inMemoryOutbox = inMemoryOutbox.map((x) =>
    x.client_uuid === client_uuid
      ? { ...x, status, attempts: x.attempts + (countAttempt ? 1 : 0), last_error }
      : x
  );

  updateStoreCounts();
}

/** Stores the uploaded photo id so a retry does not upload the photo again. */
export function updateOutboxPayload(client_uuid: string, payload: any) {
  try {
    const db = getDatabase();
    if (db && db.runSync) {
      db.runSync(`UPDATE outbox SET payload = ? WHERE client_uuid = ?`, [JSON.stringify(payload), client_uuid]);
    }
  } catch (e) {}
  inMemoryOutbox = inMemoryOutbox.map((x) => (x.client_uuid === client_uuid ? { ...x, payload } : x));
}

export function deleteOutboxItem(client_uuid: string) {
  try {
    const db = getDatabase();
    if (db && db.runSync) {
      db.runSync(`DELETE FROM outbox WHERE client_uuid = ?`, [client_uuid]);
    }
  } catch (e) {}

  inMemoryOutbox = inMemoryOutbox.filter((x) => x.client_uuid !== client_uuid);
  updateStoreCounts();
}

function updateStoreCounts() {
  const pending = inMemoryOutbox.filter((x) => x.status === 'pending' || x.status === 'uploading').length;
  const failed = inMemoryOutbox.filter((x) => x.status === 'failed').length;
  useSyncStore.getState().setCounts(pending, failed);
}
