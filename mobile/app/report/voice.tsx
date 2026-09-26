import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/auth';
import { processVoiceAiApi, submitObservationApi } from '../../src/api/endpoints';
import { getCurrentFix } from '../../src/lib/location';
import { VoiceRecorder } from '../../src/components/VoiceRecorder';
import { BigButton } from '../../src/components/BigButton';
import { VoiceReportResult } from '../../src/api/types';
import { colors } from '../../src/theme/colors';

// Used when the backend has no speech model: the worker types / corrects the report in the same form.
const EMPTY_RESULT: VoiceReportResult = {
  transcript: '',
  structured: { type: 'unsafe_condition', category: 'other', hazard: '', location_text: '', severity: 'medium' },
};

export default function VoiceReportScreen() {
  const router = useRouter();
  const { selectedLanguage } = useAuthStore();

  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiResult, setAiResult] = useState<VoiceReportResult | null>(null);

  // Editable fields extracted by AI
  const [transcript, setTranscript] = useState('');
  const [hazardText, setHazardText] = useState('');
  const [locationText, setLocationText] = useState('');

  const handleRecordingComplete = async (uri: string) => {
    setRecordedUri(uri);
    setLoading(true);
    try {
      const res = await processVoiceAiApi(uri, selectedLanguage);
      if (!res) {
        Alert.alert('Type Your Report', 'Speech-to-text is not available on the server yet. Please type what you saw below.');
      }
      const result = res || EMPTY_RESULT;
      setAiResult(result);
      setTranscript(result.transcript);
      setHazardText(result.structured.hazard);
      setLocationText(result.structured.location_text);
    } catch (e: any) {
      Alert.alert('Voice Processing Failed', `${e.message}\nPlease type what you saw below.`);
      setAiResult(EMPTY_RESULT);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSubmit = async () => {
    if (!aiResult) return;
    const text = (hazardText || transcript).trim();
    if (text.length < 3) {
      Alert.alert('Required Info', 'Please describe the hazard.');
      return;
    }
    setSubmitting(true);
    try {
      const fix = await getCurrentFix();
      const res = await submitObservationApi({
        type: aiResult.structured.type,
        category: aiResult.structured.category,
        text,
        severity: aiResult.structured.severity,
        location_text: locationText,
        lat: fix?.lat ?? null,
        lng: fix?.lng ?? null,
        anonymous: false,
        source: 'voice',
        transcript: transcript || undefined,
        language: selectedLanguage,
      });
      Alert.alert(
        'Hazard Reported ✓',
        res.queued
          ? 'No network: the report is saved in the outbox and will sync automatically.'
          : `Observation sent. Reference ID: VR-${res.data?.id}`,
        [{ text: 'OK', onPress: () => router.replace('/(tabs)/home') }]
      );
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Language Indicator */}
      <View style={styles.langHeader}>
        <Feather name="globe" size={16} color={colors.emerald} />
        <Text style={styles.langText}>
          Language: {selectedLanguage.toUpperCase()} (Hindi / English / Bengali / Odia)
        </Text>
      </View>

      {!aiResult ? (
        <VoiceRecorder onRecordingComplete={handleRecordingComplete} language={selectedLanguage} />
      ) : (
        /* AI Parsing Confirmation Screen */
        <View style={styles.aiCard}>
          <View style={styles.aiHeader}>
            <Feather name="cpu" size={24} color={colors.emerald} />
            <Text style={styles.aiTitle}>Here is what AI understood:</Text>
          </View>

          <Text style={styles.label}>Voice Transcript</Text>
          <TextInput
            style={styles.input}
            multiline
            value={transcript}
            onChangeText={setTranscript}
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Extracted Hazard Description</Text>
          <TextInput
            style={styles.input}
            value={hazardText}
            onChangeText={setHazardText}
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Estimated Location</Text>
          <TextInput
            style={styles.input}
            value={locationText}
            onChangeText={setLocationText}
          />

          <View style={styles.chipRow}>
            <View style={styles.chip}>
              <Text style={styles.chipLabel}>TYPE: {aiResult.structured.type.toUpperCase()}</Text>
            </View>
            <View style={[styles.chip, { backgroundColor: colors.dangerLight }]}>
              <Text style={[styles.chipLabel, { color: colors.danger }]}>
                SEVERITY: {aiResult.structured.severity.toUpperCase()}
              </Text>
            </View>
          </View>

          <BigButton
            title="Confirm & Submit Hazard Report ✓"
            onPress={handleConfirmSubmit}
            loading={submitting}
            style={{ marginTop: 20 }}
          />

          <TouchableOpacity style={styles.reRecordBtn} onPress={() => setAiResult(null)}>
            <Text style={styles.reRecordText}>Re-record Voice Note</Text>
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
  langHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.emeraldMuted,
    padding: 10,
    borderRadius: 12,
    gap: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.emeraldBorder,
  },
  langText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.emerald,
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
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: '#131F24',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  chip: {
    backgroundColor: '#131F24',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.emerald,
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
});
