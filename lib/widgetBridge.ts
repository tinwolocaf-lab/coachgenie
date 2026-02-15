import React from 'react';
import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import {
  WidgetStorage,
  type DailyFocusData,
  type QuickCoachData,
  type ReflectionData,
} from '@/widgets/android/widget-storage';
import {
  DEFAULT_DAILY_FOCUS,
  DEFAULT_QUICK_COACH,
  DEFAULT_REFLECTION,
} from '@/widgets/android/widget-defaults';
import DailyFocusWidget from '@/widgets/android/DailyFocusWidget';
import QuickCoachWidget from '@/widgets/android/QuickCoachWidget';
import ReflectionWidget from '@/widgets/android/ReflectionWidget';

/**
 * Widget Bridge Module
 *
 * Public API for syncing widget data from the main React Native app.
 *
 * Flow:
 * 1. App event occurs (ritual completed, plan updated, session ended, etc.)
 * 2. Caller invokes WidgetBridge.syncWidgetData({ ... })
 * 3. Data is written to AsyncStorage (Android SharedPreferences backing)
 * 4. requestWidgetUpdate() is called to force each widget to re-render
 * 5. The widget task handler reads the fresh data and renders updated UI
 *
 * Important: This module should ONLY be called from the main app context,
 * never from the widget task handler (which reads directly from WidgetStorage).
 */

// ---------------------------------------------------------------------------
// Widget refresh helpers
// ---------------------------------------------------------------------------

/**
 * Request native Android to re-render DailyFocusWidget with new data
 */
async function refreshDailyFocusWidget(data: DailyFocusData): Promise<void> {
  try {
    await requestWidgetUpdate({
      widgetName: 'DailyFocusWidget',
      renderWidget: () =>
        React.createElement(DailyFocusWidget, { family: 'small', data }),
      widgetNotFound: () => {
        // Widget not on home screen — no-op
      },
    });
  } catch (error) {
    // Widget may not be placed — safe to ignore
    console.warn('[WidgetBridge] DailyFocusWidget update skipped:', error);
  }
}

/**
 * Request native Android to re-render QuickCoachWidget with new data
 */
async function refreshQuickCoachWidget(data: QuickCoachData): Promise<void> {
  try {
    await requestWidgetUpdate({
      widgetName: 'QuickCoachWidget',
      renderWidget: () =>
        React.createElement(QuickCoachWidget, { family: 'medium', data }),
      widgetNotFound: () => {},
    });
  } catch (error) {
    console.warn('[WidgetBridge] QuickCoachWidget update skipped:', error);
  }
}

/**
 * Request native Android to re-render ReflectionWidget with new data
 */
async function refreshReflectionWidget(data: ReflectionData): Promise<void> {
  try {
    await requestWidgetUpdate({
      widgetName: 'ReflectionWidget',
      renderWidget: () =>
        React.createElement(ReflectionWidget, { family: 'large', data }),
      widgetNotFound: () => {},
    });
  } catch (error) {
    console.warn('[WidgetBridge] ReflectionWidget update skipped:', error);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const WidgetBridge = {
  /**
   * Sync all widget data with the latest app state.
   *
   * Call after:
   * - Ritual completion
   * - Plan update / generation
   * - Coaching session end
   * - App foreground (AppState === 'active')
   * - Morning/evening ritual
   *
   * Only the fields you provide will be updated; missing fields
   * are merged with existing stored data or defaults.
   *
   * @example
   * ```ts
   * await WidgetBridge.syncWidgetData({
   *   topPriority: 'Complete Q1 planning',
   *   ritualsCompleted: 4,
   *   ritualTotal: 5,
   *   streakCount: 15,
   * });
   * ```
   */
  async syncWidgetData(input: {
    // DailyFocus fields
    topPriority?: string;
    ritualsCompleted?: number;
    ritualTotal?: number;
    streakCount?: number;
    // QuickCoach fields
    coachingPrompt?: string;
    recommendedCoach?: { name: string; emoji: string };
    suggestedAction?: string;
    sessionTime?: string;
    // Reflection fields
    reflection?: Partial<ReflectionData>;
  }): Promise<void> {
    if (Platform.OS !== 'android') return;

    try {
      // --- DailyFocus ---
      const hasDailyFocusFields =
        input.topPriority !== undefined ||
        input.ritualsCompleted !== undefined ||
        input.ritualTotal !== undefined ||
        input.streakCount !== undefined;

      if (hasDailyFocusFields) {
        const existing = await WidgetStorage.read('daily_focus');
        const merged: DailyFocusData = {
          topPriority: input.topPriority ?? existing?.topPriority ?? DEFAULT_DAILY_FOCUS.topPriority,
          ritualsCompleted: input.ritualsCompleted ?? existing?.ritualsCompleted ?? 0,
          ritualTotal: input.ritualTotal ?? existing?.ritualTotal ?? 0,
          streakCount: input.streakCount ?? existing?.streakCount ?? 0,
          lastUpdated: new Date().toISOString(),
        };
        await WidgetStorage.write('daily_focus', merged);
        await refreshDailyFocusWidget(merged);
      }

      // --- QuickCoach ---
      const hasQuickCoachFields =
        input.coachingPrompt !== undefined ||
        input.recommendedCoach !== undefined ||
        input.suggestedAction !== undefined;

      if (hasQuickCoachFields) {
        const existing = await WidgetStorage.read('quick_coach');
        const merged: QuickCoachData = {
          coachingPrompt: input.coachingPrompt ?? existing?.coachingPrompt ?? DEFAULT_QUICK_COACH.coachingPrompt,
          recommendedCoach: input.recommendedCoach ?? existing?.recommendedCoach ?? DEFAULT_QUICK_COACH.recommendedCoach,
          suggestedAction: input.suggestedAction ?? existing?.suggestedAction ?? DEFAULT_QUICK_COACH.suggestedAction,
          sessionTime: input.sessionTime ?? existing?.sessionTime ?? DEFAULT_QUICK_COACH.sessionTime,
        };
        await WidgetStorage.write('quick_coach', merged);
        await refreshQuickCoachWidget(merged);
      }

      // --- Reflection ---
      if (input.reflection) {
        const existing = await WidgetStorage.read('reflection');
        const merged: ReflectionData = {
          contentType: input.reflection.contentType ?? existing?.contentType ?? 'morning',
          mainContent: input.reflection.mainContent ?? existing?.mainContent ?? DEFAULT_REFLECTION.mainContent,
          subtitle: input.reflection.subtitle ?? existing?.subtitle,
          insight: input.reflection.insight ?? existing?.insight,
          actionPrompt: input.reflection.actionPrompt ?? existing?.actionPrompt,
          timeOfDay: input.reflection.timeOfDay ?? existing?.timeOfDay ?? 'morning',
          streakCount: input.reflection.streakCount ?? existing?.streakCount,
          sessionsThisWeek: input.reflection.sessionsThisWeek ?? existing?.sessionsThisWeek,
          moodTrend: input.reflection.moodTrend ?? existing?.moodTrend,
        };
        await WidgetStorage.write('reflection', merged);
        await refreshReflectionWidget(merged);
      }
    } catch (error) {
      console.error('[WidgetBridge] syncWidgetData failed:', error);
    }
  },

  /**
   * Update only the Daily Focus widget
   */
  async updateDailyFocus(data: Partial<DailyFocusData>): Promise<void> {
    if (Platform.OS !== 'android') return;

    const existing = await WidgetStorage.read('daily_focus');
    const merged: DailyFocusData = {
      topPriority: data.topPriority ?? existing?.topPriority ?? DEFAULT_DAILY_FOCUS.topPriority,
      ritualsCompleted: data.ritualsCompleted ?? existing?.ritualsCompleted ?? 0,
      ritualTotal: data.ritualTotal ?? existing?.ritualTotal ?? 0,
      streakCount: data.streakCount ?? existing?.streakCount ?? 0,
      lastUpdated: new Date().toISOString(),
    };
    await WidgetStorage.write('daily_focus', merged);
    await refreshDailyFocusWidget(merged);
  },

  /**
   * Update only the Quick Coach widget
   */
  async updateQuickCoach(data: Partial<QuickCoachData>): Promise<void> {
    if (Platform.OS !== 'android') return;

    const existing = await WidgetStorage.read('quick_coach');
    const merged: QuickCoachData = {
      coachingPrompt: data.coachingPrompt ?? existing?.coachingPrompt ?? DEFAULT_QUICK_COACH.coachingPrompt,
      recommendedCoach: data.recommendedCoach ?? existing?.recommendedCoach ?? DEFAULT_QUICK_COACH.recommendedCoach,
      suggestedAction: data.suggestedAction ?? existing?.suggestedAction ?? DEFAULT_QUICK_COACH.suggestedAction,
      sessionTime: data.sessionTime ?? existing?.sessionTime ?? DEFAULT_QUICK_COACH.sessionTime,
    };
    await WidgetStorage.write('quick_coach', merged);
    await refreshQuickCoachWidget(merged);
  },

  /**
   * Update only the Reflection widget
   */
  async updateReflection(data: Partial<ReflectionData>): Promise<void> {
    if (Platform.OS !== 'android') return;

    const existing = await WidgetStorage.read('reflection');
    const merged: ReflectionData = {
      contentType: data.contentType ?? existing?.contentType ?? 'morning',
      mainContent: data.mainContent ?? existing?.mainContent ?? DEFAULT_REFLECTION.mainContent,
      subtitle: data.subtitle ?? existing?.subtitle,
      insight: data.insight ?? existing?.insight,
      actionPrompt: data.actionPrompt ?? existing?.actionPrompt,
      timeOfDay: data.timeOfDay ?? existing?.timeOfDay ?? 'morning',
      streakCount: data.streakCount ?? existing?.streakCount,
      sessionsThisWeek: data.sessionsThisWeek ?? existing?.sessionsThisWeek,
      moodTrend: data.moodTrend ?? existing?.moodTrend,
    };
    await WidgetStorage.write('reflection', merged);
    await refreshReflectionWidget(merged);
  },

  /**
   * Clear all widget data (call on logout)
   */
  async clearAllData(): Promise<void> {
    if (Platform.OS !== 'android') return;
    await WidgetStorage.clear();
  },

  /**
   * Get current widget data (for debugging)
   */
  async getWidgetData() {
    return WidgetStorage.readAll();
  },
};

export default WidgetBridge;
