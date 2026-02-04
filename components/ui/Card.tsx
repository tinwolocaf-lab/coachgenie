import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity, StyleProp } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { Colors, Radius, Spacing, Shadows, Timing } from '@/constants/theme';

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

  const cardStyles: StyleProp<ViewStyle>[] = [
    styles.card,
    styles[variant as keyof typeof styles] as ViewStyle,
    styles[`padding_${padding}` as keyof typeof styles] as ViewStyle,
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
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.squircle,
    overflow: 'hidden',
  },

  // Variants
  default: {
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  elevated: {
    ...Shadows.lg,
  },
  outlined: {
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.none,
  },
  glass: {
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    ...Shadows.md,
  },
  gold: {
    borderWidth: 1,
    borderColor: Colors.borderGold,
    ...Shadows.gold,
  },

  // Padding
  padding_none: {
    padding: 0,
  },
  padding_sm: {
    padding: Spacing.md,
  },
  padding_md: {
    padding: Spacing.lg,
  },
  padding_lg: {
    padding: Spacing.xl,
  },
});

export default Card;
