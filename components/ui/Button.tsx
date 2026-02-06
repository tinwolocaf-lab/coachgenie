import React, { useMemo } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Radius, Spacing, Typography, Timing, Shadows } from '@/constants/theme';
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

type GradientColors = readonly [string, string, ...string[]];

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
    scale.value = withSpring(0.975, Timing.springGentle);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, Timing.springGentle);
  };

  const handlePress = () => {
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  const variantTokens = useMemo<{
    backgroundColor: string;
    borderColor: string;
    textColor: string;
    gradient: GradientColors | null;
  }>(() => {
    if (variant === 'gold') {
      return {
        backgroundColor: 'transparent',
        borderColor: palette.accent,
        textColor: palette.textInverse,
        gradient: [palette.accent, palette.accentLight],
      };
    }

    if (variant === 'primary') {
      return {
        backgroundColor: palette.textPrimary,
        borderColor: palette.textPrimary,
        textColor: palette.textInverse,
        gradient: [palette.textPrimary, palette.gradientEnd],
      };
    }

    if (variant === 'secondary') {
      return {
        backgroundColor: palette.backgroundSecondary,
        borderColor: palette.border,
        textColor: palette.textPrimary,
        gradient: null,
      };
    }

    if (variant === 'outline') {
      return {
        backgroundColor: 'transparent',
        borderColor: palette.borderAccent,
        textColor: palette.textPrimary,
        gradient: null,
      };
    }

    return {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      textColor: palette.textSecondary,
      gradient: null,
    };
  }, [palette, variant]);

  const buttonStyles: StyleProp<ViewStyle>[] = [
    styles.base,
    styles[`size_${size}` as keyof typeof styles] as ViewStyle,
    { backgroundColor: variantTokens.backgroundColor, borderColor: variantTokens.borderColor },
    (variant === 'outline' || variant === 'secondary') && styles.outlineLike,
    (variant === 'gold' || variant === 'primary') && styles.solidLike,
    fullWidth && styles.fullWidth,
    (disabled || loading) && styles.disabled,
    animatedStyle,
    style,
  ];

  const textStyles: StyleProp<TextStyle>[] = [
    styles.text,
    styles[`textSize_${size}` as keyof typeof styles] as TextStyle,
    { color: variantTokens.textColor },
    (disabled || loading) && styles.textDisabled,
    textStyle,
  ];

  const spinnerColor = variant === 'ghost' || variant === 'outline' || variant === 'secondary'
    ? palette.textPrimary
    : palette.textInverse;

  const renderContent = () => {
    if (loading) {
      return <ActivityIndicator color={spinnerColor} size="small" />;
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
      {variantTokens.gradient && (
        <LinearGradient
          colors={variantTokens.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientFill}
        />
      )}
      <View style={styles.content}>{renderContent()}</View>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  base: {
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.pill,
  },

  solidLike: {
    ...Shadows.md,
  },

  outlineLike: {
    borderWidth: 1.2,
  },

  size_sm: {
    minHeight: 44,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
  },

  size_md: {
    minHeight: 50,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },

  size_lg: {
    minHeight: 56,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxxl,
  },

  fullWidth: {
    width: '100%',
  },

  disabled: {
    opacity: 0.52,
  },

  gradientFill: {
    ...StyleSheet.absoluteFillObject,
  },

  content: {
    position: 'relative',
    zIndex: 1,
  },

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

  text: {
    fontWeight: Typography.weights.semibold,
    textAlign: 'center',
    letterSpacing: Typography.letterSpacing.wide,
  },

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
    opacity: 0.84,
  },
});

export default Button;
