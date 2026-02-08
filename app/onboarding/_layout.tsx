import { Stack } from 'expo-router';
import { useThemeSafe } from '@/contexts/ThemeContext';

export default function OnboardingLayout() {
  const { palette } = useThemeSafe();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: palette.background },
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
