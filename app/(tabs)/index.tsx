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
  FadeInDown,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  interpolate,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { CoachIcon } from '@/components/ui/CoachIcon';
import { Coach, Session, DayPlan, Priority } from '@/types';
import { getCoachById } from '@/data/coaches';
import {
  getActiveCoachId,
  getSessions,
  getDayPlan,
} from '@/store/app';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const [activeCoach, setActiveCoach] = useState<Coach | null>(null);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [todayPlan, setTodayPlan] = useState<DayPlan | null>(null);
  const [refreshing, setRefreshing] = useState(false);

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (activeCoach) {
      router.push(`/chat/${activeCoach.id}`);
    }
  };

  const handleOpenChat = () => {
    if (activeCoach) {
      router.push(`/chat/${activeCoach.id}`);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
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
        <Animated.View entering={FadeInUp.duration(700).delay(100)} style={styles.heroSection}>
          <View style={styles.heroHeader}>
            <View>
              <Text style={styles.heroGreeting}>{getGreeting()}</Text>
              <Text style={styles.heroDate}>{dateString}</Text>
            </View>
            <TouchableOpacity style={styles.avatarButton}>
              <LinearGradient
                colors={[Colors.burnishedGold, Colors.goldLight]}
                style={styles.avatarGradient}
              >
                <Ionicons name="person" size={20} color={Colors.white} />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Progress Ring */}
          <View style={styles.progressContainer}>
            <ProgressRing
              progress={progressPercentage}
              size={180}
              strokeWidth={14}
              label="Alignment"
              sublabel="with daily goals"
            />
          </View>

          {/* Quick insight */}
          <View style={styles.insightCard}>
            <Ionicons name="sparkles" size={16} color={Colors.burnishedGold} />
            <Text style={styles.insightText}>
              {progressPercentage === 100
                ? "Perfect alignment today. Well done."
                : progressPercentage > 50
                ? "Making great progress. Keep the momentum."
                : "Start with one small action today."}
            </Text>
          </View>
        </Animated.View>

        {/* Active Coach Card - Floating Premium Style */}
        {activeCoach && (
          <Animated.View entering={FadeInUp.duration(600).delay(200)}>
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
          </Animated.View>
        )}

        {/* Today's Focus - Editorial Card */}
        <Animated.View entering={FadeInUp.duration(600).delay(300)}>
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
        </Animated.View>

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <Animated.View entering={FadeInUp.duration(600).delay(400)}>
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
          </Animated.View>
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
}: {
  priority: Priority;
  index: number;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
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
    <Animated.View entering={FadeInUp.duration(500).delay(500 + index * 100)}>
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
    paddingBottom: Spacing.xxl,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.xxxl,
  },
  heroGreeting: {
    fontSize: Typography.sizes.hero,
    fontWeight: Typography.weights.light,
    color: Colors.midnightEmerald,
    fontFamily: Typography.fonts.serif,
    letterSpacing: Typography.letterSpacing.tight,
  },
  heroDate: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
    marginTop: Spacing.xs,
    letterSpacing: Typography.letterSpacing.wide,
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
  },

  // Progress Ring
  progressContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
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
    marginBottom: Spacing.xxl,
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

  // Section Headers
  sectionHeader: {
    paddingHorizontal: Spacing.xxl,
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
    marginHorizontal: Spacing.xxl,
    marginBottom: Spacing.xxl,
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
