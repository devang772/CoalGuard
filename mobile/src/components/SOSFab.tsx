import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export const SOSFab: React.FC = () => {
  const router = useRouter();

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.fab}
      onPress={() => router.push('/sos' as any)}
    >
      <Feather name="alert-triangle" size={20} color={colors.danger} />
      <Text style={styles.label}>SOS</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 18,
    backgroundColor: '#0D1518',
    borderColor: colors.danger,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    elevation: 8,
    shadowColor: colors.danger,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    zIndex: 999,
    gap: 8,
  },
  label: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
