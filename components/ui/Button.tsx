import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  haptic?: boolean;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  loading = false,
  style,
  textStyle,
  haptic = true,
}: ButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, Timing.springBouncy);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, Timing.springBouncy);
  };

  const handlePress = () => {
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  const buttonStyles: StyleProp<ViewStyle>[] = [
    styles.base,
    styles[variant as keyof typeof styles] as ViewStyle,
    styles[`size_${size}` as keyof typeof styles] as ViewStyle,
    fullWidth && styles.fullWidth,
    (disabled || loading) && styles.disabled,
    animatedStyle,
    style,
  ];

  const textStyles: StyleProp<TextStyle>[] = [
    styles.text,
    styles[`text_${variant}` as keyof typeof styles] as TextStyle,
    styles[`textSize_${size}` as keyof typeof styles] as TextStyle,
    (disabled || loading) && styles.textDisabled,
    textStyle,
  ];

  return (
    <AnimatedTouchable
      style={buttonStyles}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={1}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'ghost' || variant === 'outline' ? Colors.midnightEmerald : Colors.white}
          size="small"
        />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Variants
  primary: {
    backgroundColor: Colors.midnightEmerald,
    borderRadius: Radius.pill,
    ...Shadows.md,
  },
  secondary: {
    backgroundColor: Colors.warmOatmealDark,
    borderRadius: Radius.pill,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.midnightEmerald,
    borderRadius: Radius.pill,
  },
  gold: {
    backgroundColor: Colors.burnishedGold,
    borderRadius: Radius.pill,
    ...Shadows.gold,
  },

  // Sizes
  size_sm: {
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
    minHeight: 36,
  },
  size_md: {
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.xl,
    minHeight: 48,
  },
  size_lg: {
    paddingVertical: Spacing.lg + 2,
    paddingHorizontal: Spacing.xxxl,
    minHeight: 56,
  },

  fullWidth: {
    width: '100%',
  },

  disabled: {
    opacity: 0.5,
  },

  // Text Styles
  text: {
    fontWeight: Typography.weights.semibold,
    textAlign: 'center',
    letterSpacing: Typography.letterSpacing.wide,
  },
  text_primary: {
    color: Colors.white,
  },
  text_secondary: {
    color: Colors.charcoal,
  },
  text_ghost: {
    color: Colors.midnightEmerald,
  },
  text_outline: {
    color: Colors.midnightEmerald,
  },
  text_gold: {
    color: Colors.white,
  },

  // Text Sizes
  textSize_sm: {
    fontSize: Typography.sizes.body,
  },
  textSize_md: {
    fontSize: Typography.sizes.bodyLarge,
  },
  textSize_lg: {
    fontSize: Typography.sizes.subtitle,
  },

  textDisabled: {
    opacity: 0.7,
  },
});

export default Button;
