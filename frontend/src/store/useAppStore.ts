import { create } from "zustand";
import { setAuthToken } from "@/lib/api";

export type UserRole =
  | "cil_admin"
  | "subsidiary_admin"
  | "area_gm"
  | "mine_manager"
  | "safety_officer"
  | "regulator"
  | "contractor_admin"
  | "supervisor"
  | "worker";

export interface UserSession {
  id: string;
  name: string;
  role: UserRole;
  phone: string;
  orgUnit: string;
  subsidiary: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  level: "info" | "warning" | "critical";
  link?: string;
  read: boolean;
  createdAt: string;
}

export interface AppState {
  // Session & Auth
  isAuthenticated: boolean;
  accessToken: string | null;
  user: UserSession;
  loginUser: (token: string, backendUser: BackendUser) => void;
  logoutUser: () => void;
  setUserRole: (role: UserRole) => void;

  // Scope Hierarchy Switcher
  selectedSubsidiary: string;
  selectedArea: string;
  selectedMine: string;
  setScope: (subsidiary: string, area: string, mine: string) => void;

  // Language & UI
  language: "en" | "hi";
  setLanguage: (lang: "en" | "hi") => void;

  // Audit Chain Toggle for Demo
  isChainBroken: boolean;
  setChainBroken: (broken: boolean) => void;

  // Live Notifications
  notifications: NotificationItem[];
  addNotification: (n: NotificationItem) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  unreadCount: () => number;

  // Floating Netra Assistant state
  isAskNetraOpen: boolean;
  setAskNetraOpen: (open: boolean) => void;
}

/** Shape of the user object returned by the backend */
export interface BackendUser {
  id: number;
  name: string;
  phone: string;
  role: string;
  language: string;
  org_unit_id: number;
  org_name: string;
  org_type: string;
  mine_id: number | null;
  mine_name: string | null;
}

const mockUsers: Record<string, UserSession> = {
  cil_admin: {
    id: "usr-01",
    name: "Shri Rajesh Verma",
    role: "cil_admin",
    phone: "9000000001",
    orgUnit: "CIL Corporate Headquarters, Kolkata",
    subsidiary: "All Subsidiaries",
  },
  subsidiary_admin: {
    id: "usr-02",
    name: "Er. A. K. Choudhary",
    role: "subsidiary_admin",
    phone: "9000000002",
    orgUnit: "BCCL HQ, Dhanbad",
    subsidiary: "BCCL",
  },
  area_gm: {
    id: "usr-03",
    name: "Shri P. K. Mishra",
    role: "area_gm",
    phone: "9000000003",
    orgUnit: "Jharia Area IX Office",
    subsidiary: "BCCL",
  },
  mine_manager: {
    id: "usr-04",
    name: "Er. Somnath Mukherjee",
    role: "mine_manager",
    phone: "9000000004",
    orgUnit: "Kusunda Opencast Mine",
    subsidiary: "BCCL",
  },
  safety_officer: {
    id: "usr-05",
    name: "Sub-Inspector Devang Sharma",
    role: "safety_officer",
    phone: "9000000005",
    orgUnit: "Moonidih Shaft Safety Wing",
    subsidiary: "BCCL",
  },
  regulator: {
    id: "usr-06",
    name: "Director S. K. Roy (DGMS)",
    role: "regulator",
    phone: "9000000006",
    orgUnit: "DGMS Eastern Zone Region 1",
    subsidiary: "All Subsidiaries",
  },
  contractor_admin: {
    id: "usr-07",
    name: "M/s Eastern Infra Ltd (Sunil Agarwal)",
    role: "contractor_admin",
    phone: "9000000007",
    orgUnit: "Contractor License #MCL-2024-991",
    subsidiary: "BCCL",
  },
};

const initialNotifications: NotificationItem[] = [
  {
    id: "notif-1",
    title: "Critical InSAR Displacement Alert",
    body: "Radar InSAR detected 4.2mm tension movement on West Bench 4 at Kusunda OCP.",
    level: "critical",
    link: "/dashboard",
    read: false,
    createdAt: "5 mins ago",
  },
  {
    id: "notif-2",
    title: "Ghost Worker Fraud Alert",
    body: "5 contractor workers logged gate entry from same device ID (A1B2-X9).",
    level: "warning",
    link: "/contractors",
    read: false,
    createdAt: "18 mins ago",
  },
  {
    id: "notif-3",
    title: "CAPA Closure Verification Rejected",
    body: "CAPA #CAPA-881 photo rejected: After-photo location 412m away from hazard.",
    level: "warning",
    link: "/inspections",
    read: false,
    createdAt: "42 mins ago",
  },
];

function backendUserToSession(bu: BackendUser): UserSession {
  return {
    id: String(bu.id),
    name: bu.name,
    role: bu.role as UserRole,
    phone: bu.phone,
    orgUnit: bu.org_name,
    subsidiary: bu.org_type === "cil" ? "All Subsidiaries" : bu.org_name,
  };
}

/** Read persisted auth from localStorage on load */
function loadPersistedAuth(): { isAuthenticated: boolean; accessToken: string | null; user: UserSession } {
  try {
    const token = localStorage.getItem("coalguard_access_token");
    const userJson = localStorage.getItem("coalguard_user");
    if (token && userJson) {
      const user = JSON.parse(userJson) as UserSession;
      return { isAuthenticated: true, accessToken: token, user };
    }
  } catch {
    // corrupt data — clear it
    localStorage.removeItem("coalguard_access_token");
    localStorage.removeItem("coalguard_user");
  }
  return { isAuthenticated: false, accessToken: null, user: mockUsers["cil_admin"] };
}

const persisted = loadPersistedAuth();

export const useAppStore = create<AppState>((set, get) => ({
  isAuthenticated: persisted.isAuthenticated,
  accessToken: persisted.accessToken,
  user: persisted.user,

  loginUser: (token, backendUser) => {
    const user = backendUserToSession(backendUser);
    setAuthToken(token);
    localStorage.setItem("coalguard_user", JSON.stringify(user));
    set({ isAuthenticated: true, accessToken: token, user });
  },

  logoutUser: () => {
    setAuthToken(null);
    localStorage.removeItem("coalguard_user");
    set({ isAuthenticated: false, accessToken: null, user: mockUsers["cil_admin"] });
  },

  setUserRole: (role) => {
    const mock = mockUsers[role];
    if (mock) set({ user: mock });
  },

  selectedSubsidiary: "ALL",
  selectedArea: "ALL",
  selectedMine: "ALL",
  setScope: (subsidiary, area, mine) =>
    set({
      selectedSubsidiary: subsidiary,
      selectedArea: area,
      selectedMine: mine,
    }),

  language: "en",
  setLanguage: (lang) => set({ language: lang }),

  isChainBroken: false,
  setChainBroken: (broken) => set({ isChainBroken: broken }),

  notifications: initialNotifications,
  addNotification: (n) =>
    set((state) => ({ notifications: [n, ...state.notifications] })),
  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),
  markAllNotificationsRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
    })),
  unreadCount: () => get().notifications.filter((n) => !n.read).length,

  isAskNetraOpen: false,
  setAskNetraOpen: (open) => set({ isAskNetraOpen: open }),
}));
