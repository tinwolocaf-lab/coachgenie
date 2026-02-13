/**
 * Native Supabase Auth Provider
 * Replaces @fastshot/auth with direct Supabase auth integration.
 * Provides: AuthProvider, useAuth hook, route protection, OAuth flows.
 */
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { useRouter, useSegments } from 'expo-router';
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { completeAuthSessionFromUrl, extractAuthErrorFromUrl } from '@/lib/auth-callback';

// Complete the auth session when the browser redirects back (required for web, no-op on native)
WebBrowser.maybeCompleteAuthSession();

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: AuthError | null;
  pendingEmailVerification: boolean;
  pendingPasswordReset: boolean;
}

export interface AuthActions {
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<SignUpResult>;
  resetPassword: (email: string) => Promise<PasswordResetResult>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export type UseAuthReturn = AuthState & AuthActions;

export interface AuthError {
  type: AuthErrorType;
  message: string;
}

export type AuthErrorType =
  | 'INVALID_CREDENTIALS'
  | 'SIGNUP_FAILED'
  | 'OAUTH_FAILED'
  | 'BROWSER_DISMISSED'
  | 'SESSION_EXPIRED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

export interface SignUpResult {
  emailConfirmationRequired: boolean;
  email: string;
}

export interface PasswordResetResult {
  emailSent: boolean;
  email: string;
}

export interface AuthProviderProps {
  children: React.ReactNode;
  routes?: {
    login: string;
    afterLogin: string;
  };
  onSignIn?: (user: User) => void | Promise<void>;
  onSignOut?: () => void | Promise<void>;
  onError?: (error: AuthError) => void;
  onEmailVerified?: (user: User) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const AuthContext = createContext<UseAuthReturn | null>(null);

// ─── Helper: build redirect URL ─────────────────────────────────────────────

const NATIVE_AUTH_REDIRECT_URI = 'coachgenie://auth/callback';

function isLoopbackHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const isHttp = parsed.protocol === 'http:' || parsed.protocol === 'https:';
    const host = parsed.hostname.toLowerCase();
    return isHttp && (host === 'localhost' || host === '127.0.0.1' || host === '::1');
  } catch {
    return false;
  }
}

function getRedirectUrl(): string {
  const explicitRedirect = process.env.EXPO_PUBLIC_AUTH_REDIRECT_URI?.trim();

  if (Platform.OS === 'web') {
    return explicitRedirect || Linking.createURL('auth/callback');
  }

  if (explicitRedirect) {
    if (isLoopbackHttpUrl(explicitRedirect)) {
      console.warn(
        '[Auth] EXPO_PUBLIC_AUTH_REDIRECT_URI points to localhost on native. Falling back to coachgenie://auth/callback.'
      );
      return NATIVE_AUTH_REDIRECT_URI;
    }
    return explicitRedirect;
  }

  return NATIVE_AUTH_REDIRECT_URI;
}

// ─── Helper: create AuthError ───────────────────────────────────────────────

function createAuthError(type: AuthErrorType, message: string): AuthError {
  return { type, message };
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === 'object') {
    const maybeMessage = (error as Record<string, unknown>).message;
    if (typeof maybeMessage === 'string' && maybeMessage.length > 0) {
      return maybeMessage;
    }
  }

  return fallback;
}

function isAuthTaggedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  return (error as Record<string, unknown>).__isAuthError === true;
}

function isBrowserDismissedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  return (error as Record<string, unknown>).type === 'BROWSER_DISMISSED';
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({
  children,
  routes,
  onSignIn,
  onSignOut,
  onError,
  onEmailVerified,
}: AuthProviderProps) {
  const router = useRouter();
  const segments = useSegments();

  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const [pendingEmailVerification, setPendingEmailVerification] = useState(false);
  const [pendingPasswordReset, setPendingPasswordReset] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const prevAuthState = useRef<boolean | undefined>(undefined);
  const replaceRoute = useCallback((path: string) => {
    router.replace(path as never);
  }, [router]);

  // ── Auto-refresh on app state changes ──
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });
    return () => subscription.remove();
  }, []);

  // ── Initialize session ──
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
        if (!mounted) return;

        if (sessionError) {
          console.warn('[Auth] Error getting session:', sessionError.message);
        }

        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      } catch (err) {
        console.error('[Auth] Init error:', err);
      } finally {
        if (mounted) {
          setIsLoading(false);
          setIsInitialized(true);
        }
      }
    }

    init();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, newSession: Session | null) => {
        if (!mounted) return;

        console.log('[Auth] State changed:', event);
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (event === 'SIGNED_IN' && newSession?.user) {
          try {
            await onSignIn?.(newSession.user);
          } catch (err) {
            console.error('[Auth] onSignIn callback error:', err);
          }
        }

        if (event === 'SIGNED_OUT') {
          try {
            await onSignOut?.();
          } catch (err) {
            console.error('[Auth] onSignOut callback error:', err);
          }
        }

        if (event === 'USER_UPDATED' && newSession?.user?.email_confirmed_at) {
          onEmailVerified?.(newSession.user);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [onEmailVerified, onSignIn, onSignOut]);

  // ── Route protection ──
  useEffect(() => {
    if (!isInitialized || !routes) return;

    const isAuthenticated = !!session;
    const inAuthGroup = segments[0] === '(auth)';
    const inAuthUtilityScreen =
      segments[0] === 'auth' && (segments[1] === 'callback' || segments[1] === 'verified');
    const inAuthRoute = inAuthGroup || inAuthUtilityScreen;
    const inOnboarding = segments[0] === 'onboarding';

    // Don't redirect during onboarding or auth callback/verified completion screens.
    if (inOnboarding || inAuthUtilityScreen) return;

    // Prevent redirect flicker — only redirect when auth state actually changes
    // Use undefined check so the first render always fires
    if (prevAuthState.current !== undefined && prevAuthState.current === isAuthenticated) return;
    prevAuthState.current = isAuthenticated;

    if (!isAuthenticated && !inAuthRoute) {
      // Not logged in and not on auth page → send to login
      replaceRoute(routes.login);
    } else if (isAuthenticated && inAuthGroup) {
      // Logged in but on auth page → send to main app
      replaceRoute(routes.afterLogin);
    }
  }, [session, segments, isInitialized, routes, replaceRoute]);

  // ── Auth methods ──

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        const authErr = createAuthError('INVALID_CREDENTIALS', signInError.message);
        setError(authErr);
        onError?.(authErr);
        throw signInError;
      }
    } catch (err: unknown) {
      if (!isAuthTaggedError(err)) {
        const authErr = createAuthError('NETWORK_ERROR', getErrorMessage(err, 'Sign-in failed'));
        setError(authErr);
        onError?.(authErr);
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  const signUpWithEmail = useCallback(async (email: string, password: string): Promise<SignUpResult> => {
    setIsLoading(true);
    setError(null);
    try {
      const redirectTo = getRedirectUrl();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectTo },
      });

      if (signUpError) {
        const authErr = createAuthError('SIGNUP_FAILED', signUpError.message);
        setError(authErr);
        onError?.(authErr);
        throw signUpError;
      }

      // If user exists but email not confirmed, Supabase returns the user but no session
      const needsConfirmation = !data.session && !!data.user;
      if (needsConfirmation) {
        setPendingEmailVerification(true);
      }

      return {
        emailConfirmationRequired: needsConfirmation,
        email,
      };
    } catch (err: unknown) {
      if (!isAuthTaggedError(err)) {
        const authErr = createAuthError('NETWORK_ERROR', getErrorMessage(err, 'Sign-up failed'));
        setError(authErr);
        onError?.(authErr);
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  const handleOAuthCallback = useCallback(async (url: string) => {
    try {
      const callbackError = extractAuthErrorFromUrl(url);
      if (callbackError) {
        const authErr = createAuthError('OAUTH_FAILED', callbackError);
        setError(authErr);
        onError?.(authErr);
        return;
      }

      const completion = await completeAuthSessionFromUrl(url);

      if (!completion.handled) {
        const authErr = createAuthError(
          'OAUTH_FAILED',
          'Could not complete sign-in because callback parameters were missing.'
        );
        setError(authErr);
        onError?.(authErr);
        return;
      }

      if (completion.errorMessage || !completion.session) {
        const authErr = createAuthError(
          'OAUTH_FAILED',
          completion.errorMessage ?? 'Unable to establish an authenticated session.'
        );
        setError(authErr);
        onError?.(authErr);
      }
    } catch (err: unknown) {
      console.error('[Auth] OAuth callback error:', err);
      const authErr = createAuthError('OAUTH_FAILED', getErrorMessage(err, 'Failed to complete sign-in'));
      setError(authErr);
      onError?.(authErr);
    }
  }, [onError]);

  const signInWithGoogle = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const redirectTo = getRedirectUrl();
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true, // We handle browser ourselves on native
        },
      });

      if (oauthError) {
        const authErr = createAuthError('OAUTH_FAILED', oauthError.message);
        setError(authErr);
        onError?.(authErr);
        throw oauthError;
      }

      if (data?.url) {
        // Open the OAuth URL in the system browser
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectTo,
          { showInRecents: true }
        );

        if (result.type === 'cancel' || result.type === 'dismiss') {
          setIsLoading(false);
          // Don't show error for user cancellation
          return;
        }

        if (result.type === 'success' && result.url) {
          // Parse tokens from the callback URL
          await handleOAuthCallback(result.url);
        }
      }
    } catch (err: unknown) {
      if (!isBrowserDismissedError(err)) {
        const authErr = createAuthError('OAUTH_FAILED', getErrorMessage(err, 'Google sign-in failed'));
        setError(authErr);
        onError?.(authErr);
      }
    } finally {
      setIsLoading(false);
    }
  }, [onError, handleOAuthCallback]);

  const signInWithApple = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const redirectTo = getRedirectUrl();
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (oauthError) {
        const authErr = createAuthError('OAUTH_FAILED', oauthError.message);
        setError(authErr);
        onError?.(authErr);
        throw oauthError;
      }

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectTo,
          { showInRecents: true }
        );

        if (result.type === 'cancel' || result.type === 'dismiss') {
          setIsLoading(false);
          return;
        }

        if (result.type === 'success' && result.url) {
          await handleOAuthCallback(result.url);
        }
      }
    } catch (err: unknown) {
      if (!isBrowserDismissedError(err)) {
        const authErr = createAuthError('OAUTH_FAILED', getErrorMessage(err, 'Apple sign-in failed'));
        setError(authErr);
        onError?.(authErr);
      }
    } finally {
      setIsLoading(false);
    }
  }, [onError, handleOAuthCallback]);

  const resetPassword = useCallback(async (email: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const redirectTo = getRedirectUrl();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (resetError) {
        const authErr = createAuthError('UNKNOWN_ERROR', resetError.message);
        setError(authErr);
        onError?.(authErr);
        throw resetError;
      }

      setPendingPasswordReset(true);
      return { emailSent: true, email };
    } catch (err: unknown) {
      if (!isAuthTaggedError(err)) {
        const authErr = createAuthError('NETWORK_ERROR', getErrorMessage(err, 'Password reset failed'));
        setError(authErr);
        onError?.(authErr);
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [onError]);

  const handleSignOut = useCallback(async () => {
    setIsLoading(true);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        console.error('[Auth] Sign out error:', signOutError);
      }
    } catch (err) {
      console.error('[Auth] Sign out error:', err);
    } finally {
      setIsLoading(false);
      setPendingEmailVerification(false);
      setPendingPasswordReset(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ── Context value ──

  const value: UseAuthReturn = {
    session,
    user,
    isLoading,
    isAuthenticated: !!session,
    error,
    pendingEmailVerification,
    pendingPasswordReset,
    signInWithGoogle,
    signInWithApple,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    signOut: handleSignOut,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useAuth(): UseAuthReturn {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
