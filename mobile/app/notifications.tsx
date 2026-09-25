import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { MOCK_NOTIFICATIONS } from '../src/api/mock/data';
import { formatDateIST } from '../src/lib/format';
import { colors } from '../src/theme/colors';

export default function NotificationsScreen() {
  return (
    <View style={styles.container}>
      <FlatList
        data={MOCK_NOTIFICATIONS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card}>
            <View style={[styles.iconCircle, item.type === 'escalation' && styles.escBg]}>
              <Feather
                name={item.type === 'escalation' ? 'alert-triangle' : 'bell'}
                size={20}
                color={item.type === 'escalation' ? colors.danger : colors.coalBlue}
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
    backgroundColor: '#F8FAFC',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  escBg: {
    backgroundColor: colors.dangerLight,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.coalBlue,
  },
  time: {
    fontSize: 11,
    color: '#64748B',
  },
  msg: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
});
