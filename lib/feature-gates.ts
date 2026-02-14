import { getCreditStatus } from '@/lib/apiClient';
import { getUserSubscriptionTier } from '@/lib/revenuecat';
import { supabase } from '@/lib/supabase';

export type SubscriptionTier = 'free' | 'sovereign' | 'oracle';

export interface FeatureGate {
  monthlyCredits: number;
  maxCoaches: number;
  allowedCoachIds: string[] | 'all';
  voiceNotes: boolean;
  integrations: boolean;
  allAtmospheres: boolean;
  customCoaches: boolean;
  premiumModels: boolean;
  proactiveNudges: boolean;
  voiceCoaching: boolean;
  longitudinalDashboard: boolean;
  fullArchive: boolean;
  modelSelection: boolean;
}

export const FEATURE_GATES: Record<SubscriptionTier, FeatureGate> = {
  free: {
    monthlyCredits: 50,
    maxCoaches: 1,
    allowedCoachIds: ['coach-daily-clarity'],
    voiceNotes: false,
    integrations: false,
    allAtmospheres: false,
    customCoaches: false,
    premiumModels: false,
    proactiveNudges: false,
    voiceCoaching: false,
    longitudinalDashboard: false,
    fullArchive: false,
    modelSelection: false,
  },
  sovereign: {
    monthlyCredits: 300,
    maxCoaches: Number.POSITIVE_INFINITY,
    allowedCoachIds: 'all',
    voiceNotes: true,
    integrations: true,
    allAtmospheres: true,
    customCoaches: true,
    premiumModels: false,
    proactiveNudges: false,
    voiceCoaching: true,
    longitudinalDashboard: false,
    fullArchive: true,
    modelSelection: true,
  },
  oracle: {
    monthlyCredits: 1000,
    maxCoaches: Number.POSITIVE_INFINITY,
    allowedCoachIds: 'all',
    voiceNotes: true,
    integrations: true,
    allAtmospheres: true,
    customCoaches: true,
    premiumModels: true,
    proactiveNudges: true,
    voiceCoaching: true,
    longitudinalDashboard: true,
    fullArchive: true,
    modelSelection: true,
  },
};

// Daily Clarity Coach is always available to every tier.
export const FREE_COACH_ID = 'coach-daily-clarity';

const USER_TIER_CACHE_TTL_MS = 15_000;
const ANONYMOUS_USER_KEY = '__anonymous__';

let userTierCache:
  | {
      userId: string;
      tier: SubscriptionTier;
      expiresAt: number;
    }
  | null = null;

let inFlightTierRequest:
  | {
      userId: string;
      promise: Promise<SubscriptionTier>;
    }
  | null = null;

async function getSessionUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? null;
  } catch {
    return null;
  }
}

function getCacheKey(userId: string | null): string {
  return userId ?? ANONYMOUS_USER_KEY;
}

function getCachedTier(userId: string | null): SubscriptionTier | null {
  const cacheKey = getCacheKey(userId);
  if (!userTierCache) {
    return null;
  }
  if (userTierCache.userId !== cacheKey) {
    return null;
  }
  if (userTierCache.expiresAt <= Date.now()) {
    return null;
  }
  return userTierCache.tier;
}

function setCachedTier(userId: string | null, tier: SubscriptionTier): SubscriptionTier {
  userTierCache = {
    userId: getCacheKey(userId),
    tier,
    expiresAt: Date.now() + USER_TIER_CACHE_TTL_MS,
  };
  return tier;
}

export function invalidateUserTierCache(): void {
  userTierCache = null;
}

export async function getUserTier(): Promise<SubscriptionTier> {
  const sessionUserId = await getSessionUserId();
  const cachedTier = getCachedTier(sessionUserId);
  if (cachedTier) {
    return cachedTier;
  }

  const cacheKey = getCacheKey(sessionUserId);
  if (inFlightTierRequest && inFlightTierRequest.userId === cacheKey) {
    return inFlightTierRequest.promise;
  }

  const tierPromise = (async (): Promise<SubscriptionTier> => {
    try {
      if (sessionUserId) {
        const status = await getCreditStatus();
        return setCachedTier(sessionUserId, status.tier);
      }
    } catch (error) {
      console.warn('Could not resolve tier from billing status, falling back to RevenueCat:', error);
    }

    const revenueCatTier = await getUserSubscriptionTier();
    return setCachedTier(sessionUserId, revenueCatTier);
  })();

  inFlightTierRequest = {
    userId: cacheKey,
    promise: tierPromise,
  };

  try {
    return await tierPromise;
  } finally {
    if (inFlightTierRequest?.promise === tierPromise) {
      inFlightTierRequest = null;
    }
  }
}

export function getGates(tier: SubscriptionTier): FeatureGate {
  return FEATURE_GATES[tier];
}

export function getTierCreditPack(tier: SubscriptionTier): number {
  return FEATURE_GATES[tier].monthlyCredits;
}

export function canAccessCoach(tier: SubscriptionTier, coachId: string): boolean {
  if (coachId === FREE_COACH_ID) return true;

  const gates = FEATURE_GATES[tier];
  if (gates.allowedCoachIds === 'all') return true;
  return gates.allowedCoachIds.includes(coachId);
}

export function canAccessFeature(
  tier: SubscriptionTier,
  feature: keyof Omit<FeatureGate, 'monthlyCredits' | 'maxCoaches' | 'allowedCoachIds'>
): boolean {
  return FEATURE_GATES[tier][feature];
}

// Marketplace coaches are explicitly available to all tiers.
export function canAccessMarketplaceCoach(_tier: SubscriptionTier, _coachId: string): boolean {
  return true;
}
