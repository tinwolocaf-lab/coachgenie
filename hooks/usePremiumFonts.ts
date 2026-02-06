// Premium Rebirth Font Loading Hook
import { useFonts } from 'expo-font';

// Import Playfair Display - Luxury editorial serif
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_400Regular_Italic,
  PlayfairDisplay_500Medium,
  PlayfairDisplay_500Medium_Italic,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_700Bold_Italic,
} from '@expo-google-fonts/playfair-display';

// Import Inter - Clean, spacious sans-serif
import {
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

export function usePremiumFonts() {
  const [fontsLoaded, fontError] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_400Regular_Italic,
    PlayfairDisplay_500Medium,
    PlayfairDisplay_500Medium_Italic,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_700Bold_Italic,
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  return { fontsLoaded, fontError };
}

// Helper to get the font family with fallback
export function getSerifFont(loaded: boolean): string {
  return loaded ? 'PlayfairDisplay_700Bold' : 'Georgia';
}

export function getSerifRegularFont(loaded: boolean): string {
  return loaded ? 'PlayfairDisplay_400Regular' : 'Georgia';
}

export function getSerifItalicFont(loaded: boolean): string {
  return loaded ? 'PlayfairDisplay_400Regular_Italic' : 'Georgia';
}

export function getSansFont(loaded: boolean): string {
  return loaded ? 'Inter_400Regular' : 'System';
}

export function getSansMediumFont(loaded: boolean): string {
  return loaded ? 'Inter_500Medium' : 'System';
}

export function getSansSemiboldFont(loaded: boolean): string {
  return loaded ? 'Inter_600SemiBold' : 'System';
}

export function getSansLightFont(loaded: boolean): string {
  return loaded ? 'Inter_300Light' : 'System';
}
