import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import {
  assessRisk,
  logSafetyIncident,
  CRISIS_RESPONSE_TEMPLATE,
  CRISIS_RESOURCES,
  type RiskSeverity,
} from '../_shared/risk-engine.ts';

interface EscalateBody {
  message: string;
  run_id?: string;
  locale?: string;
}

interface CrisisResource {
  name: string;
  contact: string;
  type: 'phone' | 'text' | 'web';
}

const LOCALE_RESOURCES: Record<string, CrisisResource[]> = {
  US: [
    { name: 'National Suicide Prevention Lifeline', contact: '988', type: 'phone' },
    { name: 'Crisis Text Line', contact: 'Text HOME to 741741', type: 'text' },
    { name: 'SAMHSA Helpline', contact: '1-800-662-4357', type: 'phone' },
  ],
  UK: [
    { name: 'Samaritans', contact: '116 123', type: 'phone' },
    { name: 'Crisis Text Line UK', contact: 'Text SHOUT to 85258', type: 'text' },
  ],
  CA: [
    { name: 'Talk Suicide Canada', contact: '988', type: 'phone' },
    { name: 'Crisis Text Line Canada', contact: 'Text HELLO to 741741', type: 'text' },
  ],
  AU: [
    { name: 'Lifeline Australia', contact: '13 11 14', type: 'phone' },
    { name: 'Beyond Blue', contact: '1300 22 4636', type: 'phone' },
  ],
  DEFAULT: [
    { name: 'International Association for Suicide Prevention', contact: 'https://www.iasp.info/resources/Crisis_Centres/', type: 'web' },
  ],
};

/**
 * Safety escalation endpoint.
 *
 * Assesses risk, logs incidents, and returns appropriate crisis resources
 * based on the user's locale. Designed as a standalone endpoint that can
 * be called from the app when client-side safety signals are detected.
 */
serve(async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  let auth;
  try {
    auth = await requireAuth(request);
  } catch (error) {
    return new Response((error as Error).message, { status: 401, headers: corsHeaders });
  }

  let body: EscalateBody;
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400, headers: corsHeaders });
  }

  if (!body.message?.trim()) {
    return new Response(
      JSON.stringify({ error: 'Missing required field: message' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const serviceClient = createServiceClient();
  const risk = assessRisk(body.message);
  const locale = (body.locale ?? 'US').toUpperCase();
  const resources = LOCALE_RESOURCES[locale] ?? LOCALE_RESOURCES.DEFAULT;

  // Log incident for medium+ severity
  if (risk.severity !== 'low') {
    await logSafetyIncident(serviceClient, {
      userId: auth.userId,
      runId: body.run_id,
      severity: risk.severity,
      category: risk.category ?? 'policy',
      detectionSource: 'rule',
      details: {
        source: 'safety-escalate',
        locale,
        messageSnippet: body.message.slice(0, 200),
      },
    });
  }

  return new Response(
    JSON.stringify({
      severity: risk.severity,
      blocked: risk.shouldBlock,
      response: risk.shouldBlock ? CRISIS_RESPONSE_TEMPLATE : null,
      resources: risk.severity !== 'low' ? resources : [],
      general_resources: risk.shouldBlock ? CRISIS_RESOURCES : null,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
