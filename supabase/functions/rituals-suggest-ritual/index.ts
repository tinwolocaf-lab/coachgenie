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

interface SuggestRitualBody {
  insight_title: string;
  insight_content: string;
  existing_rituals: string[];
}

serve(async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  let payload: SuggestRitualBody;
  try {
    payload = await request.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400, headers: corsHeaders });
  }

  if (!payload.insight_title || !payload.insight_content) {
    return new Response('Missing insight data', { status: 400, headers: corsHeaders });
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

  const prompt = `Based on this coaching insight, suggest a daily ritual.

INSIGHT: "${payload.insight_title}"
${payload.insight_content}

Existing rituals (avoid duplicates):
${(payload.existing_rituals || []).join(', ') || 'None'}

Return JSON:
{"title":"Short ritual name","description":"Brief description"}`;

  const preflightUsage: UsageUnits = {
    inputTokens: Math.max(350, Math.ceil(prompt.length / 4)),
    outputTokens: 180,
  };
  const preflightUsd = await calculateUsdCost(serviceClient, model, preflightUsage);
  const preflightMcredits = Math.max(30, mcreditsFromUsd(preflightUsd));

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
        endpoint: 'rituals-suggest-ritual',
        modelId: model,
        usage: usage ?? preflightUsage,
        requestId: `ritual-suggest:${Date.now()}`,
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
      console.error('[Billing] Ritual suggestion debit failure:', error);
      return new Response(
        JSON.stringify({
          code: 'RITUAL_SUGGEST_BILLING_FAILED',
          message: 'Failed to finalize billing for ritual suggestion.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        title: parsed.title || 'Daily Ritual',
        description: parsed.description || 'A daily ritual inspired by this insight.',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch {
    return new Response(
      JSON.stringify({
        title: 'Daily Ritual',
        description: 'A daily ritual inspired by this insight.',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
