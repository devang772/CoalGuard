import { getDatabase } from './db';

const masterMemory: Record<string, any> = {};

export function setCachedMasterData(key: string, data: any) {
  const jsonStr = JSON.stringify(data);
  masterMemory[key] = data;

  try {
    const db = getDatabase();
    if (db && db.runSync) {
      db.runSync(
        `INSERT OR REPLACE INTO master_cache (key, data, updated_at) VALUES (?, ?, ?)`,
        [key, jsonStr, new Date().toISOString()]
      );
    }
  } catch (err) {
    console.warn('MasterCache SQLite fallback', err);
  }
}

export function getCachedMasterData<T>(key: string): T | null {
  if (masterMemory[key]) {
    return masterMemory[key] as T;
  }

  try {
    const db = getDatabase();
    if (db && db.getFirstSync) {
      const row: any = db.getFirstSync(`SELECT data FROM master_cache WHERE key = ?`, [key]);
      if (row && row.data) {
        const parsed = JSON.parse(row.data);
        masterMemory[key] = parsed;
        return parsed as T;
      }
    }
  } catch (err) {
    console.warn('MasterCache get error', err);
  }

  return null;
}
