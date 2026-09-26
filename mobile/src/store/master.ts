import { create } from 'zustand';
import { apiFetch } from '../api/client';
import { getCachedMasterData, setCachedMasterData } from '../offline/masterCache';
import { LocationPoint } from '../lib/geo';
import { useAuthStore } from './auth';

export interface MasterMine {
  id: number;
  name: string;
  code: string | null;
  mine_type: string | null;
  boundary: LocationPoint[];
  center: LocationPoint;
}

export interface MasterChecklist {
  id: number;
  name: string;
  mine_type: string | null;
  items: { id: string; text: string; category: string }[];
}

export interface MasterWorker {
  id: number;
  name: string;
  contractor_id: number;
  contractor_name: string;
  mine_id: number;
  training_status: string;
  medical_status: string;
}

interface MasterPack {
  mines: MasterMine[];
  checklists: MasterChecklist[];
  workers: MasterWorker[];
  server_time: string | null;
}

interface MasterState extends MasterPack {
  loaded: boolean;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  reset: () => void;
}

const CACHE_KEY = 'master_pack';
const EMPTY: MasterPack = { mines: [], checklists: [], workers: [], server_time: null };

/** GeoJSON Polygon / MultiPolygon → outer ring as lat/lng points. */
function toRing(boundary: any): LocationPoint[] {
  if (!boundary || !boundary.coordinates) return [];
  const ring = boundary.type === 'MultiPolygon' ? boundary.coordinates[0]?.[0] : boundary.coordinates[0];
  return (ring || []).map((p: number[]) => ({ latitude: p[1], longitude: p[0] }));
}

function parsePack(data: any): MasterPack {
  return {
    mines: (data.mines || []).map((m: any) => ({
      id: m.id,
      name: m.name,
      code: m.code ?? null,
      mine_type: m.mine_type ?? null,
      boundary: toRing(m.boundary),
      center: { latitude: m.center_lat, longitude: m.center_lng },
    })),
    checklists: data.checklists || [],
    workers: data.workers || [],
    server_time: data.server_time || null,
  };
}

export const useMasterStore = create<MasterState>((set, get) => ({
  ...EMPTY,
  loaded: false,
  loading: false,
  error: null,

  load: async () => {
    if (get().loading) return;
    set({ loading: true, error: null });
    try {
      const data = await apiFetch<any>('/sync/master', { timeoutMs: 20000 });
      const pack = parsePack(data);
      setCachedMasterData(CACHE_KEY, pack);
      set({ ...pack, loaded: true, loading: false });
    } catch (err: any) {
      // Offline: fall back to the last downloaded pack.
      const cached = getCachedMasterData<MasterPack>(CACHE_KEY);
      set({ ...(cached || EMPTY), loaded: Boolean(cached), loading: false, error: err.message });
    }
  },

  reset: () => set({ ...EMPTY, loaded: false, error: null }),
}));

/** The mine the user works at (their own mine, else the first mine in their area). */
export function getActiveMine(): MasterMine | null {
  const { mines } = useMasterStore.getState();
  const mineId = useAuthStore.getState().user?.mine_id;
  if (mineId) {
    const own = mines.find((m) => String(m.id) === String(mineId));
    if (own) return own;
  }
  return mines[0] || null;
}

export function useActiveMine(): MasterMine | null {
  const mines = useMasterStore((s) => s.mines);
  const mineId = useAuthStore((s) => s.user?.mine_id);
  return mines.find((m) => String(m.id) === String(mineId)) || mines[0] || null;
}

/** Mine id to send with uploads / reports. */
export function getActiveMineId(): number | null {
  const mine = getActiveMine();
  if (mine) return mine.id;
  const mineId = useAuthStore.getState().user?.mine_id;
  return mineId ? Number(mineId) : null;
}
