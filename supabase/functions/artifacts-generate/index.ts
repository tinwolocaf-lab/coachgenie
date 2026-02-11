import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';
import { openRouterChat } from '../_shared/openrouter.ts';

interface ArtifactsBody {
  session_id: string;
}

serve(async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  let payload: ArtifactsBody;
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

  const { data: messages } = await userClient
    .from('session_messages')
    .select('role, content, created_at')
    .eq('session_id', payload.session_id)
    .order('created_at', { ascending: true })
    .limit(20);

  const transcript = (messages || [])
    .map((m) => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.content}`)
    .join('\n');

  const prompt = `You are a coaching assistant. Summarize the session and extract next actions and a 7-day plan.

Return JSON with this shape:
{
  "summary": "...",
  "next_actions": [
    {"id":"1","title":"...","completed":false}
  ],
  "seven_day_plan": {
    "days": [
      {"day":"YYYY-MM-DD","top_3":["..."],"time_blocks":[],"notes":""}
    ]
  }
}

Session transcript:
${transcript}`;

  let summaryText = 'Session recap: Coaching session completed.';
  let nextActions: { id: string; title: string; completed: boolean }[] = [];
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

    summaryText = parsed.summary || summaryText;
    nextActions = parsed.next_actions || [];
    planDays = parsed.seven_day_plan?.days || [];
  } catch {
    const lastUserMessage = (messages || []).filter((m) => m.role === 'user').pop();
    summaryText = lastUserMessage
      ? `Session recap: ${lastUserMessage.content.slice(0, 160)}`
      : summaryText;

    nextActions = [
      { id: '1', title: 'Choose one small action to do today', completed: false },
      { id: '2', title: 'Block 30 minutes for focused progress', completed: false },
      { id: '3', title: 'Schedule your next check-in', completed: false },
    ];

    const today = new Date();
    planDays = Array.from({ length: 7 }).map((_, idx) => {
      const date = new Date(today);
      date.setDate(today.getDate() + idx);
      const day = date.toISOString().split('T')[0];

      return {
        day,
        top_3: [
          'Define today\'s top priority',
          'Complete one focused block',
          'Reflect and adjust tomorrow',
        ],
        time_blocks: [],
        notes: '',
      };
    });
  }

  const { data: summaryRow, error: summaryError } = await userClient
    .from('session_artifacts')
    .insert({
      session_id: payload.session_id,
      user_id: userId,
      type: 'summary',
      format: 'markdown',
      content: { text: summaryText },
    })
    .select('id')
    .single();

  const { data: actionsRow, error: actionsError } = await userClient
    .from('session_artifacts')
    .insert({
      session_id: payload.session_id,
      user_id: userId,
      type: 'next_actions',
      format: 'json',
      content: { items: nextActions },
    })
    .select('id')
    .single();

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

  if (summaryError || actionsError || planError) {
    return new Response('Failed to create artifacts', { status: 500, headers: corsHeaders });
  }

  return new Response(
    JSON.stringify({
      summary: { id: summaryRow?.id, text: summaryText },
      next_actions: { id: actionsRow?.id, items: nextActions },
      seven_day_plan: { id: planRow?.id, days: planDays },
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
