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
    // Fetch recent session data (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: sessions } = await userClient
      .from('coaching_sessions')
      .select('id, coach_id, created_at, status')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false });

    // Fetch recent insights
    const { data: insights } = await userClient
      .from('key_insights')
      .select('id, title, content, category, created_at')
      .eq('user_id', userId)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: false });

    // Fetch ritual streaks
    const { data: streaks } = await userClient
      .from('ritual_streaks')
      .select('ritual_id, current_streak, consistency_score')
      .eq('user_id', userId);

    // Analyze patterns
    const patterns: Record<string, unknown> = {};

    // Session frequency pattern
    if (sessions?.length) {
      const sessionDays = new Set(
        sessions.map((s) => new Date(s.created_at).toDateString())
      );
      patterns.sessions_per_week = Math.round((sessions.length / 30) * 7 * 10) / 10;
      patterns.active_days = sessionDays.size;
      patterns.total_sessions_30d = sessions.length;

      // Coach usage distribution
      const coachCounts: Record<string, number> = {};
      for (const s of sessions) {
        if (s.coach_id) {
          coachCounts[s.coach_id] = (coachCounts[s.coach_id] || 0) + 1;
        }
      }
      patterns.coach_usage = coachCounts;

      // Time-of-day pattern
      const hourCounts: Record<number, number> = {};
      for (const s of sessions) {
        const hour = new Date(s.created_at).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
      const peakHour = Object.entries(hourCounts).sort(([, a], [, b]) => b - a)[0];
      if (peakHour) {
        const h = parseInt(peakHour[0]);
        patterns.peak_coaching_time = h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;
      }
    }

    // Insight category distribution
    if (insights?.length) {
      const categoryCounts: Record<string, number> = {};
      for (const i of insights) {
        categoryCounts[i.category] = (categoryCounts[i.category] || 0) + 1;
      }
      patterns.insight_categories = categoryCounts;
      patterns.total_insights_30d = insights.length;

      // Extract recurring themes from titles
      const words = insights
        .map((i) => i.title.toLowerCase().split(/\s+/))
        .flat()
        .filter((w) => w.length > 3);
      const wordCounts: Record<string, number> = {};
      for (const w of words) {
        wordCounts[w] = (wordCounts[w] || 0) + 1;
      }
      const topThemes = Object.entries(wordCounts)
        .filter(([, count]) => count >= 2)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([word]) => word);
      patterns.recurring_themes = topThemes;
    }

    // Ritual consistency
    if (streaks?.length) {
      const avgConsistency =
        streaks.reduce((sum, s) => sum + (s.consistency_score || 0), 0) / streaks.length;
      patterns.avg_ritual_consistency = Math.round(avgConsistency * 100) / 100;
      patterns.active_rituals = streaks.length;
      patterns.max_streak = Math.max(...streaks.map((s) => s.current_streak || 0));
    }

    // Store detected patterns in context vault
    await userClient
      .from('context_vaults')
      .update({
        detected_patterns: patterns,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    return new Response(JSON.stringify({ success: true, patterns }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Pattern Detection] Error:', error);
    return new Response('Internal server error', { status: 500, headers: corsHeaders });
  }
});
