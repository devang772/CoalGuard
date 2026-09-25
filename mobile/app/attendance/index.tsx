import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/auth';
import { useSettingsStore } from '../../src/store/settings';
import { markAttendanceApi } from '../../src/api/endpoints';
import { GeofenceStatus } from '../../src/components/GeofenceStatus';
import { BigButton } from '../../src/components/BigButton';
import { MOCK_WORKERS } from '../../src/api/mock/data';
import { colors } from '../../src/theme/colors';

export default function AttendanceScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { locationSimulation } = useSettingsStore();

  const isContractorAdmin = user?.role === 'contractor_admin';
  const isInside = locationSimulation === 'inside';
  const isMocked = locationSimulation === 'mock_gps';

  const [selectedWorker, setSelectedWorker] = useState(MOCK_WORKERS[0]);
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ valid: boolean; reason?: string } | null>(null);

  const handleMarkAttendance = async () => {
    if (!selfieUri) {
      Alert.alert('Selfie Required', 'Please capture a selfie verification photo.');
      return;
    }

    setLoading(true);
    try {
      const res = await markAttendanceApi(
        isInside ? 23.7500 : 23.7100,
        isInside ? 86.4200 : 86.4900,
        selfieUri,
        isMocked
      );
      setResult(res);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Geofence Status */}
      <View style={styles.card}>
        <Text style={styles.label}>Live Mine Geofence Check</Text>
        <GeofenceStatus isInside={isInside} mineName={user?.mine_name} accuracyMeters={isInside ? 8 : 45} />
      </View>

      {/* Contractor Admin Worker Selector (Gate Kiosk Mode) */}
      {isContractorAdmin && (
        <View style={styles.card}>
          <Text style={styles.label}>Gate Kiosk Mode: Select Worker</Text>
          {MOCK_WORKERS.map((w) => (
            <TouchableOpacity
              key={w.id}
              style={[styles.workerRow, selectedWorker.id === w.id && styles.workerSelected]}
              onPress={() => setSelectedWorker(w)}
            >
              <Feather name="user" size={18} color={colors.coalBlue} />
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
          {isContractorAdmin ? `Worker Selfie: ${selectedWorker.name}` : 'Take Attendance Selfie (Front Camera)'}
        </Text>

        {selfieUri ? (
          <Image source={{ uri: selfieUri }} style={styles.selfieImage} resizeMode="cover" />
        ) : (
          <TouchableOpacity
            style={styles.selfiePlaceholder}
            onPress={() => {
              setSelfieUri('https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600');
              router.push('/camera' as any);
            }}
          >
            <Feather name="camera" size={36} color={colors.safetyAmberDark} />
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
              {result.valid ? '✅ Attendance Marked 07:02 AM' : '❌ Attendance Rejected'}
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
    backgroundColor: '#F8FAFC',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  label: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.coalBlue,
    marginBottom: 10,
  },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    marginBottom: 6,
  },
  workerSelected: {
    backgroundColor: colors.safetyAmberLight,
    borderWidth: 1.5,
    borderColor: colors.safetyAmber,
  },
  workerName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.coalBlue,
  },
  contractorName: {
    fontSize: 12,
    color: '#64748B',
  },
  selfiePlaceholder: {
    height: 180,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.safetyAmber,
    borderStyle: 'dashed',
    backgroundColor: '#FFFBEB',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  selfieText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.coalBlue,
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
    color: '#334155',
    marginTop: 2,
  },
  historyLink: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  historyText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.info,
  },
});
