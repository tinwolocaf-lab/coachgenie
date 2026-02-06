import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Pressable,
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
  withSequence,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { CoachIcon } from '@/components/ui/CoachIcon';
import { StreakTimeline } from '@/components/ui/StreakTimeline';
import { FeaturedCard } from '@/components/ui/FeaturedCard';
import { QuickActions } from '@/components/ui/QuickActions';
import { StaggeredFadeIn } from '@/components/ui/AnimatedContainer';
import { FlashbackCard } from '@/components/archive/FlashbackCard';
import { FluidProgressBar } from '@/components/rituals/FluidProgressBar';
import { Coach, Session, DayPlan, Priority, KeyInsight, TodayPractice, TimeOfDay } from '@/types';
import { getCoachById, SAMPLE_COACHES } from '@/data/coaches';
import {
  getActiveCoachId,
  getSessions,
  getDayPlan,
  getInstalledCoaches,
} from '@/store/app';
import { useAuthSafe } from '@/hooks/useConditionalAuth';
import { getFlashbackInsights } from '@/lib/supabase-archive';
import { getTodayPractice, getTimeOfDay } from '@/lib/supabase-rituals';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  const { palette } = useThemeSafe();
  const auth = useAuthSafe();

  const [activeCoach, setActiveCoach] = useState<Coach | null>(null);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [todayPlan, setTodayPlan] = useState<DayPlan | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState<string>('');
  const [currentStreak, setCurrentStreak] = useState(3);
  const [featuredCoach, setFeaturedCoach] = useState<Coach | null>(null);
  const [flashbackInsight, setFlashbackInsight] = useState<{ insight: KeyInsight; type: 'monthAgo' | 'yearAgo' } | null>(null);
  const [todayPractice, setTodayPractice] = useState<TodayPractice | null>(null);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(getTimeOfDay());

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

  // Get user name from auth and load flashback insights + practice data
  useEffect(() => {
    if (auth?.user) {
      const userId = auth.user.id;
      const metadata = auth.user.user_metadata || {};
      const name = metadata.full_name || metadata.name || auth.user.email?.split('@')[0] || '';
      setUserName(name.split(' ')[0]); // First name only

      // Load flashback insights
      const loadFlashback = async () => {
        try {
          const flashbacks = await getFlashbackInsights(userId);
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

      // Load today's practice data
      const loadPractice = async () => {
        try {
          const practice = await getTodayPractice(userId);
          setTodayPractice(practice);
          if (practice.streakDays > 0) {
            setCurrentStreak(practice.streakDays);
          }
        } catch (error) {
          console.log('No practice data available:', error);
        }
      };
      loadPractice();
    }
  }, [auth?.user]);

  // Update time of day periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeOfDay(getTimeOfDay());
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

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

  const handleMorningPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/rituals/morning');
  };

  const handleEveningPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/rituals/evening');
  };

  const handlePracticePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/rituals');
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
      id: 'practice',
      label: 'The Practice',
      icon: 'leaf-outline' as keyof typeof Ionicons.glyphMap,
      onPress: handlePracticePress,
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
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.accent}
          />
        }
      >
        {/* Editorial Hero Section */}
        <StaggeredFadeIn index={0} baseDelay={0} staggerDelay={0}>
          <View style={styles.heroSection}>
            {/* Header with greeting and avatar */}
            <View style={styles.heroHeader}>
              <View style={styles.greetingContainer}>
                <Text style={[styles.heroGreeting, { color: palette.textPrimary }]}>
                  {getGreeting()}{userName ? ',' : ''}
                </Text>
                {userName && (
                  <Text style={[styles.heroName, { color: palette.textPrimary }]}>{userName}</Text>
                )}
                <Text style={[styles.heroDate, { color: palette.textTertiary }]}>{dateString}</Text>
              </View>
              <TouchableOpacity
                style={styles.avatarButton}
                onPress={handleAccountPress}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={[palette.accent, palette.accentLight]}
                  style={[styles.avatarGradient, { shadowColor: palette.accent }]}
                >
                  <Ionicons name="person" size={20} color={palette.textInverse} />
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
              <View style={[styles.insightCard, { backgroundColor: palette.accentMuted }]}>
                <Ionicons name="sparkles" size={16} color={palette.accent} />
                <Text style={[styles.insightText, { color: palette.textSecondary }]}>
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
              style={[styles.activeCoachCard, { shadowColor: palette.shadowColor }]}
              onPress={handleOpenChat}
              activeOpacity={0.95}
            >
              <LinearGradient
                colors={[palette.gradientStart, palette.gradientEnd]}
                style={styles.coachGradient}
              >
                <View style={styles.coachContent}>
                  <CoachIcon
                    iconName={activeCoach.icon_name}
                    color={palette.accent}
                    size="md"
                  />
                  <View style={styles.coachInfo}>
                    <Text style={[styles.coachLabel, { color: palette.accentLight }]}>Your Active Coach</Text>
                    <Text style={[styles.coachName, { color: palette.textInverse }]}>{activeCoach.name}</Text>
                  </View>
                  <View style={styles.resumeButton}>
                    <Text style={[styles.resumeText, { color: palette.accent }]}>Resume</Text>
                    <Ionicons name="arrow-forward" size={14} color={palette.accent} />
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </StaggeredFadeIn>
        )}

        {/* Today's Practice - Time-Sensitive Action Cards */}
        {auth?.user && (
          <StaggeredFadeIn index={3} baseDelay={250}>
            <View style={styles.practiceSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.practiceHeaderRow}>
                  <Text style={styles.sectionTitle}>Today&apos;s Practice</Text>
                  <TouchableOpacity onPress={handlePracticePress} style={styles.practiceViewAll}>
                    <Text style={styles.viewAllText}>View All</Text>
                    <Ionicons name="chevron-forward" size={14} color={Colors.burnishedGold} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Time-Sensitive Action Card */}
              <PracticeActionCard
                timeOfDay={timeOfDay}
                morningCompleted={!!todayPractice?.morningReflection}
                eveningCompleted={!!todayPractice?.eveningReflection}
                onMorningPress={handleMorningPress}
                onEveningPress={handleEveningPress}
              />

              {/* Mini Rituals Progress */}
              {todayPractice && todayPractice.rituals.length > 0 && (
                <TouchableOpacity
                  style={styles.miniRitualsCard}
                  onPress={handlePracticePress}
                  activeOpacity={0.95}
                >
                  <View style={styles.miniRitualsHeader}>
                    <View style={styles.miniRitualsLabel}>
                      <Ionicons name="leaf" size={16} color={Colors.midnightEmerald} />
                      <Text style={styles.miniRitualsTitle}>Daily Rituals</Text>
                    </View>
                    <View style={styles.miniRitualsProgress}>
                      <Text style={styles.miniRitualsPercent}>{todayPractice.overallProgress}%</Text>
                      {todayPractice.streakDays > 0 && (
                        <View style={styles.miniStreakBadge}>
                          <Text style={styles.miniStreakText}>{todayPractice.streakDays}</Text>
                          <Text style={styles.miniFireEmoji}>🔥</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.miniProgressBarWrapper}>
                    <FluidProgressBar
                      progress={todayPractice.overallProgress}
                      height={8}
                      color={Colors.midnightEmerald}
                    />
                  </View>
                  <View style={styles.miniRitualsList}>
                    {todayPractice.rituals.slice(0, 3).map((ritual) => (
                      <View key={ritual.id} style={styles.miniRitualItem}>
                        <View style={[
                          styles.miniRitualCheck,
                          ritual.is_completed_today && styles.miniRitualCheckDone
                        ]}>
                          {ritual.is_completed_today && (
                            <Ionicons name="checkmark" size={10} color={Colors.white} />
                          )}
                        </View>
                        <Text style={[
                          styles.miniRitualText,
                          ritual.is_completed_today && styles.miniRitualTextDone
                        ]} numberOfLines={1}>
                          {ritual.title}
                        </Text>
                      </View>
                    ))}
                    {todayPractice.rituals.length > 3 && (
                      <Text style={styles.miniRitualMore}>
                        +{todayPractice.rituals.length - 3} more
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </StaggeredFadeIn>
        )}

        {/* Quick Actions */}
        <StaggeredFadeIn index={4} baseDelay={350}>
          <View style={styles.quickActionsContainer}>
            <QuickActions actions={quickActions} baseDelay={400} />
          </View>
        </StaggeredFadeIn>

        {/* Flashback - From Your Archive */}
        {flashbackInsight && (
          <StaggeredFadeIn index={5} baseDelay={450}>
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
          <StaggeredFadeIn index={6} baseDelay={500}>
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
        <StaggeredFadeIn index={7} baseDelay={550}>
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
          <StaggeredFadeIn index={8} baseDelay={650}>
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

// Time-Sensitive Practice Action Card
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function PracticeActionCard({
  timeOfDay,
  morningCompleted,
  eveningCompleted,
  onMorningPress,
  onEveningPress,
}: {
  timeOfDay: TimeOfDay;
  morningCompleted: boolean;
  eveningCompleted: boolean;
  onMorningPress: () => void;
  onEveningPress: () => void;
}) {
  const scale = useSharedValue(1);

  // Determine which card to show based on time of day
  const showMorning = timeOfDay === 'morning' || timeOfDay === 'afternoon';

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSequence(
      withTiming(0.98, { duration: 100 }),
      withSpring(1, Timing.springBouncy)
    );
    if (showMorning) {
      onMorningPress();
    } else {
      onEveningPress();
    }
  };

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isMorning = showMorning;
  const isCompleted = isMorning ? morningCompleted : eveningCompleted;
  const gradientColors: [string, string] = isMorning
    ? [Colors.goldMuted, Colors.warmOatmealDark]
    : [Colors.midnightEmerald + '20', Colors.warmOatmealDark];

  const iconName = isMorning ? 'sunny' : 'moon';
  const iconColor = isMorning ? Colors.burnishedGold : Colors.midnightEmerald;
  const title = isMorning ? 'Morning Intention' : 'Evening Audit';
  const subtitle = isMorning
    ? 'Set your focus for today'
    : 'Reflect on your day';

  return (
    <AnimatedPressable onPress={handlePress} style={cardStyle}>
      <LinearGradient
        colors={gradientColors}
        style={[styles.practiceActionCard, isCompleted && styles.practiceActionCompleted]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.practiceActionContent}>
          <View style={[styles.practiceActionIcon, { backgroundColor: iconColor + '20' }]}>
            <Ionicons name={iconName} size={24} color={iconColor} />
          </View>
          <View style={styles.practiceActionText}>
            <Text style={styles.practiceActionTitle}>{title}</Text>
            <Text style={styles.practiceActionSubtitle}>{subtitle}</Text>
          </View>
          {isCompleted ? (
            <View style={styles.practiceCompletedBadge}>
              <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
            </View>
          ) : (
            <View style={styles.practiceActionArrow}>
              <Ionicons name="arrow-forward" size={18} color={iconColor} />
            </View>
          )}
        </View>
      </LinearGradient>
    </AnimatedPressable>
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

  // Practice Section
  practiceSection: {
    paddingHorizontal: Spacing.xxl,
    marginBottom: Spacing.lg,
  },
  practiceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  practiceViewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  viewAllText: {
    fontSize: Typography.sizes.caption,
    color: Colors.burnishedGold,
    fontWeight: Typography.weights.medium,
    letterSpacing: Typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  practiceActionCard: {
    borderRadius: Radius.squircle,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.sm,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  practiceActionCompleted: {
    opacity: 0.8,
  },
  practiceActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  practiceActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  practiceActionText: {
    flex: 1,
  },
  practiceActionTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    color: Colors.midnightEmerald,
    marginBottom: 2,
  },
  practiceActionSubtitle: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
  },
  practiceCompletedBadge: {
    backgroundColor: Colors.successLight,
    borderRadius: 16,
    padding: 4,
  },
  practiceActionArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.warmOatmealDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniRitualsCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.squircle,
    padding: Spacing.lg,
    ...Shadows.subtle,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  miniRitualsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  miniRitualsLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  miniRitualsTitle: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    color: Colors.charcoal,
  },
  miniRitualsProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  miniRitualsPercent: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.bold,
    color: Colors.midnightEmerald,
    fontFamily: Typography.fonts.serif,
  },
  miniStreakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.goldMuted,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: Radius.pill,
  },
  miniStreakText: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.bold,
    color: Colors.charcoal,
  },
  miniFireEmoji: {
    fontSize: 10,
    marginLeft: 2,
  },
  miniProgressBarWrapper: {
    marginBottom: Spacing.md,
  },
  miniRitualsList: {
    gap: Spacing.sm,
  },
  miniRitualItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  miniRitualCheck: {
    width: 16,
    height: 16,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniRitualCheckDone: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  miniRitualText: {
    flex: 1,
    fontSize: Typography.sizes.body,
    color: Colors.charcoal,
  },
  miniRitualTextDone: {
    color: Colors.stoneGray,
    textDecorationLine: 'line-through',
  },
  miniRitualMore: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
    marginLeft: 24,
    fontStyle: 'italic',
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
