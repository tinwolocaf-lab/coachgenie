// GoldenThread - A shimmering metallic gradient accent line
// Gently animates to simulate light catching movement
import React, { useEffect } from 'react';
import { StyleSheet, ViewStyle, StyleProp, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeSafe } from '@/contexts/ThemeContext';

interface GoldenThreadProps {
  width?: number | string;
  height?: number;
  style?: StyleProp<ViewStyle>;
  variant?: 'line' | 'accent' | 'progress';
  progress?: number; // 0-100 for progress variant
  delay?: number;
}

export function GoldenThread({
  width = '100%',
  height = 2,
  style,
  variant = 'line',
  progress = 100,
  delay = 0,
}: GoldenThreadProps) {
  const { palette } = useThemeSafe();
  const shimmerPosition = useSharedValue(0);
  const breathe = useSharedValue(0);
  const progressValue = useSharedValue(0);

  useEffect(() => {
    // Shimmer animation - light catching the surface
    shimmerPosition.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, {
            duration: 3000,
            easing: Easing.inOut(Easing.cubic),
          }),
          withTiming(0, {
            duration: 3000,
            easing: Easing.inOut(Easing.cubic),
          })
        ),
        -1,
        false
      )
    );

    // Gentle breathing opacity
    breathe.value = withDelay(
      delay + 500,
      withRepeat(
        withSequence(
          withTiming(1, {
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
          }),
          withTiming(0, {
            duration: 2000,
            easing: Easing.inOut(Easing.sin),
          })
        ),
        -1,
        false
      )
    );
  }, [delay, shimmerPosition, breathe]);

  useEffect(() => {
    if (variant === 'progress') {
      progressValue.value = withTiming(progress / 100, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [progress, variant, progressValue]);

  const shimmerStyle = useAnimatedStyle(() => {
    const translateX = interpolate(shimmerPosition.value, [0, 1], [-100, 200]);
    const opacity = interpolate(breathe.value, [0, 1], [0.6, 1]);

    return {
      transform: [{ translateX }],
      opacity,
    };
  });

  const progressStyle = useAnimatedStyle(() => {
    if (variant === 'progress') {
      return {
        width: `${progressValue.value * 100}%` as unknown as number,
      };
    }
    return {};
  });

  const gradientColors = [
    'transparent',
    palette.accentShimmer,
    palette.accent,
    palette.accentShimmer,
    'transparent',
  ] as const;

  const baseGradient = [
    palette.accentMuted,
    palette.accent,
    palette.accentLight,
    palette.accent,
    palette.accentMuted,
  ] as const;

  if (variant === 'progress') {
    return (
      <View
        style={[
          styles.container,
          { width: width as number, height },
          styles.progressTrack,
          { backgroundColor: palette.accentMuted },
          style,
        ]}
      >
        <Animated.View style={[styles.progressFill, progressStyle]}>
          <LinearGradient
            colors={[palette.accent, palette.accentLight, palette.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Shimmer overlay */}
          <Animated.View style={[styles.shimmerOverlay, shimmerStyle]}>
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.4)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.shimmerGradient}
            />
          </Animated.View>
        </Animated.View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { width: width as number, height }, style]}>
      {/* Base gradient line */}
      <LinearGradient
        colors={[...baseGradient]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Shimmer overlay that moves across */}
      <Animated.View style={[styles.shimmerOverlay, shimmerStyle]}>
        <LinearGradient
          colors={[...gradientColors]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.shimmerGradient}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 1,
  },
  shimmerOverlay: {
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
  progressTrack: {
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },
});

export default GoldenThread;
