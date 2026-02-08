import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import type { IntegrationProvider, IntegrationStatus } from '@/types';

interface IntegrationCardProps {
  provider: IntegrationProvider;
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  status: IntegrationStatus | null;
  lastSyncedAt?: string;
  isLoading?: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onSync?: () => void;
}

const STATUS_LABELS: Record<IntegrationStatus, string> = {
  active: 'Connected',
  expired: 'Token Expired',
  revoked: 'Access Revoked',
  error: 'Error',
};

export function IntegrationCard({
  name,
  description,
  icon,
  status,
  lastSyncedAt,
  isLoading,
  onConnect,
  onDisconnect,
  onSync,
}: IntegrationCardProps) {
  const { palette } = useThemeSafe();
  const isConnected = status === 'active';
  const hasIssue = status === 'expired' || status === 'revoked' || status === 'error';

  const statusColor = isConnected
    ? palette.success
    : hasIssue
    ? palette.error
    : palette.textTertiary;

  const formatLastSync = (dateStr?: string) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <View style={[styles.card, { backgroundColor: palette.cardBg }]}>
      <View style={styles.row}>
        <View style={[styles.iconContainer, { backgroundColor: palette.accentMuted }]}>
          <Ionicons name={icon} size={24} color={palette.accent} />
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: palette.textPrimary }]}>{name}</Text>
          {status ? (
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {STATUS_LABELS[status]}
              </Text>
              {lastSyncedAt && isConnected && (
                <Text style={[styles.syncText, { color: palette.textTertiary }]}>
                  {' · Synced ' + formatLastSync(lastSyncedAt)}
                </Text>
              )}
            </View>
          ) : (
            <Text style={[styles.description, { color: palette.textTertiary }]}>{description}</Text>
          )}
        </View>
        {isLoading ? (
          <ActivityIndicator size="small" color={palette.accent} />
        ) : isConnected ? (
          <View style={styles.actions}>
            {onSync && (
              <TouchableOpacity
                onPress={onSync}
                style={[styles.actionButton, { backgroundColor: palette.accentMuted }]}
              >
                <Ionicons name="sync-outline" size={18} color={palette.accent} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={onDisconnect}
              style={[styles.actionButton, { backgroundColor: palette.errorLight }]}
            >
              <Ionicons name="close" size={18} color={palette.error} />
            </TouchableOpacity>
          </View>
        ) : hasIssue ? (
          <TouchableOpacity
            onPress={onConnect}
            style={[styles.reconnectButton, { backgroundColor: palette.warningLight }]}
          >
            <Text style={[styles.reconnectText, { color: palette.warning }]}>Reconnect</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={onConnect}
            style={[styles.connectButton, { backgroundColor: palette.accent }]}
          >
            <Text style={[styles.connectText, { color: palette.textInverse }]}>Connect</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    marginBottom: 2,
  },
  description: {
    fontSize: Typography.sizes.caption,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Spacing.xs,
  },
  statusText: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.medium,
  },
  syncText: {
    fontSize: Typography.sizes.caption,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
  },
  connectText: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
  },
  reconnectButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
  },
  reconnectText: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
  },
});
