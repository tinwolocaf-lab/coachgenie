import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { Colors, Typography, Shadows, Timing } from '@/constants/theme';

interface TabIconProps {
  name: keyof typeof Ionicons.glyphMap;
  nameOutline: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  color: string;
}

function TabIcon({ name, nameOutline, focused, color }: TabIconProps) {
  const scale = useSharedValue(focused ? 1 : 0.9);

  scale.value = withSpring(focused ? 1 : 0.9, Timing.springGentle);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.iconContainer, animatedStyle]}>
      <Ionicons
        name={focused ? name : nameOutline}
        size={22}
        color={color}
      />
      {focused && <View style={styles.activeIndicator} />}
    </Animated.View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.burnishedGold,
        tabBarInactiveTintColor: Colors.stoneGray,
        tabBarLabelStyle: {
          fontSize: Typography.sizes.micro,
          fontWeight: Typography.weights.medium,
          letterSpacing: Typography.letterSpacing.wide,
          marginTop: 2,
        },
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'rgba(253, 252, 248, 0.95)',
          borderTopWidth: 0,
          paddingTop: 8,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 12,
          height: 65 + (insets.bottom > 0 ? insets.bottom : 12),
          ...Shadows.lg,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={80}
            tint="light"
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
            />
          ),
        }}
      />
      <Tabs.Screen
        name="coaches"
        options={{
          title: 'Coaches',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="people"
              nameOutline="people-outline"
              focused={focused}
              color={color}
            />
          ),
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
            />
          ),
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
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.burnishedGold,
    marginTop: 4,
  },
});
