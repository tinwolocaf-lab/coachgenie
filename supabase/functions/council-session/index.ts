import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { searchMemories, formatMemoriesForPrompt } from '../_shared/memory.ts';
import { buildEnrichedSystemPrompt } from '../_shared/context-builder.ts';
import { checkRateLimit, formatRateLimitError } from '../_shared/rate-limiter.ts';
import { isFeatureEnabled } from '../_shared/feature-flags.ts';
import {
  extractOpenRouterMessageContent,
  extractOpenRouterUsage,
  openRouterChat,
} from '../_shared/openrouter.ts';

type CouncilRole = 'analyst' | 'challenger' | 'integrator';

interface CouncilBody {
  topic: string;
  session_id?: string;
  model_id?: string;
}

interface RoleConfig {
  role: CouncilRole;
  label: string;
  systemPrompt: string;
}

const COUNCIL_ROLES: RoleConfig[] = [
  {
    role: 'analyst',
    label: 'Analyst Coach',
    systemPrompt:
      'You are the Analyst coach in a coaching council. Your job is to identify patterns, ' +
      'trends, and data-driven insights about the user. Look at their history, behaviors, ' +
      'and recurring themes. Be specific and evidence-based. Highlight what the data reveals ' +
      'about their progress, blockers, and opportunities. Keep your analysis under 200 words.',
  },
  {
    role: 'challenger',
    label: 'Challenger Coach',
    systemPrompt:
      'You are the Challenger coach in a coaching council. Your job is to provide constructive ' +
      'friction and accountability. Push back on assumptions, identify blind spots, and ask ' +
      'tough questions. Challenge the user to think bigger and take bolder action. Be direct ' +
      'but respectful. Keep your challenge under 200 words.',
  },
  {
    role: 'integrator',
    label: 'Integrator Coach',
    systemPrompt:
      'You are the Integrator coach in a coaching council. You synthesize insights from the ' +
      'Analyst and Challenger into one unified, actionable plan. Balance data with intuition, ' +
      'caution with boldness. Produce a clear action plan with 3-5 concrete steps and one ' +
      '"weekly experiment" the user can try. Keep your synthesis under 250 words.',
  },
];

const DEFAULT_MODEL = 'google/gemini-2.5-flash';

/**
 * Council Session - multi-role coaching synthesis.
 *
 * Runs three specialized coaching perspectives (Analyst, Challenger, Integrator)
 * sequentially, then produces a unified synthesis with an action plan and
 * weekly experiment.
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

  let body: CouncilBody;
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400, headers: corsHeaders });
  }

  if (!body.topic?.trim()) {
    return new Response(
      JSON.stringify({ error: 'Missing required field: topic' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const { userId, userClient } = auth;
  const serviceClient = createServiceClient();

  // Feature flag gate
  const councilEnabled = await isFeatureEnabled(serviceClient, 'council_sessions', { userId }).catch(() => true);
  if (!councilEnabled) {
    return new Response(
      JSON.stringify({ error: 'Council sessions are not available yet.' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // Rate limit
  const rateCheck = await checkRateLimit(serviceClient, {
    userId,
    action: 'council_session',
    limit: 3,
    windowMs: 3600_000, // 3 per hour
  });
  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({ code: 'RATE_LIMITED', message: formatRateLimitError(rateCheck) }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const modelId = body.model_id ?? DEFAULT_MODEL;

  const startTime = Date.now();

  try {
    // Create council session record
    const { data: councilRow, error: councilError } = await serviceClient
      .from('council_sessions')
      .insert({
        user_id: userId,
        session_id: body.session_id ?? null,
        model_id: modelId,
        status: 'in_progress',
      })
      .select('id')
      .single();

    if (councilError || !councilRow) {
      throw new Error(`Failed to create council session: ${councilError?.message}`);
    }

    const councilId = councilRow.id;

    // Gather user context
    const basePrompt = 'You are a coaching council member.';
    const enrichedPrompt = await buildEnrichedSystemPrompt(userId, basePrompt, userClient);

    const memoryResult = await searchMemories(serviceClient, {
      userId,
      query: body.topic,
      limit: 5,
    });
    const memoryContext = formatMemoriesForPrompt(memoryResult.memories);

    const contextBlock = memoryContext
      ? `${enrichedPrompt}\n\n--- RELEVANT MEMORIES ---\n${memoryContext}`
      : enrichedPrompt;

    // Run each role sequentially (Analyst -> Challenger -> Integrator)
    const contributions: { role: CouncilRole; content: string; keyPoints: string[] }[] = [];
    let totalTokens = 0;

    for (const roleConfig of COUNCIL_ROLES) {
      const roleStart = Date.now();
      const priorContributions = contributions
        .map((c) => `[${c.role.toUpperCase()}]: ${c.content}`)
        .join('\n\n');

      const messages: { role: string; content: string }[] = [
        {
          role: 'system',
          content: `${roleConfig.systemPrompt}\n\n${contextBlock}` +
            (priorContributions ? `\n\n--- PRIOR COUNCIL CONTRIBUTIONS ---\n${priorContributions}` : ''),
        },
        {
          role: 'user',
          content: `The topic for this council session is: "${body.topic}"`,
        },
      ];

      const response = await openRouterChat({
        model: modelId,
        messages,
        max_tokens: 500,
        temperature: 0.7,
      });

      if (!response.ok) {
        console.error(`[council] ${roleConfig.role} failed:`, await response.text());
        continue;
      }

      const json = await response.json();
      const content = extractOpenRouterMessageContent(json).trim();
      const usage = extractOpenRouterUsage(json);
      const tokens = Math.max(0, (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0));
      totalTokens += tokens;

      contributions.push({ role: roleConfig.role, content, keyPoints: [] });

      // Store contribution
      await serviceClient.from('council_contributions').insert({
        council_id: councilId,
        role: roleConfig.role,
        content,
        tokens_used: tokens,
        latency_ms: Date.now() - roleStart,
        model_id: modelId,
      });
    }

    // Build final synthesis from Integrator output
    const integratorOutput = contributions.find((c) => c.role === 'integrator')?.content ?? '';

    // Extract action plan and experiment from integrator
    const actionPlan = extractActionItems(integratorOutput);
    const experiment = extractExperiment(integratorOutput);

    // Update council session as completed
    await serviceClient
      .from('council_sessions')
      .update({
        status: 'completed',
        synthesis: integratorOutput,
        action_plan: actionPlan,
        weekly_experiment: experiment,
        total_tokens: totalTokens,
        latency_ms: Date.now() - startTime,
        completed_at: new Date().toISOString(),
      })
      .eq('id', councilId);

    return new Response(
      JSON.stringify({
        council_id: councilId,
        contributions: contributions.map((c) => ({
          role: c.role,
          content: c.content,
        })),
        synthesis: integratorOutput,
        action_plan: actionPlan,
        weekly_experiment: experiment,
        total_tokens: totalTokens,
        latency_ms: Date.now() - startTime,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[council] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

// ── Helpers ─────────────────────────────────────────────────────────────

function extractActionItems(text: string): { items: string[] } {
  const lines = text.split('\n');
  const items: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[\d\-\*\•]/.test(trimmed) && trimmed.length > 5) {
      items.push(trimmed.replace(/^[\d\.\-\*\•\)]+\s*/, ''));
    }
  }

  return { items: items.slice(0, 5) };
}

function extractExperiment(text: string): { description: string } | null {
  const lower = text.toLowerCase();
  const expIndex = lower.indexOf('experiment');
  if (expIndex === -1) return null;

  // Get the sentence containing "experiment"
  const after = text.slice(expIndex);
  const sentenceEnd = after.search(/[.!?]\s|$/);
  const sentence = after.slice(0, sentenceEnd + 1).trim();

  return { description: sentence || null } as any;
}
