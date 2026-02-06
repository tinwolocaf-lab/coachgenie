import type React from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface FastshotAuthUser {
  id?: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
}

export interface FastshotAuthError {
  type?: string;
  message: string;
  originalError?: unknown;
}

export interface FastshotAuthSession {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  user?: FastshotAuthUser;
}

export interface FastshotUseAuthReturn {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: FastshotAuthError | null;
  pendingEmailVerification: boolean;
  pendingPasswordReset: boolean;
  user: FastshotAuthUser | null;
  session: FastshotAuthSession | null;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string
  ) => Promise<{ emailConfirmationRequired?: boolean; email?: string }>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  getSession?: () => Promise<unknown>;
  setSession?: (tokens: { access_token: string; refresh_token: string }) => Promise<unknown>;
  updateUser?: (data: unknown) => Promise<unknown>;
}

export type FastshotUseAuth = () => FastshotUseAuthReturn;

export interface FastshotAuthProviderProps {
  supabaseClient: SupabaseClient;
  routes?: {
    login: string;
    afterLogin: string;
  };
  onSignIn?: (user: FastshotAuthUser) => void;
  onSignOut?: () => void;
  onError?: (error: FastshotAuthError) => void;
  onEmailVerified?: (user: FastshotAuthUser) => void;
  children: React.ReactNode;
}

export interface FastshotAuthCallbackPageProps {
  supabaseClient: SupabaseClient;
  onSuccess: () => void;
  onError: (error: FastshotAuthError) => void;
  loadingText?: string;
}

interface FastshotAuthModule {
  useAuth?: FastshotUseAuth;
  AuthProvider?: React.ComponentType<FastshotAuthProviderProps>;
  AuthCallbackPage?: React.ComponentType<FastshotAuthCallbackPageProps>;
}

type RuntimeRequire = (id: string) => unknown;

function getRuntimeRequire(): RuntimeRequire | null {
  const maybeRequire = (
    globalThis as typeof globalThis & { require?: RuntimeRequire }
  ).require;
  return typeof maybeRequire === 'function' ? maybeRequire : null;
}

function loadFastshotAuthModule(): FastshotAuthModule | null {
  const runtimeRequire = getRuntimeRequire();
  if (!runtimeRequire) return null;

  try {
    return runtimeRequire('@fastshot/auth') as FastshotAuthModule;
  } catch {
    return null;
  }
}

let cachedModule: FastshotAuthModule | null | undefined;

export function getFastshotAuthModule(): FastshotAuthModule | null {
  if (cachedModule !== undefined) return cachedModule;
  cachedModule = loadFastshotAuthModule();
  return cachedModule;
}

export function getFastshotUseAuth(): FastshotUseAuth | null {
  return getFastshotAuthModule()?.useAuth ?? null;
}

export function getFastshotAuthProvider():
  | React.ComponentType<FastshotAuthProviderProps>
  | null {
  return getFastshotAuthModule()?.AuthProvider ?? null;
}

export function getFastshotAuthCallbackPage():
  | React.ComponentType<FastshotAuthCallbackPageProps>
  | null {
  return getFastshotAuthModule()?.AuthCallbackPage ?? null;
}
