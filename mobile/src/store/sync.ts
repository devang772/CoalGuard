import { create } from 'zustand';

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
  lastSyncTime: string | null;

  setOnlineStatus: (online: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  setCounts: (pending: number, failed: number) => void;
  setLastSyncTime: (time: string) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  failedCount: 0,
  lastSyncTime: new Date().toISOString(),

  setOnlineStatus: (isOnline) => set({ isOnline }),
  setSyncing: (isSyncing) => set({ isSyncing }),
  setCounts: (pendingCount, failedCount) => set({ pendingCount, failedCount }),
  setLastSyncTime: (lastSyncTime) => set({ lastSyncTime }),
}));
