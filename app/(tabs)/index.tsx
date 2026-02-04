import React, { useEffect, useState, useCallback } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { CoachIcon } from '@/components/ui/CoachIcon';
import { StreakTimeline } from '@/components/ui/StreakTimeline';
import { FeaturedCard } from '@/components/ui/FeaturedCard';
import { QuickActions } from '@/components/ui/QuickActions';
import { StaggeredFadeIn } from '@/components/ui/AnimatedContainer';
import { FlashbackCard } from '@/components/archive/FlashbackCard';
import { Coach, Session, DayPlan, Priority, KeyInsight } from '@/types';
import { getCoachById, SAMPLE_COACHES } from '@/data/coaches';
import {
  getActiveCoachId,
  getSessions,
  getDayPlan,
  getInstalledCoaches,
} from '@/store/app';
import { isSupabaseConfigured } from '@/lib/supabase';
import { getFlashbackInsights } from '@/lib/supabase-archive';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

// Get greeting based on time of day
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

// Get streak days for timeline
const getStreakDays = (): { day: string; completed: boolean; isToday: boolean }[] => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const today = new Date().getDay();
  const todayIndex = today === 0 ? 6 : today - 1; // Convert Sunday=0 to index 6

  return days.map((day, index) => ({
    day,
    completed: index < todayIndex,
    isToday: index === todayIndex,
  }));
};

export default function HomeScreen() {
  const router = useRouter();
  const useAuth = getAuthHook();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const auth = useAuth && isSupabaseConfigured ? useAuth() : null;

  const [activeCoach, setActiveCoach] = useState<Coach | null>(null);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [todayPlan, setTodayPlan] = useState<DayPlan | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [currentStreak, setCurrentStreak] = useState(3);
  const [featuredCoach, setFeaturedCoach] = useState<Coach | null>(null);
  const [flashbackInsight, setFlashbackInsight] = useState<{ insight: KeyInsight; type: 'monthAgo' | 'yearAgo' } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const activeId = await getActiveCoachId();
      if (activeId) {
        const coach = getCoachById(activeId);
        setActiveCoach(coach || null);
      }

      const sessions = await getSessions();
      setRecentSessions(sessions.slice(0, 3));

      const today = new Date().toISOString().split('T')[0];
      const plan = await getDayPlan(today);
      setTodayPlan(plan);

      // Get installed coaches to find a featured one
      const installedCoaches = await getInstalledCoaches();
      const installedIds = installedCoaches.map(c => c.coach_id);

      // Feature a coach that's not installed yet
      const uninstalledCoaches = SAMPLE_COACHES.filter(c => !installedIds.includes(c.id));
      if (uninstalledCoaches.length > 0) {
        setFeaturedCoach(uninstalledCoaches[0]);
      } else {
        setFeaturedCoach(SAMPLE_COACHES[0]);
      }

      // Set streak based on sessions
      const sessionCount = sessions.length;
      setCurrentStreak(Math.min(sessionCount + 1, 7));

      // Note: Flashback loading happens in useEffect with auth
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Get user name from auth and load flashback insights
  useEffect(() => {
    if (auth?.user) {
      const metadata = auth.user.user_metadata || {};
      const name = metadata.full_name || metadata.name || auth.user.email?.split('@')[0] || '';
      setUserName(name.split(' ')[0]); // First name only

      // Load flashback insights
      const loadFlashback = async () => {
        try {
          const flashbacks = await getFlashbackInsights(auth.user.id);
          // Prefer year ago over month ago for more impact
          if (flashbacks.yearAgo) {
            setFlashbackInsight({ insight: flashbacks.yearAgo, type: 'yearAgo' });
          } else if (flashbacks.monthAgo) {
            setFlashbackInsight({ insight: flashbacks.monthAgo, type: 'monthAgo' });
          }
        } catch (error) {
          console.log('No flashback insights available:', error);
        }
      };
      loadFlashback();
    }
  }, [auth?.user]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleStartCheckIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (activeCoach) {
      router.push(`/chat/${activeCoach.id}`);
    } else {
      router.push('/(tabs)/coaches');
    }
  };

  const handleOpenChat = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activeCoach) {
      router.push(`/chat/${activeCoach.id}`);
    }
  };

  const handleAccountPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/account');
  };

  const handleFeaturedPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (featuredCoach) {
      router.push(`/coach/${featuredCoach.id}`);
    }
  };

  const handleFlashbackPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (flashbackInsight) {
      router.push(`/archive/insight/${flashbackInsight.insight.id}`);
    }
  };

  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  // Calculate progress
  const priorities: Priority[] = todayPlan?.top_priorities || [];
  const completedCount = priorities.filter(p => p.completed).length;
  const totalCount = priorities.length;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Default priorities if no plan exists
  const displayPriorities = priorities.length > 0 ? priorities : [
    { id: '1', title: 'Start your first check-in', completed: false, order: 1 },
    { id: '2', title: 'Explore the Coach Library', completed: false, order: 2 },
    { id: '3', title: 'Review your Context Vault', completed: false, order: 3 },
  ];

  // Quick actions
  const quickActions = [
    {
      id: 'resume',
      label: 'Resume Session',
      icon: 'play-circle-outline' as keyof typeof Ionicons.glyphMap,
      onPress: handleOpenChat,
    },
    {
      id: 'checkin',
      label: 'Daily Check-in',
      icon: 'sunny-outline' as keyof typeof Ionicons.glyphMap,
      onPress: handleStartCheckIn,
    },
    {
      id: 'archive',
      label: 'The Archive',
      icon: 'library-outline' as keyof typeof Ionicons.glyphMap,
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/archive');
      },
    },
    {
      id: 'vault',
      label: 'Context Vault',
      icon: 'diamond-outline' as keyof typeof Ionicons.glyphMap,
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/(tabs)/vault');
      },
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.burnishedGold}
          />
        }
      >
        {/* Editorial Hero Section */}
        <StaggeredFadeIn index={0} baseDelay={0} staggerDelay={0}>
          <View style={styles.heroSection}>
            {/* Header with greeting and avatar */}
            <View style={styles.heroHeader}>
              <View style={styles.greetingContainer}>
                <Text style={styles.heroGreeting}>
                  {getGreeting()}{userName ? ',' : ''}
                </Text>
                {userName && (
                  <Text style={styles.heroName}>{userName}</Text>
                )}
                <Text style={styles.heroDate}>{dateString}</Text>
              </View>
              <TouchableOpacity
                style={styles.avatarButton}
                onPress={handleAccountPress}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={[Colors.burnishedGold, Colors.goldLight]}
                  style={styles.avatarGradient}
                >
                  <Ionicons name="person" size={20} color={Colors.white} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </StaggeredFadeIn>

        {/* Progress Snapshot Section */}
        <StaggeredFadeIn index={1} baseDelay={100}>
          <View style={styles.progressSection}>
            <Card variant="elevated" style={styles.progressCard}>
              <View style={styles.progressContent}>
                {/* Progress Ring */}
                <View style={styles.progressRingWrapper}>
                  <ProgressRing
                    progress={progressPercentage}
                    size={140}
                    strokeWidth={12}
                    label="Alignment"
                    sublabel="with daily goals"
                  />
                </View>

                {/* Streak Timeline */}
                <View style={styles.streakWrapper}>
                  <StreakTimeline
                    days={getStreakDays()}
                    currentStreak={currentStreak}
                  />
                </View>
              </View>

              {/* Quick insight */}
              <View style={styles.insightCard}>
                <Ionicons name="sparkles" size={16} color={Colors.burnishedGold} />
                <Text style={styles.insightText}>
                  {progressPercentage === 100
                    ? "Perfect alignment today. Well done."
                    : progressPercentage > 50
                    ? "Making great progress. Keep the momentum."
                    : currentStreak > 3
                    ? `${currentStreak} day streak! Consistency is key.`
                    : "Start with one small action today."}
                </Text>
              </View>
            </Card>
          </View>
        </StaggeredFadeIn>

        {/* Active Coach Card */}
        {activeCoach && (
          <StaggeredFadeIn index={2} baseDelay={200}>
            <TouchableOpacity
              style={styles.activeCoachCard}
              onPress={handleOpenChat}
              activeOpacity={0.95}
            >
              <LinearGradient
                colors={[Colors.midnightEmerald, '#243D2E']}
                style={styles.coachGradient}
              >
                <View style={styles.coachContent}>
                  <CoachIcon
                    iconName={activeCoach.icon_name}
                    color={Colors.burnishedGold}
                    size="md"
                  />
                  <View style={styles.coachInfo}>
                    <Text style={styles.coachLabel}>Your Active Coach</Text>
                    <Text style={styles.coachName}>{activeCoach.name}</Text>
                  </View>
                  <View style={styles.resumeButton}>
                    <Text style={styles.resumeText}>Resume</Text>
                    <Ionicons name="arrow-forward" size={14} color={Colors.burnishedGold} />
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </StaggeredFadeIn>
        )}

        {/* Quick Actions */}
        <StaggeredFadeIn index={3} baseDelay={300}>
          <View style={styles.quickActionsContainer}>
            <QuickActions actions={quickActions} baseDelay={400} />
          </View>
        </StaggeredFadeIn>

        {/* Flashback - From Your Archive */}
        {flashbackInsight && (
          <StaggeredFadeIn index={4} baseDelay={400}>
            <View style={styles.flashbackSection}>
              <FlashbackCard
                insight={flashbackInsight.insight}
                type={flashbackInsight.type}
                onPress={handleFlashbackPress}
              />
            </View>
          </StaggeredFadeIn>
        )}

        {/* Featured Card - Editorial Magazine Style */}
        {featuredCoach && (
          <StaggeredFadeIn index={5} baseDelay={450}>
            <View style={styles.featuredSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Featured</Text>
              </View>
              <FeaturedCard
                type="coach"
                title={featuredCoach.name}
                subtitle={featuredCoach.tagline}
                description={featuredCoach.method}
                iconName={featuredCoach.icon_name}
                accentColor={featuredCoach.color}
                badge="Premium"
                onPress={handleFeaturedPress}
                delay={500}
              />
            </View>
          </StaggeredFadeIn>
        )}

        {/* Today's Focus */}
        <StaggeredFadeIn index={6} baseDelay={500}>
          <View style={styles.focusSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Today&apos;s Focus</Text>
              <Text style={styles.sectionSubtitle}>Top 3 Priorities</Text>
            </View>

            <Card variant="elevated" style={styles.prioritiesCard}>
              <View style={styles.prioritiesList}>
                {displayPriorities.slice(0, 3).map((priority, index) => (
                  <PriorityItem
                    key={priority.id}
                    priority={priority}
                    index={index + 1}
                    delay={600 + index * 100}
                  />
                ))}
              </View>

              <Button
                title="Begin Check-in"
                onPress={handleStartCheckIn}
                variant="gold"
                fullWidth
                size="lg"
                style={styles.checkInButton}
              />
            </Card>
          </View>
        </StaggeredFadeIn>

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <StaggeredFadeIn index={7} baseDelay={700}>
            <View style={styles.sessionsSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Sessions</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.sessionsScroll}
              >
                {recentSessions.map((session, index) => (
                  <SessionCard key={session.id} session={session} index={index} />
                ))}
              </ScrollView>
            </View>
          </StaggeredFadeIn>
        )}

        {/* Spacer for tab bar */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

function PriorityItem({
  priority,
  index,
  delay,
}: {
  priority: Priority;
  index: number;
  delay: number;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(-20);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 500 }));
    translateX.value = withDelay(delay, withSpring(0, Timing.springGentle));
  }, [delay, opacity, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateX: translateX.value }],
    opacity: opacity.value,
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSpring(0.98, Timing.springBouncy);
    setTimeout(() => {
      scale.value = withSpring(1, Timing.springBouncy);
    }, 100);
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={styles.priorityItem}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <View style={styles.priorityNumber}>
          <Text style={styles.priorityNumberText}>{index}</Text>
        </View>
        <Text
          style={[
            styles.priorityText,
            priority.completed && styles.priorityTextCompleted,
          ]}
        >
          {priority.title}
        </Text>
        <View
          style={[
            styles.priorityCheckbox,
            priority.completed && styles.priorityCheckboxCompleted,
          ]}
        >
          {priority.completed && (
            <Ionicons name="checkmark" size={14} color={Colors.white} />
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function SessionCard({ session, index }: { session: Session; index: number }) {
  const formattedDate = new Date(session.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <Animated.View entering={FadeInUp.duration(500).delay(800 + index * 100)}>
      <Card style={styles.sessionCard} variant="glass">
        <View style={styles.sessionMeta}>
          <Ionicons name="chatbubble-outline" size={14} color={Colors.stoneGray} />
          <Text style={styles.sessionDate}>{formattedDate}</Text>
        </View>
        <Text style={styles.sessionTitle} numberOfLines={2}>
          {session.title}
        </Text>
      </Card>
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

  // Hero Section
  heroSection: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greetingContainer: {
    flex: 1,
  },
  heroGreeting: {
    fontSize: Typography.sizes.display,
    fontWeight: Typography.weights.light,
    color: Colors.midnightEmerald,
    fontFamily: Typography.fonts.serif,
    letterSpacing: Typography.letterSpacing.tight,
  },
  heroName: {
    fontSize: Typography.sizes.display,
    fontWeight: Typography.weights.semibold,
    color: Colors.midnightEmerald,
    fontFamily: Typography.fonts.serif,
    letterSpacing: Typography.letterSpacing.tight,
    marginTop: -4,
  },
  heroDate: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
    marginTop: Spacing.sm,
    letterSpacing: Typography.letterSpacing.wide,
  },
  avatarButton: {
    padding: 2,
  },
  avatarGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.gold,
  },

  // Progress Section
  progressSection: {
    paddingHorizontal: Spacing.xxl,
    marginBottom: Spacing.lg,
  },
  progressCard: {
    padding: Spacing.xl,
  },
  progressContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  progressRingWrapper: {
    marginRight: Spacing.xl,
  },
  streakWrapper: {
    flex: 1,
  },

  // Insight Card
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.goldMuted,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.xl,
    gap: Spacing.sm,
  },
  insightText: {
    fontSize: Typography.sizes.body,
    color: Colors.charcoal,
    fontStyle: 'italic',
    flex: 1,
  },

  // Active Coach Card
  activeCoachCard: {
    marginHorizontal: Spacing.xxl,
    marginBottom: Spacing.lg,
    borderRadius: Radius.squircle,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  coachGradient: {
    padding: Spacing.xl,
  },
  coachContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coachInfo: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  coachLabel: {
    fontSize: Typography.sizes.caption,
    color: Colors.goldLight,
    letterSpacing: Typography.letterSpacing.wider,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  coachName: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
    fontFamily: Typography.fonts.serif,
  },
  resumeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    gap: Spacing.xs,
  },
  resumeText: {
    fontSize: Typography.sizes.caption,
    color: Colors.burnishedGold,
    fontWeight: Typography.weights.medium,
  },

  // Quick Actions
  quickActionsContainer: {
    paddingHorizontal: Spacing.xxl,
    marginBottom: Spacing.lg,
  },

  // Flashback Section
  flashbackSection: {
    paddingHorizontal: Spacing.xxl,
    marginBottom: Spacing.lg,
  },

  // Featured Section
  featuredSection: {
    paddingHorizontal: Spacing.xxl,
    marginBottom: Spacing.xxl,
  },

  // Focus Section
  focusSection: {
    paddingHorizontal: Spacing.xxl,
    marginBottom: Spacing.xxl,
  },

  // Section Headers
  sectionHeader: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.semibold,
    color: Colors.midnightEmerald,
    fontFamily: Typography.fonts.serif,
  },
  sectionSubtitle: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
    marginTop: Spacing.xs,
  },

  // Priorities Card
  prioritiesCard: {
    padding: Spacing.xl,
  },
  prioritiesList: {
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  priorityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  priorityNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  priorityNumberText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    color: Colors.burnishedGold,
    fontFamily: Typography.fonts.serif,
  },
  priorityText: {
    flex: 1,
    fontSize: Typography.sizes.bodyLarge,
    color: Colors.charcoal,
    lineHeight: Typography.sizes.bodyLarge * Typography.lineHeights.relaxed,
  },
  priorityTextCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.stoneGray,
  },
  priorityCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityCheckboxCompleted: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  checkInButton: {
    marginTop: Spacing.sm,
  },

  // Sessions
  sessionsSection: {
    marginBottom: Spacing.lg,
  },
  sessionsScroll: {
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.md,
  },
  sessionCard: {
    width: SCREEN_WIDTH * 0.45,
    marginRight: Spacing.md,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  sessionDate: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
  },
  sessionTitle: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.charcoal,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },

  bottomSpacer: {
    height: 100,
  },
});
