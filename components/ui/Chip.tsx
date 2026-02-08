import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Radius, Typography, Spacing, Timing } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  variant?: 'default' | 'premium';
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function Chip({
  label,
  selected = false,
  onPress,
  disabled = false,
  style,
  variant = 'default',
}: ChipProps) {
  const { palette } = useThemeSafe();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, Timing.springBouncy);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, Timing.springBouncy);
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  const isPremium = variant === 'premium';

  return (
    <AnimatedTouchable
      style={[
        styles.chip,
        {
          backgroundColor: palette.backgroundSecondary,
          borderColor: palette.border,
        },
        isPremium && {
          ...styles.chipPremium,
          backgroundColor: palette.cardBg,
          borderColor: palette.border,
        },
        selected && !isPremium && {
          backgroundColor: palette.textPrimary,
          borderColor: palette.textPrimary,
        },
        selected && isPremium && {
          backgroundColor: palette.accentMuted,
          borderColor: palette.accent,
        },
        disabled && styles.disabled,
        animatedStyle,
        style,
      ]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={1}
    >
      <Text
        style={[
          styles.text,
          { color: palette.textSecondary },
          isPremium && styles.textPremium,
          selected && !isPremium && { color: palette.textInverse },
          selected && isPremium && {
            color: palette.textPrimary,
            fontWeight: Typography.weights.semibold,
          },
        ]}
      >
        {label}
      </Text>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  chipPremium: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.squircle,
    borderWidth: 1,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
  },
  textPremium: {
    fontSize: Typography.sizes.bodyLarge,
    fontFamily: Typography.fonts.serif,
  },
});

export default Chip;
