import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/auth';
import { colors } from '../src/theme/colors';

export default function IndexScreen() {
  const router = useRouter();
  const { isAuthenticated, hasOnboardedPermissions } = useAuthStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isAuthenticated) {
        router.replace('/(auth)/language' as any);
      } else if (!hasOnboardedPermissions) {
        router.replace('/(auth)/permissions' as any);
      } else {
        router.replace('/(tabs)/home' as any);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [isAuthenticated, hasOnboardedPermissions]);

  return (
    <View style={styles.container}>
      <Text style={styles.logoTitle}>Netra Mobile</Text>
      <Text style={styles.tagline}>Khanan Netra · Eye of the Mine</Text>
      <ActivityIndicator size="large" color={colors.safetyAmber} style={{ marginTop: 24 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.coalBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.safetyAmber,
  },
  tagline: {
    fontSize: 16,
    color: '#94A3B8',
    marginTop: 4,
  },
});
