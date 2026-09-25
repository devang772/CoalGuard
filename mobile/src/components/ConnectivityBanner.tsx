import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSyncStore } from '../store/sync';
import { useSettingsStore } from '../store/settings';
import { processOutboxSync } from '../offline/syncEngine';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export const ConnectivityBanner: React.FC = () => {
  const { isOnline, isSyncing, pendingCount } = useSyncStore();
  const { forceOffline } = useSettingsStore();

  const effectiveOnline = isOnline && !forceOffline;

  if (effectiveOnline && pendingCount === 0 && !isSyncing) {
    return (
      <View style={[styles.container, { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' }]}>
        <Feather name="wifi" size={14} color={colors.emerald} />
        <Text style={[styles.text, { color: colors.emerald }]}>Online · Satya Sync Active</Text>
      </View>
    );
  }

  if (isSyncing) {
    return (
      <View style={[styles.container, { backgroundColor: 'rgba(59, 130, 246, 0.15)', borderColor: 'rgba(59, 130, 246, 0.3)' }]}>
        <Feather name="refresh-cw" size={14} color={colors.info} />
        <Text style={[styles.text, { color: colors.info }]}>Syncing items to server...</Text>
      </View>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => processOutboxSync()}
      style={[styles.container, { backgroundColor: '#0D1518', borderColor: '#1A2B26' }]}
    >
      <Feather name="wifi-off" size={14} color={colors.warning} />
      <Text style={[styles.text, { color: colors.warning }]}>
        {forceOffline ? 'Offline Mode (Simulated)' : 'Offline'} · {pendingCount} {pendingCount === 1 ? 'item' : 'items'} saved on phone (Tap to sync)
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
  },
});
