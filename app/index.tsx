import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { isOnboardingComplete } from '@/store/onboarding';
import { isNewOnboardingComplete } from '@/lib/onboarding';
import { isSupabaseConfigured } from '@/lib/supabase';

// Dynamic import for auth
const getAuthHook = () => {
  if (isSupabaseConfigured) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require('@fastshot/auth').useAuth;
    } catch {
      return null;
    }
  }
  return null;
};

// Authenticated index - uses useAuth hook
function AuthenticatedIndex() {
  const { palette } = useThemeSafe();
  const useAuth = getAuthHook();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const auth = useAuth ? useAuth() : null;
  const isAuthenticated = auth?.isAuthenticated ?? false;
  const authLoading = auth?.isLoading ?? false;

  const [isLoading, setIsLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      // Check new 4-step onboarding first, fall back to legacy
      let completed = await isNewOnboardingComplete();
      if (!completed) {
        completed = await isOnboardingComplete();
      }
      setOnboardingCompleted(completed);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Wait for both local state and auth state
  if (isLoading || authLoading) {
    return (
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        <ActivityIndicator size="large" color={palette.accent} />
      </View>
    );
  }

  // If user is not authenticated, go to login
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  // If onboarding is complete, go to main app
  if (onboardingCompleted) {
    return <Redirect href="/(tabs)" />;
  }

  // Otherwise, go to onboarding
  return <Redirect href="/onboarding" />;
}

// Guest index - no auth hook needed
function GuestIndex() {
  const { palette } = useThemeSafe();
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      // Check new 4-step onboarding first, fall back to legacy
      let completed = await isNewOnboardingComplete();
      if (!completed) {
        completed = await isOnboardingComplete();
      }
      setOnboardingCompleted(completed);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: palette.background }]}>
        <ActivityIndicator size="large" color={palette.accent} />
      </View>
    );
  }

  // If onboarding is complete, go to main app
  if (onboardingCompleted) {
    return <Redirect href="/(tabs)" />;
  }

  // Otherwise, go to onboarding
  return <Redirect href="/onboarding" />;
}

// Main export - decides which component to render
export default function Index() {
  if (isSupabaseConfigured) {
    return <AuthenticatedIndex />;
  }
  return <GuestIndex />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
