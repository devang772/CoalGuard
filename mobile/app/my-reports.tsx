import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { TrustBadge } from '../src/components/TrustBadge';
import { fetchMyReportsApi } from '../src/api/endpoints';
import { useApi } from '../src/lib/useApi';
import { formatDateIST } from '../src/lib/format';
import { colors } from '../src/theme/colors';

const KIND_LABELS: Record<string, string> = {
  report: 'Field Report',
  finding: 'Inspection Finding',
  task: 'Compliance Task',
  attendance: 'Attendance',
  capa_fix: 'CAPA Close',
  grievance: 'Grievance',
};

export default function MyReportsScreen() {
  const reports = useApi(() => fetchMyReportsApi(), []);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await reports.refresh();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={reports.data || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.emerald]} tintColor={colors.emerald} />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.typeTag}>{KIND_LABELS[item.kind] || item.kind}</Text>
              {item.trust_score != null && <TrustBadge score={item.trust_score} flags={item.flags} />}
            </View>

            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.time}>
              {formatDateIST(item.created_at)} · {item.status}
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
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  typeTag: {
    backgroundColor: '#131F24',
    color: colors.emerald,
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.emeraldBorder,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  time: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
