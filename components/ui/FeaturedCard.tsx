import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { CoachIcon } from './CoachIcon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FeaturedCardProps {
  type: 'coach' | 'lesson' | 'insight';
  title: string;
  subtitle: string;
  description?: string;
  iconName?: string;
  accentColor?: string;
  badge?: string;
  onPress: () => void;
  delay?: number;
}

export function FeaturedCard({
  type,
  title,
  subtitle,
  description,
  iconName,
  accentColor,
  badge,
  onPress,
  delay = 0,
}: FeaturedCardProps) {
  const { palette } = useThemeSafe();
  const resolvedAccentColor = accentColor ?? palette.accent;
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(40);
  const scale = useSharedValue(1);
  const shimmerPosition = useSharedValue(-1);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: Timing.elegant }));
    translateY.value = withDelay(delay, withSpring(0, Timing.springGentle));

    // Subtle shimmer effect
    const shimmerLoop = () => {
      shimmerPosition.value = withTiming(2, {
        duration: 3000,
        easing: Easing.inOut(Easing.cubic),
      });
      setTimeout(() => {
        shimmerPosition.value = -1;
        shimmerLoop();
      }, 5000);
    };
    setTimeout(shimmerLoop, delay + 1000);
  }, [delay, opacity, translateY, shimmerPosition]);

  const handlePressIn = () => {
    scale.value = withSpring(0.98, Timing.springBouncy);
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

  const renderTypeIcon = () => {
    switch (type) {
      case 'coach':
        return iconName ? (
          <CoachIcon iconName={iconName} color={palette.textInverse} size="xl" variant="solid" style={{ backgroundColor: resolvedAccentColor }} />
        ) : null;
      case 'lesson':
        return (
          <View style={[styles.typeIcon, { backgroundColor: resolvedAccentColor }]}>
            <Ionicons name="play-circle" size={40} color={palette.textInverse} />
          </View>
        );
      case 'insight':
        return (
          <View style={[styles.typeIcon, { backgroundColor: resolvedAccentColor }]}>
            <Ionicons name="sparkles" size={40} color={palette.textInverse} />
          </View>
        );
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'coach':
        return 'Featured Coach';
      case 'lesson':
        return 'Recommended Lesson';
      case 'insight':
        return 'Daily Insight';
    }
  };

  return (
    <Animated.View style={containerStyle}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={styles.cardOuter}>
          <LinearGradient
            colors={[palette.textPrimary, '#0D1A11']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            {/* Accent bar */}
            <View style={[styles.accentBar, { backgroundColor: resolvedAccentColor }]} />

            {/* Badge */}
            {badge && (
              <View style={styles.badgeContainer}>
                <LinearGradient
                  colors={[palette.accent, palette.accentLight]}
                  style={styles.badge}
                >
                  <Ionicons name="diamond" size={10} color={palette.textInverse} />
                  <Text style={[styles.badgeText, { color: palette.textInverse }]}>{badge}</Text>
                </LinearGradient>
              </View>
            )}

            {/* Content */}
            <View style={styles.content}>
              {/* Header section */}
              <View style={styles.headerSection}>
                {renderTypeIcon()}
                <View style={styles.headerMeta}>
                  <Text style={[styles.typeLabel, { color: palette.accentLight }]}>{getTypeLabel()}</Text>
                  <View style={styles.divider} />
                </View>
              </View>

              {/* Title section */}
              <View style={styles.titleSection}>
                <Text style={[styles.title, { color: palette.textInverse }]}>{title}</Text>
                <Text style={[styles.subtitle, { color: palette.accentLight }]}>{subtitle}</Text>
                {description && (
                  <Text style={styles.description} numberOfLines={2}>
                    {description}
                  </Text>
                )}
              </View>

              {/* Action section */}
              <View style={styles.actionSection}>
                <View style={styles.actionButton}>
                  <Text style={[styles.actionText, { color: palette.accent }]}>
                    {type === 'coach' ? 'Begin Session' : type === 'lesson' ? 'Start Lesson' : 'Read More'}
                  </Text>
                  <Ionicons name="arrow-forward" size={16} color={palette.accent} />
                </View>
              </View>
            </View>

            {/* Decorative corner element */}
            <View style={styles.cornerDecoration}>
              <Ionicons name="star" size={80} color="rgba(197, 160, 89, 0.05)" />
            </View>
          </LinearGradient>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    borderRadius: Radius.squircle,
    overflow: 'hidden',
    ...Shadows.xl,
  },
  card: {
    minHeight: 280,
    position: 'relative',
  },
  accentBar: {
    height: 4,
    width: '100%',
  },
  badgeContainer: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
    zIndex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    gap: 4,
  },
  badgeText: {
    fontSize: Typography.sizes.micro,
    fontWeight: Typography.weights.bold,
    letterSpacing: Typography.letterSpacing.wider,
  },
  content: {
    flex: 1,
    padding: Spacing.xl,
    paddingTop: Spacing.xxl,
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.lg,
  },
  typeIcon: {
    width: 80,
    height: 80,
    borderRadius: Radius.squircle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerMeta: {
    flex: 1,
    paddingTop: Spacing.sm,
  },
  typeLabel: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.widest,
    marginBottom: Spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    width: '100%',
  },
  titleSection: {
    marginTop: Spacing.xl,
  },
  title: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.sizes.bodyLarge,
    lineHeight: Typography.sizes.bodyLarge * Typography.lineHeights.relaxed,
    marginBottom: Spacing.sm,
  },
  description: {
    fontSize: Typography.sizes.body,
    color: 'rgba(255,255,255,0.6)',
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },
  actionSection: {
    marginTop: 'auto',
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  actionText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
  },
  cornerDecoration: {
    position: 'absolute',
    bottom: -20,
    right: -20,
    transform: [{ rotate: '-15deg' }],
  },
});
