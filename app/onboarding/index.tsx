import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Asset } from 'expo-asset';
import { Ionicons } from '@expo/vector-icons';
import { SvgUri } from 'react-native-svg';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';

const ONBOARDING_COACHES_ILLUSTRATION_URI = Asset.fromModule(
  require('../../assets/images/onboarding-coaches.svg')
).uri;
const APP_ICON = require('../../assets/images/icon.png');

export default function WelcomeScreen() {
  const router = useRouter();
  const { palette } = useThemeSafe();
  const illustrationProgress = useSharedValue(0);
  const [showOnboardingIllustration, setShowOnboardingIllustration] = useState(true);

  useEffect(() => {
    illustrationProgress.value = withRepeat(
      withTiming(1, {
        duration: 2800,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true
    );
  }, [illustrationProgress]);

  const illustrationAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(illustrationProgress.value, [0, 1], [0, -10]) },
      { scale: interpolate(illustrationProgress.value, [0, 1], [1, 1.015]) },
    ],
    opacity: interpolate(illustrationProgress.value, [0, 1], [0.94, 1]),
  }));

  const handleStart = () => {
    router.push('/onboarding/name');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Header with elegant branding */}
        <Animated.View
          entering={FadeInUp.duration(800).delay(200)}
          style={styles.header}
        >
          <View style={styles.logoContainer}>
            <Image source={APP_ICON} style={styles.logoImage} resizeMode="contain" />
          </View>

          <Text style={[styles.brandName, { color: palette.textPrimary }]}>Coachgenie</Text>
          <View style={styles.taglineContainer}>
            <Text style={[styles.tagline, { color: palette.textTertiary }]}>Your personal guide to</Text>
            <Text style={[styles.taglineEmphasis, { color: palette.textPrimary }]}>exceptional growth</Text>
          </View>

          {showOnboardingIllustration && (
            <Animated.View
              entering={FadeIn.duration(800).delay(450)}
              style={styles.illustrationContainer}
            >
              <Animated.View style={[styles.illustrationMotion, illustrationAnimatedStyle]}>
                <SvgUri
                  width="100%"
                  height="100%"
                  uri={ONBOARDING_COACHES_ILLUSTRATION_URI}
                  onError={() => setShowOnboardingIllustration(false)}
                />
              </Animated.View>
            </Animated.View>
          )}
        </Animated.View>

        {/* Editorial feature cards */}
        <Animated.View
          entering={FadeIn.duration(1000).delay(600)}
          style={styles.featuresSection}
        >
          <View style={styles.featureRow}>
            <FeatureCard
              icon="sparkles-outline"
              title="Personalized"
              subtitle="AI coaches adapted to your unique journey"
              delay={700}
            />
            <FeatureCard
              icon="calendar-outline"
              title="Intentional"
              subtitle="Dynamic plans that evolve with you"
              delay={800}
            />
          </View>
          <FeatureCard
            icon="diamond-outline"
            title="Premium Methodology"
            subtitle="World-class coaching frameworks, distilled for daily action"
            delay={900}
            fullWidth
          />
        </Animated.View>

        {/* Footer CTA */}
        <Animated.View
          entering={FadeInDown.duration(800).delay(1000)}
          style={styles.footer}
        >
          <Button
            title="Begin Your Consultation"
            onPress={handleStart}
            variant="gold"
            size="lg"
            fullWidth
          />

          <View style={styles.durationBadge}>
            <Ionicons name="time-outline" size={14} color={palette.textTertiary} />
            <Text style={[styles.durationText, { color: palette.textTertiary }]}>3 minutes to complete</Text>
          </View>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

function FeatureCard({
  icon,
  title,
  subtitle,
  delay,
  fullWidth = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  delay: number;
  fullWidth?: boolean;
}) {
  const { palette } = useThemeSafe();

  return (
    <Animated.View
      entering={FadeInUp.duration(600).delay(delay)}
      style={[styles.featureCard, fullWidth && styles.featureCardFull, { backgroundColor: palette.cardBg, borderColor: palette.borderLight }]}
    >
      <View style={[styles.featureIconContainer, { backgroundColor: palette.accentMuted }]}>
        <Ionicons name={icon} size={24} color={palette.accent} />
      </View>
      <Text style={[styles.featureTitle, { color: palette.textPrimary }]}>{title}</Text>
      <Text style={[styles.featureSubtitle, { color: palette.textTertiary }]}>{subtitle}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xxl,
    justifyContent: 'space-between',
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.xl,
  },

  // Header
  header: {
    alignItems: 'center',
  },
  logoContainer: {
    marginBottom: Spacing.xl,
    ...Shadows.gold,
  },
  logoImage: {
    width: 90,
    height: 90,
    borderRadius: Radius.squircle,
  },
  brandName: {
    fontSize: Typography.sizes.giant,
    fontWeight: Typography.weights.light,
    fontFamily: Typography.fonts.serif,
    letterSpacing: Typography.letterSpacing.tight,
    marginBottom: Spacing.md,
  },
  taglineContainer: {
    alignItems: 'center',
  },
  tagline: {
    fontSize: Typography.sizes.bodyLarge,
    letterSpacing: Typography.letterSpacing.wide,
  },
  taglineEmphasis: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.medium,
    fontFamily: Typography.fonts.serif,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
  },
  illustrationContainer: {
    marginTop: Spacing.xl,
    width: '100%',
    maxWidth: 360,
    height: 172,
  },
  illustrationMotion: {
    width: '100%',
    height: '100%',
  },

  // Features
  featuresSection: {
    gap: Spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  featureCard: {
    flex: 1,
    borderRadius: Radius.squircle,
    padding: Spacing.lg,
    borderWidth: 1,
    ...Shadows.sm,
  },
  featureCardFull: {
    flex: undefined,
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  featureTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
    fontFamily: Typography.fonts.serif,
  },
  featureSubtitle: {
    fontSize: Typography.sizes.body,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },

  // Footer
  footer: {
    alignItems: 'center',
    gap: Spacing.lg,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  durationText: {
    fontSize: Typography.sizes.caption,
    letterSpacing: Typography.letterSpacing.wide,
  },
});
