// ProgressNebula - A soft, animated atmospheric glow behind ritual cards
// Vibrancy, size, and intensity increase as the user completes rituals
import React, { useEffect } from 'react';
import { StyleSheet, Dimensions, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useThemeSafe } from '@/contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ProgressNebulaProps {
  progress: number; // 0-100
  style?: object;
}

function NebulaOrb({
  color,
  size,
  x,
  y,
  delay,
  progress,
  pulseSpeed,
}: {
  color: string;
  size: number;
  x: number;
  y: number;
  delay: number;
  progress: number;
  pulseSpeed: number;
}) {
  const pulse = useSharedValue(0);
  const drift = useSharedValue(0);
  const progressAnim = useSharedValue(0);

  useEffect(() => {
    progressAnim.value = withTiming(progress / 100, {
      duration: 1200,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, progressAnim]);

  useEffect(() => {
    // Breathing pulse
    pulse.value = withRepeat(
      withSequence(
        withDelay(
          delay,
          withTiming(1, {
            duration: pulseSpeed,
            easing: Easing.inOut(Easing.sin),
          })
        ),
        withTiming(0, {
          duration: pulseSpeed,
          easing: Easing.inOut(Easing.sin),
        })
      ),
      -1,
      false
    );

    // Gentle drift
    drift.value = withRepeat(
      withSequence(
        withDelay(
          delay * 0.5,
          withTiming(1, {
            duration: pulseSpeed * 1.3,
            easing: Easing.inOut(Easing.sin),
          })
        ),
        withTiming(0, {
          duration: pulseSpeed * 1.3,
          easing: Easing.inOut(Easing.sin),
        })
      ),
      -1,
      false
    );
  }, [delay, pulse, drift, pulseSpeed]);

  const animatedStyle = useAnimatedStyle(() => {
    const baseOpacity = interpolate(progressAnim.value, [0, 0.3, 0.7, 1], [0.04, 0.08, 0.14, 0.22]);
    const pulseOpacity = interpolate(pulse.value, [0, 1], [0, 0.06]);
    const baseScale = interpolate(progressAnim.value, [0, 0.5, 1], [0.6, 0.85, 1.1]);
    const pulseScale = interpolate(pulse.value, [0, 1], [0, 0.08]);
    const driftX = interpolate(drift.value, [0, 1], [-6, 6]);
    const driftY = interpolate(pulse.value, [0, 1], [-4, 4]);

    return {
      opacity: baseOpacity + pulseOpacity,
      transform: [
        { translateX: x + driftX },
        { translateY: y + driftY },
        { scale: baseScale + pulseScale },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.orb,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

export function ProgressNebula({ progress, style }: ProgressNebulaProps) {
  const { palette } = useThemeSafe();

  // Nebula colors derived from accent
  const primaryColor = palette.accent;
  const secondaryColor = palette.accentLight;
  const tertiaryColor = palette.accentShimmer;

  return (
    <View style={[styles.container, style]} pointerEvents="none">
      {/* Primary orb - large center */}
      <NebulaOrb
        color={primaryColor}
        size={SCREEN_WIDTH * 0.8}
        x={-SCREEN_WIDTH * 0.1}
        y={-40}
        delay={0}
        progress={progress}
        pulseSpeed={4000}
      />

      {/* Secondary orb - upper right */}
      <NebulaOrb
        color={secondaryColor}
        size={SCREEN_WIDTH * 0.55}
        x={SCREEN_WIDTH * 0.3}
        y={-80}
        delay={800}
        progress={progress}
        pulseSpeed={3500}
      />

      {/* Tertiary orb - lower left */}
      <NebulaOrb
        color={tertiaryColor}
        size={SCREEN_WIDTH * 0.45}
        x={-SCREEN_WIDTH * 0.15}
        y={60}
        delay={1600}
        progress={progress}
        pulseSpeed={5000}
      />

      {/* Small accent orb */}
      <NebulaOrb
        color={primaryColor}
        size={SCREEN_WIDTH * 0.3}
        x={SCREEN_WIDTH * 0.4}
        y={100}
        delay={600}
        progress={progress}
        pulseSpeed={3000}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
  },
});

export default ProgressNebula;
