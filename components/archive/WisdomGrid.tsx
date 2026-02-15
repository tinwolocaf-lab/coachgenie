// WisdomGrid - Magazine-style grid displaying Key Insight cards
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { KeyInsight } from '@/types';
import { getCoachById } from '@/data/coaches';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = Spacing.md;
const CARD_WIDTH_SMALL = (SCREEN_WIDTH - Spacing.xxl * 2 - GRID_GAP) / 2;
const CARD_WIDTH_LARGE = SCREEN_WIDTH - Spacing.xxl * 2;
const NO_INSIGHTS_IMAGE = require('../../assets/images/no-insights.png');

interface WisdomGridProps {
  insights: KeyInsight[];
  onInsightPress: (insight: KeyInsight) => void;
  maxItems?: number;
}

export function WisdomGrid({ insights, onInsightPress, maxItems = 6 }: WisdomGridProps) {
  const { palette } = useThemeSafe();
  const displayInsights = insights.slice(0, maxItems);

  if (displayInsights.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Image source={NO_INSIGHTS_IMAGE} style={styles.emptyIllustration} resizeMode="contain" />
        <Text style={[styles.emptyText, { color: palette.textSecondary }]}>Your wisdom collection awaits</Text>
        <Text style={[styles.emptySubtext, { color: palette.textTertiary }]}>
          Insights from your coaching sessions will appear here
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {displayInsights.map((insight, index) => {
        // Create varied sizes for magazine effect
        const isLarge = index === 0 || (index === 3 && displayInsights.length > 4);
        const isHighlighted = insight.is_highlighted;

        return (
          <InsightCard
            key={insight.id}
            insight={insight}
            index={index}
            isLarge={isLarge}
            isHighlighted={isHighlighted}
            onPress={() => onInsightPress(insight)}
          />
        );
      })}
    </View>
  );
}

interface InsightCardProps {
  insight: KeyInsight;
  index: number;
  isLarge: boolean;
  isHighlighted: boolean;
  onPress: () => void;
}

function InsightCard({ insight, index, isLarge, isHighlighted, onPress }: InsightCardProps) {
  const { palette } = useThemeSafe();
  const scale = useSharedValue(0.8);
  const opacity = useSharedValue(0);
  const shimmerPosition = useSharedValue(0);

  const coach = getCoachById(insight.coach_id);
  const categoryColors: Record<string, string[]> = {
    mindset: [palette.gradientStart, palette.gradientEnd],
    strategy: [palette.gradientStart, palette.gradientEnd],
    productivity: [palette.gradientStart, palette.gradientEnd],
    systems: [palette.gradientStart, palette.gradientEnd],
    general: [palette.gradientStart, palette.gradientEnd],
  };

  const gradientColors = isHighlighted
    ? [palette.gradientStart, palette.gradientEnd]
    : categoryColors[insight.category] || categoryColors.general;

  useEffect(() => {
    // Unfolding animation
    const delay = index * 100;
    scale.value = withDelay(delay, withSpring(1, Timing.springGentle));
    opacity.value = withDelay(delay, withTiming(1, { duration: 500 }));

    // Gold dust shimmer for new items
    if (isHighlighted) {
      shimmerPosition.value = withDelay(
        delay + 300,
        withTiming(1, { duration: 1000 })
      );
    }
  }, [index, isHighlighted, opacity, scale, shimmerPosition]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmerPosition.value, [0, 0.5, 1], [0, 0.6, 0]),
    transform: [
      {
        translateX: interpolate(
          shimmerPosition.value,
          [0, 1],
          [-100, isLarge ? CARD_WIDTH_LARGE : CARD_WIDTH_SMALL + 100]
        ),
      },
    ],
  }));

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const formattedDate = new Date(insight.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        isLarge ? styles.cardLarge : styles.cardSmall,
        animatedStyle,
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={handlePress}
        style={styles.cardTouchable}
      >
        <LinearGradient
          colors={gradientColors as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.card, isLarge ? styles.cardContentLarge : styles.cardContentSmall]}
        >
          {/* Gold dust shimmer overlay */}
          <Animated.View style={[styles.shimmerOverlay, shimmerStyle]}>
            <LinearGradient
              colors={['transparent', palette.accentShimmer, 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.shimmerGradient}
            />
          </Animated.View>

          {/* Category badge */}
          <View style={[styles.categoryBadge, { backgroundColor: '#FFFFFF26' }]}>
            <Text style={[styles.categoryText, { color: '#FFFFFFE6' }]}>
              {insight.category.charAt(0).toUpperCase() + insight.category.slice(1)}
            </Text>
          </View>

          {/* Content */}
          <View style={styles.cardContent}>
            <Text
              style={[styles.cardTitle, { color: '#FFFFFF' }, isLarge && styles.cardTitleLarge]}
              numberOfLines={isLarge ? 3 : 2}
            >
              {insight.title}
            </Text>

            {isLarge && (
              <Text style={[styles.cardExcerpt, { color: '#FFFFFFBF' }]} numberOfLines={3}>
                {insight.content}
              </Text>
            )}
          </View>

          {/* Footer */}
          <View style={styles.cardFooter}>
            <View style={[styles.coachBadge, { backgroundColor: '#FFFFFF1A' }]}>
              <Ionicons
                name={coach?.icon_name as keyof typeof Ionicons.glyphMap || 'person'}
                size={12}
                color="#FFFFFF"
              />
              <Text style={[styles.coachName, { color: '#FFFFFFCC' }]}>{coach?.name || 'Coach'}</Text>
            </View>
            <Text style={[styles.dateText, { color: '#FFFFFF99' }]}>{formattedDate}</Text>
          </View>

          {/* Highlighted star */}
          {isHighlighted && (
            <View style={[styles.highlightStar, { backgroundColor: '#FFFFFF33' }]}>
              <Ionicons name="star" size={14} color="#FFFFFF" />
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    paddingHorizontal: Spacing.xxl,
  },
  emptyState: {
    alignItems: 'center',
    padding: Spacing.xxxl,
    paddingHorizontal: Spacing.xxl,
  },
  emptyIllustration: {
    width: 164,
    height: 120,
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
  cardWrapper: {
    borderRadius: Radius.squircle,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  cardSmall: {
    width: CARD_WIDTH_SMALL,
  },
  cardLarge: {
    width: CARD_WIDTH_LARGE,
  },
  cardTouchable: {
    flex: 1,
  },
  card: {
    overflow: 'hidden',
    position: 'relative',
  },
  cardContentSmall: {
    padding: Spacing.lg,
    minHeight: 160,
    justifyContent: 'space-between',
  },
  cardContentLarge: {
    padding: Spacing.xl,
    minHeight: 200,
    justifyContent: 'space-between',
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
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  categoryText: {
    fontSize: Typography.sizes.micro,
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: Typography.letterSpacing.wider,
    textTransform: 'uppercase',
    fontWeight: Typography.weights.semibold,
  },
  cardContent: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  cardTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    lineHeight: Typography.sizes.bodyLarge * Typography.lineHeights.snug,
  },
  cardTitleLarge: {
    fontSize: Typography.sizes.title,
    lineHeight: Typography.sizes.title * Typography.lineHeights.snug,
  },
  cardExcerpt: {
    fontSize: Typography.sizes.body,
    color: 'rgba(255,255,255,0.75)',
    marginTop: Spacing.sm,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coachBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
  },
  coachName: {
    fontSize: Typography.sizes.caption,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: Typography.weights.medium,
  },
  dateText: {
    fontSize: Typography.sizes.caption,
    color: 'rgba(255,255,255,0.6)',
  },
  highlightStar: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 4,
    borderRadius: Radius.full,
  },
});
