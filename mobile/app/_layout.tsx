import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '../src/lib/i18n';
import '../src/lib/webAlert';
import { initSyncEngine, processOutboxSync } from '../src/offline/syncEngine';
import { useAuthStore } from '../src/store/auth';
import { useMasterStore } from '../src/store/master';
import { fetchMeApi } from '../src/api/endpoints';
import { colors } from '../src/theme/colors';

// Screens reachable without logging in (the rest of the app needs a valid session).
const PUBLIC_AUTH_SCREENS = ['language', 'permissions', 'login', 'onboarding', 'forgot-password'];

function useAuthGuard() {
  const router = useRouter();
  const segments = useSegments() as string[];
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const token = useAuthStore((s) => s.token);
  const hasOnboardedPermissions = useAuthStore((s) => s.hasOnboardedPermissions);

  const top = segments[0];
  const isPublic = top === undefined || (top === '(auth)' && PUBLIC_AUTH_SCREENS.includes(segments[1]));
  const allowed = isAuthenticated || isPublic;

  // Send anyone without a session back to login.
  useEffect(() => {
    if (!hasHydrated || allowed) return;
    router.replace((hasOnboardedPermissions ? '/(auth)/login' : '/(auth)/language') as any);
  }, [hasHydrated, allowed, hasOnboardedPermissions]);

  // A logged-in user who lands on the login screen goes straight to the app.
  useEffect(() => {
    if (hasHydrated && isAuthenticated && top === '(auth)' && segments[1] === 'login') {
      router.replace('/(tabs)/home' as any);
    }
  }, [hasHydrated, isAuthenticated, top, segments[1]]);

  // After login / app start: check the saved session with the server and download the offline master pack.
  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated || !token) {
      useMasterStore.getState().reset();
      return;
    }
    fetchMeApi()
      .then((me) => useAuthStore.getState().setUser(me))
      .catch(() => {
        // 401 already logs out inside apiFetch; offline keeps the saved session.
      });
    useMasterStore.getState().load();
    processOutboxSync();
  }, [hasHydrated, isAuthenticated, token]);

  return hasHydrated && allowed;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'offlineFirst',
      gcTime: 1000 * 60 * 60 * 24,
      staleTime: 1000 * 60 * 5,
    },
  },
});

export default function RootLayout() {
  const canShow = useAuthGuard();

  useEffect(() => {
    initSyncEngine();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor="#05080A" />
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: '#0B1215',
            },
            headerTintColor: '#FFFFFF',
            headerTitleStyle: {
              fontWeight: '800',
              fontSize: 18,
            },
            headerShadowVisible: false,
            contentStyle: {
              backgroundColor: '#05080A',
            },
          }}
        >
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="camera" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          <Stack.Screen name="sos" options={{ title: '🆘 Emergency SOS', headerStyle: { backgroundColor: colors.danger }, headerTintColor: '#FFF' }} />
          <Stack.Screen name="tasks/[id]" options={{ title: 'Task Details' }} />
          <Stack.Screen name="inspection/new" options={{ title: 'Start Inspection' }} />
          <Stack.Screen name="inspection/[id]/index" options={{ title: 'Inspection Checklist' }} />
          <Stack.Screen name="inspection/[id]/finding" options={{ title: 'Add Finding' }} />
          <Stack.Screen name="inspection/[id]/review" options={{ title: 'Review Inspection' }} />
          <Stack.Screen name="capa/[id]" options={{ title: 'CAPA Details' }} />
          <Stack.Screen name="capa/[id]/close" options={{ title: 'Close CAPA (Satya Proof)' }} />
          <Stack.Screen name="report/voice" options={{ title: 'Speak to Report' }} />
          <Stack.Screen name="report/form" options={{ title: 'Report Hazard' }} />
          <Stack.Screen name="report/success" options={{ title: 'Report Submitted', headerLeft: () => null }} />
          <Stack.Screen name="attendance/index" options={{ title: 'Geofenced Attendance' }} />
          <Stack.Screen name="attendance/history" options={{ title: 'Attendance Log' }} />
          <Stack.Screen name="grievance/new" options={{ title: 'Raise Grievance' }} />
          <Stack.Screen name="grievance/track" options={{ title: 'Track Grievance' }} />
          <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
          <Stack.Screen name="sync" options={{ title: 'Sync Engine Status' }} />
          <Stack.Screen name="my-reports" options={{ title: 'My Reports & Trust Scores' }} />
          <Stack.Screen name="map" options={{ title: 'Mine Live Map' }} />
          <Stack.Screen name="profile" options={{ title: 'Profile' }} />
          <Stack.Screen name="settings" options={{ title: 'App Settings' }} />
          <Stack.Screen name="help" options={{ title: 'Help & Tutorial' }} />
        </Stack>
        {!canShow && (
          <View style={guardStyles.blocker}>
            <ActivityIndicator size="large" color={colors.safetyAmber} />
          </View>
        )}
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

const guardStyles = StyleSheet.create({
  blocker: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#05080A',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
});
