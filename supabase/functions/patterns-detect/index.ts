import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import {
  extractOpenRouterMessageContent,
  getDefaultOpenRouterJsonModel,
  openRouterChat,
} from '../_shared/openrouter.ts';

const DEFAULT_JSON_MODEL = getDefaultOpenRouterJsonModel();

const PATTERN_LABEL_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    mood_trend: {
      type: 'string',
      enum: ['improving', 'stable', 'declining'],
    },
    energy_level: {
      type: 'string',
      enum: ['high', 'medium', 'low'],
    },
    primary_blockers: {
      type: 'array',
      items: { type: 'string' },
      maxItems: 3,
    },
    emotional_themes: {
      type: 'array',
      items: { type: 'string' },
      maxItems: 3,
    },
    confidence_level: {
      type: 'number',
      minimum: 0,
      maximum: 1,
    },
  },
  required: ['mood_trend', 'energy_level', 'primary_blockers', 'emotional_themes', 'confidence_level'],
  additionalProperties: false,
};

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
  const serviceClient = createServiceClient();

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

    // Fetch recent session messages for LLM labeling
    const { data: recentMessages } = await userClient
      .from('session_messages')
      .select('content, role')
      .eq('user_id', userId)
      .eq('role', 'user')
      .order('created_at', { ascending: false })
      .limit(20);

    // ── SQL Feature Extraction ──────────────────────────────────────────
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

    // ── LLM Labeling (mood + energy + blockers) ────────────────────────
    let llmLabels: Record<string, unknown> = {};
    if (recentMessages?.length) {
      llmLabels = await labelWithLLM(recentMessages.map((m) => m.content));
    }

    // ── Compute risk flags ─────────────────────────────────────────────
    const riskFlags: string[] = [];
    const sessionsPerWeek = (patterns.sessions_per_week as number) ?? 0;
    if (sessionsPerWeek > 14) riskFlags.push('high_usage_frequency');
    if ((llmLabels.mood_trend as string) === 'declining') riskFlags.push('declining_mood');
    if ((llmLabels.energy_level as string) === 'low') riskFlags.push('low_energy');

    // ── Build state snapshot ───────────────────────────────────────────
    const stateSnapshot = {
      ...patterns,
      ...llmLabels,
      risk_flags: riskFlags,
      computed_at: new Date().toISOString(),
    };

    // Store detected patterns in context vault (existing behavior)
    await userClient
      .from('context_vaults')
      .update({
        detected_patterns: patterns,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    // Write state snapshot to user_state_snapshots (new v2 behavior)
    const summary = buildSnapshotSummary(stateSnapshot);
    await serviceClient
      .from('user_state_snapshots')
      .insert({
        user_id: userId,
        state: stateSnapshot,
        summary,
      });

    return new Response(JSON.stringify({ success: true, patterns, state_snapshot: stateSnapshot }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Pattern Detection] Error:', error);
    return new Response('Internal server error', { status: 500, headers: corsHeaders });
  }
});

// ── LLM-based labeling ────────────────────────────────────────────────

async function labelWithLLM(messages: string[]): Promise<Record<string, unknown>> {
  if (!messages.length) return {};

  const messagesSample = messages.slice(0, 10).join('\n---\n').slice(0, 3000);

  try {
    const response = await openRouterChat({
      model: DEFAULT_JSON_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'Analyze these recent user messages from a coaching app. Return ONLY valid JSON with:\n' +
            '- mood_trend: "improving" | "stable" | "declining"\n' +
            '- energy_level: "high" | "medium" | "low"\n' +
            '- primary_blockers: string[] (top 3 obstacles)\n' +
            '- emotional_themes: string[] (top 3 recurring emotional themes)\n' +
            '- confidence_level: number 0-1\n' +
            'Be concise. No markdown.',
        },
        { role: 'user', content: messagesSample },
      ],
      max_tokens: 300,
      temperature: 0,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'pattern_labels',
          strict: true,
          schema: PATTERN_LABEL_SCHEMA,
        },
      },
    });

    if (!response.ok) return {};

    const json = await response.json();
    const content = extractOpenRouterMessageContent(json);
    return JSON.parse(content);
  } catch (err) {
    console.error('[Pattern Detection] LLM labeling failed:', err);
    return {};
  }
}

function buildSnapshotSummary(state: Record<string, unknown>): string {
  const parts: string[] = [];
  if (state.sessions_per_week) parts.push(`${state.sessions_per_week} sessions/week`);
  if (state.mood_trend) parts.push(`mood: ${state.mood_trend}`);
  if (state.energy_level) parts.push(`energy: ${state.energy_level}`);
  if (state.avg_ritual_consistency) parts.push(`ritual consistency: ${state.avg_ritual_consistency}`);
  const flags = state.risk_flags as string[] | undefined;
  if (flags?.length) parts.push(`flags: ${flags.join(', ')}`);
  return parts.join(' | ') || 'No patterns detected';
}
