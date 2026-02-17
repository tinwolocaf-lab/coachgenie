import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { exchangeToken } from '@/lib/integrations/api';
import { REDIRECT_URI, isIntegrationProvider, validatePendingOAuthFlow } from '@/lib/integrations/oauth-service';

export default function IntegrationCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string; provider?: string; state?: string; error?: string }>();
  const { code, provider, state, error } = params;
  const { palette } = useThemeSafe();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState('');

  const redirectBack = useCallback(() => {
    setTimeout(() => {
      router.replace('/integrations');
    }, 1500);
  }, [router]);

  const handleCallback = useCallback(async () => {
    if (error) {
      setStatus('error');
      setErrorMessage(error);
      redirectBack();
      return;
    }

    if (!code || !provider) {
      setStatus('error');
      setErrorMessage('Missing authorization code or provider');
      redirectBack();
      return;
    }

    if (!isIntegrationProvider(provider)) {
      setStatus('error');
      setErrorMessage('Invalid integration provider');
      redirectBack();
      return;
    }

    try {
      const isValidState = await validatePendingOAuthFlow(provider, state, REDIRECT_URI);
      if (!isValidState) {
        throw new Error('Invalid or expired OAuth callback state');
      }

      await exchangeToken(provider, code, REDIRECT_URI);
      setStatus('success');
    } catch (error) {
      console.error('[IntegrationCallback] Error:', error);
      setStatus('error');
      setErrorMessage((error as Error).message || 'Token exchange failed');
    }

    redirectBack();
  }, [code, error, provider, redirectBack, state]);

  useEffect(() => {
    void handleCallback();
  }, [handleCallback]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]}>
      <View style={styles.content}>
        {status === 'processing' && (
          <>
            <ActivityIndicator size="large" color={palette.accent} />
            <Text style={[styles.text, { color: palette.textPrimary }]}>Connecting...</Text>
          </>
        )}
        {status === 'success' && (
          <>
            <Ionicons name="checkmark-circle" size={48} color={palette.success} />
            <Text style={[styles.text, { color: palette.textPrimary }]}>Connected!</Text>
          </>
        )}
        {status === 'error' && (
          <>
            <Ionicons name="close-circle" size={48} color={palette.error} />
            <Text style={[styles.text, { color: palette.textPrimary }]}>Connection Failed</Text>
            {errorMessage ? (
              <Text style={[styles.subtext, { color: palette.textTertiary }]}>{errorMessage}</Text>
            ) : null}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
  },
  text: {
    fontSize: Typography.sizes.title,
    fontFamily: Typography.fonts.serif,
    fontWeight: Typography.weights.bold,
  },
  subtext: {
    fontSize: Typography.sizes.body,
    textAlign: 'center',
  },
});
