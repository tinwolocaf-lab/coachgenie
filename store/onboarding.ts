// Onboarding State Store using AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingState, OnboardingStep, Goal, Constraints, Preferences } from '@/types';

const ONBOARDING_KEY = 'coachgenie_onboarding';

const defaultConstraints: Constraints = {
  available_hours_per_day: 4,
  energy_level: 'medium',
  best_time_for_focus: 'morning',
};

const defaultPreferences: Preferences = {
  tone: 50,
  directness: 50,
  response_length: 'balanced',
};

export const initialOnboardingState: OnboardingState = {
  step: 'welcome',
  values: [],
  goals: [],
  constraints: defaultConstraints,
  preferences: defaultPreferences,
};

export async function getOnboardingState(): Promise<OnboardingState> {
  try {
    const stored = await AsyncStorage.getItem(ONBOARDING_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading onboarding state:', error);
  }
  return initialOnboardingState;
}

export async function saveOnboardingState(state: Partial<OnboardingState>): Promise<void> {
  try {
    const current = await getOnboardingState();
    const updated = { ...current, ...state };
    await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving onboarding state:', error);
    throw error;
  }
}

export async function updateOnboardingStep(step: OnboardingStep): Promise<void> {
  await saveOnboardingState({ step });
}

export async function updateValues(values: string[]): Promise<void> {
  await saveOnboardingState({ values });
}

export async function updateGoals(goals: Goal[]): Promise<void> {
  await saveOnboardingState({ goals });
}

export async function updateConstraints(constraints: Constraints): Promise<void> {
  await saveOnboardingState({ constraints });
}

export async function updatePreferences(preferences: Preferences): Promise<void> {
  await saveOnboardingState({ preferences });
}

export async function setSelectedCoach(coach_id: string): Promise<void> {
  await saveOnboardingState({ selected_coach_id: coach_id });
}

export async function completeOnboarding(): Promise<void> {
  await saveOnboardingState({ step: 'complete' });
}

export async function resetOnboarding(): Promise<void> {
  await AsyncStorage.removeItem(ONBOARDING_KEY);
}

export async function isOnboardingComplete(): Promise<boolean> {
  const state = await getOnboardingState();
  return state.step === 'complete';
}
