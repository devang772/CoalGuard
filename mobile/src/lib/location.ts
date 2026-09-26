import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { useSettingsStore } from '../store/settings';
import { getActiveMine, MasterMine, useActiveMine } from '../store/master';
import { isPointInPolygon } from './geo';

export interface GeoFix {
  lat: number;
  lng: number;
  accuracy: number | null;
  isMocked: boolean;
  simulated: boolean;
}

// ~5.5 km north of the mine centre: clearly outside any mine boundary.
const OUTSIDE_OFFSET_DEG = 0.05;

async function readDeviceGps(): Promise<GeoFix | null> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') return null;

    let pos: Location.LocationObject | null = null;
    try {
      pos = await Promise.race([
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 12000)),
      ]);
    } catch {
      pos = null;
    }
    if (!pos && Platform.OS !== 'web') {
      pos = await Location.getLastKnownPositionAsync();
    }
    if (!pos) return null;

    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy != null ? Math.round(pos.coords.accuracy) : null,
      isMocked: Boolean(pos.mocked),
      simulated: false,
    };
  } catch (err) {
    console.warn('[location] GPS unavailable:', err);
    return null;
  }
}

/**
 * Current position. Uses the device GPS unless a demo override is picked in Settings
 * (inside / outside the mine boundary, or a fake-GPS flag), which is based on the real mine from the backend.
 */
export async function getCurrentFix(): Promise<GeoFix | null> {
  const sim = useSettingsStore.getState().locationSimulation;
  const mine = getActiveMine();
  if (sim !== 'real' && mine && mine.center.latitude != null) {
    const { latitude, longitude } = mine.center;
    if (sim === 'outside') {
      return { lat: latitude + OUTSIDE_OFFSET_DEG, lng: longitude, accuracy: 8, isMocked: false, simulated: true };
    }
    return { lat: latitude, lng: longitude, accuracy: 8, isMocked: sim === 'mock_gps', simulated: true };
  }
  return readDeviceGps();
}

export function isInsideMine(fix: GeoFix | null, mine: MasterMine | null): boolean {
  if (!fix || !mine || mine.boundary.length < 3) return false;
  return isPointInPolygon({ latitude: fix.lat, longitude: fix.lng }, mine.boundary);
}

/** Live position for screens that show GPS / geofence status. Refreshes every 15 s. */
export function useLiveLocation() {
  const mine = useActiveMine();
  const sim = useSettingsStore((s) => s.locationSimulation);
  const [fix, setFix] = useState<GeoFix | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const next = await getCurrentFix();
    setFix(next);
    setLoading(false);
    return next;
  }, []);

  useEffect(() => {
    let active = true;
    const run = async () => {
      const next = await getCurrentFix();
      if (active) {
        setFix(next);
        setLoading(false);
      }
    };
    run();
    const timer = setInterval(run, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [sim, mine?.id]);

  return { fix, mine, isInside: isInsideMine(fix, mine), loading, refresh };
}
