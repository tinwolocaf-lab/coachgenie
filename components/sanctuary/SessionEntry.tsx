// Session Entry - Immersive transition animation
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Typography, Spacing, Shadows, Timing } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { Coach } from '@/types';
import { CoachIcon } from '@/components/ui/CoachIcon';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SessionEntryProps {
  coach: Coach;
  onAnimationComplete: () => void;
}

export function SessionEntry({ coach, onAnimationComplete }: SessionEntryProps) {
  const { palette } = useThemeSafe();

  // Animation values
  const portraitScale = useSharedValue(0.8);
  const portraitOpacity = useSharedValue(0);
  const portraitBlur = useSharedValue(0);
  const backgroundScale = useSharedValue(1);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(30);
  const overlayOpacity = useSharedValue(0);
  const ringScale = useSharedValue(0.8);
  const ringOpacity = useSharedValue(0);
  const particlesOpacity = useSharedValue(0);

  useEffect(() => {
    // Phase 1: Portrait appears
    portraitOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) });
    portraitScale.value = withSpring(1, Timing.springGentle);
    ringOpacity.value = withDelay(200, withTiming(0.6, { duration: 400 }));
    ringScale.value = withDelay(200, withSpring(1, Timing.springGentle));

    // Haptic feedback
    const hapticTimer = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, 300);

    // Phase 2: Background scales and blurs
    const blurTimer = setTimeout(() => {
      backgroundScale.value = withTiming(1.2, { duration: 1200, easing: Easing.inOut(Easing.ease) });
      portraitBlur.value = withTiming(15, { duration: 800 });
      overlayOpacity.value = withTiming(0.7, { duration: 800 });
      particlesOpacity.value = withTiming(1, { duration: 600 });
    }, 800);

    // Phase 3: Text appears
    const focusTimer = setTimeout(() => {
      textOpacity.value = withTiming(1, { duration: 600 });
      textTranslateY.value = withSpring(0, Timing.springGentle);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, 1400);

    // Phase 4: Reveal chat
    let completeTimer: ReturnType<typeof setTimeout> | undefined;
    const revealTimer = setTimeout(() => {
      overlayOpacity.value = withTiming(0, { duration: 500 });
      textOpacity.value = withTiming(0, { duration: 400 });
      portraitOpacity.value = withTiming(0, { duration: 500 });

      completeTimer = setTimeout(() => {
        runOnJS(onAnimationComplete)();
      }, 500);
    }, 3000);

    return () => {
      clearTimeout(hapticTimer);
      clearTimeout(blurTimer);
      clearTimeout(focusTimer);
      clearTimeout(revealTimer);
      if (completeTimer) {
        clearTimeout(completeTimer);
      }
    };
  }, [
    backgroundScale,
    onAnimationComplete,
    overlayOpacity,
    particlesOpacity,
    portraitBlur,
    portraitOpacity,
    portraitScale,
    ringOpacity,
    ringScale,
    textOpacity,
    textTranslateY,
  ]);

  // Animated styles
  const portraitContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: portraitScale.value }],
    opacity: portraitOpacity.value,
  }));

  const backgroundStyle = useAnimatedStyle(() => ({
    transform: [{ scale: backgroundScale.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const textContainerStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const particlesStyle = useAnimatedStyle(() => ({
    opacity: particlesOpacity.value,
  }));

  return (
    <View style={[styles.container, { backgroundColor: palette.textPrimary }]}>
      {/* Background with color */}
      <Animated.View style={[styles.background, backgroundStyle]}>
        <LinearGradient
          colors={[coach.color, palette.textPrimary, '#0D1A11']}
          locations={[0, 0.5, 1]}
          style={styles.backgroundGradient}
        />
      </Animated.View>

      {/* Overlay */}
      <Animated.View style={[styles.overlay, overlayStyle]}>
        <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
      </Animated.View>

      {/* Gold particles effect */}
      <Animated.View style={[styles.particlesContainer, particlesStyle]}>
        {[...Array(12)].map((_, i) => (
          <GoldParticle key={i} index={i} />
        ))}
      </Animated.View>

      {/* Portrait */}
      <Animated.View style={[styles.portraitContainer, portraitContainerStyle]}>
        {/* Decorative ring */}
        <Animated.View style={[styles.portraitRing, { borderColor: coach.color }, ringStyle]} />
        <Animated.View style={[styles.portraitRingOuter, { borderColor: palette.accentLight }, ringStyle]} />

        {/* Coach icon */}
        <View style={styles.portraitInner}>
          <LinearGradient
            colors={[coach.color, `${coach.color}CC`]}
            style={styles.portraitGradient}
          >
            <CoachIcon
              iconName={coach.icon_name}
              color={palette.textInverse}
              size="xl"
              variant="default"
              style={{ backgroundColor: 'transparent' }}
            />
          </LinearGradient>
        </View>
      </Animated.View>

      {/* Text */}
      <Animated.View style={[styles.textContainer, textContainerStyle]}>
        <Text style={[styles.enteringText, { color: palette.accent }]}>Entering Sanctuary</Text>
        <Text style={[styles.coachName, { color: palette.textInverse }]}>{coach.name}</Text>
        <View style={styles.methodContainer}>
          <View style={[styles.methodLine, { backgroundColor: palette.accentLight }]} />
          <Text style={[styles.methodText, { color: palette.accentLight }]}>{coach.tagline}</Text>
          <View style={[styles.methodLine, { backgroundColor: palette.accentLight }]} />
        </View>
      </Animated.View>
    </View>
  );
}

// Gold particle component
function GoldParticle({ index }: { index: number }) {
  const { palette } = useThemeSafe();
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);

  useEffect(() => {
    const delay = index * 100;
    const duration = 2000 + Math.random() * 1000;
    const startX = (Math.random() - 0.5) * SCREEN_WIDTH * 0.8;

    setTimeout(() => {
      opacity.value = withSequence(
        withTiming(1, { duration: 500 }),
        withTiming(0, { duration: duration - 500 })
      );

      translateY.value = withTiming(-100 - Math.random() * 100, {
        duration,
        easing: Easing.out(Easing.quad),
      });

      translateX.value = withTiming(startX + (Math.random() - 0.5) * 50, {
        duration,
        easing: Easing.inOut(Easing.ease),
      });

      scale.value = withSequence(
        withTiming(1, { duration: 300 }),
        withTiming(0, { duration: duration - 300 })
      );
    }, delay);
  }, [index, opacity, translateY, translateX, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  const size = 3 + Math.random() * 5;

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          left: SCREEN_WIDTH / 2,
          top: SCREEN_HEIGHT / 2,
          backgroundColor: palette.accent,
          shadowColor: palette.accent,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundGradient: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  particle: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  portraitContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.hero,
  },
  portraitRing: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 2,
  },
  portraitRingOuter: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    opacity: 0.3,
  },
  portraitInner: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: 'hidden',
    ...Shadows.gold,
  },
  portraitGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  enteringText: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    letterSpacing: Typography.letterSpacing.widest,
    textTransform: 'uppercase',
    marginBottom: Spacing.md,
  },
  coachName: {
    fontSize: Typography.sizes.hero,
    fontWeight: Typography.weights.light,
    fontFamily: Typography.fonts.serif,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  methodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  methodLine: {
    width: 30,
    height: 1,
    opacity: 0.5,
  },
  methodText: {
    fontSize: Typography.sizes.body,
    fontStyle: 'italic',
    textAlign: 'center',
    maxWidth: 250,
  },
});

export default SessionEntry;
