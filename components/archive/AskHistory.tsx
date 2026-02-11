// AskHistory - AI-powered interface to query past advice
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { QuerySource, HistoryQuery } from '@/types';

interface AskHistoryProps {
  onSubmitQuery: (query: string) => Promise<{ answer: string; sources: QuerySource[] } | null>;
  recentQueries?: HistoryQuery[];
  isLoading?: boolean;
}

export function AskHistory({ onSubmitQuery, recentQueries = [], isLoading = false }: AskHistoryProps) {
  const { palette } = useThemeSafe();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<{ answer: string; sources: QuerySource[] } | null>(null);
  const [searching, setSearching] = useState(false);
  const inputScale = useSharedValue(1);

  const handleSubmit = async () => {
    if (!query.trim() || searching) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSearching(true);
    setResult(null);

    try {
      const response = await onSubmitQuery(query.trim());
      setResult(response);
    } catch (error) {
      console.error('Error querying history:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleFocus = () => {
    inputScale.value = withSpring(1.02, Timing.springGentle);
  };

  const handleBlur = () => {
    inputScale.value = withSpring(1, Timing.springGentle);
  };

  const inputContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: inputScale.value }],
  }));

  const suggestedQueries = [
    "What did James suggest about focus?",
    "How should I handle procrastination?",
    "What systems have I built?",
    "My biggest breakthroughs this month",
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="search" size={20} color={palette.accent} />
          <Text style={[styles.title, { color: palette.textPrimary }]}>Ask Your History</Text>
        </View>
        <Text style={[styles.subtitle, { color: palette.textTertiary }]}>
          Query your past sessions and insights with natural language
        </Text>
      </View>

      {/* Search Input */}
      <Animated.View style={[styles.inputContainer, inputContainerStyle]}>
        <LinearGradient
          colors={[palette.cardBg, palette.background]}
          style={[styles.inputGradient, { borderColor: palette.borderAccent }]}
        >
          <TextInput
            style={[styles.input, { color: palette.textSecondary }]}
            placeholder="e.g., What did my coach say about my goals?"
            placeholderTextColor={palette.textTertiary}
            value={query}
            onChangeText={setQuery}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onSubmitEditing={handleSubmit}
            returnKeyType="search"
            multiline
            numberOfLines={2}
            maxLength={200}
          />
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: palette.accent },
              (!query.trim() || searching) && { backgroundColor: palette.textTertiary, shadowOpacity: 0 },
            ]}
            onPress={handleSubmit}
            disabled={!query.trim() || searching}
          >
            {searching ? (
              <ActivityIndicator size="small" color={palette.textInverse} />
            ) : (
              <Ionicons name="arrow-forward" size={20} color={palette.textInverse} />
            )}
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>

      {/* Suggested Queries */}
      {!result && !searching && (
        <Animated.View
          entering={FadeIn.duration(300)}
          style={styles.suggestionsContainer}
        >
          <Text style={[styles.suggestionsLabel, { color: palette.textTertiary }]}>Try asking:</Text>
          <View style={styles.suggestions}>
            {suggestedQueries.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.suggestionChip, { backgroundColor: palette.cardBg, borderColor: palette.borderLight }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setQuery(suggestion);
                }}
              >
                <Text style={[styles.suggestionText, { color: palette.textSecondary }]}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      )}

      {/* Loading State */}
      {searching && (
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={styles.loadingContainer}
        >
          <View style={styles.loadingDots}>
            <LoadingDot delay={0} />
            <LoadingDot delay={200} />
            <LoadingDot delay={400} />
          </View>
          <Text style={[styles.loadingText, { color: palette.textTertiary }]}>Searching your wisdom...</Text>
        </Animated.View>
      )}

      {/* Result */}
      {result && !searching && (
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={[styles.resultContainer, { backgroundColor: palette.cardBg }]}
        >
          <View style={styles.resultHeader}>
            <Ionicons name="sparkles" size={16} color={palette.accent} />
            <Text style={[styles.resultLabel, { color: palette.accent }]}>From Your History</Text>
          </View>

          <Text style={[styles.resultAnswer, { color: palette.textSecondary }]}>{result.answer}</Text>

          {result.sources.length > 0 && (
            <View style={[styles.sourcesContainer, { borderTopColor: palette.borderLight }]}>
              <Text style={[styles.sourcesLabel, { color: palette.textTertiary }]}>Sources:</Text>
              {result.sources.slice(0, 5).map((source, index) => (
                <SourceBadge key={index} source={source} />
              ))}
            </View>
          )}

          {/* Ask another */}
          <TouchableOpacity
            style={styles.askAnotherButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setResult(null);
              setQuery('');
            }}
          >
            <Text style={[styles.askAnotherText, { color: palette.accent }]}>Ask another question</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Recent Queries */}
      {recentQueries.length > 0 && !result && !searching && (
        <View style={styles.recentContainer}>
          <Text style={[styles.recentLabel, { color: palette.textTertiary }]}>Recent Queries</Text>
          {recentQueries.slice(0, 3).map((q, index) => (
            <TouchableOpacity
              key={q.id}
              style={[styles.recentItem, { borderBottomColor: palette.borderLight }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setQuery(q.query);
              }}
            >
              <Ionicons name="time-outline" size={14} color={palette.textTertiary} />
              <Text style={[styles.recentQuery, { color: palette.textSecondary }]} numberOfLines={1}>
                {q.query}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

function LoadingDot({ delay }: { delay: number }) {
  const { palette } = useThemeSafe();
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    const interval = setInterval(() => {
      opacity.value = withTiming(1, { duration: 400 }, () => {
        opacity.value = withTiming(0.3, { duration: 400 });
      });
    }, 800);

    const timeout = setTimeout(() => {
      opacity.value = withTiming(1, { duration: 400 });
    }, delay);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [delay, opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.loadingDot, { backgroundColor: palette.accent }, style]} />;
}

function SourceBadge({ source }: { source: QuerySource }) {
  const { palette } = useThemeSafe();
  const typeIcons = {
    session: 'chatbubble-outline',
    insight: 'bulb-outline',
    breakthrough: 'star-outline',
  };

  const date = new Date(source.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <View style={styles.sourceBadge}>
      <Ionicons
        name={typeIcons[source.type] as keyof typeof Ionicons.glyphMap}
        size={12}
        color={palette.textTertiary}
      />
      <Text style={[styles.sourceTitle, { color: palette.textSecondary }]} numberOfLines={1}>
        {source.title}
      </Text>
      <Text style={[styles.sourceDate, { color: palette.textTertiary }]}>{date}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.xxl,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
  },
  subtitle: {
    fontSize: Typography.sizes.body,
    marginTop: Spacing.xs,
  },
  inputContainer: {
    borderRadius: Radius.squircle,
    overflow: 'hidden',
    ...Shadows.md,
  },
  inputGradient: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Spacing.md,
    borderWidth: 1,
    borderRadius: Radius.squircle,
  },
  input: {
    flex: 1,
    fontSize: Typography.sizes.body,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    minHeight: 44,
    maxHeight: 80,
  },
  submitButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.gold,
  },
  suggestionsContainer: {
    marginTop: Spacing.lg,
  },
  suggestionsLabel: {
    fontSize: Typography.sizes.caption,
    marginBottom: Spacing.sm,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  suggestionChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  suggestionText: {
    fontSize: Typography.sizes.caption,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  loadingDots: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  loadingText: {
    fontSize: Typography.sizes.body,
    fontStyle: 'italic',
  },
  resultContainer: {
    marginTop: Spacing.xl,
    padding: Spacing.xl,
    borderRadius: Radius.squircle,
    ...Shadows.md,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  resultLabel: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    letterSpacing: Typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  resultAnswer: {
    fontSize: Typography.sizes.bodyLarge,
    lineHeight: Typography.sizes.bodyLarge * Typography.lineHeights.relaxed,
  },
  sourcesContainer: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  sourcesLabel: {
    fontSize: Typography.sizes.caption,
    marginBottom: Spacing.sm,
  },
  sourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  sourceTitle: {
    flex: 1,
    fontSize: Typography.sizes.caption,
  },
  sourceDate: {
    fontSize: Typography.sizes.micro,
  },
  askAnotherButton: {
    marginTop: Spacing.lg,
    alignSelf: 'center',
  },
  askAnotherText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
  },
  recentContainer: {
    marginTop: Spacing.xl,
  },
  recentLabel: {
    fontSize: Typography.sizes.caption,
    marginBottom: Spacing.sm,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
  },
  recentQuery: {
    flex: 1,
    fontSize: Typography.sizes.body,
  },
});
