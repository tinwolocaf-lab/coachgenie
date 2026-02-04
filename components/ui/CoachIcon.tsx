import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '@/constants/theme';

interface CoachIconProps {
  iconName: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
  clarity: 'sunny-outline',
  focus: 'eye-outline',
  systems: 'settings-outline',
  strategy: 'compass-outline',
  mindset: 'bulb-outline',
  productivity: 'speedometer-outline',
  wellbeing: 'heart-outline',
  creativity: 'color-palette-outline',
  default: 'chatbubble-outline',
};

const sizeMap = {
  sm: { container: 40, icon: 20 },
  md: { container: 56, icon: 28 },
  lg: { container: 72, icon: 36 },
};

export function CoachIcon({
  iconName,
  color = Colors.electricIndigo,
  size = 'md',
  style,
}: CoachIconProps) {
  const resolvedIcon = iconMap[iconName] || iconMap.default;
  const dimensions = sizeMap[size];

  return (
    <View
      style={[
        styles.container,
        {
          width: dimensions.container,
          height: dimensions.container,
          backgroundColor: `${color}15`,
        },
        style,
      ]}
    >
      <Ionicons
        name={resolvedIcon}
        size={dimensions.icon}
        color={color}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.xl,
  },
});

export default CoachIcon;
