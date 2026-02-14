import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { ensureActiveCreditAccount, creditStatusResponsePayload } from '../_shared/billing.ts';
import { resolveBillingTier } from '../_shared/revenuecat.ts';
import { getTierModelAllowlist } from '../_shared/modelCatalog.ts';

serve(async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;

  if (request.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  let auth;
  try {
    auth = await requireAuth(request);
  } catch (error) {
    return new Response((error as Error).message, { status: 401, headers: corsHeaders });
  }

  const { userId } = auth;
  const serviceClient = createServiceClient();

  try {
    const tierResult = await resolveBillingTier(serviceClient, userId);
    const status = await ensureActiveCreditAccount(
      serviceClient,
      userId,
      tierResult.tier,
      {
        tierSource: tierResult.source,
        trialTier: tierResult.trialTier,
        trialEndsAt: tierResult.trialEndsAt,
      }
    );
    const trialActive =
      tierResult.trialTier !== null &&
      typeof tierResult.trialEndsAt === 'string' &&
      new Date(tierResult.trialEndsAt).getTime() > Date.now();

    const { data: pref } = await serviceClient
      .from('user_model_preferences')
      .select('preferred_chat_model')
      .eq('user_id', userId)
      .maybeSingle();

    const allowlist = await getTierModelAllowlist(serviceClient, tierResult.tier);
    const allowlistIds = new Set(allowlist.map((entry) => entry.modelId));
    const defaultModel = (allowlist.find((entry) => entry.isDefault) ?? allowlist[0])?.modelId ?? null;
    const preferredModel =
      typeof pref?.preferred_chat_model === 'string' && allowlistIds.has(pref.preferred_chat_model)
        ? pref.preferred_chat_model
        : defaultModel;

    return new Response(
      JSON.stringify({
        ...creditStatusResponsePayload(status),
        preferred_chat_model: preferredModel,
        tier_source: tierResult.source,
        paid_tier: tierResult.paidTier,
        trial_tier: tierResult.trialTier,
        trial_active: trialActive,
        trial_end: tierResult.trialEndsAt,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        code: 'BILLING_STATUS_FAILED',
        message: error instanceof Error ? error.message : 'Failed to load credit status',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
