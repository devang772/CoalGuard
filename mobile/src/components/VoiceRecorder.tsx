import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../theme/colors';

interface VoiceRecorderProps {
  onRecordingComplete: (uri: string, duration: number) => void;
  language: string;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onRecordingComplete, language }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let timer: any;
    if (isRecording) {
      timer = setInterval(() => {
        setSeconds((prev) => {
          if (prev >= 59) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      setSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  const startRecording = () => {
    setIsRecording(true);
    setSeconds(0);
  };

  const stopRecording = () => {
    setIsRecording(false);
    onRecordingComplete('mock-audio-recording.m4a', seconds || 5);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.hint}>
        {language === 'hi'
          ? 'क्या हुआ, कहाँ हुआ, कितना गंभीर है बोलें।\nउदाहरण: "कन्वेयर 3 के पास छत में दरार है"'
          : 'Tell what, where, how serious.\nExample: "Conveyor 3 ke paas roof mein crack hai"'}
      </Text>

      {/* Waveform Bar Simulation */}
      {isRecording && (
        <View style={styles.waveformRow}>
          {[40, 70, 30, 90, 60, 100, 50, 80, 40, 90, 60].map((h, i) => (
            <View key={i} style={[styles.waveBar, { height: h * 0.4 }]} />
          ))}
        </View>
      )}

      <Text style={styles.timerText}>
        00:{seconds < 10 ? `0${seconds}` : seconds} / 01:00
      </Text>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => (isRecording ? stopRecording() : startRecording())}
        style={[styles.micBtn, isRecording && styles.recordingBtn]}
      >
        <Feather name={isRecording ? 'square' : 'mic'} size={44} color="#FFF" />
      </TouchableOpacity>

      <Text style={styles.actionLabel}>
        {isRecording ? 'Tap to Stop & Process' : 'Press to Speak'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  hint: {
    fontSize: 16,
    color: colors.coalBlue,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  waveformRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    gap: 6,
    marginBottom: 12,
  },
  waveBar: {
    width: 6,
    backgroundColor: colors.danger,
    borderRadius: 3,
  },
  timerText: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.coalBlue,
    marginBottom: 20,
  },
  micBtn: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.safetyAmber,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
  },
  recordingBtn: {
    backgroundColor: colors.danger,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.coalBlue,
    marginTop: 14,
  },
});
