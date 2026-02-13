import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';
import { extractOpenRouterUsage, openRouterChat } from '../_shared/openrouter.ts';
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

interface ExpandBody {
  point: string;
}

serve(async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  let payload: ExpandBody;
  try {
    payload = await request.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400, headers: corsHeaders });
  }

  if (!payload.point?.trim()) {
    return new Response('Missing point', { status: 400, headers: corsHeaders });
  }

  let auth;
  try {
    auth = await requireAuth(request);
  } catch (error) {
    return new Response((error as Error).message, { status: 401, headers: corsHeaders });
  }

  const { userId } = auth;
  const serviceClient = createServiceClient();
  const tierResult = await resolveBillingTier(serviceClient, userId);
  const creditStatus = await ensureActiveCreditAccount(serviceClient, userId, tierResult.tier);
  const model = await resolveChatModelForTier(serviceClient, tierResult.tier);

  const prompt = `Expand on this coaching point in 2-3 short paragraphs. Ask one reflective question at the end.

Point: ${payload.point}`;

  const preflightUsage: UsageUnits = {
    inputTokens: Math.max(300, Math.ceil(prompt.length / 4)),
    outputTokens: 300,
  };
  const preflightUsd = await calculateUsdCost(serviceClient, model, preflightUsage);
  const preflightMcredits = Math.max(35, mcreditsFromUsd(preflightUsd));

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
      messages: [
        { role: 'system', content: 'Be concise, supportive, and reflective.' },
        { role: 'user', content: prompt },
      ],
    });

    const data = await openRouterResponse.json();
    const content = data?.choices?.[0]?.message?.content ?? '';
    const usage = extractOpenRouterUsage(data);

    try {
      await debitForUsage(serviceClient, {
        userId,
        endpoint: 'sanctuary-expand',
        modelId: model,
        usage: usage ?? preflightUsage,
        requestId: `expand:${Date.now()}`,
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
      console.error('[Billing] Expansion debit failure:', error);
      return new Response(
        JSON.stringify({
          code: 'EXPANSION_BILLING_FAILED',
          message: 'Failed to finalize billing for expansion.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ expanded: content.trim() }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch {
    const fallback = `Let's explore that more deeply. You mentioned: "${payload.point}". What feels most important about this right now, and what small step would make it feel lighter today?`;
    return new Response(JSON.stringify({ expanded: fallback }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
