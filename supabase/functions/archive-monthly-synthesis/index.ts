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

interface SynthesisBody {
  month_year: string;
}

serve(async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  let payload: SynthesisBody;
  try {
    payload = await request.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400, headers: corsHeaders });
  }

  if (!payload.month_year) {
    return new Response('Missing month_year', { status: 400, headers: corsHeaders });
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
  const model = await resolveChatModelForTier(serviceClient, tierResult.tier);

  const prompt = `Create a monthly synthesis for ${payload.month_year}.
Return JSON:
{
  "title": "...",
  "executive_summary": "...",
  "key_themes": [],
  "growth_areas": [],
  "patterns_identified": [],
  "coach_contributions": {},
  "breakthrough_count": 0,
  "insight_count": 0,
  "session_count": 0
}`;

  const preflightUsage: UsageUnits = {
    inputTokens: Math.max(500, Math.ceil(prompt.length / 4)),
    outputTokens: 1400,
  };
  const preflightUsd = await calculateUsdCost(serviceClient, model, preflightUsage);
  const preflightMcredits = Math.max(120, mcreditsFromUsd(preflightUsd));

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

  let synthesis = {
    user_id: userId,
    month_year: payload.month_year,
    title: 'A Month of Steady Progress',
    executive_summary: 'This month focused on steady, practical steps toward your goals.',
    key_themes: [],
    growth_areas: [],
    patterns_identified: [],
    coach_contributions: {},
    breakthrough_count: 0,
    insight_count: 0,
    session_count: 0,
  };

  let usageForDebit: UsageUnits | null = null;

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

    synthesis = {
      user_id: userId,
      month_year: payload.month_year,
      title: parsed.title || synthesis.title,
      executive_summary: parsed.executive_summary || synthesis.executive_summary,
      key_themes: parsed.key_themes || [],
      growth_areas: parsed.growth_areas || [],
      patterns_identified: parsed.patterns_identified || [],
      coach_contributions: parsed.coach_contributions || {},
      breakthrough_count: parsed.breakthrough_count || 0,
      insight_count: parsed.insight_count || 0,
      session_count: parsed.session_count || 0,
    };
    usageForDebit = extractOpenRouterUsage(data);
  } catch {
    // Keep fallback synthesis payload.
  }

  try {
    await debitForUsage(serviceClient, {
      userId,
      endpoint: 'archive-monthly-synthesis',
      modelId: model,
      usage: usageForDebit ?? preflightUsage,
      requestId: `monthly-synthesis:${payload.month_year}:${Date.now()}`,
      metadata: {
        tier: tierResult.tier,
        tier_source: tierResult.source,
        provider_usage: usageForDebit !== null,
      },
    });
  } catch (error) {
    if (error instanceof BillingError && error.kind === 'insufficient_credits') {
      return new Response(buildInsufficientCreditsBody(), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.error('[Billing] Monthly synthesis debit failure:', error);
    return new Response(
      JSON.stringify({
        code: 'MONTHLY_SYNTHESIS_BILLING_FAILED',
        message: 'Failed to finalize billing for monthly synthesis.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { data, error } = await userClient
    .from('monthly_synthesis')
    .upsert(synthesis, { onConflict: 'user_id,month_year' })
    .select('*')
    .single();

  if (error) {
    return new Response('Failed to save synthesis', { status: 500, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ synthesis: data }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
