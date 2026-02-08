// Sanctuary Layout - Full-screen presentation
import { Stack } from 'expo-router';
import { useThemeSafe } from '@/contexts/ThemeContext';

export default function SanctuaryLayout() {
  const { palette } = useThemeSafe();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'fullScreenModal',
        animation: 'fade',
        contentStyle: {
          backgroundColor: palette.textPrimary,
        },
      }}
    >
      <Stack.Screen
        name="[coachId]"
        options={{
          gestureEnabled: true,
          gestureDirection: 'vertical',
        }}
      />
    </Stack>
  );
}
