import { Stack } from 'expo-router';

export default function IntegrationsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="callback" options={{ animation: 'none' }} />
    </Stack>
  );
}
