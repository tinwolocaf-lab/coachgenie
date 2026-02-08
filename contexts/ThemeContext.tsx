import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { checkSovereignEntitlement, addCustomerInfoUpdateListener, hasSovereignEntitlement } from '@/lib/revenuecat';

// Theme IDs
export type AtmosphereId = 'original' | 'midnight-gallery' | 'botanist' | 'architect' | 'desert-solstice' | 'paper' | 'graphite' | 'sunset-cove' | 'tropicana';

// Define the complete color palette structure
export interface AtmospherePalette {
  // Primary backgrounds
  background: string;
  backgroundSecondary: string;
  cardBg: string;

  // Text colors
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  // Accent colors
  accent: string;
  accentLight: string;
  accentMuted: string;
  accentShimmer: string;

  // Functional colors
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  error: string;
  errorLight: string;

  // UI elements
  border: string;
  borderAccent: string;
  borderLight: string;

  // Glass effects
  glassBg: string;
  glassBlur: string;
  glassBorder: string;

  // Overlays
  overlay: string;
  overlayLight: string;

  // Chat
  userMessage: string;
  aiMessage: string;

  // Gradients (primary card/header gradient)
  gradientStart: string;
  gradientEnd: string;

  // Status bar style
  statusBarStyle: 'light' | 'dark';

  // Tab bar
  tabBarBg: string;
  tabBarActive: string;
  tabBarInactive: string;

  // Shadows
  shadowColor: string;

  // Glow intensity (0-1) for accent elements
  glowIntensity: number;

  // Structural properties
  useGradients: boolean;
  shadowIntensity: number;
  borderWeight: 'thin' | 'normal' | 'thick';
  cardRadius: number;
  glassIntensity: number;
  spacingScale: number;
}

export interface Atmosphere {
  id: AtmosphereId;
  name: string;
  description: string;
  isPremium: boolean;
  palette: AtmospherePalette;
}

// The Original - Warm oatmeal and gold
const originalPalette: AtmospherePalette = {
  background: '#FDFCF8',
  backgroundSecondary: '#F5F3ED',
  cardBg: '#FFFFFF',

  textPrimary: '#1B3022',
  textSecondary: '#2D2A26',
  textTertiary: '#8A857E',
  textInverse: '#FFFFFF',

  accent: '#C5A059',
  accentLight: '#D4B77A',
  accentMuted: 'rgba(197, 160, 89, 0.15)',
  accentShimmer: 'rgba(197, 160, 89, 0.3)',

  success: '#3D7A5C',
  successLight: 'rgba(61, 122, 92, 0.12)',
  warning: '#B8860B',
  warningLight: 'rgba(184, 134, 11, 0.12)',
  error: '#9B4D4D',
  errorLight: 'rgba(155, 77, 77, 0.12)',

  border: 'rgba(45, 42, 38, 0.1)',
  borderAccent: 'rgba(197, 160, 89, 0.3)',
  borderLight: 'rgba(45, 42, 38, 0.05)',

  glassBg: 'rgba(253, 252, 248, 0.85)',
  glassBlur: 'rgba(255, 255, 255, 0.6)',
  glassBorder: 'rgba(197, 160, 89, 0.2)',

  overlay: 'rgba(27, 48, 34, 0.6)',
  overlayLight: 'rgba(27, 48, 34, 0.3)',

  userMessage: '#1B3022',
  aiMessage: 'rgba(253, 252, 248, 0.9)',

  gradientStart: '#1B3022',
  gradientEnd: '#243D2E',

  statusBarStyle: 'dark',

  tabBarBg: 'rgba(253, 252, 248, 0.92)',
  tabBarActive: '#C5A059',
  tabBarInactive: '#8A857E',

  shadowColor: '#1B3022',
  glowIntensity: 0.25,
  useGradients: true,
  shadowIntensity: 1.0,
  borderWeight: 'normal',
  cardRadius: 28,
  glassIntensity: 1.0,
  spacingScale: 1.0,
};

// Midnight Gallery - Sophisticated dark mode
const midnightGalleryPalette: AtmospherePalette = {
  background: '#1A1D24',
  backgroundSecondary: '#242830',
  cardBg: '#2A2E38',

  textPrimary: '#F5F5F7',
  textSecondary: '#C8C9CC',
  textTertiary: '#8E9099',
  textInverse: '#1A1D24',

  accent: '#C4C9D4', // Champagne silver
  accentLight: '#D8DCE5',
  accentMuted: 'rgba(196, 201, 212, 0.15)',
  accentShimmer: 'rgba(196, 201, 212, 0.25)',

  success: '#5B9279',
  successLight: 'rgba(91, 146, 121, 0.2)',
  warning: '#D4A857',
  warningLight: 'rgba(212, 168, 87, 0.2)',
  error: '#C75D5D',
  errorLight: 'rgba(199, 93, 93, 0.2)',

  border: 'rgba(255, 255, 255, 0.08)',
  borderAccent: 'rgba(196, 201, 212, 0.25)',
  borderLight: 'rgba(255, 255, 255, 0.04)',

  glassBg: 'rgba(26, 29, 36, 0.9)',
  glassBlur: 'rgba(42, 46, 56, 0.7)',
  glassBorder: 'rgba(196, 201, 212, 0.15)',

  overlay: 'rgba(0, 0, 0, 0.6)',
  overlayLight: 'rgba(0, 0, 0, 0.4)',

  userMessage: '#2A2E38',
  aiMessage: 'rgba(36, 40, 48, 0.9)',

  gradientStart: '#2A3240',
  gradientEnd: '#1E2430',

  statusBarStyle: 'light',

  tabBarBg: 'rgba(26, 29, 36, 0.95)',
  tabBarActive: '#C4C9D4',
  tabBarInactive: '#6B6F78',

  shadowColor: '#000000',
  glowIntensity: 0.2,
  useGradients: true,
  shadowIntensity: 1.0,
  borderWeight: 'normal',
  cardRadius: 28,
  glassIntensity: 1.0,
  spacingScale: 1.0,
};

// The Botanist - Nature-inspired with sage and bronze
const botanistPalette: AtmospherePalette = {
  background: '#F4F5F0',
  backgroundSecondary: '#E9EBE3',
  cardBg: '#FAFBF8',

  textPrimary: '#2C3530',
  textSecondary: '#4A524C',
  textTertiary: '#7A857C',
  textInverse: '#FAFBF8',

  accent: '#A67C52', // Burnished bronze
  accentLight: '#B9926B',
  accentMuted: 'rgba(166, 124, 82, 0.15)',
  accentShimmer: 'rgba(166, 124, 82, 0.25)',

  success: '#5A7A5C',
  successLight: 'rgba(90, 122, 92, 0.15)',
  warning: '#A67C52',
  warningLight: 'rgba(166, 124, 82, 0.15)',
  error: '#8B5A5A',
  errorLight: 'rgba(139, 90, 90, 0.15)',

  border: 'rgba(44, 53, 48, 0.1)',
  borderAccent: 'rgba(166, 124, 82, 0.3)',
  borderLight: 'rgba(44, 53, 48, 0.05)',

  glassBg: 'rgba(244, 245, 240, 0.9)',
  glassBlur: 'rgba(250, 251, 248, 0.7)',
  glassBorder: 'rgba(166, 124, 82, 0.2)',

  overlay: 'rgba(44, 53, 48, 0.6)',
  overlayLight: 'rgba(44, 53, 48, 0.3)',

  userMessage: '#2C3530',
  aiMessage: 'rgba(244, 245, 240, 0.9)',

  gradientStart: '#5A7A5C', // Muted sage
  gradientEnd: '#4A6A4C',

  statusBarStyle: 'dark',

  tabBarBg: 'rgba(244, 245, 240, 0.95)',
  tabBarActive: '#A67C52',
  tabBarInactive: '#7A857C',

  shadowColor: '#2C3530',
  glowIntensity: 0.2,
  useGradients: true,
  shadowIntensity: 1.0,
  borderWeight: 'normal',
  cardRadius: 28,
  glassIntensity: 1.0,
  spacingScale: 1.0,
};

// Architect - Ultra-minimalist bone white with chrome
const architectPalette: AtmospherePalette = {
  background: '#FAFAF8',
  backgroundSecondary: '#F2F2F0',
  cardBg: '#FFFFFF',

  textPrimary: '#0A0A0A',
  textSecondary: '#2A2A2A',
  textTertiary: '#6A6A6A',
  textInverse: '#FFFFFF',

  accent: '#8A8A8A', // Chrome
  accentLight: '#A0A0A0',
  accentMuted: 'rgba(138, 138, 138, 0.12)',
  accentShimmer: 'rgba(138, 138, 138, 0.2)',

  success: '#4A4A4A',
  successLight: 'rgba(74, 74, 74, 0.1)',
  warning: '#6A6A6A',
  warningLight: 'rgba(106, 106, 106, 0.1)',
  error: '#5A3A3A',
  errorLight: 'rgba(90, 58, 58, 0.1)',

  border: 'rgba(10, 10, 10, 0.08)',
  borderAccent: 'rgba(10, 10, 10, 0.2)',
  borderLight: 'rgba(10, 10, 10, 0.04)',

  glassBg: 'rgba(250, 250, 248, 0.95)',
  glassBlur: 'rgba(255, 255, 255, 0.8)',
  glassBorder: 'rgba(10, 10, 10, 0.08)',

  overlay: 'rgba(10, 10, 10, 0.6)',
  overlayLight: 'rgba(10, 10, 10, 0.3)',

  userMessage: '#0A0A0A',
  aiMessage: 'rgba(250, 250, 248, 0.95)',

  gradientStart: '#2A2A2A',
  gradientEnd: '#1A1A1A',

  statusBarStyle: 'dark',

  tabBarBg: 'rgba(250, 250, 248, 0.98)',
  tabBarActive: '#0A0A0A',
  tabBarInactive: '#8A8A8A',

  shadowColor: '#0A0A0A',
  glowIntensity: 0.08,
  useGradients: true,
  shadowIntensity: 0.6,
  borderWeight: 'thin',
  cardRadius: 28,
  glassIntensity: 0.8,
  spacingScale: 1.0,
};

// Desert Solstice - Warm terracotta and sun-bleached clay
const desertSolsticePalette: AtmospherePalette = {
  background: '#F9F5F0',
  backgroundSecondary: '#F0EAE0',
  cardBg: '#FDFAF6',

  textPrimary: '#3A2E28',
  textSecondary: '#5A4A40',
  textTertiary: '#9A8A7A',
  textInverse: '#FDFAF6',

  accent: '#C67B5B', // Terracotta
  accentLight: '#D8947A',
  accentMuted: 'rgba(198, 123, 91, 0.15)',
  accentShimmer: 'rgba(198, 123, 91, 0.25)',

  success: '#7A8A5A',
  successLight: 'rgba(122, 138, 90, 0.15)',
  warning: '#C67B5B',
  warningLight: 'rgba(198, 123, 91, 0.15)',
  error: '#A05A4A',
  errorLight: 'rgba(160, 90, 74, 0.15)',

  border: 'rgba(58, 46, 40, 0.1)',
  borderAccent: 'rgba(198, 123, 91, 0.3)',
  borderLight: 'rgba(58, 46, 40, 0.05)',

  glassBg: 'rgba(249, 245, 240, 0.9)',
  glassBlur: 'rgba(253, 250, 246, 0.7)',
  glassBorder: 'rgba(198, 123, 91, 0.2)',

  overlay: 'rgba(58, 46, 40, 0.6)',
  overlayLight: 'rgba(58, 46, 40, 0.3)',

  userMessage: '#3A2E28',
  aiMessage: 'rgba(249, 245, 240, 0.9)',

  gradientStart: '#8A5A4A',
  gradientEnd: '#6A4A3A',

  statusBarStyle: 'dark',

  tabBarBg: 'rgba(249, 245, 240, 0.95)',
  tabBarActive: '#C67B5B',
  tabBarInactive: '#9A8A7A',

  shadowColor: '#3A2E28',
  glowIntensity: 0.22,
  useGradients: true,
  shadowIntensity: 1.0,
  borderWeight: 'normal',
  cardRadius: 28,
  glassIntensity: 1.0,
  spacingScale: 1.0,
};

// Paper - Pure white minimalism, like a premium notebook
const paperPalette: AtmospherePalette = {
  background: '#FFFFFF',
  backgroundSecondary: '#FAFAFA',
  cardBg: '#FFFFFF',

  textPrimary: '#2C2C2C',
  textSecondary: '#5A5A5A',
  textTertiary: '#999999',
  textInverse: '#FFFFFF',

  accent: '#2C2C2C',
  accentLight: '#5A5A5A',
  accentMuted: 'rgba(44, 44, 44, 0.08)',
  accentShimmer: 'rgba(44, 44, 44, 0.12)',

  success: '#4A7A5C',
  successLight: 'rgba(74, 122, 92, 0.08)',
  warning: '#B8860B',
  warningLight: 'rgba(184, 134, 11, 0.08)',
  error: '#C44D4D',
  errorLight: 'rgba(196, 77, 77, 0.08)',

  border: 'rgba(0, 0, 0, 0.06)',
  borderAccent: 'rgba(0, 0, 0, 0.12)',
  borderLight: 'rgba(0, 0, 0, 0.03)',

  glassBg: 'rgba(255, 255, 255, 0.95)',
  glassBlur: 'rgba(255, 255, 255, 0.9)',
  glassBorder: 'rgba(0, 0, 0, 0.04)',

  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.2)',

  userMessage: '#2C2C2C',
  aiMessage: 'rgba(250, 250, 250, 0.95)',

  gradientStart: '#2C2C2C',
  gradientEnd: '#3A3A3A',

  statusBarStyle: 'dark',

  tabBarBg: 'rgba(255, 255, 255, 0.98)',
  tabBarActive: '#2C2C2C',
  tabBarInactive: '#BBBBBB',

  shadowColor: '#000000',
  glowIntensity: 0.0,
  useGradients: false,
  shadowIntensity: 0.15,
  borderWeight: 'thin',
  cardRadius: 12,
  glassIntensity: 0.3,
  spacingScale: 1.1,
};

// Graphite - Monochrome dark mode, flat design
const graphitePalette: AtmospherePalette = {
  background: '#1A1A1A',
  backgroundSecondary: '#222222',
  cardBg: '#2A2A2A',

  textPrimary: '#E8E8E8',
  textSecondary: '#B0B0B0',
  textTertiary: '#707070',
  textInverse: '#1A1A1A',

  accent: '#E0E0E0',
  accentLight: '#F0F0F0',
  accentMuted: 'rgba(224, 224, 224, 0.1)',
  accentShimmer: 'rgba(224, 224, 224, 0.15)',

  success: '#6BBF6B',
  successLight: 'rgba(107, 191, 107, 0.12)',
  warning: '#D4A857',
  warningLight: 'rgba(212, 168, 87, 0.12)',
  error: '#E06060',
  errorLight: 'rgba(224, 96, 96, 0.12)',

  border: 'rgba(255, 255, 255, 0.06)',
  borderAccent: 'rgba(255, 255, 255, 0.15)',
  borderLight: 'rgba(255, 255, 255, 0.03)',

  glassBg: 'rgba(26, 26, 26, 0.95)',
  glassBlur: 'rgba(42, 42, 42, 0.8)',
  glassBorder: 'rgba(255, 255, 255, 0.06)',

  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.4)',

  userMessage: '#2A2A2A',
  aiMessage: 'rgba(34, 34, 34, 0.95)',

  gradientStart: '#333333',
  gradientEnd: '#2A2A2A',

  statusBarStyle: 'light',

  tabBarBg: 'rgba(26, 26, 26, 0.98)',
  tabBarActive: '#E0E0E0',
  tabBarInactive: '#555555',

  shadowColor: '#000000',
  glowIntensity: 0.0,
  useGradients: false,
  shadowIntensity: 0.1,
  borderWeight: 'thin',
  cardRadius: 8,
  glassIntensity: 0.2,
  spacingScale: 1.0,
};

// Sunset Cove - Warm coral and deep teal
const sunsetCovePalette: AtmospherePalette = {
  background: '#FFF8F5',
  backgroundSecondary: '#FFF0EB',
  cardBg: '#FFFAF8',

  textPrimary: '#1A3B3B',
  textSecondary: '#2D5454',
  textTertiary: '#8A9E9E',
  textInverse: '#FFFAF8',

  accent: '#FF6B4A',
  accentLight: '#FF8A70',
  accentMuted: 'rgba(255, 107, 74, 0.12)',
  accentShimmer: 'rgba(255, 107, 74, 0.25)',

  success: '#2A9D8F',
  successLight: 'rgba(42, 157, 143, 0.12)',
  warning: '#E9A84C',
  warningLight: 'rgba(233, 168, 76, 0.12)',
  error: '#D94040',
  errorLight: 'rgba(217, 64, 64, 0.12)',

  border: 'rgba(26, 59, 59, 0.08)',
  borderAccent: 'rgba(255, 107, 74, 0.3)',
  borderLight: 'rgba(26, 59, 59, 0.04)',

  glassBg: 'rgba(255, 248, 245, 0.9)',
  glassBlur: 'rgba(255, 250, 248, 0.7)',
  glassBorder: 'rgba(255, 107, 74, 0.15)',

  overlay: 'rgba(26, 59, 59, 0.6)',
  overlayLight: 'rgba(26, 59, 59, 0.3)',

  userMessage: '#1A3B3B',
  aiMessage: 'rgba(255, 248, 245, 0.9)',

  gradientStart: '#FF6B4A',
  gradientEnd: '#E85535',

  statusBarStyle: 'dark',

  tabBarBg: 'rgba(255, 248, 245, 0.95)',
  tabBarActive: '#FF6B4A',
  tabBarInactive: '#8A9E9E',

  shadowColor: '#1A3B3B',
  glowIntensity: 0.3,
  useGradients: true,
  shadowIntensity: 1.1,
  borderWeight: 'normal',
  cardRadius: 24,
  glassIntensity: 1.0,
  spacingScale: 1.0,
};

// Tropicana - Teal ocean and burnt orange
const tropicanaPalette: AtmospherePalette = {
  background: '#F0FAFA',
  backgroundSecondary: '#E0F4F4',
  cardBg: '#F8FDFD',

  textPrimary: '#1A2F2F',
  textSecondary: '#3A5252',
  textTertiary: '#7A9494',
  textInverse: '#F8FDFD',

  accent: '#2A9D8F',
  accentLight: '#4DB8AC',
  accentMuted: 'rgba(42, 157, 143, 0.12)',
  accentShimmer: 'rgba(42, 157, 143, 0.25)',

  success: '#2A9D8F',
  successLight: 'rgba(42, 157, 143, 0.12)',
  warning: '#E76F51',
  warningLight: 'rgba(231, 111, 81, 0.12)',
  error: '#C44040',
  errorLight: 'rgba(196, 64, 64, 0.12)',

  border: 'rgba(26, 47, 47, 0.08)',
  borderAccent: 'rgba(42, 157, 143, 0.3)',
  borderLight: 'rgba(26, 47, 47, 0.04)',

  glassBg: 'rgba(240, 250, 250, 0.9)',
  glassBlur: 'rgba(248, 253, 253, 0.7)',
  glassBorder: 'rgba(42, 157, 143, 0.15)',

  overlay: 'rgba(26, 47, 47, 0.6)',
  overlayLight: 'rgba(26, 47, 47, 0.3)',

  userMessage: '#1A2F2F',
  aiMessage: 'rgba(240, 250, 250, 0.9)',

  gradientStart: '#2A9D8F',
  gradientEnd: '#1E8578',

  statusBarStyle: 'dark',

  tabBarBg: 'rgba(240, 250, 250, 0.95)',
  tabBarActive: '#2A9D8F',
  tabBarInactive: '#7A9494',

  shadowColor: '#1A2F2F',
  glowIntensity: 0.3,
  useGradients: true,
  shadowIntensity: 1.1,
  borderWeight: 'normal',
  cardRadius: 24,
  glassIntensity: 1.0,
  spacingScale: 1.0,
};

// All atmospheres
export const ATMOSPHERES: Atmosphere[] = [
  {
    id: 'original',
    name: 'The Original',
    description: 'Warm oatmeal and gold - our signature aesthetic',
    isPremium: false,
    palette: originalPalette,
  },
  {
    id: 'midnight-gallery',
    name: 'Midnight Gallery',
    description: 'Deep slate and champagne silver - sophisticated dark mode',
    isPremium: true,
    palette: midnightGalleryPalette,
  },
  {
    id: 'botanist',
    name: 'The Botanist',
    description: 'Muted sage and burnished bronze - nature-inspired serenity',
    isPremium: true,
    palette: botanistPalette,
  },
  {
    id: 'architect',
    name: 'Architect',
    description: 'Bone white and chrome - ultra-minimalist precision',
    isPremium: false,
    palette: architectPalette,
  },
  {
    id: 'desert-solstice',
    name: 'Desert Solstice',
    description: 'Warm terracotta and sun-bleached clay - earthy warmth',
    isPremium: true,
    palette: desertSolsticePalette,
  },
  {
    id: 'paper',
    name: 'Paper',
    description: 'Pure white minimalism - like a premium notebook',
    isPremium: false,
    palette: paperPalette,
  },
  {
    id: 'graphite',
    name: 'Graphite',
    description: 'Monochrome dark mode - crisp contrast, zero distractions',
    isPremium: false,
    palette: graphitePalette,
  },
  {
    id: 'sunset-cove',
    name: 'Sunset Cove',
    description: 'Warm coral and deep teal - tropical warmth at golden hour',
    isPremium: false,
    palette: sunsetCovePalette,
  },
  {
    id: 'tropicana',
    name: 'Tropicana',
    description: 'Teal ocean and burnt orange - bold tropical energy',
    isPremium: false,
    palette: tropicanaPalette,
  },
];

// Helper to get atmosphere by id
export function getAtmosphere(id: AtmosphereId): Atmosphere {
  return ATMOSPHERES.find(a => a.id === id) || ATMOSPHERES[0];
}

// AsyncStorage key for theme
const THEME_STORAGE_KEY = 'coachgenie_atmosphere';

// Context type
interface ThemeContextType {
  atmosphere: Atmosphere;
  palette: AtmospherePalette;
  setAtmosphere: (id: AtmosphereId) => Promise<void>;
  isTransitioning: boolean;
  isSovereignMember: boolean;
  setSovereignMember: (value: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Provider props
interface ThemeProviderProps {
  children: ReactNode;
  initialAtmosphere?: AtmosphereId;
}

export function ThemeProvider({ children, initialAtmosphere = 'original' }: ThemeProviderProps) {
  const [currentAtmosphere, setCurrentAtmosphere] = useState<Atmosphere>(getAtmosphere(initialAtmosphere));
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isSovereignMember, setIsSovereignMember] = useState(false);
  const fadeOpacity = useSharedValue(1);

  const loadSavedTheme = useCallback(async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme && ATMOSPHERES.find(a => a.id === savedTheme)) {
        const atmosphere = getAtmosphere(savedTheme as AtmosphereId);
        // Only apply premium themes if user is sovereign
        if (atmosphere.isPremium && !isSovereignMember) {
          setCurrentAtmosphere(getAtmosphere('original'));
        } else {
          setCurrentAtmosphere(atmosphere);
        }
      }
    } catch (error) {
      console.error('Error loading saved theme:', error);
    }
  }, [isSovereignMember]);

  // Check RevenueCat entitlement and listen for updates
  useEffect(() => {
    checkSovereignEntitlement().then(setIsSovereignMember);
    const unsubscribe = addCustomerInfoUpdateListener((info) => {
      setIsSovereignMember(hasSovereignEntitlement(info));
    });
    return unsubscribe;
  }, []);

  // Load saved theme on mount
  useEffect(() => {
    loadSavedTheme();
  }, [loadSavedTheme]);

  // Save theme to storage and database
  const saveTheme = async (id: AtmosphereId) => {
    try {
      // Save to AsyncStorage
      await AsyncStorage.setItem(THEME_STORAGE_KEY, id);

      // Also save to Supabase if configured
      if (isSupabaseConfigured) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.auth.updateUser({
            data: { preferred_atmosphere: id }
          });
        }
      }
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const setAtmosphere = useCallback(async (id: AtmosphereId) => {
    const newAtmosphere = getAtmosphere(id);

    // Check premium access
    if (newAtmosphere.isPremium && !isSovereignMember) {
      // Don't change - premium required
      return;
    }

    setIsTransitioning(true);

    // Fade out
    fadeOpacity.value = withTiming(0, { duration: 250 }, () => {
      // Switch theme
      runOnJS(setCurrentAtmosphere)(newAtmosphere);
      runOnJS(saveTheme)(id);

      // Fade in
      fadeOpacity.value = withTiming(1, { duration: 250 }, () => {
        runOnJS(setIsTransitioning)(false);
      });
    });
  }, [isSovereignMember, fadeOpacity]);

  const value = useMemo(() => ({
    atmosphere: currentAtmosphere,
    palette: currentAtmosphere.palette,
    setAtmosphere,
    isTransitioning,
    isSovereignMember,
    setSovereignMember: setIsSovereignMember,
  }), [currentAtmosphere, setAtmosphere, isTransitioning, isSovereignMember]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeOpacity.value,
  }));

  return (
    <ThemeContext.Provider value={value}>
      <Animated.View style={[{ flex: 1 }, animatedStyle]}>
        {children}
      </Animated.View>
    </ThemeContext.Provider>
  );
}

// Hook to use theme
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Hook that safely returns theme or defaults (for components that might render outside provider)
export function useThemeSafe() {
  const context = useContext(ThemeContext);
  if (!context) {
    // Return default theme
    return {
      atmosphere: ATMOSPHERES[0],
      palette: originalPalette,
      setAtmosphere: async () => {},
      isTransitioning: false,
      isSovereignMember: false,
      setSovereignMember: () => {},
    };
  }
  return context;
}

export default ThemeContext;
