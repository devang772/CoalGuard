import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { TrustBadge } from '../src/components/TrustBadge';
import { formatDateIST } from '../src/lib/format';
import { colors } from '../src/theme/colors';

const USER_REPORTS = [
  {
    id: 'rep-1',
    title: 'Roof Crack Finding near Conveyor 3',
    type: 'Inspection Finding',
    time: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    status: 'Verified',
    trustScore: 92,
    flags: [],
  },
  {
    id: 'rep-2',
    title: 'CAPA Closure for South Haul Road Drainage',
    type: 'CAPA Close',
    time: new Date(Date.now() - 14 * 3600 * 1000).toISOString(),
    status: 'Verified',
    trustScore: 94,
    flags: [],
  },
  {
    id: 'rep-3',
    title: 'Selfie Attendance at Gate 2',
    type: 'Attendance',
    time: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
    status: 'Needs Review',
    trustScore: 72,
    flags: ['low_gps_accuracy_35m'],
  },
];

export default function MyReportsScreen() {
  return (
    <View style={styles.container}>
      <FlatList
        data={USER_REPORTS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.typeTag}>{item.type}</Text>
              <TrustBadge score={item.trustScore} flags={item.flags} />
            </View>

            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.time}>{formatDateIST(item.time)}</Text>
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  typeTag: {
    backgroundColor: colors.coalBlue,
    color: colors.safetyAmber,
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.coalBlue,
  },
  time: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
});
