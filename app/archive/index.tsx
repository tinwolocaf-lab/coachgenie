// The Archive - Premium Editorial Wisdom Library
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
import { isSupabaseConfigured } from '@/lib/supabase';
import { WisdomGrid } from '@/components/archive/WisdomGrid';
import { Chronicle } from '@/components/archive/Chronicle';
import { AskHistory } from '@/components/archive/AskHistory';
import {
  getArchivedSessions,
  getInsightsWithDetails,
  getAllBreakthroughs,
  getArchiveStats,
  getRecentHistoryQueries,
  ArchiveStats,
} from '@/lib/supabase-archive';
import { askHistory } from '@/lib/apiClient';
import { EnhancedSession, KeyInsight, Breakthrough, HistoryQuery, QuerySource } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Tab configuration
type ArchiveTab = 'wisdom' | 'chronicle' | 'ask';

const TABS: { id: ArchiveTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'wisdom', label: 'Wisdom', icon: 'sparkles' },
  { id: 'chronicle', label: 'Chronicle', icon: 'time' },
  { id: 'ask', label: 'Ask', icon: 'search' },
];

// Dynamic auth hook
const getAuthHook = () => {
  if (isSupabaseConfigured) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require('@fastshot/auth').useAuth;
    } catch {
      return null;
    }
  }
  return null;
};

export default function ArchiveScreen() {
  const router = useRouter();
  const useAuth = getAuthHook();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const auth = useAuth && isSupabaseConfigured ? useAuth() : null;

  const [activeTab, setActiveTab] = useState<ArchiveTab>('wisdom');
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState<KeyInsight[]>([]);
  const [sessions, setSessions] = useState<EnhancedSession[]>([]);
  const [breakthroughs, setBreakthroughs] = useState<Breakthrough[]>([]);
  const [stats, setStats] = useState<ArchiveStats | null>(null);
  const [recentQueries, setRecentQueries] = useState<HistoryQuery[]>([]);
  const [askLoading, setAskLoading] = useState(false);

  const loadData = useCallback(async () => {
    if (!auth?.user?.id) return;

    try {
      const [
        insightsData,
        sessionsData,
        breakthroughsData,
        statsData,
        queriesData,
      ] = await Promise.all([
        getInsightsWithDetails(auth.user.id, 20),
        getArchivedSessions(auth.user.id, 20),
        getAllBreakthroughs(auth.user.id, 10),
        getArchiveStats(auth.user.id),
        getRecentHistoryQueries(auth.user.id, 5),
      ]);

      setInsights(insightsData);
      setSessions(sessionsData);
      setBreakthroughs(breakthroughsData);
      setStats(statsData);
      setRecentQueries(queriesData);
    } catch (error) {
      console.error('Error loading archive data:', error);
    }
  }, [auth?.user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleTabChange = (tab: ArchiveTab) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  };

  const handleInsightPress = (insight: KeyInsight) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/archive/insight/${insight.id}`);
  };

  const handleSessionPress = (session: EnhancedSession) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/archive/session/${session.id}`);
  };

  const handleAskQuery = async (query: string) => {
    if (!auth?.user?.id) return null;
    setAskLoading(true);
    try {
      const result = await askHistory(query);
      const typedResult = {
        answer: result.answer,
        sources: (result.sources ?? []) as QuerySource[],
      };
      // Refresh recent queries
      const queries = await getRecentHistoryQueries(auth.user.id, 5);
      setRecentQueries(queries);
      return typedResult;
    } finally {
      setAskLoading(false);
    }
  };

  const handleViewAllInsights = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/archive/insights');
  };

  const handleViewBreakthroughs = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/archive/breakthroughs');
  };

  const handleOpenSynthesis = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/archive/synthesis');
  };

  const handleBackPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Ionicons name="chevron-back" size={24} color={Colors.midnightEmerald} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>The Archive</Text>
          <TouchableOpacity style={styles.synthesisButton} onPress={handleOpenSynthesis}>
            <Ionicons name="document-text-outline" size={20} color={Colors.burnishedGold} />
          </TouchableOpacity>
        </View>

        {/* Stats Bar */}
        {stats && (
          <View style={styles.statsBar}>
            <StatItem value={stats.totalSessions} label="Sessions" />
            <View style={styles.statDivider} />
            <StatItem value={stats.totalInsights} label="Insights" />
            <View style={styles.statDivider} />
            <StatItem value={stats.totalBreakthroughs} label="Breakthroughs" />
            <View style={styles.statDivider} />
            <StatItem value={stats.currentStreak} label="Streak" suffix="🔥" />
          </View>
        )}

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          {TABS.map(tab => (
            <TabButton
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              onPress={() => handleTabChange(tab.id)}
            />
          ))}
        </View>
      </Animated.View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.burnishedGold}
          />
        }
      >
        {activeTab === 'wisdom' && (
          <Animated.View entering={FadeInDown.duration(400)}>
            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <QuickActionCard
                icon="bulb"
                title="All Insights"
                count={insights.length}
                onPress={handleViewAllInsights}
              />
              <QuickActionCard
                icon="star"
                title="Breakthroughs"
                count={breakthroughs.length}
                onPress={handleViewBreakthroughs}
              />
            </View>

            {/* Wisdom Grid */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Key Insights</Text>
                {insights.length > 6 && (
                  <TouchableOpacity onPress={handleViewAllInsights}>
                    <Text style={styles.seeAllText}>See All</Text>
                  </TouchableOpacity>
                )}
              </View>
              <WisdomGrid
                insights={insights}
                onInsightPress={handleInsightPress}
                maxItems={6}
              />
            </View>

            {/* Breakthroughs Preview */}
            {breakthroughs.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recent Breakthroughs</Text>
                  <TouchableOpacity onPress={handleViewBreakthroughs}>
                    <Text style={styles.seeAllText}>See All</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.breakthroughsScroll}
                >
                  {breakthroughs.slice(0, 5).map((bt, index) => (
                    <BreakthroughCard
                      key={bt.id}
                      breakthrough={bt}
                      index={index}
                      onPress={() => router.push(`/archive/breakthroughs?id=${bt.id}`)}
                    />
                  ))}
                </ScrollView>
              </View>
            )}
          </Animated.View>
        )}

        {activeTab === 'chronicle' && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Session History</Text>
              </View>
              <Chronicle
                sessions={sessions}
                onSessionPress={handleSessionPress}
                maxItems={15}
              />
            </View>
          </Animated.View>
        )}

        {activeTab === 'ask' && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <AskHistory
              onSubmitQuery={handleAskQuery}
              recentQueries={recentQueries}
              isLoading={askLoading}
            />
          </Animated.View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatItem({ value, label, suffix }: { value: number; label: string; suffix?: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>
        {value}{suffix && <Text style={styles.statSuffix}>{suffix}</Text>}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function TabButton({
  tab,
  isActive,
  onPress,
}: {
  tab: { id: ArchiveTab; label: string; icon: keyof typeof Ionicons.glyphMap };
  isActive: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const handlePress = () => {
    scale.value = withSpring(0.95, Timing.springBouncy);
    setTimeout(() => {
      scale.value = withSpring(1, Timing.springBouncy);
    }, 100);
    onPress();
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={[styles.tabButton, isActive && styles.tabButtonActive]}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <Ionicons
          name={tab.icon}
          size={18}
          color={isActive ? Colors.burnishedGold : Colors.stoneGray}
        />
        <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
          {tab.label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function QuickActionCard({
  icon,
  title,
  count,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  count: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.quickActionCard} onPress={onPress} activeOpacity={0.9}>
      <LinearGradient
        colors={[Colors.cream, Colors.warmOatmealDark]}
        style={styles.quickActionGradient}
      >
        <View style={styles.quickActionIcon}>
          <Ionicons name={icon} size={20} color={Colors.burnishedGold} />
        </View>
        <View style={styles.quickActionContent}>
          <Text style={styles.quickActionTitle}>{title}</Text>
          <Text style={styles.quickActionCount}>{count}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.stoneGray} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

function BreakthroughCard({
  breakthrough,
  index,
  onPress,
}: {
  breakthrough: Breakthrough;
  index: number;
  onPress: () => void;
}) {
  const date = new Date(breakthrough.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(index * 100)}>
      <TouchableOpacity style={styles.breakthroughCard} onPress={onPress} activeOpacity={0.9}>
        <LinearGradient
          colors={[Colors.midnightEmerald, '#243D2E']}
          style={styles.breakthroughGradient}
        >
          <View style={styles.breakthroughHeader}>
            <Ionicons name="star" size={14} color={Colors.burnishedGold} />
            <Text style={styles.breakthroughDate}>{date}</Text>
          </View>
          <Text style={styles.breakthroughTitle} numberOfLines={2}>
            {breakthrough.title}
          </Text>
          <Text style={styles.breakthroughSummary} numberOfLines={2}>
            {breakthrough.summary}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.warmOatmeal,
  },
  header: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.warmOatmeal,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.bold,
    fontFamily: Typography.fonts.serif,
    color: Colors.midnightEmerald,
  },
  synthesisButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.cream,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.lg,
    ...Shadows.subtle,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.bold,
    fontFamily: Typography.fonts.serif,
    color: Colors.midnightEmerald,
  },
  statSuffix: {
    fontSize: Typography.sizes.body,
  },
  statLabel: {
    fontSize: Typography.sizes.micro,
    color: Colors.stoneGray,
    letterSpacing: Typography.letterSpacing.wide,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '60%',
    backgroundColor: Colors.borderLight,
    alignSelf: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    backgroundColor: 'transparent',
  },
  tabButtonActive: {
    backgroundColor: Colors.goldMuted,
  },
  tabLabel: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.stoneGray,
  },
  tabLabelActive: {
    color: Colors.burnishedGold,
    fontWeight: Typography.weights.semibold,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    color: Colors.midnightEmerald,
  },
  seeAllText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.burnishedGold,
  },
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    marginBottom: Spacing.xxl,
  },
  quickActionCard: {
    flex: 1,
    borderRadius: Radius.squircle,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  quickActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: Radius.squircle,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.charcoal,
  },
  quickActionCount: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.bold,
    fontFamily: Typography.fonts.serif,
    color: Colors.midnightEmerald,
  },
  breakthroughsScroll: {
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.md,
  },
  breakthroughCard: {
    width: SCREEN_WIDTH * 0.7,
    borderRadius: Radius.squircle,
    overflow: 'hidden',
    ...Shadows.md,
  },
  breakthroughGradient: {
    padding: Spacing.lg,
    minHeight: 140,
    justifyContent: 'space-between',
  },
  breakthroughHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  breakthroughDate: {
    fontSize: Typography.sizes.caption,
    color: Colors.goldLight,
  },
  breakthroughTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    color: Colors.white,
    marginTop: Spacing.sm,
  },
  breakthroughSummary: {
    fontSize: Typography.sizes.body,
    color: 'rgba(255,255,255,0.7)',
    marginTop: Spacing.xs,
  },
  bottomSpacer: {
    height: 100,
  },
});
