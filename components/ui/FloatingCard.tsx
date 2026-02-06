// FloatingCard Component - Premium Rebirth
// Cards that appear to float above a physical surface with deep, diffused shadows
import React from 'react';
import { ViewStyle, StyleProp, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { Radius, Timing } from '@/constants/theme';

interface FloatingCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevation?: 'low' | 'medium' | 'high';
  interactive?: boolean;
  onPress?: () => void;
}

export function FloatingCard({
  children,
  style,
  elevation = 'medium',
  interactive = false,
}: FloatingCardProps) {
  const { palette } = useThemeSafe();
  const pressed = useSharedValue(0);

  const handlePressIn = () => {
    if (interactive) {
      pressed.value = withSpring(1, Timing.springGentle);
    }
  };

  const handlePressOut = () => {
    if (interactive) {
      pressed.value = withSpring(0, Timing.springGentle);
    }
  };

  const elevationMap = {
    low: {
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.06,
      shadowRadius: 20,
      elevation: 4,
    },
    medium: {
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.1,
      shadowRadius: 36,
      elevation: 8,
    },
    high: {
      shadowOffset: { width: 0, height: 24 },
      shadowOpacity: 0.14,
      shadowRadius: 50,
      elevation: 14,
    },
  };

  const cardShadow = elevationMap[elevation];

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(pressed.value, [0, 1], [1, 0.98]);
    const translateY = interpolate(pressed.value, [0, 1], [0, 2]);

    return {
      transform: [{ scale }, { translateY }],
    };
  });

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: palette.cardBg,
          shadowColor: palette.shadowColor,
          ...cardShadow,
        },
        animatedStyle,
        style,
      ]}
      onTouchStart={handlePressIn}
      onTouchEnd={handlePressOut}
      onTouchCancel={handlePressOut}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.squircle,
    overflow: 'hidden',
  },
});

export default FloatingCard;
