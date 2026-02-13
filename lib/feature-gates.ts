import { getUserSubscriptionTier } from '@/lib/revenuecat';

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
    customCoaches: false,
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

export async function getUserTier(): Promise<SubscriptionTier> {
  return getUserSubscriptionTier();
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
