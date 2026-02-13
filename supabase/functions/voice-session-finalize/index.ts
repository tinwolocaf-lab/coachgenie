import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import {
  BillingError,
  calculateUsdCost,
  debitFixedCredits,
  estimateLiveUsageFromDuration,
  mcreditsFromUsd,
  releaseCredits,
  type UsageUnits,
} from '../_shared/billing.ts';

interface VoiceSessionFinalizeBody {
  voice_session_id: string;
  duration_seconds?: number;
  usage_units?: {
    input_tokens?: number;
    output_tokens?: number;
    audio_input_tokens?: number;
    audio_output_tokens?: number;
    reasoning_tokens?: number;
    duration_seconds?: number;
  };
}

interface VoiceLiveSessionRow {
  id: string;
  user_id: string;
  model_id: string;
  hold_mcredits: number;
  debited_mcredits: number;
  status: 'active' | 'finalized' | 'cancelled';
  started_at: string;
  finalized_at: string | null;
}

const MAX_LIVE_SESSION_SECONDS = Number(Deno.env.get('VOICE_LIVE_MAX_SESSION_SECONDS') ?? '1200');

function toNonNegativeInt(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.round(parsed));
    }
  }
  return 0;
}

function elapsedDurationFromSession(startedAtIso: string): number {
  const startedAt = new Date(startedAtIso).getTime();
  if (!Number.isFinite(startedAt)) {
    return 1;
  }

  const elapsed = Math.round((Date.now() - startedAt) / 1000);
  return Math.max(1, Math.min(MAX_LIVE_SESSION_SECONDS, elapsed));
}

serve(async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  let payload: VoiceSessionFinalizeBody;
  try {
    payload = await request.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400, headers: corsHeaders });
  }

  if (!payload.voice_session_id?.trim()) {
    return new Response(
      JSON.stringify({
        code: 'BAD_REQUEST',
        message: 'Missing voice_session_id',
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let auth;
  try {
    auth = await requireAuth(request);
  } catch (error) {
    return new Response((error as Error).message, { status: 401, headers: corsHeaders });
  }

  const { userId } = auth;
  const serviceClient = createServiceClient();

  const { data: row, error } = await serviceClient
    .from('voice_live_sessions')
    .select('id, user_id, model_id, hold_mcredits, debited_mcredits, status, started_at, finalized_at')
    .eq('id', payload.voice_session_id)
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !row) {
    return new Response(
      JSON.stringify({
        code: 'VOICE_SESSION_NOT_FOUND',
        message: 'Voice session was not found.',
      }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const sessionRow = row as VoiceLiveSessionRow;

  if (sessionRow.status !== 'active') {
    return new Response(
      JSON.stringify({
        voice_session_id: sessionRow.id,
        status: sessionRow.status,
        hold_mcredits: sessionRow.hold_mcredits,
        debited_mcredits: sessionRow.debited_mcredits,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const durationSeconds = elapsedDurationFromSession(sessionRow.started_at);
  const usage = estimateLiveUsageFromDuration(durationSeconds);
  const clientReportedDuration = toNonNegativeInt(payload.duration_seconds);
  const clientReportedUsage = payload.usage_units ?? null;

  const usdCost = await calculateUsdCost(serviceClient, sessionRow.model_id, usage);
  const finalDebitMcredits = Math.max(0, mcreditsFromUsd(usdCost));
  const holdMcredits = Math.max(0, sessionRow.hold_mcredits);

  const extraDebitMcredits = Math.max(0, finalDebitMcredits - holdMcredits);
  const refundMcredits = Math.max(0, holdMcredits - finalDebitMcredits);

  let totalDebitedMcredits = Math.min(finalDebitMcredits, holdMcredits);
  let extraDebitApplied = false;
  let extraDebitSkipped = false;
  let finalBalanceMcredits: number | null = null;

  if (extraDebitMcredits > 0) {
    try {
      finalBalanceMcredits = await debitFixedCredits(serviceClient, {
        userId,
        endpoint: 'voice-session-finalize',
        debitMcredits: extraDebitMcredits,
        modelId: sessionRow.model_id,
        requestId: `voice-session-finalize:${sessionRow.id}`,
        metadata: {
          voice_session_id: sessionRow.id,
          duration_seconds: durationSeconds,
          metering_source: 'server_elapsed_duration',
          client_reported_duration_seconds: clientReportedDuration,
          additional_debit: true,
        },
      });
      totalDebitedMcredits += extraDebitMcredits;
      extraDebitApplied = true;
    } catch (debitError) {
      if (debitError instanceof BillingError && debitError.kind === 'insufficient_credits') {
        extraDebitSkipped = true;
      } else {
        console.warn('[VoiceFinalize] Unexpected extra debit error:', debitError);
        extraDebitSkipped = true;
      }
    }
  }

  if (refundMcredits > 0) {
    try {
      finalBalanceMcredits = await releaseCredits(serviceClient, {
        userId,
        endpoint: 'voice-session-finalize',
        releaseMcredits: refundMcredits,
        modelId: sessionRow.model_id,
        requestId: `voice-session-finalize:${sessionRow.id}`,
        metadata: {
          voice_session_id: sessionRow.id,
          duration_seconds: durationSeconds,
          metering_source: 'server_elapsed_duration',
          client_reported_duration_seconds: clientReportedDuration,
          refund: true,
        },
      });
    } catch (releaseError) {
      console.warn('[VoiceFinalize] Failed to release unused hold:', releaseError);
    }
  }

  const { error: updateError } = await serviceClient
    .from('voice_live_sessions')
    .update({
      status: 'finalized',
      usage_units: {
        ...usage,
        metering_source: 'server_elapsed_duration',
        client_reported_duration_seconds: clientReportedDuration,
        client_reported_usage: clientReportedUsage,
      },
      debited_mcredits: totalDebitedMcredits,
      finalized_at: new Date().toISOString(),
    })
    .eq('id', sessionRow.id)
    .eq('status', 'active');

  if (updateError) {
    return new Response(
      JSON.stringify({
        code: 'VOICE_SESSION_FINALIZE_FAILED',
        message: updateError.message,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (extraDebitMcredits > 0 && !extraDebitApplied && extraDebitSkipped) {
    return new Response(
      JSON.stringify({
        code: 'VOICE_SESSION_FINALIZED_WITH_PARTIAL_DEBIT',
        message:
          'Voice session ended, but your hold was not enough to cover the full usage. Remaining balance prevented additional debit.',
        voice_session_id: sessionRow.id,
        status: 'finalized',
        hold_mcredits: holdMcredits,
        debited_mcredits: totalDebitedMcredits,
        estimated_total_mcredits: finalDebitMcredits,
        balance_mcredits: finalBalanceMcredits,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  return new Response(
    JSON.stringify({
      voice_session_id: sessionRow.id,
      status: 'finalized',
      hold_mcredits: holdMcredits,
      debited_mcredits: totalDebitedMcredits,
      refunded_mcredits: refundMcredits,
      extra_debit_mcredits: extraDebitApplied ? extraDebitMcredits : 0,
      balance_mcredits: finalBalanceMcredits,
      duration_seconds: durationSeconds,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
