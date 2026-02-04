import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Colors, Typography, Timing } from '@/constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  showPercentage?: boolean;
  label?: string;
  sublabel?: string;
}

export function ProgressRing({
  progress,
  size = 160,
  strokeWidth = 12,
  showPercentage = true,
  label,
  sublabel,
}: ProgressRingProps) {
  const animatedProgress = useSharedValue(0);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  useEffect(() => {
    animatedProgress.value = withTiming(progress, {
      duration: Timing.dramatic,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });
  }, [progress, animatedProgress]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference * (1 - animatedProgress.value / 100);
    return {
      strokeDashoffset,
    };
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        <Defs>
          <LinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={Colors.burnishedGold} />
            <Stop offset="100%" stopColor={Colors.goldLight} />
          </LinearGradient>
        </Defs>

        {/* Background circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={Colors.border}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Progress circle */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
          rotation="-90"
          origin={`${center}, ${center}`}
        />
      </Svg>

      {/* Center content */}
      <View style={styles.centerContent}>
        {showPercentage && (
          <Text style={styles.percentage}>{Math.round(progress)}%</Text>
        )}
        {label && <Text style={styles.label}>{label}</Text>}
        {sublabel && <Text style={styles.sublabel}>{sublabel}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svg: {
    position: 'absolute',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentage: {
    fontSize: Typography.sizes.display,
    fontWeight: Typography.weights.bold,
    color: Colors.midnightEmerald,
    fontFamily: Typography.fonts.serif,
  },
  label: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.medium,
    color: Colors.stoneGray,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wider,
  },
  sublabel: {
    fontSize: Typography.sizes.micro,
    color: Colors.stoneGray,
    marginTop: 2,
  },
});
