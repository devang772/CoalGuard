import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { GeofenceStatus } from '../src/components/GeofenceStatus';
import { fetchMapPinsApi } from '../src/api/endpoints';
import { useApi } from '../src/lib/useApi';
import { useLiveLocation } from '../src/lib/location';
import { getDistanceMeters } from '../src/lib/geo';
import { colors } from '../src/theme/colors';

const SEVERITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

function formatDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km away` : `${m}m away`;
}

export default function MineMapScreen() {
  const { fix, mine, isInside } = useLiveLocation();
  const pinsQuery = useApi(() => (mine ? fetchMapPinsApi(mine.id) : Promise.resolve([])), [mine?.id]);
  const pins = pinsQuery.data || [];

  // Place points inside the boundary box of the mine polygon (top = north).
  const ring = mine?.boundary || [];
  const lats = ring.map((p) => p.latitude);
  const lngs = ring.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const toBox = (lat: number, lng: number) => {
    if (ring.length < 3 || maxLat === minLat || maxLng === minLng) return null;
    const top = ((maxLat - lat) / (maxLat - minLat)) * 100;
    const left = ((lng - minLng) / (maxLng - minLng)) * 100;
    if (top < 0 || top > 100 || left < 0 || left > 100) return null;
    return { top: `${Math.min(92, Math.max(4, top))}%` as const, left: `${Math.min(92, Math.max(4, left))}%` as const };
  };

  const hazards = pins
    .filter((p) => p.type !== 'sos')
    .map((p) => ({
      ...p,
      distance: fix ? getDistanceMeters({ latitude: fix.lat, longitude: fix.lng }, { latitude: p.lat, longitude: p.lng }) : null,
    }))
    .sort((a, b) =>
      a.distance != null && b.distance != null
        ? a.distance - b.distance
        : (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9)
    );
  const nearest = hazards.slice(0, 3);
  // Keep the map readable: only the most serious recent pins.
  const mapPins = [...pins]
    .sort((a, b) => (a.type === 'sos' ? -1 : 0) - (b.type === 'sos' ? -1 : 0) || (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9))
    .slice(0, 6);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <GeofenceStatus isInside={isInside} mineName={mine?.name} accuracyMeters={fix?.accuracy ?? 0} />
      </View>

      {/* Mine boundary with live position and hazard pins */}
      <View style={styles.mapViewport}>
        <View style={styles.polygonShape}>
          <Text style={styles.polyLabel}>{(mine?.name || 'Mine').toUpperCase()} BOUNDARY</Text>

          {/* Current User Crosshair Ring matching Reference Screenshot */}
          <View style={styles.targetRing}>
            <Feather name="crosshair" size={24} color={colors.emeraldGlow} />
          </View>
          <Text style={styles.userLabel}>
            {fix ? `GPS Locked: ${fix.lat.toFixed(4)}° N${isInside ? '' : ' (outside)'}` : 'Acquiring GPS…'}
          </Text>

          {/* Hazard Pins */}
          {mapPins.map((p) => {
            const pos = toBox(p.lat, p.lng);
            if (!pos) return null;
            const critical = p.severity === 'critical' || p.type === 'sos';
            return (
              <View key={p.id} style={[styles.pin, pos, !critical && { backgroundColor: colors.warning }]}>
                <Feather name={critical ? 'alert-triangle' : 'alert-circle'} size={16} color={critical ? '#FFF' : '#05080A'} />
              </View>
            );
          })}
        </View>
      </View>

      {/* Mini Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Open Field Hazards Near You ({hazards.length})</Text>
        {nearest.map((h) => (
          <Text key={h.id} style={styles.cardItem} numberOfLines={1}>
            {h.severity === 'critical' ? '🔴' : h.severity === 'high' ? '🟠' : '🟡'} {h.title}
            {h.distance != null ? ` (${formatDistance(h.distance)})` : ''}
          </Text>
        ))}
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
