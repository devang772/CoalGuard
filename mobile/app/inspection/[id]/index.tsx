import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { MOCK_CHECKLISTS } from '../../../src/api/mock/data';
import { BigButton } from '../../../src/components/BigButton';
import { colors } from '../../../src/theme/colors';

export default function InspectionChecklistScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const checklist = MOCK_CHECKLISTS[0];

  const [answers, setAnswers] = useState<Record<string, 'ok' | 'not_ok' | 'na'>>({});
  const [findingsCount, setFindingsCount] = useState(1);

  const total = checklist.items.length;
  const completed = Object.keys(answers).length;
  const progressPct = Math.round((completed / total) * 100);

  const handleChoice = (itemId: string, choice: 'ok' | 'not_ok' | 'na') => {
    setAnswers((prev) => ({ ...prev, [itemId]: choice }));
    if (choice === 'not_ok') {
      router.push(`/inspection/${id}/finding?itemId=${itemId}` as any);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header Summary & Progress Bar */}
      <View style={styles.headerCard}>
        <Text style={styles.chkTitle}>{checklist.name}</Text>
        <Text style={styles.subText}>Timer: 14m elapsed · Moonidih UG</Text>

        <View style={styles.progressRow}>
          <Text style={styles.progressText}>Progress: {completed} / {total} ({progressPct}%)</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progressPct}%` }]} />
        </View>
      </View>

      {/* Checklist Items */}
      {checklist.items.map((item, idx) => {
        const val = answers[item.id];
        return (
          <View key={item.id} style={styles.itemCard}>
            <Text style={styles.itemNum}>Item {idx + 1}</Text>
            <Text style={styles.itemText}>{item.text}</Text>

            <View style={styles.btnGroup}>
              <TouchableOpacity
                style={[styles.choiceBtn, val === 'ok' && styles.okActive]}
                onPress={() => handleChoice(item.id, 'ok')}
              >
                <Feather name="check" size={18} color={val === 'ok' ? '#FFF' : colors.success} />
                <Text style={[styles.btnText, { color: val === 'ok' ? '#FFF' : colors.success }]}>✓ OK</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.choiceBtn, val === 'not_ok' && styles.notOkActive]}
                onPress={() => handleChoice(item.id, 'not_ok')}
              >
                <Feather name="x" size={18} color={val === 'not_ok' ? '#FFF' : colors.danger} />
                <Text style={[styles.btnText, { color: val === 'not_ok' ? '#FFF' : colors.danger }]}>✗ Not OK</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.choiceBtn, val === 'na' && styles.naActive]}
                onPress={() => handleChoice(item.id, 'na')}
              >
                <Text style={[styles.btnText, { color: val === 'na' ? '#FFF' : '#64748B' }]}>N/A</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      <TouchableOpacity
        style={styles.addFindingBtn}
        onPress={() => router.push(`/inspection/${id}/finding` as any)}
      >
        <Feather name="plus-circle" size={20} color={colors.emerald} />
        <Text style={styles.addFindingText}>Add Unscheduled Safety Finding</Text>
      </TouchableOpacity>

      <BigButton
        title="Review & Submit Inspection →"
        onPress={() => router.push(`/inspection/${id}/review` as any)}
        style={{ marginTop: 16 }}
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
  headerCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  chkTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  subText: {
    fontSize: 13,
    color: colors.emerald,
    marginTop: 4,
  },
  progressRow: {
    marginTop: 14,
    marginBottom: 6,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  track: {
    height: 8,
    backgroundColor: '#1E293B',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.emerald,
  },
  itemCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  itemNum: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  itemText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 22,
    marginBottom: 14,
  },
  btnGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  choiceBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#1E293B',
    backgroundColor: '#131F24',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  okActive: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  notOkActive: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  naActive: {
    backgroundColor: '#475569',
    borderColor: '#475569',
  },
  addFindingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.emeraldMuted,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    borderWidth: 1.5,
    borderColor: colors.emeraldBorder,
    marginVertical: 10,
  },
  addFindingText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.emerald,
  },
});
