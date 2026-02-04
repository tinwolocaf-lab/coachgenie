import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: Colors.offWhite },
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="values" />
      <Stack.Screen name="goals" />
      <Stack.Screen name="constraints" />
      <Stack.Screen name="preferences" />
      <Stack.Screen name="coach-selection" />
    </Stack>
  );
}
