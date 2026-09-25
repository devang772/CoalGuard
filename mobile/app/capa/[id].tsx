import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { MOCK_CAPAS } from '../../src/api/mock/data';
import { formatDueText } from '../../src/lib/format';
import { DistanceMeter } from '../../src/components/DistanceMeter';
import { BigButton } from '../../src/components/BigButton';
import { colors } from '../../src/theme/colors';

export default function CapaDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const capa = MOCK_CAPAS.find((c) => c.id === id) || MOCK_CAPAS[0];

  const due = formatDueText(capa.due_at);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Before Photo */}
      <View style={styles.imageCard}>
        <Text style={styles.photoTag}>BEFORE PHOTO · Satya Verified</Text>
        <Image source={{ uri: capa.before_photo.url }} style={styles.beforePhoto} resizeMode="cover" />
      </View>

      {/* Details Card */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.sevBadge}>{capa.finding.severity.toUpperCase()}</Text>
          <Text style={[styles.dueText, due.isOverdue && { color: colors.danger }]}>
            ⏰ {due.text}
          </Text>
        </View>

        <Text style={styles.desc}>{capa.finding.description}</Text>
        <Text style={styles.catText}>Category: {capa.finding.category} · CMR Reg 123</Text>

        {/* Escalation Timeline */}
        <Text style={styles.sectionHeader}>Escalation Status Timeline</Text>
        <View style={styles.timelineRow}>
          <View style={[styles.timelineNode, styles.nodeDone]}>
            <Text style={styles.nodeText}>Assigned</Text>
          </View>
          <View style={styles.timelineLine} />
          <View style={[styles.timelineNode, styles.nodeDone]}>
            <Text style={styles.nodeText}>Reminder</Text>
          </View>
          <View style={styles.timelineLine} />
          <View style={[styles.timelineNode, capa.escalation_level !== 'Assigned' ? styles.nodeActive : styles.nodePending]}>
            <Text style={styles.nodeText}>L1 Escalated</Text>
          </View>
        </View>
      </View>

      {/* Distance Meter & Location */}
      <View style={styles.card}>
        <Text style={styles.sectionHeader}>Target Spot Distance Check</Text>
        <DistanceMeter distanceMeters={250} />
      </View>

      {capa.status === 'open' && (
        <BigButton
          title="Fix Done: Take After Photo →"
          onPress={() => router.push(`/capa/${capa.id}/close` as any)}
          style={{ marginVertical: 10 }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#F8FAFC',
  },
  imageCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  photoTag: {
    backgroundColor: colors.coalBlue,
    color: colors.safetyAmber,
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  beforePhoto: {
    width: '100%',
    height: 220,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sevBadge: {
    backgroundColor: colors.dangerLight,
    color: colors.danger,
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dueText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.coalBlue,
  },
  desc: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.coalBlue,
    lineHeight: 24,
  },
  catText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 6,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.coalBlue,
    marginTop: 16,
    marginBottom: 10,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timelineNode: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  nodeDone: {
    backgroundColor: colors.successLight,
  },
  nodeActive: {
    backgroundColor: colors.warningLight,
  },
  nodePending: {
    backgroundColor: '#F1F5F9',
  },
  nodeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.coalBlue,
  },
  timelineLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#CBD5E1',
  },
});
