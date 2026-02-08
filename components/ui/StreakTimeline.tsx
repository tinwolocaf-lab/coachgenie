import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withDelay,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Typography, Spacing, Timing } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';

interface StreakDay {
  day: string;
  completed: boolean;
  isToday: boolean;
}

interface StreakTimelineProps {
  days: StreakDay[];
  currentStreak: number;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function StreakDot({ day, completed, isToday, index }: StreakDay & { index: number }) {
  const { palette } = useThemeSafe();
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const ringProgress = useSharedValue(0);

  const size = isToday ? 44 : 36;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    const delay = index * 100;
    scale.value = withDelay(delay, withSpring(1, Timing.springBouncy));
    opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
    if (completed || isToday) {
      ringProgress.value = withDelay(
        delay + 200,
        withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) })
      );
    }
  }, [index, completed, isToday, scale, opacity, ringProgress]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - ringProgress.value),
  }));

  return (
    <Animated.View style={[styles.dayContainer, containerStyle]}>
      <View style={[styles.dotWrapper, { width: size, height: size }]}>
        {/* Background ring */}
        <Svg
          width={size}
          height={size}
          style={StyleSheet.absoluteFill}
        >
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={isToday ? palette.accentMuted : palette.border}
            strokeWidth={strokeWidth}
            fill="none"
          />
        </Svg>

        {/* Progress ring */}
        {(completed || isToday) && (
          <Svg
            width={size}
            height={size}
            style={StyleSheet.absoluteFill}
          >
            <Defs>
              <LinearGradient id={`streakGradient${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <Stop offset="0%" stopColor={palette.accent} />
                <Stop offset="100%" stopColor={palette.accentLight} />
              </LinearGradient>
            </Defs>
            <AnimatedCircle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={`url(#streakGradient${index})`}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              animatedProps={animatedProps}
              strokeLinecap="round"
              rotation={-90}
              origin={`${size / 2}, ${size / 2}`}
            />
          </Svg>
        )}

        {/* Center dot */}
        <View
          style={[
            styles.centerDot,
            {
              backgroundColor: completed
                ? palette.accent
                : isToday
                ? palette.accentMuted
                : palette.backgroundSecondary,
            },
          ]}
        />
      </View>
      <Text
        style={[
          styles.dayLabel,
          { color: palette.textTertiary },
          isToday && { color: palette.textPrimary, fontWeight: Typography.weights.bold },
          completed && { color: palette.accent },
        ]}
      >
        {day}
      </Text>
    </Animated.View>
  );
}

export function StreakTimeline({ days, currentStreak }: StreakTimelineProps) {
  const { palette } = useThemeSafe();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.streakLabel, { color: palette.textTertiary }]}>Coaching Streak</Text>
        <View style={styles.streakBadge}>
          <Text style={[styles.streakNumber, { color: palette.accent }]}>{currentStreak}</Text>
          <Text style={[styles.streakDays, { color: palette.textTertiary }]}>days</Text>
        </View>
      </View>
      <View style={styles.timeline}>
        {days.map((day, index) => (
          <StreakDot key={day.day} {...day} index={index} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  streakLabel: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wider,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  streakNumber: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.bold,
    fontFamily: Typography.fonts.serif,
  },
  streakDays: {
    fontSize: Typography.sizes.caption,
  },
  timeline: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dayContainer: {
    alignItems: 'center',
  },
  dotWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dayLabel: {
    fontSize: Typography.sizes.micro,
    fontWeight: Typography.weights.medium,
    marginTop: Spacing.sm,
    textTransform: 'uppercase',
  },
});
