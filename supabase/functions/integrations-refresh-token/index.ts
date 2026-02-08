import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';

interface RefreshBody {
  provider: string;
}

const PROVIDER_CONFIGS: Record<string, { tokenUrl: string; secretEnv: string; clientIdEnv: string }> = {
  google_calendar: {
    tokenUrl: 'https://oauth2.googleapis.com/token',
    secretEnv: 'GOOGLE_CLIENT_SECRET',
    clientIdEnv: 'GOOGLE_CLIENT_ID',
  },
  notion: {
    tokenUrl: 'https://api.notion.com/v1/oauth/token',
    secretEnv: 'NOTION_CLIENT_SECRET',
    clientIdEnv: 'NOTION_CLIENT_ID',
  },
  github: {
    tokenUrl: 'https://github.com/login/oauth/access_token',
    secretEnv: 'GITHUB_CLIENT_SECRET',
    clientIdEnv: 'GITHUB_CLIENT_ID',
  },
};

serve(async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  let payload: RefreshBody;
  try {
    payload = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400, headers: corsHeaders });
  }

  const { provider } = payload;
  const config = PROVIDER_CONFIGS[provider];
  if (!config) {
    return new Response(`Unknown or non-refreshable provider: ${provider}`, { status: 400, headers: corsHeaders });
  }

  let auth;
  try {
    auth = await requireAuth(request);
  } catch (error) {
    return new Response((error as Error).message, { status: 401, headers: corsHeaders });
  }

  const { data: integration, error: fetchError } = await auth.userClient
    .from('user_integrations')
    .select('id, refresh_token')
    .eq('user_id', auth.userId)
    .eq('provider', provider)
    .maybeSingle();

  if (fetchError || !integration?.refresh_token) {
    return new Response('No refresh token available', { status: 400, headers: corsHeaders });
  }

  const clientId = Deno.env.get(config.clientIdEnv) ?? '';
  const clientSecret = Deno.env.get(config.secretEnv) ?? '';

  try {
    const tokenBody = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: integration.refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: tokenBody.toString(),
    });

    if (!response.ok) {
      await auth.userClient
        .from('user_integrations')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', integration.id);

      return new Response('Token refresh failed', { status: 502, headers: corsHeaders });
    }

    const tokens = await response.json();
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    await auth.userClient
      .from('user_integrations')
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? integration.refresh_token,
        token_expires_at: expiresAt,
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', integration.id);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Token Refresh] Error:', error);
    return new Response('Internal server error', { status: 500, headers: corsHeaders });
  }
});
