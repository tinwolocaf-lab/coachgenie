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

interface ClosingThoughtBody {
  wins: string[];
  lessons: string[];
  morning_intention?: string | null;
  ritual_progress: number;
  values?: string[];
  goals?: string[];
}

serve(async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  let payload: ClosingThoughtBody;
  try {
    payload = await request.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400, headers: corsHeaders });
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

  const prompt = `You are a warm life coach providing a closing thought for someone's day.

Morning intention: ${payload.morning_intention || 'None'}
Wins: ${(payload.wins || []).join('; ') || 'None'}
Lessons: ${(payload.lessons || []).join('; ') || 'None'}
Ritual completion: ${payload.ritual_progress}%
Values: ${(payload.values || []).join(', ') || 'None'}
Goals: ${(payload.goals || []).join(', ') || 'None'}

Write a 2-3 sentence closing thought. Be gentle and encouraging. Return only the closing thought.`;

  const preflightUsage: UsageUnits = {
    inputTokens: Math.max(350, Math.ceil(prompt.length / 4)),
    outputTokens: 220,
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
        { role: 'system', content: 'Return only the closing thought.' },
        { role: 'user', content: prompt },
      ],
    });

    const data = await openRouterResponse.json();
    const content = extractOpenRouterMessageContent(data);
    const thought = content.trim();
    const usage = extractOpenRouterUsage(data);

    try {
      await debitForUsage(serviceClient, {
        userId,
        endpoint: 'rituals-closing-thought',
        modelId: model,
        usage: usage ?? preflightUsage,
        requestId: `closing-thought:${Date.now()}`,
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
      console.error('[Billing] Closing thought debit failure:', error);
      return new Response(
        JSON.stringify({
          code: 'CLOSING_THOUGHT_BILLING_FAILED',
          message: 'Failed to finalize billing for closing thought generation.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        thought: thought || 'Rest well—every effort today was a step forward.',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch {
    return new Response(JSON.stringify({ thought: 'Rest well—every effort today was a step forward.' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
