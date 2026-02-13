import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type AuthCallbackSource = 'pkce' | 'implicit';

export interface CompleteAuthSessionResult {
  handled: boolean;
  session: Session | null;
  source: AuthCallbackSource | null;
  type?: string;
  errorMessage?: string;
}

function getSearchParams(url: string): URLSearchParams {
  try {
    const parsed = new URL(url);
    return parsed.searchParams;
  } catch {
    const queryIndex = url.indexOf('?');
    if (queryIndex === -1) {
      return new URLSearchParams();
    }

    const hashIndex = url.indexOf('#', queryIndex);
    const query = hashIndex >= 0
      ? url.slice(queryIndex + 1, hashIndex)
      : url.slice(queryIndex + 1);
    return new URLSearchParams(query);
  }
}

function getHashParams(url: string): URLSearchParams {
  const hashIndex = url.indexOf('#');
  if (hashIndex === -1) {
    return new URLSearchParams();
  }
  return new URLSearchParams(url.slice(hashIndex + 1));
}

function getAuthType(url: string): string | undefined {
  const searchParams = getSearchParams(url);
  const hashParams = getHashParams(url);
  return searchParams.get('type') ?? hashParams.get('type') ?? undefined;
}

export function extractAuthErrorFromUrl(url: string): string | null {
  const searchParams = getSearchParams(url);
  const hashParams = getHashParams(url);

  const errorDescription = searchParams.get('error_description')
    ?? hashParams.get('error_description');
  const error = searchParams.get('error') ?? hashParams.get('error');

  if (!error && !errorDescription) {
    return null;
  }

  return errorDescription ?? error ?? 'Authentication failed';
}

export async function completeAuthSessionFromUrl(url: string): Promise<CompleteAuthSessionResult> {
  const searchParams = getSearchParams(url);
  const hashParams = getHashParams(url);
  const type = getAuthType(url);

  const accessToken = hashParams.get('access_token') ?? searchParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token') ?? searchParams.get('refresh_token');
  const code = searchParams.get('code');

  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      return {
        handled: true,
        session: null,
        source: 'implicit',
        type,
        errorMessage: error.message,
      };
    }

    return {
      handled: true,
      session: data.session,
      source: 'implicit',
      type,
    };
  }

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return {
        handled: true,
        session: null,
        source: 'pkce',
        type,
        errorMessage: error.message,
      };
    }

    return {
      handled: true,
      session: data.session,
      source: 'pkce',
      type,
    };
  }

  return {
    handled: false,
    session: null,
    source: null,
    type,
  };
}
