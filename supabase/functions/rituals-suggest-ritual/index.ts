import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';
import { openRouterChat } from '../_shared/openrouter.ts';

interface SuggestRitualBody {
  insight_title: string;
  insight_content: string;
  existing_rituals: string[];
}

serve(async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  let payload: SuggestRitualBody;
  try {
    payload = await request.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400, headers: corsHeaders });
  }

  if (!payload.insight_title || !payload.insight_content) {
    return new Response('Missing insight data', { status: 400, headers: corsHeaders });
  }

  try {
    await requireAuth(request);
  } catch (error) {
    return new Response((error as Error).message, { status: 401, headers: corsHeaders });
  }

  const model = Deno.env.get('OPENROUTER_JSON_MODEL')
    ?? Deno.env.get('OPENROUTER_CHAT_MODEL')
    ?? 'openai/gpt-4o-mini';

  const prompt = `Based on this coaching insight, suggest a daily ritual.

INSIGHT: "${payload.insight_title}"
${payload.insight_content}

Existing rituals (avoid duplicates):
${(payload.existing_rituals || []).join(', ') || 'None'}

Return JSON:
{"title":"Short ritual name","description":"Brief description"}`;

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

    return new Response(JSON.stringify({
      title: parsed.title || 'Daily Ritual',
      description: parsed.description || 'A daily ritual inspired by this insight.',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({
      title: 'Daily Ritual',
      description: 'A daily ritual inspired by this insight.',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
