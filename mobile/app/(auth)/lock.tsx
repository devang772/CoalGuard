import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/auth';
import { BigButton } from '../../src/components/BigButton';
import { colors } from '../../src/theme/colors';

export default function AppLockScreen() {
  const router = useRouter();
  const { setAppLocked } = useAuthStore();

  const handleUnlock = () => {
    setAppLocked(false);
    router.replace('/(tabs)/home');
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Feather name="lock" size={48} color={colors.safetyAmber} />
      </View>
      <Text style={styles.title}>App Locked</Text>
      <Text style={styles.subTitle}>Authenticate with fingerprint / Face ID or device PIN to continue.</Text>

      <BigButton title="Unlock Netra Mobile" icon="unlock" onPress={handleUnlock} style={{ width: '100%', marginTop: 30 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 30,
    backgroundColor: colors.coalBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFF',
  },
  subTitle: {
    fontSize: 15,
    color: '#CBD5E1',
    textAlign: 'center',
    marginTop: 8,
  },
});
