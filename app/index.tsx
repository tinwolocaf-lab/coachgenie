import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { Colors } from '@/constants/theme';
import { isOnboardingComplete } from '@/store/onboarding';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuthSafe } from '@/hooks/useConditionalAuth';

// Authenticated index - uses useAuth hook
function AuthenticatedIndex() {
  const auth = useAuthSafe();
  const isAuthenticated = auth?.isAuthenticated ?? false;
  const authLoading = auth?.isLoading ?? false;

  const [isLoading, setIsLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const completed = await isOnboardingComplete();
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
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.electricIndigo} />
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
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const completed = await isOnboardingComplete();
      setOnboardingCompleted(completed);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.electricIndigo} />
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
    backgroundColor: Colors.offWhite,
  },
});
