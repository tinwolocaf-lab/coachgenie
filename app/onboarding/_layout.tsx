import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: Colors.warmOatmeal },
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        animationDuration: 500,
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
