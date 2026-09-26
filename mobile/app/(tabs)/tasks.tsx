import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { fetchTasksApi } from '../../src/api/endpoints';
import { useApi } from '../../src/lib/useApi';
import { formatDueText } from '../../src/lib/format';
import { TrustBadge } from '../../src/components/TrustBadge';
import { colors } from '../../src/theme/colors';

export default function TasksScreen() {
  const router = useRouter();
  const [segment, setSegment] = useState<'today' | 'week' | 'overdue' | 'done'>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const tasks = useApi(() => fetchTasksApi(segment), [segment]);

  const query = searchQuery.toLowerCase();
  const filteredTasks = (tasks.data || []).filter(
    (t) => t.obligation.title.toLowerCase().includes(query) || (t.obligation.law_ref || '').toLowerCase().includes(query)
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await tasks.refresh();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchBar}>
        <Feather name="search" size={20} color="#94A3B8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search obligations & law ref..."
          placeholderTextColor="#64748B"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Segment Tabs */}
      <View style={styles.segmentContainer}>
        {(['today', 'week', 'overdue', 'done'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.segmentBtn, segment === tab && styles.activeSegmentBtn]}
            onPress={() => setSegment(tab)}
          >
            <Text style={[styles.segmentText, segment === tab && styles.activeSegmentText]}>
              {tab.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredTasks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.emerald]} tintColor={colors.emerald} />
        }
        renderItem={({ item }) => {
          const due = formatDueText(item.due_date);
          return (
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.taskCard}
              onPress={() => router.push(`/tasks/${item.id}` as any)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.categoryChip}>
                  <Feather name="shield" size={14} color={colors.emerald} />
                  <Text style={styles.categoryText}>{item.obligation.category}</Text>
                </View>

                {item.escalation_level !== 'L0' && (
                  <View style={styles.escalationChip}>
                    <Text style={styles.escalationText}>{item.escalation_level} Escalated</Text>
                  </View>
                )}
              </View>

              <Text style={styles.taskTitle}>{item.obligation.title}</Text>
              <Text style={styles.lawRef}>{item.obligation.law_ref}</Text>

              <View style={styles.cardFooter}>
                <Text style={[styles.dueText, due.isOverdue && styles.overdueText]}>
                  ⏰ {due.text}
                </Text>

                {item.status === 'done' ? (
                  item.trust_score != null ? (
                    <TrustBadge score={item.trust_score} flags={item.trust_flags} showDetails={false} />
                  ) : null
                ) : (
                  <Text style={styles.actionPrompt}>Complete →</Text>
                )}
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D1518',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#1A2B26',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    marginLeft: 10,
    fontSize: 15,
    color: '#FFFFFF',
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#0D1518',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#1A2B26',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeSegmentBtn: {
    backgroundColor: colors.emerald,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
  },
  activeSegmentText: {
    color: '#05080A',
  },
  taskCard: {
    backgroundColor: '#0D1518',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#1A2B26',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.emerald,
    textTransform: 'uppercase',
  },
  escalationChip: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  escalationText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.danger,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  lawRef: {
    fontSize: 13,
    color: '#94A3B8',
    marginVertical: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
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
  actionPrompt: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.emerald,
  },
});
