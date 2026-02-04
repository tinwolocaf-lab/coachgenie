import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Colors } from '@/constants/theme';
import { isOnboardingComplete } from '@/store/onboarding';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

// Conditionally import AuthProvider
let AuthProvider: React.ComponentType<{
  supabaseClient: typeof supabase;
  routes?: {
    login: string;
    afterLogin: string;
  };
  children: React.ReactNode;
}> | null = null;

try {
  if (isSupabaseConfigured) {
    const authModule = require('@fastshot/auth');
    AuthProvider = authModule.AuthProvider;
  }
} catch {
  // Auth not available
}

function AppContent() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    try {
      await isOnboardingComplete();
    } catch (error) {
      console.error('Error checking onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.burnishedGold} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.warmOatmeal },
        animation: 'fade',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          animation: 'none',
        }}
      />
      <Stack.Screen
        name="(auth)"
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="onboarding"
        options={{
          animation: 'fade',
        }}
      />
      <Stack.Screen
        name="(tabs)"
        options={{
          animation: 'fade',
        }}
      />
      <Stack.Screen
        name="chat/[coachId]"
        options={{
          animation: 'slide_from_bottom',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="coach/[id]"
        options={{
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="auth/callback"
        options={{
          animation: 'none',
        }}
      />
      <Stack.Screen
        name="account"
        options={{
          animation: 'slide_from_right',
          presentation: 'card',
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  // Wrap with AuthProvider if available
  const content = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <AppContent />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );

  if (isSupabaseConfigured && AuthProvider) {
    return (
      <AuthProvider
        supabaseClient={supabase}
        routes={{
          login: '/(auth)/login',
          afterLogin: '/(tabs)',
        }}
      >
        {content}
      </AuthProvider>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.warmOatmeal,
  },
});
