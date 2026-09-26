import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/auth';
import { useMasterStore } from '../../src/store/master';
import { markAttendanceApi } from '../../src/api/endpoints';
import { useLiveLocation } from '../../src/lib/location';
import { useCapturedPhoto } from '../../src/lib/capture';
import { GeofenceStatus } from '../../src/components/GeofenceStatus';
import { BigButton } from '../../src/components/BigButton';
import { colors } from '../../src/theme/colors';

export default function AttendanceScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const workers = useMasterStore((s) => s.workers);
  const { fix, mine, isInside } = useLiveLocation();

  const isContractorAdmin = user?.role === 'contractor_admin';

  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);
  const selectedWorker = workers.find((w) => w.id === selectedWorkerId) || workers[0] || null;
  const { uri: selfieUri, meta: selfieMeta, reset: resetSelfie } = useCapturedPhoto();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ valid: boolean; reason?: string; time?: string } | null>(null);

  const handleMarkAttendance = async () => {
    if (!selfieUri) {
      Alert.alert('Selfie Required', 'Please capture a selfie verification photo.');
      return;
    }
    if (isContractorAdmin && !selectedWorker) {
      Alert.alert('Select Worker', 'No active workers are registered under your contractor.');
      return;
    }

    setLoading(true);
    try {
      // Location at the moment the selfie was taken (falls back to the live fix).
      const lat = selfieMeta?.lat ?? fix?.lat ?? null;
      const lng = selfieMeta?.lng ?? fix?.lng ?? null;
      const res = await markAttendanceApi({
        lat,
        lng,
        accuracy: selfieMeta?.accuracy ?? fix?.accuracy ?? null,
        isMocked: Boolean(selfieMeta?.isMocked ?? fix?.isMocked),
        selfieUri,
        selfieMeta,
        workerId: isContractorAdmin ? selectedWorker?.id : null,
      });
      if (res.queued || !res.data) {
        setResult({ valid: true, reason: 'No network: saved in the outbox, the server will verify it when it syncs.' });
      } else {
        setResult(res.data);
      }
      // Each mark needs a fresh selfie: re-sending the same photo is flagged as a reused photo.
      resetSelfie();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const openSelfieCamera = () => {
    router.push({ pathname: '/camera' as any, params: { facing: 'front' } });
  };

  const markedAt = result?.time
    ? new Date(result.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Geofence Status */}
      <View style={styles.card}>
        <Text style={styles.label}>Live Mine Geofence Check</Text>
        <GeofenceStatus isInside={isInside} mineName={mine?.name || user?.mine_name} accuracyMeters={fix?.accuracy ?? 0} />
      </View>

      {/* Contractor Admin Worker Selector (Gate Kiosk Mode) */}
      {isContractorAdmin && (
        <View style={styles.card}>
          <Text style={styles.label}>Gate Kiosk Mode: Select Worker</Text>
          {workers.map((w) => (
            <TouchableOpacity
              key={w.id}
              style={[styles.workerRow, selectedWorker?.id === w.id && styles.workerSelected]}
              onPress={() => setSelectedWorkerId(w.id)}
            >
              <Feather name="user" size={18} color={selectedWorker?.id === w.id ? colors.emerald : colors.textSecondary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.workerName}>{w.name}</Text>
                <Text style={styles.contractorName}>{w.contractor_name}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Selfie Capture */}
      <View style={styles.card}>
        <Text style={styles.label}>
          {isContractorAdmin ? `Worker Selfie: ${selectedWorker?.name || '—'}` : 'Take Attendance Selfie (Front Camera)'}
        </Text>

        {selfieUri ? (
          <TouchableOpacity onPress={openSelfieCamera} activeOpacity={0.8}>
            <Image source={{ uri: selfieUri }} style={styles.selfieImage} resizeMode="cover" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.selfiePlaceholder} onPress={openSelfieCamera}>
            <Feather name="camera" size={36} color={colors.emerald} />
            <Text style={styles.selfieText}>Take Verification Selfie</Text>
          </TouchableOpacity>
        )}

        <BigButton
          title="Submit Geofenced Attendance"
          onPress={handleMarkAttendance}
          loading={loading}
          style={{ marginTop: 20 }}
        />
      </View>

      {/* Result Verification Banner */}
      {result && (
        <View style={[styles.resultBox, result.valid ? styles.passBox : styles.failBox]}>
          <Feather
            name={result.valid ? 'check-circle' : 'alert-triangle'}
            size={28}
            color={result.valid ? colors.success : colors.danger}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.resultTitle, { color: result.valid ? colors.success : colors.danger }]}>
              {result.valid ? `✅ Attendance Marked ${markedAt}` : '❌ Attendance Rejected'}
            </Text>
            {result.reason && <Text style={styles.resultReason}>{result.reason}</Text>}
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.historyLink} onPress={() => router.push('/attendance/history' as any)}>
        <Text style={styles.historyText}>View Attendance Log History →</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: colors.background,
    minHeight: '100%',
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  label: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.emerald,
    marginBottom: 10,
  },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#131F24',
    marginBottom: 6,
  },
  workerSelected: {
    backgroundColor: colors.emeraldMuted,
    borderWidth: 1.5,
    borderColor: colors.emeraldBorder,
  },
  workerName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  contractorName: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  selfiePlaceholder: {
    height: 180,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.emerald,
    borderStyle: 'dashed',
    backgroundColor: colors.emeraldMuted,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  selfieText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.emerald,
  },
  selfieImage: {
    width: '100%',
    height: 200,
    borderRadius: 14,
  },
  resultBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  passBox: {
    backgroundColor: colors.successLight,
    borderWidth: 1.5,
    borderColor: colors.success,
  },
  failBox: {
    backgroundColor: colors.dangerLight,
    borderWidth: 1.5,
    borderColor: colors.danger,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  resultReason: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  historyLink: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  historyText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.emerald,
  },
});
