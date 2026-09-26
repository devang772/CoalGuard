import { create } from "zustand";
import { setAuthToken, type BackendUser } from "@/lib/api";

export type UserRole = string;
export interface UserSession { id: string; name: string; role: UserRole; phone: string; orgUnit: string; subsidiary: string; mineId: number | null; }
export interface NotificationItem { id: string; title: string; body: string; level: "info" | "warning" | "critical"; link?: string; read: boolean; createdAt: string; }
export interface AppState {
  isAuthenticated: boolean; accessToken: string | null; user: UserSession | null;
  loginUser: (token: string, backendUser: BackendUser) => void; logoutUser: () => void;
  selectedSubsidiary: string; selectedArea: string; selectedMine: string;
  setScope: (subsidiary: string, area: string, mine: string) => void;
  language: "en" | "hi"; setLanguage: (lang: "en" | "hi") => void;
  notifications: NotificationItem[]; setNotifications: (items: NotificationItem[]) => void;
  addNotification: (n: NotificationItem) => void; markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void; unreadCount: () => number;
  isAskNetraOpen: boolean; setAskNetraOpen: (open: boolean) => void;
}

function toSession(user: BackendUser): UserSession {
  return { id: String(user.id), name: user.name, role: user.role, phone: user.phone, orgUnit: user.org_name, subsidiary: user.org_name, mineId: user.mine_id };
}
function loadPersistedAuth(): Pick<AppState, "isAuthenticated" | "accessToken" | "user"> {
  if (typeof window === "undefined") return { isAuthenticated: false, accessToken: null, user: null };
  try {
    const accessToken = localStorage.getItem("coalguard_access_token");
    const savedUser = localStorage.getItem("coalguard_user");
    if (accessToken && savedUser) return { isAuthenticated: true, accessToken, user: JSON.parse(savedUser) as UserSession };
  } catch { /* remove corrupt browser-only state */ }
  localStorage.removeItem("coalguard_access_token");
  localStorage.removeItem("coalguard_user");
  return { isAuthenticated: false, accessToken: null, user: null };
}
const persisted = loadPersistedAuth();

export const useAppStore = create<AppState>((set, get) => ({
  ...persisted,
  loginUser: (token, backendUser) => {
    const user = toSession(backendUser);
    setAuthToken(token); localStorage.setItem("coalguard_user", JSON.stringify(user));
    set({ isAuthenticated: true, accessToken: token, user });
  },
  logoutUser: () => { setAuthToken(null); localStorage.removeItem("coalguard_user"); set({ isAuthenticated: false, accessToken: null, user: null, notifications: [] }); },
  selectedSubsidiary: "ALL", selectedArea: "ALL", selectedMine: "ALL",
  setScope: (selectedSubsidiary, selectedArea, selectedMine) => set({ selectedSubsidiary, selectedArea, selectedMine }),
  language: "en", setLanguage: (language) => set({ language }),
  notifications: [], setNotifications: (notifications) => set({ notifications }),
  addNotification: (n) => set((state) => ({ notifications: [n, ...state.notifications] })),
  markNotificationRead: (id) => set((state) => ({ notifications: state.notifications.map((n) => n.id === id ? { ...n, read: true } : n) })),
  markAllNotificationsRead: () => set((state) => ({ notifications: state.notifications.map((n) => ({ ...n, read: true })) })),
  unreadCount: () => get().notifications.filter((n) => !n.read).length,
  isAskNetraOpen: false, setAskNetraOpen: (isAskNetraOpen) => set({ isAskNetraOpen }),
}));
