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
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CoachIcon } from '@/components/ui/CoachIcon';
import { Coach, Session, DayPlan, Priority } from '@/types';
import { getCoachById } from '@/data/coaches';
import {
  getActiveCoachId,
  getSessions,
  getDayPlan,
} from '@/store/app';

export default function HomeScreen() {
  const router = useRouter();
  const [activeCoach, setActiveCoach] = useState<Coach | null>(null);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [todayPlan, setTodayPlan] = useState<DayPlan | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      // Get active coach
      const activeId = await getActiveCoachId();
      if (activeId) {
        const coach = getCoachById(activeId);
        setActiveCoach(coach || null);
      }

      // Get recent sessions
      const sessions = await getSessions();
      setRecentSessions(sessions.slice(0, 3));

      // Get today's plan
      const today = new Date().toISOString().split('T')[0];
      const plan = await getDayPlan(today);
      setTodayPlan(plan);
    } catch (error) {
      console.error('Error loading data:', error);
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

  const handleStartCheckIn = () => {
    if (activeCoach) {
      router.push(`/chat/${activeCoach.id}`);
    }
  };

  const handleOpenChat = () => {
    if (activeCoach) {
      router.push(`/chat/${activeCoach.id}`);
    }
  };

  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  // Default priorities if no plan exists
  const priorities: Priority[] = todayPlan?.top_priorities || [
    { id: '1', title: 'Start your first check-in', completed: false, order: 1 },
    { id: '2', title: 'Explore the Coach Library', completed: false, order: 2 },
    { id: '3', title: 'Review your Context Vault', completed: false, order: 3 },
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
            tintColor={Colors.electricIndigo}
          />
        }
      >
        {/* Header */}
        <Animated.View entering={FadeInUp.duration(400)} style={styles.header}>
          <Text style={styles.headerTitle}>Home</Text>
          <TouchableOpacity style={styles.avatarButton}>
            <Ionicons name="person-circle" size={36} color={Colors.slateLight} />
          </TouchableOpacity>
        </Animated.View>

        {/* Today Card */}
        <Animated.View entering={FadeInUp.duration(400).delay(100)}>
          <Card variant="elevated" style={styles.todayCard}>
            <View style={styles.todayHeader}>
              <Text style={styles.todayTitle}>Today</Text>
              <Text style={styles.todayDate}>{dateString}</Text>
            </View>

            <Text style={styles.sectionLabel}>Top 3 Priorities</Text>
            <View style={styles.prioritiesList}>
              {priorities.map((priority, index) => (
                <PriorityItem
                  key={priority.id}
                  priority={priority}
                  index={index + 1}
                />
              ))}
            </View>

            {todayPlan?.time_blocks && todayPlan.time_blocks.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>Next Action</Text>
                <View style={styles.nextAction}>
                  <View style={styles.checkCircle}>
                    <Ionicons name="checkmark" size={14} color={Colors.success} />
                  </View>
                  <Text style={styles.nextActionText}>
                    {todayPlan.time_blocks[0].title}
                  </Text>
                </View>
              </>
            )}

            <Button
              title="Start a check-in"
              onPress={handleStartCheckIn}
              fullWidth
              style={styles.checkInButton}
            />
          </Card>
        </Animated.View>

        {/* Active Coach */}
        {activeCoach && (
          <Animated.View entering={FadeInUp.duration(400).delay(200)}>
            <Text style={styles.sectionTitle}>Active Coach</Text>
            <Card style={styles.coachCard}>
              <View style={styles.coachRow}>
                <CoachIcon
                  iconName={activeCoach.icon_name}
                  color={activeCoach.color}
                  size="sm"
                />
                <View style={styles.coachInfo}>
                  <Text style={styles.coachName}>{activeCoach.name}</Text>
                  <Text style={styles.coachStatus}>Ready for your check-in</Text>
                </View>
                <Button title="Chat" onPress={handleOpenChat} size="sm" />
              </View>
            </Card>
          </Animated.View>
        )}

        {/* Recent Sessions */}
        <Animated.View entering={FadeInUp.duration(400).delay(300)}>
          <Text style={styles.sectionTitle}>Recent Sessions</Text>
          {recentSessions.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.sessionsScroll}
            >
              {recentSessions.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </ScrollView>
          ) : (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                No sessions yet. Start a check-in with your coach!
              </Text>
            </Card>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PriorityItem({
  priority,
  index,
}: {
  priority: Priority;
  index: number;
}) {
  return (
    <View style={styles.priorityItem}>
      <View
        style={[
          styles.priorityCheckbox,
          priority.completed && styles.priorityCheckboxCompleted,
        ]}
      >
        {priority.completed && (
          <Ionicons name="checkmark" size={12} color={Colors.white} />
        )}
      </View>
      <Text
        style={[
          styles.priorityText,
          priority.completed && styles.priorityTextCompleted,
        ]}
      >
        {index}. {priority.title}
      </Text>
    </View>
  );
}

function SessionCard({ session }: { session: Session }) {
  const formattedDate = new Date(session.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
  const formattedTime = new Date(session.created_at).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <Card style={styles.sessionCard} variant="outlined">
      <Text style={styles.sessionTitle} numberOfLines={2}>
        {session.title}
      </Text>
      <Text style={styles.sessionDate}>
        {formattedDate}, {formattedTime}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.offWhite,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  headerTitle: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.bold,
    color: Colors.slateCharcoal,
  },
  avatarButton: {
    padding: Spacing.xs,
  },
  todayCard: {
    marginBottom: Spacing.xl,
  },
  todayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  todayTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.bold,
    color: Colors.slateCharcoal,
  },
  todayDate: {
    fontSize: Typography.sizes.body,
    color: Colors.slateGray,
  },
  sectionLabel: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    color: Colors.slateGray,
    marginBottom: Spacing.sm,
  },
  prioritiesList: {
    marginBottom: Spacing.lg,
  },
  priorityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  priorityCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
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
  nextAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.successLight,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.lg,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  nextActionText: {
    fontSize: Typography.sizes.body,
    color: Colors.slateCharcoal,
    fontWeight: Typography.weights.medium,
    flex: 1,
  },
  checkInButton: {
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.sizes.subtitle,
    fontWeight: Typography.weights.semibold,
    color: Colors.slateCharcoal,
    marginBottom: Spacing.md,
  },
  coachCard: {
    marginBottom: Spacing.xl,
  },
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coachInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  coachName: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    color: Colors.slateCharcoal,
  },
  coachStatus: {
    fontSize: Typography.sizes.caption,
    color: Colors.slateGray,
  },
  sessionsScroll: {
    marginHorizontal: -Spacing.xl,
    paddingHorizontal: Spacing.xl,
  },
  sessionCard: {
    width: 160,
    marginRight: Spacing.md,
    padding: Spacing.md,
  },
  sessionTitle: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.slateCharcoal,
    marginBottom: Spacing.xs,
  },
  sessionDate: {
    fontSize: Typography.sizes.caption,
    color: Colors.slateLight,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    fontSize: Typography.sizes.body,
    color: Colors.slateLight,
    textAlign: 'center',
  },
});
