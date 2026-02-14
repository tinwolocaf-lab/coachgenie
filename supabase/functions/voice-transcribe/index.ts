import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';
import { encodeSseEvent } from '../_shared/sse.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { resolveBillingTier } from '../_shared/revenuecat.ts';
import {
  assertSufficientBalance,
  BillingError,
  buildInsufficientCreditsBody,
  calculateUsdCost,
  debitForUsage,
  ensureActiveCreditAccount,
  estimateChatUsageFromText,
  mcreditsFromUsd,
  type UsageUnits,
} from '../_shared/billing.ts';

interface TranscribeBody {
  audio_base64: string;
  mime_type?: string;
  file_name?: string;
}

interface GeminiTranscribeResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    promptTokensDetails?: Array<{
      modality?: string;
      tokenCount?: number;
    }>;
  };
}

function inferMimeType(mimeType?: string, fileName?: string): string {
  if (mimeType && mimeType.trim().length > 0) {
    return mimeType;
  }

  const ext = fileName?.split('.').pop()?.toLowerCase();
  if (ext === 'wav') return 'audio/wav';
  if (ext === 'mp3') return 'audio/mpeg';
  if (ext === 'webm') return 'audio/webm';
  if (ext === 'ogg') return 'audio/ogg';
  return 'audio/m4a';
}

function getAudioTokensFromDetails(
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

function estimateAudioTokensFromBase64(base64Audio: string): number {
  const byteLength = Math.max(1, Math.floor(base64Audio.length * 0.75));
  return Math.max(800, Math.ceil(byteLength / 120));
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

  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiApiKey) {
    return new Response(
      JSON.stringify({
        code: 'VOICE_TRANSCRIBE_NOT_CONFIGURED',
        message: 'Gemini API key is not configured for transcription.',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const model = Deno.env.get('GEMINI_STT_MODEL') ?? 'gemini-2.5-flash';
  const mimeType = inferMimeType(payload.mime_type, payload.file_name);
  const audioData = payload.audio_base64.includes(',') ? payload.audio_base64.split(',')[1] : payload.audio_base64;

  const preflightUsage: UsageUnits = {
    audioInputTokens: estimateAudioTokensFromBase64(audioData),
    outputTokens: 240,
  };
  const preflightUsd = await calculateUsdCost(serviceClient, model, preflightUsage);
  const preflightMcredits = Math.max(120, mcreditsFromUsd(preflightUsd));

  try {
    assertSufficientBalance(creditStatus, preflightMcredits);
  } catch (error) {
    if (error instanceof BillingError && error.kind === 'insufficient_credits') {
      return new Response(buildInsufficientCreditsBody('Not enough credits for voice transcription.'), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    throw error;
  }

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(geminiApiKey)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: 'Transcribe this audio verbatim. Return only the transcription text.' },
              {
                inlineData: {
                  mimeType,
                  data: audioData,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
        },
      }),
    }
  );

  if (!geminiResponse.ok) {
    const body = await geminiResponse.text();
    console.error('[VoiceTranscribe] Gemini transcription failed:', geminiResponse.status, body);
    return new Response(
      JSON.stringify({
        code: 'VOICE_TRANSCRIBE_FAILED',
        message: 'Gemini transcription request failed.',
      }),
      {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const geminiPayload = (await geminiResponse.json()) as GeminiTranscribeResponse;
  const transcript =
    geminiPayload.candidates?.[0]?.content?.parts
      ?.map((part) => (typeof part.text === 'string' ? part.text : ''))
      .join('')
      .trim() ?? '';

  const providerUsage: UsageUnits = {
    inputTokens: Math.max(0, Number(geminiPayload.usageMetadata?.promptTokenCount ?? 0)),
    outputTokens: Math.max(0, Number(geminiPayload.usageMetadata?.candidatesTokenCount ?? 0)),
    audioInputTokens: getAudioTokensFromDetails(geminiPayload.usageMetadata?.promptTokensDetails),
  };

  const fallbackUsage = estimateChatUsageFromText(
    'Transcribe this audio verbatim. Return only the transcription text.',
    transcript
  );
  const usageForDebit: UsageUnits = {
    inputTokens: providerUsage.inputTokens || fallbackUsage.inputTokens,
    outputTokens: providerUsage.outputTokens || fallbackUsage.outputTokens,
    audioInputTokens: providerUsage.audioInputTokens || preflightUsage.audioInputTokens,
  };

  try {
    await debitForUsage(serviceClient, {
      userId,
      endpoint: 'voice-transcribe',
      modelId: model,
      usage: usageForDebit,
      requestId: `voice-transcribe:${Date.now()}`,
      metadata: {
        tier: tierResult.tier,
        tier_source: tierResult.source,
      },
    });
  } catch (error) {
    if (error instanceof BillingError && error.kind === 'insufficient_credits') {
      return new Response(buildInsufficientCreditsBody('Not enough credits for voice transcription.'), {
        status: 402,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.error('[Billing] Voice transcription debit failure:', error);
    return new Response(
      JSON.stringify({
        code: 'VOICE_TRANSCRIBE_BILLING_FAILED',
        message: 'Failed to finalize billing for transcription.',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      if (transcript) {
        controller.enqueue(encoder.encode(encodeSseEvent('token', { t: transcript })));
      }
      controller.enqueue(encoder.encode(encodeSseEvent('done', { text: transcript })));
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
