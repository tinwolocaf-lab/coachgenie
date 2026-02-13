import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { resolveBillingTier } from '../_shared/revenuecat.ts';
import { getTierModelAllowlist } from '../_shared/modelCatalog.ts';

interface SetPreferenceBody {
  model_id?: string;
}

serve(async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  let payload: SetPreferenceBody;
  try {
    payload = await request.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400, headers: corsHeaders });
  }

  if (!payload.model_id?.trim()) {
    return new Response(
      JSON.stringify({
        code: 'BAD_REQUEST',
        message: 'Missing model_id',
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
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
    const allowlist = await getTierModelAllowlist(serviceClient, tierResult.tier);
    const isAllowed = allowlist.some((item) => item.modelId === payload.model_id);

    if (!isAllowed) {
      return new Response(
        JSON.stringify({
          code: 'MODEL_NOT_ALLOWED',
          message: 'Selected model is not available for your current tier.',
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error } = await serviceClient.from('user_model_preferences').upsert(
      {
        user_id: userId,
        preferred_chat_model: payload.model_id,
      },
      { onConflict: 'user_id' }
    );

    if (error) {
      return new Response(
        JSON.stringify({
          code: 'PREFERENCE_SAVE_FAILED',
          message: error.message,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        preferred_model_id: payload.model_id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        code: 'PREFERENCE_SAVE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to save model preference',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
