import { Stack } from 'expo-router';
import { useThemeSafe } from '@/contexts/ThemeContext';

export default function AuthLayout() {
  const { palette } = useThemeSafe();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: palette.background },
        animation: 'slide_from_right',
      }}
    />
  );
}
