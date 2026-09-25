import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { fetchNotificationsApi } from '../src/api/endpoints';
import { NotificationItem } from '../src/api/types';
import { MOCK_NOTIFICATIONS } from '../src/api/mock/data';
import { formatDateIST } from '../src/lib/format';
import { colors } from '../src/theme/colors';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(MOCK_NOTIFICATIONS);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = async () => {
    const data = await fetchNotificationsApi();
    if (data && data.length > 0) {
      setNotifications(data);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.emerald]} tintColor={colors.emerald} />
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card}>
            <View style={[styles.iconCircle, item.type === 'escalation' && styles.escBg]}>
              <Feather
                name={item.type === 'escalation' ? 'alert-triangle' : 'bell'}
                size={20}
                color={item.type === 'escalation' ? colors.danger : colors.emerald}
              />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.row}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.time}>{formatDateIST(item.timestamp)}</Text>
              </View>
              <Text style={styles.msg}>{item.message}</Text>
            </View>
          </TouchableOpacity>
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
    gap: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#131F24',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.emeraldBorder,
  },
  escBg: {
    backgroundColor: colors.dangerLight,
    borderColor: colors.danger,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  time: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  msg: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
