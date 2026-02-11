import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';
import { openRouterChat } from '../_shared/openrouter.ts';

interface PlanBody {
  session_id: string;
  horizon_days?: number;
}

serve(async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  let payload: PlanBody;
  try {
    payload = await request.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400, headers: corsHeaders });
  }

  if (!payload.session_id) {
    return new Response('Missing session_id', { status: 400, headers: corsHeaders });
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

  const horizon = Math.max(1, Math.min(payload.horizon_days ?? 7, 14));
  const today = new Date();
  const horizonDates = Array.from({ length: horizon }).map((_, idx) => {
    const date = new Date(today);
    date.setDate(today.getDate() + idx);
    return date.toISOString().split('T')[0];
  });

  const prompt = `Create a ${horizon}-day plan starting on ${horizonDates[0]}.
Return JSON:
{
  "days": [
    {"day":"YYYY-MM-DD","top_3":["..."],"time_blocks":[],"notes":""}
  ]
}`;

  let planDays: { day: string; top_3: string[]; time_blocks: unknown[]; notes: string }[] = [];

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

    planDays = parsed.days || [];
  } catch {
    planDays = horizonDates.map((day) => ({
      day,
      top_3: [
        'Define today\'s top priority',
        'Complete one focused block',
        'Reflect and adjust tomorrow',
      ],
      time_blocks: [],
      notes: '',
    }));
  }

  const { data: planRow, error: planError } = await userClient
    .from('session_artifacts')
    .insert({
      session_id: payload.session_id,
      user_id: userId,
      type: 'seven_day_plan',
      format: 'json',
      content: { days: planDays },
    })
    .select('id')
    .single();

  if (planError) {
    return new Response('Failed to create plan artifact', { status: 500, headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({ artifact_id: planRow?.id, days: planDays }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
