import { getPendingOutboxItems, loadOutboxFromDb, updateOutboxItemStatus, updateOutboxPayload } from './outbox';
import { useSyncStore } from '../store/sync';
import { useSettingsStore } from '../store/settings';
import { useAuthStore } from '../store/auth';
import { apiFetch, isNetworkError } from '../api/client';
import { uploadEvidenceApi } from '../api/endpoints';

let isSyncRunning = false;
let initialised = false;

/**
 * Sends the offline queue: photos first (POST /evidence), then every item through POST /sync/bulk.
 * If the server can't be reached, items stay pending and are retried later.
 */
export async function processOutboxSync(): Promise<{ syncedCount: number; errorCount: number }> {
  const { forceOffline } = useSettingsStore.getState();
  const { isOnline } = useSyncStore.getState();
  const { token } = useAuthStore.getState();

  if (forceOffline || !isOnline || !token) {
    return { syncedCount: 0, errorCount: 0 };
  }

  if (isSyncRunning) return { syncedCount: 0, errorCount: 0 };

  const pendingItems = getPendingOutboxItems();
  if (pendingItems.length === 0) {
    return { syncedCount: 0, errorCount: 0 };
  }

  isSyncRunning = true;
  useSyncStore.getState().setSyncing(true);

  let syncedCount = 0;
  let errorCount = 0;

  try {
    const itemsToSync: { client_uuid: string; kind: string; payload: any }[] = [];

    for (const item of pendingItems) {
      updateOutboxItemStatus(item.client_uuid, 'uploading');
      const { _evidence, ...payload } = item.payload || {};

      if (_evidence && payload[_evidence.field] == null) {
        try {
          const uploaded = await uploadEvidenceApi({
            uri: _evidence.uri,
            mineId: _evidence.mine_id,
            meta: _evidence.meta,
            clientUuid: `${item.client_uuid}-photo`,
          });
          payload[_evidence.field] = uploaded.id;
          updateOutboxPayload(item.client_uuid, { ...payload, _evidence });
        } catch (err: any) {
          if (isNetworkError(err)) {
            updateOutboxItemStatus(item.client_uuid, 'pending', err.message);
            continue;
          }
          updateOutboxItemStatus(item.client_uuid, 'failed', `Photo upload: ${err.message}`);
          errorCount++;
          continue;
        }
      }

      itemsToSync.push({ client_uuid: item.client_uuid, kind: item.kind, payload });
    }

    if (itemsToSync.length > 0) {
      try {
        const res = await apiFetch<{ results: any[] }>('/sync/bulk', {
          method: 'POST',
          body: JSON.stringify({ items: itemsToSync }),
          timeoutMs: 60000,
        });

        (res.results || []).forEach((r: any) => {
          if (r.status === 'created' || r.status === 'duplicate') {
            updateOutboxItemStatus(r.client_uuid, 'done');
            syncedCount++;
          } else {
            updateOutboxItemStatus(r.client_uuid, 'failed', r.error || 'Server error');
            errorCount++;
          }
        });
      } catch (bulkErr: any) {
        const status = isNetworkError(bulkErr) ? 'pending' : 'failed';
        itemsToSync.forEach((i) => updateOutboxItemStatus(i.client_uuid, status, bulkErr.message));
        if (status === 'failed') errorCount += itemsToSync.length;
      }
    }

    if (syncedCount > 0) {
      useSyncStore.getState().setLastSyncTime(new Date().toISOString());
    }
  } catch (err) {
    console.error('SyncEngine error:', err);
  } finally {
    useSyncStore.getState().setSyncing(false);
    isSyncRunning = false;
  }

  return { syncedCount, errorCount };
}

export function initSyncEngine() {
  if (initialised) return;
  initialised = true;
  loadOutboxFromDb();

  try {
    const NetInfo = require('@react-native-community/netinfo');
    const api = NetInfo?.default || NetInfo;
    if (api && api.addEventListener) {
      api.addEventListener((state: any) => {
        const online = Boolean(state.isConnected && state.isInternetReachable !== false);
        useSyncStore.getState().setOnlineStatus(online);
        if (online) {
          processOutboxSync();
        }
      });
    }
  } catch (err) {
    console.warn('NetInfo unavailable, assuming online', err);
    useSyncStore.getState().setOnlineStatus(true);
  }

  setInterval(() => {
    processOutboxSync();
  }, 60000);
}
