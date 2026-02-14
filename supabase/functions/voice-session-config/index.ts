import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';
import { buildEnrichedSystemPrompt } from '../_shared/context-builder.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { resolveBillingTier } from '../_shared/revenuecat.ts';
import {
  assertSufficientBalance,
  BillingError,
  buildInsufficientCreditsBody,
  calculateUsdCost,
  ensureActiveCreditAccount,
  estimateLiveUsageFromDuration,
  holdCredits,
  mcreditsFromUsd,
  releaseCredits,
  type UsageUnits,
} from '../_shared/billing.ts';

interface VoiceSessionConfigBody {
  coach_id: string;
  session_id: string;
  voiceName?: string;
}

interface GeminiAuthTokenResponse {
  name?: string;
  expireTime?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asOptionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

const DEFAULT_LIVE_MODEL = 'gemini-2.5-flash-native-audio-preview';
const DEFAULT_HOLD_SECONDS = Number(Deno.env.get('VOICE_LIVE_DEFAULT_HOLD_SECONDS') ?? '300');
const MIN_HOLD_MCREDITS = Number(Deno.env.get('VOICE_LIVE_MIN_HOLD_MCREDITS') ?? '250');
const MAX_SYSTEM_PROMPT_LENGTH = 10_000;

function normalizeVoiceName(value: string | undefined): string {
  if (!value || value.trim().length === 0) {
    return 'Kore';
  }
  return value.trim().slice(0, 40);
}

function normalizeModel(value: string | undefined): string {
  if (!value || value.trim().length === 0) {
    return DEFAULT_LIVE_MODEL;
  }
  return value.startsWith('models/') ? value.replace(/^models\//, '') : value;
}

function buildLiveTools(): Array<Record<string, unknown>> {
  return [
    {
      functionDeclarations: [
        {
          name: 'save_insight',
          description: 'Save a key insight or breakthrough from the conversation',
          parameters: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Short title for the insight' },
              content: { type: 'string', description: 'The insight content' },
              category: {
                type: 'string',
                enum: ['mindset', 'strategy', 'productivity', 'systems', 'general'],
              },
            },
            required: ['title', 'content'],
          },
        },
        {
          name: 'create_action_item',
          description: 'Create an action item from the coaching conversation',
          parameters: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'The action item title' },
              priority: { type: 'string', enum: ['high', 'medium', 'low'] },
            },
            required: ['title'],
          },
        },
        {
          name: 'get_user_schedule',
          description: 'Retrieve the user schedule and calendar events for today',
          parameters: { type: 'object', properties: {} },
        },
      ],
    },
  ];
}

function buildHoldUsage(durationSeconds: number): UsageUnits {
  return estimateLiveUsageFromDuration(Math.max(60, Math.round(durationSeconds)));
}

function liveTokenRequestBody(params: {
  model: string;
  systemInstruction: string;
  voiceName: string;
  newSessionExpireTime: string;
  expireTime: string;
}): Record<string, unknown> {
  return {
    uses: 1,
    newSessionExpireTime: params.newSessionExpireTime,
    expireTime: params.expireTime,
    bidiGenerateContentSetup: {
      model: `models/${params.model}`,
      generationConfig: {
        responseModalities: ['AUDIO', 'TEXT'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: params.voiceName,
            },
          },
        },
      },
      systemInstruction: {
        parts: [{ text: params.systemInstruction.slice(0, MAX_SYSTEM_PROMPT_LENGTH) }],
      },
      tools: buildLiveTools(),
    },
  };
}

async function requestGeminiEphemeralToken(
  apiKey: string,
  body: Record<string, unknown>
): Promise<GeminiAuthTokenResponse> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1alpha/auth_tokens?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GEMINI_AUTH_TOKEN_FAILED:${response.status}:${text}`);
  }

  const payload = (await response.json()) as GeminiAuthTokenResponse;
  if (!payload.name || !payload.name.startsWith('auth_tokens/')) {
    throw new Error('GEMINI_AUTH_TOKEN_INVALID_RESPONSE');
  }

  return payload;
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

  const { coach_id, session_id } = payload;
  if (!coach_id || !session_id) {
    return new Response('Missing coach_id or session_id', { status: 400, headers: corsHeaders });
  }

  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiApiKey) {
    return new Response(
      JSON.stringify({
        code: 'VOICE_LIVE_NOT_CONFIGURED',
        message: 'Gemini API key is not configured for live voice.',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  let auth;
  try {
    auth = await requireAuth(request);
  } catch (error) {
    return new Response((error as Error).message, { status: 401, headers: corsHeaders });
  }

  const { userId, userClient } = auth;
  const serviceClient = createServiceClient();

  const { data: session, error: sessionError } = await userClient
    .from('coaching_sessions')
    .select('id, coach_id, coach_snapshot')
    .eq('id', session_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (sessionError || !session) {
    return new Response('Session not found', { status: 404, headers: corsHeaders });
  }

  const sessionCoachSnapshot = isRecord(session.coach_snapshot) ? session.coach_snapshot : null;

  let coach: Record<string, unknown> | null = null;
  const effectiveCoachId = (typeof session.coach_id === 'string' && session.coach_id.length > 0)
    ? session.coach_id
    : coach_id;

  if (effectiveCoachId) {
    const { data: coachRow, error: coachError } = await userClient
      .from('coaches')
      .select('*')
      .eq('id', effectiveCoachId)
      .maybeSingle();

    if (!coachError && coachRow) {
      coach = coachRow as Record<string, unknown>;
    }
  }

  const snapshotPrompt = sessionCoachSnapshot
    ? asOptionalString(sessionCoachSnapshot.system_prompt)
    : null;
  const snapshotMethod = sessionCoachSnapshot
    ? asOptionalString(sessionCoachSnapshot.method)
    : null;
  const coachPrompt = coach ? asOptionalString(coach.system_prompt) : null;
  const coachMethod = coach ? asOptionalString(coach.method) : null;

  const effectivePrompt = snapshotPrompt ?? coachPrompt;
  const effectiveMethod = snapshotMethod ?? coachMethod;

  const basePrompt = effectivePrompt
    ? `${effectivePrompt}\n\nCOACHING METHOD: ${effectiveMethod ?? ''}`
    : 'You are a helpful coaching assistant. Be concise and actionable.';
  const systemInstruction = await buildEnrichedSystemPrompt(userId, basePrompt, userClient);

  const voiceName = normalizeVoiceName(payload.voiceName);
  const model = normalizeModel(Deno.env.get('GEMINI_LIVE_MODEL'));

  const tierResult = await resolveBillingTier(serviceClient, userId);

  if (tierResult.tier === 'free') {
    return new Response(
      JSON.stringify({
        code: 'VOICE_TIER_REQUIRED',
        message: 'Voice messages are available on Sovereign and Oracle plans.',
      }),
      {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const creditStatus = await ensureActiveCreditAccount(serviceClient, userId, tierResult.tier);

  const holdUsage = buildHoldUsage(DEFAULT_HOLD_SECONDS);
  const holdUsd = await calculateUsdCost(serviceClient, model, holdUsage);
  const holdMcredits = Math.max(MIN_HOLD_MCREDITS, mcreditsFromUsd(holdUsd));

  try {
    assertSufficientBalance(creditStatus, holdMcredits);
  } catch (error) {
    if (error instanceof BillingError && error.kind === 'insufficient_credits') {
      return new Response(buildInsufficientCreditsBody('Not enough credits to start live voice mode.'), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    throw error;
  }

  const requestId = `voice-live:${session_id}:${Date.now()}`;

  let balanceAfterHold = 0;
  try {
    balanceAfterHold = await holdCredits(serviceClient, {
      userId,
      endpoint: 'voice-session-config',
      holdMcredits,
      modelId: model,
      requestId,
      metadata: {
        tier: tierResult.tier,
        tier_source: tierResult.source,
        hold_seconds: DEFAULT_HOLD_SECONDS,
      },
    });
  } catch (error) {
    if (error instanceof BillingError && error.kind === 'insufficient_credits') {
      return new Response(buildInsufficientCreditsBody('Not enough credits to start live voice mode.'), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.error('[VoiceLive] Credit hold failed:', error);

    return new Response(
      JSON.stringify({
        code: 'VOICE_LIVE_HOLD_FAILED',
        message: 'Failed to reserve credits for voice session.',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const { data: voiceSession, error: insertVoiceSessionError } = await serviceClient
    .from('voice_live_sessions')
    .insert({
      user_id: userId,
      session_id,
      coach_id,
      model_id: model,
      hold_mcredits: holdMcredits,
      usage_units: holdUsage,
      status: 'active',
    })
    .select('id')
    .single();

  if (insertVoiceSessionError || !voiceSession?.id) {
    console.error('[VoiceLive] Failed to create voice session row:', insertVoiceSessionError);
    try {
      await releaseCredits(serviceClient, {
        userId,
        endpoint: 'voice-session-config-rollback',
        releaseMcredits: holdMcredits,
        modelId: model,
        requestId: `${requestId}:rollback`,
        metadata: {
          reason: 'voice_session_insert_failed',
        },
      });
    } catch (releaseError) {
      console.error('[VoiceLive] Failed to rollback hold after session creation error:', releaseError);
    }

    return new Response(
      JSON.stringify({
        code: 'VOICE_LIVE_SESSION_CREATE_FAILED',
        message: 'Failed to create live voice session.',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const now = Date.now();
  const newSessionExpireTime = new Date(now + 5 * 60 * 1000).toISOString();
  const expireTime = new Date(now + 20 * 60 * 1000).toISOString();
  const tokenBody = liveTokenRequestBody({
    model,
    systemInstruction,
    voiceName,
    newSessionExpireTime,
    expireTime,
  });

  try {
    const token = await requestGeminiEphemeralToken(geminiApiKey, tokenBody);

    return new Response(
      JSON.stringify({
        model,
        systemInstruction,
        generationConfig: {
          responseModalities: ['AUDIO', 'TEXT'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName,
              },
            },
          },
        },
        voiceName,
        access_token: token.name,
        token_expires_at: token.expireTime ?? expireTime,
        voice_session_id: voiceSession.id,
        hold_mcredits: holdMcredits,
        balance_mcredits_after_hold: balanceAfterHold,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('[VoiceLive] Failed to issue ephemeral token:', error);
    await serviceClient
      .from('voice_live_sessions')
      .update({
        status: 'cancelled',
        finalized_at: new Date().toISOString(),
      })
      .eq('id', voiceSession.id);

    try {
      await releaseCredits(serviceClient, {
        userId,
        endpoint: 'voice-session-config-rollback',
        releaseMcredits: holdMcredits,
        modelId: model,
        requestId: `${requestId}:token_failed`,
        metadata: {
          reason: 'token_creation_failed',
        },
      });
    } catch (releaseError) {
      console.error('[VoiceLive] Failed to rollback hold after token error:', releaseError);
    }

    return new Response(
      JSON.stringify({
        code: 'VOICE_LIVE_TOKEN_FAILED',
        message: 'Failed to create live voice token.',
      }),
      {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
