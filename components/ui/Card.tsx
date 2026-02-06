import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity, StyleProp } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Radius, Spacing, Shadows, Timing } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  variant?: 'default' | 'elevated' | 'outlined' | 'glass' | 'gold';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function Card({
  children,
  style,
  onPress,
  variant = 'default',
  padding = 'md',
}: CardProps) {
  const { palette } = useThemeSafe();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withSpring(0.985, Timing.springGentle);
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, Timing.springGentle);
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          ...Shadows.lg,
          shadowColor: palette.shadowColor,
          borderWidth: 1,
          borderColor: palette.borderLight,
        };
      case 'outlined':
        return {
          borderWidth: 1,
          borderColor: palette.border,
          ...Shadows.none,
        };
      case 'glass':
        return {
          backgroundColor: palette.glassBg,
          borderWidth: 1,
          borderColor: palette.glassBorder,
          ...Shadows.md,
          shadowColor: palette.shadowColor,
        };
      case 'gold':
        return {
          borderWidth: 1,
          borderColor: palette.borderAccent,
          ...Shadows.md,
          shadowColor: palette.accent,
        };
      default:
        return {
          ...Shadows.sm,
          borderWidth: 1,
          borderColor: palette.borderLight,
          shadowColor: palette.shadowColor,
        };
    }
  };

  const getPaddingStyle = (): ViewStyle => {
    switch (padding) {
      case 'none':
        return { padding: 0 };
      case 'sm':
        return { padding: Spacing.md };
      case 'lg':
        return { padding: Spacing.xl };
      default:
        return { padding: Spacing.lg };
    }
  };

  const cardStyles: StyleProp<ViewStyle>[] = [
    styles.card,
    { backgroundColor: palette.cardBg },
    getVariantStyle(),
    getPaddingStyle(),
    style,
  ];

  if (onPress) {
    return (
      <AnimatedTouchable
        style={[cardStyles, animatedStyle]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {children}
      </AnimatedTouchable>
    );
  }

  return <View style={cardStyles}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
});

export default Card;
