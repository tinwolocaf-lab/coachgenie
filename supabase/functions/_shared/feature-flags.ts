import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

// ── Types ───────────────────────────────────────────────────────────────

export interface FeatureFlag {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  rollout_percentage: number;
  allowed_tiers: string[];
  allowed_user_ids: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface FlagCheckResult {
  enabled: boolean;
  reason: string;
}

// ── Constants ────────────────────────────────────────────────────────────

const FLAG_CACHE_TTL_MS = 60_000; // 1 minute

// ── In-memory cache ──────────────────────────────────────────────────────

const flagCache = new Map<string, { flag: FeatureFlag; fetchedAt: number }>();

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Check whether a feature flag is enabled for a given user/tier combination.
 *
 * Resolution order:
 * 1. Return false if the flag row doesn't exist or `enabled` is false.
 * 2. If `allowed_user_ids` is non-empty, the user must be in the list.
 * 3. If `allowed_tiers` is non-empty, the user's tier must be in the list.
 * 4. Rollout percentage is checked via a deterministic hash of the userId.
 */
export async function isFeatureEnabled(
  serviceClient: SupabaseClient,
  flagName: string,
  opts?: { userId?: string; userTier?: string },
): Promise<boolean> {
  const result = await checkFeatureFlag(serviceClient, flagName, opts);
  return result.enabled;
}

/**
 * Full check with reason string (useful for logging/debugging).
 */
export async function checkFeatureFlag(
  serviceClient: SupabaseClient,
  flagName: string,
  opts?: { userId?: string; userTier?: string },
): Promise<FlagCheckResult> {
  const flag = await fetchFlag(serviceClient, flagName);

  if (!flag) {
    return { enabled: false, reason: 'flag_not_found' };
  }

  if (!flag.enabled) {
    return { enabled: false, reason: 'flag_disabled' };
  }

  // User allowlist check
  if (flag.allowed_user_ids.length > 0) {
    if (!opts?.userId || !flag.allowed_user_ids.includes(opts.userId)) {
      return { enabled: false, reason: 'user_not_in_allowlist' };
    }
  }

  // Tier check
  if (flag.allowed_tiers.length > 0) {
    if (!opts?.userTier || !flag.allowed_tiers.includes(opts.userTier)) {
      return { enabled: false, reason: 'tier_not_allowed' };
    }
  }

  // Rollout percentage check
  if (flag.rollout_percentage < 100) {
    if (!opts?.userId) {
      return { enabled: false, reason: 'no_user_id_for_rollout' };
    }
    const bucket = hashUserForRollout(opts.userId);
    if (bucket >= flag.rollout_percentage) {
      return { enabled: false, reason: 'outside_rollout_percentage' };
    }
  }

  return { enabled: true, reason: 'all_checks_passed' };
}

/**
 * Return all feature flags from the database (no caching).
 */
export async function getAllFlags(
  serviceClient: SupabaseClient,
): Promise<FeatureFlag[]> {
  const { data, error } = await serviceClient
    .from('feature_flags')
    .select('*')
    .order('name');

  if (error) {
    console.error('[feature-flags] Failed to fetch all flags:', error.message);
    return [];
  }

  return (data ?? []).map(mapRowToFlag);
}

/**
 * Clear the in-memory flag cache. Useful after manual flag updates.
 */
export function clearFlagCache(): void {
  flagCache.clear();
}

/**
 * Deterministic hash of a userId to a number in [0, 99].
 * Used to assign users to rollout buckets.
 */
export function hashUserForRollout(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0; // Convert to 32-bit int
  }
  return Math.abs(hash) % 100;
}

// ── Internals ────────────────────────────────────────────────────────────

async function fetchFlag(
  serviceClient: SupabaseClient,
  flagName: string,
): Promise<FeatureFlag | null> {
  const now = Date.now();
  const cached = flagCache.get(flagName);

  if (cached && now - cached.fetchedAt < FLAG_CACHE_TTL_MS) {
    return cached.flag;
  }

  const { data, error } = await serviceClient
    .from('feature_flags')
    .select('*')
    .eq('name', flagName)
    .single();

  if (error || !data) {
    // Remove stale cache entry if the flag no longer exists
    flagCache.delete(flagName);
    return null;
  }

  const flag = mapRowToFlag(data);
  flagCache.set(flagName, { flag, fetchedAt: now });
  return flag;
}

function mapRowToFlag(row: Record<string, unknown>): FeatureFlag {
  return {
    id: (row.id as string) ?? '',
    name: (row.name as string) ?? '',
    description: (row.description as string) ?? null,
    enabled: (row.enabled as boolean) ?? false,
    rollout_percentage: (row.rollout_percentage as number) ?? 0,
    allowed_tiers: (row.allowed_tiers as string[]) ?? [],
    allowed_user_ids: (row.allowed_user_ids as string[]) ?? [],
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    created_at: (row.created_at as string) ?? '',
    updated_at: (row.updated_at as string) ?? '',
  };
}
