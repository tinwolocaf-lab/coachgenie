import { Stack, usePathname, useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Radius, Spacing } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';

const ONBOARDING_ROUTES = ['name', 'vibe', 'coach', 'session'] as const;

function getCurrentStep(pathname: string): number {
  const active = ONBOARDING_ROUTES.findIndex((route) => pathname.endsWith(`/${route}`));
  return active;
}

function ProgressDots({ currentStep }: { currentStep: number }) {
  const { palette } = useThemeSafe();

  if (currentStep < 0) {
    return null;
  }

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.progressContainer}>
      {ONBOARDING_ROUTES.map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            {
              backgroundColor: index <= currentStep ? palette.accent : palette.border,
            },
          ]}
        />
      ))}
    </Animated.View>
  );
}

function OnboardingHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { palette } = useThemeSafe();
  const currentStep = getCurrentStep(pathname);

  if (pathname === '/onboarding' || pathname === '/onboarding/' || currentStep < 0) {
    return null;
  }

  const canGoBack = currentStep > 0;

  const handleBack = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (canGoBack) {
      router.back();
      return;
    }
    router.replace('/onboarding/name');
  };

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.headerContainer, { backgroundColor: palette.background, borderBottomColor: palette.borderLight }]}
    >
      <View style={styles.headerContent}>
        {canGoBack ? (
          <TouchableOpacity
            onPress={handleBack}
            style={[styles.backButton, { borderColor: palette.border }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel="Go to previous onboarding step"
          >
            <Ionicons name="chevron-back" size={20} color={palette.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backPlaceholder} />
        )}

        <ProgressDots currentStep={currentStep} />

        <View style={styles.backPlaceholder} />
      </View>
    </SafeAreaView>
  );
}

export default function OnboardingLayout() {
  const { palette } = useThemeSafe();

  return (
    <>
      <OnboardingHeader />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          contentStyle: { backgroundColor: palette.background },
          gestureEnabled: true,
          gestureDirection: 'horizontal',
          animationDuration: 250,
        }}
      >
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="name" />
        <Stack.Screen name="vibe" />
        <Stack.Screen name="coach" />
        <Stack.Screen name="session" />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: Radius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPlaceholder: {
    width: 34,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: Radius.pill,
  },
});
