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
