import { Tabs } from 'expo-router';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { PremiumTabBar } from '@/components/ui/PremiumTabBar';



export default function TabLayout() {
  const { palette } = useThemeSafe();

  return (
    <Tabs
      tabBar={(props) => <PremiumTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.tabBarActive,
        tabBarInactiveTintColor: palette.tabBarInactive,
        tabBarStyle: {
          position: 'absolute', // Required for the blur effect to work over content
          backgroundColor: 'transparent',
          elevation: 0,
          borderTopWidth: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="coaches"
        options={{
          title: 'Gallery',
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          title: 'Vault',
        }}
      />
    </Tabs>
  );
}


