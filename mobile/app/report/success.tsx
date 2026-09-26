import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { BigButton } from '../../src/components/BigButton';
import { TrustBadge } from '../../src/components/TrustBadge';
import { colors } from '../../src/theme/colors';

export default function ReportSuccessScreen() {
  const router = useRouter();
  const { refId, queued, trust, flags } = useLocalSearchParams();
  const isQueued = queued === '1';
  const trustScore = trust ? Number(trust) : null;
  const trustFlags = flags ? String(flags).split(',').filter(Boolean) : [];

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Feather name="check" size={54} color="#FFF" />
      </View>

      <Text style={styles.title}>{isQueued ? 'Report Saved Locally ✓' : 'Report Submitted ✓'}</Text>
      <Text style={styles.refCode}>Ref ID: {refId}</Text>
      <Text style={styles.subText}>
        {isQueued
          ? 'Saved to offline outbox. Will sync automatically when network is connected.'
          : 'Sent to the mine control room. Serious hazards automatically become a CAPA.'}
        {trustScore != null ? ' Satya Proof trust verification attached.' : ''}
      </Text>

      {trustScore != null && (
        <View style={{ marginVertical: 20 }}>
          <TrustBadge score={trustScore} flags={trustFlags} />
        </View>
      )}

      <BigButton
        title="Return to Home Dashboard"
        onPress={() => router.replace('/(tabs)/home')}
        style={{ width: '100%', marginTop: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  refCode: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.emerald,
    marginTop: 6,
  },
  subText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
  },
});
