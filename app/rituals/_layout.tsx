// Rituals Stack Layout
import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';

export default function RitualsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.warmOatmeal },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="morning" options={{ presentation: 'modal' }} />
      <Stack.Screen name="evening" options={{ presentation: 'modal' }} />
      <Stack.Screen name="chapters" />
      <Stack.Screen name="chapter/[id]" />
      <Stack.Screen name="new-ritual" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
