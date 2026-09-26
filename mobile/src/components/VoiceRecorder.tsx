import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { BLOCKED_HELP, requestWebMedia, webMediaProblem } from '../lib/webPermissions';
import { Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { colors } from '../theme/colors';

interface VoiceRecorderProps {
  onRecordingComplete: (uri: string, duration: number) => void;
  language: string;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onRecordingComplete, language }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const secondsRef = useRef(0);

  useEffect(() => {
    let timer: any;
    if (isRecording) {
      timer = setInterval(() => {
        secondsRef.current += 1;
        setSeconds(secondsRef.current);
        if (secondsRef.current >= 60) {
          stopRecording();
        }
      }, 1000);
    } else {
      setSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  useEffect(() => {
    return () => {
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  const startRecording = async () => {
    try {
      if (Platform.OS === 'web') {
        const problem = webMediaProblem();
        const result = problem ? 'unsupported' : await requestWebMedia('microphone');
        if (result !== 'granted') {
          Alert.alert('Microphone blocked', result === 'denied' ? BLOCKED_HELP : problem || 'No microphone was found.');
          return;
        }
      }
      const perm = await Audio.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Microphone Permission', 'Allow microphone access to report by voice.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      secondsRef.current = 0;
      setSeconds(0);
      setIsRecording(true);
    } catch (err: any) {
      Alert.alert('Recording Error', err?.message || 'Could not start the microphone.');
    }
  };

  const stopRecording = async () => {
    const recording = recordingRef.current;
    recordingRef.current = null;
    setIsRecording(false);
    if (!recording) return;
    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    } catch {
      // already stopped
    }
    const uri = recording.getURI();
    if (uri) onRecordingComplete(uri, secondsRef.current);
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
