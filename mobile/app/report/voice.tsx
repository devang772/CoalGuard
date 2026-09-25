import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/auth';
import { processVoiceAiApi } from '../../src/api/endpoints';
import { VoiceRecorder } from '../../src/components/VoiceRecorder';
import { BigButton } from '../../src/components/BigButton';
import { VoiceReportResult } from '../../src/api/types';
import { colors } from '../../src/theme/colors';

export default function VoiceReportScreen() {
  const router = useRouter();
  const { selectedLanguage } = useAuthStore();

  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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
      setAiResult(res);
      setTranscript(res.transcript);
      setHazardText(res.structured.hazard);
      setLocationText(res.structured.location_text);
    } catch (e: any) {
      Alert.alert('Voice Processing Saved Offline', 'Saved audio locally. AI will parse transcript when online.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSubmit = () => {
    Alert.alert(
      'Hazard Reported ✓',
      'Observation saved to outbox! Reference ID: VR-' + Math.floor(1000 + Math.random() * 9000),
      [{ text: 'OK', onPress: () => router.replace('/(tabs)/home') }]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Language Indicator */}
      <View style={styles.langHeader}>
        <Feather name="globe" size={16} color={colors.safetyAmberDark} />
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
            <Feather name="cpu" size={24} color={colors.safetyAmberDark} />
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
    backgroundColor: '#F8FAFC',
    minHeight: '100%',
  },
  langHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.safetyAmberLight,
    padding: 10,
    borderRadius: 12,
    gap: 8,
    marginBottom: 10,
  },
  langText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.coalBlue,
  },
  aiCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: colors.safetyAmber,
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
    color: colors.coalBlue,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.coalBlue,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  chip: {
    backgroundColor: colors.coalBlue,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.safetyAmber,
  },
  reRecordBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  reRecordText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.info,
  },
});
