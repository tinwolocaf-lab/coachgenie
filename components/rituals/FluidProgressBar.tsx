// FluidProgressBar - A progress bar with liquid-like motion
import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radius, Timing } from '@/constants/theme';

interface FluidProgressBarProps {
  progress: number; // 0-100
  height?: number;
  showWave?: boolean;
  color?: string;
  backgroundColor?: string;
  style?: ViewStyle;
  animated?: boolean;
}

export function FluidProgressBar({
  progress,
  height = 8,
  showWave = true,
  color = Colors.burnishedGold,
  backgroundColor = Colors.goldMuted,
  style,
  animated = true,
}: FluidProgressBarProps) {
  const progressWidth = useSharedValue(0);
  const waveOffset = useSharedValue(0);
  const shimmerOffset = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      progressWidth.value = withSpring(progress, {
        damping: 20,
        stiffness: 80,
        mass: 1,
      });
    } else {
      progressWidth.value = progress;
    }
  }, [progress, animated, progressWidth]);

  useEffect(() => {
    if (showWave && progress > 0 && progress < 100) {
      // Subtle wave animation
      waveOffset.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        false
      );
    }

    // Shimmer effect
    shimmerOffset.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.linear }),
      -1,
      false
    );
  }, [showWave, progress, waveOffset, shimmerOffset]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const waveStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(waveOffset.value, [0, 1], [-4, 4]),
      },
    ],
    opacity: interpolate(progressWidth.value, [0, 10, 100], [0, 1, 0.3]),
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(shimmerOffset.value, [0, 1], [-100, 200]),
      },
    ],
    opacity: interpolate(progressWidth.value, [0, 20, 100], [0, 0.3, 0.1]),
  }));

  return (
    <View style={[styles.container, { height, backgroundColor }, style]}>
      <Animated.View style={[styles.progress, progressStyle]}>
        <LinearGradient
          colors={[color, lightenColor(color, 20)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradient}
        />

        {/* Wave effect at the edge */}
        {showWave && progress > 0 && progress < 100 && (
          <Animated.View style={[styles.wave, waveStyle]}>
            <View style={[styles.waveBubble, { backgroundColor: color }]} />
            <View style={[styles.waveBubble, styles.waveBubbleSmall, { backgroundColor: color }]} />
          </Animated.View>
        )}

        {/* Shimmer effect */}
        <Animated.View style={[styles.shimmer, shimmerStyle]}>
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.3)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.shimmerGradient}
          />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

// Vertical fluid progress for circular/ring displays
interface FluidProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showLabel?: boolean;
  labelPrefix?: string;
  style?: ViewStyle;
}

export function FluidProgressRing({
  progress,
  size = 100,
  strokeWidth = 8,
  color = Colors.burnishedGold,
  backgroundColor = Colors.goldMuted,
  showLabel = true,
  labelPrefix,
  style,
}: FluidProgressRingProps) {
  const progressValue = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    progressValue.value = withSpring(progress, Timing.springGentle);

    // Pulse animation when reaching milestones
    if (progress > 0 && progress % 25 === 0) {
      pulseScale.value = withSequence(
        withTiming(1.05, { duration: 150 }),
        withSpring(1, Timing.springBouncy)
      );
    }
  }, [progress, progressValue, pulseScale]);

  const progressStyle = useAnimatedStyle(() => {
    // Use rotation to simulate arc progress
    const rotation = interpolate(progressValue.value, [0, 100], [0, 180]);
    return {
      transform: [{ rotate: `${rotation - 180}deg` }],
      opacity: progressValue.value > 0 ? 1 : 0,
    };
  });

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <Animated.View style={[styles.ringContainer, { width: size, height: size / 2 + strokeWidth }, containerStyle, style]}>
      {/* Background arc */}
      <View style={[styles.ringArc, { width: size, height: size / 2 }]}>
        <View
          style={[
            styles.ringTrack,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: backgroundColor,
              borderBottomColor: 'transparent',
              borderLeftColor: 'transparent',
            },
          ]}
        />
      </View>

      {/* Progress arc - simplified using opacity */}
      <Animated.View
        style={[
          styles.ringArc,
          { width: size, height: size / 2 },
        ]}
      >
        <Animated.View
          style={[
            styles.ringProgress,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth,
              borderColor: color,
              borderBottomColor: 'transparent',
              borderLeftColor: 'transparent',
            },
            progressStyle,
          ]}
        />
      </Animated.View>

      {/* Center label */}
      {showLabel && (
        <View style={[styles.ringLabel, { top: strokeWidth }]}>
          <Animated.Text style={styles.ringLabelText}>
            {labelPrefix}{Math.round(progress)}%
          </Animated.Text>
        </View>
      )}
    </Animated.View>
  );
}

// Segmented progress bar for habit tracking
interface SegmentedProgressProps {
  segments: boolean[]; // Array of completion states
  height?: number;
  color?: string;
  emptyColor?: string;
  gap?: number;
  style?: ViewStyle;
}

export function SegmentedProgress({
  segments,
  height = 6,
  color = Colors.burnishedGold,
  emptyColor = Colors.goldMuted,
  gap = 3,
  style,
}: SegmentedProgressProps) {
  return (
    <View style={[styles.segmentedContainer, { gap }, style]}>
      {segments.map((isComplete, index) => (
        <SegmentItem
          key={index}
          isComplete={isComplete}
          height={height}
          color={color}
          emptyColor={emptyColor}
          delay={index * 50}
        />
      ))}
    </View>
  );
}

function SegmentItem({
  isComplete,
  height,
  color,
  emptyColor,
  delay,
}: {
  isComplete: boolean;
  height: number;
  color: string;
  emptyColor: string;
  delay: number;
}) {
  const fillProgress = useSharedValue(0);

  useEffect(() => {
    if (isComplete) {
      // Use withDelay for delayed spring animation
      const delayedSpring = delay > 0
        ? withDelay(delay, withSpring(1, Timing.springGentle))
        : withSpring(1, Timing.springGentle);
      fillProgress.value = delayedSpring;
    } else {
      fillProgress.value = withTiming(0, { duration: 200 });
    }
  }, [isComplete, delay, fillProgress]);

  const segmentStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolate(
      fillProgress.value,
      [0, 1],
      [0, 1]
    ) > 0.5 ? color : emptyColor,
    transform: [
      { scaleY: interpolate(fillProgress.value, [0, 0.5, 1], [1, 1.2, 1]) },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.segment,
        { height, borderRadius: height / 2 },
        segmentStyle,
      ]}
    />
  );
}

// Helper function to lighten a color
function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
  const B = Math.min(255, (num & 0x0000ff) + amt);
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.pill,
    overflow: 'hidden',
    width: '100%',
  },
  progress: {
    height: '100%',
    borderRadius: Radius.pill,
    overflow: 'hidden',
    position: 'relative',
  },
  gradient: {
    flex: 1,
    borderRadius: Radius.pill,
  },
  wave: {
    position: 'absolute',
    right: -4,
    top: 0,
    bottom: 0,
    width: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveBubble: {
    width: 6,
    height: 6,
    borderRadius: 3,
    position: 'absolute',
    right: 0,
  },
  waveBubbleSmall: {
    width: 4,
    height: 4,
    borderRadius: 2,
    top: -2,
    right: 4,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 100,
  },
  shimmerGradient: {
    flex: 1,
  },
  ringContainer: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  ringArc: {
    position: 'absolute',
    top: 0,
    overflow: 'hidden',
  },
  ringTrack: {
    position: 'absolute',
    top: 0,
    transform: [{ rotate: '135deg' }],
  },
  ringProgress: {
    position: 'absolute',
    top: 0,
    transform: [{ rotate: '135deg' }],
  },
  ringLabel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    left: 0,
    right: 0,
  },
  ringLabelText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.midnightEmerald,
  },
  segmentedContainer: {
    flexDirection: 'row',
    width: '100%',
  },
  segment: {
    flex: 1,
  },
});

export default FluidProgressBar;
