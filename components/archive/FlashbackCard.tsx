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
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
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
          colors={[Colors.warmOatmealDark, Colors.cream]}
          style={styles.card}
        >
          {/* Animated glow */}
          <Animated.View style={[styles.glowOverlay, glowStyle]}>
            <LinearGradient
              colors={['transparent', Colors.goldShimmer, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>

          {/* Time badge */}
          <View style={styles.timeBadge}>
            <Ionicons name={timeIcon} size={14} color={Colors.burnishedGold} />
            <Text style={styles.timeLabel}>{timeLabel}</Text>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.title} numberOfLines={2}>
              {insight.title}
            </Text>

            {reflection ? (
              <Text style={styles.reflection} numberOfLines={3}>
                {reflection}
              </Text>
            ) : (
              <Text style={styles.excerpt} numberOfLines={2}>
                {insight.content}
              </Text>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.dateText}>{formattedDate}</Text>
            <View style={styles.readMore}>
              <Text style={styles.readMoreText}>Revisit</Text>
              <Ionicons name="arrow-forward" size={14} color={Colors.burnishedGold} />
            </View>
          </View>

          {/* Decorative corner */}
          <View style={styles.cornerDecoration}>
            <Ionicons name="sparkles" size={16} color={Colors.goldMuted} />
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
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const timeLabel = type === 'monthAgo' ? '1 month ago' : '1 year ago';

  return (
    <TouchableOpacity
      style={styles.badge}
      activeOpacity={0.9}
      onPress={handlePress}
    >
      <View style={styles.badgeIcon}>
        <Ionicons name="time-outline" size={14} color={Colors.burnishedGold} />
      </View>
      <View style={styles.badgeContent}>
        <Text style={styles.badgeTime}>{timeLabel}</Text>
        <Text style={styles.badgeTitle} numberOfLines={1}>
          {insight.title}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={Colors.stoneGray} />
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
    borderColor: Colors.borderGold,
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
    backgroundColor: Colors.goldMuted,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    marginBottom: Spacing.md,
  },
  timeLabel: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    color: Colors.burnishedGold,
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
    color: Colors.midnightEmerald,
    lineHeight: Typography.sizes.title * Typography.lineHeights.snug,
    marginBottom: Spacing.sm,
  },
  reflection: {
    fontSize: Typography.sizes.body,
    fontStyle: 'italic',
    color: Colors.charcoal,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },
  excerpt: {
    fontSize: Typography.sizes.body,
    color: Colors.slate,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.md,
  },
  dateText: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
  },
  readMore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  readMoreText: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    color: Colors.burnishedGold,
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
    backgroundColor: Colors.cream,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderGold,
    ...Shadows.subtle,
  },
  badgeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.goldMuted,
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
    color: Colors.burnishedGold,
    letterSpacing: Typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  badgeTitle: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.charcoal,
  },
});
