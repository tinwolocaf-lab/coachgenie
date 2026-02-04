// Sanctuary Layout - Full-screen presentation
import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';

export default function SanctuaryLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'fullScreenModal',
        animation: 'fade',
        contentStyle: {
          backgroundColor: Colors.midnightEmerald,
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
