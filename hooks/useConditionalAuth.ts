// Conditional Auth Hook wrapper
// Provides auth functionality only when Supabase is configured
import { useState, useEffect } from 'react';
import { getFastshotUseAuth, type FastshotUseAuthReturn } from '@/lib/fastshot-auth';
import { isSupabaseConfigured } from '@/lib/supabase';

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

let cachedUseAuth: (() => UseAuthReturn) | null = null;

function getUseAuth(): (() => UseAuthReturn) | null {
  if (cachedUseAuth !== null) return cachedUseAuth;

  if (isSupabaseConfigured) {
    const useAuth = getFastshotUseAuth();
    if (!useAuth) return null;

    cachedUseAuth = useAuth as () => UseAuthReturn;
    return cachedUseAuth;
  }
  return null;
}

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

const resolvedUseAuthHook = getUseAuth();
const useAuthSafeImpl: () => UseAuthReturn =
  isSupabaseConfigured && resolvedUseAuthHook
    ? resolvedUseAuthHook
    : useConditionalAuth;

export function useAuthSafe() {
  return useAuthSafeImpl();
}
