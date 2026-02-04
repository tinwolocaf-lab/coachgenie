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
import { Colors, Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { CoachIcon } from '@/components/ui/CoachIcon';
import { SearchBar } from '@/components/ui/SearchBar';
import { FilterPills } from '@/components/ui/FilterPills';
import { StaggeredFadeIn } from '@/components/ui/AnimatedContainer';
import { Coach, InstalledCoach } from '@/types';
import { SAMPLE_COACHES, getCoachById } from '@/data/coaches';
import { getInstalledCoaches, getActiveCoachId } from '@/store/app';

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
    <SafeAreaView style={styles.container} edges={['top']}>
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
            tintColor={Colors.burnishedGold}
          />
        }
      >
        {/* Header */}
        <StaggeredFadeIn index={0} baseDelay={0}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>The Gallery</Text>
            <Text style={styles.headerSubtitle}>
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
              <Text style={styles.sectionTitle}>Your Coaches</Text>
              <View style={styles.activeBadge}>
                <Text style={styles.activeCount}>{myCoaches.length}</Text>
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
            <Text style={styles.sectionTitle}>
              {searchQuery || selectedCategory ? 'Results' : 'Discover Coaches'}
            </Text>
            {!searchQuery && !selectedCategory && (
              <Text style={styles.sectionSubtitle}>
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
                />
              ))
            ) : (
              <Card variant="glass" style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="search-outline" size={48} color={Colors.stoneGray} />
                </View>
                <Text style={styles.emptyTitle}>No coaches found</Text>
                <Text style={styles.emptyText}>
                  Try adjusting your search or filters
                </Text>
              </Card>
            )}
          </View>

          {/* All coaches installed message */}
          {availableCoaches.length === 0 && !searchQuery && !selectedCategory && installedIds.length === SAMPLE_COACHES.length && (
            <Card variant="glass" style={styles.allInstalledCard}>
              <View style={styles.allInstalledIcon}>
                <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
              </View>
              <Text style={styles.allInstalledTitle}>Library Complete</Text>
              <Text style={styles.allInstalledText}>
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
        style={[styles.activeCoachCard, isActive && styles.activeCoachCardHighlight]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <LinearGradient
          colors={[coach.color, `${coach.color}DD`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.activeCoachGradient}
        >
          <Animated.View style={imageStyle}>
            <CoachIcon
              iconName={coach.icon_name}
              color={Colors.white}
              size="lg"
              variant="solid"
              style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
            />
          </Animated.View>
          <Text style={styles.activeCoachName}>{coach.name}</Text>
          {isActive && (
            <View style={styles.currentBadge}>
              <Ionicons name="sparkles" size={10} color={Colors.burnishedGold} />
              <Text style={styles.currentBadgeText}>Active</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

function MasterclassCoachCard({
  coach,
  onPress,
  index,
  scrollOffset,
}: {
  coach: Coach;
  onPress: () => void;
  index: number;
  scrollOffset: number;
}) {
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
        style={styles.masterclassCard}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* Card Background */}
        <LinearGradient
          colors={[Colors.midnightEmerald, '#0D1A11']}
          style={styles.masterclassGradient}
        >
          {/* Accent Color Strip */}
          <View style={[styles.accentStrip, { backgroundColor: coach.color }]} />

          {/* Premium Badge */}
          <View style={styles.premiumBadge}>
            <LinearGradient
              colors={[Colors.burnishedGold, Colors.goldLight]}
              style={styles.premiumBadgeGradient}
            >
              <Ionicons name="diamond" size={10} color={Colors.white} />
              <Text style={styles.premiumBadgeText}>PREMIUM</Text>
            </LinearGradient>
          </View>

          {/* Content */}
          <View style={styles.masterclassContent}>
            {/* Header section with portrait */}
            <View style={styles.masterclassHeader}>
              <Animated.View style={portraitStyle}>
                <View style={styles.portraitContainer}>
                  <LinearGradient
                    colors={[coach.color, `${coach.color}AA`]}
                    style={styles.portraitGradient}
                  >
                    <CoachIcon
                      iconName={coach.icon_name}
                      color={Colors.white}
                      size="xl"
                      variant="default"
                      style={{ backgroundColor: 'transparent' }}
                    />
                  </LinearGradient>
                  {/* Decorative ring */}
                  <View style={[styles.portraitRing, { borderColor: coach.color }]} />
                </View>
              </Animated.View>
              <View style={styles.versionBadge}>
                <Text style={styles.versionText}>v{coach.version}</Text>
              </View>
            </View>

            {/* Info section */}
            <View style={styles.masterclassInfo}>
              <Text style={styles.masterclassName}>{coach.name}</Text>
              <Text style={styles.masterclassTagline}>{coach.tagline}</Text>
            </View>

            {/* Method Preview */}
            <View style={styles.methodPreview}>
              <View style={styles.methodIcon}>
                <Ionicons name="diamond-outline" size={14} color={Colors.burnishedGold} />
              </View>
              <Text style={styles.methodText} numberOfLines={2}>
                {coach.method}
              </Text>
            </View>

            {/* Footer */}
            <View style={styles.masterclassFooter}>
              <View style={styles.specialtyPill}>
                <Text style={styles.specialtyText}>
                  {COACH_CATEGORY_MAP[coach.id]?.charAt(0).toUpperCase() +
                   COACH_CATEGORY_MAP[coach.id]?.slice(1) || 'Coaching'}
                </Text>
              </View>
              <View style={styles.enterButton}>
                <Text style={styles.enterText}>Enter Session</Text>
                <Ionicons name="arrow-forward" size={16} color={Colors.burnishedGold} />
              </View>
            </View>
          </View>

          {/* Decorative corner element */}
          <View style={styles.cornerDecoration}>
            <Ionicons name="star" size={100} color="rgba(197, 160, 89, 0.03)" />
          </View>
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
    color: Colors.midnightEmerald,
    fontFamily: Typography.fonts.serif,
    letterSpacing: Typography.letterSpacing.tight,
  },
  headerSubtitle: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
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
    color: Colors.midnightEmerald,
    fontFamily: Typography.fonts.serif,
  },
  sectionSubtitle: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
    marginTop: Spacing.xs,
  },
  activeBadge: {
    backgroundColor: Colors.burnishedGold,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCount: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
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
    ...Shadows.lg,
  },
  activeCoachCardHighlight: {
    borderWidth: 2,
    borderColor: Colors.burnishedGold,
  },
  activeCoachGradient: {
    padding: Spacing.lg,
    alignItems: 'center',
    minHeight: 180,
  },
  activeCoachName: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
    textAlign: 'center',
    marginTop: Spacing.md,
    fontFamily: Typography.fonts.serif,
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    marginTop: Spacing.sm,
    gap: 4,
  },
  currentBadgeText: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
  },

  // Masterclass Cards
  coachGrid: {
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.lg,
  },
  masterclassCard: {
    borderRadius: Radius.squircle,
    overflow: 'hidden',
    ...Shadows.xl,
  },
  masterclassGradient: {
    minHeight: 320,
    position: 'relative',
  },
  accentStrip: {
    height: 4,
    width: '100%',
  },
  premiumBadge: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
    zIndex: 1,
  },
  premiumBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    gap: 4,
  },
  premiumBadgeText: {
    fontSize: Typography.sizes.micro,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
    letterSpacing: Typography.letterSpacing.wider,
  },
  masterclassContent: {
    flex: 1,
    padding: Spacing.xl,
    paddingTop: Spacing.lg,
  },
  masterclassHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  portraitContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  portraitGradient: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.gold,
  },
  portraitRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    opacity: 0.3,
  },
  versionBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
  },
  versionText: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
  },
  masterclassInfo: {
    marginTop: Spacing.xl,
  },
  masterclassName: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
    fontFamily: Typography.fonts.serif,
  },
  masterclassTagline: {
    fontSize: Typography.sizes.bodyLarge,
    color: Colors.goldLight,
    marginTop: Spacing.xs,
    lineHeight: Typography.sizes.bodyLarge * Typography.lineHeights.relaxed,
  },
  methodPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  methodIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  methodText: {
    flex: 1,
    fontSize: Typography.sizes.body,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },
  masterclassFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xl,
    paddingTop: Spacing.md,
  },
  specialtyPill: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
  },
  specialtyText: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wide,
  },
  enterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  enterText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    color: Colors.burnishedGold,
  },
  cornerDecoration: {
    position: 'absolute',
    bottom: -30,
    right: -30,
    transform: [{ rotate: '-15deg' }],
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
    color: Colors.midnightEmerald,
    fontFamily: Typography.fonts.serif,
  },
  emptyText: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
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
    color: Colors.midnightEmerald,
    fontFamily: Typography.fonts.serif,
  },
  allInstalledText: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
    textAlign: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },

  bottomSpacer: {
    height: 100,
  },
});
