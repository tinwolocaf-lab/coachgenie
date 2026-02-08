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

  try {
    // Check for meetings in the next 30 minutes
    const now = new Date();
    const thirtyMinsLater = new Date(now.getTime() + 30 * 60 * 1000);

    const { data: upcomingEvents } = await userClient
      .from('integration_data')
      .select('title, content, starts_at')
      .eq('user_id', userId)
      .eq('data_type', 'calendar_event')
      .gte('starts_at', now.toISOString())
      .lte('starts_at', thirtyMinsLater.toISOString())
      .order('starts_at', { ascending: true })
      .limit(3);

    if (!upcomingEvents?.length) {
      return new Response(JSON.stringify({ success: true, nudges: 0 }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let nudgesCreated = 0;

    for (const event of upcomingEvents) {
      // Check if we already created a nudge for this event recently
      const { data: existing } = await userClient
        .from('editorial_nudges')
        .select('id')
        .eq('user_id', userId)
        .eq('nudge_type', 'alignment')
        .like('title', `%${(event.title || '').slice(0, 30)}%`)
        .gte('created_at', new Date(now.getTime() - 60 * 60 * 1000).toISOString())
        .limit(1);

      if (existing?.length) continue;

      const eventContent = event.content as Record<string, unknown> | null;
      const attendees = (eventContent?.attendees as string[]) || [];
      const attendeeNote = attendees.length > 0
        ? ` You'll be meeting with ${attendees.length} participant${attendees.length > 1 ? 's' : ''}.`
        : '';

      const { error } = await userClient.from('editorial_nudges').insert({
        user_id: userId,
        nudge_type: 'alignment',
        title: `Prepare for: ${event.title || 'Upcoming meeting'}`,
        content: `"${event.title}" starts at ${new Date(event.starts_at!).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}.${attendeeNote} What's the one thing you want to accomplish in this meeting?`,
        is_read: false,
      });

      if (!error) nudgesCreated++;
    }

    return new Response(JSON.stringify({ success: true, nudges: nudgesCreated }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Calendar Nudge] Error:', error);
    return new Response('Internal server error', { status: 500, headers: corsHeaders });
  }
});
