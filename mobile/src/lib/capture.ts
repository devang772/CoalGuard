import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { CaptureMeta, clearLastCapture, useSettingsStore } from '../store/settings';

/**
 * The photo taken with the in-app camera (/camera) for the current screen, with its GPS / time metadata.
 * Starts empty so a photo taken for another screen is never reused.
 */
export function useCapturedPhoto() {
  const [uri, setUri] = useState<string | null>(null);
  const [meta, setMeta] = useState<CaptureMeta | null>(null);

  useEffect(() => {
    clearLastCapture();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const { lastCapturedPhoto, lastCaptureMeta } = useSettingsStore.getState();
      if (lastCapturedPhoto) {
        setUri(lastCapturedPhoto);
        setMeta(lastCaptureMeta);
      }
    }, [])
  );

  const reset = useCallback(() => {
    clearLastCapture();
    setUri(null);
    setMeta(null);
  }, []);

  return { uri, meta, reset };
}
