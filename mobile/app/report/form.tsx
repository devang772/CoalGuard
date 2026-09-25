import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { BigButton } from '../../src/components/BigButton';
import { submitObservationApi } from '../../src/api/endpoints';
import { colors } from '../../src/theme/colors';

const REPORT_TYPES = [
  { key: 'unsafe_act', label: 'Unsafe Act' },
  { key: 'unsafe_condition', label: 'Unsafe Condition' },
  { key: 'near_miss', label: 'Near-Miss' },
  { key: 'incident', label: 'Incident' },
];

export default function FormReportScreen() {
  const router = useRouter();
  const [reportType, setReportType] = useState('unsafe_condition');
  const [description, setDescription] = useState('');
  const [exactSpot, setExactSpot] = useState('Seam 3, Level 2 Junction');
  const [anonymous, setAnonymous] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    const res = await submitObservationApi({
      type: reportType as any,
      category: 'roof',
      text: description || `${reportType} reported at ${exactSpot}`,
      severity: reportType === 'incident' ? 'critical' : 'medium',
      location_text: exactSpot,
      lat: 23.7505,
      lng: 86.4205,
      anonymous,
      photoUri,
      source: 'app',
    });
    setSubmitting(false);

    router.push({
      pathname: '/report/success' as any,
      params: { refId: res?.id || ('REP-' + Math.floor(10000 + Math.random() * 90000)) },
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Fill Hazard Form</Text>
      <Text style={styles.subTitle}>Select hazard type & capture location details.</Text>

      {/* Report Type Selector */}
      <View style={styles.card}>
        <Text style={styles.label}>Report Category Type</Text>
        <View style={styles.typeGrid}>
          {REPORT_TYPES.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.typeBtn, reportType === t.key && styles.typeBtnActive]}
              onPress={() => setReportType(t.key)}
            >
              <Text style={[styles.typeBtnText, reportType === t.key && styles.typeBtnTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Location Details */}
      <View style={styles.card}>
        <Text style={styles.label}>Exact Spot / Location Name</Text>
        <TextInput
          style={styles.input}
          value={exactSpot}
          onChangeText={setExactSpot}
          placeholder="e.g. Haul road km 4, Substation 2"
        />

        <Text style={[styles.label, { marginTop: 14 }]}>Description Details</Text>
        <TextInput
          style={styles.textArea}
          multiline
          numberOfLines={3}
          value={description}
          onChangeText={setDescription}
          placeholder="Enter observation details..."
        />
      </View>

      {/* Photo Attachment */}
      <View style={styles.card}>
        <Text style={styles.label}>Photo Attachment (Satya Proof Camera)</Text>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={{ width: '100%', height: 160, borderRadius: 12 }} />
        ) : (
          <TouchableOpacity
            style={styles.photoBox}
            onPress={() => {
              setPhotoUri('https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?w=600');
              router.push('/camera' as any);
            }}
          >
            <Feather name="camera" size={32} color={colors.safetyAmberDark} />
            <Text style={styles.photoText}>Take Proof Photo</Text>
          </TouchableOpacity>
        )}

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Report Anonymously 🔒</Text>
          <Switch value={anonymous} onValueChange={setAnonymous} trackColor={{ true: colors.safetyAmber }} />
        </View>
      </View>

      <BigButton title="Submit Hazard Report →" onPress={handleSubmit} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: colors.background,
    minHeight: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  subTitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    marginTop: 2,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  label: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.emerald,
    marginBottom: 10,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeBtn: {
    width: '48%',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#131F24',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  typeBtnActive: {
    backgroundColor: colors.emeraldMuted,
    borderColor: colors.emerald,
  },
  typeBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  typeBtnTextActive: {
    color: colors.emerald,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#131F24',
    color: colors.textPrimary,
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
  photoBox: {
    height: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.emerald,
    borderStyle: 'dashed',
    backgroundColor: colors.emeraldMuted,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  photoText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.emerald,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
