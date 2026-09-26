import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { closeCapaApi, fetchCapaApi } from '../../../src/api/endpoints';
import { useApi } from '../../../src/lib/useApi';
import { useCapturedPhoto } from '../../../src/lib/capture';
import { useLiveLocation } from '../../../src/lib/location';
import { getDistanceMeters } from '../../../src/lib/geo';
import { DistanceMeter } from '../../../src/components/DistanceMeter';
import { BeforeAfterView } from '../../../src/components/BeforeAfterView';
import { ResultChecklist, CheckResult } from '../../../src/components/ResultChecklist';
import { BigButton } from '../../../src/components/BigButton';
import { colors } from '../../../src/theme/colors';

// Demo override for the before/after same-spot check: live GPS, or pretend to stand at / 412 m from the spot.
type SpotMode = 'live' | 'near' | 'far';
const FAR_OFFSET_DEG = 0.0037; // ≈ 412 m north

export default function CapaCloseScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const capaQuery = useApi(() => fetchCapaApi(String(id)), [id]);
  const capa = capaQuery.data;
  const { fix } = useLiveLocation();

  const { uri: afterPhotoUri, meta: afterMeta } = useCapturedPhoto();
  const [spotMode, setSpotMode] = useState<SpotMode>('live');
  const [verificationResult, setVerificationResult] = useState<{
    passed: boolean;
    checks: CheckResult[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  if (!capa) {
    return (
      <View style={[styles.container, { flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
        {capaQuery.loading ? (
          <ActivityIndicator size="large" color={colors.emerald} />
        ) : (
          <Text style={{ color: colors.textSecondary }}>{capaQuery.error || 'CAPA not found'}</Text>
        )}
      </View>
    );
  }

  const target =
    capa.before_photo.lat != null && capa.before_photo.lng != null
      ? { latitude: capa.before_photo.lat, longitude: capa.before_photo.lng }
      : null;

  // Where the after-photo is (or will be) taken, depending on the demo override.
  const spotFor = (live: { lat: number | null; lng: number | null } | null) => {
    if (target && spotMode === 'near') return { lat: target.latitude, lng: target.longitude };
    if (target && spotMode === 'far') return { lat: target.latitude + FAR_OFFSET_DEG, lng: target.longitude };
    return live;
  };

  const currentSpot = spotFor(fix ? { lat: fix.lat, lng: fix.lng } : null);
  const distanceMeters =
    target && currentSpot?.lat != null && currentSpot?.lng != null
      ? getDistanceMeters({ latitude: currentSpot.lat, longitude: currentSpot.lng }, target)
      : null;

  const toggleSimulatedDistance = () => {
    setSpotMode((m) => (m === 'live' ? 'near' : m === 'near' ? 'far' : 'live'));
  };

  const handleCaptureAfterPhoto = () => {
    setVerificationResult(null);
    router.push({
      pathname: '/camera' as any,
      params: { ghostUri: capa.before_photo.url },
    });
  };

  const handleSubmitClosure = async () => {
    if (!afterPhotoUri) {
      Alert.alert('Photo Required', 'Please capture the After-Photo proof at the hazard spot.');
      return;
    }

    setLoading(true);
    try {
      const spot = spotFor(afterMeta ? { lat: afterMeta.lat, lng: afterMeta.lng } : null);
      const meta = afterMeta
        ? { ...afterMeta, lat: spot?.lat ?? null, lng: spot?.lng ?? null }
        : null;
      const res = await closeCapaApi(capa.id, afterPhotoUri, meta);

      if (res.queued || !res.data) {
        Alert.alert(
          'Saved Offline',
          'No network. The after-photo and closure request are in the outbox; the server will verify them when it syncs.'
        );
        return;
      }

      setVerificationResult({
        passed: res.data.passed,
        checks: res.data.checks,
      });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>CAPA Closure Verification</Text>
      <Text style={styles.subTitle}>Satya Proof Before/After Location Matching</Text>

      {/* Dev Toggle for Rejection Demo */}
      <TouchableOpacity style={styles.devToggle} onPress={toggleSimulatedDistance}>
        <Text style={styles.devToggleText}>
          ⚡ Demo Simulator:{' '}
          {spotMode === 'far'
            ? '🔴 412m Far (Fails)'
            : spotMode === 'near'
            ? '🟢 At the Right Spot (Passes)'
            : '📍 Live GPS'}{' '}
          (Tap to switch)
        </Text>
      </TouchableOpacity>

      {/* Live Distance Meter */}
      {distanceMeters != null ? (
        <DistanceMeter distanceMeters={distanceMeters} />
      ) : (
        <Text style={styles.subTitle}>{target ? 'Acquiring GPS…' : 'No GPS point recorded for the before-photo.'}</Text>
      )}

      {/* Side-by-side Before/After Preview */}
      <BeforeAfterView beforeUri={capa.before_photo.url} afterUri={afterPhotoUri || undefined} />

      {!afterPhotoUri ? (
        <BigButton
          title="Capture After-Photo (with Ghost Overlay) 📷"
          onPress={handleCaptureAfterPhoto}
          style={{ marginVertical: 14 }}
        />
      ) : (
        <>
          <BigButton
            title="Submit CAPA Closure for Verification"
            onPress={handleSubmitClosure}
            loading={loading}
            style={{ marginVertical: 10 }}
          />

          <TouchableOpacity style={styles.retakeBtn} onPress={handleCaptureAfterPhoto}>
            <Text style={styles.retakeText}>Retake After-Photo</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Server Pass/Fail Verification Result */}
      {verificationResult && (
        <View style={styles.resultBox}>
          <Text style={[styles.resultTitle, { color: verificationResult.passed ? colors.success : colors.danger }]}>
            {verificationResult.passed
              ? '✅ Closure Approved & Sent to Mine Manager'
              : '❌ Closure Rejected by Satya Verification'}
          </Text>

          <ResultChecklist checks={verificationResult.checks} />

          {verificationResult.passed && (
            <BigButton
              title="Return to Dashboard ✓"
              onPress={() => router.replace('/(tabs)/home')}
              variant="success"
              style={{ marginTop: 10 }}
            />
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: colors.background,
    minHeight: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  subTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 10,
    marginTop: 2,
  },
  devToggle: {
    backgroundColor: '#131F24',
    padding: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  devToggleText: {
    color: colors.emerald,
    fontSize: 13,
    fontWeight: '800',
  },
  retakeBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  retakeText: {
    color: colors.emerald,
    fontSize: 14,
    fontWeight: '700',
  },
  resultBox: {
    marginTop: 16,
    padding: 16,
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
  },
});
