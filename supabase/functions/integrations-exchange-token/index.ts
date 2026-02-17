import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';

interface ExchangeBody {
  provider: string;
  code: string;
  redirect_uri: string;
}

const DEFAULT_ALLOWED_REDIRECT_URIS = ['coachgenie://integrations/callback'];

const PROVIDER_CONFIGS: Record<string, { tokenUrl: string; secretEnv: string }> = {
  google_calendar: {
    tokenUrl: 'https://oauth2.googleapis.com/token',
    secretEnv: 'GOOGLE_CLIENT_SECRET',
  },
  notion: {
    tokenUrl: 'https://api.notion.com/v1/oauth/token',
    secretEnv: 'NOTION_CLIENT_SECRET',
  },
  github: {
    tokenUrl: 'https://github.com/login/oauth/access_token',
    secretEnv: 'GITHUB_CLIENT_SECRET',
  },
  todoist: {
    tokenUrl: 'https://todoist.com/oauth/access_token',
    secretEnv: 'TODOIST_CLIENT_SECRET',
  },
  linear: {
    tokenUrl: 'https://api.linear.app/oauth/token',
    secretEnv: 'LINEAR_CLIENT_SECRET',
  },
};

const CLIENT_ID_ENV: Record<string, string> = {
  google_calendar: 'GOOGLE_CLIENT_ID',
  notion: 'NOTION_CLIENT_ID',
  github: 'GITHUB_CLIENT_ID',
  todoist: 'TODOIST_CLIENT_ID',
  linear: 'LINEAR_CLIENT_ID',
};

function normalizeUri(value: string): string | null {
  try {
    return new URL(value).toString();
  } catch {
    return null;
  }
}

function getAllowedRedirectUris(): Set<string> {
  const envList = (Deno.env.get('INTEGRATIONS_OAUTH_ALLOWED_REDIRECT_URIS') ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  const normalized = [...DEFAULT_ALLOWED_REDIRECT_URIS, ...envList]
    .map((value) => normalizeUri(value))
    .filter((value): value is string => !!value);

  return new Set(normalized);
}

serve(async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  let payload: ExchangeBody;
  try {
    payload = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400, headers: corsHeaders });
  }

  const { provider, code, redirect_uri } = payload;
  if (!provider || !code || !redirect_uri) {
    return new Response('Missing provider, code, or redirect_uri', { status: 400, headers: corsHeaders });
  }

  const normalizedRedirectUri = normalizeUri(redirect_uri);
  const allowedRedirectUris = getAllowedRedirectUris();
  if (!normalizedRedirectUri || !allowedRedirectUris.has(normalizedRedirectUri)) {
    return new Response('Invalid redirect_uri', { status: 400, headers: corsHeaders });
  }

  const config = PROVIDER_CONFIGS[provider];
  if (!config) {
    return new Response(`Unknown provider: ${provider}`, { status: 400, headers: corsHeaders });
  }

  let auth;
  try {
    auth = await requireAuth(request);
  } catch (error) {
    return new Response((error as Error).message, { status: 401, headers: corsHeaders });
  }

  const clientId = Deno.env.get(CLIENT_ID_ENV[provider]) ?? '';
  const clientSecret = Deno.env.get(config.secretEnv) ?? '';

  if (!clientId || !clientSecret) {
    return new Response(`Missing credentials for ${provider}`, { status: 500, headers: corsHeaders });
  }

  try {
    const tokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: normalizedRedirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const tokenResponse = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: tokenBody.toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(`[Token Exchange] Error from ${provider}:`, errorText);
      return new Response(`Token exchange failed: ${errorText}`, { status: 502, headers: corsHeaders });
    }

    const tokens = await tokenResponse.json();

    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    const { error: upsertError } = await auth.userClient
      .from('user_integrations')
      .upsert(
        {
          user_id: auth.userId,
          provider,
          status: 'active',
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token ?? null,
          token_expires_at: expiresAt,
          scopes: tokens.scope ? tokens.scope.split(' ') : [],
          provider_email: tokens.email ?? null,
          metadata: { token_type: tokens.token_type },
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,provider' }
      );

    if (upsertError) {
      console.error('[Token Exchange] Upsert error:', upsertError);
      return new Response('Failed to save integration', { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true, provider }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Token Exchange] Error:', error);
    return new Response('Internal server error', { status: 500, headers: corsHeaders });
  }
});
