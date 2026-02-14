import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { useAuthSafe } from '@/hooks/useConditionalAuth';
import { useAlert } from '@/contexts/AlertContext';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { resolveApproval } from '@/lib/apiClient';

interface ApprovalItem {
  id: string;
  tool_name: string;
  action_summary: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  expires_at: string | null;
  created_at: string;
}

const TOOL_ICONS: Record<string, string> = {
  create_calendar_event: 'calendar-outline',
  send_notification: 'notifications-outline',
  create_reminder: 'alarm-outline',
  update_goal: 'flag-outline',
  share_insight: 'share-outline',
  create_commitment: 'checkmark-circle-outline',
};

export default function ApprovalsScreen() {
  const router = useRouter();
  const { palette } = useThemeSafe();
  const auth = useAuthSafe();
  const { showToast } = useAlert();
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadApprovals = useCallback(async () => {
    if (!isSupabaseConfigured || !auth?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('approval_requests')
        .select('id, tool_name, action_summary, payload, status, expires_at, created_at')
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setApprovals(data as ApprovalItem[]);
      }
    } catch (err) {
      console.error('[Approvals] Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [auth?.user?.id]);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  const handleDecision = async (approvalId: string, decision: 'approve' | 'reject') => {
    setProcessingId(approvalId);
    try {
      await resolveApproval(approvalId, decision);
      Haptics.notificationAsync(
        decision === 'approve'
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning
      );
      showToast(
        decision === 'approve' ? 'Approved' : 'Rejected',
        { variant: decision === 'approve' ? 'success' : 'info' }
      );
      setApprovals((prev) =>
        prev.map((a) => (a.id === approvalId ? { ...a, status: decision === 'approve' ? 'approved' : 'rejected' } : a))
      );
    } catch (err) {
      console.error('[Approvals] Decision error:', err);
      showToast('Failed to process', { variant: 'error' });
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = approvals.filter((a) => a.status === 'pending').length;

  const isExpired = (item: ApprovalItem): boolean => {
    if (!item.expires_at) return false;
    return new Date(item.expires_at) < new Date();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <Animated.View entering={FadeInUp.duration(500)} style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: palette.cardBg }]}
        >
          <Ionicons name="arrow-back" size={22} color={palette.textSecondary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Approvals</Text>
          {pendingCount > 0 && (
            <View style={[styles.badge, { backgroundColor: palette.accent }]}>
              <Text style={styles.badgeText}>{pendingCount}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerSpacer} />
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadApprovals(); }} tintColor={palette.accent} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={palette.accent} />
          </View>
        ) : approvals.length === 0 ? (
          <Animated.View entering={FadeInUp.duration(500)} style={styles.emptyState}>
            <Ionicons name="shield-checkmark-outline" size={48} color={palette.textTertiary} />
            <Text style={[styles.emptyTitle, { color: palette.textSecondary }]}>
              No pending approvals
            </Text>
            <Text style={[styles.emptySubtitle, { color: palette.textTertiary }]}>
              When your coach suggests actions that need your confirmation, they will appear here.
            </Text>
          </Animated.View>
        ) : (
          approvals.map((item, index) => {
            const expired = item.status === 'pending' && isExpired(item);
            const isPending = item.status === 'pending' && !expired;

            return (
              <Animated.View key={item.id} entering={FadeInUp.duration(400).delay(index * 50)}>
                <View
                  style={[
                    styles.approvalCard,
                    { backgroundColor: palette.cardBg },
                    isPending && { borderLeftColor: palette.accent, borderLeftWidth: 3 },
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View style={[styles.toolIcon, { backgroundColor: `${palette.accent}15` }]}>
                      <Ionicons
                        name={(TOOL_ICONS[item.tool_name] ?? 'construct-outline') as any}
                        size={18}
                        color={palette.accent}
                      />
                    </View>
                    <View style={styles.cardHeaderText}>
                      <Text style={[styles.toolName, { color: palette.textPrimary }]}>
                        {item.tool_name.replace(/_/g, ' ')}
                      </Text>
                      <Text style={[styles.cardTime, { color: palette.textTertiary }]}>
                        {formatTimeAgo(item.created_at)}
                      </Text>
                    </View>
                    <StatusBadge status={expired ? 'expired' : item.status} palette={palette} />
                  </View>

                  <Text style={[styles.actionSummary, { color: palette.textSecondary }]}>
                    {item.action_summary}
                  </Text>

                  {isPending && (
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        onPress={() => handleDecision(item.id, 'reject')}
                        style={[styles.rejectButton, { borderColor: palette.textTertiary }]}
                        disabled={processingId === item.id}
                      >
                        <Ionicons name="close" size={16} color={palette.textSecondary} />
                        <Text style={[styles.buttonText, { color: palette.textSecondary }]}>Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDecision(item.id, 'approve')}
                        style={[styles.approveButton, { backgroundColor: palette.accent }]}
                        disabled={processingId === item.id}
                      >
                        {processingId === item.id ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="checkmark" size={16} color="#fff" />
                            <Text style={[styles.buttonText, { color: '#fff' }]}>Approve</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </Animated.View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusBadge({ status, palette }: { status: string; palette: any }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: `${palette.accent}20`, text: palette.accent, label: 'Pending' },
    approved: { bg: 'rgba(61, 122, 92, 0.12)', text: '#3D7A5C', label: 'Approved' },
    rejected: { bg: 'rgba(155, 77, 77, 0.12)', text: '#9B4D4D', label: 'Rejected' },
    expired: { bg: 'rgba(138, 133, 126, 0.12)', text: '#8A857E', label: 'Expired' },
  };
  const c = config[status] ?? config.pending;

  return (
    <View style={[styles.statusBadge, { backgroundColor: c.bg }]}>
      <Text style={[styles.statusText, { color: c.text }]}>{c.label}</Text>
    </View>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.subtle,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.bold as any,
    fontFamily: Typography.fonts.serif,
  },
  headerSpacer: { width: 44 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  loadingContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold as any,
    fontFamily: Typography.fonts.serif,
  },
  emptySubtitle: {
    fontSize: Typography.sizes.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  approvalCard: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
    ...Shadows.subtle,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  toolIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  toolName: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold as any,
    textTransform: 'capitalize',
  },
  cardTime: {
    fontSize: 11,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionSummary: {
    fontSize: Typography.sizes.body,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  approveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
  },
  buttonText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold as any,
  },
});
