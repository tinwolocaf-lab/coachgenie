import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  FadeInUp,
  FadeIn,
  FadeInLeft,
  useAnimatedStyle,
  withSpring,
  withTiming,
  useSharedValue,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { DayPlan } from '@/types';
import { getDayPlans, updateDayPlan, getActiveCoachId } from '@/store/app';
import { supabase } from '@/lib/supabase';
import { createSession } from '@/lib/supabase-sanctuary';
import { generatePlan } from '@/lib/apiClient';
import { getCoachById } from '@/data/coaches';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
              <View style={[styles.progressCircle, { borderColor: palette.accent }]}>
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
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <View style={[styles.statDot, { backgroundColor: Colors.midnightEmerald }]} />
                <Text style={styles.statValue}>{weeklyStats.timeBlocks}</Text>
                <Text style={styles.statLabel}>Blocks</Text>
              </View>
            </View>
          </BlurView>
        </Animated.View>

        {/* Vertical Timeline */}
        <View style={styles.timelineSection}>
          <Animated.Text
            entering={FadeInUp.duration(600).delay(200)}
            style={styles.sectionTitle}
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
            <View style={styles.emptyIcon}>
              <Ionicons name="calendar-outline" size={48} color={Colors.stoneGray} />
            </View>
            <Text style={styles.emptyTitle}>Your timeline awaits</Text>
            <Text style={styles.emptyText}>
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
                colors={[Colors.midnightEmerald, '#0D1A11']}
                style={styles.adjustGradient}
              >
                <View style={styles.adjustContent}>
                  <View style={styles.adjustIconContainer}>
                    <Ionicons name="chatbubble-ellipses" size={24} color={Colors.burnishedGold} />
                  </View>
                  <View style={styles.adjustTextContainer}>
                    <Text style={styles.adjustTitle}>Refine with your coach</Text>
                    <Text style={styles.adjustSubtitle}>
                      Discuss adjustments and optimize your week
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={Colors.burnishedGold} />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Bottom Spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
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
  const scale = useSharedValue(1);

  const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
  const dayNumber = date.getDate();
  const monthName = date.toLocaleDateString('en-US', { month: 'short' });

  const priorities = plan?.top_priorities || [];
  const timeBlocks = plan?.time_blocks || [];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.timelineDayContainer}>
      {/* Timeline Line */}
      <View style={styles.timelineLineContainer}>
        {/* Node */}
        <View style={[
          styles.timelineNode,
          isToday && styles.timelineNodeToday,
          isCompleted && styles.timelineNodeCompleted,
        ]}>
          {isToday && (
            <View style={styles.timelineNodeInner} />
          )}
          {isCompleted && (
            <Ionicons name="checkmark" size={12} color={Colors.white} />
          )}
        </View>

        {/* Vertical Line */}
        {!isLast && (
          <View style={[
            styles.timelineLine,
            hasContent && styles.timelineLineActive,
          ]} />
        )}
      </View>

      {/* Day Content */}
      <View style={styles.timelineDayContent}>
        {/* Date Header */}
        <View style={styles.dateHeader}>
          <View style={styles.dateInfo}>
            <Text style={[styles.dayName, isToday && styles.dayNameToday]}>
              {dayName}
            </Text>
            <Text style={[styles.dayNumber, isToday && styles.dayNumberToday]}>
              {dayNumber}
            </Text>
            <Text style={styles.monthName}>{monthName}</Text>
          </View>
          {isToday && (
            <View style={styles.todayBadge}>
              <Text style={styles.todayBadgeText}>Today</Text>
            </View>
          )}
        </View>

        {/* Priorities */}
        {priorities.length > 0 && (
          <Animated.View style={[styles.prioritiesContainer, animatedStyle]}>
            <View style={styles.prioritiesHeader}>
              <View style={styles.goldAccent} />
              <Text style={styles.prioritiesTitle}>Priorities</Text>
            </View>
            {priorities.map((priority, index) => (
              <TouchableOpacity
                key={priority.id}
                style={styles.priorityItem}
                onPress={() => onTogglePriority(priority.id)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.priorityNumber,
                  priority.completed && styles.priorityNumberCompleted,
                ]}>
                  {priority.completed ? (
                    <Ionicons name="checkmark" size={12} color={Colors.white} />
                  ) : (
                    <Text style={styles.priorityNumberText}>{index + 1}</Text>
                  )}
                </View>
                <Text style={[
                  styles.priorityText,
                  priority.completed && styles.priorityTextCompleted,
                ]}>
                  {priority.title}
                </Text>
              </TouchableOpacity>
            ))}
          </Animated.View>
        )}

        {/* Time Blocks */}
        {timeBlocks.length > 0 && (
          <View style={styles.timeBlocksContainer}>
            <View style={styles.timeBlocksHeader}>
              <View style={[styles.goldAccent, styles.goldAccentSmall]} />
              <Text style={styles.timeBlocksTitle}>Time Blocks</Text>
            </View>
            {timeBlocks.map((block) => (
              <View key={block.id} style={styles.timeBlockItem}>
                <View style={styles.timeBlockTimeContainer}>
                  <Text style={styles.timeBlockTime}>{block.start_time}</Text>
                  <View style={styles.timeBlockTimeLine} />
                  <Text style={styles.timeBlockTime}>{block.end_time}</Text>
                </View>
                <View style={styles.timeBlockContent}>
                  <Text style={styles.timeBlockTitle}>{block.title}</Text>
                  {block.category && (
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryText}>{block.category}</Text>
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
            <Text style={styles.emptyDayText}>No activities planned</Text>
          </View>
        )}
      </View>
    </View>
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
    paddingBottom: Spacing.xxl,
  },
  headerContent: {
    marginBottom: Spacing.lg,
  },
  headerLabel: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.medium,
    color: Colors.burnishedGold,
    letterSpacing: Typography.letterSpacing.wider,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
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
    color: Colors.white,
  },

  // Progress Card
  progressSection: {
    paddingHorizontal: Spacing.xxl,
    marginBottom: Spacing.xxl,
  },
  progressCard: {
    borderRadius: Radius.squircle,
    padding: Spacing.xl,
    backgroundColor: Colors.glassBg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
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
    backgroundColor: Colors.goldMuted,
    borderWidth: 3,
    borderColor: Colors.burnishedGold,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  progressPercentage: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.bold,
    color: Colors.burnishedGold,
  },
  progressInfo: {
    flex: 1,
  },
  progressTitle: {
    fontSize: Typography.sizes.subtitle,
    fontWeight: Typography.weights.semibold,
    color: Colors.midnightEmerald,
    fontFamily: Typography.fonts.serif,
  },
  progressSubtitle: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
    marginTop: Spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
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
    color: Colors.charcoal,
  },
  statLabel: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.border,
  },

  // Timeline Section
  timelineSection: {
    paddingHorizontal: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    color: Colors.midnightEmerald,
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
    backgroundColor: Colors.stoneGray,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timelineNodeToday: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.burnishedGold,
  },
  timelineNodeInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.white,
  },
  timelineNodeCompleted: {
    backgroundColor: Colors.success,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.border,
    marginTop: -2,
  },
  timelineLineActive: {
    backgroundColor: Colors.goldMuted,
    width: 3,
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
    color: Colors.stoneGray,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wide,
  },
  dayNameToday: {
    color: Colors.burnishedGold,
  },
  dayNumber: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.bold,
    color: Colors.charcoal,
    fontFamily: Typography.fonts.serif,
  },
  dayNumberToday: {
    color: Colors.burnishedGold,
  },
  monthName: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
  },
  todayBadge: {
    backgroundColor: Colors.goldMuted,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.burnishedGold,
  },
  todayBadgeText: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    color: Colors.burnishedGold,
  },

  // Priorities
  prioritiesContainer: {
    backgroundColor: Colors.white,
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
    backgroundColor: Colors.burnishedGold,
    borderRadius: 2,
    marginRight: Spacing.sm,
  },
  goldAccentSmall: {
    height: 12,
  },
  prioritiesTitle: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    color: Colors.charcoal,
    letterSpacing: Typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  priorityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  priorityNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.warmOatmealDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  priorityNumberCompleted: {
    backgroundColor: Colors.success,
  },
  priorityNumberText: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.bold,
    color: Colors.burnishedGold,
  },
  priorityText: {
    flex: 1,
    fontSize: Typography.sizes.body,
    color: Colors.charcoal,
    lineHeight: Typography.sizes.body * Typography.lineHeights.normal,
  },
  priorityTextCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.stoneGray,
  },

  // Time Blocks
  timeBlocksContainer: {
    backgroundColor: Colors.warmOatmealDark,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: Colors.goldMuted,
  },
  timeBlocksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  timeBlocksTitle: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    color: Colors.charcoal,
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
    color: Colors.stoneGray,
  },
  timeBlockTimeLine: {
    width: 1,
    height: 8,
    backgroundColor: Colors.border,
    marginVertical: 2,
  },
  timeBlockContent: {
    flex: 1,
  },
  timeBlockTitle: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.charcoal,
  },
  categoryBadge: {
    backgroundColor: Colors.goldMuted,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
  },
  categoryText: {
    fontSize: Typography.sizes.micro,
    fontWeight: Typography.weights.medium,
    color: Colors.burnishedGold,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wide,
  },

  // Empty Day
  emptyDay: {
    paddingVertical: Spacing.sm,
  },
  emptyDayText: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
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
    backgroundColor: Colors.warmOatmealDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    color: Colors.midnightEmerald,
    fontFamily: Typography.fonts.serif,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
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
    color: Colors.white,
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
