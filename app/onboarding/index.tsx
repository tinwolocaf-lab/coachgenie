import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeInDown,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const { palette } = useThemeSafe();
  const shimmerPosition = useSharedValue(0);

  useEffect(() => {
    shimmerPosition.value = withRepeat(
      withTiming(1, {
        duration: 3000,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, [shimmerPosition]);

  const handleStart = () => {
    router.push('/onboarding/values');
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
            <LinearGradient
              colors={[palette.accent, palette.accentLight]}
              style={styles.logoGradient}
            >
              <Ionicons name="compass" size={40} color={palette.textInverse} />
            </LinearGradient>
          </View>

          <Text style={[styles.brandName, { color: palette.textPrimary }]}>Coachgenie</Text>
          <View style={styles.taglineContainer}>
            <Text style={[styles.tagline, { color: palette.textTertiary }]}>Your personal guide to</Text>
            <Text style={[styles.taglineEmphasis, { color: palette.textPrimary }]}>exceptional growth</Text>
          </View>
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
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: Radius.squircle,
    alignItems: 'center',
    justifyContent: 'center',
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
