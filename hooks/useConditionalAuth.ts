// Conditional Auth Hook wrapper
// Provides auth functionality only when Supabase is configured
// Now uses native Supabase auth from @/lib/auth instead of @fastshot/auth
import { useState, useCallback } from 'react';
import { isSupabaseConfigured } from '@/lib/supabase';

// Re-export types from our native auth module
export type { UseAuthReturn, AuthState, AuthActions, AuthError } from '@/lib/auth';

// Import the real hook
let realUseAuth: (() => import('@/lib/auth').UseAuthReturn) | null = null;

if (isSupabaseConfigured) {
  try {
    // Use our native Supabase auth module
    const authModule = require('@/lib/auth');
    realUseAuth = authModule.useAuth;
  } catch {
    realUseAuth = null;
  }
}

interface FallbackAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: { type: string; message: string } | null;
  pendingEmailVerification: boolean;
  pendingPasswordReset: boolean;
  user: null;
  session: null;
}

// Fallback auth state when Supabase is not configured
const defaultAuthState: FallbackAuthState = {
  isAuthenticated: false,
  isLoading: false,
  error: null,
  pendingEmailVerification: false,
  pendingPasswordReset: false,
  user: null,
  session: null,
};

/**
 * Primary conditional auth hook.
 * Returns real auth state when Supabase is configured,
 * or fallback no-op state for guest mode.
 */
export function useConditionalAuth() {
  const [localState, setLocalState] = useState(defaultAuthState);

  // If real auth is available and Supabase is configured, use it
  if (realUseAuth && isSupabaseConfigured) {
    try {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      return realUseAuth();
    } catch {
      // Fall through to fallback
    }
  }

  // Fallback actions for guest mode
  return {
    ...localState,
    signInWithGoogle: async () => {},
    signInWithApple: async () => {},
    signInWithEmail: async (_email: string, _password: string) => {
      setLocalState(s => ({ ...s, isLoading: true }));
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
    signOut: async () => {},
    clearError: () => {},
  };
}

/**
 * Safe auth hook that tries real auth first, falls back to conditional.
 * This is the preferred hook for most screens.
 */
export function useAuthSafe() {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useConditionalAuth();
}
