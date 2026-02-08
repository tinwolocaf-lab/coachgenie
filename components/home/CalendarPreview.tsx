import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { getUpcomingEvents } from '@/lib/integrations/api';
import type { IntegrationData } from '@/types';

export function CalendarPreview() {
  const { palette } = useThemeSafe();
  const router = useRouter();
  const [events, setEvents] = useState<IntegrationData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const data = await getUpcomingEvents(12);
      setEvents(data.slice(0, 3));
    } catch (error) {
      console.error('[CalendarPreview] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || events.length === 0) return null;

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getFocusTime = () => {
    if (events.length === 0) return null;
    const now = new Date();
    const firstEvent = events[0];
    if (!firstEvent.starts_at) return null;

    const firstStart = new Date(firstEvent.starts_at);
    const diffMins = Math.floor((firstStart.getTime() - now.getTime()) / 60000);
    if (diffMins <= 0) return null;
    if (diffMins < 60) return `${diffMins}m of focus time`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h${mins > 0 ? ` ${mins}m` : ''} of focus time`;
  };

  const focusTime = getFocusTime();

  return (
    <Animated.View entering={FadeIn.duration(500)}>
      <View style={[styles.card, { backgroundColor: palette.cardBg }]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="calendar-outline" size={18} color={palette.accent} />
            <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Today</Text>
          </View>
          {focusTime && (
            <View style={[styles.focusBadge, { backgroundColor: palette.successLight }]}>
              <Text style={[styles.focusText, { color: palette.success }]}>{focusTime}</Text>
            </View>
          )}
        </View>

        {events.map((event, index) => (
          <View
            key={event.id}
            style={[
              styles.eventRow,
              index < events.length - 1 && { borderBottomWidth: 1, borderBottomColor: palette.borderLight },
            ]}
          >
            <View style={[styles.timeDot, { backgroundColor: palette.accent }]} />
            <Text style={[styles.eventTime, { color: palette.textTertiary }]}>
              {formatTime(event.starts_at)}
            </Text>
            <Text style={[styles.eventTitle, { color: palette.textSecondary }]} numberOfLines={1}>
              {event.title || 'Untitled'}
            </Text>
          </View>
        ))}

        <TouchableOpacity
          onPress={() => router.push('/integrations')}
          style={[styles.viewAll, { borderTopColor: palette.borderLight }]}
        >
          <Text style={[styles.viewAllText, { color: palette.accent }]}>View all events</Text>
          <Ionicons name="arrow-forward" size={14} color={palette.accent} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
  },
  focusBadge: {
    paddingVertical: 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.pill,
  },
  focusText: {
    fontSize: Typography.sizes.micro,
    fontWeight: Typography.weights.medium,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  timeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Spacing.sm,
  },
  eventTime: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.medium,
    width: 70,
  },
  eventTitle: {
    fontSize: Typography.sizes.body,
    flex: 1,
  },
  viewAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    marginTop: Spacing.xs,
  },
  viewAllText: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
  },
});
