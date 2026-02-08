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
import { Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
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
  const { palette } = useThemeSafe();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={palette.accent} />
        <Text style={[styles.loadingText, { color: palette.textPrimary }]}>Synthesizing your journey...</Text>
        <Text style={[styles.loadingSubtext, { color: palette.textTertiary }]}>
          Analyzing patterns and extracting wisdom
        </Text>
      </View>
    );
  }

  if (!synthesis) {
    return (
      <View style={styles.emptyContainer}>
        <View style={[styles.emptyIcon, { backgroundColor: palette.accentMuted }]}>
          <Ionicons name="document-text-outline" size={48} color={palette.textTertiary} />
        </View>
        <Text style={[styles.emptyTitle, { color: palette.textPrimary }]}>No Report Yet</Text>
        <Text style={[styles.emptySubtitle, { color: palette.textTertiary }]}>
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
              colors={[palette.accent, palette.accentLight]}
              style={styles.generateGradient}
            >
              <Ionicons name="sparkles" size={18} color={palette.textInverse} />
              <Text style={[styles.generateText, { color: palette.textInverse }]}>Generate Report</Text>
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
      <Animated.View entering={FadeIn.duration(500)} style={[styles.header, { borderBottomColor: palette.borderLight }]}>
        <Text style={[styles.monthLabel, { color: palette.accent }]}>{monthName} {year}</Text>
        <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>{synthesis.title}</Text>
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
          <View style={[styles.sectionIcon, { backgroundColor: palette.accentMuted }]}>
            <Ionicons name="document-text" size={16} color={palette.accent} />
          </View>
          <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Executive Summary</Text>
        </View>
        <Text style={[styles.summaryText, { color: palette.textSecondary }]}>{synthesis.executive_summary}</Text>
      </Animated.View>

      {/* Key Themes */}
      {synthesis.key_themes.length > 0 && (
        <Animated.View
          entering={FadeInDown.duration(500).delay(200)}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: palette.accentMuted }]}>
              <Ionicons name="layers" size={16} color={palette.accent} />
            </View>
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Key Themes</Text>
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
            <View style={[styles.sectionIcon, { backgroundColor: palette.accentMuted }]}>
              <Ionicons name="trending-up" size={16} color={palette.accent} />
            </View>
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Growth Areas</Text>
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
            <View style={[styles.sectionIcon, { backgroundColor: palette.accentMuted }]}>
              <Ionicons name="analytics" size={16} color={palette.accent} />
            </View>
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Patterns & Recommendations</Text>
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
            <View style={[styles.sectionIcon, { backgroundColor: palette.accentMuted }]}>
              <Ionicons name="people" size={16} color={palette.accent} />
            </View>
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Your Coaches</Text>
          </View>
          <View style={styles.coachGrid}>
            {Object.values(synthesis.coach_contributions).map((contribution, index) => (
              <CoachCard key={index} contribution={contribution} />
            ))}
          </View>
        </Animated.View>
      )}

      <View style={[styles.footer, { borderTopColor: palette.borderLight }]}>
        <Text style={[styles.footerText, { color: palette.textTertiary }]}>
          Generated on {new Date(synthesis.created_at).toLocaleDateString()}
        </Text>
      </View>
    </ScrollView>
  );
}

function StatBadge({ icon, value, label }: { icon: string; value: number; label: string }) {
  const { palette } = useThemeSafe();
  return (
    <View style={styles.statBadge}>
      <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={16} color={palette.accent} />
      <Text style={[styles.statValue, { color: palette.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: palette.textTertiary }]}>{label}</Text>
    </View>
  );
}

function ThemeCard({ theme, index, onPress }: { theme: ThemeItem; index: number; onPress?: () => void }) {
  const { palette } = useThemeSafe();
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
          colors={[palette.textPrimary, palette.textPrimary + 'CC']}
          style={styles.themeGradient}
        >
          <Text style={[styles.themeName, { color: palette.textInverse }]}>{theme.name}</Text>
          <View style={styles.themeStats}>
            <Text style={[styles.themeFrequency, { color: palette.accentLight }]}>{theme.frequency}x</Text>
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
  const { palette } = useThemeSafe();
  return (
    <Animated.View
      entering={FadeInUp.duration(300).delay(index * 50)}
      style={styles.growthItem}
    >
      <View style={[styles.growthBullet, { backgroundColor: palette.successLight }]}>
        <Ionicons name="checkmark" size={12} color={palette.success} />
      </View>
      <Text style={[styles.growthText, { color: palette.textSecondary }]}>{text}</Text>
    </Animated.View>
  );
}

function PatternCard({ pattern, index }: { pattern: PatternItem; index: number }) {
  const { palette } = useThemeSafe();
  return (
    <Animated.View
      entering={FadeInUp.duration(400).delay(index * 100)}
      style={[styles.patternCard, { backgroundColor: palette.cardBg }]}
    >
      <Text style={[styles.patternName, { color: palette.textPrimary }]}>{pattern.pattern}</Text>
      <Text style={[styles.patternObservation, { color: palette.textSecondary }]}>{pattern.observation}</Text>
      <View style={[styles.recommendationBox, { backgroundColor: palette.accentMuted }]}>
        <Ionicons name="arrow-forward" size={14} color={palette.accent} />
        <Text style={[styles.recommendationText, { color: palette.textSecondary }]}>{pattern.recommendation}</Text>
      </View>
    </Animated.View>
  );
}

function CoachCard({ contribution }: { contribution: CoachContribution }) {
  const { palette } = useThemeSafe();
  return (
    <View style={[styles.coachCard, { backgroundColor: palette.cardBg, borderColor: palette.borderLight }]}>
      <Text style={[styles.coachName, { color: palette.textPrimary }]}>{contribution.coachName}</Text>
      <View style={styles.coachStats}>
        <View style={styles.coachStatItem}>
          <Text style={[styles.coachStatValue, { color: palette.accent }]}>{contribution.sessionCount}</Text>
          <Text style={[styles.coachStatLabel, { color: palette.textTertiary }]}>sessions</Text>
        </View>
        <View style={styles.coachStatItem}>
          <Text style={[styles.coachStatValue, { color: palette.accent }]}>{contribution.insightCount}</Text>
          <Text style={[styles.coachStatLabel, { color: palette.textTertiary }]}>insights</Text>
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
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: Typography.sizes.body,
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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: Typography.sizes.body,
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
  },

  // Header
  header: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
    borderBottomWidth: 1,
    marginBottom: Spacing.xl,
  },
  monthLabel: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    letterSpacing: Typography.letterSpacing.wider,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  headerTitle: {
    fontSize: Typography.sizes.display,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
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
  },
  statLabel: {
    fontSize: Typography.sizes.micro,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
  },
  summaryText: {
    fontSize: Typography.sizes.bodyLarge,
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
  },
  themeStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeFrequency: {
    fontSize: Typography.sizes.caption,
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
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  growthText: {
    flex: 1,
    fontSize: Typography.sizes.body,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },

  // Patterns
  patternCard: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  patternName: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
  },
  patternObservation: {
    fontSize: Typography.sizes.body,
    marginBottom: Spacing.md,
  },
  recommendationBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  recommendationText: {
    flex: 1,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
  },

  // Coach
  coachGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  coachCard: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    minWidth: 140,
    borderWidth: 1,
  },
  coachName: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
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
  },
  coachStatLabel: {
    fontSize: Typography.sizes.micro,
  },

  footer: {
    alignItems: 'center',
    paddingTop: Spacing.xl,
    borderTopWidth: 1,
    marginTop: Spacing.lg,
  },
  footerText: {
    fontSize: Typography.sizes.caption,
  },
});
