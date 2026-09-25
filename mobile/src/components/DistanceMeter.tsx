import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface DistanceMeterProps {
  distanceMeters: number;
}

export const DistanceMeter: React.FC<DistanceMeterProps> = ({ distanceMeters }) => {
  const isClose = distanceMeters <= 30;

  return (
    <View style={[styles.container, isClose ? styles.closeBg : styles.farBg]}>
      <Feather
        name={isClose ? 'check-circle' : 'navigation'}
        size={20}
        color={isClose ? colors.emerald : colors.warning}
      />
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: isClose ? colors.emerald : colors.warning }]}>
          {isClose ? `${distanceMeters} m ✓ You are at the right spot` : `Move closer: ${distanceMeters} m away`}
        </Text>
        <Text style={styles.sub}>Target location: Before-photo GPS point (Max radius: 30m)</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    gap: 12,
    marginVertical: 10,
  },
  closeBg: {
    backgroundColor: '#0D1518',
    borderWidth: 1.5,
    borderColor: colors.emerald,
  },
  farBg: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1.5,
    borderColor: colors.warning,
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
  },
  sub: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
});
