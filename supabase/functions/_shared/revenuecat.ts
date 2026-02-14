import { createServiceClient } from './supabase.ts';
import { BillingTier, getTierRank, normalizeTier } from './modelCatalog.ts';

const REVENUECAT_BASE_URL = Deno.env.get('REVENUECAT_BASE_URL') ?? 'https://api.revenuecat.com/v1';
const REVENUECAT_SECRET_KEY =
  Deno.env.get('REVENUECAT_SECRET_KEY') ??
  Deno.env.get('REVENUECAT_API_KEY') ??
  Deno.env.get('REVENUECAT_PRIVATE_KEY') ??
  '';

const REVENUECAT_SOVEREIGN_ENTITLEMENT = Deno.env.get('REVENUECAT_SOVEREIGN_ENTITLEMENT') ?? 'sovereign';
const REVENUECAT_ORACLE_ENTITLEMENT = Deno.env.get('REVENUECAT_ORACLE_ENTITLEMENT') ?? 'oracle';
const CACHE_TTL_SECONDS = Number(Deno.env.get('BILLING_TIER_CACHE_TTL_SECONDS') ?? '21600');
const FALLBACK_CACHE_TTL_SECONDS = Number(Deno.env.get('BILLING_TIER_FALLBACK_TTL_SECONDS') ?? '1800');

export interface TierResolutionResult {
  tier: BillingTier;
  source: 'cache' | 'revenuecat' | 'fallback' | 'trial_coupon';
  paidTier: BillingTier;
  trialTier: Exclude<BillingTier, 'free'> | null;
  trialEndsAt: string | null;
  trialDays: number | null;
  verifiedAt: string;
  expiresAt: string;
}

interface BillingTierCacheRow {
  tier: string;
  verified_at: string;
  expires_at: string;
}

interface ActiveTrialRedemptionRow {
  target_tier: string;
  trial_days: number;
  ends_at: string;
}

interface RevenueCatEntitlement {
  expires_date?: string | null;
  purchase_date?: string | null;
}

interface RevenueCatSubscriber {
  entitlements?: Record<string, RevenueCatEntitlement>;
}

interface RevenueCatSubscriberResponse {
  subscriber?: RevenueCatSubscriber;
}

function nowIso(): string {
  return new Date().toISOString();
}

function plusSecondsIso(fromIso: string, seconds: number): string {
  const from = new Date(fromIso);
  return new Date(from.getTime() + seconds * 1000).toISOString();
}

function isFuture(iso: string | null | undefined): boolean {
  if (!iso) return false;
  return new Date(iso).getTime() > Date.now();
}

function isEntitlementActive(entitlement: RevenueCatEntitlement | undefined): boolean {
  if (!entitlement) {
    return false;
  }
  if (!entitlement.expires_date) {
    return true;
  }
  return isFuture(entitlement.expires_date);
}

function inferTierFromRevenueCat(payload: RevenueCatSubscriberResponse): BillingTier {
  const entitlements = payload.subscriber?.entitlements ?? {};
  if (isEntitlementActive(entitlements[REVENUECAT_ORACLE_ENTITLEMENT])) {
    return 'oracle';
  }
  if (isEntitlementActive(entitlements[REVENUECAT_SOVEREIGN_ENTITLEMENT])) {
    return 'sovereign';
  }
  return 'free';
}

function isTrialTier(value: string | null | undefined): value is Exclude<BillingTier, 'free'> {
  return value === 'sovereign' || value === 'oracle';
}

async function fetchRevenueCatTier(userId: string): Promise<BillingTier> {
  if (!REVENUECAT_SECRET_KEY) {
    throw new Error('REVENUECAT_SECRET_KEY_NOT_CONFIGURED');
  }

  const url = `${REVENUECAT_BASE_URL.replace(/\/$/, '')}/subscribers/${encodeURIComponent(userId)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${REVENUECAT_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`REVENUECAT_REQUEST_FAILED:${response.status}:${body}`);
  }

  const payload = (await response.json()) as RevenueCatSubscriberResponse;
  return inferTierFromRevenueCat(payload);
}

async function getCache(
  serviceClient: ReturnType<typeof createServiceClient>,
  userId: string
): Promise<BillingTierCacheRow | null> {
  const { data, error } = await serviceClient
    .from('billing_tier_cache')
    .select('tier, verified_at, expires_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.warn('[RevenueCat] Failed to read tier cache:', error.message);
    return null;
  }

  return data;
}

async function writeCache(
  serviceClient: ReturnType<typeof createServiceClient>,
  userId: string,
  tier: BillingTier,
  source: string,
  verifiedAt: string,
  expiresAt: string
): Promise<void> {
  const { error } = await serviceClient
    .from('billing_tier_cache')
    .upsert(
      {
        user_id: userId,
        tier,
        source,
        verified_at: verifiedAt,
        expires_at: expiresAt,
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.warn('[RevenueCat] Failed to write tier cache:', error.message);
  }
}

async function getActiveTrialRedemption(
  serviceClient: ReturnType<typeof createServiceClient>,
  userId: string
): Promise<{ tier: Exclude<BillingTier, 'free'>; trialDays: number; endsAt: string } | null> {
  const now = nowIso();
  const { data, error } = await serviceClient
    .from('trial_coupon_redemptions')
    .select('target_tier, trial_days, ends_at')
    .eq('user_id', userId)
    .gt('ends_at', now)
    .order('ends_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn('[RevenueCat] Failed to read active trial redemption:', error.message);
    return null;
  }

  if (!data) {
    return null;
  }

  const row = data as ActiveTrialRedemptionRow;
  if (!isTrialTier(row.target_tier)) {
    return null;
  }

  return {
    tier: row.target_tier,
    trialDays: Number.isFinite(row.trial_days) ? row.trial_days : 30,
    endsAt: row.ends_at,
  };
}

export async function resolveBillingTier(
  serviceClient: ReturnType<typeof createServiceClient>,
  userId: string
): Promise<TierResolutionResult> {
  let paidTier: BillingTier;
  let paidSource: 'cache' | 'revenuecat' | 'fallback';
  let verifiedAt: string;
  let expiresAt: string;

  const cached = await getCache(serviceClient, userId);
  if (cached && isFuture(cached.expires_at)) {
    paidTier = normalizeTier(cached.tier);
    paidSource = 'cache';
    verifiedAt = cached.verified_at;
    expiresAt = cached.expires_at;
  } else {
    verifiedAt = nowIso();
    try {
      paidTier = await fetchRevenueCatTier(userId);
      paidSource = 'revenuecat';
      expiresAt = plusSecondsIso(verifiedAt, CACHE_TTL_SECONDS);
      await writeCache(serviceClient, userId, paidTier, paidSource, verifiedAt, expiresAt);
    } catch (error) {
      console.warn('[RevenueCat] Tier verification failed, using fallback free tier:', error);
      paidTier = 'free';
      paidSource = 'fallback';
      expiresAt = plusSecondsIso(verifiedAt, FALLBACK_CACHE_TTL_SECONDS);
      await writeCache(serviceClient, userId, paidTier, paidSource, verifiedAt, expiresAt);
    }
  }

  const trial = await getActiveTrialRedemption(serviceClient, userId);
  let tier = paidTier;
  let source: TierResolutionResult['source'] = paidSource;

  if (trial && getTierRank(trial.tier) > getTierRank(tier)) {
    tier = trial.tier;
    source = 'trial_coupon';
  }

  return {
    tier,
    source,
    paidTier,
    trialTier: trial?.tier ?? null,
    trialEndsAt: trial?.endsAt ?? null,
    trialDays: trial?.trialDays ?? null,
    verifiedAt,
    expiresAt,
  };
}
