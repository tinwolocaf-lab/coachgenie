import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import {
  compactUserMemories,
  pruneExpiredMemories,
  compactAllUsers,
} from '../_shared/memory-compaction.ts';

/**
 * Memory compaction edge function.
 *
 * Can be invoked:
 *  - As a scheduled job (no body → compacts all users)
 *  - With a specific user_id in the body (single-user compaction)
 *
 * Requires service-role auth (no user auth needed since this is a system job).
 */
serve(async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  // Verify service-role authorization
  const authHeader = request.headers.get('authorization') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const bearerToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : '';
  const rawToken = authHeader.trim();

  if (!serviceKey) {
    return new Response(
      JSON.stringify({ error: 'Server misconfiguration: missing SUPABASE_SERVICE_ROLE_KEY' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  if (bearerToken !== serviceKey && rawToken !== serviceKey) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const serviceClient = createServiceClient();

  let body: { user_id?: string } = {};
  try {
    body = await request.json();
  } catch {
    // No body = compact all users
  }

  try {
    if (body.user_id) {
      // Single user compaction
      const compactResult = await compactUserMemories(serviceClient, body.user_id);
      const pruned = await pruneExpiredMemories(serviceClient, body.user_id);
      compactResult.memoriesPruned = pruned;

      return new Response(
        JSON.stringify({ results: [compactResult] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // All users compaction
    const results = await compactAllUsers(serviceClient);

    return new Response(
      JSON.stringify({
        users_processed: results.length,
        total_episodic_processed: results.reduce((s, r) => s + r.episodicProcessed, 0),
        total_summaries_created: results.reduce((s, r) => s + r.summariesCreated, 0),
        total_pruned: results.reduce((s, r) => s + r.memoriesPruned, 0),
        results,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[memory-compact] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
