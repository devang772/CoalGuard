import { Platform } from 'react-native';

let dbInstance: any = null;

export function getDatabase() {
  if (Platform.OS === 'web') {
    return {
      execSync: (sql: string) => {},
      runSync: (sql: string, params: any[] = []) => {
        return { lastInsertRowId: Date.now(), changes: 1 };
      },
      getAllSync: (sql: string, params: any[] = []) => {
        return [];
      },
      getFirstSync: (sql: string, params: any[] = []) => {
        return null;
      },
    };
  }

  if (!dbInstance) {
    try {
      // Lazily require expo-sqlite on native platform only to prevent web bundle crash
      const SQLite = require('expo-sqlite');
      dbInstance = SQLite.openDatabaseSync('netra.db');
      initTables(dbInstance);
    } catch (e) {
      console.warn('SQLite openDatabaseSync fallback', e);
    }
  }
  return dbInstance;
}

function initTables(db: any) {
  try {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS outbox (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_uuid TEXT UNIQUE,
        kind TEXT,
        payload TEXT,
        file_uris TEXT,
        status TEXT,
        attempts INTEGER DEFAULT 0,
        last_error TEXT,
        priority INTEGER DEFAULT 1,
        created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS master_cache (
        key TEXT PRIMARY KEY,
        data TEXT,
        updated_at TEXT
      );
    `);
  } catch (err) {
    console.error('Failed to init SQLite tables', err);
  }
}
