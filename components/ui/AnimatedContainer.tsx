import React, { useEffect } from 'react';
import { ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withRepeat,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { Timing } from '@/constants/theme';

interface StaggeredFadeInProps {
  children: React.ReactNode;
  index: number;
  baseDelay?: number;
  staggerDelay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  style?: ViewStyle;
}

/**
 * Staggered fade-in animation component for elegant entrance effects
 */
export function StaggeredFadeIn({
  children,
  index,
  baseDelay = 100,
  staggerDelay = 80,
  direction = 'up',
  style,
}: StaggeredFadeInProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(direction === 'up' ? 30 : direction === 'down' ? -30 : 0);
  const translateX = useSharedValue(direction === 'left' ? 30 : direction === 'right' ? -30 : 0);

  useEffect(() => {
    const delay = baseDelay + index * staggerDelay;
    opacity.value = withDelay(
      delay,
      withTiming(1, {
        duration: Timing.elegant,
        easing: Easing.out(Easing.cubic),
      })
    );
    translateY.value = withDelay(
      delay,
      withSpring(0, Timing.springGentle)
    );
    translateX.value = withDelay(
      delay,
      withSpring(0, Timing.springGentle)
    );
  }, [index, baseDelay, staggerDelay, opacity, translateY, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
    ],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}

interface ParallaxContainerProps {
  children: React.ReactNode;
  scrollOffset: number;
  parallaxFactor?: number;
  style?: ViewStyle;
}

/**
 * Parallax container that moves based on scroll offset
 */
export function ParallaxContainer({
  children,
  scrollOffset,
  parallaxFactor = 0.3,
  style,
}: ParallaxContainerProps) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = scrollOffset * parallaxFactor;
  }, [scrollOffset, parallaxFactor, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -translateY.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}

/**
 * Interactive scale animation wrapper
 */
export function useScaleAnimation(initialScale: number = 1) {
  const scale = useSharedValue(initialScale);

  const handlePressIn = () => {
    scale.value = withSpring(0.97, Timing.springBouncy);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, Timing.springBouncy);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return {
    animatedStyle,
    handlePressIn,
    handlePressOut,
  };
}

interface FloatingAnimationProps {
  children: React.ReactNode;
  delay?: number;
  amplitude?: number;
  duration?: number;
  style?: ViewStyle;
}

/**
 * Subtle floating animation for premium elements
 */
export function FloatingContainer({
  children,
  delay = 0,
  amplitude = 4,
  duration = 3000,
  style,
}: FloatingAnimationProps) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    // Keep the animation on the UI thread (no JS timers).
    translateY.value = -amplitude;
    translateY.value = withDelay(
      delay,
      withRepeat(
        withTiming(amplitude, {
          duration: duration / 2,
          easing: Easing.inOut(Easing.sin),
        }),
        -1,
        true
      )
    );

    return () => {
      cancelAnimation(translateY);
      translateY.value = 0;
    };
  }, [delay, amplitude, duration, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}

interface GlowPulseProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

/**
 * Subtle glow pulse animation
 */
export function GlowPulse({ children, style }: GlowPulseProps) {
  const opacity = useSharedValue(0.7);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(1, {
        duration: 1500,
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      true
    );

    return () => {
      cancelAnimation(opacity);
      opacity.value = 0.7;
    };
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      {children}
    </Animated.View>
  );
}
