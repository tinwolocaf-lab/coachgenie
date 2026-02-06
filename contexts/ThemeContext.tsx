import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import Animated, {
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

// Theme IDs
export type AtmosphereId = 'original' | 'midnight-gallery' | 'botanist' | 'architect' | 'desert-solstice';

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
  background: '#F7F4EE',
  backgroundSecondary: '#EDE6D9',
  cardBg: '#FFFEFC',

  textPrimary: '#122821',
  textSecondary: '#22201C',
  textTertiary: '#777067',
  textInverse: '#FFFFFF',

  accent: '#B7883A',
  accentLight: '#CEA35F',
  accentMuted: 'rgba(183, 136, 58, 0.14)',
  accentShimmer: 'rgba(183, 136, 58, 0.26)',

  success: '#2E7B5A',
  successLight: 'rgba(46, 123, 90, 0.14)',
  warning: '#A9791D',
  warningLight: 'rgba(169, 121, 29, 0.14)',
  error: '#A14A45',
  errorLight: 'rgba(161, 74, 69, 0.14)',

  border: 'rgba(34, 32, 28, 0.12)',
  borderAccent: 'rgba(183, 136, 58, 0.32)',
  borderLight: 'rgba(34, 32, 28, 0.06)',

  glassBg: 'rgba(251, 248, 242, 0.82)',
  glassBlur: 'rgba(255, 255, 255, 0.58)',
  glassBorder: 'rgba(183, 136, 58, 0.18)',

  overlay: 'rgba(18, 40, 33, 0.62)',
  overlayLight: 'rgba(18, 40, 33, 0.36)',

  userMessage: '#122821',
  aiMessage: 'rgba(255, 254, 252, 0.94)',

  gradientStart: '#122821',
  gradientEnd: '#1E3A31',

  statusBarStyle: 'dark',

  tabBarBg: 'rgba(247, 244, 238, 0.92)',
  tabBarActive: '#B7883A',
  tabBarInactive: '#777067',

  shadowColor: '#122821',
  glowIntensity: 0.22,
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
