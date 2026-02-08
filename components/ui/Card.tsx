import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity, StyleProp } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
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
      scale.value = withSpring(0.98, Timing.springGentle);
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, Timing.springGentle);
  };

  const borderWidthMap = { thin: 0.5, normal: 1, thick: 2 };
  const bw = borderWidthMap[palette.borderWeight];
  const si = palette.shadowIntensity;

  const applyShadow = (shadow: ViewStyle): ViewStyle => {
    if (si === 0) return { shadowOpacity: 0, elevation: 0 };
    return {
      ...shadow,
      shadowOpacity: ((shadow.shadowOpacity as number) ?? 0.1) * si,
      elevation: ((shadow.elevation as number) ?? 0) * si,
    };
  };

  // Dynamic variant styles based on palette
  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          ...applyShadow(Shadows.lg),
          shadowColor: palette.shadowColor,
        };
      case 'outlined':
        return {
          borderWidth: bw,
          borderColor: palette.border,
          ...Shadows.none,
        };
      case 'glass':
        return {
          backgroundColor: palette.glassBg,
          borderWidth: bw,
          borderColor: palette.glassBorder,
          ...applyShadow(Shadows.md),
          shadowColor: palette.shadowColor,
        };
      case 'gold':
        return {
          borderWidth: bw,
          borderColor: palette.borderAccent,
          ...applyShadow(Shadows.md),
          shadowColor: palette.accent,
        };
      default:
        return {
          ...applyShadow(Shadows.sm),
          borderWidth: bw,
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
    { backgroundColor: palette.cardBg, borderRadius: palette.cardRadius },
    getVariantStyle(),
    getPaddingStyle(),
    style,
  ];

  if (onPress) {
    return (
      <AnimatedTouchable
        style={[cardStyles, animatedStyle]}
        onPress={onPress}
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
    overflow: 'hidden',
  },
});

export default Card;
