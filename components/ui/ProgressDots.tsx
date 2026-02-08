import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Spacing, Timing } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';

interface ProgressDotsProps {
  total: number;
  current: number;
  style?: ViewStyle;
}

function Dot({ active }: { active: boolean }) {
  const { palette } = useThemeSafe();

  const animatedStyle = useAnimatedStyle(() => ({
    width: withSpring(active ? 24 : 8, Timing.spring),
    backgroundColor: withSpring(
      active ? palette.accent : palette.border,
      Timing.spring
    ),
  }));

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

export function ProgressDots({ total, current, style }: ProgressDotsProps) {
  return (
    <View style={[styles.container, style]}>
      {Array.from({ length: total }).map((_, index) => (
        <Dot key={index} active={index === current} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});

export default ProgressDots;
