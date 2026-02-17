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
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { WidgetBridge } from '@/lib/widgetBridge';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeInDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { Card } from '@/components/ui/Card';
import { RitualCard, ActionCard } from '@/components/rituals/RitualCard';
import { FluidProgressBar } from '@/components/rituals/FluidProgressBar';
import { useAuthSafe } from '@/hooks/useConditionalAuth';
import {
  getTodayPractice,
  getTimeOfDay,
  completeRitual,
  uncompleteRitual,
  getOverallConsistency,
} from '@/lib/supabase-rituals';
import { getMorningPrompt } from '@/lib/ritualPrompts';
import { getContextVault } from '@/store/app';
import {
  TodayPractice,
  TimeOfDay,
  EditorialNudge,
} from '@/types';
import { useSchemaReadiness } from '@/lib/schemaReadiness';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function RitualsHubScreen() {
  const router = useRouter();
  const { palette } = useThemeSafe();
  const auth = useAuthSafe();
  const schemaReadiness = useSchemaReadiness();
  const isRitualsMigrationRequired = schemaReadiness.rituals.status === 'migration_required';

  const [practice, setPractice] = useState<TodayPractice | null>(null);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(getTimeOfDay());
  const [morningPrompt, setMorningPrompt] = useState<string>('');
  const [consistency, setConsistency] = useState<{
    currentStreak: number;
    longestStreak: number;
    weeklyAverage: number;
    monthlyTrend: 'up' | 'down' | 'stable';
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Load data
  const loadData = useCallback(async () => {
    if (!auth?.user?.id) return;

    try {
      const [practiceData, context, consistencyData] = await Promise.all([
        getTodayPractice(auth.user.id),
        getContextVault(),
        getOverallConsistency(auth.user.id),
      ]);

      setPractice(practiceData);
      setConsistency(consistencyData);

      // Generate morning prompt
      const prompt = getMorningPrompt(context, practiceData.activeChapter || null);
      setMorningPrompt(prompt);
    } catch (error) {
      console.error('Error loading practice data:', error);
    }
  }, [auth?.user?.id]);

  useEffect(() => {
    loadData();
    // Update time of day periodically
    const interval = setInterval(() => {
      setTimeOfDay(getTimeOfDay());
    }, 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

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

      // Sync widget data with updated ritual progress
      // Fetch fresh data since React state hasn't flushed yet
      if (auth.user.id) {
        const freshPractice = await getTodayPractice(auth.user.id);
        if (freshPractice) {
          const rituals = freshPractice?.rituals ?? [];
          const completedCount = rituals.filter((r: { is_completed_today?: boolean }) => r.is_completed_today).length;
          const totalCount = rituals.length;

          // Sync DailyFocus widget
          await WidgetBridge.syncWidgetData({
            ritualsCompleted: completedCount,
            ritualTotal: totalCount,
            streakCount: freshPractice?.streakDays ?? 0,
          });

          // Sync RitualChecklist widget with full ritual list
          const hour = new Date().getHours();
          await WidgetBridge.updateRitualChecklist({
            rituals: rituals.map((r: { id: string; title: string; is_completed_today?: boolean; icon?: string }) => ({
              id: r.id,
              label: r.title,
              completed: r.is_completed_today ?? false,
              emoji: r.icon || '✨',
            })),
            completedCount,
            totalCount,
            timeOfDay: hour < 17 ? 'morning' : 'evening',
          });
        }
      }
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={[styles.header, { borderBottomColor: palette.borderLight }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Ionicons name="chevron-back" size={24} color={palette.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>{practice ? 'The Practice' : 'The Practice'}</Text>
        </View>
        <TouchableOpacity style={[styles.chaptersButton, { backgroundColor: palette.accentMuted }]} onPress={handleChaptersPress}>
          <Ionicons name="flag" size={20} color={palette.accent} />
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
            tintColor={palette.accent}
          />
        }
      >
        {/* Hero Section - Date & Greeting */}
        {isRitualsMigrationRequired && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <View style={[styles.migrationNotice, { backgroundColor: palette.warning + '22', borderColor: palette.warning }]}>
              <Ionicons name="warning-outline" size={18} color={palette.warning} />
              <View style={styles.migrationNoticeTextWrap}>
                <Text style={[styles.migrationNoticeTitle, { color: palette.textPrimary }]}>Migration Required</Text>
                <Text style={[styles.migrationNoticeText, { color: palette.textTertiary }]}>
                  Ritual tables are missing in this environment. Apply the latest Supabase migrations.
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Hero Section - Date & Greeting */}
        <Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.heroSection}>
          <Text style={[styles.dateText, { color: palette.textTertiary }]}>{dateString}</Text>
          <Text style={[styles.greetingText, { color: palette.textPrimary }]}>{greeting}</Text>
        </Animated.View>

        {/* Today's Progress Card */}
        <Animated.View entering={FadeInUp.duration(400).delay(200)}>
          <Card variant="elevated" style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <View>
                <Text style={[styles.progressTitle, { color: palette.textPrimary }]}>Today&apos;s Progress</Text>
                <Text style={[styles.progressSubtitle, { color: palette.textTertiary }]}>
                  {practice?.rituals.filter(r => r.is_completed_today).length || 0} of{' '}
                  {practice?.rituals.length || 0} rituals
                </Text>
              </View>
              <View style={[styles.progressPercent, { backgroundColor: palette.accentMuted }]}>
                <Text style={[styles.progressPercentValue, { color: palette.accent }]}>{practice?.overallProgress || 0}%</Text>
              </View>
            </View>

            <FluidProgressBar
              progress={practice?.overallProgress || 0}
              height={10}
              showWave
            />

            {/* Streak Info */}
            {consistency && consistency.currentStreak > 0 && (
              <View style={[styles.streakRow, { borderTopColor: palette.borderLight }]}>
                <View style={styles.streakItem}>
                  <Text style={[styles.streakValue, { color: palette.textPrimary }]}>{consistency.currentStreak}</Text>
                  <Text style={[styles.streakLabel, { color: palette.textTertiary }]}>Day Streak 🔥</Text>
                </View>
                <View style={[styles.streakDivider, { backgroundColor: palette.borderLight }]} />
                <View style={styles.streakItem}>
                  <Text style={[styles.streakValue, { color: palette.textPrimary }]}>{consistency.weeklyAverage}</Text>
                  <Text style={[styles.streakLabel, { color: palette.textTertiary }]}>Days/Week</Text>
                </View>
                <View style={[styles.streakDivider, { backgroundColor: palette.borderLight }]} />
                <View style={styles.streakItem}>
                  <View style={[
                    styles.trendIndicator,
                    { backgroundColor: palette.textTertiary },
                    consistency.monthlyTrend === 'up' && { backgroundColor: palette.success },
                    consistency.monthlyTrend === 'down' && { backgroundColor: palette.error },
                  ]}>
                    <Ionicons
                      name={consistency.monthlyTrend === 'up' ? 'trending-up' :
                        consistency.monthlyTrend === 'down' ? 'trending-down' : 'remove'}
                      size={16}
                      color={palette.textInverse}
                    />
                  </View>
                  <Text style={[styles.streakLabel, { color: palette.textTertiary }]}>Trend</Text>
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
              <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Active Chapter</Text>
              <TouchableOpacity onPress={handleChaptersPress}>
                <Text style={[styles.seeAllText, { color: palette.accent }]}>All Chapters</Text>
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
                      color={palette.textInverse}
                    />
                  </View>
                  <View style={styles.chapterText}>
                    <Text style={[styles.chapterTitle, { color: palette.textInverse }]}>{practice.activeChapter.title}</Text>
                    <View style={styles.chapterProgress}>
                      <FluidProgressBar
                        progress={practice.activeChapter.progress_percentage}
                        height={4}
                        color={palette.textInverse}
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
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Daily Rituals</Text>
            <TouchableOpacity onPress={handleNewRitualPress} style={styles.addRitualButton}>
              <Ionicons name="add" size={18} color={palette.accent} />
              <Text style={[styles.addRitualText, { color: palette.accent }]}>Add</Text>
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
            <View style={[styles.emptyRituals, { backgroundColor: palette.cardBg, borderColor: palette.borderLight }]}>
              <View style={[styles.emptyIcon, { backgroundColor: palette.backgroundSecondary }]}>
                <Ionicons name="sparkles-outline" size={32} color={palette.textTertiary} />
              </View>
              <Text style={[styles.emptyTitle, { color: palette.textSecondary }]}>No rituals yet</Text>
              <Text style={[styles.emptyText, { color: palette.textTertiary }]}>
                Create your first daily ritual to build consistent habits
              </Text>
              <TouchableOpacity style={[styles.emptyButton, { backgroundColor: palette.accentMuted }]} onPress={handleNewRitualPress}>
                <Ionicons name="add" size={18} color={palette.accent} />
                <Text style={[styles.emptyButtonText, { color: palette.accent }]}>Create Ritual</Text>
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
  const { palette } = useThemeSafe();
  const iconName = nudge.nudge_type === 'encouragement' ? 'heart' :
    nudge.nudge_type === 'alignment' ? 'compass' :
    nudge.nudge_type === 'milestone' ? 'trophy' : 'bulb';

  return (
    <Animated.View entering={FadeInDown.duration(300).delay(index * 100)}>
      <TouchableOpacity style={styles.nudgeCard} onPress={onPress} activeOpacity={0.9}>
        <LinearGradient
          colors={[palette.accentMuted, palette.background]}
          style={[styles.nudgeGradient, { borderColor: palette.borderAccent }]}
        >
          <View style={[styles.nudgeIcon, { backgroundColor: palette.accentMuted }]}>
            <Ionicons name={iconName} size={18} color={palette.accent} />
          </View>
          <Text style={[styles.nudgeTitle, { color: palette.textSecondary }]}>{nudge.title}</Text>
          <Text style={[styles.nudgeContent, { color: palette.textTertiary }]} numberOfLines={2}>{nudge.content}</Text>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
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
  },
  chaptersButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    letterSpacing: Typography.letterSpacing.wide,
    marginBottom: Spacing.xs,
  },
  greetingText: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.light,
    fontFamily: Typography.fonts.serif,
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
  },
  progressSubtitle: {
    fontSize: Typography.sizes.caption,
    marginTop: 2,
  },
  progressPercent: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
  },
  progressPercentValue: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.bold,
    fontFamily: Typography.fonts.serif,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
  },
  streakItem: {
    alignItems: 'center',
  },
  streakValue: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.bold,
    fontFamily: Typography.fonts.serif,
  },
  streakLabel: {
    fontSize: Typography.sizes.micro,
    letterSpacing: Typography.letterSpacing.wide,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  streakDivider: {
    width: 1,
    height: 30,
  },
  trendIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderRadius: Radius.squircle,
  },
  nudgeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  nudgeTitle: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
  },
  nudgeContent: {
    fontSize: Typography.sizes.body,
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
  },
  seeAllText: {
    fontSize: Typography.sizes.body,
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
    fontWeight: Typography.weights.medium,
  },

  // Empty State
  emptyRituals: {
    alignItems: 'center',
    padding: Spacing.xxxl,
    borderRadius: Radius.squircle,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
  },
  emptyText: {
    fontSize: Typography.sizes.body,
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
    borderRadius: Radius.pill,
  },
  emptyButtonText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
  },
  migrationNotice: {
    marginHorizontal: Spacing.xxl,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  migrationNoticeTextWrap: {
    flex: 1,
  },
  migrationNoticeTitle: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    marginBottom: 2,
  },
  migrationNoticeText: {
    fontSize: Typography.sizes.caption,
    lineHeight: Typography.sizes.caption * Typography.lineHeights.relaxed,
  },

  bottomSpacer: {
    height: 100,
  },
});
