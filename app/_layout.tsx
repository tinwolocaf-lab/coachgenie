import { useEffect, useState, useCallback } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Linking from 'expo-linking';
import { isOnboardingComplete } from '@/store/onboarding';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { ThemeProvider, useThemeSafe } from '@/contexts/ThemeContext';
import { FocusModeProvider } from '@/contexts/FocusModeContext';
import { usePremiumFonts } from '@/hooks/usePremiumFonts';
import { initRevenueCat, identifyUser, logOutUser } from '@/lib/revenuecat';
import { AuthProvider } from '@/lib/auth';
import { GlobalErrorBoundary } from '@/components/system/GlobalErrorBoundary';

/**
 * Parse authentication tokens from URL hash fragment
 * Handles URLs like: http://localhost:3000/#access_token=...&refresh_token=...&type=signup
 */
function parseAuthTokensFromUrl(url: string): {
  accessToken?: string;
  refreshToken?: string;
  type?: string;
  expiresIn?: number;
  tokenType?: string;
} | null {
  try {
    // Check if URL has hash fragment
    const hashIndex = url.indexOf('#');
    if (hashIndex === -1) return null;

    const hashFragment = url.substring(hashIndex + 1);
    const params = new URLSearchParams(hashFragment);

    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const type = params.get('type');
    const expiresIn = params.get('expires_in');
    const tokenType = params.get('token_type');

    if (!accessToken || !refreshToken) return null;

    return {
      accessToken,
      refreshToken,
      type: type || undefined,
      expiresIn: expiresIn ? parseInt(expiresIn, 10) : undefined,
      tokenType: tokenType || undefined,
    };
  } catch (error) {
    console.error('Error parsing auth tokens from URL:', error);
    return null;
  }
}

/**
 * Handle incoming deep link URLs for authentication
 */
function useDeepLinkHandler() {
  const router = useRouter();
  const [isProcessingDeepLink, setIsProcessingDeepLink] = useState(false);

  const handleDeepLink = useCallback(async (url: string) => {
    if (!url || !isSupabaseConfigured) return;

    console.log('[DeepLink] Received URL:', url);

    // Check if this is an integrations callback
    if (url.includes('integrations/callback')) {
      console.log('[DeepLink] Integration callback detected');
      const urlObj = new URL(url);
      const code = urlObj.searchParams.get('code');
      const provider = urlObj.searchParams.get('state') || urlObj.searchParams.get('provider');
      const error = urlObj.searchParams.get('error');
      if (error) {
        router.replace(`/integrations/callback?error=${encodeURIComponent(error)}`);
      } else if (code) {
        router.replace(`/integrations/callback?code=${encodeURIComponent(code)}${provider ? `&provider=${provider}` : ''}`);
      }
      return;
    }

    // Check if this is an auth callback with tokens in hash
    const tokens = parseAuthTokensFromUrl(url);

    if (tokens) {
      console.log('[DeepLink] Found auth tokens, type:', tokens.type);
      setIsProcessingDeepLink(true);

      try {
        // Set the session using the tokens from the URL
        const { data, error } = await supabase.auth.setSession({
          access_token: tokens.accessToken!,
          refresh_token: tokens.refreshToken!,
        });

        if (error) {
          console.error('[DeepLink] Error setting session:', error.message);
          router.replace(`/(auth)/login?error=${encodeURIComponent(error.message)}`);
        } else if (data.session) {
          console.log('[DeepLink] Session established for:', data.session.user?.email);

          // Determine navigation based on auth type
          if (tokens.type === 'signup' || tokens.type === 'email_change') {
            // Email verified - show success screen
            router.replace('/auth/verified');
          } else if (tokens.type === 'recovery') {
            // Password reset - could add a password update screen
            router.replace('/(tabs)');
          } else {
            // Regular sign-in
            router.replace('/(tabs)');
          }
        }
      } catch (error) {
        console.error('[DeepLink] Error processing auth callback:', error);
        router.replace('/(auth)/login?error=Authentication%20failed');
      } finally {
        setIsProcessingDeepLink(false);
      }
    }
  }, [router]);

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
      await isOnboardingComplete();
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
    <GestureHandlerRootView style={{ flex: 1 }}>
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
          console.log('[Auth] User signed in:', user.email);
          if (user.email) {
            await identifyUser(user.id);
          }
        }}
        onSignOut={async () => {
          console.log('[Auth] User signed out');
          await logOutUser();
        }}
        onError={(error) => {
          console.log('[Auth] Error:', error.type, error.message);
        }}
        onEmailVerified={(user) => {
          console.log('[Auth] Email verified for:', user.email);
        }}
      >
        {guardedContent}
      </AuthProvider>
    );
  }

  return guardedContent;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
