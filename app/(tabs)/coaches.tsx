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
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PremiumPageTransition } from '@/components/ui/PremiumPageTransition';
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
import { getActiveCoachId } from '@/store/app';
import { canAccessCoach, canAccessMarketplaceCoach } from '@/lib/feature-gates';
import { listInstalledCoaches, listMarketplaceCoaches } from '@/lib/coaches';

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
  const [marketplaceCoaches, setMarketplaceCoaches] = useState<Coach[]>([]);
  const [activeCoachId, setActiveCoachIdState] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [scrollOffset, setScrollOffset] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const [installed, marketplace] = await Promise.all([
        listInstalledCoaches(),
        listMarketplaceCoaches(),
      ]);
      setInstalledCoaches(installed);
      setMarketplaceCoaches(marketplace);
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

  const handleCoachPress = (coach: Coach) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const isMarketplaceCoach = coach.source === 'marketplace' || coach.source === 'owned_custom';
    if (!isMarketplaceCoach && !canAccessCoach(subscriptionTier, coach.id)) {
      router.push('/paywall');
      return;
    }
    if (isMarketplaceCoach && !canAccessMarketplaceCoach(subscriptionTier, coach.id)) {
      router.push('/paywall');
      return;
    }
    router.push(`/coach/${coach.id}`);
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
    let coaches = marketplaceCoaches;

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
  }, [marketplaceCoaches, searchQuery, selectedCategory]);

  const installedIds = installedCoaches.map((c) => c.coach_id);

  const myCoaches = installedCoaches
    .map((ic) => ({
      ...ic,
      coach: ic.coach ?? marketplaceCoaches.find((coach) => coach.id === ic.coach_id),
    }))
    .filter((ic) => ic.coach) as (InstalledCoach & { coach: Coach })[];

  const availableCoaches = filteredCoaches.filter(
    (c) => !installedIds.includes(c.id)
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <PremiumPageTransition>
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
                    onPress={() => handleCoachPress(item.coach)}
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
                    onPress={() => handleCoachPress(coach)}
                    index={index}
                    scrollOffset={scrollOffset}
                    isLocked={coach.source === 'builtin' ? !canAccessCoach(subscriptionTier, coach.id) : false}
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
            {availableCoaches.length === 0 && !searchQuery && !selectedCategory && installedIds.length === marketplaceCoaches.length && (
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
      </PremiumPageTransition>
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

  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
    opacity: opacity.value,
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
        <View style={styles.activeCoachBody}>
          <View style={styles.iconContainer}>
            {coach.image ? (
              <View style={styles.activeCoachImageContainer}>
                <Image
                  source={coach.image}
                  style={styles.activeCoachImage}
                  resizeMode="cover"
                />
              </View>
            ) : (
              <CoachIcon
                iconName={coach.icon_name}
                color={coach.color}
                size="md"
                variant="default"
              />
            )}
          </View>
          <Text style={[styles.activeCoachName, { color: palette.textPrimary }]}>{coach.name}</Text>
          {isActive && (
            <View style={[styles.activeIndicator, { backgroundColor: palette.accent }]} />
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

  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateY: translateY.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={containerStyle}>
      <TouchableOpacity
        style={[styles.masterclassCard, { backgroundColor: palette.cardBg }]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={styles.masterclassContent}>
          <View style={styles.masterclassHeader}>
            {coach.image ? (
              <View style={styles.masterclassImageContainer}>
                <Image
                  source={coach.image}
                  style={styles.masterclassImage}
                  resizeMode="cover"
                />
              </View>
            ) : (
              <CoachIcon
                iconName={coach.icon_name}
                color={coach.color}
                size="lg"
                variant="default"
              />
            )}
            <View style={styles.masterclassHeaderInfo}>
              <Text style={[styles.masterclassName, { color: palette.textPrimary }]}>{coach.name}</Text>
              <Text style={[styles.categoryLabel, { color: palette.textTertiary }]}>
                {COACH_CATEGORY_MAP[coach.id]?.charAt(0).toUpperCase() +
                  COACH_CATEGORY_MAP[coach.id]?.slice(1) || 'Coaching'}
              </Text>
            </View>
          </View>

          <Text style={[styles.masterclassTagline, { color: palette.textSecondary }]}>{coach.tagline}</Text>

          <View style={styles.methodContainer}>
            <Text style={[styles.methodLabel, { color: palette.textTertiary }]}>Method:</Text>
            <Text style={[styles.methodText, { color: palette.textSecondary }]} numberOfLines={1}>
              {coach.method}
            </Text>
          </View>
        </View>

        {isLocked && (
          <View style={[styles.lockedOverlay, { backgroundColor: palette.backgroundSecondary }]}>
            <Ionicons name="lock-closed" size={14} color={palette.textTertiary} />
            <Text style={[styles.lockedText, { color: palette.textTertiary }]}>Premium</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 200,
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
    width: 140,
    marginRight: Spacing.md,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  activeCoachBody: {
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
    gap: Spacing.md,
  },
  iconContainer: {
    padding: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCoachImageContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  activeCoachImage: {
    width: '100%',
    height: '100%',
  },
  activeCoachName: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    textAlign: 'center',
    fontFamily: Typography.fonts.serif,
  },
  activeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 4,
  },

  // Masterclass Cards
  coachGrid: {
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.lg,
  },
  masterclassCard: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  masterclassContent: {
    padding: Spacing.xl,
  },
  masterclassHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  masterclassHeaderInfo: {
    flex: 1,
  },
  masterclassName: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    marginBottom: 4,
  },
  categoryLabel: {
    fontSize: Typography.sizes.caption,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: Typography.weights.medium,
  },
  masterclassTagline: {
    fontSize: Typography.sizes.body,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  methodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  methodLabel: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.bold,
  },
  methodText: {
    flex: 1,
    fontSize: Typography.sizes.caption,
    fontStyle: 'italic',
  },
  lockedOverlay: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.pill,
  },
  lockedText: {
    fontSize: Typography.sizes.micro,
    fontWeight: Typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wide,
  },
  masterclassImageContainer: {
    width: 72,
    height: 72,
    borderRadius: Radius.squircle,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  masterclassImage: {
    width: '100%',
    height: '100%',
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
