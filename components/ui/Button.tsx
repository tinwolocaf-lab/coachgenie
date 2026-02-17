import React from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
  View,
  Platform,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { AppText } from './AppText';

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
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
  androidHapticType?: Haptics.AndroidHaptics;
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
  haptic = false,
  icon,
  iconPosition = 'left',
  accessibilityLabel,
  accessibilityHint,
  testID,
  androidHapticType = Haptics.AndroidHaptics.Context_Click,
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

  const handlePress = async () => {
    if (haptic) {
      try {
        if (Platform.OS === 'android') {
          await Haptics.performAndroidHapticsAsync(androidHapticType);
        } else {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      } catch {
        // Keep the action responsive if haptics are unavailable.
      }
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

  const touchTargetHitSlop =
    size === 'sm'
      ? { top: Spacing.sm, bottom: Spacing.sm, left: Spacing.sm, right: Spacing.sm }
      : undefined;

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
          <AppText
            style={textStyles}
            variant={size === 'sm' ? 'body' : size === 'md' ? 'bodyLarge' : 'subtitle'}
            weight="semibold"
            tone="primary"
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
          >
            {title}
          </AppText>
          {iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
        </View>
      );
    }

    return (
      <AppText
        style={textStyles}
        variant={size === 'sm' ? 'body' : size === 'md' ? 'bodyLarge' : 'subtitle'}
        weight="semibold"
        tone="primary"
        numberOfLines={1}
        maxFontSizeMultiplier={1.2}
      >
        {title}
      </AppText>
    );
  };

  return (
    <AnimatedTouchable
      style={buttonStyles}
      onPress={() => {
        if (!disabled && !loading) {
          void handlePress();
        }
      }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={1}
      hitSlop={touchTargetHitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      testID={testID}
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
    fontFamily: Typography.fonts.sansSemibold,
    textAlign: 'center',
    letterSpacing: Typography.letterSpacing.wide,
  },

  // Text Sizes
  textSize_sm: {
    fontSize: Typography.sizes.body,
    lineHeight: Math.round(Typography.sizes.body * Typography.lineHeights.snug),
  },
  textSize_md: {
    fontSize: Typography.sizes.bodyLarge,
    lineHeight: Math.round(Typography.sizes.bodyLarge * Typography.lineHeights.snug),
  },
  textSize_lg: {
    fontSize: Typography.sizes.subtitle,
    lineHeight: Math.round(Typography.sizes.subtitle * Typography.lineHeights.snug),
  },

  textDisabled: {
    opacity: 0.7,
  },
});

export default Button;
