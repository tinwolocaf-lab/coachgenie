// App State Store using AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';
import { InstalledCoach, Session, DayPlan, ContextVault } from '@/types';

const KEYS = {
  INSTALLED_COACHES: 'coachgenie_installed_coaches',
  INSTALLED_COACHES_MIGRATION_PREFIX: 'coachgenie_installed_coaches_migrated_',
  ACTIVE_COACH_ID: 'coachgenie_active_coach_id',
  SESSIONS: 'coachgenie_sessions',
  CURRENT_SESSION_ID: 'coachgenie_current_session_id',
  DAY_PLANS: 'coachgenie_day_plans',
  CONTEXT_VAULT: 'coachgenie_context_vault',
};

// Installed Coaches
export async function getInstalledCoaches(): Promise<InstalledCoach[]> {
  try {
    const stored = await AsyncStorage.getItem(KEYS.INSTALLED_COACHES);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading installed coaches:', error);
    return [];
  }
}

export async function saveInstalledCoaches(coaches: InstalledCoach[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.INSTALLED_COACHES, JSON.stringify(coaches));
}

export async function installCoach(coach: InstalledCoach): Promise<void> {
  const coaches = await getInstalledCoaches();
  const exists = coaches.find(c => c.coach_id === coach.coach_id);
  if (!exists) {
    coaches.push(coach);
    await saveInstalledCoaches(coaches);
  }
}

export async function uninstallCoach(coachId: string): Promise<void> {
  const coaches = await getInstalledCoaches();
  const filtered = coaches.filter(c => c.coach_id !== coachId);
  await saveInstalledCoaches(filtered);
}

export async function hasInstalledCoachMigrationRun(userId: string): Promise<boolean> {
  try {
    const key = `${KEYS.INSTALLED_COACHES_MIGRATION_PREFIX}${userId}`;
    const value = await AsyncStorage.getItem(key);
    return value === '1';
  } catch (error) {
    console.error('Error reading installed coach migration flag:', error);
    return false;
  }
}

export async function markInstalledCoachMigrationRun(userId: string): Promise<void> {
  const key = `${KEYS.INSTALLED_COACHES_MIGRATION_PREFIX}${userId}`;
  await AsyncStorage.setItem(key, '1');
}

// Active Coach
export async function getActiveCoachId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEYS.ACTIVE_COACH_ID);
  } catch (error) {
    console.error('Error reading active coach:', error);
    return null;
  }
}

export async function setActiveCoachId(coachId: string): Promise<void> {
  await AsyncStorage.setItem(KEYS.ACTIVE_COACH_ID, coachId);
}

// Sessions
export async function getSessions(): Promise<Session[]> {
  try {
    const stored = await AsyncStorage.getItem(KEYS.SESSIONS);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading sessions:', error);
    return [];
  }
}

export async function saveSessions(sessions: Session[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
}

export async function addSession(session: Session): Promise<void> {
  const sessions = await getSessions();
  sessions.unshift(session);
  await saveSessions(sessions);
}

export async function updateSession(sessionId: string, updates: Partial<Session>): Promise<void> {
  const sessions = await getSessions();
  const index = sessions.findIndex(s => s.id === sessionId);
  if (index !== -1) {
    sessions[index] = { ...sessions[index], ...updates };
    await saveSessions(sessions);
  }
}

// Current Session
export async function getCurrentSessionId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEYS.CURRENT_SESSION_ID);
  } catch (error) {
    return null;
  }
}

export async function setCurrentSessionId(sessionId: string | null): Promise<void> {
  if (sessionId) {
    await AsyncStorage.setItem(KEYS.CURRENT_SESSION_ID, sessionId);
  } else {
    await AsyncStorage.removeItem(KEYS.CURRENT_SESSION_ID);
  }
}

// Day Plans
export async function getDayPlans(): Promise<DayPlan[]> {
  try {
    const stored = await AsyncStorage.getItem(KEYS.DAY_PLANS);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error reading day plans:', error);
    return [];
  }
}

export async function saveDayPlans(plans: DayPlan[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.DAY_PLANS, JSON.stringify(plans));
}

export async function getDayPlan(date: string): Promise<DayPlan | null> {
  const plans = await getDayPlans();
  return plans.find(p => p.date === date) || null;
}

export async function updateDayPlan(plan: DayPlan): Promise<void> {
  const plans = await getDayPlans();
  const index = plans.findIndex(p => p.date === plan.date);
  if (index !== -1) {
    plans[index] = plan;
  } else {
    plans.push(plan);
  }
  await saveDayPlans(plans);
}

// Context Vault
export async function getContextVault(): Promise<ContextVault | null> {
  try {
    const stored = await AsyncStorage.getItem(KEYS.CONTEXT_VAULT);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Error reading context vault:', error);
    return null;
  }
}

export async function saveContextVault(vault: ContextVault): Promise<void> {
  await AsyncStorage.setItem(KEYS.CONTEXT_VAULT, JSON.stringify(vault));
}

// Clear all app data (for logout)
export async function clearAllData(): Promise<void> {
  await Promise.all(
    Object.values(KEYS).map(key => AsyncStorage.removeItem(key))
  );
}
