import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';
import { openRouterChat, parseOpenRouterSseChunk } from '../_shared/openrouter.ts';
import { encodeSseEvent } from '../_shared/sse.ts';

interface TranscribeBody {
  audio_base64: string;
  mime_type?: string;
  file_name?: string;
  stream?: boolean;
}

function getAudioFormat(mimeType?: string, fileName?: string): string {
  const fallback = 'm4a';
  if (mimeType) {
    if (mimeType.includes('wav')) return 'wav';
    if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3';
    if (mimeType.includes('webm')) return 'webm';
    if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'm4a';
  }

  if (fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext) return ext;
  }

  return fallback;
}

serve(async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  let payload: TranscribeBody;
  try {
    payload = await request.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400, headers: corsHeaders });
  }

  if (!payload.audio_base64?.trim()) {
    return new Response('Missing audio_base64', { status: 400, headers: corsHeaders });
  }

  try {
    await requireAuth(request);
  } catch (error) {
    return new Response((error as Error).message, { status: 401, headers: corsHeaders });
  }

  const model = Deno.env.get('OPENROUTER_AUDIO_MODEL')
    ?? Deno.env.get('OPENROUTER_CHAT_MODEL')
    ?? 'openai/gpt-4o-mini';

  const format = getAudioFormat(payload.mime_type, payload.file_name);
  const audioData = payload.audio_base64.includes(',')
    ? payload.audio_base64.split(',')[1]
    : payload.audio_base64;

  const messages = [
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Transcribe this audio verbatim. Return only the transcription.' },
        {
          type: 'input_audio',
          input_audio: {
            data: audioData,
            format,
          },
          inputAudio: {
            data: audioData,
            format,
          },
        },
      ],
    },
  ];

  const openRouterResponse = await openRouterChat({
    model,
    stream: true,
    messages,
  });

  const encoder = new TextEncoder();
  let fullText = '';

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
            fullText += token;
            controller.enqueue(encoder.encode(encodeSseEvent('token', { t: token })));
          }
        }
      }

      if (buffer) {
        const tokens = parseOpenRouterSseChunk(buffer);
        for (const token of tokens) {
          fullText += token;
          controller.enqueue(encoder.encode(encodeSseEvent('token', { t: token })));
        }
      }

      controller.enqueue(encoder.encode(encodeSseEvent('done', { text: fullText })));
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
