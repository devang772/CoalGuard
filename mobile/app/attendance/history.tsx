import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fetchAttendanceHistoryApi } from '../../src/api/endpoints';
import { useApi } from '../../src/lib/useApi';
import { useAuthStore } from '../../src/store/auth';
import { colors } from '../../src/theme/colors';

export default function AttendanceHistoryScreen() {
  const role = useAuthStore((s) => s.user?.role);
  const history = useApi(() => fetchAttendanceHistoryApi(role), [role]);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await history.refresh();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={history.data || []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.emerald]} tintColor={colors.emerald} />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={[styles.iconCircle, item.valid ? styles.passBg : styles.failBg]}>
              <Feather name={item.valid ? 'check' : 'x'} size={18} color="#FFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.dateText}>{item.date} · {item.time}</Text>
              <Text style={styles.mineText}>{role === 'worker' ? item.mine_name : `${item.worker_name} · ${item.mine_name}`}</Text>
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
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
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
    color: colors.textPrimary,
  },
  mineText: {
    fontSize: 12,
    color: colors.textSecondary,
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
