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
      <View style={[styles.card, { borderColor: colors.safetyAmber, borderWidth: 2 }]}>
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
            trackColor={{ true: colors.safetyAmber }}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Large Text Size Mode</Text>
          <Switch
            value={fontSizeMode === 'large'}
            onValueChange={(val) => setFontSizeMode(val ? 'large' : 'normal')}
            trackColor={{ true: colors.safetyAmber }}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>App Lock (Fingerprint / PIN)</Text>
          <Switch value={appLockEnabled} onValueChange={setAppLockEnabled} trackColor={{ true: colors.safetyAmber }} />
        </View>
      </View>

      <TouchableOpacity style={styles.replayOnboarding} onPress={() => router.push('/(auth)/permissions' as any)}>
        <Feather name="shield" size={18} color={colors.info} />
        <Text style={styles.replayText}>Replay Permissions Onboarding</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#F8FAFC',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  devHeader: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.safetyAmberDark,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.coalBlue,
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.coalBlue,
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
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  simBtnActive: {
    backgroundColor: colors.coalBlue,
  },
  simText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.coalBlue,
  },
  simTextActive: {
    color: colors.safetyAmber,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.coalBlue,
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
    color: colors.coalBlue,
  },
  rowVal: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.info,
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
    color: colors.info,
  },
});
