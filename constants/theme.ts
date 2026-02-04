// Coachgenie Design System - Premium Editorial Aesthetic
// Inspired by Masterclass, BetterUp, and luxury editorial apps

export const Colors = {
  // Premium Editorial Palette
  warmOatmeal: '#FDFCF8',        // Primary background - paper-like texture
  warmOatmealDark: '#F5F3ED',    // Secondary background
  cream: '#FAF8F5',              // Card backgrounds

  // Deep Sophisticated Tones
  midnightEmerald: '#1B3022',    // Primary dark - headers, high-contrast text
  deepEspresso: '#2C1E1B',       // Alternative dark tone
  charcoal: '#2D2A26',           // Body text
  slate: '#5A5550',              // Secondary text
  stoneGray: '#8A857E',          // Tertiary text, captions

  // Accent - Premium Gold
  burnishedGold: '#C5A059',      // Active states, premium flourishes
  goldLight: '#D4B77A',          // Hover/lighter states
  goldMuted: 'rgba(197, 160, 89, 0.15)', // Subtle backgrounds
  goldShimmer: 'rgba(197, 160, 89, 0.3)', // Shimmer effects

  // Functional Colors
  success: '#3D7A5C',            // Muted forest green
  successLight: 'rgba(61, 122, 92, 0.12)',
  warning: '#B8860B',            // Dark goldenrod
  warningLight: 'rgba(184, 134, 11, 0.12)',
  error: '#9B4D4D',              // Muted crimson
  errorLight: 'rgba(155, 77, 77, 0.12)',

  // Glass & UI Effects
  glassBg: 'rgba(253, 252, 248, 0.85)',
  glassBlur: 'rgba(255, 255, 255, 0.6)',
  glassBorder: 'rgba(197, 160, 89, 0.2)',
  cardBg: '#FFFFFF',
  overlay: 'rgba(27, 48, 34, 0.6)',
  overlayLight: 'rgba(27, 48, 34, 0.3)',

  // Borders
  border: 'rgba(45, 42, 38, 0.1)',
  borderGold: 'rgba(197, 160, 89, 0.3)',
  borderLight: 'rgba(45, 42, 38, 0.05)',

  // Chat Colors
  userMessage: '#1B3022',
  aiMessage: 'rgba(253, 252, 248, 0.9)',

  // Legacy support - Backwards compatibility
  white: '#FFFFFF',
  black: '#000000',

  // Legacy color aliases (map to new premium palette)
  offWhite: '#FDFCF8',             // -> warmOatmeal
  slateCharcoal: '#2D2A26',        // -> charcoal
  slateGray: '#8A857E',            // -> stoneGray
  slateLight: '#A8A39D',           // Lighter stone
  electricIndigo: '#C5A059',       // -> burnishedGold (accent color)
  electricIndigoLight: 'rgba(197, 160, 89, 0.15)', // -> goldMuted
  inputBg: '#F5F3ED',              // -> warmOatmealDark
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
  // Font Families
  fonts: {
    serif: 'Georgia',           // Primary headings - editorial feel
    serifItalic: 'Georgia',
    sans: 'System',             // Body copy - clean, high-kerning
  },

  // Font Weights
  weights: {
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },

  // Font Sizes - More editorial scale
  sizes: {
    micro: 10,
    caption: 12,
    body: 15,
    bodyLarge: 17,
    subtitle: 19,
    title: 22,
    headline: 26,
    display: 34,
    hero: 42,
    giant: 56,
  },

  // Line Heights
  lineHeights: {
    tight: 1.2,
    snug: 1.35,
    normal: 1.5,
    relaxed: 1.65,
    loose: 1.8,
  },

  // Letter Spacing
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
    widest: 2,
  },
} as const;

export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  squircle: 28,       // Premium squircle corners
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
    shadowColor: '#1B3022',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  sm: {
    shadowColor: '#1B3022',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: '#1B3022',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  lg: {
    shadowColor: '#1B3022',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 8,
  },
  xl: {
    shadowColor: '#1B3022',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 12,
  },
  gold: {
    shadowColor: '#C5A059',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

// Animation timings - Slower, more elegant
export const Timing = {
  instant: 100,
  fast: 200,
  normal: 350,
  slow: 500,
  elegant: 700,
  dramatic: 1000,
  spring: {
    damping: 20,
    stiffness: 120,
    mass: 1,
  },
  springGentle: {
    damping: 25,
    stiffness: 90,
    mass: 1.2,
  },
  springBouncy: {
    damping: 15,
    stiffness: 150,
    mass: 0.8,
  },
} as const;

// Glass card styles
export const GlassCard = {
  background: Colors.glassBg,
  borderWidth: 1,
  borderColor: Colors.glassBorder,
  borderRadius: Radius.squircle,
  ...Shadows.md,
} as const;

// Premium button styles
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
