import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { BigButton } from '../../src/components/BigButton';
import { startInspectionApi } from '../../src/api/endpoints';
import { MOCK_CHECKLISTS } from '../../src/api/mock/data';
import { colors } from '../../src/theme/colors';

const TYPES = ['Internal Safety Audit', 'Statutory CMR Inspection', 'DGMS Officer Accompany', 'SPCB Environmental Check'];

export default function StartInspectionScreen() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState(TYPES[0]);
  const [selectedChecklist, setSelectedChecklist] = useState(MOCK_CHECKLISTS[0].id);
  const [starting, setStarting] = useState(false);

  const handleStart = async () => {
    setStarting(true);
    let inspId = 'insp-101';
    try {
      const typeKey = selectedType.includes('DGMS') ? 'dgms' : selectedType.includes('SPCB') ? 'spcb' : 'internal';
      const chkNum = parseInt(selectedChecklist.replace('chk-', ''), 10) || 1;
      const res = await startInspectionApi(1, typeKey, chkNum);
      if (res?.id) inspId = String(res.id);
    } catch (err: any) {
      console.warn('[StartInspection] Start API failed, using fallback:', err.message);
    }
    setStarting(false);
    router.push(`/inspection/${inspId}?checklistId=${selectedChecklist}` as any);
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
          <Text style={styles.valueText}>Moonidih UG Mine (BCCL, Jharia)</Text>
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
        {MOCK_CHECKLISTS.map((chk) => (
          <TouchableOpacity
            key={chk.id}
            style={[styles.radioRow, selectedChecklist === chk.id && styles.radioActive]}
            onPress={() => setSelectedChecklist(chk.id)}
          >
            <View style={[styles.radioCircle, selectedChecklist === chk.id && styles.radioCircleActive]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.radioText}>{chk.name}</Text>
              <Text style={styles.itemCount}>{chk.items.length} items</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <BigButton title="Start Inspection Checklist →" onPress={handleStart} style={{ marginTop: 10 }} />
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
