import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { BigButton } from '../../src/components/BigButton';
import { submitObservationApi } from '../../src/api/endpoints';
import { useCapturedPhoto } from '../../src/lib/capture';
import { getCurrentFix } from '../../src/lib/location';
import { useAuthStore } from '../../src/store/auth';
import { useSyncStore } from '../../src/store/sync';
import { useSettingsStore } from '../../src/store/settings';
import { colors } from '../../src/theme/colors';

const REPORT_TYPES = [
  { key: 'unsafe_act', label: 'Unsafe Act' },
  { key: 'unsafe_condition', label: 'Unsafe Condition' },
  { key: 'near_miss', label: 'Near Miss' },
  { key: 'incident', label: 'Incident' },
];

const CATEGORIES = [
  { key: 'roof', label: 'Roof' },
  { key: 'haul_road', label: 'Haul Road' },
  { key: 'conveyor', label: 'Conveyor' },
  { key: 'electrical', label: 'Electrical' },
  { key: 'fire', label: 'Fire' },
  { key: 'water', label: 'Water' },
  { key: 'dust', label: 'Dust' },
  { key: 'ppe', label: 'PPE' },
  { key: 'machinery', label: 'Machinery' },
  { key: 'explosives', label: 'Explosives' },
  { key: 'other', label: 'Other' },
];

const SEVERITIES = [
  { key: 'low', label: 'Low', color: '#10B981' },
  { key: 'medium', label: 'Medium', color: '#F59E0B' },
  { key: 'high', label: 'High', color: '#F97316' },
  { key: 'critical', label: 'Critical', color: '#EF4444' },
];

export default function FormReportScreen() {
  const router = useRouter();
  const { user, selectedLanguage } = useAuthStore();
  const forceOffline = useSettingsStore((s) => s.forceOffline);
  const isOnline = useSyncStore((s) => s.isOnline);
  const isOffline = forceOffline || !isOnline;

  const [reportType, setReportType] = useState<'unsafe_act' | 'unsafe_condition' | 'near_miss' | 'incident'>('unsafe_condition');
  const [category, setCategory] = useState<string>('electrical');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('high');
  const [description, setDescription] = useState('');
  const [exactSpot, setExactSpot] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const { uri: photoUri, meta: photoMeta, reset: resetPhoto } = useCapturedPhoto();
  const [submitting, setSubmitting] = useState(false);
  const [inReviewMode, setInReviewMode] = useState(false);

  const selectedTypeLabel = REPORT_TYPES.find((t) => t.key === reportType)?.label || reportType;
  const selectedCatLabel = CATEGORIES.find((c) => c.key === category)?.label || category;
  const selectedSevObj = SEVERITIES.find((s) => s.key === severity) || SEVERITIES[2];

  const handleValidateAndReview = () => {
    const text = description.trim() || (exactSpot.trim() ? `${selectedTypeLabel} reported at ${exactSpot.trim()}` : '');
    if (text.length < 3) {
      Alert.alert('Required Info', 'Please describe what you saw (Step 3).');
      return;
    }
    if ((reportType === 'unsafe_condition' || reportType === 'incident') && !photoUri) {
      Alert.alert('Photo Evidence Required', 'A Satya Proof photo is required for unsafe conditions and incidents.');
      return;
    }
    setInReviewMode(true);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const fix = photoMeta?.lat != null ? null : await getCurrentFix();
      const res = await submitObservationApi({
        type: reportType,
        category,
        text: description.trim(),
        severity,
        location_text: exactSpot.trim(),
        lat: photoMeta?.lat ?? fix?.lat ?? null,
        lng: photoMeta?.lng ?? fix?.lng ?? null,
        anonymous,
        photoUri,
        photoMeta,
        source: 'app',
        language: selectedLanguage,
      });

      router.push({
        pathname: '/report/success' as any,
        params: {
          refId: res.data ? `REP-${res.data.id}` : 'Pending sync',
          queued: res.queued ? '1' : '0',
          trust: res.evidence?.trust_score != null ? String(res.evidence.trust_score) : '',
          flags: (res.evidence?.flags || []).join(','),
        },
      });
    } catch (e: any) {
      Alert.alert('Submission Error', e.message || 'Could not submit hazard report.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Offline Status Indicator */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Feather name="wifi-off" size={16} color={colors.safetyAmber} />
          <Text style={styles.offlineText}>
            Offline Mode Active — Report will be queued in SQLite Outbox and synced automatically when online.
          </Text>
        </View>
      )}

      {!inReviewMode ? (
        <>
          {/* STEP 2: SELECT WHAT HAPPENED */}
          <Text style={styles.title}>Report Safety Hazard</Text>
          <Text style={styles.subTitle}>Step 2 of 5: Select hazard details</Text>

          {/* Observation Type */}
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>1. Observation Type</Text>
            <View style={styles.grid2}>
              {REPORT_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.chipBtn, reportType === t.key && styles.chipBtnActive]}
                  onPress={() => {
                    setReportType(t.key as any);
                    if (t.key === 'incident') setSeverity('critical');
                  }}
                >
                  <Text style={[styles.chipText, reportType === t.key && styles.chipTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Category */}
            <Text style={[styles.sectionHeader, { marginTop: 16 }]}>2. Category</Text>
            <View style={styles.chipGrid}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.smallChip, category === c.key && styles.smallChipActive]}
                  onPress={() => setCategory(c.key)}
                >
                  <Text style={[styles.smallChipText, category === c.key && styles.smallChipTextActive]}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Severity */}
            <Text style={[styles.sectionHeader, { marginTop: 16 }]}>3. Severity Level</Text>
            <View style={styles.grid4}>
              {SEVERITIES.map((s) => (
                <TouchableOpacity
                  key={s.key}
                  style={[
                    styles.sevBtn,
                    severity === s.key && { borderColor: s.color, backgroundColor: 'rgba(255,255,255,0.08)' },
                  ]}
                  onPress={() => setSeverity(s.key as any)}
                >
                  <View style={[styles.dot, { backgroundColor: s.color }]} />
                  <Text style={[styles.sevText, severity === s.key && { color: s.color, fontWeight: '900' }]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* STEP 3: DESCRIBE HAZARD */}
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>Step 3: Describe the Hazard</Text>

            <Text style={styles.inputLabel}>Location / Mine Spot</Text>
            <TextInput
              style={styles.input}
              value={exactSpot}
              onChangeText={setExactSpot}
              placeholder="e.g. Conveyor belt #3, Underground Seam 2"
              placeholderTextColor="#64748B"
            />

            <Text style={[styles.inputLabel, { marginTop: 12 }]}>Hazard Description</Text>
            <TextInput
              style={styles.textArea}
              multiline
              numberOfLines={3}
              value={description}
              onChangeText={setDescription}
              placeholder="e.g. Exposed electrical wire near conveyor belt causing sparking risk."
              placeholderTextColor="#64748B"
            />
          </View>

          {/* STEP 4: CAPTURE EVIDENCE */}
          <View style={styles.card}>
            <Text style={styles.sectionHeader}>Step 4: Capture Field Evidence (Satya Proof)</Text>

            {photoUri ? (
              <View style={styles.photoContainer}>
                <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                <View style={styles.satyaBadge}>
                  <Feather name="shield" size={14} color={colors.emerald} />
                  <Text style={styles.satyaBadgeText}>
                    Satya Proof Attached · {photoMeta?.lat ? `${photoMeta.lat.toFixed(4)}N, ${photoMeta.lng?.toFixed(4)}E` : 'GPS Tagged'}
                  </Text>
                </View>
                <TouchableOpacity style={styles.changePhotoBtn} onPress={() => router.push('/camera' as any)}>
                  <Feather name="camera" size={14} color="#FFF" />
                  <Text style={styles.changePhotoText}>Retake Photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.photoBox}
                onPress={() => router.push('/camera' as any)}
              >
                <Feather name="camera" size={32} color={colors.emerald} />
                <Text style={styles.photoBoxTitle}>Open Satya Proof Camera</Text>
                <Text style={styles.photoBoxSub}>
                  Captures live camera photo with trusted GPS, timestamp & mine watermark.
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchLabel}>Report Anonymously 🔒</Text>
                <Text style={styles.switchSub}>Reporter name will be hidden from mine management.</Text>
              </View>
              <Switch value={anonymous} onValueChange={setAnonymous} trackColor={{ true: colors.emerald }} />
            </View>
          </View>

          <BigButton
            title="Review Hazard Report →"
            onPress={handleValidateAndReview}
          />
        </>
      ) : (
        /* STEP 5: REVIEW BEFORE SUBMISSION */
        <View style={styles.reviewContainer}>
          <Text style={styles.title}>Step 5: Review Hazard</Text>
          <Text style={styles.subTitle}>Confirm report details before submitting to Mine Control.</Text>

          <View style={styles.reviewCard}>
            <View style={styles.reviewHeaderRow}>
              <Feather name="clipboard" size={22} color={colors.emerald} />
              <Text style={styles.reviewCardTitle}>Hazard Report Summary</Text>
            </View>

            <View style={styles.reviewDivider} />

            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Type:</Text>
              <Text style={styles.reviewValueBold}>{selectedTypeLabel}</Text>
            </View>

            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Category:</Text>
              <Text style={styles.reviewValueBold}>{selectedCatLabel}</Text>
            </View>

            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Severity:</Text>
              <View style={[styles.sevTag, { backgroundColor: selectedSevObj.color }]}>
                <Text style={styles.sevTagText}>{selectedSevObj.label.toUpperCase()}</Text>
              </View>
            </View>

            <View style={styles.reviewDivider} />

            <Text style={styles.reviewSectionTitle}>Description:</Text>
            <Text style={styles.reviewTextBody}>{description.trim() || `${selectedTypeLabel} at ${exactSpot}`}</Text>

            {exactSpot ? (
              <View style={[styles.reviewRow, { marginTop: 8 }]}>
                <Text style={styles.reviewLabel}>Spot:</Text>
                <Text style={styles.reviewValue}>{exactSpot}</Text>
              </View>
            ) : null}

            <View style={styles.reviewDivider} />

            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>📷 Evidence:</Text>
              <Text style={styles.reviewValue}>{photoUri ? '1 photo attached (Satya Proof)' : 'None (Audio/Text only)'}</Text>
            </View>

            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>📍 GPS:</Text>
              <Text style={styles.reviewValue}>{photoMeta?.lat ? `${photoMeta.lat.toFixed(4)}N, ${photoMeta.lng?.toFixed(4)}E (±${photoMeta.accuracy || 10}m)` : 'Captured'}</Text>
            </View>

            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>✓ Mine:</Text>
              <Text style={styles.reviewValue}>{user?.mine_name || 'Moonidih UG Mine'}</Text>
            </View>

            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>👤 Reporter:</Text>
              <Text style={styles.reviewValue}>{anonymous ? 'Anonymous' : (user?.name || 'Worker')}</Text>
            </View>
          </View>

          <BigButton
            title={isOffline ? "✓ Submit Report (Save Offline)" : "Submit Report →"}
            onPress={handleSubmit}
            loading={submitting}
          />

          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => setInReviewMode(false)}
            disabled={submitting}
          >
            <Feather name="edit-2" size={16} color={colors.emerald} />
            <Text style={styles.editText}>Edit Details</Text>
          </TouchableOpacity>
        </View>
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
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    padding: 12,
    borderRadius: 12,
    gap: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.safetyAmber,
  },
  offlineText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.safetyAmber,
    flex: 1,
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
  sectionHeader: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.emerald,
    marginBottom: 10,
  },
  grid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipBtn: {
    width: '48%',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#131F24',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  chipBtnActive: {
    backgroundColor: colors.emeraldMuted,
    borderColor: colors.emerald,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.emerald,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  smallChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#131F24',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  smallChipActive: {
    backgroundColor: colors.emeraldMuted,
    borderColor: colors.emerald,
  },
  smallChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  smallChipTextActive: {
    color: colors.emerald,
    fontWeight: '900',
  },
  grid4: {
    flexDirection: 'row',
    gap: 6,
  },
  sevBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#131F24',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sevText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#131F24',
    color: colors.textPrimary,
  },
  textArea: {
    borderWidth: 1.5,
    borderColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
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
    padding: 12,
    gap: 4,
  },
  photoBoxTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.emerald,
  },
  photoBoxSub: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  photoContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: 160,
    borderRadius: 12,
  },
  satyaBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(13, 21, 24, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  satyaBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFF',
  },
  changePhotoBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changePhotoText: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '700',
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
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  switchSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  /* STEP 5 REVIEW STYLES */
  reviewContainer: {
    marginTop: 4,
  },
  reviewCard: {
    backgroundColor: '#0D1518',
    borderRadius: 18,
    padding: 20,
    borderWidth: 2,
    borderColor: colors.emeraldBorder,
    marginBottom: 20,
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reviewCardTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  reviewDivider: {
    height: 1,
    backgroundColor: '#1E293B',
    marginVertical: 14,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reviewLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
  },
  reviewValue: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  reviewValueBold: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  sevTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sevTagText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFF',
  },
  reviewSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.emerald,
    marginBottom: 4,
  },
  reviewTextBody: {
    fontSize: 15,
    color: colors.textPrimary,
    lineHeight: 22,
    backgroundColor: '#131F24',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
    marginTop: 10,
  },
  editText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.emerald,
  },
});
