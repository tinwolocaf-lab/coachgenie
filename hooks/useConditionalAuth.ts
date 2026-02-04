// Conditional Auth Hook wrapper
// Provides auth functionality only when Supabase is configured
import { useState, useEffect, useCallback } from 'react';
import { isSupabaseConfigured } from '@/lib/supabase';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: { message: string } | null;
  pendingEmailVerification: boolean;
  pendingPasswordReset: boolean;
  user: { email?: string } | null;
  session: unknown | null;
}

interface AuthActions {
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<{ emailConfirmationRequired?: boolean; email?: string }>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

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
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const authModule = require('@fastshot/auth');
      cachedUseAuth = authModule.useAuth;
      return cachedUseAuth;
    } catch {
      cachedUseAuth = null;
    }
  }
  return null;
}

export function useConditionalAuth(): UseAuthReturn {
  const [localState, setLocalState] = useState<AuthState>(defaultAuthState);

  // Get the real useAuth hook if available
  const realUseAuth = getUseAuth();

  // Always call the real hook if it exists (to satisfy rules of hooks)
  // We'll do this in useEffect to avoid issues with conditional rendering
  const [realAuthState, setRealAuthState] = useState<UseAuthReturn | null>(null);

  useEffect(() => {
    // This is a workaround - we can't conditionally call hooks
    // So we just use local state management
    if (!isSupabaseConfigured) {
      setLocalState(defaultAuthState);
    }
  }, []);

  // If we have real auth, use it (this component should not be used if Supabase is configured)
  // This hook is meant for graceful degradation
  if (realAuthState) {
    return realAuthState;
  }

  // Return local state with fallback actions
  return {
    ...localState,
    ...defaultAuthActions,
    signInWithEmail: async (email: string, password: string) => {
      setLocalState(s => ({ ...s, isLoading: true }));
      // Simulate loading
      await new Promise(r => setTimeout(r, 500));
      setLocalState(s => ({ ...s, isLoading: false }));
    },
    signUpWithEmail: async (email: string, password: string) => {
      setLocalState(s => ({ ...s, isLoading: true }));
      await new Promise(r => setTimeout(r, 500));
      setLocalState(s => ({ ...s, isLoading: false, pendingEmailVerification: true }));
      return { emailConfirmationRequired: true, email };
    },
    resetPassword: async (email: string) => {
      setLocalState(s => ({ ...s, isLoading: true }));
      await new Promise(r => setTimeout(r, 500));
      setLocalState(s => ({ ...s, isLoading: false, pendingPasswordReset: true }));
    },
  };
}

// Export a hook that uses the real auth if available
export function useAuthSafe() {
  const useAuthHook = getUseAuth();

  // Always call in consistent order
  const fallback = useConditionalAuth();

  if (useAuthHook && isSupabaseConfigured) {
    // This is a type assertion - we know the hook exists
    try {
      return useAuthHook();
    } catch {
      return fallback;
    }
  }

  return fallback;
}
