import { NativeModules, Platform } from 'react-native';

/**
 * Widget Bridge Module
 *
 * Provides functionality to:
 * - Update widget data from React Native side
 * - Use expo-widgets API to push data to widgets
 * - Manage SharedStorage (UserDefaults on iOS, SharedPreferences on Android)
 * - Sync widget data after key app events
 *
 * iOS Widgets:
 * - Read data from App Group UserDefaults: group.com.coachgenie.app
 * - Located in: widgets/ios/
 * - Types: DailyFocusWidget, QuickCoachWidget, ReflectionWidget
 *
 * Android Widgets:
 * - Read data from SharedPreferences (coachgenie_widget_* prefixed keys)
 * - Located in: widgets/android/
 * - Types: DailyFocusWidget, QuickCoachWidget, ReflectionWidget
 * - Handled by: widget-task-handler.tsx
 * - Deep links use: coachgenie:// scheme
 */

const APP_GROUP_ID = 'group.com.coachgenie.app';

interface WidgetSnapshot {
  family: 'systemSmall' | 'systemMedium' | 'systemLarge';
  data: Record<string, any>;
  timestamp: number;
}

interface DailyFocusData {
  topPriority: string;
  ritualsCompleted: number;
  ritualTotal: number;
  streakCount: number;
  lastUpdated: string;
}

interface QuickCoachData {
  coachingPrompt: string;
  recommendedCoach: {
    name: string;
    emoji: string;
  };
  suggestedAction: string;
  sessionTime: string;
}

interface ReflectionData {
  contentType: 'morning' | 'evening';
  mainContent: string;
  subtitle?: string;
  insight?: string;
  actionPrompt?: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening';
}

/**
 * SharedStorage Helper
 * Abstracts reading/writing to UserDefaults (iOS) or SharedPreferences (Android)
 */
class SharedStorage {
  private static readonly prefix = 'coachgenie_widget_';

  /**
   * Write data to shared storage
   */
  static async write(key: string, value: any): Promise<void> {
    const fullKey = this.prefix + key;
    const jsonValue = JSON.stringify(value);

    if (Platform.OS === 'ios') {
      // On iOS, we'd use react-native-user-defaults or similar
      // For now, we prepare the data structure
      try {
        // This would call native code to write to UserDefaults
        // via App Group: group.com.coachgenie.app
        await this._writeToUserDefaults(fullKey, jsonValue);
      } catch (error) {
        console.error(`Failed to write widget data for key ${key}:`, error);
      }
    } else if (Platform.OS === 'android') {
      try {
        // On Android, use SharedPreferences
        await this._writeToSharedPreferences(fullKey, jsonValue);
      } catch (error) {
        console.error(`Failed to write widget data for key ${key}:`, error);
      }
    }
  }

  /**
   * Read data from shared storage
   */
  static async read(key: string): Promise<any | null> {
    const fullKey = this.prefix + key;

    if (Platform.OS === 'ios') {
      try {
        const value = await this._readFromUserDefaults(fullKey);
        return value ? JSON.parse(value) : null;
      } catch (error) {
        console.error(`Failed to read widget data for key ${key}:`, error);
        return null;
      }
    } else if (Platform.OS === 'android') {
      try {
        const value = await this._readFromSharedPreferences(fullKey);
        return value ? JSON.parse(value) : null;
      } catch (error) {
        console.error(`Failed to read widget data for key ${key}:`, error);
        return null;
      }
    }

    return null;
  }

  /**
   * Clear all widget data from shared storage
   */
  static async clear(): Promise<void> {
    if (Platform.OS === 'ios') {
      await this._clearUserDefaults();
    } else if (Platform.OS === 'android') {
      await this._clearSharedPreferences();
    }
  }

  // Native bridge methods (to be implemented via NativeModules)
  private static async _writeToUserDefaults(key: string, value: string): Promise<void> {
    // Implementation would use NativeModules.CoachgenieWidgetBridge
    // or expo-widgets native API
    if (NativeModules.CoachgenieWidgetBridge?.writeToUserDefaults) {
      return NativeModules.CoachgenieWidgetBridge.writeToUserDefaults(
        key,
        value,
        APP_GROUP_ID
      );
    }
  }

  private static async _readFromUserDefaults(key: string): Promise<string | null> {
    if (NativeModules.CoachgenieWidgetBridge?.readFromUserDefaults) {
      return NativeModules.CoachgenieWidgetBridge.readFromUserDefaults(
        key,
        APP_GROUP_ID
      );
    }
    return null;
  }

  private static async _clearUserDefaults(): Promise<void> {
    if (NativeModules.CoachgenieWidgetBridge?.clearUserDefaults) {
      return NativeModules.CoachgenieWidgetBridge.clearUserDefaults(APP_GROUP_ID);
    }
  }

  private static async _writeToSharedPreferences(key: string, value: string): Promise<void> {
    if (NativeModules.CoachgenieWidgetBridge?.writeToSharedPreferences) {
      return NativeModules.CoachgenieWidgetBridge.writeToSharedPreferences(key, value);
    }
  }

  private static async _readFromSharedPreferences(key: string): Promise<string | null> {
    if (NativeModules.CoachgenieWidgetBridge?.readFromSharedPreferences) {
      return NativeModules.CoachgenieWidgetBridge.readFromSharedPreferences(key);
    }
    return null;
  }

  private static async _clearSharedPreferences(): Promise<void> {
    if (NativeModules.CoachgenieWidgetBridge?.clearSharedPreferences) {
      return NativeModules.CoachgenieWidgetBridge.clearSharedPreferences();
    }
  }
}

/**
 * Widget Update Manager
 * Handles pushing data to specific widgets
 */
class WidgetUpdateManager {
  /**
   * Update Daily Focus Widget
   * Called after ritual completion, plan update, or app foregrounding
   */
  static async updateDailyFocusWidget(data: DailyFocusData): Promise<void> {
    try {
      await SharedStorage.write('daily_focus', data);
      await this._pushSnapshot('systemSmall', data);
    } catch (error) {
      console.error('Failed to update DailyFocusWidget:', error);
    }
  }

  /**
   * Update Quick Coach Widget
   * Called after coaching prompt generation or app foregrounding
   */
  static async updateQuickCoachWidget(data: QuickCoachData): Promise<void> {
    try {
      await SharedStorage.write('quick_coach', data);
      await this._pushSnapshot('systemMedium', data);
    } catch (error) {
      console.error('Failed to update QuickCoachWidget:', error);
    }
  }

  /**
   * Update Reflection Widget
   * Called after insight generation or app foregrounding
   */
  static async updateReflectionWidget(data: ReflectionData): Promise<void> {
    try {
      await SharedStorage.write('reflection', data);
      await this._pushSnapshot('systemLarge', data);
    } catch (error) {
      console.error('Failed to update ReflectionWidget:', error);
    }
  }

  /**
   * Update all widgets with current data
   */
  static async updateAllWidgets(allData: {
    daily_focus?: DailyFocusData;
    quick_coach?: QuickCoachData;
    reflection?: ReflectionData;
  }): Promise<void> {
    const promises = [];

    if (allData.daily_focus) {
      promises.push(this.updateDailyFocusWidget(allData.daily_focus));
    }
    if (allData.quick_coach) {
      promises.push(this.updateQuickCoachWidget(allData.quick_coach));
    }
    if (allData.reflection) {
      promises.push(this.updateReflectionWidget(allData.reflection));
    }

    await Promise.all(promises);
  }

  /**
   * Push widget snapshot via expo-widgets API
   * This notifies the system that widget data has been updated
   */
  private static async _pushSnapshot(
    family: 'systemSmall' | 'systemMedium' | 'systemLarge',
    data: any
  ): Promise<void> {
    try {
      // expo-widgets API (alpha) - implementation may vary
      if (NativeModules.CoachgenieWidgetBridge?.updateWidgetSnapshot) {
        const snapshot: WidgetSnapshot = {
          family,
          data,
          timestamp: Date.now(),
        };
        return NativeModules.CoachgenieWidgetBridge.updateWidgetSnapshot(snapshot);
      }
    } catch (error) {
      console.warn(`Failed to push widget snapshot for ${family}:`, error);
    }
  }
}

/**
 * Main Widget Bridge API
 * Public interface for syncing widget data from React Native
 */
export const WidgetBridge = {
  /**
   * Sync all widget data with latest app state
   *
   * Should be called after:
   * - Session completion
   * - Ritual completion
   * - Plan update
   * - App foregrounding (appState === 'active')
   *
   * Example:
   * ```
   * import { WidgetBridge } from './lib/widgetBridge';
   *
   * // After ritual completion
   * await WidgetBridge.syncWidgetData({
   *   topPriority: 'Complete Q1 planning',
   *   ritualsCompleted: 4,
   *   ritualTotal: 5,
   *   streakCount: 15,
   * });
   * ```
   */
  async syncWidgetData(widgetData: {
    topPriority?: string;
    ritualsCompleted?: number;
    ritualTotal?: number;
    streakCount?: number;
    coachingPrompt?: string;
    recommendedCoach?: { name: string; emoji: string };
    suggestedAction?: string;
    sessionTime?: string;
    reflection?: ReflectionData;
  }): Promise<void> {
    try {
      const updates: {
        daily_focus?: DailyFocusData;
        quick_coach?: QuickCoachData;
        reflection?: ReflectionData;
      } = {};

      // Build DailyFocus data if relevant fields are provided
      if (
        widgetData.topPriority !== undefined ||
        widgetData.ritualsCompleted !== undefined ||
        widgetData.ritualTotal !== undefined ||
        widgetData.streakCount !== undefined
      ) {
        const existing = await SharedStorage.read('daily_focus');
        updates.daily_focus = {
          topPriority: widgetData.topPriority || existing?.topPriority || 'Focus on what matters',
          ritualsCompleted: widgetData.ritualsCompleted ?? existing?.ritualsCompleted ?? 0,
          ritualTotal: widgetData.ritualTotal ?? existing?.ritualTotal ?? 5,
          streakCount: widgetData.streakCount ?? existing?.streakCount ?? 0,
          lastUpdated: new Date().toISOString(),
        };
      }

      // Build QuickCoach data if relevant fields are provided
      if (
        widgetData.coachingPrompt !== undefined ||
        widgetData.recommendedCoach !== undefined
      ) {
        const existing = await SharedStorage.read('quick_coach');
        updates.quick_coach = {
          coachingPrompt: widgetData.coachingPrompt || existing?.coachingPrompt || 'What\'s on your mind?',
          recommendedCoach: widgetData.recommendedCoach || existing?.recommendedCoach || { name: 'Your Coach', emoji: '🧠' },
          suggestedAction: widgetData.suggestedAction || existing?.suggestedAction || 'Take a voice session',
          sessionTime: widgetData.sessionTime || existing?.sessionTime || '5 min',
        };
      }

      // Add reflection data if provided
      if (widgetData.reflection) {
        updates.reflection = widgetData.reflection;
      }

      // Update all widgets
      await WidgetUpdateManager.updateAllWidgets(updates);
    } catch (error) {
      console.error('Failed to sync widget data:', error);
    }
  },

  /**
   * Update Daily Focus widget specifically
   */
  async updateDailyFocus(data: Partial<DailyFocusData>): Promise<void> {
    const existing = await SharedStorage.read('daily_focus');
    const updated = {
      topPriority: data.topPriority ?? existing?.topPriority ?? 'Focus on what matters',
      ritualsCompleted: data.ritualsCompleted ?? existing?.ritualsCompleted ?? 0,
      ritualTotal: data.ritualTotal ?? existing?.ritualTotal ?? 5,
      streakCount: data.streakCount ?? existing?.streakCount ?? 0,
      lastUpdated: new Date().toISOString(),
    };
    await WidgetUpdateManager.updateDailyFocusWidget(updated);
  },

  /**
   * Update Quick Coach widget specifically
   */
  async updateQuickCoach(data: Partial<QuickCoachData>): Promise<void> {
    const existing = await SharedStorage.read('quick_coach');
    const updated = {
      coachingPrompt: data.coachingPrompt ?? existing?.coachingPrompt ?? 'What\'s on your mind?',
      recommendedCoach: data.recommendedCoach ?? existing?.recommendedCoach ?? { name: 'Your Coach', emoji: '🧠' },
      suggestedAction: data.suggestedAction ?? existing?.suggestedAction ?? 'Take a voice session',
      sessionTime: data.sessionTime ?? existing?.sessionTime ?? '5 min',
    };
    await WidgetUpdateManager.updateQuickCoachWidget(updated);
  },

  /**
   * Update Reflection widget specifically
   */
  async updateReflection(data: Partial<ReflectionData>): Promise<void> {
    const existing = await SharedStorage.read('reflection');
    const updated = {
      contentType: data.contentType ?? existing?.contentType ?? 'morning' as const,
      mainContent: data.mainContent ?? existing?.mainContent ?? 'What matters most today?',
      subtitle: data.subtitle ?? existing?.subtitle,
      insight: data.insight ?? existing?.insight,
      actionPrompt: data.actionPrompt ?? existing?.actionPrompt,
      timeOfDay: data.timeOfDay ?? existing?.timeOfDay ?? 'morning' as const,
    };
    await WidgetUpdateManager.updateReflectionWidget(updated);
  },

  /**
   * Clear all widget data (useful for logout or data reset)
   */
  async clearAllData(): Promise<void> {
    await SharedStorage.clear();
  },

  /**
   * Get current widget data (for debugging)
   */
  async getWidgetData() {
    return {
      dailyFocus: await SharedStorage.read('daily_focus'),
      quickCoach: await SharedStorage.read('quick_coach'),
      reflection: await SharedStorage.read('reflection'),
    };
  },
};

// Export SharedStorage for advanced use cases
export { SharedStorage };

export default WidgetBridge;
