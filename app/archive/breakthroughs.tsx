// Breakthrough Logs - Visually stunning section for revisiting breakthroughs
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withDelay,
  withTiming,
  interpolate,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
import { useAuthSafe } from '@/hooks/useConditionalAuth';
import { getAllBreakthroughs } from '@/lib/supabase-archive';
import { Breakthrough, BreakthroughAction } from '@/types';
import { getCoachById } from '@/data/coaches';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function BreakthroughsScreen() {
  const router = useRouter();
  const { id: highlightId } = useLocalSearchParams<{ id?: string }>();
  const auth = useAuthSafe();

  const [breakthroughs, setBreakthroughs] = useState<Breakthrough[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(highlightId || null);

  const loadBreakthroughs = useCallback(async () => {
    if (!auth?.user?.id) return;

    try {
      const data = await getAllBreakthroughs(auth.user.id, 50);
      setBreakthroughs(data);
    } catch (error) {
      console.error('Error loading breakthroughs:', error);
    }
  }, [auth?.user?.id]);

  useEffect(() => {
    loadBreakthroughs();
  }, [loadBreakthroughs]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBreakthroughs();
    setRefreshing(false);
  }, [loadBreakthroughs]);

  const handleBackPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleExpandToggle = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedId(expandedId === id ? null : id);
  };

  // Group breakthroughs by month
  const groupedBreakthroughs = groupByMonth(breakthroughs);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Ionicons name="chevron-back" size={24} color={Colors.midnightEmerald} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="star" size={20} color={Colors.burnishedGold} />
          <Text style={styles.headerTitle}>Breakthrough Logs</Text>
        </View>
        <View style={styles.headerRight} />
      </Animated.View>

      {/* Stats Banner */}
      <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.statsBanner}>
        <LinearGradient
          colors={[Colors.midnightEmerald, '#243D2E']}
          style={styles.statsGradient}
        >
          <View style={styles.statsContent}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{breakthroughs.length}</Text>
              <Text style={styles.statLabel}>Total Breakthroughs</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {breakthroughs.filter(b => {
                  const date = new Date(b.date);
                  const now = new Date();
                  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                }).length}
              </Text>
              <Text style={styles.statLabel}>This Month</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Content */}
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
        {breakthroughs.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="star-outline" size={48} color={Colors.stoneGray} />
            </View>
            <Text style={styles.emptyTitle}>No breakthroughs yet</Text>
            <Text style={styles.emptySubtitle}>
              Your breakthrough moments will be celebrated here
            </Text>
          </View>
        ) : (
          Object.entries(groupedBreakthroughs).map(([monthYear, monthBreakthroughs], groupIndex) => (
            <View key={monthYear} style={styles.monthGroup}>
              <Animated.Text
                entering={FadeInDown.duration(300).delay(groupIndex * 50)}
                style={styles.monthLabel}
              >
                {monthYear}
              </Animated.Text>
              <View style={styles.breakthroughsList}>
                {monthBreakthroughs.map((breakthrough, index) => (
                  <BreakthroughCard
                    key={breakthrough.id}
                    breakthrough={breakthrough}
                    index={groupIndex * 10 + index}
                    isExpanded={expandedId === breakthrough.id}
                    isHighlighted={highlightId === breakthrough.id}
                    onToggle={() => handleExpandToggle(breakthrough.id)}
                  />
                ))}
              </View>
            </View>
          ))
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

interface BreakthroughCardProps {
  breakthrough: Breakthrough;
  index: number;
  isExpanded: boolean;
  isHighlighted: boolean;
  onToggle: () => void;
}

function BreakthroughCard({
  breakthrough,
  index,
  isExpanded,
  isHighlighted,
  onToggle,
}: BreakthroughCardProps) {
  const scale = useSharedValue(0.95);
  const opacity = useSharedValue(0);
  const shimmerPosition = useSharedValue(0);
  const expandHeight = useSharedValue(0);

  const coach = getCoachById(breakthrough.coach_id);

  useEffect(() => {
    const delay = Math.min(index * 80, 500);
    scale.value = withDelay(delay, withSpring(1, Timing.springGentle));
    opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));

    // Gold dust shimmer for highlighted item
    if (isHighlighted) {
      shimmerPosition.value = withDelay(
        delay + 200,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 1500 }),
            withTiming(0, { duration: 0 })
          ),
          2
        )
      );
    }
  }, [index, isHighlighted, opacity, scale, shimmerPosition]);

  useEffect(() => {
    expandHeight.value = withSpring(isExpanded ? 1 : 0, Timing.springGentle);
  }, [expandHeight, isExpanded]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmerPosition.value, [0, 0.5, 1], [0, 0.4, 0]),
    transform: [
      {
        translateX: interpolate(
          shimmerPosition.value,
          [0, 1],
          [-SCREEN_WIDTH, SCREEN_WIDTH]
        ),
      },
    ],
  }));

  const expandedStyle = useAnimatedStyle(() => ({
    opacity: expandHeight.value,
    maxHeight: interpolate(expandHeight.value, [0, 1], [0, 500]),
  }));

  const formattedDate = new Date(breakthrough.date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Animated.View style={[styles.breakthroughCard, containerStyle]}>
      <TouchableOpacity activeOpacity={0.95} onPress={onToggle}>
        <LinearGradient
          colors={isHighlighted ? [Colors.burnishedGold, Colors.goldLight] : [Colors.cardBg, Colors.cream]}
          style={styles.cardGradient}
        >
          {/* Shimmer overlay */}
          <Animated.View style={[styles.shimmerOverlay, shimmerStyle]}>
            <LinearGradient
              colors={['transparent', Colors.goldShimmer, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.shimmerGradient}
            />
          </Animated.View>

          {/* Star decoration */}
          <View style={styles.starDecoration}>
            <Ionicons
              name="star"
              size={24}
              color={isHighlighted ? Colors.white : Colors.burnishedGold}
            />
          </View>

          {/* Header */}
          <View style={styles.cardHeader}>
            <Text style={[styles.cardDate, isHighlighted && styles.cardDateHighlighted]}>
              {formattedDate}
            </Text>
            <View style={styles.coachBadge}>
              <Ionicons
                name={coach?.icon_name as keyof typeof Ionicons.glyphMap || 'person'}
                size={12}
                color={isHighlighted ? Colors.white : Colors.stoneGray}
              />
              <Text style={[styles.coachName, isHighlighted && styles.coachNameHighlighted]}>
                {coach?.name || 'Coach'}
              </Text>
            </View>
          </View>

          {/* Title */}
          <Text style={[styles.cardTitle, isHighlighted && styles.cardTitleHighlighted]}>
            {breakthrough.title}
          </Text>

          {/* Summary */}
          <Text
            style={[styles.cardSummary, isHighlighted && styles.cardSummaryHighlighted]}
            numberOfLines={isExpanded ? undefined : 3}
          >
            {breakthrough.summary}
          </Text>

          {/* Expanded content */}
          <Animated.View style={[styles.expandedContent, expandedStyle]}>
            {/* Key Takeaways */}
            {breakthrough.key_takeaways && breakthrough.key_takeaways.length > 0 && (
              <View style={styles.takeawaysSection}>
                <Text style={[styles.sectionLabel, isHighlighted && styles.sectionLabelHighlighted]}>
                  Key Takeaways
                </Text>
                {(breakthrough.key_takeaways as string[]).map((takeaway, i) => (
                  <View key={i} style={styles.takeawayItem}>
                    <View style={[styles.takeawayBullet, isHighlighted && styles.takeawayBulletHighlighted]} />
                    <Text style={[styles.takeawayText, isHighlighted && styles.takeawayTextHighlighted]}>
                      {takeaway}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Action Items */}
            {breakthrough.action_items && (breakthrough.action_items as BreakthroughAction[]).length > 0 && (
              <View style={styles.actionsSection}>
                <Text style={[styles.sectionLabel, isHighlighted && styles.sectionLabelHighlighted]}>
                  Action Items
                </Text>
                {(breakthrough.action_items as BreakthroughAction[]).map((action, i) => (
                  <View key={i} style={styles.actionItem}>
                    <Ionicons
                      name={action.completed ? 'checkmark-circle' : 'ellipse-outline'}
                      size={18}
                      color={action.completed
                        ? (isHighlighted ? Colors.white : Colors.success)
                        : (isHighlighted ? 'rgba(255,255,255,0.6)' : Colors.stoneGray)
                      }
                    />
                    <Text
                      style={[
                        styles.actionText,
                        action.completed && styles.actionTextCompleted,
                        isHighlighted && styles.actionTextHighlighted,
                      ]}
                    >
                      {action.title}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>

          {/* Expand indicator */}
          <View style={styles.expandIndicator}>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={isHighlighted ? Colors.white : Colors.stoneGray}
            />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// Helper function to group breakthroughs by month
function groupByMonth(breakthroughs: Breakthrough[]): Record<string, Breakthrough[]> {
  const groups: Record<string, Breakthrough[]> = {};

  breakthroughs.forEach(breakthrough => {
    const date = new Date(breakthrough.date);
    const monthYear = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    if (!groups[monthYear]) {
      groups[monthYear] = [];
    }
    groups[monthYear].push(breakthrough);
  });

  return groups;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.warmOatmeal,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    color: Colors.midnightEmerald,
  },
  headerRight: {
    width: 40,
  },
  statsBanner: {
    marginHorizontal: Spacing.xxl,
    marginTop: Spacing.lg,
    borderRadius: Radius.squircle,
    overflow: 'hidden',
    ...Shadows.md,
  },
  statsGradient: {
    padding: Spacing.xl,
  },
  statsContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  statValue: {
    fontSize: Typography.sizes.display,
    fontWeight: Typography.weights.bold,
    fontFamily: Typography.fonts.serif,
    color: Colors.white,
  },
  statLabel: {
    fontSize: Typography.sizes.caption,
    color: Colors.goldLight,
    marginTop: Spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    color: Colors.charcoal,
  },
  emptySubtitle: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  monthGroup: {
    marginBottom: Spacing.xl,
  },
  monthLabel: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    color: Colors.burnishedGold,
    letterSpacing: Typography.letterSpacing.wider,
    textTransform: 'uppercase',
    marginBottom: Spacing.md,
  },
  breakthroughsList: {
    gap: Spacing.md,
  },
  breakthroughCard: {
    borderRadius: Radius.squircle,
    overflow: 'hidden',
    ...Shadows.md,
  },
  cardGradient: {
    padding: Spacing.xl,
    position: 'relative',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  shimmerGradient: {
    width: 100,
    height: '100%',
  },
  starDecoration: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
    opacity: 0.3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  cardDate: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
  },
  cardDateHighlighted: {
    color: 'rgba(255,255,255,0.8)',
  },
  coachBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  coachName: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
  },
  coachNameHighlighted: {
    color: 'rgba(255,255,255,0.8)',
  },
  cardTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    color: Colors.midnightEmerald,
    marginBottom: Spacing.sm,
  },
  cardTitleHighlighted: {
    color: Colors.white,
  },
  cardSummary: {
    fontSize: Typography.sizes.body,
    color: Colors.charcoal,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },
  cardSummaryHighlighted: {
    color: 'rgba(255,255,255,0.9)',
  },
  expandedContent: {
    overflow: 'hidden',
  },
  takeawaysSection: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  sectionLabel: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    color: Colors.burnishedGold,
    letterSpacing: Typography.letterSpacing.wide,
    textTransform: 'uppercase',
    marginBottom: Spacing.md,
  },
  sectionLabelHighlighted: {
    color: 'rgba(255,255,255,0.8)',
  },
  takeawayItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  takeawayBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.burnishedGold,
    marginTop: 6,
  },
  takeawayBulletHighlighted: {
    backgroundColor: Colors.white,
  },
  takeawayText: {
    flex: 1,
    fontSize: Typography.sizes.body,
    color: Colors.charcoal,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },
  takeawayTextHighlighted: {
    color: 'rgba(255,255,255,0.9)',
  },
  actionsSection: {
    marginTop: Spacing.lg,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  actionText: {
    flex: 1,
    fontSize: Typography.sizes.body,
    color: Colors.charcoal,
  },
  actionTextCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.stoneGray,
  },
  actionTextHighlighted: {
    color: 'rgba(255,255,255,0.9)',
  },
  expandIndicator: {
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  bottomSpacer: {
    height: 100,
  },
});
