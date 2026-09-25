import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Camera } from 'expo-camera';
import { useAuthStore } from '../../src/store/auth';
import { BigButton } from '../../src/components/BigButton';
import { colors } from '../../src/theme/colors';

export default function PermissionsScreen() {
  const router = useRouter();
  const { hasOnboardedPermissions, setPermissionsOnboarded } = useAuthStore();

  const [locationAllowed, setLocationAllowed] = useState(hasOnboardedPermissions);
  const [cameraAllowed, setCameraAllowed] = useState(hasOnboardedPermissions);
  const [micAllowed, setMicAllowed] = useState(hasOnboardedPermissions);

  React.useEffect(() => {
    (async () => {
      try {
        const { status: locStatus } = await Location.getForegroundPermissionsAsync();
        if (locStatus === 'granted') setLocationAllowed(true);

        const { status: camStatus } = await Camera.getCameraPermissionsAsync();
        if (camStatus === 'granted') setCameraAllowed(true);

        const { status: micStatus } = await Camera.getMicrophonePermissionsAsync();
        if (micStatus === 'granted') setMicAllowed(true);
      } catch {
        // Fallback for web preview
      }
    })();
  }, []);

  const requestLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationAllowed(status === 'granted');
    } catch {
      setLocationAllowed(true);
    }
  };

  const requestCamera = async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setCameraAllowed(status === 'granted');
    } catch {
      setCameraAllowed(true);
    }
  };

  const requestMic = async () => {
    try {
      const { status } = await Camera.requestMicrophonePermissionsAsync();
      setMicAllowed(status === 'granted');
    } catch {
      setMicAllowed(true);
    }
  };

  const handleFinish = () => {
    setPermissionsOnboarded(true);
    router.replace('/(auth)/login' as any);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>App Permissions</Text>
      <Text style={styles.subTitle}>
        Khanan Netra needs these permissions to ensure mine safety compliance and Satya Proof verification.
      </Text>

      {/* Card 1: Location */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.iconBox}>
            <Feather name="crosshair" size={24} color={colors.emerald} />
          </View>
          <View style={styles.textCol}>
            <Text style={styles.cardTitle}>Location Access</Text>
            <Text style={styles.cardDesc}>
              Proves your safety report or attendance is captured directly inside the mine boundary.
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.permBtn, locationAllowed ? styles.allowedBtn : styles.actionBtn]}
          onPress={requestLocation}
        >
          <Text style={[styles.btnText, locationAllowed && { color: colors.emerald }]}>
            {locationAllowed ? '✓ Allowed' : 'Allow Access'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Card 2: Camera */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.iconBox}>
            <Feather name="camera" size={24} color={colors.emerald} />
          </View>
          <View style={styles.textCol}>
            <Text style={styles.cardTitle}>Camera Access</Text>
            <Text style={styles.cardDesc}>
              Required for taking in-app proof photos with GPS & timestamp watermarks.
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.permBtn, cameraAllowed ? styles.allowedBtn : styles.actionBtn]}
          onPress={requestCamera}
        >
          <Text style={[styles.btnText, cameraAllowed && { color: colors.emerald }]}>
            {cameraAllowed ? '✓ Allowed' : 'Allow Access'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Card 3: Microphone */}
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.iconBox}>
            <Feather name="mic" size={24} color={colors.emerald} />
          </View>
          <View style={styles.textCol}>
            <Text style={styles.cardTitle}>Microphone Access</Text>
            <Text style={styles.cardDesc}>
              Required to speak & dictate hazard reports in your native language.
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={[styles.permBtn, micAllowed ? styles.allowedBtn : styles.actionBtn]}
          onPress={requestMic}
        >
          <Text style={[styles.btnText, micAllowed && { color: colors.emerald }]}>
            {micAllowed ? '✓ Allowed' : 'Allow Access'}
          </Text>
        </TouchableOpacity>
      </View>

      <BigButton title="Continue" onPress={handleFinish} disabled={!locationAllowed} style={{ marginTop: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#05080A',
    minHeight: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFF',
    textAlign: 'center',
  },
  subTitle: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    marginVertical: 12,
    marginBottom: 24,
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#0D1518',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#1A2B26',
  },
  cardRow: {
    flexDirection: 'row',
    gap: 14,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textCol: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFF',
  },
  cardDesc: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 4,
    lineHeight: 18,
  },
  permBtn: {
    marginTop: 14,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionBtn: {
    backgroundColor: colors.emerald,
  },
  allowedBtn: {
    backgroundColor: 'rgba(0, 230, 153, 0.1)',
    borderWidth: 1,
    borderColor: colors.emerald,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#05080A',
  },
});
