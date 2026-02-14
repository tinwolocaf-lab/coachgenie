import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DEFAULT_LIMITS = {
  chat_messages_per_minute: 10,
  chat_messages_per_hour: 60,
  nudges_per_day: 5,
  memory_writes_per_minute: 20,
  api_calls_per_minute: 30,
} as const;

// ---------------------------------------------------------------------------
// Core rate-limit check
// ---------------------------------------------------------------------------

/**
 * Check whether a user has exceeded a rate limit for a given action.
 *
 * Counts rows in `agent_runs` created by `userId` within the last
 * `windowMs` milliseconds and compares to `limit`.  Because edge functions
 * are short-lived (no persistent in-memory state across invocations) we
 * query the database on every call.
 */
export async function checkRateLimit(
  serviceClient: SupabaseClient,
  opts: {
    userId: string;
    action: string;
    limit: number;
    windowMs: number;
  },
): Promise<RateLimitResult> {
  const windowStart = new Date(Date.now() - opts.windowMs).toISOString();

  const { count, error } = await serviceClient
    .from('agent_runs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', opts.userId)
    .eq('trigger_type', opts.action)
    .gte('created_at', windowStart);

  if (error) {
    // If the query fails, allow the request but log the error so we
    // don't accidentally block users due to an infrastructure issue.
    console.error('[rate-limiter] query failed:', error.message);
    return { allowed: true, remaining: opts.limit, retryAfterMs: null };
  }

  const used = count ?? 0;
  const remaining = Math.max(0, opts.limit - used);

  if (used >= opts.limit) {
    // Estimate retry-after as the full window duration (worst-case).
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: opts.windowMs,
    };
  }

  return { allowed: true, remaining, retryAfterMs: null };
}

// ---------------------------------------------------------------------------
// Convenience wrappers
// ---------------------------------------------------------------------------

/**
 * Check the per-minute chat message rate limit for a user.
 */
export async function checkChatRateLimit(
  serviceClient: SupabaseClient,
  userId: string,
): Promise<RateLimitResult> {
  return checkRateLimit(serviceClient, {
    userId,
    action: 'user_message',
    limit: DEFAULT_LIMITS.chat_messages_per_minute,
    windowMs: 60_000,
  });
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/**
 * Return a human-readable error string for a denied rate-limit result.
 */
export function formatRateLimitError(result: RateLimitResult): string {
  if (result.allowed) {
    return '';
  }

  const retrySeconds = result.retryAfterMs
    ? Math.ceil(result.retryAfterMs / 1000)
    : null;

  if (retrySeconds) {
    return `Rate limit exceeded. Please wait ${retrySeconds} seconds before trying again.`;
  }

  return 'Rate limit exceeded. Please try again later.';
}
