import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  interpolate,
} from 'react-native-reanimated';
import { Colors, Radius, Shadows, Spacing, Timing } from '@/constants/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  variant?: 'default' | 'elevated' | 'gold' | 'minimal';
  intensity?: number;
  disabled?: boolean;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function GlassCard({
  children,
  style,
  onPress,
  variant = 'default',
  intensity = 60,
  disabled = false,
}: GlassCardProps) {
  const scale = useSharedValue(1);
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: interpolate(pressed.value, [0, 1], [1, 0.95]),
    };
  });

  const handlePressIn = () => {
    if (onPress && !disabled) {
      scale.value = withSpring(0.98, Timing.springGentle);
      pressed.value = withSpring(1, Timing.springGentle);
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, Timing.springGentle);
    pressed.value = withSpring(0, Timing.springGentle);
  };

  const variantStyles = {
    default: {
      backgroundColor: Colors.glassBg,
      borderColor: Colors.glassBorder,
      ...Shadows.md,
    },
    elevated: {
      backgroundColor: Colors.white,
      borderColor: Colors.borderLight,
      ...Shadows.lg,
    },
    gold: {
      backgroundColor: Colors.white,
      borderColor: Colors.borderGold,
      ...Shadows.gold,
    },
    minimal: {
      backgroundColor: Colors.warmOatmeal,
      borderColor: 'transparent',
      ...Shadows.subtle,
    },
  };

  const content = (
    <View style={[styles.container, variantStyles[variant], style]}>
      {variant === 'default' && (
        <BlurView
          intensity={intensity}
          style={StyleSheet.absoluteFillObject}
          tint="light"
        />
      )}
      <View style={styles.content}>{children}</View>
    </View>
  );

  if (onPress) {
    return (
      <AnimatedTouchable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        disabled={disabled}
        style={animatedStyle}
      >
        {content}
      </AnimatedTouchable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.squircle,
    borderWidth: 1,
    overflow: 'hidden',
  },
  content: {
    padding: Spacing.xl,
  },
});
