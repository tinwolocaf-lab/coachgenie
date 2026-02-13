import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';
import { encodeSseEvent } from '../_shared/sse.ts';
import {
  openRouterChat,
  parseOpenRouterSseChunkWithUsage,
  type OpenRouterUsage,
} from '../_shared/openrouter.ts';
import { buildEnrichedSystemPrompt } from '../_shared/context-builder.ts';
import { createServiceClient } from '../_shared/supabase.ts';
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

interface ChatStreamBody {
  session_id: string;
  user_message: string;
  client_context?: Record<string, unknown>;
  model_id?: string;
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

  const tierResult = await resolveBillingTier(serviceClient, userId);
  const creditStatus = await ensureActiveCreditAccount(serviceClient, userId, tierResult.tier);

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
    .select('id, coach_id')
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

  const { data: coach } = await userClient
    .from('coaches')
    .select('name, system_prompt, method')
    .eq('id', session.coach_id ?? '')
    .maybeSingle();

  const { data: history } = await userClient
    .from('session_messages')
    .select('role, content')
    .eq('session_id', session_id)
    .order('created_at', { ascending: true })
    .limit(12);

  const basePrompt = coach?.system_prompt
    ? `${coach.system_prompt}\n\nCOACHING METHOD: ${coach.method ?? ''}`
    : 'You are a helpful coaching assistant. Be concise and actionable.';

  const systemPrompt = await buildEnrichedSystemPrompt(userId, basePrompt, userClient);

  const messages = [
    { role: 'system', content: systemPrompt },
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

  const openRouterResponse = await openRouterChat({
    model: chatModel,
    stream: true,
    stream_options: { include_usage: true },
    messages,
  });

  const encoder = new TextEncoder();
  let assistantText = '';
  let providerUsage: UsageUnits | null = null;

  const stream = new ReadableStream({
    async start(controller) {
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
