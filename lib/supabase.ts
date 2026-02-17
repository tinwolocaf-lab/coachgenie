// Supabase client configuration
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import { authSessionStorage } from '@/lib/authStorage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const allowGuestModeFromEnv = (process.env.EXPO_PUBLIC_ALLOW_GUEST_MODE ?? '').toLowerCase() === 'true';

function isValidHttpUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'https:') {
      return true;
    }
    return __DEV__ && parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

const hasValidSupabaseUrl = isValidHttpUrl(supabaseUrl);
const resolvedSupabaseUrl = hasValidSupabaseUrl ? supabaseUrl : undefined;

// Check if Supabase is configured
export const isSupabaseConfigured = !!(resolvedSupabaseUrl && supabaseAnonKey);
export const isGuestModeEnabled = !isSupabaseConfigured && allowGuestModeFromEnv;
export const isAuthMisconfigured = !isSupabaseConfigured && !isGuestModeEnabled;

// Create Supabase client (with fallback for unconfigured state)
export const supabase = createClient<Database>(
  resolvedSupabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      storage: authSessionStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  }
);
