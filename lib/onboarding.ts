// Onboarding utilities and coach matching algorithm
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SAMPLE_COACHES } from '@/data/coaches';
import { Coach } from '@/types';

const ONBOARDING_DATA_KEY = 'coachgenie_onboarding_data_v2';
const LEGACY_ONBOARDING_KEY = 'coachgenie_onboarding';

interface LegacyOnboardingState {
  step?: string;
}

export interface OnboardingData {
  name: string;
  vibes: string[];
  selectedCoachId?: string;
  completedAt?: string;
}

/**
 * Vibe-to-coach matching algorithm
 * Matches user vibes to coaches based on their specialties
 */
const VIBE_COACH_MAPPING: Record<string, string[]> = {
  'Mental Clarity': ['coach-daily-clarity', 'coach-strategic-thinking'],
  'Daily Discipline': ['coach-systems-builder', 'coach-deep-work'],
  'Goal Achievement': ['coach-strategic-thinking', 'coach-mindset'],
  'Creative Flow': ['coach-deep-work', 'coach-systems-builder'],
  'Stress Relief': ['coach-mindset', 'coach-strategic-thinking'],
  'Peak Performance': ['coach-deep-work', 'coach-mindset'],
};

/**
 * Find the best-matching coach based on user's vibe selections
 */
export function findBestCoach(vibes: string[]): Coach | undefined {
  if (!vibes.length) return SAMPLE_COACHES[0];

  // Count coach matches for each vibe
  const coachScores: Record<string, number> = {};

  vibes.forEach((vibe) => {
    const matchingCoaches = VIBE_COACH_MAPPING[vibe] || [];
    matchingCoaches.forEach((coachId) => {
      coachScores[coachId] = (coachScores[coachId] || 0) + 1;
    });
  });

  // Find coach with highest score
  let bestCoachId: string | null = null;
  let maxScore = 0;

  Object.entries(coachScores).forEach(([coachId, score]) => {
    if (score > maxScore) {
      maxScore = score;
      bestCoachId = coachId;
    }
  });

  if (!bestCoachId) return SAMPLE_COACHES[0];

  return SAMPLE_COACHES.find((c) => c.id === bestCoachId);
}

/**
 * Save onboarding data (name, vibes, coach selection)
 */
export async function saveOnboardingData(data: Partial<OnboardingData>): Promise<void> {
  try {
    const current = await getOnboardingData();
    const updated = {
      ...current,
      ...data,
    };
    await AsyncStorage.setItem(ONBOARDING_DATA_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving onboarding data:', error);
    throw error;
  }
}

/**
 * Get current onboarding data
 */
export async function getOnboardingData(): Promise<OnboardingData> {
  try {
    const stored = await AsyncStorage.getItem(ONBOARDING_DATA_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading onboarding data:', error);
  }

  return {
    name: '',
    vibes: [],
  };
}

/**
 * Check if onboarding is complete.
 * Completion is represented by `completedAt` so legacy-complete users can be migrated once.
 */
export async function isNewOnboardingComplete(): Promise<boolean> {
  try {
    const data = await getOnboardingData();
    return Boolean(data.completedAt);
  } catch (error) {
    console.error('Error checking onboarding completion:', error);
    return false;
  }
}

/**
 * Check if legacy onboarding state is marked complete.
 */
export async function isLegacyOnboardingComplete(): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(LEGACY_ONBOARDING_KEY);
    if (!stored) {
      return false;
    }

    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object') {
      return false;
    }

    const legacyState = parsed as LegacyOnboardingState;
    return legacyState.step === 'complete';
  } catch (error) {
    console.warn('Error checking legacy onboarding completion:', error);
    return false;
  }
}

/**
 * One-time migration from legacy onboarding completion marker.
 * If legacy is complete but new onboarding is not, mark new onboarding complete.
 */
export async function migrateLegacyOnboardingCompletionIfNeeded(): Promise<boolean> {
  try {
    const legacyComplete = await isLegacyOnboardingComplete();
    if (!legacyComplete) {
      return false;
    }

    const newData = await getOnboardingData();
    if (newData.completedAt) {
      return false;
    }

    await completeNewOnboarding();
    return true;
  } catch (error) {
    console.warn('Error migrating legacy onboarding completion:', error);
    return false;
  }
}

/**
 * Complete onboarding by setting completion timestamp
 */
export async function completeNewOnboarding(): Promise<void> {
  try {
    await saveOnboardingData({
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error completing onboarding:', error);
    throw error;
  }
}

/**
 * Reset onboarding data
 */
export async function resetNewOnboarding(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ONBOARDING_DATA_KEY);
  } catch (error) {
    console.error('Error resetting onboarding:', error);
    throw error;
  }
}

/**
 * Get personalized greeting for a coach based on vibes
 */
export function getCoachGreeting(coach: Coach, vibes: string[], name: string): string {
  const baseGreetings: Record<string, string> = {
    'coach-daily-clarity': `Hey ${name}! I'm ${coach.name}, and I help people cut through the noise and focus on what truly matters. Your goals around ${vibes[0]} really resonate with me.`,
    'coach-deep-work': `Welcome ${name}! I'm ${coach.name}. I specialize in helping people do their best thinking and produce high-quality work. I see you're interested in ${vibes[0]} – that's exactly my wheelhouse.`,
    'coach-systems-builder': `${name}! Great to meet you. I'm ${coach.name}, and I build sustainable systems that make success automatic. Your focus on ${vibes[0]} tells me you're ready for real transformation.`,
    'coach-strategic-thinking': `${name}, I'm ${coach.name}. I help people zoom out from the daily grind and make strategic moves that compound. I'm excited to explore ${vibes[0]} with you.`,
    'coach-mindset': `Hello ${name}! I'm ${coach.name}. I help unlock your potential by addressing limiting beliefs and building resilience. Your interest in ${vibes[0]} shows you're ready to break through.`,
  };

  return baseGreetings[coach.id] || `Hi ${name}! I'm ${coach.name}. Let's explore your goals around ${vibes[0]}.`;
}

/**
 * Get opening coaching question based on vibes
 */
export function getOpeningQuestion(vibes: string[]): string {
  const questionMap: Record<string, string> = {
    'Mental Clarity': 'What\'s one area of your life right now where you feel most overwhelmed or unclear?',
    'Daily Discipline': 'What\'s your biggest challenge when it comes to staying consistent with what matters?',
    'Goal Achievement': 'What\'s the goal that\'s been on your mind but feels furthest away right now?',
    'Creative Flow': 'When was the last time you felt truly in flow, doing something meaningful?',
    'Stress Relief': 'What\'s causing you the most stress or tension right now?',
    'Peak Performance': 'What does peak performance look like for you in your daily life?',
  };

  const primaryVibe = vibes[0];
  return questionMap[primaryVibe] || 'What brought you here today, and what are you hoping to achieve?';
}
