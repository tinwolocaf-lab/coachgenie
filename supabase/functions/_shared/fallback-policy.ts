// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FallbackChainEntry {
  modelId: string;
  priority: number;
  maxLatencyMs: number;
}

export type FallbackChain = FallbackChainEntry[];

export interface SloConfig {
  p50LatencyMs: number;
  p95LatencyMs: number;
  errorRateThreshold: number;
  minAvailability: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DEFAULT_FALLBACK_CHAIN: FallbackChain = [
  { modelId: 'google/gemini-2.5-flash', priority: 1, maxLatencyMs: 3000 },
  { modelId: 'google/gemini-2.5-flash-lite', priority: 2, maxLatencyMs: 2000 },
  { modelId: 'openai/gpt-4o-mini', priority: 3, maxLatencyMs: 5000 },
];

export const SLOS: Record<string, SloConfig> = {
  chat: {
    p50LatencyMs: 2500,
    p95LatencyMs: 6000,
    errorRateThreshold: 0.02,
    minAvailability: 0.995,
  },
  nudge: {
    p50LatencyMs: 3000,
    p95LatencyMs: 8000,
    errorRateThreshold: 0.05,
    minAvailability: 0.99,
  },
  voice: {
    p50LatencyMs: 800,
    p95LatencyMs: 2000,
    errorRateThreshold: 0.02,
    minAvailability: 0.995,
  },
};

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Return the next model in the fallback chain that has not already failed.
 * Models are tried in ascending `priority` order (1 = highest priority).
 * Returns `null` when the chain is exhausted.
 */
export function getNextFallbackModel(
  failedModels: string[],
  chain: FallbackChain = DEFAULT_FALLBACK_CHAIN,
): string | null {
  const sorted = [...chain].sort((a, b) => a.priority - b.priority);
  const failed = new Set(failedModels);

  for (const entry of sorted) {
    if (!failed.has(entry.modelId)) {
      return entry.modelId;
    }
  }

  return null;
}

/**
 * Determine whether the observed latency warrants a fallback.
 * Returns `true` when latency exceeds the p95 threshold defined in the SLO.
 */
export function shouldFallback(latencyMs: number, slo: SloConfig): boolean {
  return latencyMs > slo.p95LatencyMs;
}

/**
 * Build observability headers that downstream services or logging can use
 * to trace which model handled a request and how many fallback attempts
 * were made.
 */
export function buildFallbackHeaders(
  modelId: string,
  attemptNumber: number,
): Record<string, string> {
  return {
    'X-Model-Id': modelId,
    'X-Fallback-Attempt': String(attemptNumber),
  };
}
