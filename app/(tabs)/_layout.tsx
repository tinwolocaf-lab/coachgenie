import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Typography, Shadows, Timing } from '@/constants/theme';
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
  const scale = useSharedValue(focused ? 1 : 0.88);
  const opacity = useSharedValue(focused ? 1 : 0.45);
  const glowOpacity = useSharedValue(focused ? 0.2 : 0);
  const glowScale = useSharedValue(focused ? 1.5 : 1.2);

  useEffect(() => {
    scale.value = withSpring(focused ? 1 : 0.88, Timing.springGentle);
    opacity.value = withTiming(focused ? 1 : 0.45, { duration: 250 });
    glowOpacity.value = withTiming(focused ? 0.2 : 0, { duration: 350 });
    glowScale.value = withSpring(focused ? 1.5 : 1.2, Timing.springGentle);

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
      {/* Glow effect */}
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
    </Animated.View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { palette, atmosphere } = useThemeSafe();
  const { dockOpacity, dockTranslateY } = useFocusModeSafe();

  const isDark = atmosphere.id === 'midnight-gallery';
  const blurTint = isDark ? 'dark' : 'light';

  const dockAnimatedStyle = useAnimatedStyle(() => ({
    opacity: dockOpacity.value,
    transform: [{ translateY: dockTranslateY.value }],
  }));

  const DOCK_HEIGHT = 64;
  const DOCK_BOTTOM_MARGIN = insets.bottom > 0 ? insets.bottom + 6 : 20;
  const DOCK_HORIZONTAL_MARGIN = 32;
  const DOCK_BORDER_RADIUS = 32;

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
          marginTop: 2,
        },
        tabBarStyle: {
          position: 'absolute',
          bottom: DOCK_BOTTOM_MARGIN,
          left: DOCK_HORIZONTAL_MARGIN,
          right: DOCK_HORIZONTAL_MARGIN,
          height: DOCK_HEIGHT,
          borderRadius: DOCK_BORDER_RADIUS,
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          paddingTop: 8,
          paddingBottom: 8,
          paddingHorizontal: 8,
          borderWidth: isDark ? 1 : 1.5,
          borderColor: isDark
            ? 'rgba(255,255,255,0.22)'
            : 'rgba(255,255,255,0.7)',
          ...Shadows.floating,
          shadowColor: isDark ? '#000' : 'rgba(0,0,0,0.3)',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isDark ? 0.4 : 0.2,
          shadowRadius: 24,
          elevation: 24,
        },
        tabBarBackground: () => (
          <Animated.View style={[StyleSheet.absoluteFill, dockAnimatedStyle]}>
            {/* Blur layer — the core of Liquid Glass */}
            <BlurView
              intensity={isDark ? 80 : 100}
              tint={blurTint}
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: DOCK_BORDER_RADIUS,
                  overflow: 'hidden',
                },
              ]}
            />

            {/* Semi-transparent tint — much lighter than before so blur shows through */}
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: DOCK_BORDER_RADIUS,
                  backgroundColor: isDark
                    ? 'rgba(15, 17, 22, 0.82)'
                    : 'rgba(255, 255, 255, 0.45)',
                },
              ]}
            />

            {/* Specular highlight — top edge light refraction */}
            <LinearGradient
              colors={
                isDark
                  ? ['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.02)', 'transparent']
                  : ['rgba(255,255,255,0.8)', 'rgba(255,255,255,0.15)', 'transparent']
              }
              locations={[0, 0.3, 1]}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: DOCK_HEIGHT * 0.5,
                borderTopLeftRadius: DOCK_BORDER_RADIUS,
                borderTopRightRadius: DOCK_BORDER_RADIUS,
              }}
            />

            {/* Inner border highlight for glass edge effect */}
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  borderRadius: DOCK_BORDER_RADIUS,
                  borderWidth: 1,
                  borderColor: isDark
                    ? 'rgba(255,255,255,0.06)'
                    : 'rgba(255,255,255,0.5)',
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
});
