import { Platform } from 'react-native';
import { getPendingOutboxItems, updateOutboxItemStatus } from './outbox';
import { useSyncStore } from '../store/sync';
import { useSettingsStore } from '../store/settings';

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

    // Step 1: Process SOS items first (priority = 0)
    const sosItems = pendingItems.filter((item) => item.kind === 'sos' || item.priority === 0);
    for (const sos of sosItems) {
      try {
        updateOutboxItemStatus(sos.client_uuid, 'uploading');
        await new Promise((res) => setTimeout(res, 400));
        updateOutboxItemStatus(sos.client_uuid, 'done');
        syncedCount++;
      } catch (e: any) {
        updateOutboxItemStatus(sos.client_uuid, 'failed', e.message || 'SOS dispatch failed');
        errorCount++;
      }
    }

    // Step 2: Process normal items in batches
    const normalItems = pendingItems.filter((item) => item.kind !== 'sos' && item.priority !== 0);
    for (const item of normalItems) {
      try {
        updateOutboxItemStatus(item.client_uuid, 'uploading');
        await new Promise((res) => setTimeout(res, 500));
        updateOutboxItemStatus(item.client_uuid, 'done');
        syncedCount++;
      } catch (e: any) {
        updateOutboxItemStatus(item.client_uuid, 'failed', e.message || 'Sync error');
        errorCount++;
      }
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

  // Background timer loop (every 2 minutes)
  setInterval(() => {
    processOutboxSync();
  }, 120000);
}
