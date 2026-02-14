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

  // ── Step 3: Memory Retrieve ────────────────────────────────────────────

  const memoryStep = trace.startStep('memory_retrieve', {
    query: userMessage.slice(0, 100),
  });

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
  };
}

// ---------------------------------------------------------------------------
// Post-response pipeline
// ---------------------------------------------------------------------------

/**
 * Run async post-response processing.
 *
 * This should be called AFTER the response has been sent to the user
 * (non-blocking / fire-and-forget). It stores conversation memories and
 * flushes the agent trace for observability.
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

  // ── Step 2: Flush Trace ────────────────────────────────────────────────

  try {
    await trace.flush(serviceClient);
  } catch (err) {
    console.error('[orchestrator] trace flush error:', err);
  }
}
