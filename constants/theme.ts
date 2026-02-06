// Coachgenie Design System v2 - Premium Editorial + Tactile Mobile

export const Colors = {
  // Foundational surfaces
  warmOatmeal: '#F7F4EE',
  warmOatmealDark: '#EDE6D9',
  cream: '#FBF8F2',

  // Core ink tones
  midnightEmerald: '#122821',
  deepEspresso: '#2A1E1A',
  charcoal: '#22201C',
  slate: '#4F4A43',
  stoneGray: '#777067',

  // Premium accent - warm brass
  burnishedGold: '#B7883A',
  goldLight: '#CEA35F',
  goldMuted: 'rgba(183, 136, 58, 0.14)',
  goldShimmer: 'rgba(183, 136, 58, 0.26)',

  // Functional semantic tones
  success: '#2E7B5A',
  successLight: 'rgba(46, 123, 90, 0.14)',
  warning: '#A9791D',
  warningLight: 'rgba(169, 121, 29, 0.14)',
  error: '#A14A45',
  errorLight: 'rgba(161, 74, 69, 0.14)',

  // Surface effects
  glassBg: 'rgba(251, 248, 242, 0.82)',
  glassBlur: 'rgba(255, 255, 255, 0.58)',
  glassBorder: 'rgba(183, 136, 58, 0.18)',
  cardBg: '#FFFEFC',
  overlay: 'rgba(18, 40, 33, 0.62)',
  overlayLight: 'rgba(18, 40, 33, 0.36)',

  // Borders
  border: 'rgba(34, 32, 28, 0.12)',
  borderGold: 'rgba(183, 136, 58, 0.32)',
  borderLight: 'rgba(34, 32, 28, 0.06)',

  // Messaging surfaces
  userMessage: '#122821',
  aiMessage: 'rgba(255, 254, 252, 0.94)',

  white: '#FFFFFF',
  black: '#000000',

  // Legacy aliases kept for backward compatibility
  offWhite: '#F7F4EE',
  slateCharcoal: '#22201C',
  slateGray: '#777067',
  slateLight: '#9B958D',
  electricIndigo: '#B7883A',
  electricIndigoLight: 'rgba(183, 136, 58, 0.14)',
  inputBg: '#F2ECE2',
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
  hero: 48,
} as const;

export const Typography = {
  fonts: {
    serif: 'Georgia',
    serifItalic: 'Georgia',
    sans: 'Avenir Next',
  },

  weights: {
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  sizes: {
    micro: 10,
    caption: 12,
    body: 15,
    bodyLarge: 17,
    subtitle: 19,
    title: 22,
    headline: 28,
    display: 36,
    hero: 44,
    giant: 58,
  },

  lineHeights: {
    tight: 1.2,
    snug: 1.34,
    normal: 1.5,
    relaxed: 1.64,
    loose: 1.8,
  },

  letterSpacing: {
    tight: -0.4,
    normal: 0,
    wide: 0.45,
    wider: 0.85,
    widest: 1.8,
  },
} as const;

export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  squircle: 28,
  pill: 100,
  full: 9999,
} as const;

export const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  subtle: {
    shadowColor: '#122821',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sm: {
    shadowColor: '#122821',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: '#122821',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.09,
    shadowRadius: 14,
    elevation: 4,
  },
  lg: {
    shadowColor: '#122821',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 26,
    elevation: 8,
  },
  xl: {
    shadowColor: '#122821',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.14,
    shadowRadius: 34,
    elevation: 12,
  },
  gold: {
    shadowColor: '#B7883A',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.24,
    shadowRadius: 18,
    elevation: 6,
  },
} as const;

export const Timing = {
  instant: 100,
  fast: 180,
  normal: 320,
  slow: 460,
  elegant: 640,
  dramatic: 920,
  spring: {
    damping: 20,
    stiffness: 120,
    mass: 1,
  },
  springGentle: {
    damping: 24,
    stiffness: 92,
    mass: 1.12,
  },
  springBouncy: {
    damping: 15,
    stiffness: 154,
    mass: 0.85,
  },
} as const;

export const GlassCard = {
  background: Colors.glassBg,
  borderWidth: 1,
  borderColor: Colors.glassBorder,
  borderRadius: Radius.squircle,
  ...Shadows.md,
} as const;

export const PremiumButton = {
  primary: {
    backgroundColor: Colors.burnishedGold,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    borderRadius: Radius.pill,
    ...Shadows.gold,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: Colors.midnightEmerald,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
    borderRadius: Radius.pill,
  },
  ghost: {
    backgroundColor: 'transparent',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
} as const;
