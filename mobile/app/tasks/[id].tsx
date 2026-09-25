import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, Image, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { MOCK_TASKS } from '../../src/api/mock/data';
import { completeTaskApi } from '../../src/api/endpoints';
import { BigButton } from '../../src/components/BigButton';
import { formatDueText } from '../../src/lib/format';
import { TrustBadge } from '../../src/components/TrustBadge';
import { colors } from '../../src/theme/colors';

export default function TaskDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const task = MOCK_TASKS.find((t) => t.id === id) || MOCK_TASKS[0];

  const [remarks, setRemarks] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [completedResult, setCompletedResult] = useState<any>(null);

  const due = formatDueText(task.due_date);

  const handleComplete = async () => {
    if (!photoUri && task.status !== 'done') {
      Alert.alert('Evidence Required', 'Please take a Satya Proof photo before completing this obligation.');
      return;
    }

    setLoading(true);
    try {
      const res = await completeTaskApi(task.id, 'evid-999', remarks);
      setCompletedResult(res);
      Alert.alert('Task Completed ✓', 'Evidence saved to outbox & verified with Trust Score 92!');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

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
            setPhotoUri('https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=600');
            router.push('/camera' as any);
          }}>
            <Feather name="camera" size={36} color={colors.safetyAmberDark} />
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
          value={remarks}
          onChangeText={setRemarks}
        />

        {completedResult || task.status === 'done' ? (
          <View style={styles.doneBanner}>
            <Feather name="check-circle" size={24} color={colors.success} />
            <Text style={styles.doneText}>Obligation Completed & Verified</Text>
            <TrustBadge score={92} />
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
    backgroundColor: '#F8FAFC',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  catBadge: {
    backgroundColor: colors.coalBlue,
    color: colors.safetyAmber,
    fontSize: 11,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dueText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.coalBlue,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.coalBlue,
    lineHeight: 26,
  },
  lawRef: {
    fontSize: 14,
    color: '#64748B',
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
    color: '#1E293B',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.coalBlue,
    marginBottom: 14,
  },
  uploadPlaceholder: {
    height: 160,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.safetyAmber,
    borderStyle: 'dashed',
    backgroundColor: '#FFFBEB',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.coalBlue,
    marginTop: 8,
  },
  uploadSub: {
    fontSize: 12,
    color: '#64748B',
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
    color: colors.coalBlue,
    marginBottom: 6,
  },
  textArea: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    textAlignVertical: 'top',
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
