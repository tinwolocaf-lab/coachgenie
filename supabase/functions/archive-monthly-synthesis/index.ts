import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';
import { openRouterChat } from '../_shared/openrouter.ts';

interface SynthesisBody {
  month_year: string; // YYYY-MM
}

serve(async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  let payload: SynthesisBody;
  try {
    payload = await request.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400, headers: corsHeaders });
  }

  if (!payload.month_year) {
    return new Response('Missing month_year', { status: 400, headers: corsHeaders });
  }

  let auth;
  try {
    auth = await requireAuth(request);
  } catch (error) {
    return new Response((error as Error).message, { status: 401, headers: corsHeaders });
  }

  const { userClient, userId } = auth;
  const model = Deno.env.get('OPENROUTER_JSON_MODEL')
    ?? Deno.env.get('OPENROUTER_CHAT_MODEL')
    ?? 'openai/gpt-4o-mini';

  const prompt = `Create a monthly synthesis for ${payload.month_year}.
Return JSON:
{
  "title": "...",
  "executive_summary": "...",
  "key_themes": [],
  "growth_areas": [],
  "patterns_identified": [],
  "coach_contributions": {},
  "breakthrough_count": 0,
  "insight_count": 0,
  "session_count": 0
}`;

  let synthesis = {
    user_id: userId,
    month_year: payload.month_year,
    title: 'A Month of Steady Progress',
    executive_summary: 'This month focused on steady, practical steps toward your goals.',
    key_themes: [],
    growth_areas: [],
    patterns_identified: [],
    coach_contributions: {},
    breakthrough_count: 0,
    insight_count: 0,
    session_count: 0,
  };

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

    synthesis = {
      user_id: userId,
      month_year: payload.month_year,
      title: parsed.title || synthesis.title,
      executive_summary: parsed.executive_summary || synthesis.executive_summary,
      key_themes: parsed.key_themes || [],
      growth_areas: parsed.growth_areas || [],
      patterns_identified: parsed.patterns_identified || [],
      coach_contributions: parsed.coach_contributions || {},
      breakthrough_count: parsed.breakthrough_count || 0,
      insight_count: parsed.insight_count || 0,
      session_count: parsed.session_count || 0,
    };
  } catch {
    // keep fallback
  }

  const { data, error } = await userClient
    .from('monthly_synthesis')
    .upsert(synthesis, { onConflict: 'user_id,month_year' })
    .select('*')
    .single();

  if (error) {
    return new Response('Failed to save synthesis', { status: 500, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ synthesis: data }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
