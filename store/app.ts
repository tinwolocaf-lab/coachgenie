// App State Store using AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  InstalledCoach,
  Session,
  DayPlan,
  ContextVault,
  Goal,
  Priority,
  TimeBlock,
  Constraints,
  Preferences,
} from '@/types';
import { logNonFatal } from '@/lib/telemetry';

const KEYS = {
  INSTALLED_COACHES: 'coachgenie_installed_coaches',
  INSTALLED_COACHES_MIGRATION_PREFIX: 'coachgenie_installed_coaches_migrated_',
  ACTIVE_COACH_ID: 'coachgenie_active_coach_id',
  SESSIONS: 'coachgenie_sessions',
  CURRENT_SESSION_ID: 'coachgenie_current_session_id',
  DAY_PLANS: 'coachgenie_day_plans',
  CONTEXT_VAULT: 'coachgenie_context_vault',
} as const;

const DEFAULT_CONSTRAINTS: Constraints = {
  available_hours_per_day: 4,
  energy_level: 'medium',
  best_time_for_focus: 'morning',
};

const DEFAULT_PREFERENCES: Preferences = {
  tone: 50,
  directness: 50,
  response_length: 'balanced',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function asNullableString(value: unknown): string | null | undefined {
  if (value === null) return null;
  return asString(value);
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function sanitizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
}

function parseStoredJson(stored: string | null, key: string): unknown {
  if (!stored) return null;
  try {
    return JSON.parse(stored) as unknown;
  } catch (error) {
    logNonFatal(error, {
      scope: `storage:${key}:parse`,
      message: 'Stored JSON was invalid and could not be parsed',
    });
    return null;
  }
}

function normalizeGoal(value: unknown, index: number): Goal | null {
  if (!isRecord(value)) return null;

  const title = asString(value.title);
  if (!title) return null;

  const id = asString(value.id) ?? `goal-${index + 1}`;

  return {
    id,
    title,
    description: asString(value.description),
    target_date: asString(value.target_date),
    is_30_day_focus: asBoolean(value.is_30_day_focus) ?? false,
  };
}

function normalizeConstraints(value: unknown): Constraints {
  if (!isRecord(value)) return DEFAULT_CONSTRAINTS;

  const availableHours = asNumber(value.available_hours_per_day);
  const energyLevel = asString(value.energy_level);
  const bestTimeForFocus = asString(value.best_time_for_focus);

  return {
    available_hours_per_day: availableHours !== undefined ? clamp(availableHours, 0, 24) : DEFAULT_CONSTRAINTS.available_hours_per_day,
    energy_level:
      energyLevel === 'low' || energyLevel === 'medium' || energyLevel === 'high'
        ? energyLevel
        : DEFAULT_CONSTRAINTS.energy_level,
    best_time_for_focus:
      bestTimeForFocus === 'morning' || bestTimeForFocus === 'afternoon' || bestTimeForFocus === 'evening'
        ? bestTimeForFocus
        : DEFAULT_CONSTRAINTS.best_time_for_focus,
  };
}

function normalizePreferences(value: unknown): Preferences {
  if (!isRecord(value)) return DEFAULT_PREFERENCES;

  const tone = asNumber(value.tone);
  const directness = asNumber(value.directness);
  const responseLength = asString(value.response_length);

  return {
    tone: tone !== undefined ? clamp(Math.round(tone), 0, 100) : DEFAULT_PREFERENCES.tone,
    directness: directness !== undefined ? clamp(Math.round(directness), 0, 100) : DEFAULT_PREFERENCES.directness,
    response_length:
      responseLength === 'concise' || responseLength === 'balanced' || responseLength === 'detailed'
        ? responseLength
        : DEFAULT_PREFERENCES.response_length,
  };
}

function normalizeContextVault(value: unknown): ContextVault | null {
  if (!isRecord(value)) return null;

  const goals = Array.isArray(value.goals)
    ? value.goals
        .map((goal, index) => normalizeGoal(goal, index))
        .filter((goal): goal is Goal => goal !== null)
    : [];

  return {
    id: asString(value.id) ?? 'local-vault',
    user_id: asString(value.user_id) ?? 'local-user',
    values: sanitizeStringArray(value.values),
    goals,
    constraints: normalizeConstraints(value.constraints),
    preferences: normalizePreferences(value.preferences),
    updated_at: asString(value.updated_at) ?? new Date().toISOString(),
  };
}

function normalizePriority(value: unknown, index: number): Priority | null {
  if (!isRecord(value)) return null;
  const title = asString(value.title);
  if (!title) return null;

  return {
    id: asString(value.id) ?? `priority-${index + 1}`,
    title,
    completed: asBoolean(value.completed) ?? false,
    order: asNumber(value.order) ?? index + 1,
  };
}

function normalizeTimeBlock(value: unknown, index: number): TimeBlock | null {
  if (!isRecord(value)) return null;
  const title = asString(value.title);
  if (!title) return null;

  return {
    id: asString(value.id) ?? `timeblock-${index + 1}`,
    title,
    start_time: asString(value.start_time) ?? '09:00',
    end_time: asString(value.end_time) ?? '10:00',
    category: asString(value.category),
  };
}

function normalizeDayPlan(value: unknown, index: number): DayPlan | null {
  if (!isRecord(value)) return null;

  const id = asString(value.id) ?? `plan-${index + 1}`;
  const userId = asString(value.user_id) ?? 'local-user';
  const date = asString(value.date);
  if (!date) return null;

  const topPriorities = Array.isArray(value.top_priorities)
    ? value.top_priorities
        .map((priority, priorityIndex) => normalizePriority(priority, priorityIndex))
        .filter((priority): priority is Priority => priority !== null)
    : [];

  const timeBlocks = Array.isArray(value.time_blocks)
    ? value.time_blocks
        .map((timeBlock, timeBlockIndex) => normalizeTimeBlock(timeBlock, timeBlockIndex))
        .filter((timeBlock): timeBlock is TimeBlock => timeBlock !== null)
    : [];

  const now = new Date().toISOString();

  return {
    id,
    user_id: userId,
    date,
    top_priorities: topPriorities,
    time_blocks: timeBlocks,
    created_at: asString(value.created_at) ?? now,
    updated_at: asString(value.updated_at) ?? now,
  };
}

function normalizeSession(value: unknown, index: number): Session | null {
  if (!isRecord(value)) return null;

  const id = asString(value.id) ?? `session-${index + 1}`;
  const userId = asString(value.user_id) ?? 'local-user';
  const coachId = asString(value.coach_id);
  const title = asString(value.title);
  const createdAt = asString(value.created_at);

  if (!coachId || !title || !createdAt) {
    return null;
  }

  const status = asString(value.status) === 'completed' ? 'completed' : 'active';

  return {
    id,
    user_id: userId,
    coach_id: coachId,
    title,
    status,
    summary: asString(value.summary),
    created_at: createdAt,
    completed_at: asString(value.completed_at),
  };
}

function normalizeInstalledCoach(value: unknown, index: number): InstalledCoach | null {
  if (!isRecord(value)) return null;

  const coachId = asString(value.coach_id);
  if (!coachId) return null;

  const installedAt = asString(value.installed_at) ?? new Date().toISOString();

  return {
    id: asString(value.id),
    user_id: asString(value.user_id) ?? 'local-user',
    coach_id: coachId,
    is_active: asBoolean(value.is_active) ?? true,
    installed_at: installedAt,
    uninstalled_at: asNullableString(value.uninstalled_at),
    snapshot: isRecord(value.snapshot) ? (value.snapshot as unknown as InstalledCoach['snapshot']) : undefined,
    coach: isRecord(value.coach) ? (value.coach as unknown as InstalledCoach['coach']) : undefined,
  };
}

// Installed Coaches
export async function getInstalledCoaches(): Promise<InstalledCoach[]> {
  try {
    const stored = await AsyncStorage.getItem(KEYS.INSTALLED_COACHES);
    const parsed = parseStoredJson(stored, KEYS.INSTALLED_COACHES);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((coach, index) => normalizeInstalledCoach(coach, index))
      .filter((coach): coach is InstalledCoach => coach !== null);
  } catch (error) {
    logNonFatal(error, {
      scope: 'storage:installed-coaches:read',
      message: 'Error reading installed coaches',
    });
    return [];
  }
}

export async function saveInstalledCoaches(coaches: InstalledCoach[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.INSTALLED_COACHES, JSON.stringify(coaches));
}

export async function installCoach(coach: InstalledCoach): Promise<void> {
  const coaches = await getInstalledCoaches();
  const exists = coaches.find((candidate) => candidate.coach_id === coach.coach_id);
  if (!exists) {
    coaches.push(coach);
    await saveInstalledCoaches(coaches);
  }
}

export async function uninstallCoach(coachId: string): Promise<void> {
  const coaches = await getInstalledCoaches();
  const filtered = coaches.filter((coach) => coach.coach_id !== coachId);
  await saveInstalledCoaches(filtered);
}

export async function hasInstalledCoachMigrationRun(userId: string): Promise<boolean> {
  try {
    const key = `${KEYS.INSTALLED_COACHES_MIGRATION_PREFIX}${userId}`;
    const value = await AsyncStorage.getItem(key);
    return value === '1';
  } catch (error) {
    logNonFatal(error, {
      scope: 'storage:installed-coaches:migration-flag:read',
      message: 'Error reading installed coach migration flag',
    });
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
    const stored = await AsyncStorage.getItem(KEYS.ACTIVE_COACH_ID);
    return asString(stored) ?? null;
  } catch (error) {
    logNonFatal(error, {
      scope: 'storage:active-coach:read',
      message: 'Error reading active coach',
    });
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
    const parsed = parseStoredJson(stored, KEYS.SESSIONS);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((session, index) => normalizeSession(session, index))
      .filter((session): session is Session => session !== null);
  } catch (error) {
    logNonFatal(error, {
      scope: 'storage:sessions:read',
      message: 'Error reading sessions',
    });
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
  const index = sessions.findIndex((session) => session.id === sessionId);
  if (index !== -1) {
    sessions[index] = { ...sessions[index], ...updates };
    await saveSessions(sessions);
  }
}

// Current Session
export async function getCurrentSessionId(): Promise<string | null> {
  try {
    const stored = await AsyncStorage.getItem(KEYS.CURRENT_SESSION_ID);
    return asString(stored) ?? null;
  } catch (error) {
    logNonFatal(error, {
      scope: 'storage:current-session:read',
      message: 'Error reading current session id',
    });
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
    const parsed = parseStoredJson(stored, KEYS.DAY_PLANS);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((plan, index) => normalizeDayPlan(plan, index))
      .filter((plan): plan is DayPlan => plan !== null);
  } catch (error) {
    logNonFatal(error, {
      scope: 'storage:day-plans:read',
      message: 'Error reading day plans',
    });
    return [];
  }
}

export async function saveDayPlans(plans: DayPlan[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.DAY_PLANS, JSON.stringify(plans));
}

export async function getDayPlan(date: string): Promise<DayPlan | null> {
  const plans = await getDayPlans();
  return plans.find((plan) => plan.date === date) ?? null;
}

export async function updateDayPlan(plan: DayPlan): Promise<void> {
  const plans = await getDayPlans();
  const index = plans.findIndex((candidate) => candidate.date === plan.date);
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
    const parsed = parseStoredJson(stored, KEYS.CONTEXT_VAULT);
    return normalizeContextVault(parsed);
  } catch (error) {
    logNonFatal(error, {
      scope: 'storage:context-vault:read',
      message: 'Error reading context vault',
    });
    return null;
  }
}

export async function saveContextVault(vault: ContextVault): Promise<void> {
  const normalized = normalizeContextVault(vault);
  if (!normalized) {
    throw new Error('Invalid context vault payload');
  }
  await AsyncStorage.setItem(KEYS.CONTEXT_VAULT, JSON.stringify(normalized));
}

// Clear all app data (for logout)
export async function clearAllData(): Promise<void> {
  await Promise.all(Object.values(KEYS).map((key) => AsyncStorage.removeItem(key)));
}
