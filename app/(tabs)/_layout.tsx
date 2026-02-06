import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Typography, Shadows, Timing } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { useEffect } from 'react';

interface TabIconProps {
  name: keyof typeof Ionicons.glyphMap;
  nameOutline: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  color: string;
  accentColor: string;
}

function TabIcon({ name, nameOutline, focused, color, accentColor }: TabIconProps) {
  const scale = useSharedValue(focused ? 1 : 0.9);
  const opacity = useSharedValue(focused ? 1 : 0.6);
  const glowOpacity = useSharedValue(focused ? 0.2 : 0);

  useEffect(() => {
    scale.value = withSpring(focused ? 1 : 0.9, Timing.springGentle);
    opacity.value = withTiming(focused ? 1 : 0.6, { duration: 200 });
    glowOpacity.value = withTiming(focused ? 0.2 : 0, { duration: 300 });

    if (focused) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [focused, scale, opacity, glowOpacity]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: 1.5 }],
  }));

  return (
    <Animated.View style={[styles.iconContainer, containerStyle]}>
      {/* Glow effect */}
      <Animated.View style={[styles.glowEffect, { backgroundColor: accentColor }, glowStyle]} />

      {/* Icon */}
      <Ionicons
        name={focused ? name : nameOutline}
        size={22}
        color={color}
      />

      {/* Active indicator */}
      {focused && (
        <Animated.View style={[styles.activeIndicator, { backgroundColor: accentColor }]} />
      )}
    </Animated.View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { palette, atmosphere } = useThemeSafe();

  // Determine blur tint based on theme
  const blurTint = atmosphere.id === 'midnight-gallery' ? 'dark' : 'light';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.tabBarActive,
        tabBarInactiveTintColor: palette.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: Typography.sizes.micro,
          fontFamily: Typography.fonts.sansMedium,
          letterSpacing: Typography.letterSpacing.wider,
          textTransform: 'uppercase',
          marginTop: 2,
        },
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: palette.tabBarBg,
          borderTopWidth: 0,
          paddingTop: 10,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 14,
          height: 70 + (insets.bottom > 0 ? insets.bottom : 14),
          ...Shadows.lg,
          shadowColor: palette.shadowColor,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={90}
            tint={blurTint}
            style={StyleSheet.absoluteFill}
          />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="home"
              nameOutline="home-outline"
              focused={focused}
              color={color}
              accentColor={palette.tabBarActive}
            />
          ),
        }}
        listeners={{
          tabPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
        }}
      />
      <Tabs.Screen
        name="coaches"
        options={{
          title: 'Gallery',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="grid"
              nameOutline="grid-outline"
              focused={focused}
              color={color}
              accentColor={palette.tabBarActive}
            />
          ),
        }}
        listeners={{
          tabPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="calendar"
              nameOutline="calendar-outline"
              focused={focused}
              color={color}
              accentColor={palette.tabBarActive}
            />
          ),
        }}
        listeners={{
          tabPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          title: 'Vault',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="diamond"
              nameOutline="diamond-outline"
              focused={focused}
              color={color}
              accentColor={palette.tabBarActive}
            />
          ),
        }}
        listeners={{
          tabPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: 40,
    height: 30,
  },
  glowEffect: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -6,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
