import { getDatabase } from './db';
import { useSyncStore } from '../store/sync';

export interface OutboxItem {
  id?: number;
  client_uuid: string;
  kind: 'observation' | 'finding' | 'task_complete' | 'attendance' | 'grievance' | 'sos' | 'capa_close';
  payload: any;
  file_uris: string[];
  status: 'pending' | 'uploading' | 'done' | 'failed';
  attempts: number;
  last_error?: string;
  priority: number; // 0 for SOS, 1 for normal
  created_at: string;
}

// In-memory array fallback for Web/Demo runtime
let inMemoryOutbox: OutboxItem[] = [];

export function enqueueOutboxItem(item: Omit<OutboxItem, 'attempts' | 'status' | 'created_at'>): OutboxItem {
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
    console.warn('Outbox SQLite insert fallback to in-memory store', err);
  }

  // Always keep in memory array updated for instant reactivity in mock/demo
  inMemoryOutbox = [fullItem, ...inMemoryOutbox.filter((x) => x.client_uuid !== fullItem.client_uuid)];
  updateStoreCounts();

  return fullItem;
}

export function getPendingOutboxItems(): OutboxItem[] {
  try {
    const db = getDatabase();
    if (db && db.getAllSync) {
      const rows = db.getAllSync(
        `SELECT * FROM outbox WHERE status IN ('pending', 'failed', 'uploading') ORDER BY priority ASC, created_at ASC`
      );
      if (rows && rows.length > 0) {
        return rows.map((r: any) => ({
          ...r,
          payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload,
          file_uris: typeof r.file_uris === 'string' ? JSON.parse(r.file_uris) : r.file_uris,
        }));
      }
    }
  } catch (err) {
    console.warn('Outbox SQLite select fallback to memory', err);
  }

  return inMemoryOutbox.filter((x) => x.status === 'pending' || x.status === 'failed' || x.status === 'uploading');
}

export function getAllOutboxItems(): OutboxItem[] {
  try {
    const db = getDatabase();
    if (db && db.getAllSync) {
      const rows = db.getAllSync(`SELECT * FROM outbox ORDER BY created_at DESC`);
      if (rows && rows.length > 0) {
        return rows.map((r: any) => ({
          ...r,
          payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload,
          file_uris: typeof r.file_uris === 'string' ? JSON.parse(r.file_uris) : r.file_uris,
        }));
      }
    }
  } catch (e) {}

  return inMemoryOutbox;
}

export function updateOutboxItemStatus(
  client_uuid: string,
  status: 'pending' | 'uploading' | 'done' | 'failed',
  last_error?: string
) {
  try {
    const db = getDatabase();
    if (db && db.runSync) {
      db.runSync(
        `UPDATE outbox SET status = ?, attempts = attempts + 1, last_error = ? WHERE client_uuid = ?`,
        [status, last_error || null, client_uuid]
      );
    }
  } catch (e) {}

  inMemoryOutbox = inMemoryOutbox.map((x) => {
    if (x.client_uuid === client_uuid) {
      return {
        ...x,
        status,
        attempts: x.attempts + 1,
        last_error,
      };
    }
    return x;
  });

  updateStoreCounts();
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
