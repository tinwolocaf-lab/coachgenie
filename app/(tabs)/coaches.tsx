import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { Card } from '@/components/ui/Card';
import { CoachIcon } from '@/components/ui/CoachIcon';
import { SearchBar } from '@/components/ui/SearchBar';
import { FilterPills } from '@/components/ui/FilterPills';
import { StaggeredFadeIn } from '@/components/ui/AnimatedContainer';
import { Coach, InstalledCoach } from '@/types';
import { SAMPLE_COACHES, getCoachById } from '@/data/coaches';
import { getInstalledCoaches, getActiveCoachId } from '@/store/app';
import { canAccessCoach } from '@/lib/feature-gates';
import type { SubscriptionTier } from '@/lib/feature-gates';

// Coach categories for filtering
const COACH_CATEGORIES = [
  { id: 'mindset', label: 'Mindset', count: 1 },
  { id: 'productivity', label: 'Productivity', count: 2 },
  { id: 'strategy', label: 'Strategy', count: 1 },
  { id: 'systems', label: 'Systems', count: 1 },
];

// Map coaches to categories
const COACH_CATEGORY_MAP: Record<string, string> = {
  'coach-daily-clarity': 'productivity',
  'coach-deep-work': 'productivity',
  'coach-systems-builder': 'systems',
  'coach-strategic-thinking': 'strategy',
  'coach-mindset': 'mindset',
};

export default function CoachesScreen() {
  const router = useRouter();
  const { palette, subscriptionTier } = useThemeSafe();
  const scrollRef = useRef<ScrollView>(null);

  const [installedCoaches, setInstalledCoaches] = useState<InstalledCoach[]>([]);
  const [activeCoachId, setActiveCoachIdState] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [scrollOffset, setScrollOffset] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const installed = await getInstalledCoaches();
      setInstalledCoaches(installed);
      const activeId = await getActiveCoachId();
      setActiveCoachIdState(activeId);
    } catch (error) {
      console.error('Error loading coaches:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleCoachPress = (coachId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!canAccessCoach(subscriptionTier, coachId)) {
      router.push('/paywall');
      return;
    }
    router.push(`/coach/${coachId}`);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setScrollOffset(event.nativeEvent.contentOffset.y);
  };

  const handleCategorySelect = (categoryId: string | null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategory(categoryId);
  };

  // Filter coaches based on search and category
  const filteredCoaches = useMemo(() => {
    let coaches = SAMPLE_COACHES;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      coaches = coaches.filter(
        (coach) =>
          coach.name.toLowerCase().includes(query) ||
          coach.tagline.toLowerCase().includes(query) ||
          coach.method.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (selectedCategory) {
      coaches = coaches.filter(
        (coach) => COACH_CATEGORY_MAP[coach.id] === selectedCategory
      );
    }

    return coaches;
  }, [searchQuery, selectedCategory]);

  const installedIds = installedCoaches.map((c) => c.coach_id);

  const myCoaches = installedCoaches
    .map((ic) => ({
      ...ic,
      coach: getCoachById(ic.coach_id),
    }))
    .filter((ic) => ic.coach) as (InstalledCoach & { coach: Coach })[];

  const availableCoaches = filteredCoaches.filter(
    (c) => !installedIds.includes(c.id)
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.accent}
          />
        }
      >
        {/* Header */}
        <StaggeredFadeIn index={0} baseDelay={0}>
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>The Gallery</Text>
            <Text style={[styles.headerSubtitle, { color: palette.textTertiary }]}>
              World-class methodologies for every aspect of your growth
            </Text>
          </View>
        </StaggeredFadeIn>

        {/* Search Bar */}
        <StaggeredFadeIn index={1} baseDelay={100}>
          <View style={styles.searchContainer}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search coaches, methodologies..."
            />
          </View>
        </StaggeredFadeIn>

        {/* Filter Pills */}
        <StaggeredFadeIn index={2} baseDelay={150}>
          <View style={styles.filtersContainer}>
            <FilterPills
              categories={COACH_CATEGORIES}
              selectedId={selectedCategory}
              onSelect={handleCategorySelect}
            />
          </View>
        </StaggeredFadeIn>

        {/* My Coaches Section */}
        {myCoaches.length > 0 && !searchQuery && !selectedCategory && (
          <StaggeredFadeIn index={3} baseDelay={200}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Your Coaches</Text>
              <View style={[styles.activeBadge, { backgroundColor: palette.accent }]}>
                <Text style={[styles.activeCount, { color: palette.textInverse }]}>{myCoaches.length}</Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.myCoachesScroll}
            >
              {myCoaches.map((item, index) => (
                <ActiveCoachCard
                  key={item.id}
                  coach={item.coach}
                  isActive={item.coach_id === activeCoachId}
                  onPress={() => handleCoachPress(item.coach_id)}
                  index={index}
                  scrollOffset={scrollOffset}
                />
              ))}
            </ScrollView>
          </StaggeredFadeIn>
        )}

        {/* Discover Coaches - Masterclass Style Gallery */}
        <StaggeredFadeIn index={4} baseDelay={300}>
          <View style={styles.sectionHeaderVertical}>
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
              {searchQuery || selectedCategory ? 'Results' : 'Discover Coaches'}
            </Text>
            {!searchQuery && !selectedCategory && (
              <Text style={[styles.sectionSubtitle, { color: palette.textTertiary }]}>
                Each coach brings a unique methodology
              </Text>
            )}
          </View>

          <View style={styles.coachGrid}>
            {availableCoaches.length > 0 ? (
              availableCoaches.map((coach, index) => (
                <MasterclassCoachCard
                  key={coach.id}
                  coach={coach}
                  onPress={() => handleCoachPress(coach.id)}
                  index={index}
                  scrollOffset={scrollOffset}
                  isLocked={!canAccessCoach(subscriptionTier, coach.id)}
                />
              ))
            ) : (
              <Card variant="glass" style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="search-outline" size={48} color={palette.textTertiary} />
                </View>
                <Text style={[styles.emptyTitle, { color: palette.textPrimary }]}>No coaches found</Text>
                <Text style={[styles.emptyText, { color: palette.textTertiary }]}>
                  Try adjusting your search or filters
                </Text>
              </Card>
            )}
          </View>

          {/* All coaches installed message */}
          {availableCoaches.length === 0 && !searchQuery && !selectedCategory && installedIds.length === SAMPLE_COACHES.length && (
            <Card variant="glass" style={styles.allInstalledCard}>
              <View style={styles.allInstalledIcon}>
                <Ionicons name="checkmark-circle" size={48} color={palette.success} />
              </View>
              <Text style={[styles.allInstalledTitle, { color: palette.textPrimary }]}>Library Complete</Text>
              <Text style={[styles.allInstalledText, { color: palette.textTertiary }]}>
                You&apos;ve explored all available coaches. More methodologies coming soon.
              </Text>
            </Card>
          )}
        </StaggeredFadeIn>

        {/* Bottom spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ActiveCoachCard({
  coach,
  isActive,
  onPress,
  index,
  scrollOffset,
}: {
  coach: Coach;
  isActive: boolean;
  onPress: () => void;
  index: number;
  scrollOffset: number;
}) {
  const { palette } = useThemeSafe();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(30);

  useEffect(() => {
    const delay = 300 + index * 100;
    opacity.value = withDelay(delay, withTiming(1, { duration: 500 }));
    translateY.value = withDelay(delay, withSpring(0, Timing.springGentle));
  }, [index, opacity, translateY]);

  const handlePressIn = () => {
    scale.value = withSpring(0.97, Timing.springGentle);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, Timing.springGentle);
  };

  // Subtle parallax effect
  const parallaxOffset = scrollOffset * 0.1;

  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
    opacity: opacity.value,
  }));

  const imageStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -parallaxOffset * 0.3 }],
  }));

  return (
    <Animated.View style={containerStyle}>
      <TouchableOpacity
        style={[styles.activeCoachCard, { backgroundColor: palette.cardBg }]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* Colored accent bar */}
        <View style={[styles.activeAccentBar, { backgroundColor: coach.color }]} />

        <View style={styles.activeCoachBody}>
          <Animated.View style={imageStyle}>
            <CoachIcon
              iconName={coach.icon_name}
              color={coach.color}
              size="md"
              variant="default"
            />
          </Animated.View>
          <Text style={[styles.activeCoachName, { color: palette.textPrimary }]}>{coach.name}</Text>
          {isActive && (
            <View style={styles.currentBadge}>
              <View style={[styles.activeDot, { backgroundColor: palette.accent }]} />
              <Text style={[styles.currentBadgeText, { color: palette.accent }]}>Active</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function MasterclassCoachCard({
  coach,
  onPress,
  index,
  scrollOffset,
  isLocked = false,
}: {
  coach: Coach;
  onPress: () => void;
  index: number;
  scrollOffset: number;
  isLocked?: boolean;
}) {
  const { palette } = useThemeSafe();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(40);

  useEffect(() => {
    const delay = 400 + index * 120;
    opacity.value = withDelay(delay, withTiming(1, { duration: 600 }));
    translateY.value = withDelay(delay, withSpring(0, Timing.springGentle));
  }, [index, opacity, translateY]);

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSpring(0.98, Timing.springGentle);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, Timing.springGentle);
  };

  // Parallax effect for the portrait
  const parallaxFactor = 0.15;

  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
    opacity: opacity.value,
  }));

  const portraitStyle = useAnimatedStyle(() => {
    const parallaxOffset = scrollOffset * parallaxFactor;
    return {
      transform: [{ translateY: -parallaxOffset }],
    };
  });

  return (
    <Animated.View style={containerStyle}>
      <TouchableOpacity
        style={[styles.masterclassCard, { backgroundColor: palette.cardBg }]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* Color header strip with icon */}
        <LinearGradient
          colors={[coach.color, `${coach.color}CC`]}
          style={styles.masterclassColorHeader}
        >
          <Animated.View style={portraitStyle}>
            <CoachIcon
              iconName={coach.icon_name}
              color="#FFFFFF"
              size="lg"
              variant="gradient"
            />
          </Animated.View>
        </LinearGradient>

        {/* Body */}
        <View style={styles.masterclassBody}>
          <Text style={[styles.masterclassName, { color: palette.textPrimary }]}>{coach.name}</Text>
          <Text style={[styles.masterclassTagline, { color: palette.textSecondary }]}>{coach.tagline}</Text>

          {/* Divider */}
          <View style={[styles.masterclassDivider, { backgroundColor: palette.borderLight }]} />

          {/* Method preview with accent bar */}
          <View style={styles.methodPreview}>
            <View style={[styles.methodAccentBar, { backgroundColor: coach.color }]} />
            <Text style={[styles.methodText, { color: palette.textTertiary }]} numberOfLines={2}>
              {coach.method}
            </Text>
          </View>

          {/* Footer */}
          <View style={styles.masterclassFooter}>
            <Text style={[styles.categoryLabel, { color: palette.textTertiary }]}>
              {COACH_CATEGORY_MAP[coach.id]?.charAt(0).toUpperCase() +
               COACH_CATEGORY_MAP[coach.id]?.slice(1) || 'Coaching'}
            </Text>
            {isLocked ? (
              <View style={styles.exploreButton}>
                <Ionicons name="lock-closed" size={14} color={palette.textTertiary} />
                <Text style={[styles.exploreText, { color: palette.textTertiary }]}>Upgrade</Text>
              </View>
            ) : (
              <View style={styles.exploreButton}>
                <Text style={[styles.exploreText, { color: coach.color }]}>Explore</Text>
                <Ionicons name="arrow-forward" size={14} color={coach.color} />
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.section,
  },

  // Header
  header: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  headerTitle: {
    fontSize: Typography.sizes.hero,
    fontWeight: Typography.weights.light,
    fontFamily: Typography.fonts.serif,
    letterSpacing: Typography.letterSpacing.tight,
  },
  headerSubtitle: {
    fontSize: Typography.sizes.body,
    marginTop: Spacing.sm,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },

  // Search
  searchContainer: {
    paddingHorizontal: Spacing.xxl,
    marginBottom: Spacing.md,
  },

  // Filters
  filtersContainer: {
    marginBottom: Spacing.lg,
  },

  // Section Headers
  sectionHeader: {
    paddingHorizontal: Spacing.xxl,
    marginBottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderVertical: {
    paddingHorizontal: Spacing.xxl,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
  },
  sectionSubtitle: {
    fontSize: Typography.sizes.body,
    marginTop: Spacing.xs,
  },
  activeBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCount: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.bold,
  },

  // My Coaches
  myCoachesScroll: {
    paddingHorizontal: Spacing.xxl,
    marginBottom: Spacing.xxl,
  },
  activeCoachCard: {
    width: 160,
    marginRight: Spacing.md,
    borderRadius: Radius.squircle,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  activeAccentBar: {
    height: 4,
    width: '100%',
  },
  activeCoachBody: {
    padding: Spacing.lg,
    alignItems: 'center',
    minHeight: 160,
  },
  activeCoachName: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    textAlign: 'center',
    marginTop: Spacing.md,
    fontFamily: Typography.fonts.serif,
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: 6,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  currentBadgeText: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
  },

  // Masterclass Cards
  coachGrid: {
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.lg,
  },
  masterclassCard: {
    borderRadius: Radius.squircle,
    overflow: 'hidden',
    ...Shadows.md,
  },
  masterclassColorHeader: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  masterclassBody: {
    padding: Spacing.xl,
  },
  masterclassName: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
  },
  masterclassTagline: {
    fontSize: Typography.sizes.body,
    marginTop: Spacing.xs,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },
  masterclassDivider: {
    height: 1,
    width: '100%',
    marginTop: Spacing.lg,
  },
  methodPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: Spacing.lg,
  },
  methodAccentBar: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
    marginRight: Spacing.md,
  },
  methodText: {
    flex: 1,
    fontSize: Typography.sizes.body,
    fontStyle: 'italic',
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },
  masterclassFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xl,
  },
  categoryLabel: {
    fontSize: Typography.sizes.caption,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wide,
    fontWeight: Typography.weights.semibold,
  },
  exploreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  exploreText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
  },

  // Empty state
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyIcon: {
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
  },
  emptyText: {
    fontSize: Typography.sizes.body,
    marginTop: Spacing.sm,
  },

  // All installed
  allInstalledCard: {
    marginHorizontal: Spacing.xxl,
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  allInstalledIcon: {
    marginBottom: Spacing.lg,
  },
  allInstalledTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
  },
  allInstalledText: {
    fontSize: Typography.sizes.body,
    textAlign: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },

  bottomSpacer: {
    height: 100,
  },
});
