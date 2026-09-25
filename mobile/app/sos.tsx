import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSettingsStore } from '../src/store/settings';
import { sendSosApi } from '../src/api/endpoints';
import { BigButton } from '../src/components/BigButton';
import { colors } from '../src/theme/colors';

const SOS_TYPES = ['Fire Hazard', 'Roof Fall', 'Gas Leak', 'Worker Injury', 'Inundation', 'Machinery Crash'];

export default function SOSScreen() {
  const router = useRouter();
  const { sosSmsNumber } = useSettingsStore();

  const [isPressing, setIsPressing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [sosSent, setSosSent] = useState(false);
  const [selectedType, setSelectedType] = useState('Roof Fall');

  useEffect(() => {
    let timer: any;
    if (countdown !== null && countdown > 0) {
      timer = setInterval(() => setCountdown((prev) => (prev ? prev - 1 : 0)), 1000);
    } else if (countdown === 0) {
      dispatchSos();
      setCountdown(null);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleLongPress = () => {
    setCountdown(5); // 5-second cancel window
  };

  const cancelSos = () => {
    setCountdown(null);
  };

  const dispatchSos = async () => {
    await sendSosApi(23.7505, 86.4205, selectedType);
    setSosSent(true);
  };

  const sendSmsFallback = () => {
    const msg = `🆘 SOS EMERGENCY! Type: ${selectedType}. Mine: Moonidih UG (23.7505 N, 86.4205 E). Time: ${new Date().toLocaleTimeString()}`;
    Linking.openURL(`sms:${sosSmsNumber}?body=${encodeURIComponent(msg)}`);
  };

  return (
    <View style={styles.container}>
      {!sosSent ? (
        <>
          <Text style={styles.title}>EMERGENCY SOS DISTRESS</Text>
          <Text style={styles.subTitle}>Select emergency type & hold button for 2 seconds</Text>

          {/* Quick Type Chips */}
          <View style={styles.chipGrid}>
            {SOS_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.chip, selectedType === t && styles.chipActive]}
                onPress={() => setSelectedType(t)}
              >
                <Text style={[styles.chipText, selectedType === t && styles.chipTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {countdown !== null ? (
            <View style={styles.countdownBox}>
              <Text style={styles.countdownTitle}>DISPATCHING SOS IN</Text>
              <Text style={styles.countdownNum}>{countdown}s</Text>

              <BigButton
                title="CANCEL EMERGENCY ALERT"
                onPress={cancelSos}
                variant="outline"
                style={{ width: '100%', marginTop: 20 }}
              />
            </View>
          ) : (
            <View style={styles.triggerContainer}>
              <TouchableOpacity
                activeOpacity={0.8}
                onLongPress={handleLongPress}
                delayLongPress={1200}
                style={styles.sosButton}
              >
                <Feather name="alert-octagon" size={64} color="#FFF" />
                <Text style={styles.sosButtonText}>HOLD 2s FOR SOS</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={styles.smsFallbackBtn} onPress={sendSmsFallback}>
            <Feather name="message-square" size={18} color="#FFF" />
            <Text style={styles.smsFallbackText}>Send Emergency SMS (No Data)</Text>
          </TouchableOpacity>
        </>
      ) : (
        /* Sent Confirmation Screen */
        <View style={styles.sentBox}>
          <View style={styles.iconCircle}>
            <Feather name="check" size={54} color="#FFF" />
          </View>
          <Text style={styles.sentTitle}>🆘 EMERGENCY ALERT DISPATCHED</Text>
          <Text style={styles.sentDesc}>
            Alert sent to Mine Manager, Safety Officer & Control Room with your exact coordinates (23.7505 N, 86.4205 E).
          </Text>

          <View style={styles.priorityBox}>
            <Feather name="wifi-off" size={16} color={colors.safetyAmber} />
            <Text style={styles.priorityText}>SOS Queued as Priority #0 (Retrying every 10s)</Text>
          </View>

          <BigButton
            title="Send Backup SMS Alert"
            onPress={sendSmsFallback}
            variant="secondary"
            style={{ width: '100%', marginTop: 20 }}
          />

          <BigButton
            title="Close Alert"
            onPress={() => router.back()}
            variant="outline"
            style={{ width: '100%', marginTop: 10 }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.danger,
    textAlign: 'center',
  },
  subTitle: {
    fontSize: 14,
    color: '#CBD5E1',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 24,
  },
  chip: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipActive: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  chipText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextActive: {
    color: '#FFF',
  },
  triggerContainer: {
    marginVertical: 20,
  },
  sosButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 12,
    borderWidth: 6,
    borderColor: '#FEE2E2',
    gap: 10,
  },
  sosButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1,
  },
  countdownBox: {
    width: '100%',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.danger,
  },
  countdownTitle: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: '900',
  },
  countdownNum: {
    fontSize: 64,
    fontWeight: '900',
    color: '#FFF',
    marginVertical: 10,
  },
  smsFallbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#334155',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
    marginTop: 20,
  },
  smsFallbackText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  sentBox: {
    width: '100%',
    alignItems: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  sentTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.danger,
    textAlign: 'center',
  },
  sentDesc: {
    fontSize: 14,
    color: '#CBD5E1',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  priorityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1E293B',
    padding: 12,
    borderRadius: 12,
    marginTop: 16,
  },
  priorityText: {
    color: colors.safetyAmber,
    fontSize: 13,
    fontWeight: '700',
  },
});
