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

interface AskHistoryBody {
  query: string;
}

serve(async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  let payload: AskHistoryBody;
  try {
    payload = await request.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400, headers: corsHeaders });
  }

  if (!payload.query?.trim()) {
    return new Response('Missing query', { status: 400, headers: corsHeaders });
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

  const prompt = `Answer this question based on the user's coaching history. If there is not enough information, say so and suggest what to ask next.

Question: ${payload.query}`;

  const preflightUsage: UsageUnits = {
    inputTokens: Math.max(350, Math.ceil(prompt.length / 4)),
    outputTokens: 500,
  };
  const preflightUsd = await calculateUsdCost(serviceClient, model, preflightUsage);
  const preflightMcredits = Math.max(45, mcreditsFromUsd(preflightUsd));

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

  let answer = 'I searched your history and found themes around clarity and consistency. Try asking about a specific coach or time period for more detail.';
  let usageForDebit: UsageUnits | null = null;

  try {
    const openRouterResponse = await openRouterChat({
      model,
      messages: [
        { role: 'system', content: 'Be concise, warm, and specific.' },
        { role: 'user', content: prompt },
      ],
    });

    const data = await openRouterResponse.json();
    const content = extractOpenRouterMessageContent(data);
    if (content.trim()) {
      answer = content.trim();
    }
    usageForDebit = extractOpenRouterUsage(data);
  } catch {
    // Keep fallback answer.
  }

  try {
    await debitForUsage(serviceClient, {
      userId,
      endpoint: 'archive-ask-history',
      modelId: model,
      usage: usageForDebit ?? preflightUsage,
      requestId: `history-ask:${Date.now()}`,
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
    console.error('[Billing] Archive ask history debit failure:', error);
    return new Response(
      JSON.stringify({
        code: 'ARCHIVE_ASK_BILLING_FAILED',
        message: 'Failed to finalize billing for archive ask.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { data, error } = await userClient
    .from('history_queries')
    .insert({
      user_id: userId,
      query: payload.query,
      response: answer,
      sources: [],
    })
    .select('*')
    .single();

  if (error) {
    return new Response('Failed to save history query', { status: 500, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ answer, sources: [], record: data }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
