// SynthesisReport - Monthly AI-generated summary of user's journey
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
import { MonthlySynthesis, ThemeItem, PatternItem, CoachContribution } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SynthesisReportProps {
  synthesis: MonthlySynthesis | null;
  isLoading?: boolean;
  onGenerate?: () => void;
  onThemePress?: (theme: ThemeItem) => void;
}

export function SynthesisReport({
  synthesis,
  isLoading = false,
  onGenerate,
  onThemePress,
}: SynthesisReportProps) {
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.burnishedGold} />
        <Text style={styles.loadingText}>Synthesizing your journey...</Text>
        <Text style={styles.loadingSubtext}>
          Analyzing patterns and extracting wisdom
        </Text>
      </View>
    );
  }

  if (!synthesis) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIcon}>
          <Ionicons name="document-text-outline" size={48} color={Colors.stoneGray} />
        </View>
        <Text style={styles.emptyTitle}>No Report Yet</Text>
        <Text style={styles.emptySubtitle}>
          Generate a monthly synthesis to discover patterns and insights from your journey
        </Text>
        {onGenerate && (
          <TouchableOpacity
            style={styles.generateButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onGenerate();
            }}
          >
            <LinearGradient
              colors={[Colors.burnishedGold, Colors.goldLight]}
              style={styles.generateGradient}
            >
              <Ionicons name="sparkles" size={18} color={Colors.white} />
              <Text style={styles.generateText}>Generate Report</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const [year, month] = synthesis.month_year.split('-');
  const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', {
    month: 'long',
  });

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Magazine Header */}
      <Animated.View entering={FadeIn.duration(500)} style={styles.header}>
        <Text style={styles.monthLabel}>{monthName} {year}</Text>
        <Text style={styles.headerTitle}>{synthesis.title}</Text>
        <View style={styles.statsRow}>
          <StatBadge
            icon="chatbubbles"
            value={synthesis.session_count}
            label="Sessions"
          />
          <StatBadge
            icon="bulb"
            value={synthesis.insight_count}
            label="Insights"
          />
          <StatBadge
            icon="star"
            value={synthesis.breakthrough_count}
            label="Breakthroughs"
          />
        </View>
      </Animated.View>

      {/* Executive Summary */}
      <Animated.View
        entering={FadeInDown.duration(500).delay(100)}
        style={styles.section}
      >
        <View style={styles.sectionHeader}>
          <View style={styles.sectionIcon}>
            <Ionicons name="document-text" size={16} color={Colors.burnishedGold} />
          </View>
          <Text style={styles.sectionTitle}>Executive Summary</Text>
        </View>
        <Text style={styles.summaryText}>{synthesis.executive_summary}</Text>
      </Animated.View>

      {/* Key Themes */}
      {synthesis.key_themes.length > 0 && (
        <Animated.View
          entering={FadeInDown.duration(500).delay(200)}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="layers" size={16} color={Colors.burnishedGold} />
            </View>
            <Text style={styles.sectionTitle}>Key Themes</Text>
          </View>
          <View style={styles.themesGrid}>
            {synthesis.key_themes.map((theme, index) => (
              <ThemeCard
                key={index}
                theme={theme}
                index={index}
                onPress={() => onThemePress?.(theme)}
              />
            ))}
          </View>
        </Animated.View>
      )}

      {/* Growth Areas */}
      {synthesis.growth_areas.length > 0 && (
        <Animated.View
          entering={FadeInDown.duration(500).delay(300)}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="trending-up" size={16} color={Colors.burnishedGold} />
            </View>
            <Text style={styles.sectionTitle}>Growth Areas</Text>
          </View>
          <View style={styles.growthList}>
            {synthesis.growth_areas.map((area, index) => (
              <GrowthItem key={index} text={area} index={index} />
            ))}
          </View>
        </Animated.View>
      )}

      {/* Patterns */}
      {synthesis.patterns_identified.length > 0 && (
        <Animated.View
          entering={FadeInDown.duration(500).delay(400)}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="analytics" size={16} color={Colors.burnishedGold} />
            </View>
            <Text style={styles.sectionTitle}>Patterns & Recommendations</Text>
          </View>
          {synthesis.patterns_identified.map((pattern, index) => (
            <PatternCard key={index} pattern={pattern} index={index} />
          ))}
        </Animated.View>
      )}

      {/* Coach Contributions */}
      {Object.keys(synthesis.coach_contributions).length > 0 && (
        <Animated.View
          entering={FadeInDown.duration(500).delay(500)}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="people" size={16} color={Colors.burnishedGold} />
            </View>
            <Text style={styles.sectionTitle}>Your Coaches</Text>
          </View>
          <View style={styles.coachGrid}>
            {Object.values(synthesis.coach_contributions).map((contribution, index) => (
              <CoachCard key={index} contribution={contribution} />
            ))}
          </View>
        </Animated.View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Generated on {new Date(synthesis.created_at).toLocaleDateString()}
        </Text>
      </View>
    </ScrollView>
  );
}

function StatBadge({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <View style={styles.statBadge}>
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={16} color={Colors.burnishedGold} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ThemeCard({ theme, index, onPress }: { theme: ThemeItem; index: number; onPress?: () => void }) {
  const scale = useSharedValue(0.9);

  useEffect(() => {
    scale.value = withDelay(index * 100, withSpring(1, Timing.springGentle));
  }, [index, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.themeCard, animatedStyle]}>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress?.();
        }}
      >
        <LinearGradient
          colors={[Colors.midnightEmerald, '#243D2E']}
          style={styles.themeGradient}
        >
          <Text style={styles.themeName}>{theme.name}</Text>
          <View style={styles.themeStats}>
            <Text style={styles.themeFrequency}>{theme.frequency}x</Text>
          </View>
          {theme.relatedInsights.length > 0 && (
            <Text style={styles.themeInsight} numberOfLines={2}>
              "{theme.relatedInsights[0]}"
            </Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

function GrowthItem({ text, index }: { text: string; index: number }) {
  return (
    <Animated.View
      entering={FadeInUp.duration(300).delay(index * 50)}
      style={styles.growthItem}
    >
      <View style={styles.growthBullet}>
        <Ionicons name="checkmark" size={12} color={Colors.success} />
      </View>
      <Text style={styles.growthText}>{text}</Text>
    </Animated.View>
  );
}

function PatternCard({ pattern, index }: { pattern: PatternItem; index: number }) {
  return (
    <Animated.View
      entering={FadeInUp.duration(400).delay(index * 100)}
      style={styles.patternCard}
    >
      <Text style={styles.patternName}>{pattern.pattern}</Text>
      <Text style={styles.patternObservation}>{pattern.observation}</Text>
      <View style={styles.recommendationBox}>
        <Ionicons name="arrow-forward" size={14} color={Colors.burnishedGold} />
        <Text style={styles.recommendationText}>{pattern.recommendation}</Text>
      </View>
    </Animated.View>
  );
}

function CoachCard({ contribution }: { contribution: CoachContribution }) {
  return (
    <View style={styles.coachCard}>
      <Text style={styles.coachName}>{contribution.coachName}</Text>
      <View style={styles.coachStats}>
        <View style={styles.coachStatItem}>
          <Text style={styles.coachStatValue}>{contribution.sessionCount}</Text>
          <Text style={styles.coachStatLabel}>sessions</Text>
        </View>
        <View style={styles.coachStatItem}>
          <Text style={styles.coachStatValue}>{contribution.insightCount}</Text>
          <Text style={styles.coachStatLabel}>insights</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xxxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxxl,
  },
  loadingText: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    color: Colors.midnightEmerald,
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxxl,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    color: Colors.midnightEmerald,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
    marginTop: Spacing.sm,
    textAlign: 'center',
    maxWidth: 280,
  },
  generateButton: {
    marginTop: Spacing.xl,
    borderRadius: Radius.pill,
    overflow: 'hidden',
    ...Shadows.gold,
  },
  generateGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  generateText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
  },

  // Header
  header: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    marginBottom: Spacing.xl,
  },
  monthLabel: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    color: Colors.burnishedGold,
    letterSpacing: Typography.letterSpacing.wider,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  headerTitle: {
    fontSize: Typography.sizes.display,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    color: Colors.midnightEmerald,
    lineHeight: Typography.sizes.display * Typography.lineHeights.tight,
    marginBottom: Spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  statBadge: {
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.bold,
    fontFamily: Typography.fonts.serif,
    color: Colors.midnightEmerald,
  },
  statLabel: {
    fontSize: Typography.sizes.micro,
    color: Colors.stoneGray,
    letterSpacing: Typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },

  // Section
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    color: Colors.midnightEmerald,
  },
  summaryText: {
    fontSize: Typography.sizes.bodyLarge,
    color: Colors.charcoal,
    lineHeight: Typography.sizes.bodyLarge * Typography.lineHeights.relaxed,
    fontStyle: 'italic',
  },

  // Themes
  themesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  themeCard: {
    width: (SCREEN_WIDTH - Spacing.xxl * 2 - Spacing.md) / 2,
    borderRadius: Radius.squircle,
    overflow: 'hidden',
    ...Shadows.md,
  },
  themeGradient: {
    padding: Spacing.lg,
    minHeight: 100,
    justifyContent: 'space-between',
  },
  themeName: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    color: Colors.white,
  },
  themeStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeFrequency: {
    fontSize: Typography.sizes.caption,
    color: Colors.goldLight,
    fontWeight: Typography.weights.semibold,
  },
  themeInsight: {
    fontSize: Typography.sizes.caption,
    color: 'rgba(255,255,255,0.7)',
    fontStyle: 'italic',
    marginTop: Spacing.xs,
  },

  // Growth
  growthList: {
    gap: Spacing.sm,
  },
  growthItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  growthBullet: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  growthText: {
    flex: 1,
    fontSize: Typography.sizes.body,
    color: Colors.charcoal,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },

  // Patterns
  patternCard: {
    backgroundColor: Colors.cardBg,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  patternName: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    color: Colors.midnightEmerald,
    marginBottom: Spacing.xs,
  },
  patternObservation: {
    fontSize: Typography.sizes.body,
    color: Colors.charcoal,
    marginBottom: Spacing.md,
  },
  recommendationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.goldMuted,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  recommendationText: {
    flex: 1,
    fontSize: Typography.sizes.body,
    color: Colors.charcoal,
    fontWeight: Typography.weights.medium,
  },

  // Coach
  coachGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  coachCard: {
    backgroundColor: Colors.cream,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    minWidth: 140,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  coachName: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    color: Colors.midnightEmerald,
    marginBottom: Spacing.sm,
  },
  coachStats: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  coachStatItem: {
    alignItems: 'center',
  },
  coachStatValue: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.bold,
    fontFamily: Typography.fonts.serif,
    color: Colors.burnishedGold,
  },
  coachStatLabel: {
    fontSize: Typography.sizes.micro,
    color: Colors.stoneGray,
  },

  footer: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    marginTop: Spacing.lg,
  },
  footerText: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
  },
});
