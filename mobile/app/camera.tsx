import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { compressAndWatermarkPhoto } from '../src/lib/evidence';
import { useSettingsStore } from '../src/store/settings';
import { colors } from '../src/theme/colors';

export default function CameraScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { locationSimulation } = useSettingsStore();

  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState(8);

  const isInside = locationSimulation === 'inside';
  const isMocked = locationSimulation === 'mock_gps';
  const ghostOverlay = params.ghostUri as string;

  const mockLat = 23.7505;
  const mockLng = 86.4205;

  const handleCapture = async () => {
    setIsProcessing(true);
    // Simulated in-app capture photo URI
    const mockUri = 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=800';
    const compressed = await compressAndWatermarkPhoto(mockUri, {
      latitude: mockLat,
      longitude: mockLng,
      accuracy: gpsAccuracy,
      deviceTime: new Date().toISOString(),
      deviceId: 'DEV-ANDROID-NETRA-01',
      isMocked,
      mineName: 'Moonidih UG',
      userName: 'Ramesh Sharma',
    });
    setCapturedUri(compressed);
    setIsProcessing(false);
  };

  const handleConfirmPhoto = () => {
    // Navigate back to calling route with camera evidence result
    router.back();
  };

  return (
    <View style={styles.container}>
      {/* Top Satya Proof Metadata Overlay */}
      <View style={styles.topOverlay}>
        <View style={styles.overlayRow}>
          <Feather name="clock" size={14} color={colors.safetyAmber} />
          <Text style={styles.overlayText}>{new Date().toLocaleTimeString()} IST</Text>
        </View>
        <View style={styles.overlayRow}>
          <Feather name="map-pin" size={14} color={colors.safetyAmber} />
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

      {/* Camera Viewfinder Mock */}
      <View style={styles.viewfinder}>
        {capturedUri ? (
          <Image source={{ uri: capturedUri }} style={styles.previewImage} resizeMode="cover" />
        ) : (
          <View style={styles.mockLens}>
            {ghostOverlay && (
              <Image source={{ uri: ghostOverlay }} style={[styles.previewImage, { opacity: 0.35 }]} />
            )}
            <View style={styles.reticle} />
            <Text style={styles.viewfinderHint}>
              {ghostOverlay ? 'Ghost Overlay Active · Align Before-Photo Scene' : 'Satya Proof Camera · Frame Hazard Scene'}
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
              <Feather name="check" size={20} color="#0F172A" />
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
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 14,
    padding: 12,
    zIndex: 10,
    gap: 6,
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
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  mockLens: {
    flex: 1,
    width: '100%',
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reticle: {
    width: 240,
    height: 240,
    borderWidth: 2,
    borderColor: colors.safetyAmber,
    borderRadius: 16,
    borderStyle: 'dashed',
  },
  viewfinderHint: {
    color: '#94A3B8',
    fontSize: 14,
    marginTop: 20,
    fontWeight: '600',
  },
  bottomControls: {
    padding: 30,
    backgroundColor: 'rgba(0,0,0,0.9)',
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
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: colors.safetyAmber,
  },
  confirmRow: {
    flexDirection: 'row',
    gap: 16,
  },
  retakeBtn: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    backgroundColor: '#334155',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
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
    backgroundColor: colors.safetyAmber,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  useText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '800',
  },
});
