// Coachgenie Types

// User Profile & Context Vault
export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
  created_at: string;
  onboarding_completed: boolean;
}

export interface ContextVault {
  id: string;
  user_id: string;
  values: string[];
  goals: Goal[];
  constraints: Constraints;
  preferences: Preferences;
  updated_at: string;
}

export interface Goal {
  id: string;
  title: string;
  description?: string;
  target_date?: string;
  is_30_day_focus: boolean;
}

export interface Constraints {
  available_hours_per_day: number;
  energy_level: 'low' | 'medium' | 'high';
  best_time_for_focus: 'morning' | 'afternoon' | 'evening';
}

export interface Preferences {
  tone: number; // 0-100 (gentle to direct)
  directness: number; // 0-100 (nurturing to challenging)
  response_length: 'concise' | 'balanced' | 'detailed';
}

// Coach Types
export interface Coach {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon_name: string;
  color: string;
  method: string;
  version: string;
  is_public: boolean;
  system_prompt: string;
  created_at: string;
}

export interface InstalledCoach {
  id: string;
  user_id: string;
  coach_id: string;
  is_active: boolean;
  installed_at: string;
  coach?: Coach;
}

// Session & Chat Types
export interface Session {
  id: string;
  user_id: string;
  coach_id: string;
  title: string;
  status: 'active' | 'completed';
  summary?: string;
  created_at: string;
  completed_at?: string;
  coach?: Coach;
}

export interface Message {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface SessionResult {
  summary: string;
  next_actions: Action[];
  plan_updates?: PlanUpdate[];
}

export interface Action {
  id: string;
  title: string;
  completed: boolean;
  due_date?: string;
}

// Plan Types
export interface DayPlan {
  id: string;
  user_id: string;
  date: string;
  top_priorities: Priority[];
  time_blocks: TimeBlock[];
  created_at: string;
  updated_at: string;
}

export interface Priority {
  id: string;
  title: string;
  completed: boolean;
  order: number;
}

export interface TimeBlock {
  id: string;
  start_time: string;
  end_time: string;
  title: string;
  category?: string;
}

export interface PlanUpdate {
  date: string;
  priorities?: Priority[];
  time_blocks?: TimeBlock[];
}

// Onboarding Types
export interface OnboardingState {
  step: OnboardingStep;
  values: string[];
  goals: Goal[];
  constraints: Constraints;
  preferences: Preferences;
  selected_coach_id?: string;
}

export type OnboardingStep =
  | 'welcome'
  | 'values'
  | 'goals'
  | 'constraints'
  | 'preferences'
  | 'coach_selection'
  | 'complete';

// API Response Types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

export interface StreamMessage {
  type: 'content' | 'done' | 'error' | 'session_result';
  content?: string;
  session_result?: SessionResult;
  error?: string;
}

// Available Values for Selection
export const AVAILABLE_VALUES = [
  'Growth',
  'Balance',
  'Achievement',
  'Creativity',
  'Connection',
  'Health',
  'Wealth',
  'Learning',
  'Leadership',
  'Freedom',
  'Impact',
  'Authenticity',
] as const;

export type AvailableValue = typeof AVAILABLE_VALUES[number];

// Key Insight Types (for Journal)
export interface KeyInsight {
  id: string;
  user_id: string;
  session_id?: string;
  coach_id: string;
  title: string;
  content: string;
  category: 'mindset' | 'strategy' | 'productivity' | 'systems' | 'general';
  is_highlighted: boolean;
  created_at: string;
}

// Breakthrough Types
export interface Breakthrough {
  id: string;
  user_id: string;
  session_id?: string;
  coach_id: string;
  title: string;
  summary: string;
  key_takeaways: string[];
  action_items: BreakthroughAction[];
  date: string;
  created_at: string;
}

export interface BreakthroughAction {
  id: string;
  title: string;
  completed: boolean;
}

// Enhanced Message with insight marking
export interface EnhancedMessage extends Message {
  is_insight?: boolean;
  insight_title?: string;
}

// Session with enhanced metadata
export interface EnhancedSession extends Session {
  breakthrough_summary?: string;
  messages?: EnhancedMessage[];
}

// Archive Types
export interface MonthlySynthesis {
  id: string;
  user_id: string;
  month_year: string;
  title: string;
  executive_summary: string;
  key_themes: ThemeItem[];
  growth_areas: string[];
  patterns_identified: PatternItem[];
  coach_contributions: Record<string, CoachContribution>;
  breakthrough_count: number;
  insight_count: number;
  session_count: number;
  created_at: string;
}

export interface ThemeItem {
  name: string;
  frequency: number;
  relatedInsights: string[];
}

export interface PatternItem {
  pattern: string;
  observation: string;
  recommendation: string;
}

export interface CoachContribution {
  coachId: string;
  coachName: string;
  sessionCount: number;
  insightCount: number;
}

export interface InsightCollection {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  theme_keywords: string[];
  color: string;
  icon: string;
  insight_count: number;
  is_auto_generated: boolean;
  created_at: string;
  updated_at: string;
}

export interface HistoryQuery {
  id: string;
  user_id: string;
  query: string;
  response: string;
  sources: QuerySource[];
  created_at: string;
}

export interface QuerySource {
  type: 'session' | 'insight' | 'breakthrough';
  id: string;
  title: string;
  date: string;
}

export interface FlashbackItem {
  type: 'monthAgo' | 'yearAgo';
  insight: KeyInsight;
  reflection?: string;
}

// ============ PHASE 5: THE RITUALS ============

// Ritual (Daily Habit)
export interface Ritual {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  icon: string;
  color: string;
  frequency: 'daily' | 'weekdays' | 'weekends' | 'weekly';
  reminder_time?: string;
  linked_insight_id?: string;
  linked_chapter_id?: string;
  is_active: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

// Ritual Completion
export interface RitualCompletion {
  id: string;
  ritual_id: string;
  user_id: string;
  completed_date: string;
  completed_at: string;
  note?: string;
}

// Ritual with today's completion status
export interface RitualWithStatus extends Ritual {
  is_completed_today: boolean;
  completion_note?: string;
  streak_count?: number;
}

// Daily Reflection (Morning Intention or Evening Audit)
export interface DailyReflection {
  id: string;
  user_id: string;
  date: string;
  reflection_type: 'morning' | 'evening';
  prompt?: string;
  response?: string;
  wins?: string[];
  lessons?: string[];
  ai_closing_thought?: string;
  mood?: number;
  energy_level?: number;
  created_at: string;
  updated_at: string;
}

// Growth Chapter (Long-term Goal)
export interface GrowthChapter {
  id: string;
  user_id: string;
  title: string;
  vision?: string;
  why_it_matters?: string;
  target_date?: string;
  status: 'active' | 'completed' | 'paused' | 'archived';
  cover_color: string;
  icon: string;
  progress_percentage: number;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

// Chapter with milestones
export interface GrowthChapterWithMilestones extends GrowthChapter {
  milestones: ChapterMilestone[];
  linked_rituals: Ritual[];
}

// Chapter Milestone
export interface ChapterMilestone {
  id: string;
  chapter_id: string;
  user_id: string;
  title: string;
  description?: string;
  is_completed: boolean;
  completed_at?: string;
  order_index: number;
  linked_rituals: string[];
  created_at: string;
  updated_at: string;
}

// Ritual Streak
export interface RitualStreak {
  id: string;
  user_id: string;
  ritual_id?: string;
  current_streak: number;
  longest_streak: number;
  total_completions: number;
  last_completed_date?: string;
  streak_started_date?: string;
  consistency_score: number;
  updated_at: string;
}

// Editorial Nudge (AI-generated gentle reminder)
export interface EditorialNudge {
  id: string;
  user_id: string;
  nudge_type: 'alignment' | 'encouragement' | 'reflection' | 'milestone';
  title: string;
  content: string;
  related_chapter_id?: string;
  related_ritual_id?: string;
  is_read: boolean;
  created_at: string;
}

// Today's Practice Summary
export interface TodayPractice {
  rituals: RitualWithStatus[];
  morningReflection?: DailyReflection;
  eveningReflection?: DailyReflection;
  activeChapter?: GrowthChapter;
  overallProgress: number;
  streakDays: number;
  unreadNudges: EditorialNudge[];
}

// Time period for UI
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

// ============ INTEGRATIONS ============

export type IntegrationProvider = 'google_calendar' | 'notion' | 'github' | 'todoist' | 'linear';
export type IntegrationStatus = 'active' | 'expired' | 'revoked' | 'error';
export type IntegrationDataType = 'calendar_event' | 'notion_page' | 'github_activity' | 'task';

export interface UserIntegration {
  id: string;
  user_id: string;
  provider: IntegrationProvider;
  status: IntegrationStatus;
  provider_email?: string;
  scopes?: string[];
  metadata?: Record<string, unknown>;
  last_synced_at?: string;
  created_at: string;
  updated_at: string;
}

export interface IntegrationData {
  id: string;
  user_id: string;
  integration_id: string;
  data_type: IntegrationDataType;
  external_id?: string;
  title?: string;
  content?: Record<string, unknown>;
  starts_at?: string;
  ends_at?: string;
  created_at: string;
  updated_at: string;
}

export interface IntegrationProviderConfig {
  provider: IntegrationProvider;
  name: string;
  icon: string;
  description: string;
  scopes: string[];
}

// Morning Intention prompts
export const MORNING_PROMPTS = [
  "What is the one thing that would make today a success?",
  "What intention will guide your actions today?",
  "If you could focus on just one thing today, what would it be?",
  "What would your future self thank you for doing today?",
  "What's the most meaningful thing you can accomplish today?",
] as const;

// Evening reflection prompts
export const EVENING_PROMPTS = [
  "What went well today that you want to remember?",
  "What did you learn about yourself today?",
  "What moment are you most grateful for?",
  "What would you do differently tomorrow?",
  "How did you grow today, even in small ways?",
] as const;
