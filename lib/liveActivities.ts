/**
 * iOS Live Activities Manager
 *
 * Manages Live Activities for:
 * - Active voice coaching sessions (Dynamic Island + Lock Screen)
 * - Daily coaching streak reminders (Dynamic Island + Lock Screen)
 *
 * Requires iOS 16.1+
 * Uses ActivityKit framework via native bridge
 *
 * Features:
 * - Real-time activity updates (duration, status, etc.)
 * - Push notification support via Activity Push tokens
 * - Deep linking back to app (coachgenie:// scheme)
 * - Automatic cleanup on session end
 * - Error handling for unsupported devices
 */

import { NativeModules, Platform } from 'react-native';

const LIVE_ACTIVITIES_MODULE = NativeModules.CoachGenieLiveActivities;

// Type definitions for Live Activities state

export interface VoiceSessionActivityState {
  // Identifiers
  sessionId: string;
  coachId: string;

  // Display data
  coachName: string;
  coachAvatar: string;
  coachRole?: string;

  // Session info
  topic: string;
  duration: number; // seconds elapsed
  startedAt: number; // timestamp in milliseconds

  // Visual indicators
  isActive: boolean;
  waveformIntensity: number; // 0-1 for waveform visualization

  // Deep link
  deepLink: string; // coachgenie://voice-session/{sessionId}
}

export interface CoachingStreakActivityState {
  // User progress
  streakCount: number;
  isStreakOnTrack: boolean; // true if already coached today

  // Daily focus
  todaysFocus: string;
  focusEmoji?: string;

  // Timing
  nextRitualTime: string; // e.g., "2:00 PM"
  nextRitualName?: string;

  // Deep link
  deepLink: string; // coachgenie://streak/{userId}
}

/**
 * Platform compatibility check
 * Live Activities require iOS 16.1+
 */
export function isLiveActivitiesSupported(): boolean {
  if (Platform.OS !== 'ios') {
    return false;
  }

  if (!LIVE_ACTIVITIES_MODULE) {
    console.warn('Live Activities module not available');
    return false;
  }

  return true;
}

/**
 * Voice Session Activity Manager
 */
export const VoiceActivityManager = {
  /**
   * Start a voice session Live Activity
   *
   * Shows on Dynamic Island + Lock Screen during active voice coaching
   *
   * @param state - Activity state with session info
   * @returns Activity token for push notifications, or null if unsupported
   */
  async startActivity(state: VoiceSessionActivityState): Promise<string | null> {
    if (!isLiveActivitiesSupported()) {
      console.warn('Live Activities not supported on this device');
      return null;
    }

    try {
      const token = await LIVE_ACTIVITIES_MODULE.startVoiceActivity({
        sessionId: state.sessionId,
        coachId: state.coachId,
        coachName: state.coachName,
        coachAvatar: state.coachAvatar,
        coachRole: state.coachRole || 'Voice Coach',
        topic: state.topic,
        duration: state.duration,
        startedAt: state.startedAt,
        isActive: state.isActive,
        waveformIntensity: state.waveformIntensity,
        deepLink: state.deepLink,
      });

      console.log(`[LiveActivities] Voice activity started with token: ${token}`);
      return token;
    } catch (error) {
      console.error('[LiveActivities] Failed to start voice activity:', error);
      return null;
    }
  },

  /**
   * Update an active voice session Live Activity
   *
   * Call this every second to update the duration timer
   *
   * @param sessionId - Session identifier
   * @param duration - Elapsed seconds
   * @param waveformIntensity - Waveform visual intensity (0-1)
   * @param isActive - Whether session is still active
   */
  async updateActivity(
    sessionId: string,
    duration: number,
    waveformIntensity: number,
    isActive: boolean = true
  ): Promise<void> {
    if (!isLiveActivitiesSupported()) {
      return;
    }

    try {
      await LIVE_ACTIVITIES_MODULE.updateVoiceActivity({
        sessionId,
        duration,
        waveformIntensity,
        isActive,
      });
    } catch (error) {
      console.error('[LiveActivities] Failed to update voice activity:', error);
    }
  },

  /**
   * End a voice session Live Activity
   *
   * Call when:
   * - User taps "End" button
   * - Session disconnects unexpectedly
   * - Session completes
   *
   * @param sessionId - Session identifier
   * @param finalDuration - Total session duration in seconds
   * @param dismissAfterSeconds - Time before activity auto-dismisses (default 5)
   */
  async endActivity(
    sessionId: string,
    finalDuration: number,
    dismissAfterSeconds: number = 5
  ): Promise<void> {
    if (!isLiveActivitiesSupported()) {
      return;
    }

    try {
      await LIVE_ACTIVITIES_MODULE.endVoiceActivity({
        sessionId,
        finalDuration,
        dismissAfterSeconds,
      });

      console.log(`[LiveActivities] Voice activity ended: ${sessionId}`);
    } catch (error) {
      console.error('[LiveActivities] Failed to end voice activity:', error);
    }
  },
};

/**
 * Coaching Streak Activity Manager
 */
export const StreakActivityManager = {
  /**
   * Start or update the daily coaching streak Live Activity
   *
   * Shows on Dynamic Island + Lock Screen as a persistent reminder
   *
   * @param state - Streak activity state
   * @returns Activity token for push notifications, or null if unsupported
   */
  async startActivity(state: CoachingStreakActivityState): Promise<string | null> {
    if (!isLiveActivitiesSupported()) {
      console.warn('Live Activities not supported on this device');
      return null;
    }

    try {
      const token = await LIVE_ACTIVITIES_MODULE.startStreakActivity({
        streakCount: state.streakCount,
        isStreakOnTrack: state.isStreakOnTrack,
        todaysFocus: state.todaysFocus,
        focusEmoji: state.focusEmoji || '🎯',
        nextRitualTime: state.nextRitualTime,
        nextRitualName: state.nextRitualName || 'Coaching Session',
        deepLink: state.deepLink,
      });

      console.log(`[LiveActivities] Streak activity started with token: ${token}`);
      return token;
    } catch (error) {
      console.error('[LiveActivities] Failed to start streak activity:', error);
      return null;
    }
  },

  /**
   * Update an active streak Live Activity
   *
   * Call when:
   * - User completes a coaching session
   * - Streak count changes
   * - Daily focus updates
   * - Next ritual time changes
   *
   * @param state - Updated streak activity state
   */
  async updateActivity(state: Partial<CoachingStreakActivityState>): Promise<void> {
    if (!isLiveActivitiesSupported()) {
      return;
    }

    try {
      await LIVE_ACTIVITIES_MODULE.updateStreakActivity({
        streakCount: state.streakCount,
        isStreakOnTrack: state.isStreakOnTrack,
        todaysFocus: state.todaysFocus,
        focusEmoji: state.focusEmoji,
        nextRitualTime: state.nextRitualTime,
        nextRitualName: state.nextRitualName,
      });
    } catch (error) {
      console.error('[LiveActivities] Failed to update streak activity:', error);
    }
  },

  /**
   * End the coaching streak Live Activity
   *
   * Typically called on logout or app uninstall
   *
   * @param dismissAfterSeconds - Time before activity auto-dismisses (default 5)
   */
  async endActivity(dismissAfterSeconds: number = 5): Promise<void> {
    if (!isLiveActivitiesSupported()) {
      return;
    }

    try {
      await LIVE_ACTIVITIES_MODULE.endStreakActivity({
        dismissAfterSeconds,
      });

      console.log('[LiveActivities] Streak activity ended');
    } catch (error) {
      console.error('[LiveActivities] Failed to end streak activity:', error);
    }
  },
};

/**
 * Utility function to format seconds to MM:SS format
 *
 * @param seconds - Total seconds
 * @returns Formatted string (e.g., "5:32")
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Utility function to format time for next ritual display
 *
 * @param hours - Hour (0-23)
 * @param minutes - Minutes (0-59)
 * @param use12HourFormat - Whether to use 12-hour or 24-hour format
 * @returns Formatted time string (e.g., "2:00 PM")
 */
export function formatTime(
  hours: number,
  minutes: number,
  use12HourFormat: boolean = true
): string {
  if (use12HourFormat) {
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Get the push token for a Live Activity
 *
 * This token can be used to send push updates to the activity
 * from your backend server
 *
 * @param activityType - 'voice' or 'streak'
 * @returns Push token string, or null if unavailable
 */
export async function getActivityPushToken(
  activityType: 'voice' | 'streak'
): Promise<string | null> {
  if (!isLiveActivitiesSupported()) {
    return null;
  }

  try {
    const token = await LIVE_ACTIVITIES_MODULE.getActivityPushToken(activityType);
    return token;
  } catch (error) {
    console.error(`[LiveActivities] Failed to get push token for ${activityType}:`, error);
    return null;
  }
}

/**
 * Check if a specific Live Activity is currently active
 *
 * @param activityType - 'voice' or 'streak'
 * @returns true if the activity is currently active
 */
export async function isActivityActive(
  activityType: 'voice' | 'streak'
): Promise<boolean> {
  if (!isLiveActivitiesSupported()) {
    return false;
  }

  try {
    const isActive = await LIVE_ACTIVITIES_MODULE.isActivityActive(activityType);
    return isActive;
  } catch (error) {
    console.error(`[LiveActivities] Failed to check if ${activityType} is active:`, error);
    return false;
  }
}

export default {
  VoiceActivityManager,
  StreakActivityManager,
  isLiveActivitiesSupported,
  formatDuration,
  formatTime,
  getActivityPushToken,
  isActivityActive,
};
