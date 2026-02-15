import type {
  DailyFocusData,
  QuickCoachData,
  ReflectionData,
  RitualChecklistData,
  TodayPlanData,
  WeeklyProgressData,
  QuoteData,
  ActiveCoachData,
  CreditBalanceData,
} from './widget-storage';

/**
 * Canonical default data for all widgets.
 *
 * Used in BOTH:
 * - widget-task-handler.tsx  (headless context — when no stored data exists)
 * - lib/widgetBridge.ts      (main app context — fallback during merges)
 *
 * Keeping these in ONE place prevents defaults from drifting apart.
 */

export const DEFAULT_DAILY_FOCUS: DailyFocusData = {
  topPriority: 'Open CoachZeno to set your focus',
  ritualsCompleted: 0,
  ritualTotal: 0,
  streakCount: 0,
  lastUpdated: new Date().toISOString(),
};

export const DEFAULT_QUICK_COACH: QuickCoachData = {
  coachingPrompt: "What's one thing you can let go of today?",
  recommendedCoach: { name: 'Clarity Coach', emoji: '🧠' },
  suggestedAction: 'Take 5 minutes to reflect',
  sessionTime: '5 min',
};

export const DEFAULT_REFLECTION: ReflectionData = {
  contentType: 'morning',
  mainContent: 'What would make today feel like a success?',
  subtitle: 'Set your intention',
  timeOfDay: 'morning',
  streakCount: 0,
  sessionsThisWeek: 0,
  moodTrend: 'neutral',
};

export const DEFAULT_RITUAL_CHECKLIST: RitualChecklistData = {
  rituals: [
    { id: 'morning_journal', label: 'Morning Journal', completed: false, emoji: '📝' },
    { id: 'meditation', label: 'Meditation', completed: false, emoji: '🧘' },
    { id: 'gratitude', label: 'Gratitude', completed: false, emoji: '🙏' },
    { id: 'reflection', label: 'Evening Reflection', completed: false, emoji: '🌙' },
  ],
  completedCount: 0,
  totalCount: 4,
  timeOfDay: 'morning',
  lastUpdated: new Date().toISOString(),
};

export const DEFAULT_TODAY_PLAN: TodayPlanData = {
  priorities: [
    { id: 'p1', text: 'Open CoachZeno to set your plan', completed: false },
  ],
  completedCount: 0,
  totalCount: 1,
  focusTime: '0h',
  lastUpdated: new Date().toISOString(),
};

export const DEFAULT_WEEKLY_PROGRESS: WeeklyProgressData = {
  completedSessions: 0,
  totalGoal: 7,
  percentage: 0,
  streakCount: 0,
  weekLabel: 'This Week',
};

export const DEFAULT_QUOTE: QuoteData = {
  quote: 'The only way to do great work is to love what you do.',
  author: 'Your inner coach',
  category: 'motivation',
  lastUpdated: new Date().toISOString(),
};

export const DEFAULT_ACTIVE_COACH: ActiveCoachData = {
  coachName: 'Clarity Coach',
  coachEmoji: '🧠',
  coachId: 'default',
  lastSessionTopic: 'Start your first session',
  sessionCount: 0,
  lastActive: new Date().toISOString(),
};

export const DEFAULT_CREDIT_BALANCE: CreditBalanceData = {
  creditsRemaining: 0,
  totalCredits: 0,
  tier: 'free',
  tierBadge: '✨',
};
