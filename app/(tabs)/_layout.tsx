import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Typography, Timing } from '@/constants/theme';
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
  const scale = useSharedValue(focused ? 1 : 0.92);
  const lift = useSharedValue(focused ? -1 : 0);
  const glowOpacity = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    scale.value = withSpring(focused ? 1 : 0.92, Timing.springGentle);
    lift.value = withTiming(focused ? -1 : 0, { duration: 180 });
    glowOpacity.value = withTiming(focused ? 1 : 0, { duration: 220 });
  }, [focused, scale, lift, glowOpacity]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: lift.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <Animated.View style={[styles.iconContainer, containerStyle]}>
      <Animated.View style={[styles.activePill, glowStyle]}>
        <LinearGradient
          colors={[`${accentColor}55`, `${accentColor}00`]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.activePillGradient}
        />
      </Animated.View>

      <View style={styles.iconCore}>
        <Ionicons name={focused ? name : nameOutline} size={21} color={color} />
      </View>

      {focused && <View style={[styles.activeDot, { backgroundColor: accentColor }]} />}
    </Animated.View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { palette, atmosphere } = useThemeSafe();
  const blurTint = atmosphere.id === 'midnight-gallery' ? 'dark' : 'light';

  const tabPaddingBottom = insets.bottom > 0 ? insets.bottom : 12;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.tabBarActive,
        tabBarInactiveTintColor: palette.tabBarInactive,
        tabBarLabelStyle: {
          fontSize: Typography.sizes.micro,
          fontWeight: Typography.weights.semibold,
          letterSpacing: Typography.letterSpacing.wide,
          marginTop: 1,
        },
        tabBarStyle: {
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: 10,
          height: 68 + tabPaddingBottom,
          paddingTop: 9,
          paddingBottom: tabPaddingBottom,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: palette.borderLight,
          borderRadius: 24,
          backgroundColor: palette.tabBarBg,
          overflow: 'hidden',
          shadowColor: palette.shadowColor,
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.12,
          shadowRadius: 24,
          elevation: 8,
        },
        tabBarBackground: () => (
          <BlurView intensity={82} tint={blurTint} style={StyleSheet.absoluteFill} />
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
    width: 42,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconCore: {
    width: 26,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePill: {
    position: 'absolute',
    top: -6,
    width: 42,
    height: 26,
    borderRadius: 14,
    overflow: 'hidden',
  },
  activePillGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  activeDot: {
    position: 'absolute',
    bottom: -6,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
