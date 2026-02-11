import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PremiumPageTransition } from '@/components/ui/PremiumPageTransition';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  FadeInUp,
  FadeIn,
  FadeInLeft,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { DayPlan } from '@/types';
import { getDayPlans, updateDayPlan, getActiveCoachId } from '@/store/app';
import { supabase } from '@/lib/supabase';
import { createSession } from '@/lib/supabase-sanctuary';
import { generatePlan } from '@/lib/apiClient';
import { getCoachById } from '@/data/coaches';

// Generate dates for the 7-day view
function generateWeekDates(): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(date);
  }
  return dates;
}

export default function PlanScreen() {
  const router = useRouter();
  const { palette } = useThemeSafe();
  const [weekDates] = useState(generateWeekDates);
  const [dayPlans, setDayPlans] = useState<DayPlan[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCoachId, setActiveCoachId] = useState<string | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const plans = await getDayPlans();
      setDayPlans(plans);
      const coachId = await getActiveCoachId();
      setActiveCoachId(coachId);
    } catch (error) {
      console.error('Error loading plans:', error);
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

  const handleTogglePriority = async (dateStr: string, priorityId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const plan = dayPlans.find((p) => p.date === dateStr);
    if (plan) {
      const updatedPriorities = plan.top_priorities.map((p) =>
        p.id === priorityId ? { ...p, completed: !p.completed } : p
      );
      const updatedPlan = { ...plan, top_priorities: updatedPriorities, updated_at: new Date().toISOString() };
      await updateDayPlan(updatedPlan);
      await loadData();
    }
  };

  const handleAdjustWithCoach = () => {
    if (activeCoachId) {
      router.push(`/chat/${activeCoachId}?context=plan`);
    }
  };

  const handleGeneratePlan = async () => {
    if (!activeCoachId) return;

    setIsGeneratingPlan(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { data: authData } = await supabase.auth.getSession();
      const authUser = authData.session?.user;
      if (!authUser) {
        Alert.alert('Sign in required', 'Please sign in to generate a plan.');
        return;
      }

      const coach = getCoachById(activeCoachId);
      if (!coach) {
        Alert.alert('Coach not found', 'Please select a coach and try again.');
        return;
      }

      const session = await createSession(authUser.id, activeCoachId, 'Plan Session');
      if (!session) {
        Alert.alert('Error', 'Could not start a planning session. Please try again.');
        return;
      }

      const response = await generatePlan(session.id, 7);
      const now = new Date().toISOString();

      const newPlans: DayPlan[] = (response.days || []).map((day, index) => ({
        id: `plan-${day.day}-${Date.now()}-${index}`,
        user_id: authUser.id,
        date: day.day,
        top_priorities: (day.top_3 || []).map((title, idx) => ({
          id: `${day.day}-${idx + 1}`,
          title,
          completed: false,
          order: idx + 1,
        })),
        time_blocks: (day.time_blocks || []).map((block: any, idx: number) => ({
          id: block.id || `${day.day}-${idx + 1}`,
          start_time: block.start_time || '09:00',
          end_time: block.end_time || '10:00',
          title: block.title || 'Focus block',
          category: block.category,
        })),
        created_at: now,
        updated_at: now,
      }));

      for (const plan of newPlans) {
        await updateDayPlan(plan);
      }

      await loadData();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error generating plan:', error);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const formatDateStr = (date: Date) => date.toISOString().split('T')[0];

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Calculate weekly stats
  const weeklyStats = {
    completed: dayPlans.reduce((acc, plan) =>
      acc + plan.top_priorities.filter(p => p.completed).length, 0
    ),
    remaining: dayPlans.reduce((acc, plan) =>
      acc + plan.top_priorities.filter(p => !p.completed).length, 0
    ),
    timeBlocks: dayPlans.reduce((acc, plan) => acc + plan.time_blocks.length, 0),
  };

  const totalPriorities = weeklyStats.completed + weeklyStats.remaining;
  const completionRate = totalPriorities > 0
    ? Math.round((weeklyStats.completed / totalPriorities) * 100)
    : 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
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
          {/* Editorial Header */}
          <Animated.View entering={FadeInUp.duration(600)} style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={[styles.headerLabel, { color: palette.accent }]}>Your Journey</Text>
              <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>7-Day Timeline</Text>
              <Text style={[styles.headerSubtitle, { color: palette.textTertiary }]}>
                A curated plan aligned with your values and goals
              </Text>
            </View>

            {/* Generate Button */}
            {activeCoachId && (
              <TouchableOpacity
                style={styles.generateButton}
                onPress={handleGeneratePlan}
                disabled={isGeneratingPlan}
              >
                <LinearGradient
                  colors={[palette.accent, palette.accentLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.generateGradient}
                >
                  {isGeneratingPlan ? (
                    <ActivityIndicator size="small" color={palette.textInverse} />
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={18} color={palette.textInverse} />
                      <Text style={[styles.generateText, { color: palette.textInverse }]}>Generate</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Weekly Progress Card */}
          <Animated.View entering={FadeInUp.duration(600).delay(100)} style={styles.progressSection}>
            <BlurView intensity={40} tint={palette.statusBarStyle === 'light' ? 'dark' : 'light'} style={[styles.progressCard, { backgroundColor: palette.cardBg, borderColor: palette.borderLight }]}>
              <View style={styles.progressHeader}>
                <View style={[styles.progressCircle, { backgroundColor: palette.accentMuted, borderColor: palette.accent }]}>
                  <Text style={[styles.progressPercentage, { color: palette.accent }]}>{completionRate}%</Text>
                </View>
                <View style={styles.progressInfo}>
                  <Text style={[styles.progressTitle, { color: palette.textPrimary }]}>Week Progress</Text>
                  <Text style={[styles.progressSubtitle, { color: palette.textTertiary }]}>
                    {weeklyStats.completed} of {totalPriorities} priorities complete
                  </Text>
                </View>
              </View>

              <View style={[styles.statsRow, { borderTopColor: palette.border }]}>
                <View style={styles.statItem}>
                  <View style={[styles.statDot, { backgroundColor: palette.success }]} />
                  <Text style={[styles.statValue, { color: palette.textPrimary }]}>{weeklyStats.completed}</Text>
                  <Text style={[styles.statLabel, { color: palette.textTertiary }]}>Done</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
                <View style={styles.statItem}>
                  <View style={[styles.statDot, { backgroundColor: palette.accent }]} />
                  <Text style={[styles.statValue, { color: palette.textPrimary }]}>{weeklyStats.remaining}</Text>
                  <Text style={[styles.statLabel, { color: palette.textTertiary }]}>Pending</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: palette.border }]} />
                <View style={styles.statItem}>
                  <View style={[styles.statDot, { backgroundColor: palette.textPrimary }]} />
                  <Text style={[styles.statValue, { color: palette.textPrimary }]}>{weeklyStats.timeBlocks}</Text>
                  <Text style={[styles.statLabel, { color: palette.textTertiary }]}>Blocks</Text>
                </View>
              </View>
            </BlurView>
          </Animated.View>

          {/* Vertical Timeline */}
          <View style={styles.timelineSection}>
            <Animated.Text
              entering={FadeInUp.duration(600).delay(200)}
              style={[styles.sectionTitle, { color: palette.textPrimary }]}
            >
              Your Week Ahead
            </Animated.Text>

            <View style={styles.timeline}>
              {weekDates.map((date, index) => {
                const dateStr = formatDateStr(date);
                const plan = dayPlans.find(p => p.date === dateStr);
                const isTodayDate = isToday(date);
                const hasContent = plan && (plan.top_priorities.length > 0 || plan.time_blocks.length > 0);
                const dayCompleted = plan?.top_priorities.every(p => p.completed) && plan?.top_priorities.length > 0;

                return (
                  <Animated.View
                    key={dateStr}
                    entering={FadeInLeft.duration(500).delay(300 + index * 80)}
                  >
                    <TimelineDay
                      date={date}
                      plan={plan}
                      isToday={isTodayDate}
                      isCompleted={dayCompleted ?? false}
                      hasContent={hasContent ?? false}
                      isLast={index === weekDates.length - 1}
                      onTogglePriority={(priorityId) => handleTogglePriority(dateStr, priorityId)}
                    />
                  </Animated.View>
                );
              })}
            </View>
          </View>

          {/* Empty State */}
          {dayPlans.length === 0 && (
            <Animated.View entering={FadeIn.duration(600).delay(400)} style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: palette.backgroundSecondary }]}>
                <Ionicons name="calendar-outline" size={48} color={palette.textTertiary} />
              </View>
              <Text style={[styles.emptyTitle, { color: palette.textPrimary }]}>Your timeline awaits</Text>
              <Text style={[styles.emptyText, { color: palette.textTertiary }]}>
                {activeCoachId
                  ? 'Generate a personalized plan based on your values and goals.'
                  : 'Install a coach to start crafting your ideal week.'}
              </Text>
              {activeCoachId && (
                <Button
                  title="Create My Plan"
                  onPress={handleGeneratePlan}
                  loading={isGeneratingPlan}
                  variant="gold"
                  style={styles.emptyButton}
                />
              )}
            </Animated.View>
          )}

          {/* Adjust with Coach */}
          {activeCoachId && dayPlans.length > 0 && (
            <Animated.View entering={FadeInUp.duration(500).delay(600)} style={styles.adjustSection}>
              <TouchableOpacity
                style={styles.adjustButton}
                onPress={handleAdjustWithCoach}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[palette.textPrimary, '#0D1A11']}
                  style={styles.adjustGradient}
                >
                  <View style={styles.adjustContent}>
                    <View style={styles.adjustIconContainer}>
                      <Ionicons name="chatbubble-ellipses" size={24} color={palette.accent} />
                    </View>
                    <View style={styles.adjustTextContainer}>
                      <Text style={[styles.adjustTitle, { color: palette.textInverse }]}>Refine with your coach</Text>
                      <Text style={styles.adjustSubtitle}>
                        Discuss adjustments and optimize your week
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={palette.accent} />
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Bottom Spacer */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </PremiumPageTransition>
    </SafeAreaView>
  );
}

// Timeline Day Component
function TimelineDay({
  date,
  plan,
  isToday,
  isCompleted,
  hasContent,
  isLast,
  onTogglePriority,
}: {
  date: Date;
  plan: DayPlan | undefined;
  isToday: boolean;
  isCompleted: boolean;
  hasContent: boolean;
  isLast: boolean;
  onTogglePriority: (priorityId: string) => void;
}) {
  const { palette } = useThemeSafe();
  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
  const dayNumber = date.getDate();
  const monthName = date.toLocaleDateString('en-US', { month: 'short' });

  const priorities = plan?.top_priorities || [];
  const timeBlocks = plan?.time_blocks || [];

  return (
    <View style={styles.timelineDayContainer}>
      {/* Timeline Line */}
      <View style={styles.timelineLineContainer}>
        {/* Node */}
        <View style={[
          styles.timelineNode,
          { backgroundColor: palette.textTertiary },
          isToday && { width: 20, height: 20, borderRadius: 10, backgroundColor: palette.accent },
          isCompleted && { backgroundColor: palette.success },
        ]}>
          {isToday && (
            <View style={[styles.timelineNodeInner, { backgroundColor: palette.textInverse }]} />
          )}
          {isCompleted && (
            <Ionicons name="checkmark" size={12} color={palette.textInverse} />
          )}
        </View>

        {/* Vertical Line */}
        {!isLast && (
          <View style={[
            styles.timelineLine,
            { backgroundColor: palette.border },
            hasContent && { backgroundColor: palette.accentMuted, width: 3 },
          ]} />
        )}
      </View>

      {/* Day Content */}
      <View style={styles.timelineDayContent}>
        {/* Date Header */}
        <View style={styles.dateHeader}>
          <View style={styles.dateInfo}>
            <Text style={[styles.dayName, { color: palette.textTertiary }, isToday && { color: palette.accent }]}>
              {dayName}
            </Text>
            <Text style={[styles.dayNumber, { color: palette.textSecondary }, isToday && { color: palette.accent }]}>
              {dayNumber}
            </Text>
            <Text style={[styles.monthName, { color: palette.textTertiary }]}>{monthName}</Text>
          </View>
          {isToday && (
            <View style={[styles.todayBadge, { backgroundColor: palette.accentMuted, borderColor: palette.accent }]}>
              <Text style={[styles.todayBadgeText, { color: palette.accent }]}>Today</Text>
            </View>
          )}
        </View>

        {/* Priorities */}
        {priorities.length > 0 && (
          <View style={[styles.prioritiesContainer, { backgroundColor: palette.cardBg }]}>
            <View style={styles.prioritiesHeader}>
              <View style={[styles.goldAccent, { backgroundColor: palette.accent }]} />
              <Text style={[styles.prioritiesTitle, { color: palette.textSecondary }]}>Priorities</Text>
            </View>
            {priorities.map((priority, index) => (
              <TouchableOpacity
                key={priority.id}
                style={[styles.priorityItem, { borderBottomColor: palette.borderLight }]}
                onPress={() => onTogglePriority(priority.id)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.priorityNumber,
                  { backgroundColor: palette.backgroundSecondary },
                  priority.completed && { backgroundColor: palette.success },
                ]}>
                  {priority.completed ? (
                    <Ionicons name="checkmark" size={12} color={palette.textInverse} />
                  ) : (
                    <Text style={[styles.priorityNumberText, { color: palette.accent }]}>{index + 1}</Text>
                  )}
                </View>
                <Text style={[
                  styles.priorityText,
                  { color: palette.textSecondary },
                  priority.completed && { textDecorationLine: 'line-through', color: palette.textTertiary },
                ]}>
                  {priority.title}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Time Blocks */}
        {timeBlocks.length > 0 && (
          <View style={[styles.timeBlocksContainer, { backgroundColor: palette.backgroundSecondary, borderLeftColor: palette.accentMuted }]}>
            <View style={styles.timeBlocksHeader}>
              <View style={[styles.goldAccent, styles.goldAccentSmall, { backgroundColor: palette.accent }]} />
              <Text style={[styles.timeBlocksTitle, { color: palette.textSecondary }]}>Time Blocks</Text>
            </View>
            {timeBlocks.map((block) => (
              <View key={block.id} style={styles.timeBlockItem}>
                <View style={styles.timeBlockTimeContainer}>
                  <Text style={[styles.timeBlockTime, { color: palette.textTertiary }]}>{block.start_time}</Text>
                  <View style={[styles.timeBlockTimeLine, { backgroundColor: palette.border }]} />
                  <Text style={[styles.timeBlockTime, { color: palette.textTertiary }]}>{block.end_time}</Text>
                </View>
                <View style={styles.timeBlockContent}>
                  <Text style={[styles.timeBlockTitle, { color: palette.textSecondary }]}>{block.title}</Text>
                  {block.category && (
                    <View style={[styles.categoryBadge, { backgroundColor: palette.accentMuted }]}>
                      <Text style={[styles.categoryText, { color: palette.accent }]}>{block.category}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Empty Day */}
        {!hasContent && (
          <View style={styles.emptyDay}>
            <Text style={[styles.emptyDayText, { color: palette.textTertiary }]}>No activities planned</Text>
          </View>
        )}
      </View>
    </View>
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
    paddingBottom: Spacing.xxl,
  },
  headerContent: {
    marginBottom: Spacing.lg,
  },
  headerLabel: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.medium,
    letterSpacing: Typography.letterSpacing.wider,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
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
  generateButton: {
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    overflow: 'hidden',
    ...Shadows.gold,
  },
  generateGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  generateText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
  },

  // Progress Card
  progressSection: {
    paddingHorizontal: Spacing.xxl,
    marginBottom: Spacing.xxl,
  },
  progressCard: {
    borderRadius: Radius.squircle,
    padding: Spacing.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  progressCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  progressPercentage: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.bold,
  },
  progressInfo: {
    flex: 1,
  },
  progressTitle: {
    fontSize: Typography.sizes.subtitle,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
  },
  progressSubtitle: {
    fontSize: Typography.sizes.body,
    marginTop: Spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statValue: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.bold,
  },
  statLabel: {
    fontSize: Typography.sizes.caption,
  },
  statDivider: {
    width: 1,
    height: 24,
  },

  // Timeline Section
  timelineSection: {
    paddingHorizontal: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    marginBottom: Spacing.xl,
  },
  timeline: {
    paddingLeft: Spacing.sm,
  },

  // Timeline Day
  timelineDayContainer: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  timelineLineContainer: {
    width: 24,
    alignItems: 'center',
  },
  timelineNode: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timelineNodeInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: -2,
  },
  timelineDayContent: {
    flex: 1,
    marginLeft: Spacing.lg,
    paddingBottom: Spacing.xl,
  },

  // Date Header
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.sm,
  },
  dayName: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wide,
  },
  dayNumber: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.bold,
    fontFamily: Typography.fonts.serif,
  },
  monthName: {
    fontSize: Typography.sizes.body,
  },
  todayBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  todayBadgeText: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
  },

  // Priorities
  prioritiesContainer: {
    borderRadius: Radius.squircle,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  prioritiesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  goldAccent: {
    width: 3,
    height: 16,
    borderRadius: 2,
    marginRight: Spacing.sm,
  },
  goldAccentSmall: {
    height: 12,
  },
  prioritiesTitle: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    letterSpacing: Typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  priorityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  priorityNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  priorityNumberText: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.bold,
  },
  priorityText: {
    flex: 1,
    fontSize: Typography.sizes.body,
    lineHeight: Typography.sizes.body * Typography.lineHeights.normal,
  },

  // Time Blocks
  timeBlocksContainer: {
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderLeftWidth: 3,
  },
  timeBlocksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  timeBlocksTitle: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    letterSpacing: Typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  timeBlockItem: {
    flexDirection: 'row',
    paddingVertical: Spacing.sm,
  },
  timeBlockTimeContainer: {
    alignItems: 'center',
    marginRight: Spacing.md,
    minWidth: 50,
  },
  timeBlockTime: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
  },
  timeBlockTimeLine: {
    width: 1,
    height: 8,
    marginVertical: 2,
  },
  timeBlockContent: {
    flex: 1,
  },
  timeBlockTitle: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
  },
  categoryBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
  },
  categoryText: {
    fontSize: Typography.sizes.micro,
    fontWeight: Typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wide,
  },

  // Empty Day
  emptyDay: {
    paddingVertical: Spacing.sm,
  },
  emptyDayText: {
    fontSize: Typography.sizes.body,
    fontStyle: 'italic',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xxl,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.sizes.body,
    textAlign: 'center',
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
    marginBottom: Spacing.xl,
  },
  emptyButton: {
    minWidth: 180,
  },

  // Adjust Section
  adjustSection: {
    paddingHorizontal: Spacing.xxl,
    marginTop: Spacing.xl,
  },
  adjustButton: {
    borderRadius: Radius.squircle,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  adjustGradient: {
    padding: Spacing.xl,
  },
  adjustContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  adjustIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(197, 160, 89, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  adjustTextContainer: {
    flex: 1,
  },
  adjustTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
  },
  adjustSubtitle: {
    fontSize: Typography.sizes.body,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: Spacing.xs,
  },

  bottomSpacer: {
    height: 100,
  },
});
