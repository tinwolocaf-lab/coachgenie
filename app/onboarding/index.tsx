import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeSafe } from '@/contexts/ThemeContext';

export default function OnboardingEntryScreen() {
  const router = useRouter();
  const { palette } = useThemeSafe();

  useEffect(() => {
    router.replace('/onboarding/name');
  }, [router]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="small" color={palette.accent} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
