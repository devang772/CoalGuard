import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'light' | 'dark';
export type FontSizeMode = 'normal' | 'large';
/** 'real' = device GPS. The other three are demo overrides picked in Settings. */
export type LocationSimulation = 'real' | 'inside' | 'outside' | 'mock_gps';

/** Where and when the last in-app photo was taken (sent with the upload for the Satya Proof checks). */
export interface CaptureMeta {
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  isMocked: boolean;
  deviceTime: string;
}

interface SettingsState {
  themeMode: ThemeMode;
  fontSizeMode: FontSizeMode;
  appLockEnabled: boolean;
  notificationSound: boolean;
  sosSmsNumber: string;
  locationSimulation: LocationSimulation;
  forceOffline: boolean;
  lastCapturedPhoto: string | null;
  lastCaptureMeta: CaptureMeta | null;

  setThemeMode: (mode: ThemeMode) => void;
  setFontSizeMode: (size: FontSizeMode) => void;
  setAppLockEnabled: (enabled: boolean) => void;
  setNotificationSound: (enabled: boolean) => void;
  setSosSmsNumber: (num: string) => void;
  setLocationSimulation: (sim: LocationSimulation) => void;
  setForceOffline: (offline: boolean) => void;
  setLastCapturedPhoto: (photo: string | null, meta?: CaptureMeta | null) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themeMode: 'light',
      fontSizeMode: 'normal',
      appLockEnabled: false,
      notificationSound: true,
      sosSmsNumber: '+919800001122',
      locationSimulation: 'real',
      forceOffline: false,
      lastCapturedPhoto: null,
      lastCaptureMeta: null,

      setThemeMode: (themeMode) => set({ themeMode }),
      setFontSizeMode: (fontSizeMode) => set({ fontSizeMode }),
      setAppLockEnabled: (appLockEnabled) => set({ appLockEnabled }),
      setNotificationSound: (notificationSound) => set({ notificationSound }),
      setSosSmsNumber: (sosSmsNumber) => set({ sosSmsNumber }),
      setLocationSimulation: (locationSimulation) => set({ locationSimulation }),
      setForceOffline: (forceOffline) => set({ forceOffline }),
      setLastCapturedPhoto: (lastCapturedPhoto, meta = null) =>
        set({ lastCapturedPhoto, lastCaptureMeta: lastCapturedPhoto ? meta : null }),
    }),
    {
      name: 'netra-settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        themeMode: s.themeMode,
        fontSizeMode: s.fontSizeMode,
        appLockEnabled: s.appLockEnabled,
        notificationSound: s.notificationSound,
        sosSmsNumber: s.sosSmsNumber,
        locationSimulation: s.locationSimulation,
        forceOffline: s.forceOffline,
      }),
    }
  )
);

/** Clears the shared "last photo" so a screen only picks up a photo taken for it. */
export function clearLastCapture() {
  useSettingsStore.getState().setLastCapturedPhoto(null);
}
