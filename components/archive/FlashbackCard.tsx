// FlashbackCard - Elegant UI element surfacing insights from the past
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { KeyInsight } from '@/types';

interface FlashbackCardProps {
  insight: KeyInsight;
  type: 'monthAgo' | 'yearAgo';
  reflection?: string;
  onPress: () => void;
  delay?: number;
}

export function FlashbackCard({
  insight,
  type,
  reflection,
  onPress,
  delay = 0,
}: FlashbackCardProps) {
  const { palette } = useThemeSafe();
  const scale = useSharedValue(0.9);
  const opacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0);

  useEffect(() => {
    // Entry animation
    scale.value = withTiming(1, { duration: 600, easing: Easing.bezier(0.175, 0.885, 0.32, 1.275) });
    opacity.value = withTiming(1, { duration: 500 });

    // Subtle glow pulse
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 2000 }),
        withTiming(0.1, { duration: 2000 })
      ),
      -1,
      true
    );
  }, [glowOpacity, opacity, scale]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSpring(0.98, Timing.springBouncy);
    setTimeout(() => {
      scale.value = withSpring(1, Timing.springBouncy);
    }, 100);
    onPress();
  };

  const timeLabel = type === 'monthAgo' ? 'One Month Ago' : 'One Year Ago';
  const timeIcon = type === 'monthAgo' ? 'calendar-outline' : 'hourglass-outline';

  const date = new Date(insight.created_at);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <TouchableOpacity activeOpacity={0.95} onPress={handlePress}>
        <LinearGradient
          colors={[palette.backgroundSecondary, palette.cardBg]}
          style={[styles.card, { borderColor: palette.borderAccent }]}
        >
          {/* Animated glow */}
          <Animated.View style={[styles.glowOverlay, glowStyle]}>
            <LinearGradient
              colors={['transparent', palette.accentShimmer, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          {/* Time badge */}
          <View style={[styles.timeBadge, { backgroundColor: palette.accentMuted }]}>
            <Ionicons name={timeIcon} size={14} color={palette.accent} />
            <Text style={[styles.timeLabel, { color: palette.accent }]}>{timeLabel}</Text>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={[styles.title, { color: palette.textPrimary }]} numberOfLines={2}>
              {insight.title}
            </Text>

            {reflection ? (
              <Text style={[styles.reflection, { color: palette.textSecondary }]} numberOfLines={3}>
                {reflection}
              </Text>
            ) : (
              <Text style={[styles.excerpt, { color: palette.textTertiary }]} numberOfLines={2}>
                {insight.content}
              </Text>
            )}
          </View>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: palette.borderLight }]}>
            <Text style={[styles.dateText, { color: palette.textTertiary }]}>{formattedDate}</Text>
            <View style={styles.readMore}>
              <Text style={[styles.readMoreText, { color: palette.accent }]}>Revisit</Text>
              <Ionicons name="arrow-forward" size={14} color={palette.accent} />
            </View>
          </View>

          {/* Decorative corner */}
          <View style={styles.cornerDecoration}>
            <Ionicons name="sparkles" size={16} color={palette.accentMuted} />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// Compact version for inline display
interface FlashbackBadgeProps {
  insight: KeyInsight;
  type: 'monthAgo' | 'yearAgo';
  onPress: () => void;
}

export function FlashbackBadge({ insight, type, onPress }: FlashbackBadgeProps) {
  const { palette } = useThemeSafe();
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const timeLabel = type === 'monthAgo' ? '1 month ago' : '1 year ago';

  return (
    <TouchableOpacity
      style={[styles.badge, { backgroundColor: palette.cardBg, borderColor: palette.borderAccent }]}
      activeOpacity={0.9}
      onPress={handlePress}
    >
      <View style={[styles.badgeIcon, { backgroundColor: palette.accentMuted }]}>
        <Ionicons name="time-outline" size={14} color={palette.accent} />
      </View>
      <View style={styles.badgeContent}>
        <Text style={[styles.badgeTime, { color: palette.accent }]}>{timeLabel}</Text>
        <Text style={[styles.badgeTitle, { color: palette.textSecondary }]} numberOfLines={1}>
          {insight.title}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={palette.textTertiary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  card: {
    padding: Spacing.xl,
    borderRadius: Radius.squircle,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    ...Shadows.md,
  },
  glowOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: Radius.squircle,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    marginBottom: Spacing.md,
  },
  timeLabel: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    letterSpacing: Typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  content: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    lineHeight: Typography.sizes.title * Typography.lineHeights.snug,
    marginBottom: Spacing.sm,
  },
  reflection: {
    fontSize: Typography.sizes.body,
    fontStyle: 'italic',
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },
  excerpt: {
    fontSize: Typography.sizes.body,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingTop: Spacing.md,
  },
  dateText: {
    fontSize: Typography.sizes.caption,
  },
  readMore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  readMoreText: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
  },
  cornerDecoration: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    opacity: 0.5,
  },

  // Badge styles
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    ...Shadows.subtle,
  },
  badgeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  badgeContent: {
    flex: 1,
  },
  badgeTime: {
    fontSize: Typography.sizes.micro,
    fontWeight: Typography.weights.semibold,
    letterSpacing: Typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  badgeTitle: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
  },
});
