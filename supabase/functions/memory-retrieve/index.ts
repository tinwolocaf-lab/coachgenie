import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import {
  searchMemories,
  formatMemoriesForPrompt,
  type MemoryType,
} from '../_shared/memory.ts';

interface RetrieveBody {
  query: string;
  limit?: number;
  memory_types?: MemoryType[];
  min_similarity?: number;
  format?: 'raw' | 'prompt';
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

  let body: RetrieveBody;
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400, headers: corsHeaders });
  }

  if (!body.query?.trim()) {
    return new Response(
      JSON.stringify({ error: 'Missing required field: query' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const serviceClient = createServiceClient();

  try {
    const result = await searchMemories(serviceClient, {
      userId: auth.userId,
      query: body.query.trim(),
      limit: body.limit,
      memoryTypes: body.memory_types,
      minSimilarity: body.min_similarity,
    });

    const responseBody: Record<string, unknown> = {
      memories: result.memories,
      total_found: result.totalFound,
    };

    if (body.format === 'prompt') {
      responseBody.prompt_text = formatMemoriesForPrompt(result.memories);
    }

    return new Response(
      JSON.stringify(responseBody),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[memory-retrieve] Error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
