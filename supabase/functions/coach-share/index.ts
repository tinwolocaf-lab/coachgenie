import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';

interface CoachConfig {
  name: string;
  system_prompt: string;
  method: string;
  icon_name: string;
  color: string;
}

interface CreateShareRequest {
  action: 'create';
  coach_id: string;
  coach_config: CoachConfig;
}

interface ResolveShareRequest {
  action: 'resolve';
  share_id: string;
}

interface CreateShareResponse {
  share_id: string;
  share_url: string;
}

interface ResolveShareResponse {
  coach_config: CoachConfig;
  creator_id: string;
}

// Generate a random 8-character alphanumeric string
function generateShareId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

serve(async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  let payload: CreateShareRequest | ResolveShareRequest;
  try {
    payload = await request.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400, headers: corsHeaders });
  }

  // Validate action field
  if (!payload.action || (payload.action !== 'create' && payload.action !== 'resolve')) {
    return new Response('Missing or invalid action field', { status: 400, headers: corsHeaders });
  }

  let auth;
  try {
    auth = await requireAuth(request);
  } catch (error) {
    return new Response((error as Error).message, { status: 401, headers: corsHeaders });
  }

  const { userClient, userId } = auth;

  try {
    // Handle CREATE action
    if (payload.action === 'create') {
      const createPayload = payload as CreateShareRequest;

      // Validate required fields
      if (!createPayload.coach_id || !createPayload.coach_config) {
        return new Response('Missing coach_id or coach_config', { status: 400, headers: corsHeaders });
      }

      const config = createPayload.coach_config;
      if (!config.name || !config.system_prompt || !config.method || !config.icon_name || !config.color) {
        return new Response('Incomplete coach_config: missing required fields', { status: 400, headers: corsHeaders });
      }

      // Generate unique share_id
      let shareId: string;
      let isUnique = false;
      let attempts = 0;

      while (!isUnique && attempts < 10) {
        shareId = generateShareId();
        const { data: existing } = await userClient
          .from('coach_shares')
          .select('id')
          .eq('share_id', shareId)
          .single();

        if (!existing) {
          isUnique = true;
        }
        attempts++;
      }

      if (!isUnique) {
        return new Response('Failed to generate unique share_id', { status: 500, headers: corsHeaders });
      }

      // Insert into coach_shares table
      const { data: shareRow, error: insertError } = await userClient
        .from('coach_shares')
        .insert({
          share_id: shareId,
          coach_id: createPayload.coach_id,
          creator_id: userId,
          coach_config: config,
          uses_count: 0,
          is_active: true,
        })
        .select('share_id')
        .single();

      if (insertError || !shareRow) {
        console.error('Insert error:', insertError);
        return new Response('Failed to create coach share', { status: 500, headers: corsHeaders });
      }

      const response: CreateShareResponse = {
        share_id: shareRow.share_id,
        share_url: `coachgenie://coach/share/${shareRow.share_id}`,
      };

      return new Response(JSON.stringify(response), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle RESOLVE action
    if (payload.action === 'resolve') {
      const resolvePayload = payload as ResolveShareRequest;

      // Validate required field
      if (!resolvePayload.share_id) {
        return new Response('Missing share_id', { status: 400, headers: corsHeaders });
      }

      // Query coach_shares table
      const { data: shareData, error: queryError } = await userClient
        .from('coach_shares')
        .select('coach_config, creator_id, uses_count')
        .eq('share_id', resolvePayload.share_id)
        .eq('is_active', true)
        .single();

      if (queryError || !shareData) {
        return new Response('Coach share not found or inactive', { status: 404, headers: corsHeaders });
      }

      // Increment uses_count
      const { error: updateError } = await userClient
        .from('coach_shares')
        .update({ uses_count: shareData.uses_count + 1 })
        .eq('share_id', resolvePayload.share_id);

      if (updateError) {
        console.error('Update error:', updateError);
        // Continue anyway, the share was still resolved
      }

      const response: ResolveShareResponse = {
        coach_config: shareData.coach_config,
        creator_id: shareData.creator_id,
      };

      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Should not reach here
    return new Response('Invalid action', { status: 400, headers: corsHeaders });
  } catch (error) {
    console.error('Error in coach-share function:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process coach share request',
        details: (error as Error).message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
