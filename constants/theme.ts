// Coachgenie Design System - Deep Focus Aesthetic
// Inspired by Opal and Rise apps

export const Colors = {
  // Primary Palette
  electricIndigo: '#6366F1',
  electricIndigoLight: '#818CF8',
  electricIndigoDark: '#4F46E5',

  // Background Palette
  offWhite: '#FAFBFC',
  white: '#FFFFFF',

  // Text Palette
  slateCharcoal: '#1E293B',
  slateGray: '#475569',
  slateLight: '#94A3B8',

  // Accent Colors
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',

  // UI Colors
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  inputBg: '#F8FAFC',
  cardBg: '#FFFFFF',
  overlay: 'rgba(30, 41, 59, 0.5)',

  // Chat Colors
  userMessage: '#6366F1',
  aiMessage: '#F1F5F9',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  section: 40,
} as const;

export const Typography = {
  // Font Weights (using system fonts)
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  // Font Sizes
  sizes: {
    caption: 12,
    body: 14,
    bodyLarge: 16,
    subtitle: 18,
    title: 20,
    headline: 24,
    display: 32,
    hero: 40,
  },

  // Line Heights
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const Radius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  full: 9999,
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;

// Animation durations
export const Timing = {
  fast: 150,
  normal: 250,
  slow: 400,
  spring: {
    damping: 15,
    stiffness: 150,
  },
} as const;
