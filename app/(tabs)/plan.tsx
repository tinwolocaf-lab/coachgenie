import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeIn, FadeInRight, Layout } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DayPlan, Priority, TimeBlock } from '@/types';
import { getDayPlans, updateDayPlan, getActiveCoachId, getContextVault } from '@/store/app';
import { generate7DayPlan } from '@/lib/ai-coaching';
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
  const [weekDates] = useState(generateWeekDates);
  const [selectedDate, setSelectedDate] = useState(new Date());
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
    try {
      const userContext = await getContextVault();
      const coach = getCoachById(activeCoachId);

      if (coach) {
        const newPlans = await generate7DayPlan(userContext, coach, dayPlans);

        // Save all generated plans
        for (const plan of newPlans) {
          await updateDayPlan(plan);
        }

        await loadData();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
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

  const selectedDateStr = formatDateStr(selectedDate);
  const selectedPlan = dayPlans.find((p) => p.date === selectedDateStr);

  // Calculate completion percentage
  const completedCount = selectedPlan?.top_priorities.filter(p => p.completed).length || 0;
  const totalCount = selectedPlan?.top_priorities.length || 0;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Default priorities for empty days
  const displayPriorities: Priority[] = selectedPlan?.top_priorities || [];
  const displayTimeBlocks: TimeBlock[] = selectedPlan?.time_blocks || [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.electricIndigo}
          />
        }
      >
        {/* Header */}
        <Animated.View entering={FadeInUp.duration(400)} style={styles.header}>
          <Text style={styles.headerTitle}>7-Day Plan</Text>
          {activeCoachId && (
            <TouchableOpacity onPress={handleGeneratePlan} disabled={isGeneratingPlan}>
              {isGeneratingPlan ? (
                <ActivityIndicator size="small" color={Colors.electricIndigo} />
              ) : (
                <Ionicons name="sparkles" size={24} color={Colors.electricIndigo} />
              )}
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Week Navigation */}
        <Animated.View entering={FadeInUp.duration(400).delay(100)}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.weekScroll}
            contentContainerStyle={styles.weekContent}
          >
            {weekDates.map((date, index) => {
              const isSelected = formatDateStr(date) === formatDateStr(selectedDate);
              const isTodayDate = isToday(date);
              const datePlan = dayPlans.find(p => p.date === formatDateStr(date));
              const hasActivities = datePlan && datePlan.top_priorities.length > 0;
              const dayCompleted = datePlan?.top_priorities.every(p => p.completed);

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayButton,
                    isSelected && styles.dayButtonSelected,
                    isTodayDate && !isSelected && styles.dayButtonToday,
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedDate(date);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayName,
                      isSelected && styles.dayNameSelected,
                    ]}
                  >
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </Text>
                  <Text
                    style={[
                      styles.dayNumber,
                      isSelected && styles.dayNumberSelected,
                    ]}
                  >
                    {date.getDate()}
                  </Text>
                  {/* Activity indicator */}
                  <View style={styles.dayIndicatorContainer}>
                    {hasActivities && (
                      <View
                        style={[
                          styles.activityDot,
                          isSelected && styles.activityDotSelected,
                          dayCompleted && styles.activityDotCompleted,
                        ]}
                      />
                    )}
                    {isTodayDate && (
                      <View
                        style={[
                          styles.todayDot,
                          isSelected && styles.todayDotSelected,
                        ]}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Selected Day Content */}
        <Animated.View entering={FadeInUp.duration(400).delay(200)}>
          <View style={styles.selectedDateHeader}>
            <View>
              <Text style={styles.selectedDateTitle}>
                {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
              {isToday(selectedDate) && (
                <Text style={styles.todayLabel}>Today</Text>
              )}
            </View>
            {totalCount > 0 && (
              <View style={styles.progressBadge}>
                <Text style={styles.progressText}>{completionPercentage}%</Text>
              </View>
            )}
          </View>

          {/* Top 3 Priorities */}
          {displayPriorities.length > 0 ? (
            <Card style={styles.prioritiesCard} variant="elevated">
              <View style={styles.cardHeader}>
                <Ionicons name="flag" size={18} color={Colors.electricIndigo} />
                <Text style={styles.cardTitle}>Top 3 Priorities</Text>
              </View>
              <View style={styles.prioritiesList}>
                {displayPriorities.map((priority, index) => (
                  <Animated.View
                    key={priority.id}
                    entering={FadeInRight.duration(300).delay(index * 100)}
                    layout={Layout.springify()}
                  >
                    <TouchableOpacity
                      style={styles.priorityItem}
                      onPress={() => handleTogglePriority(selectedDateStr, priority.id)}
                      activeOpacity={0.7}
                    >
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
                      <Text
                        style={[
                          styles.priorityText,
                          priority.completed && styles.priorityTextCompleted,
                        ]}
                      >
                        {index + 1}. {priority.title}
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>

              {/* Progress bar */}
              {totalCount > 0 && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <Animated.View
                      style={[
                        styles.progressFill,
                        { width: `${completionPercentage}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressLabel}>
                    {completedCount} of {totalCount} completed
                  </Text>
                </View>
              )}
            </Card>
          ) : (
            <Card style={styles.emptyCard} variant="elevated">
              <Ionicons
                name="calendar-outline"
                size={48}
                color={Colors.slateLight}
              />
              <Text style={styles.emptyTitle}>No plan for this day</Text>
              <Text style={styles.emptyText}>
                {activeCoachId
                  ? 'Generate a plan with AI or chat with your coach to create priorities.'
                  : 'Install a coach to start planning your days.'}
              </Text>
              {activeCoachId && (
                <Button
                  title="Generate Plan"
                  onPress={handleGeneratePlan}
                  loading={isGeneratingPlan}
                  size="sm"
                  style={styles.generateButton}
                />
              )}
            </Card>
          )}

          {/* Time Blocks */}
          {displayTimeBlocks.length > 0 && (
            <Card style={styles.timeBlocksCard} variant="elevated">
              <View style={styles.cardHeader}>
                <Ionicons name="time" size={18} color={Colors.electricIndigo} />
                <Text style={styles.cardTitle}>Time Blocks</Text>
              </View>
              <View style={styles.timeBlocksList}>
                {displayTimeBlocks.map((block, index) => (
                  <Animated.View
                    key={block.id}
                    entering={FadeIn.duration(300).delay(index * 100)}
                  >
                    <View style={styles.timeBlock}>
                      <View style={styles.timeBlockTime}>
                        <Text style={styles.timeBlockTimeText}>
                          {block.start_time}
                        </Text>
                        <Text style={styles.timeBlockDivider}>-</Text>
                        <Text style={styles.timeBlockTimeText}>
                          {block.end_time}
                        </Text>
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
                  </Animated.View>
                ))}
              </View>
            </Card>
          )}

          {/* Adjust Button */}
          {activeCoachId && (
            <Animated.View entering={FadeIn.duration(300).delay(400)}>
              <TouchableOpacity
                style={styles.adjustButton}
                onPress={handleAdjustWithCoach}
                activeOpacity={0.8}
              >
                <View style={styles.adjustButtonContent}>
                  <Ionicons name="chatbubble-ellipses" size={20} color={Colors.white} />
                  <Text style={styles.adjustButtonText}>Adjust with coach</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          )}
        </Animated.View>

        {/* Weekly Overview */}
        <Animated.View entering={FadeInUp.duration(400).delay(300)} style={styles.weeklyOverview}>
          <Text style={styles.sectionTitle}>Weekly Overview</Text>
          <View style={styles.weeklyStats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {dayPlans.reduce((acc, plan) =>
                  acc + plan.top_priorities.filter(p => p.completed).length, 0
                )}
              </Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {dayPlans.reduce((acc, plan) =>
                  acc + plan.top_priorities.filter(p => !p.completed).length, 0
                )}
              </Text>
              <Text style={styles.statLabel}>Remaining</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {dayPlans.reduce((acc, plan) =>
                  acc + plan.time_blocks.length, 0
                )}
              </Text>
              <Text style={styles.statLabel}>Time Blocks</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.offWhite,
  },
  scrollContent: {
    paddingBottom: Spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
  },
  headerTitle: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.bold,
    color: Colors.slateCharcoal,
  },
  weekScroll: {
    marginBottom: Spacing.xl,
  },
  weekContent: {
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  dayButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.xl,
    backgroundColor: Colors.white,
    minWidth: 60,
    ...Shadows.sm,
  },
  dayButtonSelected: {
    backgroundColor: Colors.electricIndigo,
  },
  dayButtonToday: {
    borderWidth: 2,
    borderColor: Colors.electricIndigo,
  },
  dayName: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.medium,
    color: Colors.slateGray,
    marginBottom: Spacing.xs,
  },
  dayNameSelected: {
    color: Colors.white,
  },
  dayNumber: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.bold,
    color: Colors.slateCharcoal,
  },
  dayNumberSelected: {
    color: Colors.white,
  },
  dayIndicatorContainer: {
    flexDirection: 'row',
    gap: 4,
    marginTop: Spacing.xs,
    height: 6,
  },
  activityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.electricIndigoLight,
  },
  activityDotSelected: {
    backgroundColor: Colors.white,
  },
  activityDotCompleted: {
    backgroundColor: Colors.success,
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.electricIndigo,
  },
  todayDotSelected: {
    backgroundColor: Colors.white,
  },
  selectedDateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  selectedDateTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    color: Colors.slateCharcoal,
  },
  todayLabel: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    color: Colors.electricIndigo,
    marginTop: Spacing.xs,
  },
  progressBadge: {
    backgroundColor: Colors.electricIndigo + '15',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  progressText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.bold,
    color: Colors.electricIndigo,
  },
  prioritiesCard: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    color: Colors.slateCharcoal,
    marginLeft: Spacing.sm,
  },
  prioritiesList: {
    gap: Spacing.md,
  },
  priorityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    padding: Spacing.md,
    borderRadius: Radius.lg,
  },
  priorityCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.border,
    marginRight: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityCheckboxCompleted: {
    backgroundColor: Colors.electricIndigo,
    borderColor: Colors.electricIndigo,
  },
  priorityText: {
    fontSize: Typography.sizes.body,
    color: Colors.slateCharcoal,
    flex: 1,
  },
  priorityTextCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.slateLight,
  },
  progressContainer: {
    marginTop: Spacing.lg,
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.electricIndigo,
    borderRadius: 2,
  },
  progressLabel: {
    fontSize: Typography.sizes.caption,
    color: Colors.slateLight,
    marginTop: Spacing.xs,
  },
  timeBlocksCard: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    padding: Spacing.lg,
  },
  timeBlocksList: {
    gap: Spacing.sm,
  },
  timeBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderLeftWidth: 3,
    borderLeftColor: Colors.electricIndigo,
  },
  timeBlockTime: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 100,
  },
  timeBlockTimeText: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    color: Colors.slateGray,
  },
  timeBlockDivider: {
    fontSize: Typography.sizes.caption,
    color: Colors.slateLight,
    marginHorizontal: Spacing.xs,
  },
  timeBlockContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  timeBlockTitle: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.slateCharcoal,
  },
  categoryBadge: {
    backgroundColor: Colors.electricIndigo + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
  },
  categoryText: {
    fontSize: Typography.sizes.caption,
    color: Colors.electricIndigo,
    fontWeight: Typography.weights.medium,
  },
  emptyCard: {
    marginHorizontal: Spacing.xl,
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    padding: Spacing.xl,
  },
  emptyTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    color: Colors.slateCharcoal,
    marginTop: Spacing.md,
  },
  emptyText: {
    fontSize: Typography.sizes.body,
    color: Colors.slateGray,
    textAlign: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    lineHeight: 22,
  },
  generateButton: {
    marginTop: Spacing.lg,
  },
  adjustButton: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
    backgroundColor: Colors.electricIndigo,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    ...Shadows.md,
  },
  adjustButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustButtonText: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
    marginLeft: Spacing.sm,
  },
  weeklyOverview: {
    marginTop: Spacing.xxl,
    marginHorizontal: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.sizes.subtitle,
    fontWeight: Typography.weights.semibold,
    color: Colors.slateCharcoal,
    marginBottom: Spacing.md,
  },
  weeklyStats: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.bold,
    color: Colors.electricIndigo,
  },
  statLabel: {
    fontSize: Typography.sizes.caption,
    color: Colors.slateGray,
    marginTop: Spacing.xs,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.md,
  },
});
