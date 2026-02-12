import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';
import { encodeSseEvent } from '../_shared/sse.ts';
import { openRouterChat, parseOpenRouterSseChunk } from '../_shared/openrouter.ts';
import { buildEnrichedSystemPrompt } from '../_shared/context-builder.ts';

interface ChatStreamBody {
  session_id: string;
  user_message: string;
  client_context?: Record<string, unknown>;
  subscription_tier?: 'free' | 'sovereign' | 'oracle';
}

const TIER_MODELS: Record<string, string> = {
  free: 'google/gemini-2.5-flash-lite',
  sovereign: 'openai/gpt-4o-mini',
  oracle: 'anthropic/claude-sonnet-4.5',
};

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
  const tier = payload.subscription_tier || 'free';
  const tierModel = TIER_MODELS[tier];
  const chatModel = tierModel || Deno.env.get('OPENROUTER_CHAT_MODEL') || 'openai/gpt-4o-mini';

  const { data: session, error: sessionError } = await userClient
    .from('coaching_sessions')
    .select('id, coach_id')
    .eq('id', session_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (sessionError || !session) {
    return new Response('Session not found', { status: 404, headers: corsHeaders });
  }

  const { error: insertUserError } = await userClient
    .from('session_messages')
    .insert({
      session_id,
      user_id: userId,
      role: 'user',
      content: user_message.trim(),
    });

  if (insertUserError) {
    return new Response(`Failed to save user message: ${insertUserError.message}`, { status: 500, headers: corsHeaders });
  }

  const { data: coach } = await userClient
    .from('coaches')
    .select('name, system_prompt, method')
    .eq('id', session.coach_id ?? '')
    .maybeSingle();

  const { data: history } = await userClient
    .from('session_messages')
    .select('role, content')
    .eq('session_id', session_id)
    .order('created_at', { ascending: true })
    .limit(12);

  const basePrompt = coach?.system_prompt
    ? `${coach.system_prompt}\n\nCOACHING METHOD: ${coach?.method ?? ''}`
    : 'You are a helpful coaching assistant. Be concise and actionable.';

  const systemPrompt = await buildEnrichedSystemPrompt(userId, basePrompt, userClient);

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

      const { data: assistantRow } = await userClient
        .from('session_messages')
        .insert({
          session_id,
          user_id: userId,
          role: 'assistant',
          content: assistantText || 'I am here to help. What would you like to focus on?',
        })
        .select('id')
        .single();

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
