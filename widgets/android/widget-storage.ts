import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Widget Storage Module
 *
 * Provides a SharedPreferences-backed storage layer for widget data.
 *
 * Architecture:
 * - Main app context: writes to AsyncStorage (which backs to SharedPreferences on Android)
 * - Widget task handler context: reads from AsyncStorage (same SharedPreferences backing)
 *
 * AsyncStorage on Android uses RocksDB or SharedPreferences under the hood,
 * and is accessible from both the main app process and the headless widget JS context
 * because react-native-android-widget runs the task handler in the same RN runtime.
 *
 * All keys are prefixed with 'coachzeno_widget_' to avoid collisions.
 */

const KEY_PREFIX = 'coachzeno_widget_';

/**
 * Widget data types
 */
export interface DailyFocusData {
  topPriority: string;
  ritualsCompleted: number;
  ritualTotal: number;
  streakCount: number;
  lastUpdated: string;
}

export interface QuickCoachData {
  coachingPrompt: string;
  recommendedCoach: {
    name: string;
    emoji: string;
  };
  suggestedAction: string;
  sessionTime: string;
}

export interface ReflectionData {
  contentType: 'morning' | 'evening';
  mainContent: string;
  subtitle?: string;
  insight?: string;
  actionPrompt?: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  streakCount?: number;
  sessionsThisWeek?: number;
  moodTrend?: 'up' | 'neutral' | 'down';
}

export interface RitualChecklistData {
  rituals: Array<{
    id: string;
    label: string;
    completed: boolean;
    emoji: string;
  }>;
  completedCount: number;
  totalCount: number;
  timeOfDay: 'morning' | 'evening';
  lastUpdated: string;
}

export interface TodayPlanData {
  priorities: Array<{
    id: string;
    text: string;
    completed: boolean;
    timeBlock?: string;
  }>;
  completedCount: number;
  totalCount: number;
  focusTime: string;
  lastUpdated: string;
}

export interface WeeklyProgressData {
  completedSessions: number;
  totalGoal: number;
  percentage: number;
  streakCount: number;
  weekLabel: string;
}

export interface QuoteData {
  quote: string;
  author: string;
  category: 'breakthrough' | 'insight' | 'motivation' | 'reflection';
  lastUpdated: string;
}

export interface ActiveCoachData {
  coachName: string;
  coachEmoji: string;
  coachId: string;
  lastSessionTopic?: string;
  sessionCount: number;
  lastActive: string;
}

export interface CreditBalanceData {
  creditsRemaining: number;
  totalCredits: number;
  tier: 'free' | 'sovereign' | 'oracle';
  tierBadge: string;
  resetsAt?: string;
}

type WidgetDataMap = {
  daily_focus: DailyFocusData;
  quick_coach: QuickCoachData;
  reflection: ReflectionData;
  ritual_checklist: RitualChecklistData;
  today_plan: TodayPlanData;
  weekly_progress: WeeklyProgressData;
  quote_of_day: QuoteData;
  active_coach: ActiveCoachData;
  credit_balance: CreditBalanceData;
};

type WidgetKey = keyof WidgetDataMap;

/**
 * WidgetStorage — read/write widget data via AsyncStorage
 *
 * Works in both main app and headless widget task handler contexts.
 */
export const WidgetStorage = {
  /**
   * Write widget data to storage
   */
  async write<K extends WidgetKey>(key: K, value: WidgetDataMap[K]): Promise<void> {
    if (Platform.OS !== 'android') return;

    try {
      const fullKey = KEY_PREFIX + key;
      await AsyncStorage.setItem(fullKey, JSON.stringify(value));
    } catch (error) {
      console.error(`[WidgetStorage] Failed to write '${key}':`, error);
    }
  },

  /**
   * Read widget data from storage
   */
  async read<K extends WidgetKey>(key: K): Promise<WidgetDataMap[K] | null> {
    if (Platform.OS !== 'android') return null;

    try {
      const fullKey = KEY_PREFIX + key;
      const raw = await AsyncStorage.getItem(fullKey);
      if (!raw) return null;
      return JSON.parse(raw) as WidgetDataMap[K];
    } catch (error) {
      console.error(`[WidgetStorage] Failed to read '${key}':`, error);
      return null;
    }
  },

  /**
   * Clear all widget data (e.g., on logout)
   */
  async clear(): Promise<void> {
    if (Platform.OS !== 'android') return;

    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const widgetKeys = allKeys.filter((k) => k.startsWith(KEY_PREFIX));
      if (widgetKeys.length > 0) {
        await AsyncStorage.multiRemove(widgetKeys);
      }
    } catch (error) {
      console.error('[WidgetStorage] Failed to clear:', error);
    }
  },

  /**
   * Read all widget data at once (for debugging)
   */
  async readAll(): Promise<{
    [K in WidgetKey]: WidgetDataMap[K] | null;
  }> {
    return {
      daily_focus: await this.read('daily_focus'),
      quick_coach: await this.read('quick_coach'),
      reflection: await this.read('reflection'),
      ritual_checklist: await this.read('ritual_checklist'),
      today_plan: await this.read('today_plan'),
      weekly_progress: await this.read('weekly_progress'),
      quote_of_day: await this.read('quote_of_day'),
      active_coach: await this.read('active_coach'),
      credit_balance: await this.read('credit_balance'),
    };
  },
};

export default WidgetStorage;
