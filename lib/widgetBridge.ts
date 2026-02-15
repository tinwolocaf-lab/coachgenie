import React from 'react';
import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';
import {
  WidgetStorage,
  type DailyFocusData,
  type QuickCoachData,
  type ReflectionData,
  type RitualChecklistData,
  type TodayPlanData,
  type WeeklyProgressData,
  type QuoteData,
  type ActiveCoachData,
  type CreditBalanceData,
} from '@/widgets/android/widget-storage';
import {
  DEFAULT_DAILY_FOCUS,
  DEFAULT_QUICK_COACH,
  DEFAULT_REFLECTION,
  DEFAULT_RITUAL_CHECKLIST,
  DEFAULT_TODAY_PLAN,
  DEFAULT_WEEKLY_PROGRESS,
  DEFAULT_QUOTE,
  DEFAULT_ACTIVE_COACH,
  DEFAULT_CREDIT_BALANCE,
} from '@/widgets/android/widget-defaults';
import DailyFocusWidget from '@/widgets/android/DailyFocusWidget';
import QuickCoachWidget from '@/widgets/android/QuickCoachWidget';
import ReflectionWidget from '@/widgets/android/ReflectionWidget';
import RitualChecklistWidget from '@/widgets/android/RitualChecklistWidget';
import TodayPlanWidget from '@/widgets/android/TodayPlanWidget';
import WeeklyProgressWidget from '@/widgets/android/WeeklyProgressWidget';
import QuoteWidget from '@/widgets/android/QuoteWidget';
import ActiveCoachWidget from '@/widgets/android/ActiveCoachWidget';
import CreditBalanceWidget from '@/widgets/android/CreditBalanceWidget';

/**
 * Widget Bridge Module
 *
 * Public API for syncing widget data from the main React Native app.
 *
 * Flow:
 * 1. App event occurs (ritual completed, plan updated, session ended, etc.)
 * 2. Caller invokes WidgetBridge.<method>({ ... })
 * 3. Data is written to AsyncStorage (Android SharedPreferences backing)
 * 4. requestWidgetUpdate() is called to force each widget to re-render
 * 5. The widget task handler reads the fresh data and renders updated UI
 *
 * Important: This module should ONLY be called from the main app context,
 * never from the widget task handler (which reads directly from WidgetStorage).
 */

// ---------------------------------------------------------------------------
// Generic widget refresh helper
// ---------------------------------------------------------------------------

async function refreshWidget<P extends Record<string, unknown>>(
  widgetName: string,
  Component: React.ComponentType<P>,
  props: P,
): Promise<void> {
  try {
    await requestWidgetUpdate({
      widgetName,
      renderWidget: () => React.createElement(Component, props),
      widgetNotFound: () => {},
    });
  } catch (error) {
    console.warn(`[WidgetBridge] ${widgetName} update skipped:`, error);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export const WidgetBridge = {
  /**
   * Sync core widget data with the latest app state.
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
        await refreshWidget('DailyFocusWidget', DailyFocusWidget, { family: 'small', data: merged });
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
        await refreshWidget('QuickCoachWidget', QuickCoachWidget, { family: 'medium', data: merged });
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
        await refreshWidget('ReflectionWidget', ReflectionWidget, { family: 'large', data: merged });
      }
    } catch (error) {
      console.error('[WidgetBridge] syncWidgetData failed:', error);
    }
  },

  // -------------------------------------------------------------------------
  // Individual widget update methods
  // -------------------------------------------------------------------------

  /** Update only the Daily Focus widget */
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
    await refreshWidget('DailyFocusWidget', DailyFocusWidget, { family: 'small', data: merged });
  },

  /** Update only the Quick Coach widget */
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
    await refreshWidget('QuickCoachWidget', QuickCoachWidget, { family: 'medium', data: merged });
  },

  /** Update only the Reflection widget */
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
    await refreshWidget('ReflectionWidget', ReflectionWidget, { family: 'large', data: merged });
  },

  /** Update the Ritual Checklist widget */
  async updateRitualChecklist(data: Partial<RitualChecklistData>): Promise<void> {
    if (Platform.OS !== 'android') return;
    const existing = await WidgetStorage.read('ritual_checklist');
    const merged: RitualChecklistData = {
      rituals: data.rituals ?? existing?.rituals ?? DEFAULT_RITUAL_CHECKLIST.rituals,
      completedCount: data.completedCount ?? existing?.completedCount ?? 0,
      totalCount: data.totalCount ?? existing?.totalCount ?? 0,
      timeOfDay: data.timeOfDay ?? existing?.timeOfDay ?? DEFAULT_RITUAL_CHECKLIST.timeOfDay,
      lastUpdated: new Date().toISOString(),
    };
    await WidgetStorage.write('ritual_checklist', merged);
    await refreshWidget('RitualChecklistWidget', RitualChecklistWidget, { family: 'medium', data: merged });
  },

  /** Update the Today's Plan widget */
  async updateTodayPlan(data: Partial<TodayPlanData>): Promise<void> {
    if (Platform.OS !== 'android') return;
    const existing = await WidgetStorage.read('today_plan');
    const merged: TodayPlanData = {
      priorities: data.priorities ?? existing?.priorities ?? DEFAULT_TODAY_PLAN.priorities,
      completedCount: data.completedCount ?? existing?.completedCount ?? 0,
      totalCount: data.totalCount ?? existing?.totalCount ?? 0,
      focusTime: data.focusTime ?? existing?.focusTime ?? DEFAULT_TODAY_PLAN.focusTime,
      lastUpdated: new Date().toISOString(),
    };
    await WidgetStorage.write('today_plan', merged);
    await refreshWidget('TodayPlanWidget', TodayPlanWidget, { family: 'large', data: merged });
  },

  /** Update the Weekly Progress widget */
  async updateWeeklyProgress(data: Partial<WeeklyProgressData>): Promise<void> {
    if (Platform.OS !== 'android') return;
    const existing = await WidgetStorage.read('weekly_progress');
    const merged: WeeklyProgressData = {
      completedSessions: data.completedSessions ?? existing?.completedSessions ?? 0,
      totalGoal: data.totalGoal ?? existing?.totalGoal ?? DEFAULT_WEEKLY_PROGRESS.totalGoal,
      percentage: data.percentage ?? existing?.percentage ?? 0,
      streakCount: data.streakCount ?? existing?.streakCount ?? 0,
      weekLabel: data.weekLabel ?? existing?.weekLabel ?? DEFAULT_WEEKLY_PROGRESS.weekLabel,
    };
    await WidgetStorage.write('weekly_progress', merged);
    await refreshWidget('WeeklyProgressWidget', WeeklyProgressWidget, { family: 'small', data: merged });
  },

  /** Update the Quote of the Day widget */
  async updateQuote(data: Partial<QuoteData>): Promise<void> {
    if (Platform.OS !== 'android') return;
    const existing = await WidgetStorage.read('quote_of_day');
    const merged: QuoteData = {
      quote: data.quote ?? existing?.quote ?? DEFAULT_QUOTE.quote,
      author: data.author ?? existing?.author ?? DEFAULT_QUOTE.author,
      category: data.category ?? existing?.category ?? DEFAULT_QUOTE.category,
      lastUpdated: new Date().toISOString(),
    };
    await WidgetStorage.write('quote_of_day', merged);
    await refreshWidget('QuoteWidget', QuoteWidget, { family: 'medium', data: merged });
  },

  /** Update the Active Coach widget */
  async updateActiveCoach(data: Partial<ActiveCoachData>): Promise<void> {
    if (Platform.OS !== 'android') return;
    const existing = await WidgetStorage.read('active_coach');
    const merged: ActiveCoachData = {
      coachName: data.coachName ?? existing?.coachName ?? DEFAULT_ACTIVE_COACH.coachName,
      coachEmoji: data.coachEmoji ?? existing?.coachEmoji ?? DEFAULT_ACTIVE_COACH.coachEmoji,
      coachId: data.coachId ?? existing?.coachId ?? DEFAULT_ACTIVE_COACH.coachId,
      lastSessionTopic: data.lastSessionTopic ?? existing?.lastSessionTopic,
      sessionCount: data.sessionCount ?? existing?.sessionCount ?? 0,
      lastActive: new Date().toISOString(),
    };
    await WidgetStorage.write('active_coach', merged);
    await refreshWidget('ActiveCoachWidget', ActiveCoachWidget, { family: 'medium', data: merged });
  },

  /** Update the Credit Balance widget */
  async updateCreditBalance(data: Partial<CreditBalanceData>): Promise<void> {
    if (Platform.OS !== 'android') return;
    const existing = await WidgetStorage.read('credit_balance');
    const merged: CreditBalanceData = {
      creditsRemaining: data.creditsRemaining ?? existing?.creditsRemaining ?? 0,
      totalCredits: data.totalCredits ?? existing?.totalCredits ?? 0,
      tier: data.tier ?? existing?.tier ?? DEFAULT_CREDIT_BALANCE.tier,
      tierBadge: data.tierBadge ?? existing?.tierBadge ?? DEFAULT_CREDIT_BALANCE.tierBadge,
      resetsAt: data.resetsAt ?? existing?.resetsAt,
    };
    await WidgetStorage.write('credit_balance', merged);
    await refreshWidget('CreditBalanceWidget', CreditBalanceWidget, { family: 'small', data: merged });
  },

  // -------------------------------------------------------------------------
  // Utility methods
  // -------------------------------------------------------------------------

  /**
   * Refresh all widgets by re-reading stored data and triggering re-render.
   * Call on app foreground to ensure widgets show latest data.
   */
  async refreshAllWidgets(): Promise<void> {
    if (Platform.OS !== 'android') return;

    try {
      const [
        dailyFocus,
        quickCoach,
        reflection,
        ritualChecklist,
        todayPlan,
        weeklyProgress,
        quoteData,
        activeCoach,
        creditBalance,
      ] = await Promise.all([
        WidgetStorage.read('daily_focus'),
        WidgetStorage.read('quick_coach'),
        WidgetStorage.read('reflection'),
        WidgetStorage.read('ritual_checklist'),
        WidgetStorage.read('today_plan'),
        WidgetStorage.read('weekly_progress'),
        WidgetStorage.read('quote_of_day'),
        WidgetStorage.read('active_coach'),
        WidgetStorage.read('credit_balance'),
      ]);

      const refreshPromises: Promise<void>[] = [];

      if (dailyFocus) {
        refreshPromises.push(
          refreshWidget('DailyFocusWidget', DailyFocusWidget, { family: 'small', data: { ...DEFAULT_DAILY_FOCUS, ...dailyFocus } })
        );
      }
      if (quickCoach) {
        refreshPromises.push(
          refreshWidget('QuickCoachWidget', QuickCoachWidget, { family: 'medium', data: { ...DEFAULT_QUICK_COACH, ...quickCoach } })
        );
      }
      if (reflection) {
        refreshPromises.push(
          refreshWidget('ReflectionWidget', ReflectionWidget, { family: 'large', data: { ...DEFAULT_REFLECTION, ...reflection } })
        );
      }
      if (ritualChecklist) {
        refreshPromises.push(
          refreshWidget('RitualChecklistWidget', RitualChecklistWidget, { family: 'medium', data: { ...DEFAULT_RITUAL_CHECKLIST, ...ritualChecklist } })
        );
      }
      if (todayPlan) {
        refreshPromises.push(
          refreshWidget('TodayPlanWidget', TodayPlanWidget, { family: 'large', data: { ...DEFAULT_TODAY_PLAN, ...todayPlan } })
        );
      }
      if (weeklyProgress) {
        refreshPromises.push(
          refreshWidget('WeeklyProgressWidget', WeeklyProgressWidget, { family: 'small', data: { ...DEFAULT_WEEKLY_PROGRESS, ...weeklyProgress } })
        );
      }
      if (quoteData) {
        refreshPromises.push(
          refreshWidget('QuoteWidget', QuoteWidget, { family: 'medium', data: { ...DEFAULT_QUOTE, ...quoteData } })
        );
      }
      if (activeCoach) {
        refreshPromises.push(
          refreshWidget('ActiveCoachWidget', ActiveCoachWidget, { family: 'medium', data: { ...DEFAULT_ACTIVE_COACH, ...activeCoach } })
        );
      }
      if (creditBalance) {
        refreshPromises.push(
          refreshWidget('CreditBalanceWidget', CreditBalanceWidget, { family: 'small', data: { ...DEFAULT_CREDIT_BALANCE, ...creditBalance } })
        );
      }

      await Promise.allSettled(refreshPromises);
    } catch (error) {
      console.warn('[WidgetBridge] refreshAllWidgets failed:', error);
    }
  },

  /** Clear all widget data (call on logout) */
  async clearAllData(): Promise<void> {
    if (Platform.OS !== 'android') return;
    await WidgetStorage.clear();
  },

  /** Get current widget data (for debugging) */
  async getWidgetData() {
    return WidgetStorage.readAll();
  },
};

export default WidgetBridge;
