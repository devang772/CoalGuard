import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { completeTaskApi, fetchTaskApi } from '../../src/api/endpoints';
import { useApi } from '../../src/lib/useApi';
import { useCapturedPhoto } from '../../src/lib/capture';
import { BigButton } from '../../src/components/BigButton';
import { formatDueText } from '../../src/lib/format';
import { TrustBadge } from '../../src/components/TrustBadge';
import { colors } from '../../src/theme/colors';

export default function TaskDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const taskQuery = useApi(() => fetchTaskApi(String(id)), [id]);
  const task = taskQuery.data;

  const [remarks, setRemarks] = useState('');
  const { uri: capturedUri, meta: photoMeta } = useCapturedPhoto();
  const photoUri = capturedUri || task?.evidence?.url || null;
  const [loading, setLoading] = useState(false);
  const [completedResult, setCompletedResult] = useState<{ trust_score?: number | null; flags?: string[] } | null>(null);

  if (!task) {
    return (
      <View style={[styles.container, { flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
        {taskQuery.loading ? (
          <ActivityIndicator size="large" color={colors.emerald} />
        ) : (
          <Text style={{ color: colors.textSecondary }}>{taskQuery.error || 'Task not found'}</Text>
        )}
      </View>
    );
  }

  const due = formatDueText(task.due_date);

  const handleComplete = async () => {
    if (!capturedUri && task.status !== 'done') {
      Alert.alert('Evidence Required', 'Please take a Satya Proof photo before completing this obligation.');
      return;
    }

    setLoading(true);
    try {
      const res = await completeTaskApi(task.id, capturedUri, photoMeta, remarks);
      if (res.queued) {
        setCompletedResult({ trust_score: null, flags: [] });
        Alert.alert('Saved Offline', 'No network. The completion and photo are in the outbox and will sync automatically.');
      } else {
        const score = res.evidence?.trust_score ?? res.data?.trust_score ?? null;
        setCompletedResult({ trust_score: score, flags: res.evidence?.flags || [] });
        Alert.alert('Task Completed ✓', score != null ? `Evidence verified with Trust Score ${score}.` : 'Task marked complete.');
        taskQuery.refresh();
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const doneScore = completedResult?.trust_score ?? task.trust_score;
  const doneFlags = completedResult?.flags ?? task.trust_flags;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Obligation Header */}
      <View style={styles.card}>
        <View style={styles.badgeRow}>
          <Text style={styles.catBadge}>{task.obligation.category.toUpperCase()}</Text>
          <Text style={[styles.dueText, due.isOverdue && { color: colors.danger }]}>
            ⏰ {due.text}
          </Text>
        </View>

        <Text style={styles.title}>{task.obligation.title}</Text>
        <Text style={styles.lawRef}>{task.obligation.law_ref}</Text>

        <View style={styles.evidenceBox}>
          <Feather name="info" size={18} color={colors.info} />
          <View style={{ flex: 1 }}>
            <Text style={styles.evidenceTitle}>Required Evidence:</Text>
            <Text style={styles.evidenceDesc}>{task.obligation.evidence_needed}</Text>
          </View>
        </View>
      </View>

      {/* Completion / Proof Section */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Satya Proof Evidence Capture</Text>

        {photoUri ? (
          <View style={styles.photoContainer}>
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
            <TouchableOpacity style={styles.retakeOverlay} onPress={() => router.push('/camera' as any)}>
              <Text style={styles.retakeText}>Retake Photo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.uploadPlaceholder} onPress={() => {
            router.push('/camera' as any);
          }}>
            <Feather name="camera" size={36} color={colors.emerald} />
            <Text style={styles.uploadText}>Take Proof Photo (In-App Only)</Text>
            <Text style={styles.uploadSub}>Captures GPS, timestamp & device ID</Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.label, { marginTop: 16 }]}>Remarks / Inspector Notes</Text>
        <TextInput
          style={styles.textArea}
          multiline
          numberOfLines={3}
          placeholder="Add remarks or dictation notes..."
          placeholderTextColor="#64748B"
          value={remarks}
          onChangeText={setRemarks}
        />

        {completedResult || task.status === 'done' ? (
          <View style={styles.doneBanner}>
            <Feather name="check-circle" size={24} color={colors.success} />
            <Text style={styles.doneText}>Obligation Completed & Verified</Text>
            {doneScore != null && <TrustBadge score={doneScore} flags={doneFlags} />}
          </View>
        ) : (
          <BigButton
            title="Mark Complete (Save to Outbox)"
            onPress={handleComplete}
            loading={loading}
            style={{ marginTop: 20 }}
          />
        )}
      </View>
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
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  catBadge: {
    backgroundColor: '#131F24',
    color: colors.emerald,
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.emeraldBorder,
  },
  dueText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
    lineHeight: 26,
  },
  lawRef: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  evidenceBox: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.infoLight,
    padding: 14,
    borderRadius: 12,
    marginTop: 14,
  },
  evidenceTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.info,
  },
  evidenceDesc: {
    fontSize: 13,
    color: colors.textPrimary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.emerald,
    marginBottom: 14,
  },
  uploadPlaceholder: {
    height: 160,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.emerald,
    borderStyle: 'dashed',
    backgroundColor: colors.emeraldMuted,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.emerald,
    marginTop: 8,
  },
  uploadSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  photoContainer: {
    position: 'relative',
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 14,
  },
  retakeOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(15,23,42,0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  retakeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  textArea: {
    borderWidth: 1.5,
    borderColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    textAlignVertical: 'top',
    backgroundColor: '#131F24',
    color: colors.textPrimary,
  },
  doneBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    padding: 14,
    borderRadius: 14,
    gap: 10,
    marginTop: 20,
  },
  doneText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: colors.success,
  },
});
