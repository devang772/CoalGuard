import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { trackGrievanceApi } from '../../src/api/endpoints';
import { GrievanceItem } from '../../src/api/types';
import { colors } from '../../src/theme/colors';

export default function TrackGrievanceScreen() {
  const params = useLocalSearchParams();
  const [tokenInput, setTokenInput] = useState((params.token as string) || 'GRV-7F3K');
  const [loading, setLoading] = useState(false);
  const [grievanceData, setGrievanceData] = useState<GrievanceItem | null>(null);

  const handleTrack = async () => {
    if (!tokenInput.trim()) return;
    setLoading(true);
    const res = await trackGrievanceApi(tokenInput.trim());
    setGrievanceData(res);
    setLoading(false);
  };

  useEffect(() => {
    handleTrack();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Token Input Bar */}
      <View style={styles.card}>
        <Text style={styles.label}>Enter Tracking Token</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.tokenInput}
            value={tokenInput}
            onChangeText={setTokenInput}
            placeholder="e.g. GRV-7F3K"
            autoCapitalize="characters"
          />
          <TouchableOpacity style={styles.searchBtn} onPress={handleTrack}>
            <Feather name="search" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.emerald} style={{ marginTop: 30 }} />
      ) : grievanceData ? (
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.tokenLabel}>Token: {grievanceData.token}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{grievanceData.status.toUpperCase()}</Text>
            </View>
          </View>

          <Text style={styles.catText}>Category: {grievanceData.category.toUpperCase()}</Text>
          <Text style={styles.subText}>Updated: {new Date(grievanceData.updated_at).toLocaleDateString()} · Confidential</Text>

          {/* Status Stepper */}
          <Text style={styles.sectionTitle}>Resolution Stepper</Text>
          <View style={styles.stepperContainer}>
            <View style={styles.stepRow}>
              <View style={[styles.stepCircle, styles.stepDone]}>
                <Feather name="check" size={14} color="#FFF" />
              </View>
              <View style={styles.stepTextCol}>
                <Text style={styles.stepTitle}>Grievance Registered</Text>
                <Text style={styles.stepTime}>{new Date(grievanceData.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
            </View>

            <View style={styles.stepLine} />

            <View style={styles.stepRow}>
              <View style={[styles.stepCircle, grievanceData.status !== 'new' ? styles.stepDone : styles.stepActive]}>
                <Feather name={grievanceData.status !== 'new' ? "check" : "clock"} size={14} color="#FFF" />
              </View>
              <View style={styles.stepTextCol}>
                <Text style={styles.stepTitle}>Assigned to Officer</Text>
                <Text style={styles.stepTime}>{grievanceData.status !== 'new' ? 'In Review' : 'Pending'}</Text>
              </View>
            </View>

            <View style={styles.stepLine} />

            <View style={styles.stepRow}>
              <View style={[styles.stepCircle, grievanceData.status === 'resolved' ? styles.stepDone : styles.stepPending]}>
                {grievanceData.status === 'resolved' ? (
                  <Feather name="check" size={14} color="#FFF" />
                ) : (
                  <Text style={{ color: '#94A3B8', fontWeight: '800' }}>3</Text>
                )}
              </View>
              <View style={styles.stepTextCol}>
                <Text style={[styles.stepTitle, { color: grievanceData.status === 'resolved' ? colors.textPrimary : '#94A3B8' }]}>
                  Resolution & Action Taken
                </Text>
                <Text style={styles.stepTime}>{grievanceData.status === 'resolved' ? 'Resolved' : 'Pending review'}</Text>
              </View>
            </View>
          </View>

          {/* Officer Response */}
          {grievanceData.response && (
            <View style={styles.responseBox}>
              <Feather name="message-circle" size={18} color={colors.info} />
              <View style={{ flex: 1 }}>
                <Text style={styles.respTitle}>Officer Note:</Text>
                <Text style={styles.respBody}>{grievanceData.response}</Text>
              </View>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
            No grievance record found for token "{tokenInput}".
          </Text>
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
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tokenInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
    backgroundColor: '#131F24',
    color: colors.textPrimary,
  },
  searchBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.emerald,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tokenLabel: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  statusBadge: {
    backgroundColor: colors.warningLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.warning,
  },
  catText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  subText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.emerald,
    marginTop: 18,
    marginBottom: 12,
  },
  stepperContainer: {
    paddingLeft: 6,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDone: {
    backgroundColor: colors.success,
  },
  stepActive: {
    backgroundColor: colors.emerald,
  },
  stepPending: {
    backgroundColor: '#1E293B',
  },
  stepTextCol: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  stepTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  stepLine: {
    width: 2,
    height: 20,
    backgroundColor: '#1E293B',
    marginLeft: 13,
    marginVertical: 2,
  },
  responseBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.infoLight,
    padding: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  respTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.info,
  },
  respBody: {
    fontSize: 13,
    color: colors.textPrimary,
    marginTop: 2,
  },
});
