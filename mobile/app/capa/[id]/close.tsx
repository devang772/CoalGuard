import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { MOCK_CAPAS } from '../../../src/api/mock/data';
import { closeCapaApi } from '../../../src/api/endpoints';
import { useSettingsStore } from '../../../src/store/settings';
import { DistanceMeter } from '../../../src/components/DistanceMeter';
import { BeforeAfterView } from '../../../src/components/BeforeAfterView';
import { ResultChecklist, CheckResult } from '../../../src/components/ResultChecklist';
import { BigButton } from '../../../src/components/BigButton';
import { colors } from '../../../src/theme/colors';

export default function CapaCloseScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const capa = MOCK_CAPAS.find((c) => c.id === id) || MOCK_CAPAS[0];

  const [afterPhotoUri, setAfterPhotoUri] = useState<string | null>(null);
  const [distanceMeters, setDistanceMeters] = useState(12); // Default 12m for pass demo
  const [isSimulatedFar, setIsSimulatedFar] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    passed: boolean;
    checks: CheckResult[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const { lastCapturedPhoto } = useSettingsStore.getState();
      if (lastCapturedPhoto) {
        setAfterPhotoUri(lastCapturedPhoto);
      }
    }, [])
  );

  const toggleSimulatedDistance = () => {
    if (isSimulatedFar) {
      setDistanceMeters(12);
      setIsSimulatedFar(false);
    } else {
      setDistanceMeters(412); // Demo rejection: 412m away
      setIsSimulatedFar(true);
    }
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
      const res = await closeCapaApi(capa.id, {
        lat: isSimulatedFar ? 23.7410 : capa.before_photo.lat,
        lng: isSimulatedFar ? 86.4150 : capa.before_photo.lng,
        uri: afterPhotoUri,
        accuracy: 8,
        isMocked: false,
      });

      setVerificationResult({
        passed: res.passed,
        checks: res.checks,
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
          ⚡ Demo Simulator: {isSimulatedFar ? '🔴 412m Far (Fails)' : '🟢 12m Right Spot (Passes)'} (Tap to switch)
        </Text>
      </TouchableOpacity>

      {/* Live Distance Meter */}
      <DistanceMeter distanceMeters={distanceMeters} />

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
