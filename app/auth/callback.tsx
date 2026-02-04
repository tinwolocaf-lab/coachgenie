// Web OAuth callback page - required for OAuth on web platform
import { useRouter } from 'expo-router';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing } from '@/constants/theme';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

// Conditionally import AuthCallbackPage
let AuthCallbackPage: React.ComponentType<{
  supabaseClient: typeof supabase;
  onSuccess: () => void;
  onError: (error: { message: string }) => void;
  loadingText?: string;
}> | null = null;

try {
  if (isSupabaseConfigured) {
    const authModule = require('@fastshot/auth');
    AuthCallbackPage = authModule.AuthCallbackPage;
  }
} catch {
  // Auth not available
}

export default function Callback() {
  const router = useRouter();

  // If Supabase is not configured, just redirect
  if (!isSupabaseConfigured || !AuthCallbackPage) {
    router.replace('/(tabs)');
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.electricIndigo} />
        <Text style={styles.text}>Redirecting...</Text>
      </View>
    );
  }

  return (
    <AuthCallbackPage
      supabaseClient={supabase}
      onSuccess={() => router.replace('/(tabs)')}
      onError={(error) =>
        router.replace(`/(auth)/login?error=${encodeURIComponent(error.message)}`)
      }
      loadingText="Completing sign in..."
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.offWhite,
  },
  text: {
    marginTop: Spacing.lg,
    fontSize: Typography.sizes.body,
    color: Colors.slateGray,
  },
});
