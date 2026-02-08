// Archive Layout - Premium editorial navigation
import { Stack } from 'expo-router';
import { useThemeSafe } from '@/contexts/ThemeContext';

export default function ArchiveLayout() {
  const { palette } = useThemeSafe();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: palette.background },
        animation: 'fade',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          animation: 'none',
        }}
      />
      <Stack.Screen
        name="insights"
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="breakthroughs"
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="synthesis"
        options={{
          animation: 'slide_from_bottom',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="session/[id]"
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="insight/[id]"
        options={{
          animation: 'slide_from_right',
        }}
      />
    </Stack>
  );
}
