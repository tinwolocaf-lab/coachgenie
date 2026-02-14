import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

import { AgentTrace, type TriggerType } from './trace.ts';
import {
  assessRisk,
  logSafetyIncident,
  CRISIS_RESPONSE_TEMPLATE,
  CRISIS_RESOURCES,
} from './risk-engine.ts';
import { searchMemories, formatMemoriesForPrompt, storeMemory } from './memory.ts';
import { buildEnrichedSystemPrompt } from './context-builder.ts';
import {
  detectMinorSignals,
  checkMinorsPolicy,
  flagUserAsMinor,
  buildMinorsSystemPromptAddition,
} from './minors-safeguards.ts';
import { isFeatureEnabled } from './feature-flags.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OrchestratorInput {
  userId: string;
  sessionId: string;
  userMessage: string;
  triggerType: TriggerType;
  modelProvider: string;
  modelId: string;
  baseSystemPrompt: string;
  userClient: SupabaseClient;
  serviceClient: SupabaseClient;
}

export interface OrchestratorResult {
  systemPrompt: string;
  riskBlocked: boolean;
  crisisResponse: string | null;
  memoryContext: string;
  runId: string;
  trace: AgentTrace;
  isMinor: boolean;
  sessionCapReached: boolean;
}

// ---------------------------------------------------------------------------
// Pre-response pipeline
// ---------------------------------------------------------------------------

/**
 * Run the pre-response orchestration pipeline.
 *
 * Executes safety checks, context enrichment, memory retrieval, and strategy
 * selection BEFORE the LLM generates a response. Returns the enriched system
 * prompt along with trace/run metadata.
 */
export async function orchestratePreResponse(
  input: OrchestratorInput,
): Promise<OrchestratorResult> {
  const {
    userId,
    sessionId,
    userMessage,
    triggerType,
    modelProvider,
    modelId,
    baseSystemPrompt,
    userClient,
    serviceClient,
  } = input;

  const trace = new AgentTrace({
    userId,
    sessionId,
    triggerType,
    modelProvider,
    modelId,
  });

  let systemPrompt = baseSystemPrompt;
  let memoryContext = '';
  let isMinor = false;
  let sessionCapReached = false;

  // ── Step 1: Safety Check ───────────────────────────────────────────────

  const safetyStep = trace.startStep('safety_check', {
    messageLength: userMessage.length,
  });

  try {
    const risk = assessRisk(userMessage);
    safetyStep.complete({ severity: risk.severity, category: risk.category });

    if (risk.severity === 'high' || risk.severity === 'critical') {
      // Log the incident (fire-and-forget; errors are caught inside logSafetyIncident)
      logSafetyIncident(serviceClient, {
        userId,
        runId: trace.runId,
        severity: risk.severity,
        category: risk.category!,
        detectionSource: 'rule',
        details: { triggerType, messageSnippet: userMessage.slice(0, 200) },
      });

      const crisisResponse =
        `${CRISIS_RESPONSE_TEMPLATE}\n\n${CRISIS_RESOURCES}`;

      return {
        systemPrompt,
        riskBlocked: true,
        crisisResponse,
        memoryContext: '',
        runId: trace.runId,
        trace,
        isMinor: false,
        sessionCapReached: false,
      };
    }

    // Medium severity: inject a caution note into the system prompt
    if (risk.severity === 'medium') {
      systemPrompt +=
        '\n\n--- SAFETY NOTE ---\n' +
        'The user may be discussing a sensitive emotional topic. ' +
        'Respond with empathy and care. If the conversation escalates ' +
        'toward crisis territory, gently suggest professional resources. ' +
        'Do NOT diagnose or prescribe — you are a coach, not a therapist.';
    }
  } catch (err) {
    safetyStep.fail(err instanceof Error ? err.message : String(err));
    // Safety check failure should not block the response; continue with
    // the base prompt. Log the error for observability.
    console.error('[orchestrator] safety_check error:', err);
  }

  // ── Step 1b: Minors Safeguards ─────────────────────────────────────────

  const minorsStep = trace.startStep('minors_check');

  try {
    const hasMinorSignals = detectMinorSignals(userMessage);

    if (hasMinorSignals) {
      // Flag the user as a minor persistently
      await flagUserAsMinor(serviceClient, userId);
    }

    // Check policy (covers both new detection and previously flagged users)
    const minorsPolicy = await checkMinorsPolicy(serviceClient, userId);
    isMinor = minorsPolicy.isMinor;
    sessionCapReached = minorsPolicy.sessionCapReached;

    if (minorsPolicy.isMinor) {
      const addition = buildMinorsSystemPromptAddition(minorsPolicy);
      systemPrompt += addition;
    }

    minorsStep.complete({
      signalDetected: hasMinorSignals,
      isMinor: minorsPolicy.isMinor,
      sessionCapReached: minorsPolicy.sessionCapReached,
    });
  } catch (err) {
    minorsStep.fail(err instanceof Error ? err.message : String(err));
    console.error('[orchestrator] minors_check error:', err);
  }

  // ── Step 2: Context Build ──────────────────────────────────────────────

  const contextStep = trace.startStep('context_build');

  try {
    systemPrompt = await buildEnrichedSystemPrompt(userId, systemPrompt, userClient);
    contextStep.complete({ enriched: true });
  } catch (err) {
    contextStep.fail(err instanceof Error ? err.message : String(err));
    console.error('[orchestrator] context_build error:', err);
    // Fall through with whatever prompt we have so far
  }

  // ── Step 3: Memory Retrieve (feature-gated) ────────────────────────────

  const memoryEnabled = await isFeatureEnabled(serviceClient, 'memory_plane', {
    userId,
  }).catch(() => true); // default to enabled on flag-check failure

  const memoryStep = trace.startStep('memory_retrieve', {
    query: userMessage.slice(0, 100),
    featureEnabled: memoryEnabled,
  });

  if (memoryEnabled) {
    try {
      const searchResult = await searchMemories(serviceClient, {
        userId,
        query: userMessage,
        limit: 5,
      });

      memoryContext = formatMemoriesForPrompt(searchResult.memories);

      if (memoryContext) {
        systemPrompt +=
          '\n\n--- RELEVANT MEMORIES ---\n' +
          'Use the following past context when it is relevant to the conversation. ' +
          'Do not repeat memories verbatim to the user.\n\n' +
          memoryContext;
      }

      memoryStep.complete({ memoriesFound: searchResult.totalFound });
    } catch (err) {
      memoryStep.fail(err instanceof Error ? err.message : String(err));
      console.error('[orchestrator] memory_retrieve error:', err);
      // Continue without memories
    }
  } else {
    memoryStep.complete({ memoriesFound: 0, skipped: 'feature_disabled' });
  }

  // ── Step 4: Strategy ───────────────────────────────────────────────────

  const strategyStep = trace.startStep('strategy');

  try {
    // TODO: Implement full coaching strategy selection based on:
    //   - User's current goals & energy level
    //   - Conversation history / session arc
    //   - Time of day and calendar context
    //   - Memory patterns (recurring themes, blockers)
    // For v1, use default approach.
    const strategy = { approach: 'default' as const };

    strategyStep.complete(strategy);
  } catch (err) {
    strategyStep.fail(err instanceof Error ? err.message : String(err));
    console.error('[orchestrator] strategy error:', err);
  }

  // ── Return ─────────────────────────────────────────────────────────────

  return {
    systemPrompt,
    riskBlocked: false,
    crisisResponse: null,
    memoryContext,
    runId: trace.runId,
    trace,
    isMinor,
    sessionCapReached,
  };
}

// ---------------------------------------------------------------------------
// Post-response pipeline
// ---------------------------------------------------------------------------

/**
 * Run async post-response processing.
 *
 * This should be called AFTER the response has been sent to the user
 * (non-blocking / fire-and-forget). It stores conversation memories,
 * tags coaching interventions, and flushes the agent trace for observability.
 *
 * All errors are caught and logged — this function never throws.
 */
export async function orchestratePostResponse(
  serviceClient: SupabaseClient,
  opts: {
    userId: string;
    sessionId: string;
    userMessage: string;
    assistantMessage: string;
    trace: AgentTrace;
    messageId?: string;
  },
): Promise<void> {
  const { userId, sessionId, userMessage, assistantMessage, trace } = opts;

  // ── Step 1: Store Memories ─────────────────────────────────────────────

  const postStep = trace.startStep('post_actions');

  try {
    // Store user message as episodic memory
    await storeMemory(serviceClient, {
      userId,
      content: userMessage,
      memoryType: 'episodic',
      sourceType: 'session_message',
      sourceId: sessionId,
    });

    // Store assistant message as episodic memory
    await storeMemory(serviceClient, {
      userId,
      content: assistantMessage,
      memoryType: 'episodic',
      sourceType: 'session_message',
      sourceId: sessionId,
    });

    postStep.complete({ storedMessages: 2 });
  } catch (err) {
    postStep.fail(err instanceof Error ? err.message : String(err));
    console.error('[orchestrator] post_actions error:', err);
  }

  // ── Step 2: Tag Coaching Interventions ─────────────────────────────────

  try {
    await tagInterventions(serviceClient, {
      userId,
      sessionId,
      runId: trace.runId,
      messageId: opts.messageId,
      assistantMessage,
    });
  } catch (err) {
    console.error('[orchestrator] intervention tagging error:', err);
  }

  // ── Step 3: Flush Trace ────────────────────────────────────────────────

  try {
    await trace.flush(serviceClient);
  } catch (err) {
    console.error('[orchestrator] trace flush error:', err);
  }
}

// ---------------------------------------------------------------------------
// Intervention tagging
// ---------------------------------------------------------------------------

const INTERVENTION_PATTERNS: { type: string; keywords: string[] }[] = [
  { type: 'reframing', keywords: ['another way to look at', 'consider that', 'what if instead', 'perspective', 'reframe'] },
  { type: 'accountability', keywords: ['committed to', 'follow through', 'check in', 'how will you', 'when will you'] },
  { type: 'goal_setting', keywords: ['set a goal', 'your target', 'by when', 'measurable', 'specific steps'] },
  { type: 'validation', keywords: ['that makes sense', 'understandable', 'valid feeling', 'it\'s okay to', 'natural to feel'] },
  { type: 'challenging', keywords: ['push yourself', 'stretch zone', 'what\'s holding you', 'are you sure', 'challenge you'] },
  { type: 'reflective', keywords: ['what do you notice', 'how does that feel', 'reflect on', 'what comes up', 'sit with that'] },
  { type: 'action_planning', keywords: ['first step', 'next step', 'action item', 'here\'s a plan', 'start by'] },
  { type: 'psychoeducation', keywords: ['research shows', 'studies suggest', 'this is common', 'many people', 'the science behind'] },
  { type: 'motivational', keywords: ['you\'ve got this', 'believe in', 'capable of', 'strength', 'proud of'] },
  { type: 'boundary_setting', keywords: ['it\'s okay to say no', 'set a boundary', 'protect your', 'your limits', 'prioritize yourself'] },
];

async function tagInterventions(
  serviceClient: SupabaseClient,
  opts: {
    userId: string;
    sessionId: string;
    runId: string;
    messageId?: string;
    assistantMessage: string;
  },
): Promise<void> {
  const lower = opts.assistantMessage.toLowerCase();
  const detected: { type: string; confidence: number }[] = [];

  for (const pattern of INTERVENTION_PATTERNS) {
    const matches = pattern.keywords.filter((kw) => lower.includes(kw));
    if (matches.length > 0) {
      const confidence = Math.min(0.5 + matches.length * 0.15, 0.95);
      detected.push({ type: pattern.type, confidence });
    }
  }

  if (detected.length === 0) return;

  // Insert top 3 interventions max
  const topInterventions = detected
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);

  const rows = topInterventions.map((d) => ({
    user_id: opts.userId,
    session_id: opts.sessionId || null,
    run_id: opts.runId || null,
    message_id: opts.messageId || null,
    intervention_type: d.type,
    confidence: d.confidence,
    metadata: {},
  }));

  const { error } = await serviceClient
    .from('coaching_interventions')
    .insert(rows);

  if (error) {
    console.error('[orchestrator] Failed to insert interventions:', error.message);
  }
}
