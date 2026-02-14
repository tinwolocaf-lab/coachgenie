import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

// ── Types ───────────────────────────────────────────────────────────────

export type TriggerType = 'user_message' | 'voice_turn' | 'scheduled_nudge' | 'calendar_event';
export type StepName = 'context_build' | 'memory_retrieve' | 'safety_check' | 'strategy' | 'response' | 'post_actions';
export type RunStatus = 'completed' | 'failed' | 'aborted';
export type StepStatus = 'completed' | 'failed' | 'skipped';

// ── Internal record for a single step ───────────────────────────────────

interface StepRecord {
  name: StepName;
  status: StepStatus;
  startTime: number;
  endTime: number | null;
  input?: unknown;
  output?: unknown;
  error?: string;
}

// ── StepHandle ──────────────────────────────────────────────────────────

export class StepHandle {
  private record: StepRecord;

  constructor(record: StepRecord) {
    this.record = record;
  }

  complete(output?: unknown): void {
    this.record.status = 'completed';
    this.record.endTime = Date.now();
    if (output !== undefined) {
      this.record.output = output;
    }
  }

  fail(error: string): void {
    this.record.status = 'failed';
    this.record.endTime = Date.now();
    this.record.error = error;
  }

  skip(): void {
    this.record.status = 'skipped';
    this.record.endTime = Date.now();
  }
}

// ── AgentTrace ──────────────────────────────────────────────────────────

export class AgentTrace {
  readonly runId: string;
  private steps: StepRecord[] = [];
  private startTime: number;

  private userId: string;
  private sessionId?: string;
  private triggerType: TriggerType;
  private modelProvider: string;
  private modelId: string;

  constructor(opts: {
    userId: string;
    sessionId?: string;
    triggerType: TriggerType;
    modelProvider: string;
    modelId: string;
  }) {
    this.runId = crypto.randomUUID();
    this.startTime = Date.now();
    this.userId = opts.userId;
    this.sessionId = opts.sessionId;
    this.triggerType = opts.triggerType;
    this.modelProvider = opts.modelProvider;
    this.modelId = opts.modelId;
  }

  startStep(name: StepName, input?: unknown): StepHandle {
    const record: StepRecord = {
      name,
      status: 'failed', // default until explicitly completed/skipped
      startTime: Date.now(),
      endTime: null,
      input,
    };
    this.steps.push(record);
    return new StepHandle(record);
  }

  async flush(serviceClient: SupabaseClient, status: RunStatus = 'completed'): Promise<void> {
    try {
      const now = Date.now();
      const totalLatencyMs = now - this.startTime;

      // Aggregate token counts from step outputs that contain usage info
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let totalCost = 0;

      for (const step of this.steps) {
        if (step.output && typeof step.output === 'object') {
          const out = step.output as Record<string, unknown>;
          if (typeof out.inputTokens === 'number') totalInputTokens += out.inputTokens;
          if (typeof out.outputTokens === 'number') totalOutputTokens += out.outputTokens;
          if (typeof out.cost === 'number') totalCost += out.cost;
        }
      }

      // Insert the run record
      const { error: runError } = await serviceClient.from('agent_runs').insert({
        id: this.runId,
        user_id: this.userId,
        session_id: this.sessionId ?? null,
        trigger_type: this.triggerType,
        model_provider: this.modelProvider,
        model_id: this.modelId,
        status,
        latency_ms: totalLatencyMs,
        input_tokens: totalInputTokens,
        output_tokens: totalOutputTokens,
        cost: totalCost,
        step_count: this.steps.length,
        created_at: new Date(this.startTime).toISOString(),
      });

      if (runError) {
        console.error('[trace] failed to insert agent_runs:', runError.message);
        return;
      }

      // Insert step records
      if (this.steps.length > 0) {
        const stepRows = this.steps.map((s, i) => ({
          run_id: this.runId,
          step_order: i,
          name: s.name,
          status: s.status,
          latency_ms: s.endTime ? s.endTime - s.startTime : now - s.startTime,
          input: s.input !== undefined ? JSON.stringify(s.input) : null,
          output: s.output !== undefined ? JSON.stringify(s.output) : null,
          error: s.error ?? null,
        }));

        const { error: stepsError } = await serviceClient.from('agent_steps').insert(stepRows);
        if (stepsError) {
          console.error('[trace] failed to insert agent_steps:', stepsError.message);
        }
      }
    } catch (err) {
      console.error('[trace] flush error:', err);
    }
  }
}
