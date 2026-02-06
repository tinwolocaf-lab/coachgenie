import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';
import { encodeSseEvent } from '../_shared/sse.ts';
import { openRouterChat, parseOpenRouterSseChunk } from '../_shared/openrouter.ts';

interface ChatStreamBody {
  session_id: string;
  user_message: string;
  client_context?: Record<string, unknown>;
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

  let payload: ChatStreamBody;
  try {
    payload = await request.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400, headers: corsHeaders });
  }

  const { session_id, user_message } = payload;
  if (!session_id || !user_message?.trim()) {
    return new Response('Missing session_id or user_message', { status: 400, headers: corsHeaders });
  }

  let auth;
  try {
    auth = await requireAuth(request);
  } catch (error) {
    return new Response((error as Error).message, { status: 401, headers: corsHeaders });
  }

  const { userClient, userId } = auth;
  const chatModel = Deno.env.get('OPENROUTER_CHAT_MODEL') ?? 'openai/gpt-4o-mini';

  let { data: session, error: sessionError } = await userClient
    .from('coaching_sessions')
    .select('id, coach_id')
    .eq('id', session_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (isMissingTableError(sessionError as PostgrestLikeError | null, 'coaching_sessions')) {
    const legacySession = await userClient
      .from('sessions')
      .select('id, coach_id')
      .eq('id', session_id)
      .eq('user_id', userId)
      .maybeSingle();

    session = legacySession.data;
    sessionError = legacySession.error;
  }

  if (sessionError || !session) {
    return new Response('Session not found', { status: 404, headers: corsHeaders });
  }

  let { error: insertUserError } = await userClient
    .from('session_messages')
    .insert({
      session_id,
      user_id: userId,
      role: 'user',
      content: user_message.trim(),
    });

  if ((insertUserError as PostgrestLikeError | null)?.code === 'PGRST204') {
    const retry = await userClient
      .from('session_messages')
      .insert({
        session_id,
        role: 'user',
        content: user_message.trim(),
      });
    insertUserError = retry.error;
  }

  if (insertUserError) {
    return new Response('Failed to save user message', { status: 500, headers: corsHeaders });
  }

  let { data: coach } = await userClient
    .from('coaches')
    .select('name, system_prompt, method')
    .eq('id', session.coach_id ?? '')
    .maybeSingle();

  if (!coach) {
    const legacyCoach = await userClient
      .from('coaches')
      .select('name, description')
      .eq('id', session.coach_id ?? '')
      .maybeSingle();

    if (legacyCoach.data) {
      coach = {
        name: legacyCoach.data.name,
        system_prompt: legacyCoach.data.description,
        method: '',
      };
    }
  }

  const { data: history } = await userClient
    .from('session_messages')
    .select('role, content')
    .eq('session_id', session_id)
    .order('created_at', { ascending: true })
    .limit(12);

  const systemPrompt = coach?.system_prompt
    ? `${coach.system_prompt}\n\nCOACHING METHOD: ${coach?.method ?? ''}`
    : 'You are a helpful coaching assistant. Be concise and actionable.';

  const messages = [
    { role: 'system', content: systemPrompt },
    ...(history || []).map((m) => ({ role: m.role, content: m.content })),
  ];

  const openRouterResponse = await openRouterChat({
    model: chatModel,
    stream: true,
    messages,
  });

  const encoder = new TextEncoder();
  let assistantText = '';

  const stream = new ReadableStream({
    async start(controller) {
      const reader = openRouterResponse.body?.getReader();
      if (!reader) {
        controller.enqueue(encoder.encode(encodeSseEvent('error', { message: 'No stream body' })));
        controller.close();
        return;
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || '';

        for (const part of parts) {
          const tokens = parseOpenRouterSseChunk(part + '\n\n');
          for (const token of tokens) {
            assistantText += token;
            controller.enqueue(encoder.encode(encodeSseEvent('token', { t: token })));
          }
        }
      }

      if (buffer) {
        const tokens = parseOpenRouterSseChunk(buffer);
        for (const token of tokens) {
          assistantText += token;
          controller.enqueue(encoder.encode(encodeSseEvent('token', { t: token })));
        }
      }

      let { data: assistantRow } = await userClient
        .from('session_messages')
        .insert({
          session_id,
          user_id: userId,
          role: 'assistant',
          content: assistantText || 'I am here to help. What would you like to focus on?',
        })
        .select('id')
        .single();

      if (!assistantRow) {
        const retryInsert = await userClient
          .from('session_messages')
          .insert({
            session_id,
            role: 'assistant',
            content: assistantText || 'I am here to help. What would you like to focus on?',
          })
          .select('id')
          .single();
        assistantRow = retryInsert.data ?? null;
      }

      controller.enqueue(
        encoder.encode(
          encodeSseEvent('done', {
            message_id: assistantRow?.id ?? null,
            artifacts: [],
          })
        )
      );

      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
});
