import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { GeofenceStatus } from '../src/components/GeofenceStatus';
import { colors } from '../src/theme/colors';

export default function MineMapScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <GeofenceStatus isInside={true} mineName="Moonidih UG" accuracyMeters={8} />
      </View>

      {/* Interactive Map Visual Mock matching Reference UI */}
      <View style={styles.mapViewport}>
        <View style={styles.polygonShape}>
          <Text style={styles.polyLabel}>MOONIDIH MINE BOUNDARY · ZONE B</Text>

          {/* Current User Crosshair Ring matching Reference Screenshot */}
          <View style={styles.targetRing}>
            <Feather name="crosshair" size={24} color={colors.emeraldGlow} />
          </View>
          <Text style={styles.userLabel}>GPS Locked: 23.7957° N</Text>

          {/* Hazard Pins */}
          <View style={[styles.pin, { top: '30%', left: '35%' }]}>
            <Feather name="alert-triangle" size={16} color="#FFF" />
          </View>
          <View style={[styles.pin, { top: '65%', left: '70%', backgroundColor: colors.warning }]}>
            <Feather name="alert-circle" size={16} color="#05080A" />
          </View>
        </View>
      </View>

      {/* Mini Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Open Field Hazards Near You (2)</Text>
        <Text style={styles.cardItem}>🔴 Roof crack near Conveyor 3 (250m away)</Text>
        <Text style={styles.cardItem}>🟠 Unguarded pulley at Main Slope (410m away)</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05080A',
  },
  topBar: {
    padding: 16,
    backgroundColor: '#0B1215',
  },
  mapViewport: {
    flex: 1,
    backgroundColor: '#05080A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  polygonShape: {
    width: '100%',
    height: '85%',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.emerald,
    backgroundColor: 'rgba(0, 230, 153, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  polyLabel: {
    position: 'absolute',
    top: 16,
    color: colors.emerald,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  targetRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    borderColor: colors.emeraldGlow,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 245, 160, 0.1)',
  },
  userLabel: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 8,
  },
  pin: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  card: {
    backgroundColor: '#0D1518',
    padding: 18,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1.5,
    borderColor: '#1A2B26',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  cardItem: {
    fontSize: 14,
    color: '#94A3B8',
    marginVertical: 4,
  },
});
