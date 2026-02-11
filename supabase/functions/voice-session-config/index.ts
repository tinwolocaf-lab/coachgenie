import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';
import { buildEnrichedSystemPrompt } from '../_shared/context-builder.ts';

interface VoiceSessionConfigBody {
  coach_id: string;
  session_id: string;
  voiceName?: string;
}

interface SpeechConfig {
  voiceConfig: {
    prebuiltVoiceName: string;
  };
}

interface GenerationConfig {
  responseModalities: string[];
  speechConfig: SpeechConfig;
}

interface VoiceSessionResponse {
  model: string;
  systemInstruction: string;
  generationConfig: GenerationConfig;
  voiceName: string;
  apiKey: string;
}

serve(async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  let payload: VoiceSessionConfigBody;
  try {
    payload = await request.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400, headers: corsHeaders });
  }

  const { coach_id, session_id, voiceName = 'Kore' } = payload;
  if (!coach_id || !session_id) {
    return new Response('Missing coach_id or session_id', { status: 400, headers: corsHeaders });
  }

  let auth;
  try {
    auth = await requireAuth(request);
  } catch (error) {
    return new Response((error as Error).message, { status: 401, headers: corsHeaders });
  }

  const { userId, userClient } = auth;

  // Verify session belongs to user
  const { data: session, error: sessionError } = await userClient
    .from('coaching_sessions')
    .select('id, coach_id')
    .eq('id', session_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (sessionError || !session) {
    return new Response('Session not found', { status: 404, headers: corsHeaders });
  }

  // Fetch coach system_prompt and method
  const { data: coach, error: coachError } = await userClient
    .from('coaches')
    .select('system_prompt, method')
    .eq('id', coach_id)
    .maybeSingle();

  if (coachError || !coach) {
    return new Response('Coach not found', { status: 404, headers: corsHeaders });
  }

  // Build enriched system prompt
  const basePrompt = coach.system_prompt
    ? `${coach.system_prompt}\n\nCOACHING METHOD: ${coach.method ?? ''}`
    : 'You are a helpful coaching assistant. Be concise and actionable.';

  const enrichedSystemPrompt = await buildEnrichedSystemPrompt(userId, basePrompt, userClient);

  // Get Gemini API key and model from env
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    return new Response('Gemini API key not configured', { status: 500, headers: corsHeaders });
  }

  const model = Deno.env.get('GEMINI_LIVE_MODEL') || 'gemini-2.5-flash-native-audio-preview';

  const response: VoiceSessionResponse = {
    model,
    systemInstruction: enrichedSystemPrompt,
    generationConfig: {
      responseModalities: ['AUDIO'],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceName: voiceName,
        },
      },
    },
    voiceName,
    apiKey,
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
});
