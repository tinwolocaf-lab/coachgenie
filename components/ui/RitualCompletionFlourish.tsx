// RitualCompletionFlourish - Multi-sensory feedback for ritual completion
// Combines: shimmering visual flourish + premium haptic pulse + ink-soak text transition
import React, { useCallback, useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import { StyleSheet, Dimensions, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withSpring,
  Easing,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { useThemeSafe } from '@/contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface RitualCompletionFlourishRef {
  trigger: (x?: number, y?: number) => void;
}

interface RitualCompletionFlourishProps {
  onComplete?: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  angle: number;
  speed: number;
  delay: number;
}

function FlourishParticle({
  particle,
  color,
  active,
}: {
  particle: Particle;
  color: string;
  active: boolean;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (active) {
      progress.value = 0;
      progress.value = withDelay(
        particle.delay,
        withTiming(1, {
          duration: 800,
          easing: Easing.out(Easing.cubic),
        })
      );
    }
  }, [active, particle.delay, progress]);

  const style = useAnimatedStyle(() => {
    const distance = interpolate(progress.value, [0, 1], [0, particle.speed]);
    const x = particle.x + Math.cos(particle.angle) * distance;
    const y = particle.y + Math.sin(particle.angle) * distance;
    const opacity = interpolate(progress.value, [0, 0.2, 0.7, 1], [0, 1, 0.6, 0]);
    const scale = interpolate(progress.value, [0, 0.3, 1], [0.3, 1.2, 0.2]);

    return {
      position: 'absolute',
      left: x - particle.size / 2,
      top: y - particle.size / 2,
      width: particle.size,
      height: particle.size,
      borderRadius: particle.size / 2,
      backgroundColor: color,
      opacity,
      transform: [{ scale }],
    };
  });

  return <Animated.View style={style} />;
}

function ShimmerRing({
  centerX,
  centerY,
  color,
  active,
}: {
  centerX: number;
  centerY: number;
  color: string;
  active: boolean;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (active) {
      progress.value = 0;
      progress.value = withTiming(1, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [active, progress]);

  const style = useAnimatedStyle(() => {
    const size = interpolate(progress.value, [0, 1], [20, 120]);
    const opacity = interpolate(progress.value, [0, 0.3, 1], [0, 0.4, 0]);
    const borderWidth = interpolate(progress.value, [0, 1], [4, 1]);

    return {
      position: 'absolute',
      left: centerX - size / 2,
      top: centerY - size / 2,
      width: size,
      height: size,
      borderRadius: size / 2,
      borderWidth,
      borderColor: color,
      opacity,
    };
  });

  return <Animated.View style={style} />;
}

export const RitualCompletionFlourish = forwardRef<RitualCompletionFlourishRef, RitualCompletionFlourishProps>(
  function RitualCompletionFlourish({ onComplete }, ref) {
    const { palette } = useThemeSafe();
    const [active, setActive] = useState(false);
    const [particles, setParticles] = useState<Particle[]>([]);
    const [center, setCenter] = useState({ x: SCREEN_WIDTH / 2, y: 200 });

    const generateParticles = useCallback((cx: number, cy: number): Particle[] => {
      const count = 12;
      return Array.from({ length: count }, (_, i) => ({
        id: i,
        x: cx,
        y: cy,
        size: 4 + Math.random() * 8,
        angle: (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5,
        speed: 40 + Math.random() * 60,
        delay: Math.random() * 150,
      }));
    }, []);

    const triggerHapticSequence = useCallback(async () => {
      // Premium haptic pulse: light → medium → heavy → notification success
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setTimeout(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }, 80);
      setTimeout(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }, 160);
      setTimeout(async () => {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, 300);
    }, []);

    const trigger = useCallback((x?: number, y?: number) => {
      const cx = x ?? SCREEN_WIDTH / 2;
      const cy = y ?? 200;
      setCenter({ x: cx, y: cy });
      setParticles(generateParticles(cx, cy));
      setActive(true);
      triggerHapticSequence();

      // Reset after animation
      setTimeout(() => {
        setActive(false);
        onComplete?.();
      }, 1000);
    }, [generateParticles, triggerHapticSequence, onComplete]);

    useImperativeHandle(ref, () => ({ trigger }), [trigger]);

    if (!active) return null;

    return (
      <View style={styles.container} pointerEvents="none">
        {/* Shimmer ring */}
        <ShimmerRing
          centerX={center.x}
          centerY={center.y}
          color={palette.accent}
          active={active}
        />

        {/* Second ring with delay */}
        <ShimmerRing
          centerX={center.x}
          centerY={center.y}
          color={palette.accentLight}
          active={active}
        />

        {/* Particles */}
        {particles.map((particle) => (
          <FlourishParticle
            key={particle.id}
            particle={particle}
            color={palette.accent}
            active={active}
          />
        ))}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
});

export default RitualCompletionFlourish;
