import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';
export type RiskCategory =
  | 'self_harm'
  | 'minors'
  | 'medical'
  | 'financial'
  | 'abuse'
  | 'policy';
export type DetectionSource = 'moderation' | 'rule' | 'model';

export interface RiskAssessment {
  severity: RiskSeverity;
  category: RiskCategory | null;
  shouldBlock: boolean;
  safeResponseTemplate: string | null;
  emergencyResources: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const CRISIS_RESOURCES = `If you're in crisis:
- National Suicide Prevention Lifeline: 988 (call or text)
- Crisis Text Line: Text HOME to 741741
- International Association for Suicide Prevention: https://www.iasp.info/resources/Crisis_Centres/`;

export const CRISIS_RESPONSE_TEMPLATE = `I hear you, and I want you to know that what you're feeling matters. I'm an AI coach, and this situation needs human support. Please reach out to a crisis professional who can help right now.`;

// ---------------------------------------------------------------------------
// Keyword / pattern lists  (case-insensitive, checked against lowered input)
// ---------------------------------------------------------------------------

const TIER_1_KEYWORDS: string[] = [
  'burnout',
  'overwhelming',
  "can't cope",
  'exhausted',
  'anxious',
  'depressed',
  'stressed out',
  'panic attack',
  'feeling hopeless',
  'no motivation',
  'emotionally drained',
];

const TIER_2_KEYWORDS: string[] = [
  'kill myself',
  'suicide',
  'self-harm',
  'end my life',
  "don't want to live",
  'hurt myself',
  'cutting',
  'want to die',
  'suicidal',
  'take my own life',
  'end it all',
  'no reason to live',
];

const TIER_3_KEYWORDS: string[] = [
  'child abuse',
  'hurt a child',
  'abusing a minor',
  'molest',
  'trafficking',
  'child exploitation',
  'sexual abuse of a child',
  'harming children',
  'abuse a kid',
  'domestic violence against',
  'beating my child',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function containsAny(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

// ---------------------------------------------------------------------------
// Core assessment
// ---------------------------------------------------------------------------

/**
 * Classify input text for risk using fast keyword/pattern matching.
 * No LLM call — deterministic and conservative (prefers over-flagging).
 */
export function assessRisk(text: string): RiskAssessment {
  // Tier 3 – critical (minors / abuse)
  if (containsAny(text, TIER_3_KEYWORDS)) {
    return {
      severity: 'critical',
      category: 'abuse',
      shouldBlock: true,
      safeResponseTemplate: CRISIS_RESPONSE_TEMPLATE,
      emergencyResources: CRISIS_RESOURCES,
    };
  }

  // Tier 2 – high (self-harm / crisis)
  if (containsAny(text, TIER_2_KEYWORDS)) {
    return {
      severity: 'high',
      category: 'self_harm',
      shouldBlock: true,
      safeResponseTemplate: CRISIS_RESPONSE_TEMPLATE,
      emergencyResources: CRISIS_RESOURCES,
    };
  }

  // Tier 1 – medium (sensitive but non-crisis)
  if (containsAny(text, TIER_1_KEYWORDS)) {
    return {
      severity: 'medium',
      category: 'medical',
      shouldBlock: false,
      safeResponseTemplate: null,
      emergencyResources: null,
    };
  }

  // Tier 0 – low (normal coaching content)
  return {
    severity: 'low',
    category: null,
    shouldBlock: false,
    safeResponseTemplate: null,
    emergencyResources: null,
  };
}

// ---------------------------------------------------------------------------
// Incident logging
// ---------------------------------------------------------------------------

/**
 * Persist a safety incident to the `safety_incidents` table via the
 * service-role Supabase client so RLS is bypassed.
 */
export async function logSafetyIncident(
  serviceClient: SupabaseClient,
  opts: {
    userId: string;
    runId?: string;
    severity: RiskSeverity;
    category: RiskCategory;
    detectionSource: DetectionSource;
    details: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await serviceClient.from('safety_incidents').insert({
    user_id: opts.userId,
    run_id: opts.runId ?? null,
    severity: opts.severity,
    category: opts.category,
    detection_source: opts.detectionSource,
    details: opts.details,
    created_at: new Date().toISOString(),
  });

  if (error) {
    // Log but don't throw — safety logging should never break the request flow
    console.error('[risk-engine] Failed to log safety incident:', error.message);
  }
}
