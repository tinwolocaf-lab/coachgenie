import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IntegrationProvider } from '@/types';
import { supabase } from '@/lib/supabase';
import { exchangeToken, disconnectIntegration as apiDisconnect } from './api';

interface OAuthConfig {
  clientId: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
}

type IntegrationStatus = 'active' | 'expired' | 'revoked' | 'error';

function isIntegrationStatus(value: string): value is IntegrationStatus {
  return value === 'active' || value === 'expired' || value === 'revoked' || value === 'error';
}

const REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: 'coachgenie',
  path: 'integrations/callback',
});

const OAUTH_PENDING_FLOW_KEY = 'coachgenie_oauth_pending_flow';
const OAUTH_PENDING_TTL_MS = 10 * 60 * 1000;

interface PendingOAuthFlow {
  provider: IntegrationProvider;
  state: string;
  redirectUri: string;
  createdAtMs: number;
}

const OAUTH_CONFIGS: Record<IntegrationProvider, OAuthConfig> = {
  google_calendar: {
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '',
    authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
  },
  notion: {
    clientId: process.env.EXPO_PUBLIC_NOTION_CLIENT_ID || '',
    authorizationUrl: 'https://api.notion.com/v1/oauth/authorize',
    tokenUrl: 'https://api.notion.com/v1/oauth/token',
    scopes: [],
  },
  github: {
    clientId: process.env.EXPO_PUBLIC_GITHUB_CLIENT_ID || '',
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scopes: ['read:user', 'repo:status'],
  },
  todoist: {
    clientId: process.env.EXPO_PUBLIC_TODOIST_CLIENT_ID || '',
    authorizationUrl: 'https://todoist.com/oauth/authorize',
    tokenUrl: 'https://todoist.com/oauth/access_token',
    scopes: ['data:read'],
  },
  linear: {
    clientId: process.env.EXPO_PUBLIC_LINEAR_CLIENT_ID || '',
    authorizationUrl: 'https://linear.app/oauth/authorize',
    tokenUrl: 'https://api.linear.app/oauth/token',
    scopes: ['read'],
  },
};

function createOAuthState(): string {
  const uuid = Crypto.randomUUID();
  return uuid.replace(/-/g, '');
}

async function setPendingOAuthFlow(flow: PendingOAuthFlow): Promise<void> {
  await AsyncStorage.setItem(OAUTH_PENDING_FLOW_KEY, JSON.stringify(flow));
}

async function getPendingOAuthFlow(): Promise<PendingOAuthFlow | null> {
  const value = await AsyncStorage.getItem(OAUTH_PENDING_FLOW_KEY);
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<PendingOAuthFlow>;
    if (
      parsed &&
      typeof parsed.provider === 'string' &&
      isIntegrationProvider(parsed.provider) &&
      typeof parsed.state === 'string' &&
      typeof parsed.redirectUri === 'string' &&
      typeof parsed.createdAtMs === 'number'
    ) {
      return {
        provider: parsed.provider,
        state: parsed.state,
        redirectUri: parsed.redirectUri,
        createdAtMs: parsed.createdAtMs,
      };
    }
  } catch {
    // Ignore malformed cache.
  }

  return null;
}

export async function clearPendingOAuthFlow(): Promise<void> {
  await AsyncStorage.removeItem(OAUTH_PENDING_FLOW_KEY);
}

export function isIntegrationProvider(value: string): value is IntegrationProvider {
  return value in OAUTH_CONFIGS;
}

export async function validatePendingOAuthFlow(
  provider: IntegrationProvider,
  state: string | null | undefined,
  redirectUri: string,
): Promise<boolean> {
  const pending = await getPendingOAuthFlow();
  if (!pending) return false;

  const isFresh = Date.now() - pending.createdAtMs <= OAUTH_PENDING_TTL_MS;
  const isProviderMatch = pending.provider === provider;
  const isStateMatch = !!state && pending.state === state;
  const isRedirectMatch = pending.redirectUri === redirectUri;

  if (isFresh && isProviderMatch && isStateMatch && isRedirectMatch) {
    await clearPendingOAuthFlow();
    return true;
  }

  return false;
}

export async function startOAuthFlow(provider: IntegrationProvider): Promise<boolean> {
  const config = OAUTH_CONFIGS[provider];
  if (!config.clientId) {
    return false;
  }

  const state = createOAuthState();
  await setPendingOAuthFlow({
    provider,
    state,
    redirectUri: REDIRECT_URI,
    createdAtMs: Date.now(),
  });

  const request = new AuthSession.AuthRequest({
    clientId: config.clientId,
    scopes: config.scopes,
    redirectUri: REDIRECT_URI,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
    state,
  });

  const discovery: AuthSession.DiscoveryDocument = {
    authorizationEndpoint: config.authorizationUrl,
    tokenEndpoint: config.tokenUrl,
  };

  const result = await request.promptAsync(discovery);

  if (result.type === 'success' && result.params?.code) {
    const resultState = typeof result.params.state === 'string' ? result.params.state : null;
    const isValidState = await validatePendingOAuthFlow(provider, resultState, REDIRECT_URI);
    if (!isValidState) {
      await clearPendingOAuthFlow();
      return false;
    }

    try {
      await exchangeToken(provider, result.params.code, REDIRECT_URI);
      return true;
    } catch (error) {
      console.error(`[OAuth] Token exchange failed for ${provider}:`, error);
      return false;
    }
  }

  await clearPendingOAuthFlow();
  return false;
}

export async function getIntegrationStatus(provider: IntegrationProvider): Promise<'active' | 'expired' | 'revoked' | 'error' | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
      .from('user_integrations')
      .select('status')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .maybeSingle();

    const status = data?.status;
    if (!status) return null;
    return isIntegrationStatus(status) ? status : null;
  } catch {
    return null;
  }
}

export async function disconnectIntegration(provider: IntegrationProvider): Promise<boolean> {
  try {
    await apiDisconnect(provider);
    return true;
  } catch (error) {
    console.error(`[OAuth] Disconnect failed for ${provider}:`, error);
    return false;
  }
}

export { REDIRECT_URI };
