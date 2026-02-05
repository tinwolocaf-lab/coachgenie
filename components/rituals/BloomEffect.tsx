// BloomEffect - A gold-dust ring that expands and glows when a ritual is completed
import React, { useEffect } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { Colors, Timing } from '@/constants/theme';

interface BloomEffectProps {
  isActive: boolean;
  size?: number;
  color?: string;
  duration?: number;
  style?: ViewStyle;
}

export function BloomEffect({
  isActive,
  size = 60,
  color = Colors.burnishedGold,
  duration = 600,
  style,
}: BloomEffectProps) {
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);
  const innerScale = useSharedValue(0.8);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      // Start the bloom effect
      scale.value = withSequence(
        withTiming(1.2, { duration: duration * 0.4, easing: Easing.out(Easing.cubic) }),
        withSpring(1, Timing.springBouncy)
      );

      opacity.value = withSequence(
        withTiming(0.8, { duration: duration * 0.3 }),
        withDelay(duration * 0.3, withTiming(0, { duration: duration * 0.4 }))
      );

      innerScale.value = withSequence(
        withTiming(1.1, { duration: duration * 0.3, easing: Easing.out(Easing.cubic) }),
        withSpring(1, Timing.springGentle)
      );

      glowOpacity.value = withSequence(
        withTiming(0.6, { duration: duration * 0.2 }),
        withDelay(duration * 0.2, withTiming(0, { duration: duration * 0.4 }))
      );
    } else {
      scale.value = 0.6;
      opacity.value = 0;
      innerScale.value = 0.8;
      glowOpacity.value = 0;
    }
  }, [isActive, duration, scale, opacity, innerScale, glowOpacity]);

  const outerRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const innerRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: innerScale.value }],
    opacity: interpolate(innerScale.value, [0.8, 1, 1.1], [0, 0.5, 0]),
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: interpolate(glowOpacity.value, [0, 0.6], [0.8, 1.5]) }],
  }));

  return (
    <>
      {/* Outer glow */}
      <Animated.View
        style={[
          styles.glow,
          {
            width: size * 2,
            height: size * 2,
            borderRadius: size,
            backgroundColor: color,
          },
          glowStyle,
          style,
        ]}
        pointerEvents="none"
      />

      {/* Outer ring */}
      <Animated.View
        style={[
          styles.ring,
          {
            width: size * 1.6,
            height: size * 1.6,
            borderRadius: size * 0.8,
            borderColor: color,
          },
          outerRingStyle,
          style,
        ]}
        pointerEvents="none"
      />

      {/* Inner ring */}
      <Animated.View
        style={[
          styles.ring,
          styles.innerRing,
          {
            width: size * 1.3,
            height: size * 1.3,
            borderRadius: size * 0.65,
            borderColor: color,
          },
          innerRingStyle,
          style,
        ]}
        pointerEvents="none"
      />
    </>
  );
}

// Particle-style bloom effect for more dramatic completions
export function ParticleBloom({
  isActive,
  size = 80,
  particleCount = 8,
  color = Colors.burnishedGold,
}: {
  isActive: boolean;
  size?: number;
  particleCount?: number;
  color?: string;
}) {
  const particles = Array.from({ length: particleCount }, (_, i) => {
    const angle = (i * 360) / particleCount;
    return <BloomParticle key={i} angle={angle} isActive={isActive} size={size} color={color} />;
  });

  return <>{particles}</>;
}

function BloomParticle({
  angle,
  isActive,
  size,
  color,
}: {
  angle: number;
  isActive: boolean;
  size: number;
  color: string;
}) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.3);

  useEffect(() => {
    if (isActive) {
      const radians = (angle * Math.PI) / 180;
      const distance = size * 0.8;
      const targetX = Math.cos(radians) * distance;
      const targetY = Math.sin(radians) * distance;

      translateX.value = withSequence(
        withTiming(targetX * 0.5, { duration: 150 }),
        withTiming(targetX, { duration: 350, easing: Easing.out(Easing.cubic) })
      );
      translateY.value = withSequence(
        withTiming(targetY * 0.5, { duration: 150 }),
        withTiming(targetY, { duration: 350, easing: Easing.out(Easing.cubic) })
      );
      opacity.value = withSequence(
        withTiming(1, { duration: 100 }),
        withDelay(300, withTiming(0, { duration: 200 }))
      );
      scale.value = withSequence(
        withTiming(1, { duration: 200 }),
        withDelay(200, withTiming(0, { duration: 200 }))
      );
    } else {
      translateX.value = 0;
      translateY.value = 0;
      opacity.value = 0;
      scale.value = 0.3;
    }
  }, [isActive, angle, size, translateX, translateY, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        { backgroundColor: color },
        animatedStyle,
      ]}
      pointerEvents="none"
    />
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    borderWidth: 2,
    alignSelf: 'center',
  },
  innerRing: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  glow: {
    position: 'absolute',
    alignSelf: 'center',
  },
  particle: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    alignSelf: 'center',
  },
});

export default BloomEffect;
