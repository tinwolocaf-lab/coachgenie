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
  useAnimatedStyle,
  withRepeat,
  withTiming,
  useSharedValue,
  Easing,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Header with elegant branding */}
        <Animated.View
          entering={FadeInUp.duration(800).delay(200)}
          style={styles.header}
        >
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={[Colors.burnishedGold, Colors.goldLight]}
              style={styles.logoGradient}
            >
              <Ionicons name="compass" size={40} color={Colors.white} />
            </LinearGradient>
          </View>

          <Text style={styles.brandName}>Coachgenie</Text>
          <View style={styles.taglineContainer}>
            <Text style={styles.tagline}>Your personal guide to</Text>
            <Text style={styles.taglineEmphasis}>exceptional growth</Text>
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
            <Ionicons name="time-outline" size={14} color={Colors.stoneGray} />
            <Text style={styles.durationText}>3 minutes to complete</Text>
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
  return (
    <Animated.View
      entering={FadeInUp.duration(600).delay(delay)}
      style={[styles.featureCard, fullWidth && styles.featureCardFull]}
    >
      <View style={styles.featureIconContainer}>
        <Ionicons name={icon} size={24} color={Colors.burnishedGold} />
      </View>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureSubtitle}>{subtitle}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.warmOatmeal,
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
    color: Colors.midnightEmerald,
    fontFamily: Typography.fonts.serif,
    letterSpacing: Typography.letterSpacing.tight,
    marginBottom: Spacing.md,
  },
  taglineContainer: {
    alignItems: 'center',
  },
  tagline: {
    fontSize: Typography.sizes.bodyLarge,
    color: Colors.stoneGray,
    letterSpacing: Typography.letterSpacing.wide,
  },
  taglineEmphasis: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.medium,
    color: Colors.midnightEmerald,
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
    backgroundColor: Colors.white,
    borderRadius: Radius.squircle,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  featureCardFull: {
    flex: undefined,
  },
  featureIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  featureTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    color: Colors.midnightEmerald,
    marginBottom: Spacing.xs,
    fontFamily: Typography.fonts.serif,
  },
  featureSubtitle: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
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
    color: Colors.stoneGray,
    letterSpacing: Typography.letterSpacing.wide,
  },
});
