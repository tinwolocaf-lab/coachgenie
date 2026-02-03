import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DayPlan, Priority, TimeBlock } from '@/types';
import { getDayPlans, updateDayPlan, getActiveCoachId } from '@/store/app';

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
    const plan = dayPlans.find((p) => p.date === dateStr);
    if (plan) {
      const updatedPriorities = plan.top_priorities.map((p) =>
        p.id === priorityId ? { ...p, completed: !p.completed } : p
      );
      const updatedPlan = { ...plan, top_priorities: updatedPriorities };
      await updateDayPlan(updatedPlan);
      await loadData();
    }
  };

  const handleAdjustWithCoach = () => {
    if (activeCoachId) {
      router.push(`/chat/${activeCoachId}?context=plan`);
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

  // Default priorities for empty days
  const displayPriorities: Priority[] = selectedPlan?.top_priorities || [
    { id: '1', title: 'No priorities set', completed: false, order: 1 },
  ];

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
              const isSelected =
                formatDateStr(date) === formatDateStr(selectedDate);
              const isTodayDate = isToday(date);

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.dayButton,
                    isSelected && styles.dayButtonSelected,
                    isTodayDate && !isSelected && styles.dayButtonToday,
                  ]}
                  onPress={() => setSelectedDate(date)}
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
                  {isTodayDate && (
                    <View
                      style={[
                        styles.todayDot,
                        isSelected && styles.todayDotSelected,
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* Selected Day Content */}
        <Animated.View entering={FadeInUp.duration(400).delay(200)}>
          <View style={styles.selectedDateHeader}>
            <Text style={styles.selectedDateTitle}>
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
              {isToday(selectedDate) && (
                <Text style={styles.todayLabel}> (Today)</Text>
              )}
            </Text>
          </View>

          {/* Top 3 Priorities */}
          <Card style={styles.prioritiesCard}>
            <Text style={styles.cardTitle}>Top 3 Priorities</Text>
            <View style={styles.prioritiesList}>
              {displayPriorities.map((priority, index) => (
                <TouchableOpacity
                  key={priority.id}
                  style={styles.priorityItem}
                  onPress={() =>
                    handleTogglePriority(selectedDateStr, priority.id)
                  }
                  disabled={!selectedPlan}
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
              ))}
            </View>
          </Card>

          {/* Time Blocks */}
          {displayTimeBlocks.length > 0 && (
            <Card style={styles.timeBlocksCard}>
              <Text style={styles.cardTitle}>Time Blocks</Text>
              <View style={styles.timeBlocksList}>
                {displayTimeBlocks.map((block) => (
                  <View key={block.id} style={styles.timeBlock}>
                    <Text style={styles.timeBlockTime}>
                      {block.start_time} - {block.end_time}
                    </Text>
                    <Text style={styles.timeBlockTitle}>{block.title}</Text>
                  </View>
                ))}
              </View>
            </Card>
          )}

          {/* Empty State */}
          {!selectedPlan && (
            <Card style={styles.emptyCard}>
              <Ionicons
                name="calendar-outline"
                size={48}
                color={Colors.slateLight}
              />
              <Text style={styles.emptyTitle}>No plan for this day</Text>
              <Text style={styles.emptyText}>
                Chat with your coach to generate priorities and time blocks.
              </Text>
            </Card>
          )}

          {/* Adjust Button */}
          {activeCoachId && (
            <Button
              title="Adjust with coach"
              onPress={handleAdjustWithCoach}
              variant="outline"
              fullWidth
              style={styles.adjustButton}
            />
          )}
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
    borderRadius: Radius.lg,
    backgroundColor: Colors.white,
    minWidth: 56,
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
    fontSize: Typography.sizes.subtitle,
    fontWeight: Typography.weights.bold,
    color: Colors.slateCharcoal,
  },
  dayNumberSelected: {
    color: Colors.white,
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.electricIndigo,
    marginTop: Spacing.xs,
  },
  todayDotSelected: {
    backgroundColor: Colors.white,
  },
  selectedDateHeader: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  selectedDateTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    color: Colors.slateCharcoal,
  },
  todayLabel: {
    color: Colors.electricIndigo,
    fontWeight: Typography.weights.bold,
  },
  prioritiesCard: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  cardTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    color: Colors.slateCharcoal,
    marginBottom: Spacing.md,
  },
  prioritiesList: {
    gap: Spacing.sm,
  },
  priorityItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
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
  timeBlocksCard: {
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  timeBlocksList: {
    gap: Spacing.sm,
  },
  timeBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  timeBlockTime: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.medium,
    color: Colors.slateGray,
    minWidth: 110,
  },
  timeBlockTitle: {
    fontSize: Typography.sizes.body,
    color: Colors.slateCharcoal,
    flex: 1,
  },
  emptyCard: {
    marginHorizontal: Spacing.xl,
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
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
  },
  adjustButton: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.lg,
  },
});
