import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { storeMemory, type MemoryType, type SourceType } from '../_shared/memory.ts';

interface UpsertBody {
  memory_type: MemoryType;
  source_type: SourceType;
  source_id?: string;
  content: string;
  salience_score?: number;
  metadata?: Record<string, unknown>;
}

serve(async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  let auth;
  try {
    auth = await requireAuth(request);
  } catch (error) {
    return new Response((error as Error).message, { status: 401, headers: corsHeaders });
  }

  let body: UpsertBody;
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400, headers: corsHeaders });
  }

  if (!body.content?.trim() || !body.memory_type || !body.source_type) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: content, memory_type, source_type' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const serviceClient = createServiceClient();

  try {
    const memoryId = await storeMemory(serviceClient, {
      userId: auth.userId,
      memoryType: body.memory_type,
      sourceType: body.source_type,
      sourceId: body.source_id,
      content: body.content.trim(),
      salienceScore: body.salience_score,
      metadata: body.metadata,
    });

    if (!memoryId) {
      return new Response(
        JSON.stringify({ error: 'Failed to store memory' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    return new Response(
      JSON.stringify({ id: memoryId }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[memory-upsert] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
