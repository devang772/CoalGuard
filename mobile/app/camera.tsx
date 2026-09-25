import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { compressAndWatermarkPhoto } from '../src/lib/evidence';
import { useSettingsStore } from '../src/store/settings';
import { colors } from '../src/theme/colors';

export default function CameraScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { locationSimulation, setLastCapturedPhoto } = useSettingsStore();

  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState(8);
  const [hasWebcamPermission, setHasWebcamPermission] = useState<boolean | null>(null);

  const videoRef = useRef<any>(null);
  const streamRef = useRef<any>(null);

  const isInside = locationSimulation === 'inside';
  const isMocked = locationSimulation === 'mock_gps';
  const ghostOverlay = params.ghostUri as string;

  const mockLat = 23.7505;
  const mockLng = 86.4205;

  useEffect(() => {
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.mediaDevices) {
      navigator.mediaDevices
        .getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' } })
        .then((stream) => {
          streamRef.current = stream;
          setHasWebcamPermission(true);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
        })
        .catch((err) => {
          console.warn('[Camera] PC Webcam access error:', err);
          setHasWebcamPermission(false);
        });
    }

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track: any) => track.stop());
      }
    };
  }, []);

  const handleCapture = async () => {
    setIsProcessing(true);
    let rawUri = 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=800';

    if (Platform.OS === 'web' && videoRef.current && hasWebcamPermission) {
      try {
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          rawUri = canvas.toDataURL('image/jpeg', 0.85);
        }
      } catch (e) {
        console.warn('[Camera] Canvas snapshot error:', e);
      }
    }

    const compressed = await compressAndWatermarkPhoto(rawUri, {
      latitude: mockLat,
      longitude: mockLng,
      accuracy: gpsAccuracy,
      deviceTime: new Date().toISOString(),
      deviceId: Platform.OS === 'web' ? 'DEV-PC-WEBCAM-01' : 'DEV-MOBILE-NETRA-01',
      isMocked,
      mineName: 'Moonidih UG',
      userName: 'Ramesh Sharma',
    });

    setCapturedUri(compressed);
    setLastCapturedPhoto(compressed);
    setIsProcessing(false);
  };

  const handleConfirmPhoto = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      {/* Top Satya Proof Metadata Overlay */}
      <View style={styles.topOverlay}>
        <View style={styles.overlayRow}>
          <Feather name="clock" size={14} color={colors.emerald} />
          <Text style={styles.overlayText}>{new Date().toLocaleTimeString()} IST</Text>
        </View>
        <View style={styles.overlayRow}>
          <Feather name="map-pin" size={14} color={colors.emerald} />
          <Text style={styles.overlayText}>
            {mockLat.toFixed(4)} N, {mockLng.toFixed(4)} E (±{gpsAccuracy}m)
          </Text>
        </View>
        <View style={styles.overlayRow}>
          <Feather name="shield" size={14} color={isInside ? colors.success : colors.danger} />
          <Text style={[styles.overlayText, { color: isInside ? colors.success : colors.danger }]}>
            Moonidih UG · {isInside ? 'Inside Mine ✓' : 'Outside Boundary ⚠'}
          </Text>
        </View>
      </View>

      {/* Camera Viewfinder */}
      <View style={styles.viewfinder}>
        {capturedUri ? (
          <Image source={{ uri: capturedUri }} style={styles.previewImage} resizeMode="cover" />
        ) : (
          <View style={styles.mockLens}>
            {Platform.OS === 'web' && (
              <video
                ref={(el) => {
                  videoRef.current = el;
                  if (el && streamRef.current) {
                    el.srcObject = streamRef.current;
                    el.play().catch(() => {});
                  }
                }}
                autoPlay
                playsInline
                muted
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            )}
            {ghostOverlay && (
              <Image source={{ uri: ghostOverlay }} style={[styles.previewImage, { opacity: 0.35, position: 'absolute' }]} />
            )}
            <View style={styles.reticle} />
            <Text style={styles.viewfinderHint}>
              {ghostOverlay
                ? 'Ghost Overlay Active · Align Before-Photo Scene'
                : hasWebcamPermission === false
                ? 'PC Webcam Blocked · Using Satya Fallback Camera'
                : 'Satya Proof PC Camera Active · Frame Hazard / Selfie'}
            </Text>
          </View>
        )}
      </View>

      {/* Bottom Controls */}
      <View style={styles.bottomControls}>
        {capturedUri ? (
          <View style={styles.confirmRow}>
            <TouchableOpacity style={styles.retakeBtn} onPress={() => setCapturedUri(null)}>
              <Feather name="rotate-ccw" size={20} color="#FFF" />
              <Text style={styles.retakeText}>Retake</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.useBtn} onPress={handleConfirmPhoto}>
              <Feather name="check" size={20} color="#05080A" />
              <Text style={styles.useText}>Use Photo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.captureRow}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()}>
              <Feather name="x" size={24} color="#FFF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.triggerCircle} onPress={handleCapture} disabled={isProcessing}>
              <View style={styles.triggerInner} />
            </TouchableOpacity>

            <View style={{ width: 44 }} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  topOverlay: {
    position: 'absolute',
    top: 40,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(13, 21, 24, 0.9)',
    borderRadius: 14,
    padding: 12,
    zIndex: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#1A2B26',
  },
  overlayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  overlayText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  viewfinder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  mockLens: {
    flex: 1,
    width: '100%',
    backgroundColor: '#05080A',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  reticle: {
    width: 240,
    height: 240,
    borderWidth: 2,
    borderColor: colors.emerald,
    borderRadius: 16,
    borderStyle: 'dashed',
    zIndex: 2,
  },
  viewfinderHint: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 20,
    fontWeight: '600',
    zIndex: 2,
    backgroundColor: 'rgba(5, 8, 10, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  bottomControls: {
    padding: 30,
    backgroundColor: 'rgba(5, 8, 10, 0.95)',
    zIndex: 10,
  },
  captureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#131F24',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1A2B26',
  },
  triggerCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  triggerInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.emerald,
  },
  confirmRow: {
    flexDirection: 'row',
    gap: 16,
  },
  retakeBtn: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#131F24',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#1A2B26',
  },
  retakeText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  useBtn: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.emerald,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  useText: {
    color: '#05080A',
    fontSize: 16,
    fontWeight: '800',
  },
});
