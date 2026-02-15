import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';
import { encodeSseEvent } from '../_shared/sse.ts';
import {
  openRouterChat,
  parseOpenRouterSseChunkWithUsage,
  type OpenRouterUsage,
} from '../_shared/openrouter.ts';
import { isGeminiModelId } from '../_shared/gemini.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import {
  orchestratePreResponse,
  orchestratePostResponse,
} from '../_shared/agent-orchestrator.ts';
import { resolveBillingTier } from '../_shared/revenuecat.ts';
import { resolveChatModelForTier } from '../_shared/modelCatalog.ts';
import {
  assertSufficientBalance,
  BillingError,
  buildInsufficientCreditsBody,
  calculateUsdCost,
  debitForUsage,
  ensureActiveCreditAccount,
  estimateChatUsageFromText,
  mcreditsFromUsd,
  type UsageUnits,
} from '../_shared/billing.ts';
import { checkChatRateLimit, formatRateLimitError } from '../_shared/rate-limiter.ts';
import { getNextFallbackModel } from '../_shared/fallback-policy.ts';

interface ChatStreamBody {
  session_id: string;
  user_message: string;
  client_context?: Record<string, unknown>;
  model_id?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function usageFromOpenRouterUsage(usage: OpenRouterUsage | null): UsageUnits | null {
  if (!usage) return null;
  return {
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    audioInputTokens: usage.audioInputTokens,
    audioOutputTokens: usage.audioOutputTokens,
    reasoningTokens: usage.reasoningTokens,
  };
}

serve(async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  let payload: ChatStreamBody;
  try {
    payload = await request.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400, headers: corsHeaders });
  }

  const { session_id, user_message } = payload;
  if (!session_id || !user_message?.trim()) {
    return new Response('Missing session_id or user_message', { status: 400, headers: corsHeaders });
  }

  let auth;
  try {
    auth = await requireAuth(request);
  } catch (error) {
    return new Response((error as Error).message, { status: 401, headers: corsHeaders });
  }

  const { userClient, userId } = auth;
  const serviceClient = createServiceClient();

  // ── Rate limit check ──
  const rateCheck = await checkChatRateLimit(serviceClient, userId);
  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({ code: 'RATE_LIMITED', message: formatRateLimitError(rateCheck) }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          ...(rateCheck.retryAfterMs
            ? { 'Retry-After': String(Math.ceil(rateCheck.retryAfterMs / 1000)) }
            : {}),
        },
      },
    );
  }

  const tierResult = await resolveBillingTier(serviceClient, userId);
  const creditStatus = await ensureActiveCreditAccount(
      serviceClient,
      userId,
      tierResult.tier,
      {
        tierSource: tierResult.source,
        trialTier: tierResult.trialTier,
        trialEndsAt: tierResult.trialEndsAt,
      }
    );

  let chatModel: string;
  try {
    chatModel = await resolveChatModelForTier(serviceClient, tierResult.tier, payload.model_id);
  } catch (error) {
    if (error instanceof Error && error.message === 'MODEL_NOT_ALLOWED') {
      return new Response(
        JSON.stringify({
          code: 'MODEL_NOT_ALLOWED',
          message: 'Requested model is not allowed for your current tier.',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    throw error;
  }

  const { data: session, error: sessionError } = await userClient
    .from('coaching_sessions')
    .select('id, coach_id, coach_snapshot')
    .eq('id', session_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (sessionError || !session) {
    return new Response('Session not found', { status: 404, headers: corsHeaders });
  }

  const { error: insertUserError } = await userClient.from('session_messages').insert({
    session_id,
    user_id: userId,
    role: 'user',
    content: user_message.trim(),
  });

  if (insertUserError) {
    return new Response(`Failed to save user message: ${insertUserError.message}`, { status: 500, headers: corsHeaders });
  }

  const sessionCoachSnapshot = isRecord(session.coach_snapshot) ? session.coach_snapshot : null;

  let coach: Record<string, unknown> | null = null;
  if (session.coach_id) {
    const { data: coachRow, error: coachError } = await userClient
      .from('coaches')
      .select('*')
      .eq('id', session.coach_id)
      .maybeSingle();

    if (!coachError && coachRow) {
      coach = coachRow as Record<string, unknown>;
    }
  }

  const { data: history } = await userClient
    .from('session_messages')
    .select('role, content')
    .eq('session_id', session_id)
    .order('created_at', { ascending: true })
    .limit(12);

  const snapshotPrompt = sessionCoachSnapshot
    ? asOptionalString(sessionCoachSnapshot.system_prompt)
    : null;
  const snapshotMethod = sessionCoachSnapshot
    ? asOptionalString(sessionCoachSnapshot.method)
    : null;

  const coachPrompt = coach ? asOptionalString(coach.system_prompt) : null;
  const coachMethod = coach ? asOptionalString(coach.method) : null;

  const effectivePrompt = snapshotPrompt ?? coachPrompt;
  const effectiveMethod = snapshotMethod ?? coachMethod;

  const basePrompt = effectivePrompt
    ? `${effectivePrompt}\n\nCOACHING METHOD: ${effectiveMethod ?? ''}`
    : 'You are a helpful coaching assistant. Be concise and actionable.';

  // ── Orchestrator pre-response pipeline ──
  const modelProvider = isGeminiModelId(chatModel) ? 'gemini' : 'openrouter';
  const orchResult = await orchestratePreResponse({
    userId,
    sessionId: session_id,
    userMessage: user_message.trim(),
    triggerType: 'user_message',
    modelProvider,
    modelId: chatModel,
    baseSystemPrompt: basePrompt,
    userClient,
    serviceClient,
  });

  // Build response metadata for client
  const responseMeta = {
    run_id: orchResult.runId,
    memories_used: orchResult.memoryContext.length > 0,
    safety_note: !orchResult.riskBlocked && orchResult.systemPrompt.includes('--- SAFETY NOTE ---'),
    risk_blocked: orchResult.riskBlocked,
    is_minor: orchResult.isMinor,
    session_cap_reached: orchResult.sessionCapReached,
  };

  // If risk-blocked, return a safe crisis response and flush trace
  if (orchResult.riskBlocked && orchResult.crisisResponse) {
    const { data: crisisRow } = await userClient
      .from('session_messages')
      .insert({
        session_id,
        user_id: userId,
        role: 'assistant',
        content: orchResult.crisisResponse,
      })
      .select('id')
      .single();

    // Flush trace in background
    orchResult.trace.flush(serviceClient, 'completed').catch((err) =>
      console.error('[chat-stream] crisis trace flush error:', err)
    );

    const crisisStream = new ReadableStream({
      start(controller) {
        const enc = new TextEncoder();
        controller.enqueue(enc.encode(encodeSseEvent('meta', responseMeta)));
        controller.enqueue(enc.encode(encodeSseEvent('token', { t: orchResult.crisisResponse! })));
        controller.enqueue(
          enc.encode(
            encodeSseEvent('done', {
              message_id: crisisRow?.id ?? null,
              artifacts: [],
              credits_debited: 0,
              credits_remaining: null,
            })
          )
        );
        controller.close();
      },
    });

    return new Response(crisisStream, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  }

  const messages = [
    { role: 'system', content: orchResult.systemPrompt },
    ...(history || []).map((item) => ({ role: item.role, content: item.content })),
  ];

  const estimatedInputTokens = Math.max(400, Math.ceil(JSON.stringify(messages).length / 4));
  const preflightUsage: UsageUnits = {
    inputTokens: estimatedInputTokens,
    outputTokens: 600,
  };
  const preflightUsd = await calculateUsdCost(serviceClient, chatModel, preflightUsage);
  const preflightMcredits = Math.max(100, mcreditsFromUsd(preflightUsd));

  try {
    assertSufficientBalance(creditStatus, preflightMcredits);
  } catch (error) {
    if (error instanceof BillingError && error.kind === 'insufficient_credits') {
      return new Response(buildInsufficientCreditsBody(), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    throw error;
  }

  // ── LLM call with fallback ──
  let activeChatModel = chatModel;
  const failedModels: string[] = [];
  let openRouterResponse: Response | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      openRouterResponse = await openRouterChat({
        model: activeChatModel,
        stream: true,
        stream_options: { include_usage: true },
        messages,
      });

      if (openRouterResponse.ok) break;

      // Non-OK response — try fallback
      failedModels.push(activeChatModel);
      const nextModel = getNextFallbackModel(failedModels);
      if (!nextModel) break; // chain exhausted
      console.warn(`[chat-stream] Model ${activeChatModel} returned ${openRouterResponse.status}, falling back to ${nextModel}`);
      activeChatModel = nextModel;
    } catch (err) {
      failedModels.push(activeChatModel);
      const nextModel = getNextFallbackModel(failedModels);
      if (!nextModel) throw err; // chain exhausted, rethrow
      console.warn(`[chat-stream] Model ${activeChatModel} failed, falling back to ${nextModel}:`, err);
      activeChatModel = nextModel;
    }
  }

  if (!openRouterResponse || !openRouterResponse.ok) {
    return new Response('All models failed', { status: 502, headers: corsHeaders });
  }

  const encoder = new TextEncoder();
  let assistantText = '';
  let providerUsage: UsageUnits | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      // Emit metadata event before tokens
      controller.enqueue(encoder.encode(encodeSseEvent('meta', responseMeta)));

      const reader = openRouterResponse.body?.getReader();
      if (!reader) {
        controller.enqueue(encoder.encode(encodeSseEvent('error', { message: 'No stream body' })));
        controller.close();
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          const parsed = parseOpenRouterSseChunkWithUsage(part + '\n\n');
          for (const token of parsed.tokens) {
            assistantText += token;
            controller.enqueue(encoder.encode(encodeSseEvent('token', { t: token })));
          }
          const usage = usageFromOpenRouterUsage(parsed.usage);
          if (usage) {
            providerUsage = usage;
          }
        }
      }

      if (buffer) {
        const parsed = parseOpenRouterSseChunkWithUsage(buffer);
        for (const token of parsed.tokens) {
          assistantText += token;
          controller.enqueue(encoder.encode(encodeSseEvent('token', { t: token })));
        }
        const usage = usageFromOpenRouterUsage(parsed.usage);
        if (usage) {
          providerUsage = usage;
        }
      }

      const finalMessage = assistantText || 'I am here to help. What would you like to focus on?';
      const { data: assistantRow } = await userClient
        .from('session_messages')
        .insert({
          session_id,
          user_id: userId,
          role: 'assistant',
          content: finalMessage,
        })
        .select('id')
        .single();

      const meteredUsage =
        providerUsage ?? estimateChatUsageFromText(JSON.stringify(messages), finalMessage);

      let debitedMcredits = 0;
      let remainingMcredits: number | null = null;

      try {
        const debit = await debitForUsage(serviceClient, {
          userId,
          endpoint: 'chat-stream',
          modelId: chatModel,
          usage: meteredUsage,
          requestId: `chat:${session_id}:${Date.now()}`,
          metadata: {
            tier: tierResult.tier,
            tier_source: tierResult.source,
            provider_usage: providerUsage !== null,
          },
        });
        debitedMcredits = debit.debitedMcredits;
        remainingMcredits = Number.isFinite(debit.remainingMcredits) ? debit.remainingMcredits : null;
      } catch (error) {
        if (error instanceof BillingError) {
          console.warn('[Billing] Failed to debit chat usage:', error.message);
        } else {
          console.warn('[Billing] Unexpected chat debit error:', error);
        }
      }

      controller.enqueue(
        encoder.encode(
          encodeSseEvent('done', {
            message_id: assistantRow?.id ?? null,
            artifacts: [],
            credits_debited: debitedMcredits / 1000,
            credits_remaining: remainingMcredits !== null ? remainingMcredits / 1000 : null,
          })
        )
      );

      // ── Orchestrator post-response pipeline (fire-and-forget) ──
      orchestratePostResponse(serviceClient, {
        userId,
        sessionId: session_id,
        userMessage: user_message.trim(),
        assistantMessage: finalMessage,
        trace: orchResult.trace,
      }).catch((err) =>
        console.error('[chat-stream] post-response error:', err)
      );

      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
});
