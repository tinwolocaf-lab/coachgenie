// Archive Layout - Premium editorial navigation
import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';

export default function ArchiveLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.warmOatmeal },
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
