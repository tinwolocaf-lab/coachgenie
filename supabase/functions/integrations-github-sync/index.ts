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

  const { data: integration, error: fetchError } = await userClient
    .from('user_integrations')
    .select('id, access_token')
    .eq('user_id', userId)
    .eq('provider', 'github')
    .eq('status', 'active')
    .maybeSingle();

  if (fetchError || !integration) {
    return new Response('GitHub not connected', { status: 400, headers: corsHeaders });
  }

  const headers = {
    Authorization: `Bearer ${integration.access_token}`,
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'Coachgenie-App',
  };

  try {
    // Fetch user events (recent activity)
    const eventsResponse = await fetch('https://api.github.com/users/me/events?per_page=30', {
      headers,
    });

    // If /users/me doesn't work, get authenticated user first
    let events: unknown[] = [];
    if (!eventsResponse.ok) {
      const userResponse = await fetch('https://api.github.com/user', { headers });
      if (!userResponse.ok) {
        if (userResponse.status === 401) {
          await userClient
            .from('user_integrations')
            .update({ status: 'expired', updated_at: new Date().toISOString() })
            .eq('id', integration.id);
        }
        return new Response('GitHub API error', { status: 502, headers: corsHeaders });
      }
      const userData = await userResponse.json();
      const username = userData.login;

      const retryResponse = await fetch(`https://api.github.com/users/${username}/events?per_page=30`, {
        headers,
      });
      if (retryResponse.ok) {
        events = await retryResponse.json();
      }
    } else {
      events = await eventsResponse.json();
    }

    // Analyze activity patterns
    const now = new Date();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    let commitsThisWeek = 0;
    const activeRepos = new Set<string>();
    const commitHours: number[] = [];

    for (const event of events as { type: string; repo?: { name: string }; created_at: string; payload?: { commits?: { message: string }[] } }[]) {
      const eventDate = new Date(event.created_at);
      if (eventDate < weekAgo) continue;

      if (event.repo?.name) {
        activeRepos.add(event.repo.name);
      }

      if (event.type === 'PushEvent') {
        const commits = event.payload?.commits || [];
        commitsThisWeek += commits.length;
        commitHours.push(eventDate.getHours());
      }
    }

    // Calculate peak hours
    let peakHours = 'N/A';
    if (commitHours.length > 0) {
      const hourCounts: Record<number, number> = {};
      for (const h of commitHours) {
        hourCounts[h] = (hourCounts[h] || 0) + 1;
      }
      const sortedHours = Object.entries(hourCounts).sort(
        ([, a], [, b]) => b - a
      );
      const topHours = sortedHours.slice(0, 3).map(([h]) => {
        const hour = parseInt(h);
        return hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`;
      });
      peakHours = topHours.join(', ');
    }

    // Store aggregated activity
    await userClient.from('integration_data').upsert(
      {
        user_id: userId,
        integration_id: integration.id,
        data_type: 'github_activity',
        external_id: `github_activity_${userId}`,
        title: 'GitHub Activity Summary',
        content: {
          commits_this_week: commitsThisWeek,
          active_repos: Array.from(activeRepos).slice(0, 5),
          peak_hours: peakHours,
          total_events: events.length,
          analysis_date: now.toISOString(),
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'integration_id,external_id' }
    );

    await userClient
      .from('user_integrations')
      .update({ last_synced_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', integration.id);

    return new Response(
      JSON.stringify({
        success: true,
        activity: {
          commits_this_week: commitsThisWeek,
          active_repos: Array.from(activeRepos).length,
          peak_hours: peakHours,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[GitHub Sync] Error:', error);
    return new Response('Internal server error', { status: 500, headers: corsHeaders });
  }
});
