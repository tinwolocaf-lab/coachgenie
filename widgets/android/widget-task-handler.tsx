import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import DailyFocusWidget from './DailyFocusWidget';
import QuickCoachWidget from './QuickCoachWidget';
import ReflectionWidget from './ReflectionWidget';
import RitualChecklistWidget from './RitualChecklistWidget';
import TodayPlanWidget from './TodayPlanWidget';
import WeeklyProgressWidget from './WeeklyProgressWidget';
import QuoteWidget from './QuoteWidget';
import ActiveCoachWidget from './ActiveCoachWidget';
import CreditBalanceWidget from './CreditBalanceWidget';
import { WidgetStorage } from './widget-storage';
import type { RitualChecklistData, TodayPlanData } from './widget-storage';
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
} from './widget-defaults';

/**
 * Android Widget Task Handler
 *
 * Central dispatcher for all widget lifecycle events:
 * - WIDGET_ADDED: User places a widget on the home screen
 * - WIDGET_UPDATE: Periodic refresh or requestWidgetUpdate
 * - WIDGET_RESIZED: User resizes the widget
 * - WIDGET_DELETED: User removes the widget
 * - WIDGET_CLICK: User taps an interactive element (TOGGLE_RITUAL, TOGGLE_PRIORITY)
 */

// ---------------------------------------------------------------------------
// Main task handler
// ---------------------------------------------------------------------------

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetName = props.widgetInfo.widgetName;

  switch (widgetName) {
    case 'DailyFocusWidget':
      return handleDailyFocusWidget(props);
    case 'QuickCoachWidget':
      return handleQuickCoachWidget(props);
    case 'ReflectionWidget':
      return handleReflectionWidget(props);
    case 'RitualChecklistWidget':
      return handleRitualChecklistWidget(props);
    case 'TodayPlanWidget':
      return handleTodayPlanWidget(props);
    case 'WeeklyProgressWidget':
      return handleWeeklyProgressWidget(props);
    case 'QuoteWidget':
      return handleQuoteWidget(props);
    case 'ActiveCoachWidget':
      return handleActiveCoachWidget(props);
    case 'CreditBalanceWidget':
      return handleCreditBalanceWidget(props);
    default:
      break;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shouldRender(action: string): boolean {
  return action === 'WIDGET_ADDED' || action === 'WIDGET_UPDATE' || action === 'WIDGET_RESIZED';
}

// ---------------------------------------------------------------------------
// DailyFocusWidget
// ---------------------------------------------------------------------------

async function handleDailyFocusWidget(props: WidgetTaskHandlerProps) {
  if (shouldRender(props.widgetAction)) {
    const data = await WidgetStorage.read('daily_focus');
    const widgetData = data ? { ...DEFAULT_DAILY_FOCUS, ...data } : DEFAULT_DAILY_FOCUS;
    props.renderWidget(
      <DailyFocusWidget family="small" data={widgetData} />
    );
  }
}

// ---------------------------------------------------------------------------
// QuickCoachWidget
// ---------------------------------------------------------------------------

async function handleQuickCoachWidget(props: WidgetTaskHandlerProps) {
  if (shouldRender(props.widgetAction)) {
    const data = await WidgetStorage.read('quick_coach');
    const widgetData = data ? { ...DEFAULT_QUICK_COACH, ...data } : DEFAULT_QUICK_COACH;
    props.renderWidget(
      <QuickCoachWidget family="medium" data={widgetData} />
    );
  }
}

// ---------------------------------------------------------------------------
// ReflectionWidget
// ---------------------------------------------------------------------------

async function handleReflectionWidget(props: WidgetTaskHandlerProps) {
  if (shouldRender(props.widgetAction)) {
    const data = await WidgetStorage.read('reflection');
    const widgetData = data ? { ...DEFAULT_REFLECTION, ...data } : DEFAULT_REFLECTION;
    props.renderWidget(
      <ReflectionWidget family="large" data={widgetData} />
    );
  }
}

// ---------------------------------------------------------------------------
// RitualChecklistWidget — supports TOGGLE_RITUAL click
// ---------------------------------------------------------------------------

async function handleRitualChecklistWidget(props: WidgetTaskHandlerProps) {
  const action = props.widgetAction;

  // Handle ritual toggle from widget tap
  if (action === 'WIDGET_CLICK' && props.clickAction === 'TOGGLE_RITUAL') {
    const ritualId = props.clickActionData?.ritualId as string | undefined;
    if (ritualId) {
      const stored = await WidgetStorage.read('ritual_checklist');
      const current: RitualChecklistData = stored
        ? { ...DEFAULT_RITUAL_CHECKLIST, ...stored }
        : { ...DEFAULT_RITUAL_CHECKLIST };

      // Toggle the specific ritual
      const updatedRituals = current.rituals.map((r) =>
        r.id === ritualId ? { ...r, completed: !r.completed } : r
      );
      const completedCount = updatedRituals.filter((r) => r.completed).length;

      const updated: RitualChecklistData = {
        ...current,
        rituals: updatedRituals,
        completedCount,
        totalCount: updatedRituals.length,
        lastUpdated: new Date().toISOString(),
      };

      await WidgetStorage.write('ritual_checklist', updated);

      // Also update DailyFocus widget with new ritual progress
      const dailyFocus = await WidgetStorage.read('daily_focus');
      if (dailyFocus) {
        await WidgetStorage.write('daily_focus', {
          ...dailyFocus,
          ritualsCompleted: completedCount,
          ritualTotal: updatedRituals.length,
          lastUpdated: new Date().toISOString(),
        });
      }

      // Re-render with updated data
      props.renderWidget(
        <RitualChecklistWidget family="medium" data={updated} />
      );
    }
    return;
  }

  // Normal render
  if (shouldRender(action)) {
    const data = await WidgetStorage.read('ritual_checklist');
    const widgetData = data ? { ...DEFAULT_RITUAL_CHECKLIST, ...data } : DEFAULT_RITUAL_CHECKLIST;
    props.renderWidget(
      <RitualChecklistWidget family="medium" data={widgetData} />
    );
  }
}

// ---------------------------------------------------------------------------
// TodayPlanWidget — supports TOGGLE_PRIORITY click
// ---------------------------------------------------------------------------

async function handleTodayPlanWidget(props: WidgetTaskHandlerProps) {
  const action = props.widgetAction;

  // Handle priority toggle from widget tap
  if (action === 'WIDGET_CLICK' && props.clickAction === 'TOGGLE_PRIORITY') {
    const priorityId = props.clickActionData?.priorityId as string | undefined;
    if (priorityId) {
      const stored = await WidgetStorage.read('today_plan');
      const current: TodayPlanData = stored
        ? { ...DEFAULT_TODAY_PLAN, ...stored }
        : { ...DEFAULT_TODAY_PLAN };

      // Toggle the specific priority
      const updatedPriorities = current.priorities.map((p) =>
        p.id === priorityId ? { ...p, completed: !p.completed } : p
      );
      const completedCount = updatedPriorities.filter((p) => p.completed).length;

      const updated: TodayPlanData = {
        ...current,
        priorities: updatedPriorities,
        completedCount,
        totalCount: updatedPriorities.length,
        lastUpdated: new Date().toISOString(),
      };

      await WidgetStorage.write('today_plan', updated);

      // Re-render with updated data
      props.renderWidget(
        <TodayPlanWidget family="large" data={updated} />
      );
    }
    return;
  }

  // Normal render
  if (shouldRender(action)) {
    const data = await WidgetStorage.read('today_plan');
    const widgetData = data ? { ...DEFAULT_TODAY_PLAN, ...data } : DEFAULT_TODAY_PLAN;
    props.renderWidget(
      <TodayPlanWidget family="large" data={widgetData} />
    );
  }
}

// ---------------------------------------------------------------------------
// WeeklyProgressWidget
// ---------------------------------------------------------------------------

async function handleWeeklyProgressWidget(props: WidgetTaskHandlerProps) {
  if (shouldRender(props.widgetAction)) {
    const data = await WidgetStorage.read('weekly_progress');
    const widgetData = data ? { ...DEFAULT_WEEKLY_PROGRESS, ...data } : DEFAULT_WEEKLY_PROGRESS;
    props.renderWidget(
      <WeeklyProgressWidget family="small" data={widgetData} />
    );
  }
}

// ---------------------------------------------------------------------------
// QuoteWidget
// ---------------------------------------------------------------------------

async function handleQuoteWidget(props: WidgetTaskHandlerProps) {
  if (shouldRender(props.widgetAction)) {
    const data = await WidgetStorage.read('quote_of_day');
    const widgetData = data ? { ...DEFAULT_QUOTE, ...data } : DEFAULT_QUOTE;
    props.renderWidget(
      <QuoteWidget family="medium" data={widgetData} />
    );
  }
}

// ---------------------------------------------------------------------------
// ActiveCoachWidget
// ---------------------------------------------------------------------------

async function handleActiveCoachWidget(props: WidgetTaskHandlerProps) {
  if (shouldRender(props.widgetAction)) {
    const data = await WidgetStorage.read('active_coach');
    const widgetData = data ? { ...DEFAULT_ACTIVE_COACH, ...data } : DEFAULT_ACTIVE_COACH;
    props.renderWidget(
      <ActiveCoachWidget family="medium" data={widgetData} />
    );
  }
}

// ---------------------------------------------------------------------------
// CreditBalanceWidget
// ---------------------------------------------------------------------------

async function handleCreditBalanceWidget(props: WidgetTaskHandlerProps) {
  if (shouldRender(props.widgetAction)) {
    const data = await WidgetStorage.read('credit_balance');
    const widgetData = data ? { ...DEFAULT_CREDIT_BALANCE, ...data } : DEFAULT_CREDIT_BALANCE;
    props.renderWidget(
      <CreditBalanceWidget family="small" data={widgetData} />
    );
  }
}

export default widgetTaskHandler;
