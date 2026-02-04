import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Radius, Typography, Spacing, Timing } from '@/constants/theme';

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
        isPremium && styles.chipPremium,
        selected && (isPremium ? styles.selectedPremium : styles.selected),
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
          isPremium && styles.textPremium,
          selected && (isPremium ? styles.textSelectedPremium : styles.textSelected),
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
    backgroundColor: Colors.warmOatmealDark,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  chipPremium: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.squircle,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selected: {
    backgroundColor: Colors.midnightEmerald,
    borderColor: Colors.midnightEmerald,
  },
  selectedPremium: {
    backgroundColor: Colors.goldMuted,
    borderColor: Colors.burnishedGold,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.charcoal,
  },
  textPremium: {
    fontSize: Typography.sizes.bodyLarge,
    fontFamily: Typography.fonts.serif,
  },
  textSelected: {
    color: Colors.white,
  },
  textSelectedPremium: {
    color: Colors.midnightEmerald,
    fontWeight: Typography.weights.semibold,
  },
});

export default Chip;
