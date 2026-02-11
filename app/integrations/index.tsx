import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Typography, Spacing, EditorialSpacing } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { IntegrationCard } from '@/components/settings/IntegrationCard';
import { listIntegrations, syncIntegration, disconnectIntegration } from '@/lib/integrations/api';
import { startOAuthFlow } from '@/lib/integrations/oauth-service';
import type { IntegrationProvider, UserIntegration, IntegrationProviderConfig } from '@/types';

const INTEGRATION_CONFIGS: IntegrationProviderConfig[] = [
  {
    provider: 'google_calendar',
    name: 'Google Calendar',
    icon: 'calendar-outline',
    description: 'Sync your schedule for context-aware coaching',
    scopes: ['calendar.readonly'],
  },
  {
    provider: 'notion',
    name: 'Notion',
    icon: 'document-text-outline',
    description: 'Connect notes and tasks for deeper insights',
    scopes: [],
  },
  {
    provider: 'github',
    name: 'GitHub',
    icon: 'logo-github',
    description: 'Track development patterns and productivity',
    scopes: ['read:user', 'repo:status'],
  },
  {
    provider: 'todoist',
    name: 'Todoist',
    icon: 'checkmark-circle-outline',
    description: 'Sync tasks for productivity coaching',
    scopes: ['data:read'],
  },
  {
    provider: 'linear',
    name: 'Linear',
    icon: 'git-branch-outline',
    description: 'Track project progress and workflows',
    scopes: ['read'],
  },
];

export default function IntegrationsScreen() {
  const router = useRouter();
  const { palette, subscriptionTier } = useThemeSafe();
  const [integrations, setIntegrations] = useState<UserIntegration[]>([]);
  const [loadingProviders, setLoadingProviders] = useState<Set<IntegrationProvider>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  const fetchIntegrations = useCallback(async () => {
    try {
      const data = await listIntegrations();
      setIntegrations(data);
    } catch (error) {
      console.error('[Integrations] Error fetching:', error);
    }
  }, []);

  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchIntegrations();
    setRefreshing(false);
  }, [fetchIntegrations]);

  const getIntegrationStatus = (provider: IntegrationProvider) => {
    const integration = integrations.find((i) => i.provider === provider);
    return integration?.status ?? null;
  };

  const getLastSyncedAt = (provider: IntegrationProvider) => {
    const integration = integrations.find((i) => i.provider === provider);
    return integration?.last_synced_at;
  };

  const handleConnect = async (provider: IntegrationProvider) => {
    if (subscriptionTier === 'free') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      router.push('/paywall');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoadingProviders((prev) => new Set(prev).add(provider));

    try {
      const success = await startOAuthFlow(provider);
      if (success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await fetchIntegrations();
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch (error) {
      console.error(`[Integrations] Connect error for ${provider}:`, error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Connection Failed', `Could not connect to ${provider}. Please try again.`);
    } finally {
      setLoadingProviders((prev) => {
        const next = new Set(prev);
        next.delete(provider);
        return next;
      });
    }
  };

  const handleDisconnect = (provider: IntegrationProvider, name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      `Disconnect ${name}?`,
      'Your synced data will be removed. You can reconnect at any time.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            setLoadingProviders((prev) => new Set(prev).add(provider));
            try {
              await disconnectIntegration(provider);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await fetchIntegrations();
            } catch (error) {
              console.error(`[Integrations] Disconnect error:`, error);
              Alert.alert('Error', 'Failed to disconnect. Please try again.');
            } finally {
              setLoadingProviders((prev) => {
                const next = new Set(prev);
                next.delete(provider);
                return next;
              });
            }
          },
        },
      ]
    );
  };

  const handleSync = async (provider: IntegrationProvider) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLoadingProviders((prev) => new Set(prev).add(provider));
    try {
      await syncIntegration(provider);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await fetchIntegrations();
    } catch (error) {
      console.error(`[Integrations] Sync error:`, error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Sync Failed', 'Could not sync data. Please try again.');
    } finally {
      setLoadingProviders((prev) => {
        const next = new Set(prev);
        next.delete(provider);
        return next;
      });
    }
  };

  const connectedCount = integrations.filter((i) => i.status === 'active').length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent} />
        }
      >
        {/* Header */}
        <Animated.View entering={FadeInUp.duration(500)} style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={[styles.backButton, { backgroundColor: palette.cardBg }]}
          >
            <Ionicons name="arrow-back" size={22} color={palette.textSecondary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Connections</Text>
          <View style={styles.headerSpacer} />
        </Animated.View>

        {/* Summary */}
        <Animated.View entering={FadeIn.duration(600).delay(100)} style={styles.summaryContainer}>
          <Text style={[styles.summaryText, { color: palette.textTertiary }]}>
            {connectedCount === 0
              ? 'Connect your tools to enrich your coaching experience'
              : `${connectedCount} connection${connectedCount > 1 ? 's' : ''} active`}
          </Text>
        </Animated.View>

        {/* Integration Cards */}
        <View style={styles.cardsContainer}>
          {INTEGRATION_CONFIGS.map((config, index) => (
            <Animated.View key={config.provider} entering={FadeInUp.duration(400).delay(150 + index * 80)}>
              <IntegrationCard
                provider={config.provider}
                name={config.name}
                description={config.description}
                icon={config.icon as keyof typeof Ionicons.glyphMap}
                status={getIntegrationStatus(config.provider)}
                lastSyncedAt={getLastSyncedAt(config.provider)}
                isLoading={loadingProviders.has(config.provider)}
                onConnect={() => handleConnect(config.provider)}
                onDisconnect={() => handleDisconnect(config.provider, config.name)}
                onSync={() => handleSync(config.provider)}
              />
            </Animated.View>
          ))}
        </View>

        {/* Info Footer */}
        <Animated.View entering={FadeIn.duration(400).delay(600)} style={styles.footer}>
          <Ionicons name="shield-checkmark-outline" size={16} color={palette.textTertiary} />
          <Text style={[styles.footerText, { color: palette.textTertiary }]}>
            Your data is encrypted and only used to personalize your coaching experience.
          </Text>
        </Animated.View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: Spacing.md,
    paddingBottom: Spacing.section,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xxl,
    paddingHorizontal: Spacing.xxl,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.bold,
    fontFamily: Typography.fonts.serif,
    letterSpacing: Typography.letterSpacing.editorial,
  },
  headerSpacer: {
    width: 44,
  },
  summaryContainer: {
    paddingHorizontal: EditorialSpacing.breathingMargin,
    marginBottom: Spacing.xxl,
  },
  summaryText: {
    fontSize: Typography.sizes.body,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },
  cardsContainer: {
    paddingHorizontal: EditorialSpacing.breathingMargin,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: EditorialSpacing.breathingMargin,
    marginTop: Spacing.xxl,
    gap: Spacing.sm,
  },
  footerText: {
    flex: 1,
    fontSize: Typography.sizes.caption,
    lineHeight: Typography.sizes.caption * Typography.lineHeights.relaxed,
  },
  bottomSpacer: {
    height: 40,
  },
});
