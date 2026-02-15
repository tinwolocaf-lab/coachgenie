// RitualCard - Premium stationery-styled card for daily habits
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withSequence,
  interpolate,
  interpolateColor,
} from 'react-native-reanimated';
import { Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { BloomEffect, ParticleBloom } from './BloomEffect';
import { RitualWithStatus } from '@/types';

interface RitualCardProps {
  ritual: RitualWithStatus;
  onToggle: (ritualId: string, isCompleted: boolean) => void;
  onPress?: (ritualId: string) => void;
  onLongPress?: (ritualId: string) => void;
  showStreak?: boolean;
  showLinkedInsight?: boolean;
  compact?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function RitualCard({
  ritual,
  onToggle,
  onPress,
  onLongPress,
  showStreak = true,
  showLinkedInsight = true,
  compact = false,
}: RitualCardProps) {
  const { palette } = useThemeSafe();
  const [showBloom, setShowBloom] = useState(false);
  const scale = useSharedValue(1);
  const checkProgress = useSharedValue(ritual.is_completed_today ? 1 : 0);
  const cardBackground = useSharedValue(ritual.is_completed_today ? 1 : 0);

  const handleToggle = useCallback(() => {
    const wasCompleted = ritual.is_completed_today;
    const willBeCompleted = !wasCompleted;

    // Heavy haptic tick when completing
    if (willBeCompleted) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setShowBloom(true);
      setTimeout(() => setShowBloom(false), 800);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Animate checkbox
    checkProgress.value = withSpring(willBeCompleted ? 1 : 0, Timing.springBouncy);
    cardBackground.value = withTiming(willBeCompleted ? 1 : 0, { duration: 300 });

    // Animate card scale
    scale.value = withSequence(
      withTiming(0.97, { duration: 100 }),
      withSpring(1, Timing.springBouncy)
    );

    onToggle(ritual.id, willBeCompleted);
  }, [ritual.id, ritual.is_completed_today, onToggle, checkProgress, cardBackground, scale]);

  const handlePress = useCallback(() => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      scale.value = withSequence(
        withTiming(0.98, { duration: 50 }),
        withSpring(1, Timing.springGentle)
      );
      onPress(ritual.id);
    }
  }, [onPress, ritual.id, scale]);

  const handleLongPress = useCallback(() => {
    if (onLongPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onLongPress(ritual.id);
    }
  }, [onLongPress, ritual.id]);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: interpolateColor(
      cardBackground.value,
      [0, 1],
      [palette.cardBg, palette.successLight]
    ),
  }));

  const checkboxStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(checkProgress.value * 0.2 + 0.8, Timing.springBouncy) }],
    borderColor: interpolateColor(
      checkProgress.value,
      [0, 1],
      [palette.border, palette.success]
    ),
    backgroundColor: interpolateColor(
      checkProgress.value,
      [0, 1],
      ['transparent', palette.success]
    ),
  }));

  const checkmarkStyle = useAnimatedStyle(() => ({
    opacity: checkProgress.value,
    transform: [
      { scale: checkProgress.value },
      { rotate: `${(1 - checkProgress.value) * -90}deg` },
    ],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(checkProgress.value, [0, 1], [1, 0.6]),
    textDecorationLine: checkProgress.value > 0.5 ? 'line-through' : 'none',
  }));

  if (compact) {
    return (
      <AnimatedPressable
        style={[styles.compactCard, { borderColor: palette.borderLight }, cardStyle]}
        onPress={handleToggle}
        onLongPress={handleLongPress}
      >
        <View style={styles.compactContent}>
          <Animated.View style={[styles.compactCheckbox, checkboxStyle]}>
            <Animated.View style={checkmarkStyle}>
              <Ionicons name="checkmark" size={12} color={palette.textInverse} />
            </Animated.View>
          </Animated.View>
          <Animated.Text style={[styles.compactTitle, { color: palette.textSecondary }, titleStyle]} numberOfLines={1}>
            {ritual.title}
          </Animated.Text>
          {showStreak && ritual.streak_count && ritual.streak_count > 0 && (
            <View style={styles.compactStreak}>
              <Text style={[styles.compactStreakText, { color: palette.textSecondary }]}>{ritual.streak_count}</Text>
              <Text style={styles.fireEmoji}>🔥</Text>
            </View>
          )}
        </View>
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      style={[styles.card, { borderColor: palette.borderLight }, cardStyle]}
      onPress={handlePress}
      onLongPress={handleLongPress}
    >
      {/* Bloom Effect */}
      <View style={styles.bloomContainer}>
        <BloomEffect isActive={showBloom} size={50} />
        {showBloom && <ParticleBloom isActive={showBloom} size={60} />}
      </View>

      <View style={styles.content}>
        {/* Left: Checkbox with ritual icon */}
        <TouchableOpacity
          style={styles.checkboxContainer}
          onPress={handleToggle}
          activeOpacity={0.9}
        >
          <Animated.View style={[styles.checkbox, checkboxStyle]}>
            <Animated.View style={checkmarkStyle}>
              <Ionicons name="checkmark" size={18} color={palette.textInverse} />
            </Animated.View>
          </Animated.View>
          <View style={[styles.iconBadge, { backgroundColor: ritual.color + '20', borderColor: palette.cardBg }]}>
            <Ionicons
              name={ritual.icon as keyof typeof Ionicons.glyphMap || 'star'}
              size={16}
              color={ritual.color || palette.accent}
            />
          </View>
        </TouchableOpacity>

        {/* Center: Title and description */}
        <View style={styles.textContent}>
          <Animated.Text style={[styles.title, { color: palette.textSecondary }, titleStyle]} numberOfLines={1}>
            {ritual.title}
          </Animated.Text>
          {ritual.description && (
            <Text style={[styles.description, { color: palette.textTertiary }]} numberOfLines={1}>
              {ritual.description}
            </Text>
          )}
          {showLinkedInsight && ritual.linked_insight_id && (
            <View style={styles.linkedBadge}>
              <Ionicons name="link" size={10} color={palette.accent} />
              <Text style={[styles.linkedText, { color: palette.accent }]}>From insight</Text>
            </View>
          )}
        </View>

        {/* Right: Streak indicator */}
        {showStreak && (
          <View style={styles.streakContainer}>
            {ritual.streak_count && ritual.streak_count > 0 ? (
              <>
                <Text style={[styles.streakCount, { color: palette.textSecondary }]}>{ritual.streak_count}</Text>
                <Text style={styles.fireEmoji}>🔥</Text>
              </>
            ) : (
              <Ionicons name="flame-outline" size={18} color={palette.textTertiary} />
            )}
          </View>
        )}
      </View>

      {/* Premium paper edge effect */}
      <View style={[styles.paperEdge, { backgroundColor: palette.accent }]} />
    </AnimatedPressable>
  );
}

// Action Card for Today View (Morning/Evening prompts)
interface ActionCardProps {
  type: 'morning' | 'evening';
  title: string;
  subtitle: string;
  prompt?: string;
  isCompleted?: boolean;
  onPress: () => void;
}

export function ActionCard({
  type,
  title,
  subtitle,
  prompt,
  isCompleted,
  onPress,
}: ActionCardProps) {
  const { palette } = useThemeSafe();
  const scale = useSharedValue(1);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSequence(
      withTiming(0.98, { duration: 100 }),
      withSpring(1, Timing.springBouncy)
    );
    onPress();
  };

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isMorning = type === 'morning';
  const iconName = isMorning ? 'sunny' : 'moon';
  const iconColor = isMorning ? palette.accent : palette.textPrimary;
  const iconBackgroundColor = isMorning ? palette.accentMuted : palette.backgroundSecondary;
  const cardBorderColor = isCompleted ? palette.borderAccent : palette.borderLight;
  const arrowBackgroundColor = isCompleted ? palette.successLight : palette.backgroundSecondary;

  return (
    <AnimatedPressable onPress={handlePress} style={cardStyle}>
      <View
        style={[
          styles.actionCard,
          {
            borderColor: cardBorderColor,
            backgroundColor: palette.cardBg,
          },
          isCompleted && styles.actionCardCompleted,
        ]}
      >
        <View style={styles.actionHeader}>
          <View style={[styles.actionIcon, { backgroundColor: iconBackgroundColor }]}>
            <Ionicons name={iconName} size={24} color={iconColor} />
          </View>
          {isCompleted && (
            <View style={[styles.completedBadge, { backgroundColor: palette.successLight }]}>
              <Ionicons name="checkmark-circle" size={20} color={palette.success} />
            </View>
          )}
        </View>

        <View style={styles.actionContent}>
          <Text style={[styles.actionTitle, { color: palette.textPrimary }]}>{title}</Text>
          <Text style={[styles.actionSubtitle, { color: palette.textTertiary }]}>{subtitle}</Text>
        </View>

        {prompt && !isCompleted && (
          <View style={[styles.promptContainer, { borderTopColor: palette.borderLight }]}>
            <Text style={[styles.promptText, { color: palette.textSecondary }]} numberOfLines={2}>
              &ldquo;{prompt}&rdquo;
            </Text>
          </View>
        )}

        <View style={[styles.actionArrow, { backgroundColor: arrowBackgroundColor }]}>
          <Ionicons
            name={isCompleted ? 'eye-outline' : 'arrow-forward'}
            size={18}
            color={isCompleted ? palette.textTertiary : iconColor}
          />
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  // Standard Card
  card: {
    borderRadius: Radius.squircle,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadows.sm,
    borderWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    paddingRight: Spacing.md,
  },
  checkboxContainer: {
    position: 'relative',
    marginRight: Spacing.md,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  textContent: {
    flex: 1,
  },
  title: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.medium,
    letterSpacing: Typography.letterSpacing.normal,
  },
  description: {
    fontSize: Typography.sizes.body,
    marginTop: 2,
  },
  linkedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: 4,
  },
  linkedText: {
    fontSize: Typography.sizes.micro,
    letterSpacing: Typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: Spacing.sm,
  },
  streakCount: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.bold,
    fontFamily: Typography.fonts.serif,
  },
  fireEmoji: {
    fontSize: 14,
    marginLeft: 2,
  },
  paperEdge: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    opacity: 0.3,
  },
  bloomContainer: {
    position: 'absolute',
    left: 28,
    top: '50%',
    transform: [{ translateY: -25 }],
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  // Compact Card
  compactCard: {
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginRight: Spacing.sm,
    ...Shadows.subtle,
    borderWidth: 1,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  compactCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactTitle: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    maxWidth: 120,
  },
  compactStreak: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactStreakText: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.bold,
  },

  // Action Card
  actionCard: {
    borderRadius: Radius.squircle,
    padding: Spacing.xl,
    minHeight: 140,
    ...Shadows.sm,
    borderWidth: 1,
    overflow: 'hidden',
  },
  actionCardCompleted: {
    opacity: 0.92,
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedBadge: {
    borderRadius: 12,
    padding: 4,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    marginBottom: Spacing.xs,
  },
  actionSubtitle: {
    fontSize: Typography.sizes.body,
  },
  promptContainer: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  promptText: {
    fontSize: Typography.sizes.body,
    fontStyle: 'italic',
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },
  actionArrow: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default RitualCard;
