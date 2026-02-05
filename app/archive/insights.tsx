// Insight Gallery - Browse all saved insights with collections and search
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
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
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  getInsightsWithDetails,
  searchInsights,
} from '@/lib/supabase-archive';
import { KeyInsight } from '@/types';
import { getCoachById } from '@/data/coaches';

type FilterCategory = 'all' | 'mindset' | 'strategy' | 'productivity' | 'systems' | 'general';

const CATEGORIES: { id: FilterCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'all', label: 'All', icon: 'grid-outline' },
  { id: 'mindset', label: 'Mindset', icon: 'bulb-outline' },
  { id: 'strategy', label: 'Strategy', icon: 'compass-outline' },
  { id: 'productivity', label: 'Productivity', icon: 'flash-outline' },
  { id: 'systems', label: 'Systems', icon: 'cog-outline' },
  { id: 'general', label: 'General', icon: 'ellipse-outline' },
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

export default function InsightsGalleryScreen() {
  const router = useRouter();
  const useAuth = getAuthHook();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const auth = useAuth && isSupabaseConfigured ? useAuth() : null;

  const [insights, setInsights] = useState<KeyInsight[]>([]);
  const [filteredInsights, setFilteredInsights] = useState<KeyInsight[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const loadInsights = useCallback(async () => {
    if (!auth?.user?.id) return;

    try {
      const data = await getInsightsWithDetails(auth.user.id, 100);
      setInsights(data);
      setFilteredInsights(data);
    } catch (error) {
      console.error('Error loading insights:', error);
    }
  }, [auth?.user?.id]);

  useEffect(() => {
    loadInsights();
  }, [loadInsights]);

  // Filter insights when category changes
  useEffect(() => {
    if (activeFilter === 'all') {
      setFilteredInsights(insights);
    } else {
      setFilteredInsights(insights.filter(i => i.category === activeFilter));
    }
  }, [activeFilter, insights]);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);

    if (!query.trim()) {
      if (activeFilter === 'all') {
        setFilteredInsights(insights);
      } else {
        setFilteredInsights(insights.filter(i => i.category === activeFilter));
      }
      return;
    }

    if (!auth?.user?.id) return;

    setIsSearching(true);
    try {
      const results = await searchInsights(auth.user.id, query.trim());
      if (activeFilter === 'all') {
        setFilteredInsights(results);
      } else {
        setFilteredInsights(results.filter(i => i.category === activeFilter));
      }
    } finally {
      setIsSearching(false);
    }
  }, [activeFilter, auth?.user?.id, insights]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInsights();
    setRefreshing(false);
  }, [loadInsights]);

  const handleFilterChange = (filter: FilterCategory) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveFilter(filter);
  };

  const handleInsightPress = (insight: KeyInsight) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/archive/insight/${insight.id}`);
  };

  const handleBackPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  // Group insights by month for display
  const groupedInsights = groupByMonth(filteredInsights);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
            <Ionicons name="chevron-back" size={24} color={Colors.midnightEmerald} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Insight Gallery</Text>
          <View style={styles.headerRight} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color={Colors.stoneGray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search your wisdom..."
            placeholderTextColor={Colors.stoneGray}
            value={searchQuery}
            onChangeText={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <Ionicons name="close-circle" size={18} color={Colors.stoneGray} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
        >
          {CATEGORIES.map(category => (
            <FilterPill
              key={category.id}
              category={category}
              isActive={activeFilter === category.id}
              onPress={() => handleFilterChange(category.id)}
            />
          ))}
        </ScrollView>
      </Animated.View>

      {/* Results count */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsText}>
          {filteredInsights.length} insight{filteredInsights.length !== 1 ? 's' : ''}
          {activeFilter !== 'all' && ` in ${activeFilter}`}
        </Text>
      </View>

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
        {filteredInsights.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color={Colors.stoneGray} />
            <Text style={styles.emptyTitle}>No insights found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery ? 'Try a different search term' : 'Your insights will appear here'}
            </Text>
          </View>
        ) : (
          Object.entries(groupedInsights).map(([monthYear, monthInsights], groupIndex) => (
            <View key={monthYear} style={styles.monthGroup}>
              <Animated.Text
                entering={FadeInDown.duration(300).delay(groupIndex * 50)}
                style={styles.monthLabel}
              >
                {monthYear}
              </Animated.Text>
              <View style={styles.insightsList}>
                {monthInsights.map((insight, index) => (
                  <InsightCard
                    key={insight.id}
                    insight={insight}
                    index={groupIndex * 10 + index}
                    onPress={() => handleInsightPress(insight)}
                  />
                ))}
              </View>
            </View>
          ))
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

function FilterPill({
  category,
  isActive,
  onPress,
}: {
  category: { id: FilterCategory; label: string; icon: keyof typeof Ionicons.glyphMap };
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
        style={[styles.filterPill, isActive && styles.filterPillActive]}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <Ionicons
          name={category.icon}
          size={14}
          color={isActive ? Colors.white : Colors.stoneGray}
        />
        <Text style={[styles.filterLabel, isActive && styles.filterLabelActive]}>
          {category.label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

interface InsightCardProps {
  insight: KeyInsight;
  index: number;
  onPress: () => void;
}

function InsightCard({ insight, index, onPress }: InsightCardProps) {
  const scale = useSharedValue(0.95);
  const opacity = useSharedValue(0);

  const coach = getCoachById(insight.coach_id);

  useEffect(() => {
    const delay = Math.min(index * 50, 500);
    scale.value = withDelay(delay, withSpring(1, Timing.springGentle));
    opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
  }, [index, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSpring(0.98, Timing.springBouncy);
    setTimeout(() => {
      scale.value = withSpring(1, Timing.springBouncy);
      onPress();
    }, 100);
  };

  const formattedDate = new Date(insight.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  const categoryColors: Record<string, string> = {
    mindset: '#1B3022',
    strategy: '#2C1E1B',
    productivity: '#1A2A3A',
    systems: '#2A2A1A',
    general: Colors.midnightEmerald,
  };

  return (
    <Animated.View style={[styles.insightCard, animatedStyle]}>
      <TouchableOpacity activeOpacity={0.95} onPress={handlePress}>
        <View style={styles.insightContent}>
          {/* Category indicator */}
          <View
            style={[
              styles.categoryIndicator,
              { backgroundColor: categoryColors[insight.category] || categoryColors.general },
            ]}
          />

          <View style={styles.insightMain}>
            {/* Header */}
            <View style={styles.insightHeader}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>
                  {insight.category.charAt(0).toUpperCase() + insight.category.slice(1)}
                </Text>
              </View>
              <Text style={styles.insightDate}>{formattedDate}</Text>
            </View>

            {/* Title */}
            <Text style={styles.insightTitle} numberOfLines={2}>
              {insight.title}
            </Text>

            {/* Excerpt */}
            <Text style={styles.insightExcerpt} numberOfLines={2}>
              {insight.content}
            </Text>

            {/* Footer */}
            <View style={styles.insightFooter}>
              <View style={styles.coachBadge}>
                <Ionicons
                  name={coach?.icon_name as keyof typeof Ionicons.glyphMap || 'person'}
                  size={12}
                  color={Colors.stoneGray}
                />
                <Text style={styles.coachName}>{coach?.name || 'Coach'}</Text>
              </View>
              {insight.is_highlighted && (
                <Ionicons name="star" size={14} color={Colors.burnishedGold} />
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// Helper function to group insights by month
function groupByMonth(insights: KeyInsight[]): Record<string, KeyInsight[]> {
  const groups: Record<string, KeyInsight[]> = {};

  insights.forEach(insight => {
    const date = new Date(insight.created_at);
    const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    if (!groups[monthYear]) {
      groups[monthYear] = [];
    }
    groups[monthYear].push(insight);
  });

  return groups;
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
    marginBottom: Spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    color: Colors.midnightEmerald,
  },
  headerRight: {
    width: 40,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cream,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.sizes.body,
    color: Colors.charcoal,
    paddingVertical: 4,
  },
  filtersContainer: {
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    backgroundColor: Colors.cream,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  filterPillActive: {
    backgroundColor: Colors.midnightEmerald,
    borderColor: Colors.midnightEmerald,
  },
  filterLabel: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.medium,
    color: Colors.stoneGray,
  },
  filterLabelActive: {
    color: Colors.white,
  },
  resultsBar: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
  },
  resultsText: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.xxl,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    color: Colors.charcoal,
    marginTop: Spacing.lg,
  },
  emptySubtitle: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
    marginTop: Spacing.sm,
  },
  monthGroup: {
    marginBottom: Spacing.xl,
  },
  monthLabel: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    color: Colors.burnishedGold,
    letterSpacing: Typography.letterSpacing.wider,
    textTransform: 'uppercase',
    marginBottom: Spacing.md,
  },
  insightsList: {
    gap: Spacing.md,
  },
  insightCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.squircle,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  insightContent: {
    flexDirection: 'row',
  },
  categoryIndicator: {
    width: 4,
  },
  insightMain: {
    flex: 1,
    padding: Spacing.lg,
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  categoryBadge: {
    backgroundColor: Colors.goldMuted,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  categoryText: {
    fontSize: Typography.sizes.micro,
    fontWeight: Typography.weights.semibold,
    color: Colors.burnishedGold,
    letterSpacing: Typography.letterSpacing.wide,
  },
  insightDate: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
  },
  insightTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    color: Colors.midnightEmerald,
    marginBottom: Spacing.xs,
  },
  insightExcerpt: {
    fontSize: Typography.sizes.body,
    color: Colors.slate,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
    marginBottom: Spacing.md,
  },
  insightFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coachBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  coachName: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
  },
  bottomSpacer: {
    height: 100,
  },
});
