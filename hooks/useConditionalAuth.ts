// Conditional Auth Hook wrapper
// Provides auth functionality only when Supabase is configured
import { useState, useEffect, useCallback } from 'react';
import * as Linking from 'expo-linking';
import { type FastshotUseAuthReturn } from '@/lib/fastshot-auth';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

interface AuthState extends Pick<
  FastshotUseAuthReturn,
  'isAuthenticated'
  | 'isLoading'
  | 'error'
  | 'pendingEmailVerification'
  | 'pendingPasswordReset'
  | 'user'
  | 'session'
> {}

interface AuthActions extends Pick<
  FastshotUseAuthReturn,
  | 'signInWithGoogle'
  | 'signInWithApple'
  | 'signInWithEmail'
  | 'signUpWithEmail'
  | 'resetPassword'
  | 'signOut'
  | 'clearError'
> {}

type UseAuthReturn = AuthState & AuthActions;

// Fallback auth state when Supabase is not configured
const defaultAuthState: AuthState = {
  isAuthenticated: false,
  isLoading: false,
  error: null,
  pendingEmailVerification: false,
  pendingPasswordReset: false,
  user: null,
  session: null,
};

// Fallback auth actions
const defaultAuthActions: AuthActions = {
  signInWithGoogle: async () => {},
  signInWithApple: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => ({ emailConfirmationRequired: false }),
  resetPassword: async () => {},
  signOut: async () => {},
  clearError: () => {},
};

export function useConditionalAuth(): UseAuthReturn {
  const [localState, setLocalState] = useState<AuthState>(defaultAuthState);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLocalState(defaultAuthState);
    }
  }, []);

  return {
    ...localState,
    ...defaultAuthActions,
    signInWithEmail: async (_email: string, _password: string) => {
      setLocalState(s => ({ ...s, isLoading: true }));
      // Simulate loading
      await new Promise(r => setTimeout(r, 500));
      setLocalState(s => ({ ...s, isLoading: false }));
    },
    signUpWithEmail: async (email: string, _password: string) => {
      setLocalState(s => ({ ...s, isLoading: true }));
      await new Promise(r => setTimeout(r, 500));
      setLocalState(s => ({ ...s, isLoading: false, pendingEmailVerification: true }));
      return { emailConfirmationRequired: true, email };
    },
    resetPassword: async (_email: string) => {
      setLocalState(s => ({ ...s, isLoading: true }));
      await new Promise(r => setTimeout(r, 500));
      setLocalState(s => ({ ...s, isLoading: false, pendingPasswordReset: true }));
    },
  };
}

function useSupabaseFallbackAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    ...defaultAuthState,
    isLoading: isSupabaseConfigured,
  });

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setState(defaultAuthState);
      return;
    }

    let isMounted = true;

    const applySession = (session: FastshotUseAuthReturn['session']) => {
      if (!isMounted) return;
      setState((prev) => ({
        ...prev,
        isAuthenticated: !!session,
        user: session?.user
          ? {
              id: session.user.id,
              email: session.user.email,
              user_metadata: session.user.user_metadata,
            }
          : null,
        session: session
          ? {
              access_token: session.access_token,
              refresh_token: session.refresh_token,
              expires_at: session.expires_at,
              user: session.user
                ? {
                    id: session.user.id,
                    email: session.user.email,
                    user_metadata: session.user.user_metadata,
                  }
                : undefined,
            }
          : null,
        isLoading: false,
      }));
    };

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return;
      if (error) {
        setState((prev) => ({
          ...prev,
          error: { type: 'UNKNOWN_ERROR', message: error.message },
          isLoading: false,
        }));
        return;
      }
      applySession(data.session as FastshotUseAuthReturn['session']);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session as FastshotUseAuthReturn['session']);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const normalizedEmail = email.trim();
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    const { error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (error) {
      const authError = { type: 'UNKNOWN_ERROR', message: error.message };
      setState((prev) => ({ ...prev, isLoading: false, error: authError }));
      throw authError;
    }
    setState((prev) => ({ ...prev, isLoading: false }));
  }, []);

  const getRedirectTo = useCallback((): string => {
    const explicitWebUrl = process.env.EXPO_PUBLIC_NEWELL_API_URL;
    if (explicitWebUrl) {
      return `${explicitWebUrl.replace(/\/$/, '')}/auth/callback`;
    }
    return Linking.createURL('auth/callback');
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    const normalizedEmail = email.trim();
    setState((prev) => ({ ...prev, isLoading: true, error: null, pendingEmailVerification: false }));
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: { emailRedirectTo: getRedirectTo() },
    });
    if (error) {
      const authError = { type: 'UNKNOWN_ERROR', message: error.message };
      setState((prev) => ({ ...prev, isLoading: false, error: authError }));
      throw authError;
    }

    const emailConfirmationRequired = !data.session;
    setState((prev) => ({
      ...prev,
      isLoading: false,
      pendingEmailVerification: emailConfirmationRequired,
      error: null,
    }));

    return { emailConfirmationRequired, email: normalizedEmail };
  }, [getRedirectTo]);

  const resetPassword = useCallback(async (email: string) => {
    const normalizedEmail = email.trim();
    setState((prev) => ({ ...prev, isLoading: true, error: null, pendingPasswordReset: false }));
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: getRedirectTo(),
    });
    if (error) {
      const authError = { type: 'UNKNOWN_ERROR', message: error.message };
      setState((prev) => ({ ...prev, isLoading: false, error: authError }));
      throw authError;
    }
    setState((prev) => ({ ...prev, isLoading: false, pendingPasswordReset: true, error: null }));
  }, [getRedirectTo]);

  const signOut = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    const { error } = await supabase.auth.signOut();
    if (error) {
      const authError = { type: 'UNKNOWN_ERROR', message: error.message };
      setState((prev) => ({ ...prev, isLoading: false, error: authError }));
      throw authError;
    }
    setState({
      ...defaultAuthState,
      isLoading: false,
    });
  }, []);

  const signInWithOAuth = useCallback(async (provider: 'google' | 'apple') => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: getRedirectTo() },
    });
    if (error) {
      const authError = { type: 'UNKNOWN_ERROR', message: error.message };
      setState((prev) => ({ ...prev, isLoading: false, error: authError }));
      throw authError;
    }
    if (data?.url) {
      await Linking.openURL(data.url);
    }
    setState((prev) => ({ ...prev, isLoading: false }));
  }, [getRedirectTo]);

  return {
    ...state,
    signInWithGoogle: async () => signInWithOAuth('google'),
    signInWithApple: async () => signInWithOAuth('apple'),
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
    signOut,
    clearError,
  };
}

export function useAuthSafe() {
  const conditionalAuth = useConditionalAuth();
  const supabaseFallbackAuth = useSupabaseFallbackAuth();

  if (!isSupabaseConfigured) return conditionalAuth;
  // Always use direct Supabase-backed auth in app screens.
  // This avoids silent no-op behavior when provider context is unstable.
  return supabaseFallbackAuth;
}
