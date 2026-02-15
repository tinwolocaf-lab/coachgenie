/**
 * Android Widgets Index
 *
 * Exports all Android widget components, the task handler,
 * and the widget storage module.
 */

// Widget components
export { default as DailyFocusWidget } from './DailyFocusWidget';
export { default as QuickCoachWidget } from './QuickCoachWidget';
export { default as ReflectionWidget } from './ReflectionWidget';
export { default as RitualChecklistWidget } from './RitualChecklistWidget';
export { default as TodayPlanWidget } from './TodayPlanWidget';
export { default as WeeklyProgressWidget } from './WeeklyProgressWidget';
export { default as QuoteWidget } from './QuoteWidget';
export { default as ActiveCoachWidget } from './ActiveCoachWidget';
export { default as CreditBalanceWidget } from './CreditBalanceWidget';

// Infrastructure
export { default as widgetTaskHandler } from './widget-task-handler';
export { WidgetStorage } from './widget-storage';

// Defaults
export {
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

// Types
export type {
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
