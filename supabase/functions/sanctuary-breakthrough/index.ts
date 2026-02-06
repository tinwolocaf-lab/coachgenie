import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';
import { openRouterChat } from '../_shared/openrouter.ts';

interface BreakthroughBody {
  session_id: string;
}

interface PostgrestLikeError {
  code?: string;
  message?: string;
}

function isMissingTableError(error: PostgrestLikeError | null, table: string): boolean {
  return error?.code === 'PGRST205'
    && typeof error.message === 'string'
    && error.message.includes(`'public.${table}'`);
}

serve(async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  let payload: BreakthroughBody;
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

  let { data: session, error: sessionError } = await userClient
    .from('coaching_sessions')
    .select('id')
    .eq('id', payload.session_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (isMissingTableError(sessionError as PostgrestLikeError | null, 'coaching_sessions')) {
    const legacySession = await userClient
      .from('sessions')
      .select('id')
      .eq('id', payload.session_id)
      .eq('user_id', userId)
      .maybeSingle();
    session = legacySession.data;
    sessionError = legacySession.error;
  }

  if (sessionError || !session) {
    return new Response('Session not found', { status: 404, headers: corsHeaders });
  }

  const { data: messages } = await userClient
    .from('session_messages')
    .select('role, content')
    .eq('session_id', payload.session_id)
    .order('created_at', { ascending: true })
    .limit(20);

  const transcript = (messages || [])
    .map((m) => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.content}`)
    .join('\n');

  const prompt = `Generate a breakthrough summary in JSON format.
{
  "title": "...",
  "summary": "...",
  "keyTakeaways": ["..."],
  "actionItems": [
    {"id":"1","title":"...","completed":false}
  ]
}

Session transcript:
${transcript}`;

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

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch {
    const fallback = {
      title: 'Session Reflection',
      summary: 'A meaningful conversation exploring your goals and potential.',
      keyTakeaways: ['Every conversation plants seeds for growth.'],
      actionItems: [
        { id: `action-${Date.now()}`, title: 'Reflect on today\'s conversation', completed: false },
      ],
    };

    return new Response(JSON.stringify(fallback), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
