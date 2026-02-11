import React from 'react';
import { Stack, useRouter, usePathname } from 'expo-router';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Typography, Spacing, Radius } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

const ONBOARDING_STEPS = ['name', 'vibe', 'coach', 'session'];

function ProgressDots() {
  const { palette } = useThemeSafe();
  const pathname = usePathname();

  // Determine current step based on pathname
  let currentStep = -1;
  if (pathname.includes('/name')) currentStep = 0;
  else if (pathname.includes('/vibe')) currentStep = 1;
  else if (pathname.includes('/coach')) currentStep = 2;
  else if (pathname.includes('/session')) currentStep = 3;

  if (currentStep === -1) return null; // Don't show on index or other pages

  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.progressContainer}>
      {ONBOARDING_STEPS.map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            {
              backgroundColor:
                index <= currentStep ? palette.accent : palette.border,
            },
          ]}
        />
      ))}
    </Animated.View>
  );
}

function BackButton() {
  const router = useRouter();
  const { palette } = useThemeSafe();
  const pathname = usePathname();

  // Don't show back button on first step or index
  if (pathname.includes('/name') || pathname === '/onboarding' || pathname === '/onboarding/') {
    return null;
  }

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <TouchableOpacity
      onPress={handleBack}
      style={styles.backButton}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Ionicons
        name="chevron-back"
        size={24}
        color={palette.textPrimary}
      />
    </TouchableOpacity>
  );
}

function OnboardingHeader() {
  const { palette } = useThemeSafe();
  const pathname = usePathname();

  // Don't show header on index or old screens
  if (pathname === '/onboarding' || pathname === '/onboarding/' ||
      pathname.includes('/values') || pathname.includes('/goals') ||
      pathname.includes('/constraints') || pathname.includes('/preferences') ||
      pathname.includes('/coach-selection')) {
    return null;
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.headerContainer, { backgroundColor: palette.background }]}>
      <View style={styles.headerContent}>
        <BackButton />
        <ProgressDots />
        <View style={styles.spacer} />
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
          animationDuration: 300,
        }}
      >
        {/* New 4-step onboarding */}
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="name" />
        <Stack.Screen name="vibe" />
        <Stack.Screen name="coach" />
        <Stack.Screen name="session" />

        {/* Legacy onboarding screens */}
        <Stack.Screen name="values" />
        <Stack.Screen name="goals" />
        <Stack.Screen name="constraints" />
        <Stack.Screen name="preferences" />
        <Stack.Screen name="coach-selection" />
        <Stack.Screen name="trial" />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  spacer: {
    width: 40,
  },
});
