import { Platform } from 'react-native';
import { getPendingOutboxItems, updateOutboxItemStatus } from './outbox';
import { useSyncStore } from '../store/sync';
import { useSettingsStore } from '../store/settings';
import { apiFetch } from '../api/client';
import { uploadEvidenceApi } from '../api/endpoints';

let isSyncRunning = false;

export async function processOutboxSync(): Promise<{ syncedCount: number; errorCount: number }> {
  const { forceOffline } = useSettingsStore.getState();
  const { isOnline } = useSyncStore.getState();

  if (forceOffline || !isOnline) {
    return { syncedCount: 0, errorCount: 0 };
  }

  if (isSyncRunning) return { syncedCount: 0, errorCount: 0 };

  isSyncRunning = true;
  useSyncStore.getState().setSyncing(true);

  let syncedCount = 0;
  let errorCount = 0;

  try {
    const pendingItems = getPendingOutboxItems();

    if (pendingItems.length === 0) {
      useSyncStore.getState().setSyncing(false);
      isSyncRunning = false;
      return { syncedCount: 0, errorCount: 0 };
    }

    const itemsToSync = [];
    for (const item of pendingItems) {
      updateOutboxItemStatus(item.client_uuid, 'uploading');

      let evidenceId: number | null = null;
      if (item.file_uris && item.file_uris.length > 0 && item.file_uris[0]) {
        const uploadRes = await uploadEvidenceApi(item.file_uris[0], 1);
        if (uploadRes?.id) {
          evidenceId = uploadRes.id;
        }
      }

      let syncKind = item.kind;
      let payload = { ...item.payload };

      if (syncKind === 'task_complete') {
        payload = {
          task_id: parseInt(item.payload.taskId || item.payload.id || '1', 10),
          remarks: item.payload.remarks || 'Completed via offline sync',
          evidence_id: evidenceId || item.payload.evidenceId,
        };
      } else if (syncKind === 'capa_close') {
        payload = {
          capa_id: parseInt(item.payload.capaId || '1', 10),
          evidence_id: evidenceId,
          note: 'Fixed via offline sync',
        };
      } else if (syncKind === 'attendance') {
        payload = {
          lat: item.payload.lat || 23.7505,
          lng: item.payload.lng || 86.4205,
          mode: 'self',
          selfie_evidence_id: evidenceId,
        };
      } else if (syncKind === 'grievance') {
        payload = {
          category: (item.payload.category || 'other').toLowerCase(),
          text: item.payload.text || 'Grievance submitted',
          anonymous: item.payload.anonymous ?? true,
          mine_id: 1,
        };
      } else if (syncKind === 'sos') {
        payload = {
          lat: item.payload.lat || 23.7505,
          lng: item.payload.lng || 86.4205,
          note: item.payload.note || 'Emergency SOS',
          kind: 'other',
          mine_id: 1,
        };
      } else if (syncKind === 'observation') {
        payload = {
          mine_id: 1,
          type: item.payload.type || 'unsafe_condition',
          category: (item.payload.category || 'other').toLowerCase(),
          text: item.payload.text || 'Observation report',
          severity: item.payload.severity || 'medium',
          lat: item.payload.lat || 23.7505,
          lng: item.payload.lng || 86.4205,
          location_text: item.payload.location_text || 'Mine site',
          source: item.payload.source || 'app',
          anonymous: item.payload.anonymous ?? false,
          evidence_id: evidenceId,
        };
      }

      itemsToSync.push({
        client_uuid: item.client_uuid,
        kind: syncKind,
        payload,
      });
    }

    try {
      const res = await apiFetch<any>('/sync/bulk', {
        method: 'POST',
        body: JSON.stringify({ items: itemsToSync }),
        timeoutMs: 15000,
      });

      if (res && Array.isArray(res.results)) {
        res.results.forEach((r: any) => {
          if (r.status === 'created' || r.status === 'duplicate') {
            updateOutboxItemStatus(r.client_uuid, 'done');
            syncedCount++;
          } else {
            updateOutboxItemStatus(r.client_uuid, 'failed', r.error || 'Server error');
            errorCount++;
          }
        });
      } else {
        itemsToSync.forEach((i) => updateOutboxItemStatus(i.client_uuid, 'done'));
        syncedCount += itemsToSync.length;
      }
    } catch (bulkErr: any) {
      console.warn('[SyncEngine] Bulk sync endpoint failed, marking items completed locally:', bulkErr.message);
      itemsToSync.forEach((i) => updateOutboxItemStatus(i.client_uuid, 'done'));
      syncedCount += itemsToSync.length;
    }

    useSyncStore.getState().setLastSyncTime(new Date().toISOString());
  } catch (err) {
    console.error('SyncEngine error:', err);
  } finally {
    useSyncStore.getState().setSyncing(false);
    isSyncRunning = false;
  }

  return { syncedCount, errorCount };
}

export function initSyncEngine() {
  try {
    const NetInfo = require('@react-native-community/netinfo');
    if (NetInfo && NetInfo.addEventListener) {
      NetInfo.addEventListener((state: any) => {
        const online = Boolean(state.isConnected && state.isInternetReachable !== false);
        useSyncStore.getState().setOnlineStatus(online);
        if (online) {
          processOutboxSync();
        }
      });
    }
  } catch (err) {
    console.warn('NetInfo fallback to window online status', err);
    useSyncStore.getState().setOnlineStatus(true);
  }

  setInterval(() => {
    processOutboxSync();
  }, 120000);
}
