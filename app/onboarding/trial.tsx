import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { Typography, Spacing, Shadows } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { getOfferings , getUserSubscriptionTier } from '@/lib/revenuecat';
import Purchases from 'react-native-purchases';
import {
  completeOnboarding,
  getOnboardingState,
} from '@/store/onboarding';
import {
  installCoach,
  setActiveCoachId,
  saveContextVault,
} from '@/store/app';

const TRIAL_FEATURES = [
  { icon: 'people' as const, label: 'All 5+ AI coaches' },
  { icon: 'infinite' as const, label: 'Unlimited sessions' },
  { icon: 'mic' as const, label: 'Voice notes' },
  { icon: 'color-palette' as const, label: 'All premium atmospheres' },
  { icon: 'git-network' as const, label: 'Integrations' },
  { icon: 'library' as const, label: 'Full archive access' },
];

export default function TrialScreen() {
  const router = useRouter();
  const { palette, setSubscriptionTier } = useThemeSafe();
  const [isLoading, setIsLoading] = useState(false);

  const finishOnboarding = async () => {
    try {
      const onboardingState = await getOnboardingState();
      const coachId = onboardingState.selected_coach_id || 'coach-daily-clarity';

      await installCoach({
        id: Date.now().toString(),
        user_id: 'local-user',
        coach_id: coachId,
        is_active: true,
        installed_at: new Date().toISOString(),
      });
      await setActiveCoachId(coachId);
      await saveContextVault({
        id: Date.now().toString(),
        user_id: 'local-user',
        values: onboardingState.values,
        goals: onboardingState.goals,
        constraints: onboardingState.constraints,
        preferences: onboardingState.preferences,
        updated_at: new Date().toISOString(),
      });
      await completeOnboarding();
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error finishing onboarding:', error);
    }
  };

  const handleStartTrial = async () => {
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const offerings = await getOfferings();
      if (!offerings) {
        await finishOnboarding();
        return;
      }

      const pkg = offerings.availablePackages.find(
        (p) => p.identifier === '$rc_annual'
      ) || offerings.annual;

      if (pkg) {
        await Purchases.purchasePackage(pkg);
        const tier = await getUserSubscriptionTier();
        setSubscriptionTier(tier);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error: unknown) {
      const userCancelled = Boolean(
        error &&
          typeof error === 'object' &&
          'userCancelled' in error &&
          (error as { userCancelled?: boolean }).userCancelled
      );
      if (!userCancelled) {
        console.error('[Trial] Purchase error:', error);
      }
    } finally {
      setIsLoading(false);
      await finishOnboarding();
    }
  };

  const handleSkip = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await finishOnboarding();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      {/* Progress */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { backgroundColor: palette.border }]}>
          <Animated.View style={[styles.progressFill, { width: '100%', backgroundColor: palette.accent }]} />
        </View>
        <Text style={[styles.progressText, { color: palette.textTertiary }]}>5 of 5</Text>
      </View>

      <View style={styles.content}>
        {/* Hero */}
        <Animated.View entering={FadeInUp.duration(600)} style={styles.heroSection}>
          <LinearGradient
            colors={[palette.accent, palette.accentLight]}
            style={styles.heroIcon}
          >
            <Ionicons name="diamond" size={40} color={palette.textInverse} />
          </LinearGradient>
          <Text style={[styles.title, { color: palette.textPrimary }]}>
            Start your free trial
          </Text>
          <Text style={[styles.subtitle, { color: palette.textTertiary }]}>
            Try Sovereign for 7 days free. Cancel anytime.
          </Text>
        </Animated.View>

        {/* Features */}
        <Animated.View entering={FadeInUp.duration(500).delay(200)} style={styles.featuresSection}>
          {TRIAL_FEATURES.map((feature, index) => (
            <Animated.View
              key={feature.label}
              entering={FadeIn.duration(400).delay(300 + index * 60)}
              style={styles.featureRow}
            >
              <View style={[styles.featureIcon, { backgroundColor: palette.accentMuted }]}>
                <Ionicons name={feature.icon} size={20} color={palette.accent} />
              </View>
              <Text style={[styles.featureLabel, { color: palette.textSecondary }]}>
                {feature.label}
              </Text>
            </Animated.View>
          ))}
        </Animated.View>

        {/* Price info */}
        <Animated.View entering={FadeIn.duration(400).delay(600)} style={styles.priceSection}>
          <Text style={[styles.priceText, { color: palette.textTertiary }]}>
            After trial: $99.99/year ($8.33/mo)
          </Text>
        </Animated.View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          title="Start 7-Day Free Trial"
          onPress={handleStartTrial}
          variant="gold"
          size="lg"
          fullWidth
          loading={isLoading}
        />
        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={[styles.skipText, { color: palette.textTertiary }]}>
            Skip for now
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },
  progressText: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.medium,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xxl,
    justifyContent: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    ...Shadows.gold,
  },
  title: {
    fontSize: Typography.sizes.display,
    fontFamily: Typography.fonts.serif,
    fontWeight: Typography.weights.light,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  subtitle: {
    fontSize: Typography.sizes.body,
    textAlign: 'center',
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },
  featuresSection: {
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureLabel: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.medium,
  },
  priceSection: {
    alignItems: 'center',
  },
  priceText: {
    fontSize: Typography.sizes.caption,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  skipText: {
    fontSize: Typography.sizes.body,
    textDecorationLine: 'underline',
  },
});
