import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { useAuthSafe } from '@/hooks/useConditionalAuth';
import {
  isNewOnboardingComplete,
  migrateLegacyOnboardingCompletionIfNeeded,
} from '@/lib/onboarding';
import { isSupabaseConfigured } from '@/lib/supabase';

function useOnboardingStatus() {
  const [isLoading, setIsLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkStatus = async () => {
      try {
        await migrateLegacyOnboardingCompletionIfNeeded();
        const completed = await isNewOnboardingComplete();
        if (mounted) {
          setOnboardingCompleted(completed);
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void checkStatus();

    return () => {
      mounted = false;
    };
  }, []);

  return { isLoading, onboardingCompleted };
}

function LoadingScreen() {
  const { palette } = useThemeSafe();

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      <ActivityIndicator size="large" color={palette.accent} />
    </View>
  );
}

function AuthenticatedIndex() {
  const auth = useAuthSafe();
  const { isLoading, onboardingCompleted } = useOnboardingStatus();

  if (isLoading || auth.isLoading) {
    return <LoadingScreen />;
  }

  if (!auth.isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (onboardingCompleted) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/onboarding" />;
}

function GuestIndex() {
  const { isLoading, onboardingCompleted } = useOnboardingStatus();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (onboardingCompleted) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/onboarding" />;
}

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
