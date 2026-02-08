import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';

serve(async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  let auth;
  try {
    auth = await requireAuth(request);
  } catch (error) {
    return new Response((error as Error).message, { status: 401, headers: corsHeaders });
  }

  const { userClient, userId } = auth;

  // Get the user's Google Calendar integration
  const { data: integration, error: fetchError } = await userClient
    .from('user_integrations')
    .select('id, access_token, refresh_token, token_expires_at')
    .eq('user_id', userId)
    .eq('provider', 'google_calendar')
    .eq('status', 'active')
    .maybeSingle();

  if (fetchError || !integration) {
    return new Response('Google Calendar not connected', { status: 400, headers: corsHeaders });
  }

  // Check if token is expired and refresh if needed
  let accessToken = integration.access_token;
  if (integration.token_expires_at && new Date(integration.token_expires_at) <= new Date()) {
    const refreshResult = await refreshGoogleToken(integration.refresh_token, userClient, integration.id);
    if (!refreshResult) {
      return new Response('Token refresh failed', { status: 502, headers: corsHeaders });
    }
    accessToken = refreshResult;
  }

  try {
    // Fetch events for the next 7 days
    const now = new Date();
    const weekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const calendarUrl = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    calendarUrl.searchParams.set('timeMin', now.toISOString());
    calendarUrl.searchParams.set('timeMax', weekLater.toISOString());
    calendarUrl.searchParams.set('singleEvents', 'true');
    calendarUrl.searchParams.set('orderBy', 'startTime');
    calendarUrl.searchParams.set('maxResults', '50');

    const calResponse = await fetch(calendarUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!calResponse.ok) {
      const errorText = await calResponse.text();
      console.error('[Calendar Sync] API error:', errorText);

      if (calResponse.status === 401) {
        await userClient
          .from('user_integrations')
          .update({ status: 'expired', updated_at: new Date().toISOString() })
          .eq('id', integration.id);
      }
      return new Response('Calendar API error', { status: 502, headers: corsHeaders });
    }

    const calData = await calResponse.json();
    const events = calData.items || [];

    // Upsert events into integration_data
    for (const event of events) {
      if (!event.id) continue;

      const startsAt = event.start?.dateTime || event.start?.date || null;
      const endsAt = event.end?.dateTime || event.end?.date || null;

      await userClient.from('integration_data').upsert(
        {
          user_id: userId,
          integration_id: integration.id,
          data_type: 'calendar_event',
          external_id: event.id,
          title: event.summary || 'Untitled Event',
          content: {
            description: event.description || null,
            location: event.location || null,
            attendees: (event.attendees || []).map((a: { email: string }) => a.email),
            status: event.status,
            html_link: event.htmlLink,
          },
          starts_at: startsAt,
          ends_at: endsAt,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'integration_id,external_id' }
      );
    }

    // Update last synced timestamp
    await userClient
      .from('user_integrations')
      .update({ last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', integration.id);

    return new Response(JSON.stringify({ success: true, synced: events.length }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Calendar Sync] Error:', error);
    return new Response('Internal server error', { status: 500, headers: corsHeaders });
  }
});

async function refreshGoogleToken(
  refreshToken: string,
  userClient: ReturnType<typeof import('../_shared/auth.ts').requireAuth extends (...args: unknown[]) => Promise<infer R> ? R['userClient'] : never>,
  integrationId: string
): Promise<string | null> {
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID') ?? '';
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '';

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    });

    if (!response.ok) {
      // deno-lint-ignore no-explicit-any
      await (userClient as any)
        .from('user_integrations')
        .update({ status: 'expired', updated_at: new Date().toISOString() })
        .eq('id', integrationId);
      return null;
    }

    const tokens = await response.json();
    const expiresAt = tokens.expires_in
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : null;

    // deno-lint-ignore no-explicit-any
    await (userClient as any)
      .from('user_integrations')
      .update({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? refreshToken,
        token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', integrationId);

    return tokens.access_token;
  } catch (error) {
    console.error('[Calendar Sync] Token refresh error:', error);
    return null;
  }
}
