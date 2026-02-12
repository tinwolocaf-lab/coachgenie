// Chronicle - Sophisticated vertical timeline for session history
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
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
import { Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { EnhancedSession } from '@/types';
import { getCoachById } from '@/data/coaches';
import { CoachIcon } from '@/components/ui/CoachIcon';

const EMPTY_NO_SESSIONS_IMAGE = require('../../assets/images/empty-no-sessions.png');

interface ChronicleProps {
  sessions: EnhancedSession[];
  onSessionPress: (session: EnhancedSession) => void;
  maxItems?: number;
}

export function Chronicle({ sessions, onSessionPress, maxItems = 10 }: ChronicleProps) {
  const { palette } = useThemeSafe();
  const displaySessions = sessions.slice(0, maxItems);

  // Group sessions by date
  const groupedSessions = groupSessionsByDate(displaySessions);

  if (displaySessions.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Image source={EMPTY_NO_SESSIONS_IMAGE} style={styles.emptyIllustration} resizeMode="contain" />
        <Text style={[styles.emptyText, { color: palette.textSecondary }]}>Your journey begins</Text>
        <Text style={[styles.emptySubtext, { color: palette.textTertiary }]}>
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
            <View style={[styles.dateStampInner, { backgroundColor: palette.accentMuted }]}>
              <Text style={[styles.dateDay, { color: palette.textPrimary }]}>{group.day}</Text>
              <Text style={[styles.dateMonthYear, { color: palette.textTertiary }]}>{group.monthYear}</Text>
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
  const { palette } = useThemeSafe();
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
            { backgroundColor: palette.textTertiary, borderColor: palette.background },
            session.status === 'completed' && { backgroundColor: palette.accent },
          ]}
        >
          {session.breakthrough_summary && (
            <Ionicons name="star" size={8} color={palette.textInverse} />
          )}
        </View>

        {/* Connecting line */}
        {!isLast && <View style={[styles.timelineLine, { backgroundColor: palette.borderLight }]} />}
      </View>

      <TouchableOpacity
        style={[styles.entryCard, { backgroundColor: palette.cardBg }]}
        activeOpacity={0.9}
        onPress={handlePress}
      >
        {/* Coach avatar */}
        <View style={styles.coachAvatar}>
          <CoachIcon
            iconName={coach?.icon_name || 'person'}
            color={coach?.color || palette.accent}
            size="sm"
          />
        </View>

        {/* Content */}
        <View style={styles.entryContent}>
          <View style={styles.entryHeader}>
            <Text style={[styles.coachName, { color: palette.accent }]}>{coach?.name || 'Coach'}</Text>
            <Text style={[styles.timeText, { color: palette.textTertiary }]}>{time}</Text>
          </View>

          <Text style={[styles.sessionTitle, { color: palette.textSecondary }]} numberOfLines={2}>
            {session.title}
          </Text>

          {session.breakthrough_summary && (
            <View style={[styles.breakthroughBadge, { backgroundColor: palette.accentMuted }]}>
              <Ionicons name="sparkles" size={10} color={palette.accent} />
              <Text style={[styles.breakthroughText, { color: palette.accent }]}>Breakthrough</Text>
            </View>
          )}

          {session.summary && !session.breakthrough_summary && (
            <Text style={[styles.sessionSummary, { color: palette.textTertiary }]} numberOfLines={2}>
              {session.summary}
            </Text>
          )}
        </View>

        {/* Arrow */}
        <Ionicons
          name="chevron-forward"
          size={18}
          color={palette.textTertiary}
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
  emptyIllustration: {
    width: 148,
    height: 112,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: Typography.sizes.body,
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
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
  },
  dateDay: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
  },
  dateMonthYear: {
    fontSize: Typography.sizes.micro,
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
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timelineLine: {
    position: 'absolute',
    top: 16,
    bottom: -Spacing.md,
    width: 2,
  },
  entryCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    letterSpacing: Typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  timeText: {
    fontSize: Typography.sizes.caption,
  },
  sessionTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.medium,
    fontFamily: Typography.fonts.serif,
    lineHeight: Typography.sizes.bodyLarge * Typography.lineHeights.snug,
  },
  sessionSummary: {
    fontSize: Typography.sizes.body,
    marginTop: Spacing.xs,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },
  breakthroughBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
    marginTop: Spacing.sm,
  },
  breakthroughText: {
    fontSize: Typography.sizes.micro,
    fontWeight: Typography.weights.semibold,
    letterSpacing: Typography.letterSpacing.wide,
  },
  arrow: {
    marginLeft: Spacing.sm,
    marginTop: 4,
  },
});
