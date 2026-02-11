/**
 * Live Activity Bridge - React Native to iOS Native Bridge
 *
 * Provides:
 * - Native module interface for Live Activities
 * - React hooks for managing activity lifecycle
 * - Automatic cleanup on component unmount
 * - Error handling and fallbacks for unsupported devices
 *
 * This bridge abstracts away the native complexity and provides
 * a clean React interface for starting, updating, and ending Live Activities.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  VoiceActivityManager,
  StreakActivityManager,
  VoiceSessionActivityState,
  CoachingStreakActivityState,
  isLiveActivitiesSupported,
  formatDuration,
} from './liveActivities';

/**
 * Hook for managing voice session Live Activities
 *
 * Handles:
 * - Starting activity when session begins
 * - Updating duration every second
 * - Ending activity on cleanup/disconnect
 *
 * @param isActive - Whether the voice session is currently active
 * @param sessionId - Unique session identifier
 * @param coachId - Coach identifier
 * @param coachName - Display name of the coach
 * @param coachAvatar - Avatar URL or image path
 * @param topic - Session topic/subject
 * @param startedAt - Session start timestamp (milliseconds)
 * @param onActivityToken - Callback when push token is obtained
 *
 * @returns Current activity duration in seconds, or null if not active
 *
 * @example
 * ```tsx
 * const duration = useVoiceActivity({
 *   isActive: sessionState === 'connected',
 *   sessionId: 'session-123',
 *   coachId: 'coach-456',
 *   coachName: 'Sarah',
 *   coachAvatar: 'https://...',
 *   topic: 'Career Planning',
 *   startedAt: Date.now(),
 *   onActivityToken: (token) => {
 *     // Send token to backend for push notifications
 *     api.registerActivityPushToken(token);
 *   },
 * });
 * ```
 */
export interface UseVoiceActivityParams {
  isActive: boolean;
  sessionId: string;
  coachId: string;
  coachName: string;
  coachAvatar: string;
  coachRole?: string;
  topic: string;
  startedAt: number;
  onActivityToken?: (token: string) => void;
  onActivityEnded?: () => void;
}

export function useVoiceActivity(params: UseVoiceActivityParams): number | null {
  const {
    isActive,
    sessionId,
    coachId,
    coachName,
    coachAvatar,
    coachRole,
    topic,
    startedAt,
    onActivityToken,
    onActivityEnded,
  } = params;

  const durationRef = useRef<number>(0);
  const updateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activityStartedRef = useRef<boolean>(false);
  const pushTokenRef = useRef<string | null>(null);

  // Start activity when session becomes active
  useEffect(() => {
    if (!isActive || !isLiveActivitiesSupported()) {
      return;
    }

    const startVoiceActivity = async () => {
      try {
        const state: VoiceSessionActivityState = {
          sessionId,
          coachId,
          coachName,
          coachAvatar,
          coachRole,
          topic,
          duration: 0,
          startedAt,
          isActive: true,
          waveformIntensity: 0,
          deepLink: `coachgenie://voice-session/${sessionId}`,
        };

        const token = await VoiceActivityManager.startActivity(state);
        if (token) {
          pushTokenRef.current = token;
          onActivityToken?.(token);
        }

        activityStartedRef.current = true;
        durationRef.current = 0;
      } catch (error) {
        console.error('[useVoiceActivity] Failed to start activity:', error);
      }
    };

    startVoiceActivity();

    // Set up duration update interval
    updateIntervalRef.current = setInterval(async () => {
      if (!activityStartedRef.current) return;

      durationRef.current += 1;

      // Calculate waveform intensity (simple oscillation for demo)
      const waveformIntensity = Math.sin((durationRef.current % 30) / 30 * Math.PI) * 0.5 + 0.5;

      try {
        await VoiceActivityManager.updateActivity(
          sessionId,
          durationRef.current,
          waveformIntensity,
          true
        );
      } catch (error) {
        console.error('[useVoiceActivity] Failed to update activity:', error);
      }
    }, 1000);

    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [isActive, sessionId, coachId, coachName, coachAvatar, coachRole, topic, startedAt, onActivityToken]);

  // End activity on cleanup or when isActive becomes false
  useEffect(() => {
    if (!isActive && activityStartedRef.current) {
      const endVoiceActivity = async () => {
        try {
          await VoiceActivityManager.endActivity(sessionId, durationRef.current);
          activityStartedRef.current = false;
          onActivityEnded?.();
        } catch (error) {
          console.error('[useVoiceActivity] Failed to end activity:', error);
        }
      };

      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }

      endVoiceActivity();
    }
  }, [isActive, sessionId, onActivityEnded]);

  return isActive ? durationRef.current : null;
}

/**
 * Hook for managing coaching streak Live Activities
 *
 * Handles:
 * - Starting streak activity on app launch/initialization
 * - Updating streak info when status changes
 * - Ending activity on logout
 *
 * @param isActive - Whether to show the streak activity
 * @param streakCount - Current streak number
 * @param isStreakOnTrack - Whether user has coached today
 * @param todaysFocus - Today's coaching focus
 * @param focusEmoji - Emoji for today's focus
 * @param nextRitualTime - When the next coaching ritual is scheduled
 * @param nextRitualName - Name of the next ritual
 * @param userId - User identifier for deep linking
 * @param onActivityToken - Callback when push token is obtained
 *
 * @example
 * ```tsx
 * useStreakActivity({
 *   isActive: isUserLoggedIn,
 *   streakCount: 12,
 *   isStreakOnTrack: coachingDoneToday,
 *   todaysFocus: 'Career Growth',
 *   nextRitualTime: '2:00 PM',
 *   userId: 'user-123',
 *   onActivityToken: (token) => {
 *     api.registerStreakPushToken(token);
 *   },
 * });
 * ```
 */
export interface UseStreakActivityParams {
  isActive: boolean;
  streakCount: number;
  isStreakOnTrack: boolean;
  todaysFocus: string;
  focusEmoji?: string;
  nextRitualTime: string;
  nextRitualName?: string;
  userId: string;
  onActivityToken?: (token: string) => void;
  onActivityEnded?: () => void;
}

export function useStreakActivity(params: UseStreakActivityParams): void {
  const {
    isActive,
    streakCount,
    isStreakOnTrack,
    todaysFocus,
    focusEmoji,
    nextRitualTime,
    nextRitualName,
    userId,
    onActivityToken,
    onActivityEnded,
  } = params;

  const activityStartedRef = useRef<boolean>(false);
  const pushTokenRef = useRef<string | null>(null);

  // Start activity when component mounts and isActive is true
  useEffect(() => {
    if (!isActive || !isLiveActivitiesSupported()) {
      return;
    }

    const startStreakActivity = async () => {
      try {
        const state: CoachingStreakActivityState = {
          streakCount,
          isStreakOnTrack,
          todaysFocus,
          focusEmoji,
          nextRitualTime,
          nextRitualName,
          deepLink: `coachgenie://streak/${userId}`,
        };

        const token = await StreakActivityManager.startActivity(state);
        if (token) {
          pushTokenRef.current = token;
          onActivityToken?.(token);
        }

        activityStartedRef.current = true;
      } catch (error) {
        console.error('[useStreakActivity] Failed to start activity:', error);
      }
    };

    startStreakActivity();
  }, [isActive, userId, onActivityToken]);

  // Update activity when state changes
  useEffect(() => {
    if (!isActive || !activityStartedRef.current || !isLiveActivitiesSupported()) {
      return;
    }

    const updateStreakActivity = async () => {
      try {
        await StreakActivityManager.updateActivity({
          streakCount,
          isStreakOnTrack,
          todaysFocus,
          focusEmoji,
          nextRitualTime,
          nextRitualName,
        });
      } catch (error) {
        console.error('[useStreakActivity] Failed to update activity:', error);
      }
    };

    updateStreakActivity();
  }, [isActive, streakCount, isStreakOnTrack, todaysFocus, focusEmoji, nextRitualTime, nextRitualName]);

  // End activity on cleanup or when isActive becomes false
  useEffect(() => {
    if (!isActive && activityStartedRef.current) {
      const endStreakActivity = async () => {
        try {
          await StreakActivityManager.endActivity();
          activityStartedRef.current = false;
          onActivityEnded?.();
        } catch (error) {
          console.error('[useStreakActivity] Failed to end activity:', error);
        }
      };

      endStreakActivity();
    }
  }, [isActive, onActivityEnded]);
}

/**
 * Helper hook to manage activity duration formatting
 *
 * Useful for displaying the duration in your UI
 *
 * @param durationSeconds - Raw duration in seconds
 * @returns Formatted duration string (e.g., "5:32")
 *
 * @example
 * ```tsx
 * const formattedDuration = useFormattedDuration(durationSeconds);
 * <Text>{formattedDuration}</Text>
 * ```
 */
export function useFormattedDuration(durationSeconds: number | null): string {
  const [formatted, setFormatted] = useState<string>('0:00');

  useEffect(() => {
    if (durationSeconds === null) {
      setFormatted('0:00');
    } else {
      setFormatted(formatDuration(durationSeconds));
    }
  }, [durationSeconds]);

  return formatted;
}

/**
 * Utility to manually register a push token with your backend
 *
 * Call this when you obtain an activity push token to enable
 * server-side push updates to the Live Activity
 *
 * @param activityType - 'voice' or 'streak'
 * @param token - The push token from the activity
 * @param onRegister - Callback to send token to your backend
 *
 * @example
 * ```tsx
 * useEffect(() => {
 *   registerActivityPushToken('voice', token, async (t) => {
 *     await api.post('/activities/push-token', { token: t });
 *   });
 * }, [token]);
 * ```
 */
export function registerActivityPushToken(
  activityType: 'voice' | 'streak',
  token: string,
  onRegister: (token: string) => Promise<void>
): void {
  onRegister(token).catch((error) => {
    console.error(`[registerActivityPushToken] Failed to register ${activityType} token:`, error);
  });
}

export default {
  useVoiceActivity,
  useStreakActivity,
  useFormattedDuration,
  registerActivityPushToken,
};
