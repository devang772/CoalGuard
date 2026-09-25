import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import '../src/lib/i18n';
import { initSyncEngine } from '../src/offline/syncEngine';
import { colors } from '../src/theme/colors';

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
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
