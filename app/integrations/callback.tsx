import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { exchangeToken } from '@/lib/integrations/api';
import type { IntegrationProvider } from '@/types';

export default function IntegrationCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string; provider?: string; error?: string }>();
  const { palette } = useThemeSafe();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    if (params.error) {
      setStatus('error');
      setErrorMessage(params.error);
      redirectBack();
      return;
    }

    const { code, provider } = params;
    if (!code || !provider) {
      setStatus('error');
      setErrorMessage('Missing authorization code or provider');
      redirectBack();
      return;
    }

    try {
      const redirectUri = 'coachgenie://integrations/callback';
      await exchangeToken(provider as IntegrationProvider, code, redirectUri);
      setStatus('success');
    } catch (error) {
      console.error('[IntegrationCallback] Error:', error);
      setStatus('error');
      setErrorMessage((error as Error).message || 'Token exchange failed');
    }

    redirectBack();
  };

  const redirectBack = () => {
    setTimeout(() => {
      router.replace('/integrations');
    }, 1500);
  };

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
