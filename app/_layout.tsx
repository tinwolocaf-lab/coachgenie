import { useEffect, useState, useCallback } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';
import {
  isNewOnboardingComplete,
  migrateLegacyOnboardingCompletionIfNeeded,
} from '@/lib/onboarding';
import { isGuestModeEnabled, isSupabaseConfigured } from '@/lib/supabase';
import { ThemeProvider, useThemeSafe } from '@/contexts/ThemeContext';
import { FocusModeProvider } from '@/contexts/FocusModeContext';
import { usePremiumFonts } from '@/hooks/usePremiumFonts';
import { initRevenueCat, identifyUser, logOutUser } from '@/lib/revenuecat';
import { AuthProvider } from '@/lib/auth';
import { GlobalErrorBoundary } from '@/components/system/GlobalErrorBoundary';

function debugLog(...args: unknown[]): void {
  if (__DEV__) {
    console.log(...args);
  }
}

/**
 * Known app routes that can be navigated to via deep links.
 * Maps deep link path segments to actual router paths.
 */
const DEEP_LINK_ROUTES = {
  oracle: '/oracle',
  sanctuary: '/(tabs)/coaches',
  archive: '/archive',
  rituals: '/rituals',
  account: '/account',
  paywall: '/paywall',
  integrations: '/integrations',
  'insights-dashboard': '/insights-dashboard',
} as const;

/**
 * Handle incoming deep link URLs for authentication and navigation
 */
function useDeepLinkHandler() {
  const router = useRouter();
  const isProcessingDeepLink = false;

  /**
   * Reset the navigation stack by dismissing all modals and returning to tabs.
   * This prevents screens from stacking on top of each other when
   * navigating via deep links.
   */
  const resetNavigationStack = useCallback(() => {
    try {
      // Dismiss all presented modals first
      while (router.canDismiss()) {
        router.dismiss();
      }
    } catch {
      // Silently handle if dismiss fails (e.g., no modals to dismiss)
    }
  }, [router]);

  const handleDeepLink = useCallback(async (url: string) => {
    if (!url) return;

    debugLog('[DeepLink] Received URL:', url);

    // Check if this is an integrations callback
    if (url.includes('integrations/callback')) {
      if (!isSupabaseConfigured) return;
      debugLog('[DeepLink] Integration callback detected');
      const urlObj = new URL(url);
      const code = urlObj.searchParams.get('code');
      const provider = urlObj.searchParams.get('state') || urlObj.searchParams.get('provider');
      const error = urlObj.searchParams.get('error');
      resetNavigationStack();
      if (error) {
        router.replace(`/integrations/callback?error=${encodeURIComponent(error)}`);
      } else if (code) {
        router.replace(`/integrations/callback?code=${encodeURIComponent(code)}${provider ? `&provider=${provider}` : ''}`);
      }
      return;
    }

    // Handle general navigation deep links (e.g., coachgenie://oracle, coachgenie://chat/coach-id)
    try {
      const parsed = Linking.parse(url);
      const path = parsed.path;
      if (!path) return;

      debugLog('[DeepLink] Navigation deep link, path:', path);

      if (!isSupabaseConfigured && !isGuestModeEnabled) {
        debugLog('[DeepLink] Auth misconfigured, routing to login');
        router.replace('/(auth)/login?error=Authentication%20is%20not%20configured.%20Please%20contact%20support.');
        return;
      }

      // OAuth callback routes are handled in lib/auth.tsx and app/auth/callback.tsx.
      if (path === 'auth/callback' || path === 'auth/verified') {
        debugLog('[DeepLink] Auth route detected, deferring to auth callback handling');
        return;
      }

      // Reset the modal/screen stack before navigating
      resetNavigationStack();

      // Handle chat deep links: coachgenie://chat/{coachId}
      if (path.startsWith('chat/')) {
        const coachId = path.replace('chat/', '');
        if (coachId) {
          router.replace('/(tabs)');
          // Small delay to let tabs mount before pushing modal
          setTimeout(() => {
            router.push(`/chat/${coachId}`);
          }, 100);
          return;
        }
      }

      // Handle coach detail deep links: coachgenie://coach/{id}
      if (path.startsWith('coach/')) {
        const coachId = path.replace('coach/', '');
        if (coachId) {
          router.replace('/(tabs)');
          setTimeout(() => {
            router.push(`/coach/${coachId}`);
          }, 100);
          return;
        }
      }

      // Handle known static routes
      const routePath = DEEP_LINK_ROUTES[path as keyof typeof DEEP_LINK_ROUTES];
      if (routePath) {
        router.replace('/(tabs)');
        setTimeout(() => {
          router.push(routePath);
        }, 100);
        return;
      }

      // Handle tab deep links directly
      if (path === 'home' || path === '') {
        router.replace('/(tabs)');
        return;
      }
      if (path === 'coaches' || path === 'plan' || path === 'vault') {
        const tabRoute =
          path === 'coaches' ? '/(tabs)/coaches' : path === 'plan' ? '/(tabs)/plan' : '/(tabs)/vault';
        router.replace(tabRoute);
        return;
      }

      debugLog('[DeepLink] Unknown path, ignoring:', path);
    } catch (error) {
      debugLog('[DeepLink] Error parsing navigation deep link:', error);
    }
  }, [router, resetNavigationStack]);

  useEffect(() => {
    // Handle URL when app is already open
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    // Handle URL when app is launched from deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [handleDeepLink]);

  return { isProcessingDeepLink };
}

function ThemedAppContent() {
  const [isLoading, setIsLoading] = useState(true);
  const { isProcessingDeepLink } = useDeepLinkHandler();
  const { palette } = useThemeSafe();
  const { fontsLoaded } = usePremiumFonts();

  useEffect(() => {
    initRevenueCat();
    checkOnboarding();
  }, []);

  const checkOnboarding = async () => {
    try {
      await migrateLegacyOnboardingCompletionIfNeeded();
      await isNewOnboardingComplete();
    } catch (error) {
      console.error('Error checking onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || isProcessingDeepLink || !fontsLoaded) {
    return (
      <View style={[styles.loading, { backgroundColor: palette.background }]}>
        <ActivityIndicator size="large" color={palette.accent} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: palette.background },
        animation: 'fade',
        animationDuration: 400,
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
          animation: 'fade',
          animationDuration: 500,
        }}
      />
      <Stack.Screen
        name="onboarding"
        options={{
          animation: 'fade',
          animationDuration: 500,
        }}
      />
      <Stack.Screen
        name="(tabs)"
        options={{
          animation: 'fade',
          animationDuration: 400,
        }}
      />
      <Stack.Screen
        name="chat/[coachId]"
        options={{
          animation: 'fade_from_bottom',
          animationDuration: 500,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="coach/[id]"
        options={{
          animation: 'fade',
          animationDuration: 400,
        }}
      />
      <Stack.Screen
        name="auth/callback"
        options={{
          animation: 'none',
        }}
      />
      <Stack.Screen
        name="auth/verified"
        options={{
          animation: 'fade',
          animationDuration: 500,
        }}
      />
      <Stack.Screen
        name="account"
        options={{
          animation: 'fade',
          animationDuration: 400,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="sanctuary"
        options={{
          animation: 'fade',
          animationDuration: 600,
          presentation: 'fullScreenModal',
          gestureEnabled: true,
          gestureDirection: 'vertical',
        }}
      />
      <Stack.Screen
        name="archive"
        options={{
          animation: 'fade',
          animationDuration: 400,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="rituals"
        options={{
          animation: 'fade',
          animationDuration: 400,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="oracle/index"
        options={{
          animation: 'fade',
          animationDuration: 600,
          presentation: 'fullScreenModal',
          gestureEnabled: true,
          gestureDirection: 'vertical',
        }}
      />
      <Stack.Screen
        name="paywall"
        options={{
          animation: 'fade_from_bottom',
          animationDuration: 500,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="integrations"
        options={{
          animation: 'fade',
          animationDuration: 400,
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="coach/create"
        options={{
          animation: 'fade_from_bottom',
          animationDuration: 500,
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="insights-dashboard"
        options={{
          animation: 'fade',
          animationDuration: 400,
          presentation: 'card',
        }}
      />
    </Stack>
  );
}

function AppContent() {
  return (
    <ThemeProvider>
      <FocusModeProvider>
        <ThemedAppContentWithStatusBar />
      </FocusModeProvider>
    </ThemeProvider>
  );
}

function ThemedAppContentWithStatusBar() {
  const { palette } = useThemeSafe();
  return (
    <>
      <StatusBar style={palette.statusBarStyle === 'light' ? 'light' : 'dark'} />
      <ThemedAppContent />
    </>
  );
}

export default function RootLayout() {
  const content = (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );

  const guardedContent = (
    <GlobalErrorBoundary>
      {content}
    </GlobalErrorBoundary>
  );

  if (isSupabaseConfigured) {
    return (
      <AuthProvider
        routes={{
          login: '/(auth)/login',
          afterLogin: '/(tabs)',
        }}
        onSignIn={async (user) => {
          debugLog('[Auth] User signed in:', user.email);
          if (user.email) {
            await identifyUser(user.id);
          }
        }}
        onSignOut={async () => {
          debugLog('[Auth] User signed out');
          await logOutUser();
        }}
        onError={(error) => {
          debugLog('[Auth] Error:', error.type, error.message);
        }}
        onEmailVerified={(user) => {
          debugLog('[Auth] Email verified for:', user.email);
        }}
      >
        {guardedContent}
      </AuthProvider>
    );
  }

  return guardedContent;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
