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
import { Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { useAuthSafe } from '@/hooks/useConditionalAuth';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

interface NudgeItem {
  id: string;
  nudge_type: string;
  title: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

const NUDGE_TYPE_ICONS: Record<string, string> = {
  alignment: 'compass-outline',
  encouragement: 'heart-outline',
  reflection: 'bulb-outline',
  milestone: 'trophy-outline',
  anti_dependence: 'leaf-outline',
};

const NUDGE_TYPE_LABELS: Record<string, string> = {
  alignment: 'Alignment',
  encouragement: 'Encouragement',
  reflection: 'Reflection',
  milestone: 'Milestone',
  anti_dependence: 'Wellness',
};

export default function CoachInboxScreen() {
  const router = useRouter();
  const { palette } = useThemeSafe();
  const auth = useAuthSafe();
  const [nudges, setNudges] = useState<NudgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNudges = useCallback(async () => {
    if (!isSupabaseConfigured || !auth?.user?.id) return;

    try {
      const { data, error } = await supabase
        .from('editorial_nudges')
        .select('id, nudge_type, title, content, is_read, created_at')
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setNudges(data as NudgeItem[]);
      }
    } catch (err) {
      console.error('[CoachInbox] Error loading nudges:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [auth?.user?.id]);

  useEffect(() => {
    loadNudges();
  }, [loadNudges]);

  const markAsRead = async (nudgeId: string) => {
    if (!isSupabaseConfigured) return;

    await supabase
      .from('editorial_nudges')
      .update({ is_read: true })
      .eq('id', nudgeId);

    setNudges((prev) => prev.map((n) => (n.id === nudgeId ? { ...n, is_read: true } : n)));
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNudges();
  };

  const unreadCount = nudges.filter((n) => !n.is_read).length;

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
          <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Coach Inbox</Text>
          {unreadCount > 0 && (
            <View style={[styles.badge, { backgroundColor: palette.accent }]}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerSpacer} />
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={palette.accent} />
          </View>
        ) : nudges.length === 0 ? (
          <Animated.View entering={FadeInUp.duration(500)} style={styles.emptyState}>
            <Ionicons name="mail-open-outline" size={48} color={palette.textTertiary} />
            <Text style={[styles.emptyTitle, { color: palette.textSecondary }]}>
              No messages yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: palette.textTertiary }]}>
              Your coach will send proactive nudges based on your goals and patterns.
            </Text>
          </Animated.View>
        ) : (
          nudges.map((nudge, index) => (
            <Animated.View
              key={nudge.id}
              entering={FadeInUp.duration(400).delay(index * 50)}
            >
              <TouchableOpacity
                onPress={() => markAsRead(nudge.id)}
                style={[
                  styles.nudgeCard,
                  { backgroundColor: palette.cardBg },
                  !nudge.is_read && { borderLeftColor: palette.accent, borderLeftWidth: 3 },
                ]}
                activeOpacity={0.7}
              >
                <View style={styles.nudgeHeader}>
                  <View style={[styles.nudgeIcon, { backgroundColor: `${palette.accent}15` }]}>
                    <Ionicons
                      name={(NUDGE_TYPE_ICONS[nudge.nudge_type] ?? 'chatbubble-outline') as any}
                      size={18}
                      color={palette.accent}
                    />
                  </View>
                  <View style={styles.nudgeHeaderText}>
                    <Text style={[styles.nudgeType, { color: palette.accent }]}>
                      {NUDGE_TYPE_LABELS[nudge.nudge_type] ?? nudge.nudge_type}
                    </Text>
                    <Text style={[styles.nudgeTime, { color: palette.textTertiary }]}>
                      {formatTimeAgo(nudge.created_at)}
                    </Text>
                  </View>
                  {!nudge.is_read && (
                    <View style={[styles.unreadDot, { backgroundColor: palette.accent }]} />
                  )}
                </View>
                <Text style={[styles.nudgeTitle, { color: palette.textPrimary }]}>
                  {nudge.title}
                </Text>
                <Text style={[styles.nudgeContent, { color: palette.textSecondary }]}>
                  {nudge.content}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
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
  nudgeCard: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
    ...Shadows.subtle,
  },
  nudgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  nudgeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nudgeHeaderText: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  nudgeType: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  nudgeTime: {
    fontSize: 11,
    marginTop: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  nudgeTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold as any,
    fontFamily: Typography.fonts.serif,
    marginBottom: Spacing.xs,
  },
  nudgeContent: {
    fontSize: Typography.sizes.body,
    lineHeight: 22,
  },
});
