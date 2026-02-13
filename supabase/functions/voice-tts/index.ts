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

interface TtsBody {
  text: string;
  voice?: string;
}

interface GeminiTtsResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        inlineData?: {
          data?: string;
          mimeType?: string;
        };
      }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    candidatesTokensDetails?: Array<{
      modality?: string;
      tokenCount?: number;
    }>;
  };
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
  const creditStatus = await ensureActiveCreditAccount(serviceClient, userId, tierResult.tier);

  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiApiKey) {
    return new Response(
      JSON.stringify({
        code: 'VOICE_TTS_NOT_CONFIGURED',
        message: 'Gemini API key is not configured for text-to-speech.',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const model = Deno.env.get('GEMINI_TTS_MODEL') ?? 'gemini-2.5-flash-preview-tts';
  const voice = payload.voice?.trim() || 'Kore';
  const truncatedText = text.slice(0, 4000);

  const preflightUsage: UsageUnits = {
    inputTokens: Math.max(120, Math.ceil(truncatedText.length / 4)),
    audioOutputTokens: Math.max(1200, truncatedText.length * 2),
  };
  const preflightUsd = await calculateUsdCost(serviceClient, model, preflightUsage);
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

  const ttsResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: truncatedText }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voice,
              },
            },
          },
        },
      }),
    }
  );

  if (!ttsResponse.ok) {
    const errorText = await ttsResponse.text();
    console.error('[VoiceTTS] Gemini error:', ttsResponse.status, errorText);
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

  const ttsPayload = (await ttsResponse.json()) as GeminiTtsResponse;
  const firstPart = ttsPayload.candidates?.[0]?.content?.parts?.find((part) => typeof part.inlineData?.data === 'string');
  const audioBase64 = firstPart?.inlineData?.data;
  const mimeType = firstPart?.inlineData?.mimeType || 'audio/wav';

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

  const usageForDebit: UsageUnits = {
    inputTokens: Math.max(0, Number(ttsPayload.usageMetadata?.promptTokenCount ?? 0)) || preflightUsage.inputTokens,
    outputTokens: Math.max(0, Number(ttsPayload.usageMetadata?.candidatesTokenCount ?? 0)),
    audioOutputTokens: getAudioOutputTokens(ttsPayload.usageMetadata?.candidatesTokensDetails) || preflightUsage.audioOutputTokens,
  };

  try {
    await debitForUsage(serviceClient, {
      userId,
      endpoint: 'voice-tts',
      modelId: model,
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
