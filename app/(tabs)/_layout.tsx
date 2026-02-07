import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
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
import { Typography, Shadows, Timing, Radius } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { useFocusModeSafe } from '@/contexts/FocusModeContext';
import { useEffect } from 'react';

interface TabIconProps {
  name: keyof typeof Ionicons.glyphMap;
  nameOutline: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  color: string;
  accentColor: string;
}

function TabIcon({ name, nameOutline, focused, color, accentColor }: TabIconProps) {
  const scale = useSharedValue(focused ? 1 : 0.85);
  const opacity = useSharedValue(focused ? 1 : 0.5);
  const glowOpacity = useSharedValue(focused ? 0.25 : 0);
  const glowScale = useSharedValue(focused ? 1.6 : 1.2);

  useEffect(() => {
    scale.value = withSpring(focused ? 1 : 0.85, Timing.springGentle);
    opacity.value = withTiming(focused ? 1 : 0.5, { duration: 250 });
    glowOpacity.value = withTiming(focused ? 0.25 : 0, { duration: 350 });
    glowScale.value = withSpring(focused ? 1.6 : 1.2, Timing.springGentle);

    if (focused) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [focused, scale, opacity, glowOpacity, glowScale]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  return (
    <Animated.View style={[styles.iconContainer, containerStyle]}>
      {/* Glow effect - larger and softer */}
      <Animated.View
        style={[
          styles.glowEffect,
          { backgroundColor: accentColor },
          glowStyle,
        ]}
      />

      {/* Icon */}
      <Ionicons
        name={focused ? name : nameOutline}
        size={21}
        color={color}
      />

      {/* Active indicator dot */}
      {focused && (
        <Animated.View
          style={[styles.activeIndicator, { backgroundColor: accentColor }]}
        />
      )}
    </Animated.View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { palette, atmosphere } = useThemeSafe();
  const { dockOpacity, dockTranslateY } = useFocusModeSafe();

  // Determine blur tint based on theme
  const blurTint = atmosphere.id === 'midnight-gallery' ? 'dark' : 'light';
  const isDark = atmosphere.id === 'midnight-gallery';

  // Floating dock animated style
  const dockAnimatedStyle = useAnimatedStyle(() => ({
    opacity: dockOpacity.value,
    transform: [{ translateY: dockTranslateY.value }],
  }));

  const DOCK_HEIGHT = 62;
  const DOCK_BOTTOM_MARGIN = insets.bottom > 0 ? insets.bottom + 4 : 16;
  const DOCK_HORIZONTAL_MARGIN = 24;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.tabBarActive,
        tabBarInactiveTintColor: palette.tabBarInactive,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: Typography.sizes.micro,
          fontFamily: Typography.fonts.sansMedium,
          letterSpacing: Typography.letterSpacing.wider,
          textTransform: 'uppercase',
          marginTop: 1,
        },
        tabBarStyle: {
          position: 'absolute',
          bottom: DOCK_BOTTOM_MARGIN,
          left: DOCK_HORIZONTAL_MARGIN,
          right: DOCK_HORIZONTAL_MARGIN,
          height: DOCK_HEIGHT,
          borderRadius: Radius.squircle,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          paddingTop: 8,
          paddingBottom: 8,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
          ...Shadows.floating,
          shadowColor: palette.shadowColor,
          shadowOpacity: 0.12,
          elevation: 20,
        },
        tabBarBackground: () => (
          <Animated.View style={[StyleSheet.absoluteFill, dockAnimatedStyle]}>
            <BlurView
              intensity={isDark ? 50 : 80}
              tint={blurTint}
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: Radius.squircle,
                  overflow: 'hidden',
                },
              ]}
            />
            {/* Frosted glass overlay */}
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: Radius.squircle,
                  backgroundColor: isDark
                    ? 'rgba(26, 29, 36, 0.75)'
                    : `${palette.background}CC`,
                },
              ]}
            />
          </Animated.View>
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
    height: 28,
  },
  glowEffect: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -5,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
