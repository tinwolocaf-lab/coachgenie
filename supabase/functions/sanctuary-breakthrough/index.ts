import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';
import { extractOpenRouterMessageContent, extractOpenRouterUsage, openRouterChat } from '../_shared/openrouter.ts';
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
  mcreditsFromUsd,
  type UsageUnits,
} from '../_shared/billing.ts';

interface BreakthroughBody {
  session_id: string;
}

serve(async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  let payload: BreakthroughBody;
  try {
    payload = await request.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400, headers: corsHeaders });
  }

  if (!payload.session_id) {
    return new Response('Missing session_id', { status: 400, headers: corsHeaders });
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
  const model = await resolveChatModelForTier(serviceClient, tierResult.tier);

  const { data: session, error: sessionError } = await userClient
    .from('coaching_sessions')
    .select('id')
    .eq('id', payload.session_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (sessionError || !session) {
    return new Response('Session not found', { status: 404, headers: corsHeaders });
  }

  const { data: messages } = await userClient
    .from('session_messages')
    .select('role, content')
    .eq('session_id', payload.session_id)
    .order('created_at', { ascending: true })
    .limit(20);

  const transcript = (messages || [])
    .map((item) => `${item.role === 'user' ? 'User' : 'Coach'}: ${item.content}`)
    .join('\n');

  const prompt = `Generate a breakthrough summary in JSON format.
{
  "title": "...",
  "summary": "...",
  "keyTakeaways": ["..."],
  "actionItems": [
    {"id":"1","title":"...","completed":false}
  ]
}

Session transcript:
${transcript}`;

  const preflightUsage: UsageUnits = {
    inputTokens: Math.max(700, Math.ceil(prompt.length / 4)),
    outputTokens: 900,
  };
  const preflightUsd = await calculateUsdCost(serviceClient, model, preflightUsage);
  const preflightMcredits = Math.max(110, mcreditsFromUsd(preflightUsd));

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

  try {
    const openRouterResponse = await openRouterChat({
      model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: 'Return only valid JSON.' },
        { role: 'user', content: prompt },
      ],
    });

    const data = await openRouterResponse.json();
    const content = extractOpenRouterMessageContent(data);
    const parsed = JSON.parse(content);
    const usage = extractOpenRouterUsage(data);

    try {
      await debitForUsage(serviceClient, {
        userId,
        endpoint: 'sanctuary-breakthrough',
        modelId: model,
        usage: usage ?? preflightUsage,
        requestId: `breakthrough:${payload.session_id}:${Date.now()}`,
        metadata: {
          tier: tierResult.tier,
          tier_source: tierResult.source,
          provider_usage: usage !== null,
        },
      });
    } catch (error) {
      if (error instanceof BillingError && error.kind === 'insufficient_credits') {
        return new Response(buildInsufficientCreditsBody(), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.error('[Billing] Breakthrough debit failure:', error);
      return new Response(
        JSON.stringify({
          code: 'BREAKTHROUGH_BILLING_FAILED',
          message: 'Failed to finalize billing for breakthrough generation.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch {
    const fallback = {
      title: 'Session Reflection',
      summary: 'A meaningful conversation exploring your goals and potential.',
      keyTakeaways: ['Every conversation plants seeds for growth.'],
      actionItems: [{ id: `action-${Date.now()}`, title: 'Reflect on today\'s conversation', completed: false }],
    };

    return new Response(JSON.stringify(fallback), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
