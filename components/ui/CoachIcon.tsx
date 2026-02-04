import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius } from '@/constants/theme';

interface CoachIconProps {
  iconName: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  style?: ViewStyle;
  variant?: 'default' | 'gradient' | 'solid';
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
  sm: { container: 40, icon: 20, radius: Radius.lg },
  md: { container: 56, icon: 28, radius: Radius.xl },
  lg: { container: 72, icon: 36, radius: Radius.squircle },
  xl: { container: 96, icon: 48, radius: Radius.squircle },
};

export function CoachIcon({
  iconName,
  color = Colors.burnishedGold,
  size = 'md',
  style,
  variant = 'default',
}: CoachIconProps) {
  const resolvedIcon = iconMap[iconName] || iconMap.default;
  const dimensions = sizeMap[size];

  if (variant === 'gradient') {
    return (
      <LinearGradient
        colors={[color, `${color}CC`]}
        style={[
          styles.container,
          {
            width: dimensions.container,
            height: dimensions.container,
            borderRadius: dimensions.radius,
          },
          style,
        ]}
      >
        <Ionicons
          name={resolvedIcon}
          size={dimensions.icon}
          color={Colors.white}
        />
      </LinearGradient>
    );
  }

  if (variant === 'solid') {
    return (
      <View
        style={[
          styles.container,
          {
            width: dimensions.container,
            height: dimensions.container,
            borderRadius: dimensions.radius,
            backgroundColor: color,
          },
          style,
        ]}
      >
        <Ionicons
          name={resolvedIcon}
          size={dimensions.icon}
          color={Colors.white}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          width: dimensions.container,
          height: dimensions.container,
          borderRadius: dimensions.radius,
          backgroundColor: `${color}15`,
          borderWidth: 1,
          borderColor: `${color}30`,
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
  },
});

export default CoachIcon;
