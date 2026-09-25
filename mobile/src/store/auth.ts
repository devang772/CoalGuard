import { create } from 'zustand';
import { UserRole } from '../lib/rbac';

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  org_unit_id: string;
  mine_id: string;
  mine_name: string;
  language: string;
}

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isAppLocked: boolean;
  hasOnboardedPermissions: boolean;
  selectedLanguage: string;

  login: (user: UserProfile, token: string) => void;
  logout: () => void;
  setAppLocked: (locked: boolean) => void;
  setPermissionsOnboarded: (done: boolean) => void;
  setSelectedLanguage: (lang: string) => void;
}

export const DEMO_USERS: Record<string, UserProfile> = {
  safety_officer: {
    id: 'usr-001',
    name: 'Ramesh Sharma',
    phone: '9876543210',
    role: 'safety_officer',
    org_unit_id: 'org-jh1',
    mine_id: 'mine-moonidih',
    mine_name: 'Moonidih UG',
    language: 'hi',
  },
  mine_manager: {
    id: 'usr-002',
    name: 'Amitabh Sen',
    phone: '9876543211',
    role: 'mine_manager',
    org_unit_id: 'org-jh1',
    mine_id: 'mine-moonidih',
    mine_name: 'Moonidih UG',
    language: 'en',
  },
  worker: {
    id: 'usr-003',
    name: 'Suresh Bauri',
    phone: '9876543212',
    role: 'worker',
    org_unit_id: 'org-jh1',
    mine_id: 'mine-moonidih',
    mine_name: 'Moonidih UG',
    language: 'hi',
  },
  contractor_admin: {
    id: 'usr-004',
    name: 'Rajesh Contractor',
    phone: '9876543213',
    role: 'contractor_admin',
    org_unit_id: 'org-jh1',
    mine_id: 'mine-moonidih',
    mine_name: 'Moonidih UG',
    language: 'en',
  },
};

export const useAuthStore = create<AuthState>((set) => ({
  user: DEMO_USERS.safety_officer, // Default demo user prefilled for hackathon demo speed
  token: 'mock-jwt-token-12345',
  isAuthenticated: true,
  isAppLocked: false,
  hasOnboardedPermissions: true,
  selectedLanguage: 'hi',

  login: (user, token) =>
    set({
      user,
      token,
      isAuthenticated: true,
      selectedLanguage: user.language || 'hi',
    }),

  logout: () =>
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    }),

  setAppLocked: (locked) => set({ isAppLocked: locked }),
  setPermissionsOnboarded: (done) => set({ hasOnboardedPermissions: done }),
  setSelectedLanguage: (lang) => set({ selectedLanguage: lang }),
}));
