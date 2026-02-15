import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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
import { PremiumPageTransition } from '@/components/ui/PremiumPageTransition';
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
  withRepeat,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { Typography, Spacing, Radius, Shadows, Timing, EditorialSpacing } from '@/constants/theme';
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
import { FloatingCard } from '@/components/ui/FloatingCard';
import { ProgressNebula } from '@/components/ui/ProgressNebula';
import { GoldenThread } from '@/components/ui/GoldenThread';
import { RitualCompletionFlourish, RitualCompletionFlourishRef } from '@/components/ui/RitualCompletionFlourish';
import { Coach, Session, DayPlan, Priority, KeyInsight, TodayPractice, TimeOfDay, RitualWithStatus } from '@/types';
import { PaywallBanner } from '@/components/PaywallBanner';
import { CalendarPreview } from '@/components/home/CalendarPreview';
import {
  getCoachByIdResolved,
  listInstalledCoaches as listInstalledCoachesResolved,
  listMarketplaceCoaches,
} from '@/lib/coaches';
import {
  getActiveCoachId,
  getSessions,
  getDayPlan,
} from '@/store/app';
import { useAuthSafe } from '@/hooks/useConditionalAuth';
import { getFlashbackInsights } from '@/lib/supabase-archive';
import { getTodayPractice, getTimeOfDay, completeRitual, uncompleteRitual } from '@/lib/supabase-rituals';
import { getOnboardingData } from '@/lib/onboarding';
import { getCreditStatus, type CreditStatusResponse } from '@/lib/apiClient';

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
  const todayIndex = today === 0 ? 6 : today - 1;

  return days.map((day, index) => ({
    day,
    completed: index < todayIndex,
    isToday: index === todayIndex,
  }));
};

// Identify Featured Ritual based on time of day
interface FeaturedRitual {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: [string, string];
  textColor: string;
  action: () => void;
  isCompleted: boolean;
  timeLabel: string;
}

function getFeaturedRitual(
  timeOfDay: TimeOfDay,
  morningCompleted: boolean,
  eveningCompleted: boolean,
  onMorning: () => void,
  onEvening: () => void,
  onCheckIn: () => void,
  palette: ReturnType<typeof useThemeSafe>['palette'],
): FeaturedRitual {
  switch (timeOfDay) {
    case 'morning':
      return {
        id: 'morning-intention',
        title: 'Morning Intention',
        subtitle: 'Set your focus and align your energy for today',
        icon: 'sunny',
        gradient: [palette.accent, palette.accentLight],
        textColor: palette.textInverse,
        action: onMorning,
        isCompleted: morningCompleted,
        timeLabel: 'MORNING RITUAL',
      };
    case 'afternoon':
      return {
        id: 'midday-checkin',
        title: morningCompleted ? 'Afternoon Check-in' : 'Morning Intention',
        subtitle: morningCompleted
          ? 'Realign with your priorities and adjust course'
          : 'Set your intention for the rest of the day',
        icon: morningCompleted ? 'compass' : 'sunny',
        gradient: [palette.gradientStart, palette.gradientEnd],
        textColor: '#FFFFFF',
        action: morningCompleted ? onCheckIn : onMorning,
        isCompleted: false,
        timeLabel: morningCompleted ? 'AFTERNOON FOCUS' : 'MORNING RITUAL',
      };
    case 'evening':
      return {
        id: 'evening-audit',
        title: 'Evening Audit',
        subtitle: 'Reflect on your day and capture what matters',
        icon: 'moon',
        gradient: [palette.gradientStart, palette.gradientEnd],
        textColor: '#FFFFFF',
        action: onEvening,
        isCompleted: eveningCompleted,
        timeLabel: 'EVENING RITUAL',
      };
    default:
      return {
        id: 'evening-audit',
        title: 'Evening Audit',
        subtitle: 'Close the day with intention',
        icon: 'moon',
        gradient: [palette.gradientStart, palette.gradientEnd],
        textColor: '#FFFFFF',
        action: onEvening,
        isCompleted: eveningCompleted,
        timeLabel: 'NIGHT RITUAL',
      };
  }
}

export default function HomeScreen() {
  const router = useRouter();
  const { palette, subscriptionTier } = useThemeSafe();
  const auth = useAuthSafe();
  const [bannerDismissed, setBannerDismissed] = useState(false);

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
  const [creditStatus, setCreditStatus] = useState<CreditStatusResponse | null>(null);

  const flourishRef = useRef<RitualCompletionFlourishRef>(null);

  const loadData = useCallback(async () => {
    try {
      const [marketplaceCoaches, installedCoaches] = await Promise.all([
        listMarketplaceCoaches(),
        listInstalledCoachesResolved(),
      ]);

      const activeId = await getActiveCoachId();
      if (activeId) {
        const coach = await getCoachByIdResolved(activeId);
        setActiveCoach(coach || null);
      }

      const sessions = await getSessions();
      setRecentSessions(sessions.slice(0, 3));

      const today = new Date().toISOString().split('T')[0];
      const plan = await getDayPlan(today);
      setTodayPlan(plan);

      const installedIds = installedCoaches.map(c => c.coach_id);

      const uninstalledCoaches = marketplaceCoaches.filter(c => !installedIds.includes(c.id));
      if (uninstalledCoaches.length > 0) {
        setFeaturedCoach(uninstalledCoaches[0]);
      } else {
        setFeaturedCoach(marketplaceCoaches[0] ?? null);
      }

      const sessionCount = sessions.length;
      setCurrentStreak(Math.min(sessionCount + 1, 7));
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const loadUserName = async () => {
      const user = auth.user;
      if (user) {
        const metadata = user.user_metadata || {};
        const name = metadata.full_name || metadata.name || user.email?.split('@')[0] || '';
        setUserName(name.split(' ')[0]);
      } else {
        // Guest mode - try to get name from onboarding data
        try {
          const onboardingData = await getOnboardingData();
          if (onboardingData.name) {
            setUserName(onboardingData.name.split(' ')[0]);
          }
        } catch {
          // Silently ignore - user will just see greeting without name
        }
      }
    };
    loadUserName();

    const user = auth.user;
    if (!user) return;

    const loadFlashback = async () => {
      try {
        const flashbacks = await getFlashbackInsights(user.id);
        if (flashbacks.yearAgo) {
          setFlashbackInsight({ insight: flashbacks.yearAgo, type: 'yearAgo' });
        } else if (flashbacks.monthAgo) {
          setFlashbackInsight({ insight: flashbacks.monthAgo, type: 'monthAgo' });
        }
      } catch (error) {
        if (__DEV__) {
          console.log('No flashback insights available:', error);
        }
      }
    };
    loadFlashback();

    const loadPractice = async () => {
      try {
        const practice = await getTodayPractice(user.id);
        setTodayPractice(practice);
        if (practice.streakDays > 0) {
          setCurrentStreak(practice.streakDays);
        }
      } catch (error) {
        if (__DEV__) {
          console.log('No practice data available:', error);
        }
      }
    };
    loadPractice();
  }, [auth.user]);

  useEffect(() => {
    let isCancelled = false;

    if (!auth.user) {
      setCreditStatus(null);
      return () => {
        isCancelled = true;
      };
    }

    const loadCreditStatus = async () => {
      try {
        const status = await getCreditStatus();
        if (!isCancelled) {
          setCreditStatus(status);
        }
      } catch {
        if (!isCancelled) {
          setCreditStatus(null);
        }
      }
    };

    void loadCreditStatus();
    return () => {
      isCancelled = true;
    };
  }, [auth.user, subscriptionTier]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeOfDay(getTimeOfDay());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    if (auth.user) {
      try {
        const practice = await getTodayPractice(auth.user.id);
        setTodayPractice(practice);
      } catch {
        // Silently handle
      }
    }
    setRefreshing(false);
  }, [loadData, auth.user]);

  const handleStartCheckIn = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (activeCoach) {
      router.push(`/chat/${activeCoach.id}`);
    } else {
      router.push('/(tabs)/coaches');
    }
  }, [activeCoach, router]);

  const handleOpenChat = useCallback(() => {
    if (activeCoach) {
      router.push(`/chat/${activeCoach.id}`);
    }
  }, [activeCoach, router]);

  const handleAccountPress = useCallback(() => {
    router.push('/account');
  }, [router]);

  const handleFeaturedPress = useCallback(() => {
    if (featuredCoach) {
      router.push(`/coach/${featuredCoach.id}`);
    }
  }, [featuredCoach, router]);

  const handleFlashbackPress = useCallback(() => {
    if (flashbackInsight) {
      router.push(`/archive/insight/${flashbackInsight.insight.id}`);
    }
  }, [flashbackInsight, router]);

  const handleMorningPress = useCallback(() => {
    router.push('/rituals/morning');
  }, [router]);

  const handleEveningPress = useCallback(() => {
    router.push('/rituals/evening');
  }, [router]);

  const handlePracticePress = useCallback(() => {
    router.push('/rituals');
  }, [router]);

  const handleOraclePress = useCallback(() => {
    router.push('/oracle');
  }, [router]);

  const handleArchivePress = useCallback(() => {
    router.push('/archive');
  }, [router]);

  const handleVaultPress = useCallback(() => {
    router.push('/(tabs)/vault');
  }, [router]);

  // Ritual toggle handler with flourish animation
  const handleRitualToggle = async (ritualId: string, isCompleted: boolean) => {
    if (!auth.user) return;

    try {
      if (isCompleted) {
        await completeRitual(auth.user.id, ritualId);
        // Trigger completion flourish
        flourishRef.current?.trigger();
      } else {
        await uncompleteRitual(auth.user.id, ritualId);
      }

      if (todayPractice) {
        const updatedRituals = todayPractice.rituals.map(r =>
          r.id === ritualId ? { ...r, is_completed_today: isCompleted } : r
        );
        const completedCount = updatedRituals.filter(r => r.is_completed_today).length;
        const totalCount = updatedRituals.length;
        const overallProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

        setTodayPractice({
          ...todayPractice,
          rituals: updatedRituals,
          overallProgress,
        });
      }
    } catch (error) {
      console.error('Error toggling ritual:', error);
    }
  };

  const dateString = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const priorities: Priority[] = useMemo(
    () => todayPlan?.top_priorities || [],
    [todayPlan],
  );
  const completedCount = useMemo(
    () => priorities.filter((priority) => priority.completed).length,
    [priorities],
  );
  const totalCount = priorities.length;
  const progressPercentage = useMemo(
    () => (totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0),
    [completedCount, totalCount],
  );

  const nebulaProgress = todayPractice?.overallProgress ?? progressPercentage;

  const displayPriorities = useMemo(
    () => (
      priorities.length > 0
        ? priorities
        : [
            { id: '1', title: 'Start your first check-in', completed: false, order: 1 },
            { id: '2', title: 'Explore the Coach Library', completed: false, order: 2 },
            { id: '3', title: 'Review your Context Vault', completed: false, order: 3 },
          ]
    ),
    [priorities],
  );

  const featuredRitual = useMemo(
    () => getFeaturedRitual(
      timeOfDay,
      !!todayPractice?.morningReflection,
      !!todayPractice?.eveningReflection,
      handleMorningPress,
      handleEveningPress,
      handleStartCheckIn,
      palette,
    ),
    [
      handleEveningPress,
      handleMorningPress,
      handleStartCheckIn,
      palette,
      timeOfDay,
      todayPractice?.eveningReflection,
      todayPractice?.morningReflection,
    ],
  );

  const quickActions = useMemo(
    () => [
      {
        id: 'oracle',
        label: 'The Oracle',
        icon: 'eye-outline' as keyof typeof Ionicons.glyphMap,
        onPress: handleOraclePress,
      },
      {
        id: 'practice',
        label: 'The Practice',
        icon: 'leaf-outline' as keyof typeof Ionicons.glyphMap,
        onPress: handlePracticePress,
      },
      {
        id: 'archive',
        label: 'The Archive',
        icon: 'library-outline' as keyof typeof Ionicons.glyphMap,
        onPress: handleArchivePress,
      },
      {
        id: 'vault',
        label: 'Context Vault',
        icon: 'diamond-outline' as keyof typeof Ionicons.glyphMap,
        onPress: handleVaultPress,
      },
    ],
    [handleArchivePress, handleOraclePress, handlePracticePress, handleVaultPress],
  );

  const streakDays = getStreakDays();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Progress Nebula - atmospheric glow behind everything */}
      <ProgressNebula progress={nebulaProgress} />

      {/* Ritual Completion Flourish overlay */}
      <RitualCompletionFlourish ref={flourishRef} />

      <PremiumPageTransition>
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
          {/* ═══════════════════════════════════════════════════════ */}
          {/* BREATHING HEADER - Generous white space sanctuary      */}
          {/* ═══════════════════════════════════════════════════════ */}
          <StaggeredFadeIn index={0} baseDelay={0} staggerDelay={0}>
            <View style={styles.heroSection}>
              <View style={styles.heroHeader}>
                <View style={styles.greetingContainer}>
                  <Text style={[styles.heroGreeting, { color: palette.textPrimary }]}>
                    {getGreeting()}{userName ? ',' : ''}
                  </Text>
                  {userName && (
                    <Text style={[styles.heroName, { color: palette.textPrimary }]}>{userName}</Text>
                  )}
                  <Text style={[styles.heroDate, { color: palette.textTertiary }]}>{dateString}</Text>
                  {creditStatus ? (
                    <View style={[styles.creditBadge, { backgroundColor: palette.accentMuted, borderColor: palette.borderAccent }]}>
                      <Ionicons name="flash-outline" size={12} color={palette.accent} />
                      <Text style={[styles.creditBadgeText, { color: palette.textSecondary }]}>
                        {creditStatus.balance_credits.toFixed(1)} credits left
                      </Text>
                    </View>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={styles.avatarButton}
                  onPress={handleAccountPress}
                  activeOpacity={0.9}
                >
                  {palette.useGradients ? (
                    <LinearGradient
                      colors={[palette.accent, palette.accentLight]}
                      style={[styles.avatarGradient, { shadowColor: palette.accent }]}
                    >
                      <Ionicons name="person" size={18} color={palette.textInverse} />
                    </LinearGradient>
                  ) : (
                    <View style={[styles.avatarGradient, { backgroundColor: palette.accent, shadowColor: palette.accent }]}>
                      <Ionicons name="person" size={18} color={palette.textInverse} />
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Golden Thread accent line */}
              <View style={styles.heroThreadWrapper}>
                <GoldenThread width="40%" height={1.5} delay={600} />
              </View>
            </View>
          </StaggeredFadeIn>

          {/* ═══════════════════════════════════════════════════════ */}
          {/* PAYWALL BANNER - For free tier users                   */}
          {/* ═══════════════════════════════════════════════════════ */}
          {subscriptionTier === 'free' && !bannerDismissed && (
            <StaggeredFadeIn index={0} baseDelay={50}>
              <View style={styles.paywallBannerSection}>
                <PaywallBanner onDismiss={() => setBannerDismissed(true)} />
              </View>
            </StaggeredFadeIn>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* CALENDAR PREVIEW - When Google Calendar connected      */}
          {/* ═══════════════════════════════════════════════════════ */}
          {subscriptionTier !== 'free' && (
            <StaggeredFadeIn index={1} baseDelay={80}>
              <View style={styles.calendarPreviewSection}>
                <CalendarPreview />
              </View>
            </StaggeredFadeIn>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* FEATURED RITUAL - Dynamic Stack Hero Card              */}
          {/* The primary ritual based on time-of-day, large format  */}
          {/* ═══════════════════════════════════════════════════════ */}
          <StaggeredFadeIn index={1} baseDelay={100}>
            <View style={styles.featuredRitualSection}>
              <Text style={[styles.ritualTimeLabel, { color: palette.textTertiary }]}>
                {featuredRitual.timeLabel}
              </Text>
              <FeaturedRitualCard
                ritual={featuredRitual}
                palette={palette}
              />
            </View>
          </StaggeredFadeIn>

          {/* ═══════════════════════════════════════════════════════ */}
          {/* SECONDARY RITUALS - Clean vertical editorial stack     */}
          {/* ═══════════════════════════════════════════════════════ */}
          {auth.user && todayPractice && todayPractice.rituals.length > 0 && (
            <StaggeredFadeIn index={2} baseDelay={200}>
              <View style={styles.secondaryRitualsSection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Daily Rituals</Text>
                  <TouchableOpacity onPress={handlePracticePress} style={styles.viewAllButton}>
                    <Text style={[styles.viewAllText, { color: palette.accent }]}>View All</Text>
                    <Ionicons name="chevron-forward" size={14} color={palette.accent} />
                  </TouchableOpacity>
                </View>

                {/* Progress bar with golden thread */}
                <View style={styles.ritualProgressWrapper}>
                  <View style={styles.ritualProgressHeader}>
                    <Text style={[styles.ritualProgressLabel, { color: palette.textSecondary }]}>
                      {todayPractice.overallProgress}% complete
                    </Text>
                    {todayPractice.streakDays > 0 && (
                      <View style={[styles.streakBadge, { backgroundColor: palette.accentMuted }]}>
                        <Text style={[styles.streakBadgeText, { color: palette.textPrimary }]}>
                          {todayPractice.streakDays}🔥
                        </Text>
                      </View>
                    )}
                  </View>
                  <GoldenThread
                    variant="progress"
                    progress={todayPractice.overallProgress}
                    height={4}
                  />
                </View>

                {/* Ritual items - clean editorial list */}
                <View style={styles.ritualsList}>
                  {todayPractice.rituals.slice(0, 4).map((ritual, index) => (
                    <SecondaryRitualItem
                      key={ritual.id}
                      ritual={ritual}
                      index={index}
                      palette={palette}
                      onToggle={(completed) => handleRitualToggle(ritual.id, completed)}
                    />
                  ))}
                  {todayPractice.rituals.length > 4 && (
                    <TouchableOpacity
                      style={styles.moreRitualsButton}
                      onPress={handlePracticePress}
                    >
                      <Text style={[styles.moreRitualsText, { color: palette.accent }]}>
                        +{todayPractice.rituals.length - 4} more rituals
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </StaggeredFadeIn>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* PROGRESS SNAPSHOT - Compact editorial metrics          */}
          {/* ═══════════════════════════════════════════════════════ */}
          <StaggeredFadeIn index={3} baseDelay={250}>
            <View style={styles.progressSection}>
              <FloatingCard elevation="medium" style={{ backgroundColor: palette.cardBg }}>
                <View style={styles.progressCardInner}>
                  <View style={styles.progressContent}>
                    <View style={styles.progressRingWrapper}>
                      <ProgressRing
                        progress={progressPercentage}
                        size={120}
                        strokeWidth={10}
                        label="Alignment"
                        sublabel="with daily goals"
                      />
                    </View>
                    <View style={styles.streakWrapper}>
                      <StreakTimeline
                        days={streakDays}
                        currentStreak={currentStreak}
                      />
                    </View>
                  </View>

                  {/* Golden Thread divider */}
                  <View style={styles.progressDivider}>
                    <GoldenThread height={1} delay={400} />
                  </View>

                  {/* Quick insight */}
                  <View style={[styles.insightCard, { backgroundColor: palette.accentMuted }]}>
                    <Ionicons name="sparkles" size={14} color={palette.accent} />
                    <Text style={[styles.insightText, { color: palette.textSecondary }]}>
                      {progressPercentage === 100
                        ? 'Perfect alignment today. Well done.'
                        : progressPercentage > 50
                          ? 'Making great progress. Keep the momentum.'
                          : currentStreak > 3
                            ? `${currentStreak} day streak! Consistency is key.`
                            : 'Start with one small action today.'}
                    </Text>
                  </View>
                </View>
              </FloatingCard>
            </View>
          </StaggeredFadeIn>

          {/* ═══════════════════════════════════════════════════════ */}
          {/* ACTIVE COACH - Floating editorial card                 */}
          {/* ═══════════════════════════════════════════════════════ */}
          {activeCoach && (
            <StaggeredFadeIn index={4} baseDelay={300}>
              <TouchableOpacity
                style={[styles.activeCoachCard, { shadowColor: palette.shadowColor }]}
                onPress={handleOpenChat}
                activeOpacity={0.95}
              >
                {palette.useGradients ? (
                  <LinearGradient
                    colors={[palette.gradientStart, palette.gradientEnd]}
                    style={styles.coachGradient}
                  >
                    <View style={styles.coachContent}>
                      <CoachIcon iconName={activeCoach.icon_name} color={palette.accent} size="md" />
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
                ) : (
                  <View style={[styles.coachGradient, { backgroundColor: palette.gradientStart }]}>
                    <View style={styles.coachContent}>
                      <CoachIcon iconName={activeCoach.icon_name} color={palette.accent} size="md" />
                      <View style={styles.coachInfo}>
                        <Text style={[styles.coachLabel, { color: palette.accentLight }]}>Your Active Coach</Text>
                        <Text style={[styles.coachName, { color: palette.textInverse }]}>{activeCoach.name}</Text>
                      </View>
                      <View style={styles.resumeButton}>
                        <Text style={[styles.resumeText, { color: palette.accent }]}>Resume</Text>
                        <Ionicons name="arrow-forward" size={14} color={palette.accent} />
                      </View>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            </StaggeredFadeIn>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* QUICK ACTIONS - Editorial grid                         */}
          {/* ═══════════════════════════════════════════════════════ */}
          <StaggeredFadeIn index={5} baseDelay={350}>
            <View style={styles.quickActionsContainer}>
              <QuickActions actions={quickActions} baseDelay={400} />
            </View>
          </StaggeredFadeIn>

          {/* ═══════════════════════════════════════════════════════ */}
          {/* FLASHBACK - From Your Archive                          */}
          {/* ═══════════════════════════════════════════════════════ */}
          {flashbackInsight && (
            <StaggeredFadeIn index={6} baseDelay={400}>
              <View style={styles.flashbackSection}>
                <FlashbackCard
                  insight={flashbackInsight.insight}
                  type={flashbackInsight.type}
                  onPress={handleFlashbackPress}
                />
              </View>
            </StaggeredFadeIn>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* FEATURED COACH - Editorial magazine card                */}
          {/* ═══════════════════════════════════════════════════════ */}
          {featuredCoach && (
            <StaggeredFadeIn index={7} baseDelay={450}>
              <View style={styles.featuredSection}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Featured</Text>
                </View>
                <FeaturedCard
                  type="coach"
                  title={featuredCoach.name}
                  subtitle={featuredCoach.tagline}
                  description={featuredCoach.method}
                  iconName={featuredCoach.icon_name}
                  image={featuredCoach.image}
                  accentColor={featuredCoach.color}
                  badge="Premium"
                  onPress={handleFeaturedPress}
                  delay={500}
                />
              </View>
            </StaggeredFadeIn>
          )}

          {/* ═══════════════════════════════════════════════════════ */}
          {/* TODAY'S FOCUS - Top 3 priorities                       */}
          {/* ═══════════════════════════════════════════════════════ */}
          <StaggeredFadeIn index={8} baseDelay={500}>
            <View style={styles.focusSection}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Today&apos;s Focus</Text>
                <Text style={[styles.sectionSubtitle, { color: palette.textTertiary }]}>Top 3 Priorities</Text>
              </View>

              <Card variant="elevated" style={styles.prioritiesCard}>
                <View style={styles.prioritiesList}>
                  {displayPriorities.slice(0, 3).map((priority, index) => (
                    <PriorityItem
                      key={priority.id}
                      priority={priority}
                      index={index + 1}
                      delay={550 + index * 100}
                      palette={palette}
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

          {/* ═══════════════════════════════════════════════════════ */}
          {/* RECENT SESSIONS - Horizontal editorial scroll          */}
          {/* ═══════════════════════════════════════════════════════ */}
          {recentSessions.length > 0 && (
            <StaggeredFadeIn index={9} baseDelay={600}>
              <View style={styles.sessionsSection}>
                <View style={[styles.sectionHeader, { paddingHorizontal: EditorialSpacing.breathingMargin }]}>
                  <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Recent Sessions</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.sessionsScroll}
                >
                  {recentSessions.map((session, index) => (
                    <SessionCard key={session.id} session={session} index={index} palette={palette} />
                  ))}
                </ScrollView>
              </View>
            </StaggeredFadeIn>
          )}

          {/* Spacer for floating dock */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </PremiumPageTransition>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════
// FEATURED RITUAL CARD - Large, textured, time-of-day hero card
// ═══════════════════════════════════════════════════════════════════

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function FeaturedRitualCard({
  ritual,
  palette,
}: {
  ritual: FeaturedRitual;
  palette: ReturnType<typeof useThemeSafe>['palette'];
}) {
  const scale = useSharedValue(1);
  const shimmerPhase = useSharedValue(0);

  useEffect(() => {
    // Gentle shimmer cycling
    shimmerPhase.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [shimmerPhase]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSequence(
      withTiming(0.97, { duration: 100 }),
      withSpring(1, Timing.springBouncy)
    );
    ritual.action();
  };

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const shimmerOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmerPhase.value, [0, 1], [0, 0.08]),
  }));

  const cardContent = (
    <>
      {/* Shimmer overlay */}
      <Animated.View style={[styles.featuredShimmer, shimmerOverlayStyle]} />

      <View style={styles.featuredCardContent}>
        <View style={[styles.featuredIconContainer, { backgroundColor: `${ritual.textColor}26` }]}>
          <Ionicons name={ritual.icon} size={32} color={ritual.textColor} />
        </View>
        <View style={styles.featuredTextContainer}>
          <Text style={[styles.featuredTitle, { color: ritual.textColor }]}>{ritual.title}</Text>
          <Text style={[styles.featuredSubtitle, { color: `${ritual.textColor}BB` }]}>{ritual.subtitle}</Text>
        </View>
        {ritual.isCompleted ? (
          <View style={styles.featuredCompletedBadge}>
            <Ionicons name="checkmark-circle" size={28} color={ritual.textColor} />
            <Text style={[styles.featuredCompletedText, { color: `${ritual.textColor}CC` }]}>Complete</Text>
          </View>
        ) : (
          <View style={styles.featuredActionRow}>
            <View style={[styles.featuredActionButton, { backgroundColor: `${ritual.textColor}26` }]}>
              <Text style={[styles.featuredActionText, { color: `${ritual.textColor}E6` }]}>Begin</Text>
              <Ionicons name="arrow-forward" size={16} color={`${ritual.textColor}E6`} />
            </View>
          </View>
        )}
      </View>

      {palette.useGradients && (
        <View style={styles.featuredThreadWrapper}>
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.2)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.featuredThread}
          />
        </View>
      )}
    </>
  );

  return (
    <AnimatedPressable onPress={handlePress} style={cardAnimStyle}>
      <View style={[styles.featuredCard, { shadowColor: palette.shadowColor }]}>
        {palette.useGradients ? (
          <LinearGradient
            colors={ritual.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.featuredCardGradient}
          >
            {cardContent}
          </LinearGradient>
        ) : (
          <View style={[styles.featuredCardGradient, { backgroundColor: ritual.gradient[0] }]}>
            {cardContent}
          </View>
        )}
      </View>
    </AnimatedPressable>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SECONDARY RITUAL ITEM - Clean editorial list item
// ═══════════════════════════════════════════════════════════════════

function SecondaryRitualItem({
  ritual,
  index,
  palette,
  onToggle,
}: {
  ritual: RitualWithStatus;
  index: number;
  palette: ReturnType<typeof useThemeSafe>['palette'];
  onToggle: (completed: boolean) => void;
}) {
  const scale = useSharedValue(1);
  const checkScale = useSharedValue(ritual.is_completed_today ? 1 : 0);
  const textOpacity = useSharedValue(ritual.is_completed_today ? 0.5 : 1);

  useEffect(() => {
    checkScale.value = withSpring(ritual.is_completed_today ? 1 : 0, Timing.springBouncy);
    textOpacity.value = withTiming(ritual.is_completed_today ? 0.5 : 1, { duration: 300 });
  }, [ritual.is_completed_today, checkScale, textOpacity]);

  const handleToggle = () => {
    const newState = !ritual.is_completed_today;
    Haptics.impactAsync(
      newState ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light
    );
    scale.value = withSequence(
      withTiming(0.97, { duration: 80 }),
      withSpring(1, Timing.springBouncy)
    );
    onToggle(newState);
  };

  const itemStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const checkAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  return (
    <AnimatedPressable onPress={handleToggle} style={[styles.secondaryRitualItem, itemStyle]}>
      <View
        style={[
          styles.ritualCheckbox,
          {
            borderColor: ritual.is_completed_today ? palette.success : palette.border,
            backgroundColor: ritual.is_completed_today ? palette.success : 'transparent',
          },
        ]}
      >
        {ritual.is_completed_today && (
          <Animated.View style={checkAnimStyle}>
            <Ionicons name="checkmark" size={12} color={palette.textInverse} />
          </Animated.View>
        )}
      </View>
      <Animated.Text
        style={[
          styles.ritualItemTitle,
          { color: palette.textPrimary },
          ritual.is_completed_today && styles.ritualItemTitleDone,
          textStyle,
        ]}
        numberOfLines={1}
      >
        {ritual.title}
      </Animated.Text>
      {(ritual.streak_count ?? 0) > 0 && (
        <Text style={[styles.ritualStreakMini, { color: palette.textTertiary }]}>
          {ritual.streak_count}d
        </Text>
      )}
    </AnimatedPressable>
  );
}

// ═══════════════════════════════════════════════════════════════════
// PRIORITY ITEM - Animated numbered item
// ═══════════════════════════════════════════════════════════════════

function PriorityItem({
  priority,
  index,
  delay,
  palette,
}: {
  priority: Priority;
  index: number;
  delay: number;
  palette: ReturnType<typeof useThemeSafe>['palette'];
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
    scale.value = withSpring(0.98, Timing.springBouncy);
    setTimeout(() => {
      scale.value = withSpring(1, Timing.springBouncy);
    }, 100);
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={[styles.priorityItem, { borderBottomColor: palette.borderLight }]}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <View style={[styles.priorityNumber, { backgroundColor: palette.accentMuted }]}>
          <Text style={[styles.priorityNumberText, { color: palette.accent }]}>{index}</Text>
        </View>
        <Text
          style={[
            styles.priorityText,
            { color: palette.textSecondary },
            priority.completed && styles.priorityTextCompleted,
          ]}
        >
          {priority.title}
        </Text>
        <View
          style={[
            styles.priorityCheckbox,
            { borderColor: palette.border },
            priority.completed && { backgroundColor: palette.success, borderColor: palette.success },
          ]}
        >
          {priority.completed && (
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SESSION CARD - Horizontal scroll card
// ═══════════════════════════════════════════════════════════════════

function SessionCard({
  session,
  index,
  palette,
}: {
  session: Session;
  index: number;
  palette: ReturnType<typeof useThemeSafe>['palette'];
}) {
  const formattedDate = new Date(session.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <Animated.View entering={FadeInUp.duration(500).delay(700 + index * 100)}>
      <Card style={[styles.sessionCard, { borderColor: palette.borderLight }]} variant="glass">
        <View style={styles.sessionMeta}>
          <Ionicons name="chatbubble-outline" size={14} color={palette.textTertiary} />
          <Text style={[styles.sessionDate, { color: palette.textTertiary }]}>{formattedDate}</Text>
        </View>
        <Text style={[styles.sessionTitle, { color: palette.textSecondary }]} numberOfLines={2}>
          {session.title}
        </Text>
      </Card>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing.section,
  },

  // ── HERO / BREATHING HEADER ──
  heroSection: {
    paddingHorizontal: EditorialSpacing.breathingMargin,
    paddingTop: EditorialSpacing.heroTopPadding + 8,
    paddingBottom: Spacing.xl,
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
    fontFamily: Typography.fonts.serifRegular,
    letterSpacing: Typography.letterSpacing.editorial,
  },
  heroName: {
    fontSize: Typography.sizes.display,
    fontWeight: Typography.weights.bold,
    fontFamily: Typography.fonts.serif,
    letterSpacing: Typography.letterSpacing.editorial,
    marginTop: -2,
  },
  heroDate: {
    fontSize: Typography.sizes.caption,
    fontFamily: Typography.fonts.sans,
    marginTop: Spacing.md,
    letterSpacing: Typography.letterSpacing.wider,
    textTransform: 'uppercase',
  },
  creditBadge: {
    marginTop: Spacing.md,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  creditBadgeText: {
    fontSize: Typography.sizes.caption,
    fontFamily: Typography.fonts.sansMedium,
  },
  avatarButton: {
    padding: 2,
  },
  avatarGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.gold,
  },
  heroThreadWrapper: {
    marginTop: Spacing.xxl,
  },

  // ── PAYWALL BANNER ──
  paywallBannerSection: {
    paddingHorizontal: EditorialSpacing.breathingMargin,
    marginBottom: Spacing.xl,
  },

  // ── CALENDAR PREVIEW ──
  calendarPreviewSection: {
    paddingHorizontal: EditorialSpacing.breathingMargin,
    marginBottom: Spacing.xl,
  },

  // ── FEATURED RITUAL ──
  featuredRitualSection: {
    paddingHorizontal: EditorialSpacing.breathingMargin,
    marginBottom: EditorialSpacing.sectionGap,
  },
  ritualTimeLabel: {
    fontSize: Typography.sizes.caption,
    fontFamily: Typography.fonts.sansMedium,
    letterSpacing: Typography.letterSpacing.display,
    textTransform: 'uppercase',
    marginBottom: Spacing.md,
  },
  featuredCard: {
    borderRadius: Radius.squircle,
    overflow: 'hidden',
    ...Shadows.floating,
  },
  featuredCardGradient: {
    padding: EditorialSpacing.cardPadding,
    minHeight: 200,
    justifyContent: 'space-between',
    position: 'relative',
  },
  featuredShimmer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,1)',
  },
  featuredCardContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  featuredIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  featuredTextContainer: {
    flex: 1,
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  featuredTitle: {
    fontSize: Typography.sizes.headline,
    fontFamily: Typography.fonts.serif,
    fontWeight: Typography.weights.bold,
    letterSpacing: Typography.letterSpacing.editorial,
    marginBottom: Spacing.sm,
  },
  featuredSubtitle: {
    fontSize: Typography.sizes.body,
    fontFamily: Typography.fonts.sansLight,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },
  featuredCompletedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  featuredCompletedText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: Typography.sizes.body,
    fontFamily: Typography.fonts.sansMedium,
  },
  featuredActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  featuredActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.pill,
  },
  featuredActionText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: Typography.sizes.body,
    fontFamily: Typography.fonts.sansMedium,
    letterSpacing: Typography.letterSpacing.wide,
  },
  featuredThreadWrapper: {
    position: 'absolute',
    bottom: 0,
    left: EditorialSpacing.cardPadding,
    right: EditorialSpacing.cardPadding,
    height: 1,
  },
  featuredThread: {
    flex: 1,
  },

  // ── SECONDARY RITUALS ──
  secondaryRitualsSection: {
    paddingHorizontal: EditorialSpacing.breathingMargin,
    marginBottom: EditorialSpacing.sectionGap,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  viewAllText: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.medium,
    letterSpacing: Typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  ritualProgressWrapper: {
    marginBottom: Spacing.xl,
  },
  ritualProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  ritualProgressLabel: {
    fontSize: Typography.sizes.caption,
    fontFamily: Typography.fonts.sans,
    letterSpacing: Typography.letterSpacing.wide,
  },
  streakBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: Radius.pill,
  },
  streakBadgeText: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.bold,
  },
  ritualsList: {
    gap: 2,
  },
  secondaryRitualItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md + 2,
    gap: Spacing.md,
  },
  ritualCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ritualItemTitle: {
    flex: 1,
    fontSize: Typography.sizes.body,
    fontFamily: Typography.fonts.sans,
    lineHeight: Typography.sizes.body * Typography.lineHeights.normal,
  },
  ritualItemTitleDone: {
    textDecorationLine: 'line-through',
  },
  ritualStreakMini: {
    fontSize: Typography.sizes.caption,
    fontFamily: Typography.fonts.sans,
  },
  moreRitualsButton: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  moreRitualsText: {
    fontSize: Typography.sizes.caption,
    fontFamily: Typography.fonts.sansMedium,
    letterSpacing: Typography.letterSpacing.wide,
  },

  // ── PROGRESS SECTION ──
  progressSection: {
    paddingHorizontal: EditorialSpacing.breathingMargin,
    marginBottom: EditorialSpacing.sectionGap,
  },
  progressCardInner: {
    padding: Spacing.xl,
  },
  progressContent: {
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  progressRingWrapper: {
    marginBottom: Spacing.lg,
  },
  streakWrapper: {
    width: '100%',
  },
  progressDivider: {
    marginBottom: Spacing.lg,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.xl,
    gap: Spacing.sm,
  },
  insightText: {
    fontSize: Typography.sizes.body,
    fontFamily: Typography.fonts.serifRegular,
    fontStyle: 'italic',
    flex: 1,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },

  // ── ACTIVE COACH ──
  activeCoachCard: {
    marginHorizontal: EditorialSpacing.breathingMargin,
    marginBottom: EditorialSpacing.sectionGap,
    borderRadius: Radius.squircle,
    overflow: 'hidden',
    ...Shadows.floating,
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
    letterSpacing: Typography.letterSpacing.wider,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  coachName: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
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
    fontWeight: Typography.weights.medium,
  },

  // ── QUICK ACTIONS ──
  quickActionsContainer: {
    paddingHorizontal: EditorialSpacing.breathingMargin,
    marginBottom: EditorialSpacing.sectionGap,
  },

  // ── FLASHBACK ──
  flashbackSection: {
    paddingHorizontal: EditorialSpacing.breathingMargin,
    marginBottom: EditorialSpacing.sectionGap,
  },

  // ── FEATURED ──
  featuredSection: {
    paddingHorizontal: EditorialSpacing.breathingMargin,
    marginBottom: EditorialSpacing.sectionGap,
  },

  // ── FOCUS ──
  focusSection: {
    paddingHorizontal: EditorialSpacing.breathingMargin,
    marginBottom: EditorialSpacing.sectionGap,
  },

  // ── SECTION HEADERS ──
  sectionHeader: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.bold,
    fontFamily: Typography.fonts.serif,
    letterSpacing: Typography.letterSpacing.editorial,
  },
  sectionSubtitle: {
    fontSize: Typography.sizes.body,
    fontFamily: Typography.fonts.sansLight,
    marginTop: Spacing.sm,
    letterSpacing: Typography.letterSpacing.wide,
  },

  // ── PRIORITIES ──
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
  },
  priorityNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  priorityNumberText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
  },
  priorityText: {
    flex: 1,
    fontSize: Typography.sizes.bodyLarge,
    fontFamily: Typography.fonts.sans,
    lineHeight: Typography.sizes.bodyLarge * Typography.lineHeights.relaxed,
  },
  priorityTextCompleted: {
    textDecorationLine: 'line-through',
  },
  priorityCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkInButton: {
    marginTop: Spacing.sm,
  },

  // ── SESSIONS ──
  sessionsSection: {
    marginBottom: Spacing.lg,
  },
  sessionsScroll: {
    paddingHorizontal: EditorialSpacing.breathingMargin,
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
  },
  sessionTitle: {
    fontSize: Typography.sizes.body,
    fontFamily: Typography.fonts.sansMedium,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },

  // ── SPACER ──
  bottomSpacer: {
    height: 120, // Extra space for floating dock
  },
});
