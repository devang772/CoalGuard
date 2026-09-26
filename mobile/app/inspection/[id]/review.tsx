import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { BigButton } from '../../../src/components/BigButton';
import { fetchInspectionDetailApi, submitInspectionApi } from '../../../src/api/endpoints';
import { useApi } from '../../../src/lib/useApi';
import { minutesSince } from '../../../src/lib/format';
import { useInspectionDraftStore, EMPTY_ANSWERS } from '../../../src/store/inspection';
import { colors } from '../../../src/theme/colors';

const TYPE_LABELS: Record<string, string> = {
  internal: 'Internal Safety Audit',
  statutory: 'Statutory CMR Inspection',
  dgms: 'DGMS Inspection',
  spcb: 'SPCB Environmental Check',
};

export default function ReviewInspectionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const inspectionId = String(id);
  const inspection = useApi(() => fetchInspectionDetailApi(inspectionId), [inspectionId]);
  const draftAnswers = useInspectionDraftStore((s) => s.answers[inspectionId]);
  const answers = draftAnswers || EMPTY_ANSWERS;
  const clearDraft = useInspectionDraftStore((s) => s.clear);
  const [loading, setLoading] = useState(false);

  const detail = inspection.data;
  if (!detail) {
    return (
      <View style={[styles.container, { flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
        {inspection.loading ? (
          <ActivityIndicator size="large" color={colors.emerald} />
        ) : (
          <Text style={{ color: colors.textSecondary }}>{inspection.error || 'Inspection not found'}</Text>
        )}
      </View>
    );
  }

  const values = Object.values(answers);
  const okCount = values.filter((v) => v === 'ok').length;
  const notOkCount = values.filter((v) => v === 'not_ok').length;
  const naCount = values.filter((v) => v === 'na').length;
  const findings = detail.findings;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await submitInspectionApi(
        inspectionId,
        Object.entries(answers).map(([item_id, answer]) => ({ item_id, answer }))
      );
      clearDraft(inspectionId);
      const capaCount = res.data ? res.data.findings.filter((f) => f.capa_id != null).length : 0;
      Alert.alert(
        'Inspection Submitted ✓',
        res.queued
          ? 'No network: saved to the outbox. It will be submitted automatically when you are back online.'
          : `${res.data?.findings.length ?? 0} finding(s) recorded. ${capaCount} CAPA(s) created automatically and assigned.`,
        [{ text: 'OK', onPress: () => router.replace('/(tabs)/home') }]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Inspection Review Summary</Text>
      <Text style={styles.subTitle}>
        {detail.mine_name} · {TYPE_LABELS[detail.type] || detail.type}
      </Text>

      {/* Summary Box */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Audit Metrics</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricNum}>{minutesSince(detail.started_at, detail.submitted_at)}m</Text>
            <Text style={styles.metricLabel}>Duration</Text>
          </View>

          <View style={[styles.metricItem, { backgroundColor: colors.successLight }]}>
            <Text style={[styles.metricNum, { color: colors.success }]}>{okCount}</Text>
            <Text style={[styles.metricLabel, { color: colors.success }]}>Items OK</Text>
          </View>

          <View style={[styles.metricItem, { backgroundColor: colors.dangerLight }]}>
            <Text style={[styles.metricNum, { color: colors.danger }]}>{notOkCount}</Text>
            <Text style={[styles.metricLabel, { color: colors.danger }]}>Not OK</Text>
          </View>

          <View style={[styles.metricItem, { backgroundColor: '#131F24' }]}>
            <Text style={styles.metricNum}>{naCount}</Text>
            <Text style={styles.metricLabel}>N/A</Text>
          </View>
        </View>
      </View>

      {/* Identified Findings List */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Identified Hazard Findings ({findings.length})</Text>
        {findings.map((f) => (
          <View key={f.id} style={styles.findingRow}>
            <View style={styles.sevDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.findingDesc}>{f.description}</Text>
              <Text style={styles.findingSub}>
                {f.severity.toUpperCase()} · {f.category.replace('_', ' ')}
                {f.has_photo ? ' · Satya Proof Photo Attached' : ''}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <BigButton
        title="Submit Inspection (Auto-Create CAPAs)"
        onPress={handleSubmit}
        loading={loading}
        style={{ marginTop: 20 }}
      />
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
    marginBottom: 20,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.emerald,
    marginBottom: 14,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  metricItem: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#131F24',
    alignItems: 'center',
  },
  metricNum: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 2,
  },
  findingRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: colors.emeraldMuted,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.emeraldBorder,
  },
  sevDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.danger,
  },
  findingDesc: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  findingSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '700',
  },
});
