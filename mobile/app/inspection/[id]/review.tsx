import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { BigButton } from '../../../src/components/BigButton';
import { colors } from '../../../src/theme/colors';

export default function ReviewInspectionScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert(
        'Inspection Submitted ✓',
        'Saved to outbox! 2 CAPAs have been created automatically and assigned to supervisors.',
        [{ text: 'OK', onPress: () => router.replace('/(tabs)/home') }]
      );
    }, 600);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Inspection Review Summary</Text>
      <Text style={styles.subTitle}>Moonidih UG · Daily Safety Audit</Text>

      {/* Summary Box */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Audit Metrics</Text>
        <View style={styles.metricsGrid}>
          <View style={styles.metricItem}>
            <Text style={styles.metricNum}>18m</Text>
            <Text style={styles.metricLabel}>Duration</Text>
          </View>

          <View style={[styles.metricItem, { backgroundColor: colors.successLight }]}>
            <Text style={[styles.metricNum, { color: colors.success }]}>4</Text>
            <Text style={[styles.metricLabel, { color: colors.success }]}>Items OK</Text>
          </View>

          <View style={[styles.metricItem, { backgroundColor: colors.dangerLight }]}>
            <Text style={[styles.metricNum, { color: colors.danger }]}>1</Text>
            <Text style={[styles.metricLabel, { color: colors.danger }]}>Not OK</Text>
          </View>

          <View style={[styles.metricItem, { backgroundColor: '#131F24' }]}>
            <Text style={styles.metricNum}>0</Text>
            <Text style={styles.metricLabel}>N/A</Text>
          </View>
        </View>
      </View>

      {/* Identified Findings List */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Identified Hazard Findings (1)</Text>
        <View style={styles.findingRow}>
          <View style={styles.sevDot} />
          <View style={{ flex: 1 }}>
            <Text style={styles.findingDesc}>Roof strata crack near Conveyor 3 transfer point.</Text>
            <Text style={styles.findingSub}>CRITICAL · Roof Support · Satya Proof Photo Attached</Text>
          </View>
        </View>
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
