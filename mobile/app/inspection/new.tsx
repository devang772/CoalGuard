import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { BigButton } from '../../src/components/BigButton';
import { fetchChecklistsApi, startInspectionApi } from '../../src/api/endpoints';
import { useApi } from '../../src/lib/useApi';
import { getCurrentFix } from '../../src/lib/location';
import { useActiveMine } from '../../src/store/master';
import { useAuthStore } from '../../src/store/auth';
import { colors } from '../../src/theme/colors';

const TYPES = ['Internal Safety Audit', 'Statutory CMR Inspection', 'DGMS Officer Accompany', 'SPCB Environmental Check'];
const TYPE_KEYS: Record<string, 'internal' | 'statutory' | 'dgms' | 'spcb'> = {
  'Internal Safety Audit': 'internal',
  'Statutory CMR Inspection': 'statutory',
  'DGMS Officer Accompany': 'dgms',
  'SPCB Environmental Check': 'spcb',
};

export default function StartInspectionScreen() {
  const router = useRouter();
  const mine = useActiveMine();
  const { user } = useAuthStore();
  const [selectedType, setSelectedType] = useState(TYPES[0]);
  const checklists = useApi(() => (mine ? fetchChecklistsApi(mine.id) : Promise.resolve([])), [mine?.id]);
  const [pickedChecklist, setPickedChecklist] = useState<string | null>(null);
  const selectedChecklist = pickedChecklist || checklists.data?.[0]?.id || '';
  const [starting, setStarting] = useState(false);

  const handleStart = async () => {
    if (!selectedChecklist) {
      Alert.alert('Checklist Required', 'No inspection checklist is available for this mine.');
      return;
    }
    setStarting(true);
    try {
      const fix = await getCurrentFix();
      const res = await startInspectionApi({
        type: TYPE_KEYS[selectedType] || 'internal',
        checklistId: Number(selectedChecklist),
        lat: fix?.lat ?? null,
        lng: fix?.lng ?? null,
      });
      router.push(`/inspection/${res.id}?checklistId=${selectedChecklist}` as any);
    } catch (err: any) {
      Alert.alert('Could not start inspection', err.message);
    } finally {
      setStarting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Start Safety Inspection</Text>
      <Text style={styles.subTitle}>Captures start timestamp & GPS automatically.</Text>

      {/* Mine Info */}
      <View style={styles.card}>
        <Text style={styles.label}>Mine Unit</Text>
        <View style={styles.infoRow}>
          <Feather name="shield" size={20} color={colors.safetyAmberDark} />
          <Text style={styles.valueText}>{mine?.name || user?.mine_name || 'Loading mine…'}</Text>
        </View>
      </View>

      {/* Inspection Type Selector */}
      <View style={styles.card}>
        <Text style={styles.label}>Inspection Type</Text>
        {TYPES.map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.radioRow, selectedType === type && styles.radioActive]}
            onPress={() => setSelectedType(type)}
          >
            <View style={[styles.radioCircle, selectedType === type && styles.radioCircleActive]} />
            <Text style={styles.radioText}>{type}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Checklist Select */}
      <View style={styles.card}>
        <Text style={styles.label}>Select Master Checklist</Text>
        {(checklists.data || []).map((chk) => (
          <TouchableOpacity
            key={chk.id}
            style={[styles.radioRow, selectedChecklist === chk.id && styles.radioActive]}
            onPress={() => setPickedChecklist(chk.id)}
          >
            <View style={[styles.radioCircle, selectedChecklist === chk.id && styles.radioCircleActive]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.radioText}>{chk.name}</Text>
              <Text style={styles.itemCount}>{chk.items.length} items</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <BigButton title="Start Inspection Checklist →" onPress={handleStart} loading={starting} style={{ marginTop: 10 }} />
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
  label: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.emerald,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.emeraldMuted,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.emeraldBorder,
  },
  valueText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginBottom: 4,
  },
  radioActive: {
    backgroundColor: colors.emeraldMuted,
    borderWidth: 1,
    borderColor: colors.emeraldBorder,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#64748B',
  },
  radioCircleActive: {
    borderColor: colors.emerald,
    backgroundColor: colors.emerald,
  },
  radioText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  itemCount: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
