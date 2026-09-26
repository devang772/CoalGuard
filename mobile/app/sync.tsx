import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSyncStore } from '../src/store/sync';
import { useSettingsStore } from '../src/store/settings';
import { getAllOutboxItems, deleteOutboxItem, OutboxItem } from '../src/offline/outbox';
import { processOutboxSync } from '../src/offline/syncEngine';
import { useMasterStore } from '../src/store/master';
import { BigButton } from '../src/components/BigButton';
import { colors } from '../src/theme/colors';

export default function SyncStatusScreen() {
  const { isOnline, isSyncing, pendingCount, failedCount, lastSyncTime } = useSyncStore();
  const { forceOffline } = useSettingsStore();

  const [outboxItems, setOutboxItems] = useState<OutboxItem[]>(getAllOutboxItems());
  const [syncingNow, setSyncingNow] = useState(false);

  // Keep the list in step with background syncs.
  useEffect(() => {
    setOutboxItems(getAllOutboxItems());
  }, [pendingCount, failedCount, isSyncing]);

  const handleSyncNow = async () => {
    setSyncingNow(true);
    const res = await processOutboxSync();
    await useMasterStore.getState().load();
    setOutboxItems(getAllOutboxItems());
    setSyncingNow(false);
    if (res.errorCount > 0) {
      Alert.alert('Sync Finished', `${res.syncedCount} item(s) synced, ${res.errorCount} rejected by the server (see errors below).`);
    }
  };

  const handleDelete = (clientUuid: string) => {
    Alert.alert('Delete Outbox Item', 'Are you sure you want to remove this pending item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteOutboxItem(clientUuid);
          setOutboxItems(getAllOutboxItems());
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Sync Summary Card */}
      <View style={styles.card}>
        <View style={styles.statusHeader}>
          <Feather
            name={isOnline && !forceOffline ? 'wifi' : 'wifi-off'}
            size={22}
            color={isOnline && !forceOffline ? colors.success : colors.danger}
          />
          <Text style={styles.statusTitle}>
            {isOnline && !forceOffline ? 'Online · Satya Sync Connected' : 'Offline Mode Active'}
          </Text>
        </View>

        <Text style={styles.timeText}>Last Sync: {lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : 'Never'}</Text>

        <View style={styles.countsGrid}>
          <View style={styles.countCard}>
            <Text style={styles.countNum}>{pendingCount}</Text>
            <Text style={styles.countLabel}>Pending</Text>
          </View>
          <View style={[styles.countCard, { backgroundColor: colors.dangerLight }]}>
            <Text style={[styles.countNum, { color: colors.danger }]}>{failedCount}</Text>
            <Text style={[styles.countLabel, { color: colors.danger }]}>Failed</Text>
          </View>
        </View>

        <BigButton
          title="Sync Pending Outbox Items Now 🔄"
          onPress={handleSyncNow}
          loading={syncingNow || isSyncing}
          style={{ marginTop: 16 }}
        />
      </View>

      {/* Outbox Items List */}
      <Text style={styles.sectionTitle}>Outbox Queue ({outboxItems.length})</Text>

      {outboxItems.length === 0 ? (
        <View style={styles.emptyBox}>
          <Feather name="check-circle" size={40} color={colors.success} />
          <Text style={styles.emptyTitle}>Outbox Clean & Synced</Text>
          <Text style={styles.emptySub}>All reports and completions have reached the server.</Text>
        </View>
      ) : (
        outboxItems.map((item) => (
          <View key={item.client_uuid} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <View style={styles.kindTag}>
                <Text style={styles.kindText}>{item.kind.toUpperCase()}</Text>
              </View>
              <Text style={[styles.statusTag, item.status === 'failed' && { color: colors.danger }]}>
                {item.status.toUpperCase()}
              </Text>
            </View>

            <Text style={styles.itemUuid}>UUID: {item.client_uuid}</Text>
            <Text style={styles.itemTime}>{new Date(item.created_at).toLocaleTimeString()}</Text>

            {item.last_error && <Text style={styles.errorText}>Error: {item.last_error}</Text>}

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.retryBtn} onPress={handleSyncNow}>
                <Feather name="rotate-cw" size={14} color={colors.info} />
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item.client_uuid)}>
                <Feather name="trash-2" size={14} color={colors.danger} />
                <Text style={styles.delText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
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
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  timeText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  countsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  countCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.infoLight,
    alignItems: 'center',
  },
  countNum: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.info,
  },
  countLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.info,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.emerald,
    marginBottom: 12,
  },
  emptyBox: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  itemCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  kindTag: {
    backgroundColor: '#131F24',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.emeraldBorder,
  },
  kindText: {
    color: colors.emerald,
    fontSize: 11,
    fontWeight: '800',
  },
  statusTag: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.success,
  },
  itemUuid: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  itemTime: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.emerald,
  },
  delBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  delText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.danger,
  },
});
