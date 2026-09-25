import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../src/theme/colors';

const LOG_ITEMS = [
  { id: 'att-1', date: '25 Sep 2026', time: '07:02 AM', valid: true, mine: 'Moonidih UG' },
  { id: 'att-2', date: '24 Sep 2026', time: '07:05 AM', valid: true, mine: 'Moonidih UG' },
  { id: 'att-3', date: '23 Sep 2026', time: '07:45 AM', valid: false, reason: '1.2 km outside boundary', mine: 'Moonidih UG' },
  { id: 'att-4', date: '22 Sep 2026', time: '07:00 AM', valid: true, mine: 'Moonidih UG' },
];

export default function AttendanceHistoryScreen() {
  return (
    <View style={styles.container}>
      <FlatList
        data={LOG_ITEMS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={[styles.iconCircle, item.valid ? styles.passBg : styles.failBg]}>
              <Feather name={item.valid ? 'check' : 'x'} size={18} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dateText}>{item.date} · {item.time}</Text>
              <Text style={styles.mineText}>{item.mine}</Text>
              {item.reason && <Text style={styles.reasonText}>{item.reason}</Text>}
            </View>
            <Text style={[styles.statusText, { color: item.valid ? colors.success : colors.danger }]}>
              {item.valid ? 'VALID ✓' : 'REJECTED'}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passBg: {
    backgroundColor: colors.success,
  },
  failBg: {
    backgroundColor: colors.danger,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.coalBlue,
  },
  mineText: {
    fontSize: 12,
    color: '#64748B',
  },
  reasonText: {
    fontSize: 12,
    color: colors.danger,
    marginTop: 2,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
