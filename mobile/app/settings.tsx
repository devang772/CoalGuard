import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSettingsStore, LocationSimulation } from '../src/store/settings';
import { useAuthStore } from '../src/store/auth';
import { colors } from '../src/theme/colors';

export default function SettingsScreen() {
  const router = useRouter();
  const {
    themeMode,
    setThemeMode,
    fontSizeMode,
    setFontSizeMode,
    appLockEnabled,
    setAppLockEnabled,
    locationSimulation,
    setLocationSimulation,
    forceOffline,
    setForceOffline,
  } = useSettingsStore();

  const { selectedLanguage } = useAuthStore();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Dev Simulator Card */}
      <View style={[styles.card, { borderColor: colors.emerald, borderWidth: 1.5 }]}>
        <Text style={styles.devHeader}>⚡ SIH DEMO SIMULATION TOOLS</Text>

        <Text style={styles.label}>Location Simulator (Geofence & Satya Test)</Text>
        <View style={styles.simGrid}>
          {(['inside', 'outside', 'mock_gps'] as LocationSimulation[]).map((sim) => (
            <TouchableOpacity
              key={sim}
              style={[styles.simBtn, locationSimulation === sim && styles.simBtnActive]}
              onPress={() => setLocationSimulation(sim)}
            >
              <Text style={[styles.simText, locationSimulation === sim && styles.simTextActive]}>
                {sim.toUpperCase().replace('_', ' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Simulate Force Offline (Test Outbox)</Text>
          <Switch value={forceOffline} onValueChange={setForceOffline} trackColor={{ true: colors.danger }} />
        </View>
      </View>

      {/* App Customizations */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>App Preferences</Text>

        <TouchableOpacity style={styles.rowItem} onPress={() => router.push('/(auth)/language' as any)}>
          <Text style={styles.rowLabel}>Language / भाषा</Text>
          <Text style={styles.rowVal}>{selectedLanguage.toUpperCase()} →</Text>
        </TouchableOpacity>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>High-Contrast Dark Mode (Underground)</Text>
          <Switch
            value={themeMode === 'dark'}
            onValueChange={(val) => setThemeMode(val ? 'dark' : 'light')}
            trackColor={{ true: colors.emerald }}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Large Text Size Mode</Text>
          <Switch
            value={fontSizeMode === 'large'}
            onValueChange={(val) => setFontSizeMode(val ? 'large' : 'normal')}
            trackColor={{ true: colors.emerald }}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>App Lock (Fingerprint / PIN)</Text>
          <Switch value={appLockEnabled} onValueChange={setAppLockEnabled} trackColor={{ true: colors.emerald }} />
        </View>
      </View>

      <TouchableOpacity style={styles.replayOnboarding} onPress={() => router.push('/(auth)/permissions' as any)}>
        <Feather name="shield" size={18} color={colors.emerald} />
        <Text style={styles.replayText}>Replay Permissions Onboarding</Text>
      </TouchableOpacity>
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
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  devHeader: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.emerald,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.emerald,
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  simGrid: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  simBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#131F24',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  simBtnActive: {
    backgroundColor: colors.emeraldMuted,
    borderColor: colors.emerald,
  },
  simText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  simTextActive: {
    color: colors.emerald,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  rowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  rowVal: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.emerald,
  },
  replayOnboarding: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  replayText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.emerald,
  },
});
