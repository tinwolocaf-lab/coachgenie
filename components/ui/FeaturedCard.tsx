import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, type ImageSourcePropType } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
} from 'react-native-reanimated';
import { Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { CoachIcon } from './CoachIcon';

interface FeaturedCardProps {
  type: 'coach' | 'lesson' | 'insight';
  title: string;
  subtitle: string;
  description?: string;
  iconName?: string;
  image?: ImageSourcePropType;
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
  image,
  accentColor,
  badge,
  onPress,
  delay = 0,
}: FeaturedCardProps) {
  const { palette } = useThemeSafe();
  const resolvedAccentColor = accentColor ?? palette.accent;
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);
  const scale = useSharedValue(1);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: Timing.elegant }));
    translateY.value = withDelay(delay, withSpring(0, Timing.springGentle));
  }, [delay, opacity, translateY]);

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

  const renderIcon = () => {
    if (type === 'coach') {
      if (image) {
        return (
          <View style={styles.imageContainer}>
            <Image
              source={image}
              style={styles.coachImage}
              resizeMode="cover"
            />
          </View>
        );
      }

      if (iconName) {
        return (
          <CoachIcon
            iconName={iconName}
            color={resolvedAccentColor}
            size="xl"
            variant="default" // Changed from solid to default for cleaner look
          />
        );
      }
    }

    // Fallback icons
    const icon = type === 'lesson' ? 'play-circle' : 'sparkles';
    return (
      <View style={[styles.iconContainer, { backgroundColor: `${resolvedAccentColor}15` }]}>
        <Ionicons name={icon} size={40} color={resolvedAccentColor} />
      </View>
    );
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'coach': return 'Featured Coach';
      case 'lesson': return 'Recommended Lesson';
      case 'insight': return 'Daily Insight';
    }
  };

  return (
    <Animated.View style={containerStyle}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.cardContainer, { backgroundColor: palette.cardBg }]}
      >
        <View style={styles.content}>
          <View style={styles.topRow}>
            <View style={styles.typeTagContainer}>
              <View style={[styles.typeIndicator, { backgroundColor: resolvedAccentColor }]} />
              <Text style={[styles.typeLabel, { color: palette.textSecondary }]}>
                {getTypeLabel()}
              </Text>
            </View>

            {badge && (
              <View style={[styles.badge, { backgroundColor: `${palette.accent}15` }]}>
                <Text style={[styles.badgeText, { color: palette.accent }]}>{badge}</Text>
              </View>
            )}
          </View>

          <View style={styles.mainInfo}>
            {renderIcon()}
            <View style={styles.textContainer}>
              <Text style={[styles.title, { color: palette.textPrimary }]}>{title}</Text>
              <Text style={[styles.subtitle, { color: palette.textSecondary }]}>{subtitle}</Text>
            </View>
          </View>

          {description && (
            <Text style={[styles.description, { color: palette.textTertiary }]} numberOfLines={2}>
              {description}
            </Text>
          )}

          <View style={[styles.footer, { borderTopColor: palette.borderLight }]}>
            <Text style={[styles.actionText, { color: resolvedAccentColor }]}>
              {type === 'coach' ? 'Begin Session' : type === 'lesson' ? 'Start Lesson' : 'Read More'}
            </Text>
            <Ionicons name="arrow-forward" size={16} color={resolvedAccentColor} />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    ...Shadows.lg,
  },
  content: {
    padding: Spacing.xl,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  typeTagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  typeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  typeLabel: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: Radius.full,
  },
  badgeText: {
    fontSize: Typography.sizes.micro,
    fontWeight: Typography.weights.bold,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  mainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: Typography.sizes.body,
    lineHeight: 20,
  },
  description: {
    fontSize: Typography.sizes.body,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  actionText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  coachImage: {
    width: '100%',
    height: '100%',
  },
});
