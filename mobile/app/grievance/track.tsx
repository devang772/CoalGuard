import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { trackGrievanceApi, fetchMyReportsApi } from '../../src/api/endpoints';
import { GrievanceItem } from '../../src/api/types';
import { getSavedGrievanceTokens, SavedGrievanceToken } from '../../src/lib/grievanceStorage';
import { colors } from '../../src/theme/colors';

const SAMPLE_DEMO_TOKENS = [
  { token: 'GRV-7F3K', category: 'Wages & Payment', desc: 'Delay in monthly overtime payment' },
  { token: 'GRV-9821', category: 'Safety & PPE', desc: 'Damaged helmet replacement request' },
];

export default function TrackGrievanceScreen() {
  const params = useLocalSearchParams();
  const [tokenInput, setTokenInput] = useState((params.token as string) || '');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [grievanceData, setGrievanceData] = useState<GrievanceItem | null>(null);
  const [savedTokens, setSavedTokens] = useState<SavedGrievanceToken[]>([]);

  const handleTrack = async (overrideToken?: string) => {
    const targetToken = (overrideToken || tokenInput).trim();
    if (!targetToken) return;
    setTokenInput(targetToken);
    setLoading(true);
    setSearched(true);
    try {
      const res = await trackGrievanceApi(targetToken);
      setGrievanceData(res);
    } catch (e: any) {
      setGrievanceData(null);
      Alert.alert('Tracking Error', e.message || 'Grievance not found.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadSaved = async () => {
      // Load local stored tokens
      const local = await getSavedGrievanceTokens();
      // Load user's server grievances
      try {
        const reports = await fetchMyReportsApi();
        const serverGrievances = reports.filter((r) => r.kind === 'grievance');
        for (const g of serverGrievances) {
          const match = g.title.match(/\((GRV-[A-Z0-9]+)\)/);
          const t = match ? match[1] : null;
          if (t && !local.some((item) => item.token === t)) {
            local.push({ token: t, category: g.title, date: g.created_at });
          }
        }
      } catch (e) {}

      setSavedTokens(local);

      // Auto-track if token was provided in params or if there is a saved token
      const initialToken = (params.token as string) || (local.length > 0 ? local[0].token : '');
      if (initialToken) {
        handleTrack(initialToken);
      }
    };

    loadSaved();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Search Input Bar */}
      <View style={styles.card}>
        <Text style={styles.label}>Enter Tracking Token</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.tokenInput}
            value={tokenInput}
            onChangeText={setTokenInput}
            placeholder="e.g. GRV-7F3K"
            placeholderTextColor="#64748B"
            autoCapitalize="characters"
          />
          <TouchableOpacity style={styles.searchBtn} onPress={() => handleTrack()}>
            <Feather name="search" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Loading Indicator */}
      {loading && <ActivityIndicator size="large" color={colors.emerald} style={{ marginVertical: 20 }} />}

      {/* Tracked Grievance Details Card */}
      {!loading && grievanceData ? (
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.tokenLabel}>Token: {grievanceData.token}</Text>
            <View
              style={[
                styles.statusBadge,
                grievanceData.status === 'resolved' || grievanceData.status === 'closed'
                  ? { backgroundColor: colors.emeraldMuted }
                  : grievanceData.status === 'in_progress'
                  ? { backgroundColor: colors.warningLight }
                  : { backgroundColor: '#1E293B' },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  grievanceData.status === 'resolved' || grievanceData.status === 'closed'
                    ? { color: colors.emerald }
                    : grievanceData.status === 'in_progress'
                    ? { color: colors.warning }
                    : { color: '#94A3B8' },
                ]}
              >
                {grievanceData.status.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={styles.catText}>Category: {grievanceData.category.toUpperCase()}</Text>
          <Text style={styles.subText}>
            Submitted: {new Date(grievanceData.created_at).toLocaleDateString()} · Confidential & Encrypted 🔒
          </Text>

          {/* Status Stepper */}
          <Text style={styles.sectionTitle}>Grievance Resolution Stepper</Text>
          <View style={styles.stepperContainer}>
            {/* Step 1 */}
            <View style={styles.stepRow}>
              <View style={[styles.stepCircle, styles.stepDone]}>
                <Feather name="check" size={14} color="#FFF" />
              </View>
              <View style={styles.stepTextCol}>
                <Text style={styles.stepTitle}>Grievance Registered ✓</Text>
                <Text style={styles.stepTime}>
                  {new Date(grievanceData.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })},{' '}
                  {new Date(grievanceData.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </View>

            <View style={styles.stepLine} />

            {/* Step 2 */}
            <View style={styles.stepRow}>
              <View
                style={[
                  styles.stepCircle,
                  grievanceData.status !== 'new' ? styles.stepDone : styles.stepActive,
                ]}
              >
                <Feather name={grievanceData.status !== 'new' ? 'check' : 'clock'} size={14} color="#FFF" />
              </View>
              <View style={styles.stepTextCol}>
                <Text style={styles.stepTitle}>Assigned to Mine Manager</Text>
                <Text style={styles.stepTime}>
                  {grievanceData.status !== 'new' ? 'Under active review by officer' : 'Pending review'}
                </Text>
              </View>
            </View>

            <View style={styles.stepLine} />

            {/* Step 3 */}
            <View style={styles.stepRow}>
              <View
                style={[
                  styles.stepCircle,
                  grievanceData.status === 'resolved' || grievanceData.status === 'closed'
                    ? styles.stepDone
                    : styles.stepPending,
                ]}
              >
                {grievanceData.status === 'resolved' || grievanceData.status === 'closed' ? (
                  <Feather name="check" size={14} color="#FFF" />
                ) : (
                  <Text style={{ color: '#94A3B8', fontWeight: '800' }}>3</Text>
                )}
              </View>
              <View style={styles.stepTextCol}>
                <Text
                  style={[
                    styles.stepTitle,
                    {
                      color:
                        grievanceData.status === 'resolved' || grievanceData.status === 'closed'
                          ? colors.textPrimary
                          : '#94A3B8',
                    },
                  ]}
                >
                  Resolution & Action Taken
                </Text>
                <Text style={styles.stepTime}>
                  {grievanceData.status === 'resolved' || grievanceData.status === 'closed'
                    ? 'Resolved & Closed'
                    : 'Pending final action'}
                </Text>
              </View>
            </View>
          </View>

          {/* Officer Response */}
          {grievanceData.response ? (
            <View style={styles.responseBox}>
              <Feather name="message-circle" size={18} color={colors.emerald} />
              <View style={{ flex: 1 }}>
                <Text style={styles.respTitle}>Mine Manager Response:</Text>
                <Text style={styles.respBody}>{grievanceData.response}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.pendingNoteBox}>
              <Feather name="info" size={16} color={colors.warning} />
              <Text style={styles.pendingNoteText}>
                The Mine Manager has been notified. Official response will appear here once reviewed.
              </Text>
            </View>
          )}
        </View>
      ) : !loading && searched && !grievanceData ? (
        <View style={styles.card}>
          <Text style={{ color: colors.danger, fontWeight: '700', textAlign: 'center' }}>
            No grievance record found for token "{tokenInput}".
          </Text>
        </View>
      ) : null}

      {/* Saved & Sample Tokens Picker */}
      <View style={styles.card}>
        <Text style={styles.label}>
          {savedTokens.length > 0 ? 'Your Registered Grievances & Tokens' : 'Quick Demo Grievance Tokens'}
        </Text>
        <Text style={styles.subText}>Tap any token below to view its live resolution status:</Text>

        <View style={{ marginTop: 12, gap: 10 }}>
          {(savedTokens.length > 0 ? savedTokens : SAMPLE_DEMO_TOKENS).map((item) => (
            <TouchableOpacity
              key={item.token}
              style={[styles.tokenChip, tokenInput === item.token && styles.tokenChipActive]}
              onPress={() => handleTrack(item.token)}
            >
              <View style={styles.tokenChipLeft}>
                <Feather name="key" size={16} color={colors.emerald} />
                <View>
                  <Text style={styles.tokenChipTitle}>{item.token}</Text>
                  <Text style={styles.tokenChipSub}>
                    {'category' in item ? item.category : 'Grievance'}
                  </Text>
                </View>
              </View>
              <Feather name="chevron-right" size={18} color={colors.emerald} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
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
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
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
    backgroundColor: colors.emerald,
  },
  stepActive: {
    backgroundColor: colors.safetyAmber,
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
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.emeraldBorder,
  },
  pendingNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: colors.safetyAmber,
  },
  pendingNoteText: {
    fontSize: 12,
    color: colors.safetyAmber,
    fontWeight: '600',
    flex: 1,
  },
  respTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.emerald,
  },
  respBody: {
    fontSize: 14,
    color: colors.textPrimary,
    marginTop: 2,
    lineHeight: 20,
  },
  tokenChip: {
    backgroundColor: '#131F24',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  tokenChipActive: {
    borderColor: colors.emerald,
    backgroundColor: colors.emeraldMuted,
  },
  tokenChipLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tokenChipTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  tokenChipSub: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
