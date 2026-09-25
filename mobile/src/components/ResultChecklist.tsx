import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export interface CheckResult {
  name: string;
  passed: boolean;
  detail: string;
}

interface ResultChecklistProps {
  checks: CheckResult[];
}

export const ResultChecklist: React.FC<ResultChecklistProps> = ({ checks }) => {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Satya Verification Checks</Text>
      {checks.map((chk, idx) => (
        <View key={idx} style={styles.row}>
          <View style={[styles.iconBox, chk.passed ? styles.passBox : styles.failBox]}>
            <Feather name={chk.passed ? 'check' : 'x'} size={14} color="#05080A" />
          </View>
          <View style={styles.textCol}>
            <Text style={[styles.name, { color: chk.passed ? '#FFFFFF' : colors.danger }]}>
              {chk.name}
            </Text>
            <Text style={styles.detail}>{chk.detail}</Text>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0D1518',
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1.5,
    borderColor: '#1A2B26',
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginVertical: 8,
  },
  iconBox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  passBox: {
    backgroundColor: colors.emerald,
  },
  failBox: {
    backgroundColor: colors.danger,
  },
  textCol: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '800',
  },
  detail: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
});
