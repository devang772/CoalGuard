import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/auth';
import { useSettingsStore } from '../../src/store/settings';
import { useSyncStore } from '../../src/store/sync';
import { useTranslation } from 'react-i18next';
import { processVoiceAiApi, submitObservationApi } from '../../src/api/endpoints';
import { getCurrentFix } from '../../src/lib/location';
import { useCapturedPhoto } from '../../src/lib/capture';
import { VoiceRecorder } from '../../src/components/VoiceRecorder';
import { BigButton } from '../../src/components/BigButton';
import { VoiceReportResult } from '../../src/api/types';
import { colors } from '../../src/theme/colors';

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

export default function VoiceReportScreen() {
  const router = useRouter();
  const { i18n } = useTranslation();
  const { user, selectedLanguage, setSelectedLanguage } = useAuthStore();
  const forceOffline = useSettingsStore((s) => s.forceOffline);
  const isOnline = useSyncStore((s) => s.isOnline);
  const isOffline = forceOffline || !isOnline;
  const { uri: photoUri, meta: photoMeta } = useCapturedPhoto();

  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiResult, setAiResult] = useState<VoiceReportResult | null>(null);
  const [inReviewMode, setInReviewMode] = useState(false);

  // Editable fields extracted by AI
  const [transcript, setTranscript] = useState('');
  const [hazardText, setHazardText] = useState('');
  const [locationText, setLocationText] = useState('');
  const [category, setCategory] = useState('electrical');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('high');

  const handleLanguageChange = (langCode: string) => {
    setSelectedLanguage(langCode);
    try {
      i18n.changeLanguage(langCode);
    } catch (e) {}
  };

  const handleRecordingComplete = async (uri: string, duration: number, localTranscript?: string) => {
    setRecordedUri(uri);
    setLoading(true);
    let result: VoiceReportResult | null = null;

    if (!isOffline) {
      try {
        result = await processVoiceAiApi(uri, selectedLanguage);
      } catch (e: any) {
        console.warn('Server voice processing failed:', e);
      }
    }

    if (!result) {
      const trans = (localTranscript || '').trim();

      // Multi-lingual hazard classification fallback
      let type: 'unsafe_act' | 'unsafe_condition' | 'near_miss' | 'incident' = 'unsafe_condition';
      let cat = 'other';
      let sev: 'critical' | 'high' | 'medium' | 'low' = 'medium';

      const lower = trans.toLowerCase();
      if (/injur|hurt|accident|died|dead|घायल|चोट|दुर्घटना|हादसा|आहत|দুর্ঘটনা|ଆଘାତ|ଦୁର୍ଘଟଣା/.test(lower)) {
        type = 'incident';
        sev = 'high';
      } else if (/near miss|missed|बच गया|बाल-बाल|অল্পের জন্য|ଅଳ୍ପକେ/.test(lower)) {
        type = 'near_miss';
      } else if (/no helmet|without mask|bina helmet|बिना हेलमेट|हेलमेट नहीं|হেলমেট|ହେଲମେଟ/.test(lower)) {
        type = 'unsafe_act';
      }

      if (/fire|smoke|aag|आग|धुआं|আগুন|धোঁয়া|ନିଆଁ|ଧୂଆଁ/.test(lower)) {
        cat = 'fire';
        sev = 'critical';
      } else if (/roof|crack|fall|chhat|darar|छत|दरार|चट्टान|ছাদ|ফাটল|ଛାତ|ଫାଟ/.test(lower)) {
        cat = 'roof';
      } else if (/water|flood|leak|pani|paani|पानी|बाढ़|रिसाव|पानी|জল|ପାଣି/.test(lower)) {
        cat = 'water';
      } else if (/conveyor|belt|कन्वेयर|बेल्ट|কনভেয়ার|କନଭେୟର/.test(lower)) {
        cat = 'conveyor';
      } else if (/wire|electric|current|shock|current|तार|बिजली|বিদ্যুৎ|ବିଦ୍ୟୁତ୍/.test(lower)) {
        cat = 'electrical';
        sev = 'high';
      }

      result = {
        transcript: trans,
        structured: {
          type,
          category: cat,
          hazard: trans || 'Voice hazard report',
          location_text: '',
          severity: sev,
        },
      };

      if (isOffline) {
        Alert.alert(
          'Offline Voice Mode 📶',
          'Voice recording saved locally. You can review details and attach a photo below.'
        );
      } else if (!trans) {
        Alert.alert(
          'Type Your Report',
          'Speech AI model is processing. Your audio recording is attached. Please review details below.'
        );
      }
    }

    setAiResult(result);
    setTranscript(result.transcript);
    setHazardText(result.structured.hazard);
    setLocationText(result.structured.location_text);
    setCategory(result.structured.category || 'electrical');
    setSeverity(result.structured.severity || 'high');
    setLoading(false);
  };

  const handleProceedToReview = () => {
    const text = (hazardText || transcript).trim();
    if (text.length < 3) {
      Alert.alert('Required Info', 'Please enter or speak a hazard description.');
      return;
    }
    setInReviewMode(true);
  };

  const handleConfirmSubmit = async () => {
    if (!aiResult) return;
    const text = (hazardText || transcript).trim();
    setSubmitting(true);
    try {
      const fix = photoMeta?.lat != null ? null : await getCurrentFix();
      const res = await submitObservationApi({
        type: aiResult.structured.type,
        category,
        text,
        severity,
        location_text: locationText,
        lat: photoMeta?.lat ?? fix?.lat ?? null,
        lng: photoMeta?.lng ?? fix?.lng ?? null,
        anonymous: false,
        source: 'voice',
        transcript: transcript || undefined,
        language: selectedLanguage,
        audioUri: recordedUri,
        photoUri,
        photoMeta,
      });

      router.push({
        pathname: '/report/success' as any,
        params: {
          refId: res.data ? `VR-${res.data.id}` : 'Pending sync',
          queued: res.queued ? '1' : '0',
          trust: res.evidence?.trust_score != null ? String(res.evidence.trust_score) : '',
          flags: (res.evidence?.flags || []).join(','),
        },
      });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCatLabel = CATEGORIES.find((c) => c.key === category)?.label || category;
  const selectedSevObj = SEVERITIES.find((s) => s.key === severity) || SEVERITIES[2];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Offline Banner */}
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Feather name="wifi-off" size={16} color={colors.safetyAmber} />
          <Text style={styles.offlineText}>
            Offline Mode Active — Voice recordings & photos saved locally in SQLite Outbox & auto-synced
          </Text>
        </View>
      )}

      {/* Interactive Language Selector */}
      {!aiResult && (
        <View style={styles.langSelectCard}>
          <View style={styles.langSelectHeader}>
            <Feather name="globe" size={16} color={colors.emerald} />
            <Text style={styles.langSelectTitle}>Recording Language / भाषा :</Text>
          </View>
          <View style={styles.langPickerRow}>
            {[
              { code: 'hi', label: 'हिंदी (HI)' },
              { code: 'en', label: 'English (EN)' },
              { code: 'bn', label: 'বাংলা (BN)' },
              { code: 'or', label: 'ଓଡ଼ିଆ (OR)' },
            ].map((item) => {
              const active = selectedLanguage === item.code;
              return (
                <TouchableOpacity
                  key={item.code}
                  activeOpacity={0.7}
                  style={[styles.langChip, active && styles.langChipActive]}
                  onPress={() => handleLanguageChange(item.code)}
                >
                  <Text style={[styles.langChipText, active && styles.langChipTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {!aiResult ? (
        <VoiceRecorder onRecordingComplete={handleRecordingComplete} language={selectedLanguage} />
      ) : !inReviewMode ? (
        /* AI Parsing & Details Screen */
        <View style={styles.aiCard}>
          <View style={styles.aiHeader}>
            <Feather name={isOffline ? "cloud-off" : "cpu"} size={24} color={colors.emerald} />
            <Text style={styles.aiTitle}>
              {isOffline ? "Voice Note Recorded:" : "AI Extracted Details:"}
            </Text>
          </View>

          <Text style={styles.label}>Voice Transcript</Text>
          <TextInput
            style={styles.input}
            multiline
            value={transcript}
            onChangeText={setTranscript}
            placeholder="Type or correct voice transcript..."
            placeholderTextColor="#64748B"
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Hazard Description</Text>
          <TextInput
            style={styles.input}
            value={hazardText}
            onChangeText={setHazardText}
            placeholder="Describe the hazard..."
            placeholderTextColor="#64748B"
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Estimated Location / Spot</Text>
          <TextInput
            style={styles.input}
            value={locationText}
            onChangeText={setLocationText}
            placeholder="e.g. Conveyor Belt #3"
            placeholderTextColor="#64748B"
          />

          {/* Category Picker */}
          <Text style={[styles.label, { marginTop: 12 }]}>Category</Text>
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

          {/* Severity Picker */}
          <Text style={[styles.label, { marginTop: 12 }]}>Severity</Text>
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

          {/* Photo Capture Option for Voice Report */}
          <Text style={[styles.label, { marginTop: 16 }]}>Attach Satya Proof Photo (Optional)</Text>
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
              <Feather name="camera" size={28} color={colors.emerald} />
              <Text style={styles.photoBoxTitle}>Take Photo of Hazard 📷</Text>
              <Text style={styles.photoBoxSub}>
                Attach live camera photo evidence alongside your voice recording.
              </Text>
            </TouchableOpacity>
          )}

          <BigButton
            title="Review Voice Hazard →"
            onPress={handleProceedToReview}
            style={{ marginTop: 20 }}
          />

          <TouchableOpacity style={styles.reRecordBtn} onPress={() => { setAiResult(null); setRecordedUri(null); setInReviewMode(false); }}>
            <Text style={styles.reRecordText}>Re-record Voice Note</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* STEP 5: REVIEW BEFORE SUBMISSION FOR VOICE REPORT */
        <View style={styles.reviewContainer}>
          <Text style={styles.title}>Step 5: Review Voice Hazard</Text>
          <Text style={styles.subTitle}>Confirm report details before submitting to Mine Control.</Text>

          <View style={styles.reviewCard}>
            <View style={styles.reviewHeaderRow}>
              <Feather name="mic" size={22} color={colors.emerald} />
              <Text style={styles.reviewCardTitle}>Voice Hazard Summary</Text>
            </View>

            <View style={styles.reviewDivider} />

            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Type:</Text>
              <Text style={styles.reviewValueBold}>{(aiResult?.structured.type || 'unsafe_condition').replace('_', ' ').toUpperCase()}</Text>
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

            <Text style={styles.reviewSectionTitle}>Description / Voice Note:</Text>
            <Text style={styles.reviewTextBody}>{hazardText.trim() || transcript.trim() || 'Voice hazard report'}</Text>

            {locationText ? (
              <View style={[styles.reviewRow, { marginTop: 8 }]}>
                <Text style={styles.reviewLabel}>Spot:</Text>
                <Text style={styles.reviewValue}>{locationText}</Text>
              </View>
            ) : null}

            <View style={styles.reviewDivider} />

            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>🎙️ Audio:</Text>
              <Text style={styles.reviewValue}>{recordedUri ? 'Voice recording attached' : 'Speech-to-text'}</Text>
            </View>

            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>📷 Photo Evidence:</Text>
              <Text style={styles.reviewValue}>{photoUri ? '1 Photo attached (Satya Proof)' : 'No Photo attached'}</Text>
            </View>

            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>📍 GPS:</Text>
              <Text style={styles.reviewValue}>{photoMeta?.lat ? `${photoMeta.lat.toFixed(4)}N, ${photoMeta.lng?.toFixed(4)}E` : 'Captured via device'}</Text>
            </View>

            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>✓ Mine:</Text>
              <Text style={styles.reviewValue}>{user?.mine_name || 'Moonidih UG Mine'}</Text>
            </View>
          </View>

          <BigButton
            title={isOffline ? "✓ Submit Report (Save Offline)" : "Submit Report →"}
            onPress={handleConfirmSubmit}
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
    padding: 10,
    borderRadius: 12,
    gap: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.safetyAmber,
  },
  offlineText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.safetyAmber,
    flexShrink: 1,
  },
  langSelectCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: colors.emeraldBorder,
  },
  langSelectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  langSelectTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.emerald,
  },
  langPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  langChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#131F24',
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  langChipActive: {
    backgroundColor: colors.emeraldMuted,
    borderColor: colors.emerald,
  },
  langChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  langChipTextActive: {
    color: colors.emerald,
    fontWeight: '900',
  },
  aiCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  aiTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.emerald,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: '#131F24',
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
  photoBox: {
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.emerald,
    borderStyle: 'dashed',
    backgroundColor: colors.emeraldMuted,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
    gap: 4,
  },
  photoBoxTitle: {
    fontSize: 14,
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
    height: 150,
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
  reRecordBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  reRecordText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.emerald,
  },
  /* REVIEW STYLES */
  reviewContainer: {
    marginTop: 4,
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
