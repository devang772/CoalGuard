import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAuthStore } from '../src/store/auth';
import { colors } from '../src/theme/colors';

export default function ProfileScreen() {
  const { user } = useAuthStore();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>Full Name</Text>
        <Text style={styles.val}>{user?.name}</Text>

        <Text style={styles.label}>Phone Number</Text>
        <Text style={styles.val}>{user?.phone}</Text>

        <Text style={styles.label}>Role / Designation</Text>
        <Text style={styles.val}>{user?.role?.toUpperCase().replace('_', ' ')}</Text>

        <Text style={styles.label}>Assigned Mine Unit</Text>
        <Text style={styles.val}>{user?.mine_name} (BCCL)</Text>

        <Text style={styles.label}>Hardware Device ID (Satya Proof)</Text>
        <Text style={styles.val}>DEV-ANDROID-NETRA-01</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: colors.background,
    minHeight: '100%',
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.emerald,
    marginTop: 12,
  },
  val: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2,
  },
});
