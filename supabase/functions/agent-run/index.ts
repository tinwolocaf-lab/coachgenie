import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import {
  orchestratePreResponse,
  orchestratePostResponse,
} from '../_shared/agent-orchestrator.ts';
import type { TriggerType } from '../_shared/trace.ts';
import { extractOpenRouterMessageContent, openRouterChat } from '../_shared/openrouter.ts';
import { isGeminiModelId } from '../_shared/gemini.ts';

interface AgentRunBody {
  trigger_type: TriggerType;
  session_id?: string;
  user_message?: string;
  model_id?: string;
  context?: Record<string, unknown>;
}

const DEFAULT_MODEL = 'google/gemini-2.5-flash';

/**
 * Unified agent-run entry point.
 *
 * Handles all trigger types:
 *  - user_message: standard chat interaction
 *  - voice_turn: voice session turn
 *  - scheduled_nudge: proactive nudge from scheduler
 *  - calendar_event: calendar-triggered coaching
 *
 * Returns the orchestration result including the coaching response.
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

  let body: AgentRunBody;
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400, headers: corsHeaders });
  }

  if (!body.trigger_type) {
    return new Response(
      JSON.stringify({ error: 'Missing required field: trigger_type' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const { userId, userClient } = auth;
  const serviceClient = createServiceClient();
  const modelId = body.model_id ?? DEFAULT_MODEL;

  // Build base prompt based on trigger type
  const basePrompt = buildBasePrompt(body.trigger_type, body.context);

  // Resolve the user message based on trigger type
  const userMessage = resolveUserMessage(body);

  if (!userMessage) {
    return new Response(
      JSON.stringify({ error: 'No user_message provided for this trigger type' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    // Run pre-response orchestration
    const orchResult = await orchestratePreResponse({
      userId,
      sessionId: body.session_id ?? '',
      userMessage,
      triggerType: body.trigger_type,
      modelProvider: isGeminiModelId(modelId) ? 'gemini' : 'openrouter',
      modelId,
      baseSystemPrompt: basePrompt,
      userClient,
      serviceClient,
    });

    // If risk-blocked, return crisis response
    if (orchResult.riskBlocked) {
      await orchResult.trace.flush(serviceClient, 'completed');

      return new Response(
        JSON.stringify({
          run_id: orchResult.runId,
          blocked: true,
          response: orchResult.crisisResponse,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Generate coaching response
    const llmResponse = await openRouterChat({
      model: modelId,
      messages: [
        { role: 'system', content: orchResult.systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 1000,
      temperature: 0.7,
    });

    if (!llmResponse.ok) {
      const errText = await llmResponse.text();
      console.error('[agent-run] LLM error:', errText);
      await orchResult.trace.flush(serviceClient, 'failed');

      return new Response(
        JSON.stringify({ error: 'Failed to generate response', run_id: orchResult.runId }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const llmJson = await llmResponse.json();
    const assistantMessage = extractOpenRouterMessageContent(llmJson).trim();

    // Post-response processing (fire-and-forget)
    orchestratePostResponse(serviceClient, {
      userId,
      sessionId: body.session_id ?? '',
      userMessage,
      assistantMessage,
      trace: orchResult.trace,
    }).catch((err) => console.error('[agent-run] post-response error:', err));

    return new Response(
      JSON.stringify({
        run_id: orchResult.runId,
        blocked: false,
        response: assistantMessage,
        memory_context_used: !!orchResult.memoryContext,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[agent-run] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

// ── Helpers ─────────────────────────────────────────────────────────────

function buildBasePrompt(triggerType: TriggerType, context?: Record<string, unknown>): string {
  switch (triggerType) {
    case 'scheduled_nudge':
      return (
        'You are a proactive coaching assistant. Generate a brief, encouraging nudge ' +
        'based on the user\'s current goals and recent activity. Be specific and actionable. ' +
        'Keep it under 3 sentences.'
      );
    case 'calendar_event':
      return (
        'You are a coaching assistant responding to a calendar event trigger. ' +
        'Help the user prepare for or reflect on the event. Be concise and supportive.'
      );
    case 'voice_turn':
      return (
        'You are a coaching assistant in a voice conversation. ' +
        'Keep responses natural, conversational, and concise. ' +
        'Aim for spoken-word clarity.'
      );
    default:
      return 'You are a helpful coaching assistant. Be concise and actionable.';
  }
}

function resolveUserMessage(body: AgentRunBody): string | null {
  if (body.user_message?.trim()) {
    return body.user_message.trim();
  }

  // For scheduled triggers, generate a synthetic message
  switch (body.trigger_type) {
    case 'scheduled_nudge':
      return 'Generate a proactive coaching nudge based on my current goals and recent patterns.';
    case 'calendar_event': {
      const eventTitle = (body.context as Record<string, unknown>)?.event_title ?? 'upcoming event';
      return `I have "${eventTitle}" coming up. Help me prepare.`;
    }
    default:
      return null;
  }
}
