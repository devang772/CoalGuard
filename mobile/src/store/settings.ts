import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark';
export type FontSizeMode = 'normal' | 'large';
export type LocationSimulation = 'inside' | 'outside' | 'mock_gps';

interface SettingsState {
  themeMode: ThemeMode;
  fontSizeMode: FontSizeMode;
  appLockEnabled: boolean;
  notificationSound: boolean;
  sosSmsNumber: string;
  locationSimulation: LocationSimulation;
  forceOffline: boolean;

  setThemeMode: (mode: ThemeMode) => void;
  setFontSizeMode: (size: FontSizeMode) => void;
  setAppLockEnabled: (enabled: boolean) => void;
  setNotificationSound: (enabled: boolean) => void;
  setSosSmsNumber: (num: string) => void;
  setLocationSimulation: (sim: LocationSimulation) => void;
  setForceOffline: (offline: boolean) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  themeMode: 'light',
  fontSizeMode: 'normal',
  appLockEnabled: false,
  notificationSound: true,
  sosSmsNumber: '+919800001122',
  locationSimulation: 'inside', // Default: inside Moonidih UG
  forceOffline: false,

  setThemeMode: (themeMode) => set({ themeMode }),
  setFontSizeMode: (fontSizeMode) => set({ fontSizeMode }),
  setAppLockEnabled: (appLockEnabled) => set({ appLockEnabled }),
  setNotificationSound: (notificationSound) => set({ notificationSound }),
  setSosSmsNumber: (sosSmsNumber) => set({ sosSmsNumber }),
  setLocationSimulation: (locationSimulation) => set({ locationSimulation }),
  setForceOffline: (forceOffline) => set({ forceOffline }),
}));
