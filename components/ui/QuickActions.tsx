import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';

interface QuickAction {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  badge?: number;
}

interface QuickActionsProps {
  actions: QuickAction[];
  baseDelay?: number;
}

function QuickActionButton({ action, index, baseDelay }: { action: QuickAction; index: number; baseDelay: number }) {
  const { palette } = useThemeSafe();
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    const delay = baseDelay + index * 100;
    opacity.value = withDelay(delay, withTiming(1, { duration: 500 }));
    translateY.value = withDelay(delay, withSpring(0, Timing.springGentle));
  }, [index, baseDelay, opacity, translateY]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    action.onPress();
  };

  const handlePressIn = () => {
    scale.value = withSpring(0.95, Timing.springBouncy);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, Timing.springBouncy);
  };

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={[styles.actionWrapper, containerStyle]}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        style={[
          styles.actionButton,
          {
            backgroundColor: palette.cardBg,
            borderColor: palette.borderLight,
          },
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: palette.accentMuted }]}>
          <Ionicons name={action.icon} size={22} color={palette.textPrimary} />
          {action.badge !== undefined && action.badge > 0 && (
            <View style={[styles.badge, { backgroundColor: palette.error, borderColor: palette.cardBg }]}>
              <Text style={[styles.badgeText, { color: palette.textInverse }]}>{action.badge > 9 ? '9+' : action.badge}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.actionLabel, { color: palette.textSecondary }]}>{action.label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function QuickActions({ actions, baseDelay = 400 }: QuickActionsProps) {
  const { palette } = useThemeSafe();

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionLabel, { color: palette.textTertiary }]}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        {actions.map((action, index) => (
          <QuickActionButton
            key={action.id}
            action={action}
            index={index}
            baseDelay={baseDelay}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xxl,
  },
  sectionLabel: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wider,
    marginBottom: Spacing.lg,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  actionWrapper: {
    width: '48%',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    gap: Spacing.md,
    ...Shadows.subtle,
    borderWidth: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: Typography.weights.bold,
  },
  actionLabel: {
    flex: 1,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    lineHeight: Typography.sizes.body * Typography.lineHeights.snug,
  },
});
