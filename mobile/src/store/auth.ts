import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserRole } from '../lib/rbac';

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  org_unit_id: string;
  org_name?: string | null;
  org_type?: string | null;
  mine_id: string | null;
  mine_name: string | null;
  language: string;
}

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isAppLocked: boolean;
  hasOnboardedPermissions: boolean;
  selectedLanguage: string;
  hasHydrated: boolean;

  login: (user: UserProfile, token: string) => void;
  setUser: (user: UserProfile) => void;
  logout: () => void;
  setAppLocked: (locked: boolean) => void;
  setPermissionsOnboarded: (done: boolean) => void;
  setSelectedLanguage: (lang: string) => void;
}

/**
 * Seeded backend accounts behind the login screen's quick-login chips (password `demo123`).
 * They still go through the real POST /auth/login.
 */
export const DEMO_LOGINS: Record<'safety_officer' | 'mine_manager' | 'worker' | 'contractor_admin', string> = {
  safety_officer: '9000000007',
  mine_manager: '9000000004',
  worker: '9000000009',
  contractor_admin: '9000000006',
};
export const DEMO_PASSWORD = 'demo123';

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isAppLocked: false,
      hasOnboardedPermissions: false,
      selectedLanguage: 'hi',
      hasHydrated: false,

      login: (user, token) =>
        set({
          user,
          token,
          isAuthenticated: true,
          selectedLanguage: user.language || 'hi',
        }),

      setUser: (user) => set({ user }),

      logout: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isAppLocked: false,
        }),

      setAppLocked: (locked) => set({ isAppLocked: locked }),
      setPermissionsOnboarded: (done) => set({ hasOnboardedPermissions: done }),
      setSelectedLanguage: (lang) => set({ selectedLanguage: lang }),
    }),
    {
      name: 'netra-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        user: s.user,
        token: s.token,
        isAuthenticated: s.isAuthenticated,
        hasOnboardedPermissions: s.hasOnboardedPermissions,
        selectedLanguage: s.selectedLanguage,
      }),
      onRehydrateStorage: () => () => {
        useAuthStore.setState({ hasHydrated: true });
      },
    }
  )
);
