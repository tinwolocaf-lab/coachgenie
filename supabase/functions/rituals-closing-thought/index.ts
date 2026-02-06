import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';
import { openRouterChat } from '../_shared/openrouter.ts';

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

  try {
    await requireAuth(request);
  } catch (error) {
    return new Response((error as Error).message, { status: 401, headers: corsHeaders });
  }

  const model = Deno.env.get('OPENROUTER_CHAT_MODEL') ?? 'openai/gpt-4o-mini';

  const prompt = `You are a warm life coach providing a closing thought for someone's day.

Morning intention: ${payload.morning_intention || 'None'}
Wins: ${(payload.wins || []).join('; ') || 'None'}
Lessons: ${(payload.lessons || []).join('; ') || 'None'}
Ritual completion: ${payload.ritual_progress}%
Values: ${(payload.values || []).join(', ') || 'None'}
Goals: ${(payload.goals || []).join(', ') || 'None'}

Write a 2-3 sentence closing thought. Be gentle and encouraging. Return only the closing thought.`;

  try {
    const openRouterResponse = await openRouterChat({
      model,
      messages: [
        { role: 'system', content: 'Return only the closing thought.' },
        { role: 'user', content: prompt },
      ],
    });

    const data = await openRouterResponse.json();
    const content = data?.choices?.[0]?.message?.content ?? '';
    const thought = content.trim();

    return new Response(JSON.stringify({ thought: thought || 'Rest well—every effort today was a step forward.' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({ thought: 'Rest well—every effort today was a step forward.' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
