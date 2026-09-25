import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface GeofenceStatusProps {
  isInside: boolean;
  mineName?: string | null;
  accuracyMeters?: number;
}

export const GeofenceStatus: React.FC<GeofenceStatusProps> = ({
  isInside = true,
  mineName = 'Moonidih UG',
  accuracyMeters = 8,
}) => {
  const displayMineName = mineName || 'Mine Unit';
  return (
    <View style={[styles.container, isInside ? styles.inside : styles.outside]}>
      <Feather
        name={isInside ? 'navigation' : 'alert-circle'}
        size={16}
        color={isInside ? colors.emerald : colors.danger}
      />
      <Text style={[styles.text, { color: isInside ? colors.emerald : colors.danger }]}>
        {isInside ? `Inside ${displayMineName} ✓` : 'Outside mine boundary ⚠'}
      </Text>
      <Text style={styles.accuracy}>±{accuracyMeters}m</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  inside: {
    backgroundColor: '#0D1518',
    borderColor: 'rgba(0, 230, 153, 0.3)',
  },
  outside: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  text: {
    fontSize: 14,
    fontWeight: '800',
  },
  accuracy: {
    fontSize: 12,
    color: '#94A3B8',
    marginLeft: 'auto',
  },
});
