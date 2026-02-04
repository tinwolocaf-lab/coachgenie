// Insight Detail - Editorial view of a single insight
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { toggleInsightHighlight } from '@/lib/supabase-sanctuary';
import { KeyInsight } from '@/types';
import { getCoachById } from '@/data/coaches';
import { CoachIcon } from '@/components/ui/CoachIcon';

export default function InsightDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState<KeyInsight | null>(null);
  const [isHighlighted, setIsHighlighted] = useState(false);

  const loadInsight = useCallback(async () => {
    if (!id || !isSupabaseConfigured) return;

    try {
      const { data, error } = await supabase
        .from('key_insights')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      const insightData = data as KeyInsight;
      setInsight(insightData);
      setIsHighlighted(insightData?.is_highlighted || false);
    } catch (error) {
      console.error('Error loading insight:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadInsight();
  }, [loadInsight]);

  const handleBackPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleToggleHighlight = async () => {
    if (!insight?.id) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const newState = !isHighlighted;
    setIsHighlighted(newState);

    try {
      await toggleInsightHighlight(insight.id, newState);
    } catch (error) {
      console.error('Error toggling highlight:', error);
      setIsHighlighted(!newState); // Revert on error
    }
  };

  const handleShare = async () => {
    if (!insight) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await Share.share({
        message: `"${insight.title}"\n\n${insight.content}\n\n— From my coaching journey`,
        title: insight.title,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.burnishedGold} />
        </View>
      </SafeAreaView>
    );
  }

  if (!insight) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.stoneGray} />
          <Text style={styles.errorText}>Insight not found</Text>
          <TouchableOpacity style={styles.backButtonError} onPress={handleBackPress}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const coach = getCoachById(insight.coach_id);
  const date = new Date(insight.created_at);
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const categoryColors: Record<string, [string, string]> = {
    mindset: ['#1B3022', '#2D4A38'],
    strategy: ['#2C1E1B', '#4A3632'],
    productivity: ['#1A2A3A', '#2B3D50'],
    systems: ['#2A2A1A', '#454530'],
    general: [Colors.midnightEmerald, '#243D2E'],
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Ionicons name="chevron-back" size={24} color={Colors.midnightEmerald} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleToggleHighlight}>
            <Ionicons
              name={isHighlighted ? 'star' : 'star-outline'}
              size={22}
              color={isHighlighted ? Colors.burnishedGold : Colors.stoneGray}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={22} color={Colors.stoneGray} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Category Banner */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.categoryBanner}>
          <LinearGradient
            colors={categoryColors[insight.category] || categoryColors.general}
            style={styles.categoryGradient}
          >
            <Text style={styles.categoryLabel}>
              {insight.category.charAt(0).toUpperCase() + insight.category.slice(1)}
            </Text>
            {isHighlighted && (
              <View style={styles.highlightBadge}>
                <Ionicons name="star" size={12} color={Colors.burnishedGold} />
                <Text style={styles.highlightText}>Highlighted</Text>
              </View>
            )}
          </LinearGradient>
        </Animated.View>

        {/* Date */}
        <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.dateContainer}>
          <Text style={styles.dateText}>{formattedDate}</Text>
        </Animated.View>

        {/* Title */}
        <Animated.Text
          entering={FadeInDown.duration(500).delay(200)}
          style={styles.insightTitle}
        >
          {insight.title}
        </Animated.Text>

        {/* Decorative Line */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(300)}
          style={styles.decorativeLine}
        >
          <View style={styles.lineSegment} />
          <Ionicons name="sparkles" size={16} color={Colors.burnishedGold} />
          <View style={styles.lineSegment} />
        </Animated.View>

        {/* Content */}
        <Animated.Text
          entering={FadeInDown.duration(500).delay(400)}
          style={styles.insightContent}
        >
          {insight.content}
        </Animated.Text>

        {/* Coach Attribution */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(500)}
          style={styles.coachAttribution}
        >
          <CoachIcon
            iconName={coach?.icon_name || 'person'}
            color={coach?.color || Colors.burnishedGold}
            size="sm"
          />
          <View style={styles.coachInfo}>
            <Text style={styles.coachLabel}>Insight from</Text>
            <Text style={styles.coachName}>{coach?.name || 'Coach'}</Text>
          </View>
        </Animated.View>

        {/* Session Link */}
        {insight.session_id && (
          <Animated.View entering={FadeInDown.duration(500).delay(600)}>
            <TouchableOpacity
              style={styles.sessionLink}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/archive/session/${insight.session_id}`);
              }}
            >
              <Ionicons name="chatbubbles-outline" size={18} color={Colors.burnishedGold} />
              <Text style={styles.sessionLinkText}>View Full Session</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.stoneGray} />
            </TouchableOpacity>
          </Animated.View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.warmOatmeal,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxxl,
  },
  errorText: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    color: Colors.charcoal,
    marginTop: Spacing.lg,
  },
  backButtonError: {
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.burnishedGold,
    borderRadius: Radius.pill,
  },
  backButtonText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xl,
  },
  categoryBanner: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
  },
  categoryGradient: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  categoryLabel: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
    letterSpacing: Typography.letterSpacing.wider,
    textTransform: 'uppercase',
  },
  highlightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  highlightText: {
    fontSize: Typography.sizes.micro,
    color: Colors.goldLight,
    fontWeight: Typography.weights.medium,
  },
  dateContainer: {
    marginBottom: Spacing.lg,
  },
  dateText: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
  },
  insightTitle: {
    fontSize: Typography.sizes.display,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    color: Colors.midnightEmerald,
    lineHeight: Typography.sizes.display * Typography.lineHeights.tight,
    marginBottom: Spacing.xl,
  },
  decorativeLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  lineSegment: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  insightContent: {
    fontSize: Typography.sizes.bodyLarge,
    color: Colors.charcoal,
    lineHeight: Typography.sizes.bodyLarge * Typography.lineHeights.loose,
    marginBottom: Spacing.xxl,
  },
  coachAttribution: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.cream,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  coachInfo: {
    flex: 1,
  },
  coachLabel: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
    marginBottom: 2,
  },
  coachName: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    color: Colors.charcoal,
  },
  sessionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.goldMuted,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderGold,
  },
  sessionLinkText: {
    flex: 1,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.charcoal,
  },
  bottomSpacer: {
    height: 100,
  },
});
