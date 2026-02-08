// The Practice - Rituals Hub
// A sophisticated system to turn coaching wisdom into daily action
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
  FadeInUp,
  FadeInDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { RitualCard, ActionCard } from '@/components/rituals/RitualCard';
import { FluidProgressBar, SegmentedProgress } from '@/components/rituals/FluidProgressBar';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  getTodayPractice,
  getTimeOfDay,
  getTodayDate,
  completeRitual,
  uncompleteRitual,
  getOverallConsistency,
} from '@/lib/supabase-rituals';
import { getMorningPrompt } from '@/lib/ritualPrompts';
import { getContextVault } from '@/store/app';
import {
  TodayPractice,
  TimeOfDay,
  RitualWithStatus,
  EditorialNudge,
  ContextVault,
} from '@/types';

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

export default function RitualsHubScreen() {
  const router = useRouter();
  const useAuth = getAuthHook();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const auth = useAuth && isSupabaseConfigured ? useAuth() : null;

  const [practice, setPractice] = useState<TodayPractice | null>(null);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(getTimeOfDay());
  const [morningPrompt, setMorningPrompt] = useState<string>('');
  const [userContext, setUserContext] = useState<ContextVault | null>(null);
  const [consistency, setConsistency] = useState<{
    currentStreak: number;
    longestStreak: number;
    weeklyAverage: number;
    monthlyTrend: 'up' | 'down' | 'stable';
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Load data
  useEffect(() => {
    loadData();
    // Update time of day periodically
    const interval = setInterval(() => {
      setTimeOfDay(getTimeOfDay());
    }, 60000);
    return () => clearInterval(interval);
  }, [auth?.user?.id]);

  const loadData = useCallback(async () => {
    if (!auth?.user?.id) return;

    try {
      const [practiceData, context, consistencyData] = await Promise.all([
        getTodayPractice(auth.user.id),
        getContextVault(),
        getOverallConsistency(auth.user.id),
      ]);

      setPractice(practiceData);
      setUserContext(context);
      setConsistency(consistencyData);

      // Generate morning prompt
      const prompt = getMorningPrompt(context, practiceData.activeChapter || null);
      setMorningPrompt(prompt);
    } catch (error) {
      console.error('Error loading practice data:', error);
    }
  }, [auth?.user?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleRitualToggle = async (ritualId: string, isCompleted: boolean) => {
    if (!auth?.user?.id) return;

    try {
      if (isCompleted) {
        await completeRitual(auth.user.id, ritualId);
      } else {
        await uncompleteRitual(auth.user.id, ritualId);
      }
      // Refresh data
      await loadData();
    } catch (error) {
      console.error('Error toggling ritual:', error);
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

  const handleChaptersPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/rituals/chapters');
  };

  const handleNewRitualPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/rituals/new-ritual');
  };

  const handleNudgePress = (nudge: EditorialNudge) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (nudge.related_chapter_id) {
      router.push('/rituals/chapters');
    }
  };

  const handleBackPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  // Determine which action card to show based on time
  const showMorningCard = timeOfDay === 'morning' || (timeOfDay === 'afternoon' && !practice?.morningReflection);
  const showEveningCard = timeOfDay === 'evening' || timeOfDay === 'night';

  // Date and greeting
  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const greeting = timeOfDay === 'morning' ? 'Good morning' :
    timeOfDay === 'afternoon' ? 'Good afternoon' :
    timeOfDay === 'evening' ? 'Good evening' : 'Good night';

  // Calculate week's completion for segmented progress
  const weekDays = Array(7).fill(false);
  // This would ideally come from actual data - simplified for now

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Ionicons name="chevron-back" size={24} color={Colors.midnightEmerald} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>The Practice</Text>
        </View>
        <TouchableOpacity style={styles.chaptersButton} onPress={handleChaptersPress}>
          <Ionicons name="flag" size={20} color={Colors.burnishedGold} />
        </TouchableOpacity>
      </Animated.View>

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
        {/* Hero Section - Date & Greeting */}
        <Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.heroSection}>
          <Text style={styles.dateText}>{dateString}</Text>
          <Text style={styles.greetingText}>{greeting}</Text>
        </Animated.View>

        {/* Today's Progress Card */}
        <Animated.View entering={FadeInUp.duration(400).delay(200)}>
          <Card variant="elevated" style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <View>
                <Text style={styles.progressTitle}>Today&apos;s Progress</Text>
                <Text style={styles.progressSubtitle}>
                  {practice?.rituals.filter(r => r.is_completed_today).length || 0} of{' '}
                  {practice?.rituals.length || 0} rituals
                </Text>
              </View>
              <View style={styles.progressPercent}>
                <Text style={styles.progressPercentValue}>{practice?.overallProgress || 0}%</Text>
              </View>
            </View>

            <FluidProgressBar
              progress={practice?.overallProgress || 0}
              height={10}
              showWave
            />

            {/* Streak Info */}
            {consistency && consistency.currentStreak > 0 && (
              <View style={styles.streakRow}>
                <View style={styles.streakItem}>
                  <Text style={styles.streakValue}>{consistency.currentStreak}</Text>
                  <Text style={styles.streakLabel}>Day Streak 🔥</Text>
                </View>
                <View style={styles.streakDivider} />
                <View style={styles.streakItem}>
                  <Text style={styles.streakValue}>{consistency.weeklyAverage}</Text>
                  <Text style={styles.streakLabel}>Days/Week</Text>
                </View>
                <View style={styles.streakDivider} />
                <View style={styles.streakItem}>
                  <View style={[
                    styles.trendIndicator,
                    consistency.monthlyTrend === 'up' && styles.trendUp,
                    consistency.monthlyTrend === 'down' && styles.trendDown,
                  ]}>
                    <Ionicons
                      name={consistency.monthlyTrend === 'up' ? 'trending-up' :
                        consistency.monthlyTrend === 'down' ? 'trending-down' : 'remove'}
                      size={16}
                      color={Colors.white}
                    />
                  </View>
                  <Text style={styles.streakLabel}>Trend</Text>
                </View>
              </View>
            )}
          </Card>
        </Animated.View>

        {/* Time-Sensitive Action Cards */}
        <Animated.View entering={FadeInUp.duration(400).delay(300)} style={styles.actionSection}>
          {showMorningCard && (
            <ActionCard
              type="morning"
              title="Morning Intention"
              subtitle="Set your focus for today"
              prompt={morningPrompt}
              isCompleted={!!practice?.morningReflection}
              onPress={handleMorningPress}
            />
          )}

          {showEveningCard && (
            <ActionCard
              type="evening"
              title="Evening Audit"
              subtitle="Reflect on your day"
              isCompleted={!!practice?.eveningReflection}
              onPress={handleEveningPress}
            />
          )}
        </Animated.View>

        {/* Editorial Nudges */}
        {practice?.unreadNudges && practice.unreadNudges.length > 0 && (
          <Animated.View entering={FadeInUp.duration(400).delay(350)}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.nudgesScroll}
            >
              {practice.unreadNudges.map((nudge, index) => (
                <NudgeCard
                  key={nudge.id}
                  nudge={nudge}
                  index={index}
                  onPress={() => handleNudgePress(nudge)}
                />
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Active Chapter Preview */}
        {practice?.activeChapter && (
          <Animated.View entering={FadeInUp.duration(400).delay(400)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Chapter</Text>
              <TouchableOpacity onPress={handleChaptersPress}>
                <Text style={styles.seeAllText}>All Chapters</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.chapterPreview}
              onPress={handleChaptersPress}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[practice.activeChapter.cover_color, lightenColor(practice.activeChapter.cover_color, 10)]}
                style={styles.chapterGradient}
              >
                <View style={styles.chapterContent}>
                  <View style={styles.chapterIcon}>
                    <Ionicons
                      name={practice.activeChapter.icon as keyof typeof Ionicons.glyphMap || 'flag'}
                      size={24}
                      color={Colors.white}
                    />
                  </View>
                  <View style={styles.chapterText}>
                    <Text style={styles.chapterTitle}>{practice.activeChapter.title}</Text>
                    <View style={styles.chapterProgress}>
                      <FluidProgressBar
                        progress={practice.activeChapter.progress_percentage}
                        height={4}
                        color={Colors.white}
                        backgroundColor="rgba(255,255,255,0.2)"
                        showWave={false}
                      />
                      <Text style={styles.chapterProgressText}>
                        {practice.activeChapter.progress_percentage}% complete
                      </Text>
                    </View>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.6)" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Daily Rituals */}
        <Animated.View entering={FadeInUp.duration(400).delay(500)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Daily Rituals</Text>
            <TouchableOpacity onPress={handleNewRitualPress} style={styles.addRitualButton}>
              <Ionicons name="add" size={18} color={Colors.burnishedGold} />
              <Text style={styles.addRitualText}>Add</Text>
            </TouchableOpacity>
          </View>

          {practice?.rituals && practice.rituals.length > 0 ? (
            <View style={styles.ritualsList}>
              {practice.rituals.map((ritual, index) => (
                <Animated.View key={ritual.id} entering={FadeInDown.duration(300).delay(550 + index * 50)}>
                  <RitualCard
                    ritual={ritual}
                    onToggle={handleRitualToggle}
                    onPress={(id) => handleRitualToggle(id, !ritual.is_completed_today)}
                    showStreak
                    showLinkedInsight
                  />
                </Animated.View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyRituals}>
              <View style={styles.emptyIcon}>
                <Ionicons name="sparkles-outline" size={32} color={Colors.stoneGray} />
              </View>
              <Text style={styles.emptyTitle}>No rituals yet</Text>
              <Text style={styles.emptyText}>
                Create your first daily ritual to build consistent habits
              </Text>
              <TouchableOpacity style={styles.emptyButton} onPress={handleNewRitualPress}>
                <Ionicons name="add" size={18} color={Colors.burnishedGold} />
                <Text style={styles.emptyButtonText}>Create Ritual</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Nudge Card Component
function NudgeCard({
  nudge,
  index,
  onPress,
}: {
  nudge: EditorialNudge;
  index: number;
  onPress: () => void;
}) {
  const iconName = nudge.nudge_type === 'encouragement' ? 'heart' :
    nudge.nudge_type === 'alignment' ? 'compass' :
    nudge.nudge_type === 'milestone' ? 'trophy' : 'bulb';

  return (
    <Animated.View entering={FadeInDown.duration(300).delay(index * 100)}>
      <TouchableOpacity style={styles.nudgeCard} onPress={onPress} activeOpacity={0.9}>
        <LinearGradient
          colors={[Colors.goldMuted, Colors.warmOatmeal]}
          style={styles.nudgeGradient}
        >
          <View style={styles.nudgeIcon}>
            <Ionicons name={iconName} size={18} color={Colors.burnishedGold} />
          </View>
          <Text style={styles.nudgeTitle}>{nudge.title}</Text>
          <Text style={styles.nudgeContent} numberOfLines={2}>{nudge.content}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// Helper function
function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
  const B = Math.min(255, (num & 0x0000ff) + amt);
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.warmOatmeal,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    color: Colors.midnightEmerald,
  },
  chaptersButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: Spacing.section,
  },

  // Hero Section
  heroSection: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  dateText: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
    letterSpacing: Typography.letterSpacing.wide,
    marginBottom: Spacing.xs,
  },
  greetingText: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.light,
    fontFamily: Typography.fonts.serif,
    color: Colors.midnightEmerald,
  },

  // Progress Card
  progressCard: {
    marginHorizontal: Spacing.xxl,
    marginBottom: Spacing.xxl,
    padding: Spacing.xl,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  progressTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    color: Colors.midnightEmerald,
  },
  progressSubtitle: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
    marginTop: 2,
  },
  progressPercent: {
    backgroundColor: Colors.goldMuted,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
  },
  progressPercentValue: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.bold,
    fontFamily: Typography.fonts.serif,
    color: Colors.burnishedGold,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  streakItem: {
    alignItems: 'center',
  },
  streakValue: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.bold,
    fontFamily: Typography.fonts.serif,
    color: Colors.midnightEmerald,
  },
  streakLabel: {
    fontSize: Typography.sizes.micro,
    color: Colors.stoneGray,
    letterSpacing: Typography.letterSpacing.wide,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  streakDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.borderLight,
  },
  trendIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.stoneGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trendUp: {
    backgroundColor: Colors.success,
  },
  trendDown: {
    backgroundColor: Colors.error,
  },

  // Action Section
  actionSection: {
    paddingHorizontal: Spacing.xxl,
    marginBottom: Spacing.xxl,
    gap: Spacing.md,
  },

  // Nudges
  nudgesScroll: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },
  nudgeCard: {
    width: SCREEN_WIDTH * 0.7,
    borderRadius: Radius.squircle,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  nudgeGradient: {
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderGold,
    borderRadius: Radius.squircle,
  },
  nudgeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  nudgeTitle: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    color: Colors.charcoal,
    marginBottom: Spacing.xs,
  },
  nudgeContent: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },

  // Sections
  section: {
    paddingHorizontal: Spacing.xxl,
    marginBottom: Spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    color: Colors.midnightEmerald,
  },
  seeAllText: {
    fontSize: Typography.sizes.body,
    color: Colors.burnishedGold,
    fontWeight: Typography.weights.medium,
  },

  // Chapter Preview
  chapterPreview: {
    borderRadius: Radius.squircle,
    overflow: 'hidden',
    ...Shadows.md,
  },
  chapterGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  chapterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  chapterIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  chapterText: {
    flex: 1,
  },
  chapterTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  chapterProgress: {
    gap: Spacing.xs,
  },
  chapterProgressText: {
    fontSize: Typography.sizes.micro,
    color: 'rgba(255,255,255,0.7)',
  },

  // Rituals List
  ritualsList: {
    gap: 0,
  },
  addRitualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  addRitualText: {
    fontSize: Typography.sizes.body,
    color: Colors.burnishedGold,
    fontWeight: Typography.weights.medium,
  },

  // Empty State
  emptyRituals: {
    alignItems: 'center',
    padding: Spacing.xxxl,
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.squircle,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderStyle: 'dashed',
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.warmOatmealDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    color: Colors.charcoal,
    marginBottom: Spacing.xs,
  },
  emptyText: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
    textAlign: 'center',
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
    marginBottom: Spacing.lg,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.goldMuted,
    borderRadius: Radius.pill,
  },
  emptyButtonText: {
    fontSize: Typography.sizes.body,
    color: Colors.burnishedGold,
    fontWeight: Typography.weights.medium,
  },

  bottomSpacer: {
    height: 100,
  },
});
