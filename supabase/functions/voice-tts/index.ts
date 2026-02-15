import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { resolveBillingTier } from '../_shared/revenuecat.ts';
import {
  assertSufficientBalance,
  BillingError,
  buildInsufficientCreditsBody,
  calculateUsdCost,
  debitForUsage,
  ensureActiveCreditAccount,
  mcreditsFromUsd,
  type UsageUnits,
} from '../_shared/billing.ts';
import { getGeminiClient, toRawGeminiModelId } from '../_shared/gemini.ts';

interface TtsBody {
  text: string;
  voice?: string;
}

function decodeBase64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binaryString.length));
  for (let index = 0; index < binaryString.length; index += 1) {
    bytes[index] = binaryString.charCodeAt(index);
  }
  return bytes;
}

function getAudioOutputTokens(
  details: Array<{
    modality?: string;
    tokenCount?: number;
  }> | undefined
): number {
  if (!details) return 0;
  for (const item of details) {
    if (item?.modality?.toLowerCase() === 'audio') {
      return Math.max(0, Number(item.tokenCount ?? 0));
    }
  }
  return 0;
}

serve(async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  let payload: TtsBody;
  try {
    payload = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400, headers: corsHeaders });
  }

  const text = payload.text?.trim();
  if (!text) {
    return new Response('Missing text', { status: 400, headers: corsHeaders });
  }

  let auth;
  try {
    auth = await requireAuth(request);
  } catch (error) {
    return new Response((error as Error).message, { status: 401, headers: corsHeaders });
  }

  const { userId } = auth;
  const serviceClient = createServiceClient();
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

  const creditStatus = await ensureActiveCreditAccount(
      serviceClient,
      userId,
      tierResult.tier,
      {
        tierSource: tierResult.source,
        trialTier: tierResult.trialTier,
        trialEndsAt: tierResult.trialEndsAt,
      }
    );

  const configuredModel = Deno.env.get('GEMINI_TTS_MODEL');
  const modelId = configuredModel && configuredModel.trim().length > 0
    ? configuredModel.trim()
    : 'gemini-2.5-flash-preview-tts';
  const apiModel = toRawGeminiModelId(modelId);
  const voice = payload.voice?.trim() || 'Kore';
  const truncatedText = text.slice(0, 4000);

  const preflightUsage: UsageUnits = {
    inputTokens: Math.max(120, Math.ceil(truncatedText.length / 4)),
    audioOutputTokens: Math.max(1200, truncatedText.length * 2),
  };
  const preflightUsd = await calculateUsdCost(serviceClient, modelId, preflightUsage);
  const preflightMcredits = Math.max(90, mcreditsFromUsd(preflightUsd));

  try {
    assertSufficientBalance(creditStatus, preflightMcredits);
  } catch (error) {
    if (error instanceof BillingError && error.kind === 'insufficient_credits') {
      return new Response(buildInsufficientCreditsBody('Not enough credits for text-to-speech.'), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    throw error;
  }

  let ttsPayload: Record<string, unknown>;
  try {
    const client = getGeminiClient();
    const response = await client.models.generateContent({
      model: apiModel,
      contents: [{ role: 'user', parts: [{ text: truncatedText }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voice,
            },
          },
        },
      },
    });
    ttsPayload = response as unknown as Record<string, unknown>;
  } catch (error) {
    console.error('[VoiceTTS] Gemini error:', error);
    return new Response(
      JSON.stringify({
        code: 'VOICE_TTS_FAILED',
        message: 'Gemini TTS generation failed.',
      }),
      {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const candidates = Array.isArray(ttsPayload.candidates) ? ttsPayload.candidates : [];
  const firstCandidate = (candidates[0] ?? null) as Record<string, unknown> | null;
  const content = firstCandidate && typeof firstCandidate.content === 'object'
    ? firstCandidate.content as Record<string, unknown>
    : null;
  const parts = Array.isArray(content?.parts) ? content.parts : [];
  const firstPart = parts.find((part) => {
    if (!part || typeof part !== 'object') return false;
    const record = part as Record<string, unknown>;
    const inlineData = record.inlineData;
    if (!inlineData || typeof inlineData !== 'object') return false;
    return typeof (inlineData as Record<string, unknown>).data === 'string';
  }) as Record<string, unknown> | undefined;
  const inlineData = firstPart?.inlineData as Record<string, unknown> | undefined;
  const audioBase64 = typeof inlineData?.data === 'string' ? inlineData.data : undefined;
  const mimeType = typeof inlineData?.mimeType === 'string' ? inlineData.mimeType : 'audio/wav';

  if (!audioBase64) {
    return new Response(
      JSON.stringify({
        code: 'VOICE_TTS_EMPTY',
        message: 'No audio was returned by Gemini TTS.',
      }),
      {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const usageMetadata = (ttsPayload.usageMetadata ?? {}) as Record<string, unknown>;
  const candidatesTokensDetails = Array.isArray(usageMetadata.candidatesTokensDetails)
    ? usageMetadata.candidatesTokensDetails as Array<{ modality?: string; tokenCount?: number }>
    : undefined;

  const usageForDebit: UsageUnits = {
    inputTokens: Math.max(0, Number(usageMetadata.promptTokenCount ?? 0)) || preflightUsage.inputTokens,
    outputTokens: Math.max(0, Number(usageMetadata.candidatesTokenCount ?? 0)),
    audioOutputTokens: getAudioOutputTokens(candidatesTokensDetails) || preflightUsage.audioOutputTokens,
  };

  try {
    await debitForUsage(serviceClient, {
      userId,
      endpoint: 'voice-tts',
      modelId,
      usage: usageForDebit,
      requestId: `voice-tts:${Date.now()}`,
      metadata: {
        tier: tierResult.tier,
        tier_source: tierResult.source,
        voice,
      },
    });
  } catch (error) {
    if (error instanceof BillingError && error.kind === 'insufficient_credits') {
      return new Response(buildInsufficientCreditsBody('Not enough credits for text-to-speech.'), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.error('[Billing] Gemini TTS debit failure:', error);
    return new Response(
      JSON.stringify({
        code: 'VOICE_TTS_BILLING_FAILED',
        message: 'Failed to finalize billing for text-to-speech.',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const audioBytes = decodeBase64ToBytes(audioBase64);
  const audioBuffer = new ArrayBuffer(audioBytes.byteLength);
  new Uint8Array(audioBuffer).set(audioBytes);
  const audioBlob = new Blob([audioBuffer], { type: mimeType });
  return new Response(audioBlob, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': mimeType,
      'Content-Length': audioBytes.byteLength.toString(),
    },
  });
});
