import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';
import { encodeSseEvent } from '../_shared/sse.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { resolveBillingTier } from '../_shared/revenuecat.ts';
import { AgentTrace } from '../_shared/trace.ts';
import { assessRisk, logSafetyIncident, CRISIS_RESPONSE_TEMPLATE, CRISIS_RESOURCES } from '../_shared/risk-engine.ts';
import { extractGeminiText, getGeminiClient, toRawGeminiModelId } from '../_shared/gemini.ts';
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

const DEFAULT_STT_MODEL = 'gemini-2.5-flash-native-audio-preview';

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
  const configuredModel = Deno.env.get('GEMINI_STT_MODEL');
  const modelId = configuredModel && configuredModel.trim().length > 0
    ? configuredModel.trim()
    : DEFAULT_STT_MODEL;
  const apiModel = toRawGeminiModelId(modelId);

  // ── Initialize trace for observability ──
  const trace = new AgentTrace({
    userId,
    triggerType: 'voice_turn',
    modelProvider: 'gemini',
    modelId,
  });

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

  const mimeType = inferMimeType(payload.mime_type, payload.file_name);
  const audioData = payload.audio_base64.includes(',') ? payload.audio_base64.split(',')[1] : payload.audio_base64;

  const preflightUsage: UsageUnits = {
    audioInputTokens: estimateAudioTokensFromBase64(audioData),
    outputTokens: 240,
  };
  const preflightUsd = await calculateUsdCost(serviceClient, modelId, preflightUsage);
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

  let geminiPayload: Record<string, unknown>;
  const transcribeStep = trace.startStep('response', { action: 'transcribe' });
  let transcript = '';
  try {
    const client = getGeminiClient();
    const response = await client.models.generateContent({
      model: apiModel,
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
      config: {
        temperature: 0,
      },
    });

    geminiPayload = response as unknown as Record<string, unknown>;
    transcript = extractGeminiText(response).trim();
    transcribeStep.complete({ transcriptLength: transcript.length });
  } catch (error) {
    transcribeStep.fail(error instanceof Error ? error.message : String(error));
    console.error('[VoiceTranscribe] Gemini transcription failed:', error);
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

  // ── Safety check on transcript ──
  if (transcript) {
    const safetyStep = trace.startStep('safety_check', { transcriptLength: transcript.length });
    const risk = assessRisk(transcript);
    safetyStep.complete({ severity: risk.severity, category: risk.category });

    if (risk.severity === 'high' || risk.severity === 'critical') {
      logSafetyIncident(serviceClient, {
        userId,
        runId: trace.runId,
        severity: risk.severity,
        category: risk.category!,
        detectionSource: 'rule',
        details: { source: 'voice-transcribe', transcriptSnippet: transcript.slice(0, 200) },
      });
    }
  }

  const usageMetadata = (geminiPayload.usageMetadata ?? {}) as Record<string, unknown>;
  const promptTokensDetails = Array.isArray(usageMetadata.promptTokensDetails)
    ? usageMetadata.promptTokensDetails as Array<{ modality?: string; tokenCount?: number }>
    : undefined;

  const providerUsage: UsageUnits = {
    inputTokens: Math.max(0, Number(usageMetadata.promptTokenCount ?? 0)),
    outputTokens: Math.max(0, Number(usageMetadata.candidatesTokenCount ?? 0)),
    audioInputTokens: getAudioTokensFromDetails(promptTokensDetails),
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
      modelId,
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

  // ── Flush trace (fire-and-forget) ──
  trace.flush(serviceClient).catch((err) =>
    console.error('[VoiceTranscribe] trace flush error:', err)
  );

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
