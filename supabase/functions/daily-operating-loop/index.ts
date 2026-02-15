import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { requireAuth, type AuthResult } from '../_shared/auth.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { searchMemories, formatMemoriesForPrompt } from '../_shared/memory.ts';
import { checkRateLimit, formatRateLimitError } from '../_shared/rate-limiter.ts';
import { isFeatureEnabled } from '../_shared/feature-flags.ts';
import { extractOpenRouterMessageContent, openRouterChat } from '../_shared/openrouter.ts';

type LoopPhase = 'morning' | 'midday' | 'evening';

interface LoopBody {
  phase?: LoopPhase;
}

const PHASE_PROMPTS: Record<LoopPhase, string> = {
  morning:
    'You are a morning coaching assistant. Help the user set intentions for the day. ' +
    'Reference their goals, upcoming calendar events, and active commitments. ' +
    'Be brief, energizing, and specific. Ask one powerful question to start their day.',
  midday:
    'You are a midday coaching check-in assistant. Help the user course-correct. ' +
    'Ask about progress on morning intentions. Suggest adjustments based on energy and schedule. ' +
    'Be concise and practical. Offer one actionable suggestion.',
  evening:
    'You are an evening reflection assistant. Help the user reflect on their day. ' +
    'Ask about wins, lessons, and gratitude. Connect outcomes to their values and goals. ' +
    'Be warm and reflective. Help them release the day and set up tomorrow.',
};

/**
 * Daily Operating Loop - generates personalized coaching based on time-of-day.
 *
 * Can be triggered:
 *  - Automatically by a scheduler (determines phase from current time)
 *  - Manually with a specific phase
 */
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

  let body: LoopBody = {};
  try {
    body = await request.json();
  } catch {
    // Default to auto-detect
  }

  const { userId, userClient } = auth;
  const serviceClient = createServiceClient();

  // Feature flag gate
  const loopEnabled = await isFeatureEnabled(serviceClient, 'daily_operating_loop', { userId }).catch(() => true);
  if (!loopEnabled) {
    return new Response(
      JSON.stringify({ error: 'Daily operating loop is not available yet.' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Rate limit (3 per day — one per phase)
  const rateCheck = await checkRateLimit(serviceClient, {
    userId,
    action: 'daily_loop',
    limit: 3,
    windowMs: 86400_000, // 24 hours
  });
  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({ code: 'RATE_LIMITED', message: formatRateLimitError(rateCheck) }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Determine phase from time if not specified
  const phase = body.phase ?? detectPhase();
  const systemPrompt = PHASE_PROMPTS[phase];

  try {
    // Gather context for personalization
    const context = await gatherLoopContext(userClient, serviceClient, userId, phase);

    const userMessage = buildPhaseMessage(phase, context);

    const response = await openRouterChat({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: `${systemPrompt}\n\n${context.contextBlock}` },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[daily-loop] LLM error:', errText);
      return new Response(
        JSON.stringify({ error: 'Failed to generate coaching message' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const json = await response.json();
    const message = extractOpenRouterMessageContent(json).trim();

    // Store as a nudge
    await userClient.from('editorial_nudges').insert({
      user_id: userId,
      nudge_type: phase === 'morning' ? 'alignment' : phase === 'midday' ? 'encouragement' : 'reflection',
      title: phase === 'morning' ? 'Morning Intent' : phase === 'midday' ? 'Midday Check-in' : 'Evening Reflection',
      content: message,
      is_read: false,
    });

    return new Response(
      JSON.stringify({
        phase,
        message,
        context_used: {
          has_calendar: context.hasCalendar,
          has_commitments: context.hasCommitments,
          has_memories: context.hasMemories,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[daily-loop] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

// ── Helpers ─────────────────────────────────────────────────────────────

function detectPhase(): LoopPhase {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'midday';
  return 'evening';
}

interface LoopContext {
  contextBlock: string;
  hasCalendar: boolean;
  hasCommitments: boolean;
  hasMemories: boolean;
}

async function gatherLoopContext(
  userClient: AuthResult['userClient'],
  serviceClient: any,
  userId: string,
  phase: LoopPhase,
): Promise<LoopContext> {
  const sections: string[] = [];
  let hasCalendar = false;
  let hasCommitments = false;
  let hasMemories = false;

  // Calendar events
  try {
    const now = new Date().toISOString();
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const { data: events } = await userClient
      .from('integration_data')
      .select('title, starts_at')
      .eq('user_id', userId)
      .eq('data_type', 'calendar_event')
      .gte('starts_at', now)
      .lte('starts_at', endOfDay.toISOString())
      .order('starts_at', { ascending: true })
      .limit(8);

    if (events?.length) {
      hasCalendar = true;
      const lines = events.map((e: any) => {
        const time = new Date(e.starts_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        return `- ${time}: ${e.title}`;
      });
      sections.push(`=== TODAY'S SCHEDULE ===\n${lines.join('\n')}`);
    }
  } catch { /* continue */ }

  // Active commitments
  try {
    const { data: commitments } = await serviceClient
      .from('behavior_commitments')
      .select('title, commitment_type, progress, due_date')
      .eq('user_id', userId)
      .eq('status', 'active')
      .limit(5);

    if (commitments?.length) {
      hasCommitments = true;
      const lines = commitments.map((c: any) =>
        `- ${c.title} (${c.commitment_type}, ${c.progress ?? 0}% done${c.due_date ? `, due ${c.due_date}` : ''})`
      );
      sections.push(`=== ACTIVE COMMITMENTS ===\n${lines.join('\n')}`);
    }
  } catch { /* continue */ }

  // Recent memories
  try {
    const query = phase === 'morning'
      ? 'goals intentions energy focus'
      : phase === 'midday'
        ? 'progress blockers energy tasks'
        : 'wins lessons gratitude reflection';

    const result = await searchMemories(serviceClient, {
      userId,
      query,
      limit: 3,
      memoryTypes: ['profile', 'summary'],
    });

    if (result.memories.length) {
      hasMemories = true;
      sections.push(`=== RELEVANT CONTEXT ===\n${formatMemoriesForPrompt(result.memories)}`);
    }
  } catch { /* continue */ }

  // Latest state snapshot
  try {
    const { data: snapshot } = await serviceClient
      .from('user_state_snapshots')
      .select('summary')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (snapshot?.summary) {
      sections.push(`=== CURRENT STATE ===\n${snapshot.summary}`);
    }
  } catch { /* continue */ }

  return {
    contextBlock: sections.length ? sections.join('\n\n') : '',
    hasCalendar,
    hasCommitments,
    hasMemories,
  };
}

function buildPhaseMessage(phase: LoopPhase, context: LoopContext): string {
  switch (phase) {
    case 'morning':
      return context.hasCalendar
        ? 'Help me set my intentions for today based on my schedule and goals.'
        : 'Help me set a clear intention for today based on my current goals.';
    case 'midday':
      return context.hasCommitments
        ? 'Give me a quick midday check-in on my commitments and energy.'
        : 'Give me a brief midday check-in to help me course-correct.';
    case 'evening':
      return 'Help me reflect on today. What went well, what I learned, and what I\'m grateful for.';
  }
}
