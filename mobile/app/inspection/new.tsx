import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { BigButton } from '../../src/components/BigButton';
import { MOCK_CHECKLISTS } from '../../src/api/mock/data';
import { colors } from '../../src/theme/colors';

const TYPES = ['Internal Safety Audit', 'Statutory CMR Inspection', 'DGMS Officer Accompany', 'SPCB Environmental Check'];

export default function StartInspectionScreen() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState(TYPES[0]);
  const [selectedChecklist, setSelectedChecklist] = useState(MOCK_CHECKLISTS[0].id);

  const handleStart = () => {
    router.push(`/inspection/insp-101/index?checklistId=${selectedChecklist}` as any);
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
    backgroundColor: '#F8FAFC',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.coalBlue,
  },
  subTitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
    marginTop: 2,
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
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.safetyAmberLight,
    padding: 12,
    borderRadius: 10,
  },
  valueText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.coalBlue,
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
    backgroundColor: '#F1F5F9',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#94A3B8',
  },
  radioCircleActive: {
    borderColor: colors.safetyAmber,
    backgroundColor: colors.safetyAmber,
  },
  radioText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.coalBlue,
  },
  itemCount: {
    fontSize: 12,
    color: '#64748B',
  },
});
