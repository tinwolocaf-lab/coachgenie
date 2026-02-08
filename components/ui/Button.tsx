import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';

export interface ButtonProps {
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
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
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
  icon,
  iconPosition = 'left',
}: ButtonProps) {
  const { palette } = useThemeSafe();
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

  const variantStyles: Record<string, ViewStyle> = {
    primary: {
      backgroundColor: palette.textPrimary,
      borderRadius: Radius.pill,
      ...Shadows.md,
    },
    secondary: {
      backgroundColor: palette.backgroundSecondary,
      borderRadius: Radius.pill,
    },
    ghost: {
      backgroundColor: 'transparent',
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: palette.textPrimary,
      borderRadius: Radius.pill,
    },
    gold: {
      backgroundColor: palette.accent,
      borderRadius: Radius.pill,
      ...Shadows.gold,
    },
  };

  const textVariantStyles: Record<string, TextStyle> = {
    text_primary: {
      color: palette.textInverse,
    },
    text_secondary: {
      color: palette.textSecondary,
    },
    text_ghost: {
      color: palette.textPrimary,
    },
    text_outline: {
      color: palette.textPrimary,
    },
    text_gold: {
      color: palette.textInverse,
    },
  };

  const buttonStyles: StyleProp<ViewStyle>[] = [
    styles.base,
    variantStyles[variant],
    styles[`size_${size}` as keyof typeof styles] as ViewStyle,
    fullWidth && styles.fullWidth,
    (disabled || loading) && styles.disabled,
    animatedStyle,
    style,
  ];

  const textStyles: StyleProp<TextStyle>[] = [
    styles.text,
    textVariantStyles[`text_${variant}`],
    styles[`textSize_${size}` as keyof typeof styles] as TextStyle,
    (disabled || loading) && styles.textDisabled,
    textStyle,
  ];

  const renderContent = () => {
    if (loading) {
      return (
        <ActivityIndicator
          color={variant === 'ghost' || variant === 'outline' ? palette.textPrimary : palette.textInverse}
          size="small"
        />
      );
    }

    if (icon) {
      return (
        <View style={styles.contentRow}>
          {iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
          <Text style={textStyles}>{title}</Text>
          {iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
        </View>
      );
    }

    return <Text style={textStyles}>{title}</Text>;
  };

  return (
    <AnimatedTouchable
      style={buttonStyles}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={1}
    >
      {renderContent()}
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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

  // Content with icon
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: Spacing.sm,
  },
  iconRight: {
    marginLeft: Spacing.sm,
  },

  // Text Styles
  text: {
    fontWeight: Typography.weights.semibold,
    textAlign: 'center',
    letterSpacing: Typography.letterSpacing.wide,
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
