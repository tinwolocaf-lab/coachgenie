import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserSubscriptionTier } from '@/lib/revenuecat';

export type SubscriptionTier = 'free' | 'sovereign' | 'oracle';

export interface FeatureGate {
  sessionsPerDay: number;
  messagesPerSession: number;
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
}

export const FEATURE_GATES: Record<SubscriptionTier, FeatureGate> = {
  free: {
    sessionsPerDay: 3,
    messagesPerSession: 15,
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
  },
  sovereign: {
    sessionsPerDay: Infinity,
    messagesPerSession: Infinity,
    maxCoaches: Infinity,
    allowedCoachIds: 'all',
    voiceNotes: true,
    integrations: true,
    allAtmospheres: true,
    customCoaches: false,
    premiumModels: false,
    proactiveNudges: false,
    voiceCoaching: false,
    longitudinalDashboard: false,
    fullArchive: true,
  },
  oracle: {
    sessionsPerDay: Infinity,
    messagesPerSession: Infinity,
    maxCoaches: Infinity,
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
  },
};

const SESSION_COUNT_KEY = 'coachgenie_daily_sessions';

export async function getUserTier(): Promise<SubscriptionTier> {
  return getUserSubscriptionTier();
}

export function getGates(tier: SubscriptionTier): FeatureGate {
  return FEATURE_GATES[tier];
}

export function canAccessCoach(tier: SubscriptionTier, coachId: string): boolean {
  const gates = FEATURE_GATES[tier];
  if (gates.allowedCoachIds === 'all') return true;
  return gates.allowedCoachIds.includes(coachId);
}

export function canAccessFeature(tier: SubscriptionTier, feature: keyof Omit<FeatureGate, 'sessionsPerDay' | 'messagesPerSession' | 'maxCoaches' | 'allowedCoachIds'>): boolean {
  return FEATURE_GATES[tier][feature];
}

interface DailySessionCount {
  date: string;
  count: number;
}

export async function getRemainingSessionsToday(tier: SubscriptionTier): Promise<number> {
  const gates = FEATURE_GATES[tier];
  if (gates.sessionsPerDay === Infinity) return Infinity;

  const today = new Date().toISOString().split('T')[0];
  try {
    const raw = await AsyncStorage.getItem(SESSION_COUNT_KEY);
    if (!raw) return gates.sessionsPerDay;

    const data: DailySessionCount = JSON.parse(raw);
    if (data.date !== today) return gates.sessionsPerDay;

    return Math.max(0, gates.sessionsPerDay - data.count);
  } catch {
    return gates.sessionsPerDay;
  }
}

export async function incrementSessionCount(): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  try {
    const raw = await AsyncStorage.getItem(SESSION_COUNT_KEY);
    let data: DailySessionCount = { date: today, count: 0 };

    if (raw) {
      data = JSON.parse(raw);
      if (data.date !== today) {
        data = { date: today, count: 0 };
      }
    }

    data.count += 1;
    await AsyncStorage.setItem(SESSION_COUNT_KEY, JSON.stringify(data));
  } catch {
    // Silently fail - don't block session creation
  }
}
