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

interface InsightTitleBody {
  content: string;
}

function fallbackTitle(content: string): string {
  const words = content
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5);

  if (words.length === 0) return 'Key Insight';
  return words.join(' ');
}

serve(async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  let payload: InsightTitleBody;
  try {
    payload = await request.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400, headers: corsHeaders });
  }

  if (!payload.content?.trim()) {
    return new Response('Missing content', { status: 400, headers: corsHeaders });
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

  const prompt = `Create a short, memorable 3-5 word title for this insight. Return only the title.

Insight: ${payload.content}`;

  const preflightUsage: UsageUnits = {
    inputTokens: Math.max(250, Math.ceil(prompt.length / 4)),
    outputTokens: 80,
  };
  const preflightUsd = await calculateUsdCost(serviceClient, model, preflightUsage);
  const preflightMcredits = Math.max(25, mcreditsFromUsd(preflightUsd));

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
        { role: 'system', content: 'Return only the title, no quotes.' },
        { role: 'user', content: prompt },
      ],
    });

    const data = await openRouterResponse.json();
    const content = data?.choices?.[0]?.message?.content ?? '';
    const title = content.trim().replace(/^"|"$/g, '').slice(0, 80);
    const usage = extractOpenRouterUsage(data);

    try {
      await debitForUsage(serviceClient, {
        userId,
        endpoint: 'sanctuary-insight-title',
        modelId: model,
        usage: usage ?? preflightUsage,
        requestId: `insight-title:${Date.now()}`,
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
      console.error('[Billing] Insight title debit failure:', error);
      return new Response(
        JSON.stringify({
          code: 'INSIGHT_TITLE_BILLING_FAILED',
          message: 'Failed to finalize billing for insight title.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ title: title || fallbackTitle(payload.content) }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ title: fallbackTitle(payload.content) }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
