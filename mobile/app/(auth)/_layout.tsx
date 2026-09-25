import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="language" />
      <Stack.Screen name="login" />
      <Stack.Screen name="permissions" />
      <Stack.Screen name="lock" />
    </Stack>
  );
}
