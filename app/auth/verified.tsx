import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuthSafe } from '@/hooks/useConditionalAuth';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Gold particle component for celebratory effect
interface ParticleProps {
  delay: number;
  startX: number;
  startY: number;
}

function CelebrationParticle({ delay, startX, startY }: ParticleProps) {
  const { palette } = useThemeSafe();
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(0);

  useEffect(() => {
    const xDirection = Math.random() > 0.5 ? 1 : -1;
    const xDistance = 20 + Math.random() * 40;

    opacity.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 400, easing: Easing.out(Easing.ease) }),
        withTiming(0, { duration: 1200, easing: Easing.in(Easing.ease) })
      )
    );

    translateY.value = withDelay(
      delay,
      withTiming(-80 - Math.random() * 60, { duration: 1600, easing: Easing.out(Easing.quad) })
    );

    translateX.value = withDelay(
      delay,
      withTiming(xDirection * xDistance, { duration: 1600, easing: Easing.out(Easing.quad) })
    );

    scale.value = withDelay(
      delay,
      withSequence(
        withTiming(1, { duration: 200, easing: Easing.out(Easing.ease) }),
        withTiming(0.3, { duration: 1400, easing: Easing.in(Easing.ease) })
      )
    );
  }, [delay, opacity, translateY, translateX, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const size = 4 + Math.random() * 6;

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          left: startX,
          top: startY,
          backgroundColor: palette.accent,
          shadowColor: palette.accent,
        },
        animatedStyle,
      ]}
    />
  );
}

// Pulsing ring around the success icon
function PulsingRing({ delay, size }: { delay: number; size: number }) {
  const { palette } = useThemeSafe();
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.3, { duration: 1500, easing: Easing.out(Easing.ease) }),
          withTiming(0.8, { duration: 0 })
        ),
        -1,
        false
      )
    );

    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.6, { duration: 300, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 1200, easing: Easing.in(Easing.ease) })
        ),
        -1,
        false
      )
    );
  }, [delay, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.pulsingRing,
        { width: size, height: size, borderRadius: size / 2, borderColor: palette.accent },
        animatedStyle,
      ]}
    />
  );
}

export default function VerifiedScreen() {
  const router = useRouter();
  const { palette } = useThemeSafe();
  const auth = useAuthSafe();
  const user = auth?.user;

  const [showContent, setShowContent] = useState(false);
  const checkmarkScale = useSharedValue(0);

  // Get display name
  const displayName = user?.user_metadata?.full_name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'there';

  useEffect(() => {
    // Trigger haptic on mount
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Animate checkmark
    checkmarkScale.value = withDelay(
      300,
      withSequence(
        withTiming(1.2, { duration: 300, easing: Easing.out(Easing.back(2)) }),
        withTiming(1, { duration: 200, easing: Easing.inOut(Easing.ease) })
      )
    );

    // Show content after initial animation
    const timer = setTimeout(() => setShowContent(true), 400);
    return () => clearTimeout(timer);
  }, [checkmarkScale]);

  const checkmarkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkmarkScale.value }],
  }));

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace('/(tabs)');
  };

  // Generate celebration particles
  const particles = [];
  const particleCount = 24;
  const centerX = SCREEN_WIDTH / 2;
  const centerY = 180;

  for (let i = 0; i < particleCount; i++) {
    const angle = (i / particleCount) * Math.PI * 2;
    const radius = 50 + Math.random() * 30;
    const x = centerX + Math.cos(angle) * radius - 5;
    const y = centerY + Math.sin(angle) * radius - 5;
    const delay = 200 + i * 50;

    particles.push(
      <CelebrationParticle key={i} delay={delay} startX={x} startY={y} />
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      {/* Celebration particles */}
      <View style={styles.particleContainer}>
        {particles}
      </View>

      {/* Main content */}
      <View style={styles.content}>
        {/* Success Icon */}
        <View style={styles.iconSection}>
          <View style={styles.iconContainer}>
            {/* Pulsing rings */}
            <PulsingRing delay={0} size={160} />
            <PulsingRing delay={500} size={160} />
            <PulsingRing delay={1000} size={160} />

            {/* Main icon */}
            <Animated.View style={checkmarkStyle}>
              <LinearGradient
                colors={[palette.accent, palette.accentLight]}
                style={styles.iconGradient}
              >
                <Ionicons name="checkmark" size={56} color={palette.textInverse} />
              </LinearGradient>
            </Animated.View>
          </View>
        </View>

        {/* Text content */}
        {showContent && (
          <>
            <Animated.View entering={FadeInUp.duration(600).delay(100)} style={styles.textSection}>
              <Text style={[styles.title, { color: palette.textPrimary }]}>Welcome, {displayName}</Text>
              <Text style={[styles.subtitle, { color: palette.textTertiary }]}>Your account has been verified</Text>
            </Animated.View>

            <Animated.View entering={FadeIn.duration(500).delay(300)} style={styles.messageSection}>
              <View style={[styles.messageCard, { backgroundColor: palette.cardBg, borderColor: palette.borderAccent }]}>
                <View style={[styles.messageIconContainer, { backgroundColor: palette.accentMuted }]}>
                  <Ionicons name="sparkles" size={20} color={palette.accent} />
                </View>
                <View style={styles.messageTextContainer}>
                  <Text style={[styles.messageTitle, { color: palette.textPrimary }]}>Your journey begins now</Text>
                  <Text style={[styles.messageText, { color: palette.textTertiary }]}>
                    Connect with AI coaches tailored to your unique goals and aspirations.
                    Your personalized growth experience awaits.
                  </Text>
                </View>
              </View>
            </Animated.View>

            <Animated.View entering={FadeInUp.duration(500).delay(500)} style={styles.buttonSection}>
              <Button
                title="Start Your Journey"
                onPress={handleContinue}
                fullWidth
                variant="gold"
                size="lg"
                icon={<Ionicons name="arrow-forward" size={20} color={palette.textInverse} />}
                iconPosition="right"
              />
            </Animated.View>

            <Animated.View entering={FadeIn.duration(400).delay(700)} style={styles.footerSection}>
              <View style={[styles.footerDivider, { backgroundColor: palette.border }]} />
              <Text style={[styles.footerText, { color: palette.textTertiary }]}>
                You&apos;re now part of an exclusive community committed to personal excellence
              </Text>
            </Animated.View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  particleContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xxl,
  },

  // Icon Section
  iconSection: {
    alignItems: 'center',
    paddingTop: Spacing.xxxl * 2,
    paddingBottom: Spacing.xxl,
  },
  iconContainer: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulsingRing: {
    position: 'absolute',
    borderWidth: 2,
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.gold,
  },

  // Text Section
  textSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  title: {
    fontSize: Typography.sizes.hero,
    fontWeight: Typography.weights.bold,
    fontFamily: Typography.fonts.serif,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.sizes.bodyLarge,
    textAlign: 'center',
  },

  // Message Section
  messageSection: {
    marginBottom: Spacing.xxl,
  },
  messageCard: {
    flexDirection: 'row',
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 1,
    ...Shadows.sm,
  },
  messageIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  messageTextContainer: {
    flex: 1,
  },
  messageTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
  },
  messageText: {
    fontSize: Typography.sizes.body,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },

  // Button Section
  buttonSection: {
    marginBottom: Spacing.xl,
  },

  // Footer Section
  footerSection: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
  },
  footerDivider: {
    width: 40,
    height: 1,
    marginBottom: Spacing.lg,
  },
  footerText: {
    fontSize: Typography.sizes.caption,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: Spacing.xl,
    lineHeight: Typography.sizes.caption * Typography.lineHeights.relaxed,
  },
});
