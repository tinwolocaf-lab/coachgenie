import * as AuthSession from 'expo-auth-session';
import { IntegrationProvider } from '@/types';
import { supabase } from '@/lib/supabase';
import { exchangeToken, disconnectIntegration as apiDisconnect } from './api';

interface OAuthConfig {
  clientId: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
}

const REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: 'coachgenie',
  path: 'integrations/callback',
});

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

export async function startOAuthFlow(provider: IntegrationProvider): Promise<boolean> {
  const config = OAUTH_CONFIGS[provider];
  if (!config.clientId) {
    return false;
  }

  const request = new AuthSession.AuthRequest({
    clientId: config.clientId,
    scopes: config.scopes,
    redirectUri: REDIRECT_URI,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
  });

  const discovery: AuthSession.DiscoveryDocument = {
    authorizationEndpoint: config.authorizationUrl,
    tokenEndpoint: config.tokenUrl,
  };

  const result = await request.promptAsync(discovery);

  if (result.type === 'success' && result.params?.code) {
    try {
      await exchangeToken(provider, result.params.code, REDIRECT_URI);
      return true;
    } catch (error) {
      console.error(`[OAuth] Token exchange failed for ${provider}:`, error);
      return false;
    }
  }

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

    return data?.status ?? null;
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
