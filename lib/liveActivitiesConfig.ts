/**
 * Live Activities Configuration
 *
 * Centralized configuration for colors, timing, and behavior of Live Activities.
 * Modify these values to customize the appearance and behavior of activities.
 */

/**
 * Color Palette
 * All colors in RGB format (0-1 range) and Hex
 *
 * Usage in Swift:
 * ```swift
 * Color(red: colorConfig.accent.r, green: colorConfig.accent.g, blue: colorConfig.accent.b)
 * ```
 */
export const colorConfig = {
  background: {
    // Deep charcoal - primary background
    hex: '#1a1a2e',
    r: 0.1,
    g: 0.1,
    b: 0.18,
  },
  backgroundSecondary: {
    // Slightly lighter background for layers
    hex: '#0f0f17',
    r: 0.15,
    g: 0.15,
    b: 0.25,
  },
  accent: {
    // Gold - brand accent color
    hex: '#d4af37',
    r: 0.85,
    g: 0.68,
    b: 0.22,
  },
  text: {
    // Light gray - primary text
    hex: '#e8e8e8',
    r: 0.91,
    g: 0.91,
    b: 0.91,
  },
  textSecondary: {
    // Medium gray - secondary text
    hex: '#a0a0a0',
    r: 0.63,
    g: 0.63,
    b: 0.63,
  },
  success: {
    // Green - success states
    hex: '#20cc80',
    r: 0.2,
    g: 0.8,
    b: 0.4,
  },
  error: {
    // Red - error/warning states
    hex: '#cc3333',
    r: 0.8,
    g: 0.2,
    b: 0.2,
  },
  warning: {
    // Orange - warning states
    hex: '#ff9500',
    r: 0.85,
    g: 0.68,
    b: 0.22,
  },
};

/**
 * Activity Timing Configuration
 */
export const timingConfig = {
  // Duration update frequency (milliseconds)
  durationUpdateInterval: 1000,

  // How long the activity stays visible after being dismissed (seconds)
  dismissalDelay: 5,

  // Waveform animation cycle time (milliseconds)
  waveformCycleDuration: 1000,

  // How often to recalculate waveform intensity (milliseconds)
  waveformUpdateInterval: 100,
};

/**
 * Voice Session Activity Configuration
 */
export const voiceActivityConfig = {
  // Activity key/identifier
  identifier: 'voice-session',

  // Dynamic Island behavior
  dynamicIsland: {
    // Show the expanded view by default
    expandedByDefault: true,

    // Icon in compact view
    compactIcon: 'mic.fill',

    // Show waveform in compact trailing
    showWaveformIndicator: true,
  },

  // Lock Screen behavior
  lockScreen: {
    // Show coach avatar
    showAvatar: true,

    // Show session topic
    showTopic: true,

    // Button label
    returnButtonLabel: 'Return to Session',

    // Highlight color for button
    buttonColor: 'accent',
  },

  // Update behavior
  updates: {
    // Update duration every N seconds
    durationUpdateInterval: 1,

    // Send waveform updates every N seconds
    waveformUpdateInterval: 1,

    // Stop updating if no changes for N seconds
    maxInactiveTime: 30,
  },

  // Dismissal
  dismissal: {
    // Auto-dismiss after N seconds when activity ends
    autoDissmissDelay: 5,

    // Show final state before dismissing
    showFinalState: true,
  },
};

/**
 * Coaching Streak Activity Configuration
 */
export const streakActivityConfig = {
  // Activity key/identifier
  identifier: 'coaching-streak',

  // Dynamic Island behavior
  dynamicIsland: {
    // Show streak count badge
    showBadge: true,

    // Badge emoji
    badgeEmoji: '🔥',

    // Show status indicator (On Track / Due Soon)
    showStatusIndicator: true,
  },

  // Lock Screen behavior
  lockScreen: {
    // Show progress bar
    showProgressBar: true,

    // Show today's focus
    showTodaysFocus: true,

    // Show next ritual time
    showNextRitualTime: true,

    // Button label
    startButtonLabel: 'Start Coaching Session',

    // Highlight color for button
    buttonColor: 'accent',
  },

  // Display configuration
  display: {
    // Format for streak count display
    // Options: 'badge', 'count', 'both'
    streakFormat: 'badge',

    // Show "Day" or "Days" suffix
    showDaySuffix: true,

    // Maximum length for focus text (characters)
    maxFocusLength: 30,

    // Maximum length for ritual name (characters)
    maxRitualNameLength: 20,
  },

  // Update behavior
  updates: {
    // Update frequency if streak data changes
    updateInterval: 5,

    // Check for daily reset at this time (24-hour format)
    dailyResetTime: { hours: 0, minutes: 0 },
  },
};

/**
 * Deep Link Configuration
 */
export const deepLinkConfig = {
  // Scheme used for deep links
  scheme: 'coachgenie',

  // Routes for voice session activities
  voiceSession: {
    return: 'voice-session', // coachgenie://voice-session/{sessionId}
    end: 'voice-session/end', // coachgenie://voice-session/end/{sessionId}
  },

  // Routes for streak activities
  streak: {
    start: 'streak', // coachgenie://streak/{userId}
  },

  // Fallback URL if deep link cannot be opened
  fallbackUrl: 'coachgenie://',
};

/**
 * Error Handling Configuration
 */
export const errorConfig = {
  // Log errors to console
  debugLogging: __DEV__,

  // Send errors to analytics service
  reportToAnalytics: !__DEV__,

  // Graceful degradation - continue app without Live Activities
  gracefulDegradation: true,

  // Retry failed operations
  retryAttempts: 3,
  retryDelayMs: 1000,
};

/**
 * Feature Flags
 */
export const featureFlags = {
  // Enable voice session activities
  voiceSessionsEnabled: true,

  // Enable streak activities
  streakActivitiesEnabled: true,

  // Enable push notification support
  pushNotificationsEnabled: true,

  // Show debug info in activities
  debugMode: __DEV__,

  // Enable accessibility features
  accessibilityEnabled: true,
};

/**
 * String Configuration
 * Customize text and labels displayed in activities
 */
export const stringConfig = {
  voiceSession: {
    subtitle: 'Active voice session',
    statusFormat: '{percent}% active',
    endButtonLabel: 'End',
    returnButtonLabel: 'Return to Session',
    durationLabel: 'Duration:',
    roleDefault: 'Voice Coach',
  },

  streak: {
    streakFormatSingular: '{count} Day Streak',
    streakFormatPlural: '{count} Day Streak',
    streakSuffix: ' Day Streak',
    statusOnTrack: 'Session completed today',
    statusDueSoon: 'Session due',
    statusOffTrack: 'Get back on track',
    todaysFocusLabel: "Today's Focus",
    nextRitualLabel: 'Next:',
    startButtonLabel: 'Start Coaching Session',
    progressLabel: 'Daily Progress',
    progressComplete: 'Complete',
    progressPending: 'Pending',
  },
};

/**
 * Accessibility Configuration
 */
export const a11yConfig = {
  // Enable voice over support
  voiceOverEnabled: true,

  // Minimum touch target size (points)
  minTouchSize: 44,

  // Use high contrast colors
  highContrast: false,

  // Reduce animations
  reduceMotion: false,

  // Larger text sizes
  largeText: false,
};

/**
 * Testing Configuration
 * Used for testing and development
 */
export const testingConfig = {
  // Mock Live Activities (for testing without native support)
  mockActivities: false,

  // Simulate slow updates
  slowMotionUpdates: false,

  // Simulate network errors
  simulateErrors: false,

  // Log all activity operations
  verboseLogging: __DEV__,

  // Test with shortened durations
  testDurationSeconds: 10,
};

/**
 * Helper function to convert hex color to RGB object
 *
 * @param hex - Hex color string (e.g., "#d4af37")
 * @returns Object with r, g, b values (0-1 range)
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

  if (!result) {
    // Return default accent color if parsing fails
    return { r: 0.85, g: 0.68, b: 0.22 };
  }

  return {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255,
  };
}

/**
 * Helper function to convert RGB to hex color
 *
 * @param r - Red component (0-1)
 * @param g - Green component (0-1)
 * @param b - Blue component (0-1)
 * @returns Hex color string (e.g., "#d4af37")
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const hex = Math.round(n * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Get a color by name from config
 *
 * @param colorName - Name of the color (e.g., 'accent', 'text')
 * @returns Color object with hex, r, g, b values
 */
export function getColor(
  colorName: keyof typeof colorConfig
): typeof colorConfig[keyof typeof colorConfig] {
  return colorConfig[colorName] || colorConfig.text;
}

/**
 * Format a string with variables
 *
 * @param template - Template string (e.g., "{count} Day Streak")
 * @param variables - Object with variable values
 * @returns Formatted string
 *
 * @example
 * ```ts
 * formatString(stringConfig.streak.streakFormatPlural, { count: 12 })
 * // "12 Day Streak"
 * ```
 */
export function formatString(
  template: string,
  variables: Record<string, string | number>
): string {
  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(`{${key}}`, String(value));
  }

  return result;
}

/**
 * Export all configuration as a single object
 * Useful for passing to native modules
 */
export const LiveActivitiesConfig = {
  colors: colorConfig,
  timing: timingConfig,
  voiceActivity: voiceActivityConfig,
  streakActivity: streakActivityConfig,
  deepLinks: deepLinkConfig,
  errors: errorConfig,
  features: featureFlags,
  strings: stringConfig,
  accessibility: a11yConfig,
  testing: testingConfig,
};

export default LiveActivitiesConfig;
