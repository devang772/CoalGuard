import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { MOCK_CAPAS } from '../../src/api/mock/data';
import { formatDueText } from '../../src/lib/format';
import { TrustBadge } from '../../src/components/TrustBadge';
import { colors } from '../../src/theme/colors';

export default function CapaListScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<'open' | 'in_review' | 'closed' | 'rejected'>('open');

  const filteredCapas = MOCK_CAPAS.filter((item) => {
    if (tab === 'open') return item.status === 'open';
    if (tab === 'in_review') return item.status === 'in_review';
    if (tab === 'closed') return item.status === 'closed';
    if (tab === 'rejected') return item.status === 'rejected';
    return true;
  });

  return (
    <View style={styles.container}>
      {/* Sub Tabs */}
      <View style={styles.tabBar}>
        {(['open', 'in_review', 'closed', 'rejected'] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tabItem, tab === t && styles.activeTabItem]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabLabel, tab === t && styles.activeTabLabel]}>
              {t.replace('_', ' ').toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredCapas}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => {
          const due = formatDueText(item.due_at);
          return (
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.capaCard}
              onPress={() => router.push(`/capa/${item.id}` as any)}
            >
              {/* Severity stripe indicator */}
              <View
                style={[
                  styles.severityStripe,
                  {
                    backgroundColor:
                      item.finding.severity === 'critical'
                        ? colors.danger
                        : item.finding.severity === 'high'
                        ? colors.warning
                        : colors.emerald,
                  },
                ]}
              />

              <View style={styles.cardContent}>
                <View style={styles.cardHeader}>
                  <View style={styles.badgeRow}>
                    <Text style={styles.severityText}>{item.finding.severity.toUpperCase()}</Text>
                  </View>

                  {item.escalation_level !== 'Assigned' && (
                    <View style={styles.escalationChip}>
                      <Text style={styles.escalationText}>{item.escalation_level} Escalated</Text>
                    </View>
                  )}
                </View>

                <View style={styles.bodyRow}>
                  <Image source={{ uri: item.before_photo.url }} style={styles.thumb} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.desc}>{item.finding.description}</Text>
                    <Text style={styles.catText}>Category: {item.finding.category}</Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={[styles.dueText, due.isOverdue && styles.overdueText]}>
                    ⏰ {due.text}
                  </Text>

                  {item.status === 'open' && (
                    <TouchableOpacity
                      style={styles.closeActionBtn}
                      onPress={() => router.push(`/capa/${item.id}/close` as any)}
                    >
                      <Text style={styles.closeActionText}>Fix Done: Take After Photo →</Text>
                    </TouchableOpacity>
                  )}

                  {item.trust_score && <TrustBadge score={item.trust_score} showDetails={false} />}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#05080A',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0D1518',
    margin: 16,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#1A2B26',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTabItem: {
    backgroundColor: colors.emerald,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94A3B8',
  },
  activeTabLabel: {
    color: '#05080A',
  },
  capaCard: {
    backgroundColor: '#0D1518',
    borderRadius: 16,
    marginBottom: 14,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#1A2B26',
  },
  severityStripe: {
    width: 6,
  },
  cardContent: {
    flex: 1,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  badgeRow: {
    backgroundColor: '#05080A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.emerald,
  },
  escalationChip: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  escalationText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.danger,
  },
  bodyRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#05080A',
  },
  desc: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  catText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1A2B26',
  },
  dueText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  overdueText: {
    color: colors.danger,
  },
  closeActionBtn: {
    backgroundColor: colors.emerald,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  closeActionText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#05080A',
  },
});
