// Chronicle - Sophisticated vertical timeline for session history
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
import { EnhancedSession } from '@/types';
import { getCoachById } from '@/data/coaches';
import { CoachIcon } from '@/components/ui/CoachIcon';

interface ChronicleProps {
  sessions: EnhancedSession[];
  onSessionPress: (session: EnhancedSession) => void;
  maxItems?: number;
}

export function Chronicle({ sessions, onSessionPress, maxItems = 10 }: ChronicleProps) {
  const displaySessions = sessions.slice(0, maxItems);

  // Group sessions by date
  const groupedSessions = groupSessionsByDate(displaySessions);

  if (displaySessions.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="time-outline" size={40} color={Colors.stoneGray} />
        <Text style={styles.emptyText}>Your journey begins</Text>
        <Text style={styles.emptySubtext}>
          Completed sessions will form your chronicle
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {groupedSessions.map((group, groupIndex) => (
        <View key={group.date} style={styles.dateGroup}>
          {/* Date stamp */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(groupIndex * 150)}
            style={styles.dateStamp}
          >
            <View style={styles.dateStampInner}>
              <Text style={styles.dateDay}>{group.day}</Text>
              <Text style={styles.dateMonthYear}>{group.monthYear}</Text>
            </View>
          </Animated.View>

          {/* Sessions for this date */}
          <View style={styles.sessionsColumn}>
            {group.sessions.map((session, sessionIndex) => (
              <SessionEntry
                key={session.id}
                session={session}
                index={groupIndex * 3 + sessionIndex}
                isLast={sessionIndex === group.sessions.length - 1 && groupIndex === groupedSessions.length - 1}
                onPress={() => onSessionPress(session)}
              />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

interface SessionEntryProps {
  session: EnhancedSession;
  index: number;
  isLast: boolean;
  onPress: () => void;
}

function SessionEntry({ session, index, isLast, onPress }: SessionEntryProps) {
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(-20);

  const coach = getCoachById(session.coach_id);

  useEffect(() => {
    const delay = index * 80;
    scale.value = withDelay(delay, withSpring(1, Timing.springGentle));
    opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
    translateX.value = withDelay(delay, withSpring(0, Timing.springGentle));
  }, [index, opacity, scale, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateX: translateX.value }],
    opacity: opacity.value,
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const time = new Date(session.created_at).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <Animated.View style={[styles.entryWrapper, animatedStyle]}>
      <View style={styles.timelineConnector}>
        {/* Timeline dot */}
        <View
          style={[
            styles.timelineDot,
            session.status === 'completed' && styles.timelineDotCompleted,
          ]}
        >
          {session.breakthrough_summary && (
            <Ionicons name="star" size={8} color={Colors.white} />
          )}
        </View>

        {/* Connecting line */}
        {!isLast && <View style={styles.timelineLine} />}
      </View>

      <TouchableOpacity
        style={styles.entryCard}
        activeOpacity={0.9}
        onPress={handlePress}
      >
        {/* Coach avatar */}
        <View style={styles.coachAvatar}>
          <CoachIcon
            iconName={coach?.icon_name || 'person'}
            color={coach?.color || Colors.burnishedGold}
            size="sm"
          />
        </View>

        {/* Content */}
        <View style={styles.entryContent}>
          <View style={styles.entryHeader}>
            <Text style={styles.coachName}>{coach?.name || 'Coach'}</Text>
            <Text style={styles.timeText}>{time}</Text>
          </View>

          <Text style={styles.sessionTitle} numberOfLines={2}>
            {session.title}
          </Text>

          {session.breakthrough_summary && (
            <View style={styles.breakthroughBadge}>
              <Ionicons name="sparkles" size={10} color={Colors.burnishedGold} />
              <Text style={styles.breakthroughText}>Breakthrough</Text>
            </View>
          )}

          {session.summary && !session.breakthrough_summary && (
            <Text style={styles.sessionSummary} numberOfLines={2}>
              {session.summary}
            </Text>
          )}
        </View>

        {/* Arrow */}
        <Ionicons
          name="chevron-forward"
          size={18}
          color={Colors.stoneGray}
          style={styles.arrow}
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

// Helper function to group sessions by date
function groupSessionsByDate(sessions: EnhancedSession[]): {
  date: string;
  day: string;
  monthYear: string;
  sessions: EnhancedSession[];
}[] {
  const groups: Map<string, EnhancedSession[]> = new Map();

  sessions.forEach(session => {
    const date = new Date(session.created_at);
    const dateKey = date.toISOString().split('T')[0];

    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(session);
  });

  return Array.from(groups.entries())
    .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
    .map(([dateKey, sessions]) => {
      const date = new Date(dateKey);
      return {
        date: dateKey,
        day: date.getDate().toString(),
        monthYear: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        sessions,
      };
    });
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.xxl,
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xxxl,
    paddingHorizontal: Spacing.xxl,
  },
  emptyText: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    color: Colors.charcoal,
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  dateGroup: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
  },
  dateStamp: {
    width: 60,
    alignItems: 'center',
    paddingTop: Spacing.sm,
  },
  dateStampInner: {
    alignItems: 'center',
    backgroundColor: Colors.goldMuted,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
  },
  dateDay: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    color: Colors.midnightEmerald,
  },
  dateMonthYear: {
    fontSize: Typography.sizes.micro,
    color: Colors.stoneGray,
    letterSpacing: Typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  sessionsColumn: {
    flex: 1,
  },
  entryWrapper: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  timelineConnector: {
    width: 24,
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.stoneGray,
    borderWidth: 2,
    borderColor: Colors.warmOatmeal,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timelineDotCompleted: {
    backgroundColor: Colors.burnishedGold,
  },
  timelineLine: {
    position: 'absolute',
    top: 16,
    bottom: -Spacing.md,
    width: 2,
    backgroundColor: Colors.borderLight,
  },
  entryCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.cardBg,
    padding: Spacing.lg,
    borderRadius: Radius.squircle,
    ...Shadows.sm,
  },
  coachAvatar: {
    marginRight: Spacing.md,
  },
  entryContent: {
    flex: 1,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  coachName: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    color: Colors.burnishedGold,
    letterSpacing: Typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  timeText: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
  },
  sessionTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.medium,
    fontFamily: Typography.fonts.serif,
    color: Colors.charcoal,
    lineHeight: Typography.sizes.bodyLarge * Typography.lineHeights.snug,
  },
  sessionSummary: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
    marginTop: Spacing.xs,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },
  breakthroughBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.goldMuted,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    marginTop: Spacing.sm,
  },
  breakthroughText: {
    fontSize: Typography.sizes.micro,
    fontWeight: Typography.weights.semibold,
    color: Colors.burnishedGold,
    letterSpacing: Typography.letterSpacing.wide,
  },
  arrow: {
    marginLeft: Spacing.sm,
    marginTop: 4,
  },
});
