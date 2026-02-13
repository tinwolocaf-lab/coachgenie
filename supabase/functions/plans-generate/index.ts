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

interface PlanBody {
  session_id: string;
  horizon_days?: number;
}

serve(async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  let payload: PlanBody;
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

  const horizon = Math.max(1, Math.min(payload.horizon_days ?? 7, 14));
  const today = new Date();
  const horizonDates = Array.from({ length: horizon }).map((_, idx) => {
    const date = new Date(today);
    date.setDate(today.getDate() + idx);
    return date.toISOString().split('T')[0];
  });

  const prompt = `Create a ${horizon}-day plan starting on ${horizonDates[0]}.
Return JSON:
{
  "days": [
    {"day":"YYYY-MM-DD","top_3":["..."],"time_blocks":[],"notes":""}
  ]
}`;

  const preflightUsage: UsageUnits = {
    inputTokens: Math.max(600, Math.ceil(prompt.length / 4)),
    outputTokens: 1200,
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

  let planDays: { day: string; top_3: string[]; time_blocks: unknown[]; notes: string }[] = [];
  let meteredUsage: UsageUnits | null = null;

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
    const content = data?.choices?.[0]?.message?.content ?? '';
    const parsed = JSON.parse(content);

    planDays = parsed.days || [];
    meteredUsage = extractOpenRouterUsage(data);
  } catch {
    planDays = horizonDates.map((day) => ({
      day,
      top_3: [
        'Define today\'s top priority',
        'Complete one focused block',
        'Reflect and adjust tomorrow',
      ],
      time_blocks: [],
      notes: '',
    }));
  }

  const debitUsage: UsageUnits =
    meteredUsage ?? {
      inputTokens: Math.max(600, Math.ceil(prompt.length / 4)),
      outputTokens: Math.max(500, Math.ceil(JSON.stringify(planDays).length / 4)),
    };

  try {
    await debitForUsage(serviceClient, {
      userId,
      endpoint: 'plans-generate',
      modelId: model,
      usage: debitUsage,
      requestId: `plan:${payload.session_id}:${Date.now()}`,
      metadata: {
        tier: tierResult.tier,
        tier_source: tierResult.source,
        provider_usage: meteredUsage !== null,
      },
    });
  } catch (error) {
    if (error instanceof BillingError && error.kind === 'insufficient_credits') {
      return new Response(buildInsufficientCreditsBody(), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.error('[Billing] Plan generation debit failure:', error);
    return new Response(
      JSON.stringify({
        code: 'PLAN_BILLING_FAILED',
        message: 'Failed to finalize billing for plan generation.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { data: planRow, error: planError } = await userClient
    .from('session_artifacts')
    .insert({
      session_id: payload.session_id,
      user_id: userId,
      type: 'seven_day_plan',
      format: 'json',
      content: { days: planDays },
    })
    .select('id')
    .single();

  if (planError) {
    return new Response('Failed to create plan artifact', { status: 500, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ artifact_id: planRow?.id, days: planDays }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
