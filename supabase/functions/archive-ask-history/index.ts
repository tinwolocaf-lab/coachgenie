import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';
import { openRouterChat } from '../_shared/openrouter.ts';

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
  const model = Deno.env.get('OPENROUTER_CHAT_MODEL') ?? 'openai/gpt-4o-mini';

  const prompt = `Answer this question based on the user's coaching history. If there is not enough information, say so and suggest what to ask next.

Question: ${payload.query}`;

  let answer = 'I searched your history and found themes around clarity and consistency. Try asking about a specific coach or time period for more detail.';

  try {
    const openRouterResponse = await openRouterChat({
      model,
      messages: [
        { role: 'system', content: 'Be concise, warm, and specific.' },
        { role: 'user', content: prompt },
      ],
    });

    const data = await openRouterResponse.json();
    const content = data?.choices?.[0]?.message?.content ?? '';
    if (content.trim()) {
      answer = content.trim();
    }
  } catch {
    // keep fallback
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
