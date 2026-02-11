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
  Modal,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useAuthSafe } from '@/hooks/useConditionalAuth';
import { toggleInsightHighlight } from '@/lib/supabase-sanctuary';
import { createRitualFromInsight, getRituals } from '@/lib/supabase-rituals';
import { suggestRitualFromInsight } from '@/lib/apiClient';
import { KeyInsight } from '@/types';
import { getCoachById } from '@/data/coaches';
import { CoachIcon } from '@/components/ui/CoachIcon';
import { Button } from '@/components/ui/Button';

export default function InsightDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { palette } = useThemeSafe();
  const auth = useAuthSafe();

  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState<KeyInsight | null>(null);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const [showRitualModal, setShowRitualModal] = useState(false);
  const [ritualTitle, setRitualTitle] = useState('');
  const [ritualDescription, setRitualDescription] = useState('');
  const [isCreatingRitual, setIsCreatingRitual] = useState(false);
  const [isSuggestingRitual, setIsSuggestingRitual] = useState(false);
  const [ritualCreated, setRitualCreated] = useState(false);

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

  const handleOpenRitualModal = async () => {
    if (!insight || !auth.user) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowRitualModal(true);
    setIsSuggestingRitual(true);

    try {
      // Get existing rituals to avoid duplicates
      const existingRituals = await getRituals(auth.user.id);

      // Use AI to suggest a ritual based on the insight
      const suggestion = await suggestRitualFromInsight({
        insightTitle: insight.title,
        insightContent: insight.content,
        existingRituals: existingRituals.map(ritual => ritual.title),
      });

      if (suggestion) {
        setRitualTitle(suggestion.title);
        setRitualDescription(suggestion.description);
      } else {
        // Fallback to generating from insight title
        setRitualTitle(`Practice: ${insight.title.slice(0, 30)}...`);
        setRitualDescription(`A daily ritual inspired by the insight "${insight.title}"`);
      }
    } catch (error) {
      console.error('Error suggesting ritual:', error);
      // Set fallback values
      setRitualTitle(`Practice: ${insight.title.slice(0, 30)}${insight.title.length > 30 ? '...' : ''}`);
      setRitualDescription(`A daily ritual inspired by this insight`);
    } finally {
      setIsSuggestingRitual(false);
    }
  };

  const handleCreateRitual = async () => {
    if (!insight || !auth?.user || !ritualTitle.trim()) return;

    setIsCreatingRitual(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const result = await createRitualFromInsight(
        auth.user.id,
        insight.id,
        ritualTitle.trim(),
        ritualDescription.trim() || undefined
      );

      if (result) {
        setRitualCreated(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Close modal after a short delay
        setTimeout(() => {
          setShowRitualModal(false);
          setRitualCreated(false);
          setRitualTitle('');
          setRitualDescription('');
        }, 1500);
      }
    } catch (error) {
      console.error('Error creating ritual:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsCreatingRitual(false);
    }
  };

  const handleCloseRitualModal = () => {
    setShowRitualModal(false);
    setRitualTitle('');
    setRitualDescription('');
    setRitualCreated(false);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!insight) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={palette.textTertiary} />
          <Text style={[styles.errorText, { color: palette.textSecondary }]}>Insight not found</Text>
          <TouchableOpacity style={[styles.backButtonError, { backgroundColor: palette.accent }]} onPress={handleBackPress}>
            <Text style={[styles.backButtonText, { color: palette.textInverse }]}>Go Back</Text>
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
    general: [palette.gradientStart, palette.gradientEnd],
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={[styles.header, { borderBottomColor: palette.borderLight }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Ionicons name="chevron-back" size={24} color={palette.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: palette.cardBg }]} onPress={handleToggleHighlight}>
            <Ionicons
              name={isHighlighted ? 'star' : 'star-outline'}
              size={22}
              color={isHighlighted ? palette.accent : palette.textTertiary}
            />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, { backgroundColor: palette.cardBg }]} onPress={handleShare}>
            <Ionicons name="share-outline" size={22} color={palette.textTertiary} />
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
            <Text style={[styles.categoryLabel, { color: palette.textInverse }]}>
              {insight.category.charAt(0).toUpperCase() + insight.category.slice(1)}
            </Text>
            {isHighlighted && (
              <View style={styles.highlightBadge}>
                <Ionicons name="star" size={12} color={palette.accent} />
                <Text style={[styles.highlightText, { color: palette.accentLight }]}>Highlighted</Text>
              </View>
            )}
          </LinearGradient>
        </Animated.View>

        {/* Date */}
        <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.dateContainer}>
          <Text style={[styles.dateText, { color: palette.textTertiary }]}>{formattedDate}</Text>
        </Animated.View>

        {/* Title */}
        <Animated.Text
          entering={FadeInDown.duration(500).delay(200)}
          style={[styles.insightTitle, { color: palette.textPrimary }]}
        >
          {insight.title}
        </Animated.Text>

        {/* Decorative Line */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(300)}
          style={styles.decorativeLine}
        >
          <View style={[styles.lineSegment, { backgroundColor: palette.borderLight }]} />
          <Ionicons name="sparkles" size={16} color={palette.accent} />
          <View style={[styles.lineSegment, { backgroundColor: palette.borderLight }]} />
        </Animated.View>

        {/* Content */}
        <Animated.Text
          entering={FadeInDown.duration(500).delay(400)}
          style={[styles.insightContent, { color: palette.textSecondary }]}
        >
          {insight.content}
        </Animated.Text>

        {/* Coach Attribution */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(500)}
          style={[styles.coachAttribution, { backgroundColor: palette.cardBg, borderColor: palette.borderLight }]}
        >
          <CoachIcon
            iconName={coach?.icon_name || 'person'}
            color={coach?.color || palette.accent}
            size="sm"
          />
          <View style={styles.coachInfo}>
            <Text style={[styles.coachLabel, { color: palette.textTertiary }]}>Insight from</Text>
            <Text style={[styles.coachName, { color: palette.textSecondary }]}>{coach?.name || 'Coach'}</Text>
          </View>
        </Animated.View>

        {/* Session Link */}
        {insight.session_id && (
          <Animated.View entering={FadeInDown.duration(500).delay(600)}>
            <TouchableOpacity
              style={[styles.sessionLink, { backgroundColor: palette.accentMuted, borderColor: palette.borderAccent }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/archive/session/${insight.session_id}`);
              }}
            >
              <Ionicons name="chatbubbles-outline" size={18} color={palette.accent} />
              <Text style={[styles.sessionLinkText, { color: palette.textSecondary }]}>View Full Session</Text>
              <Ionicons name="chevron-forward" size={16} color={palette.textTertiary} />
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* Insight-to-Action: Create Ritual Button */}
        {auth?.user && (
          <Animated.View entering={FadeInDown.duration(500).delay(700)} style={styles.actionSection}>
            <View style={styles.actionDivider}>
              <View style={[styles.dividerLine, { backgroundColor: palette.borderLight }]} />
              <Text style={[styles.dividerText, { color: palette.textTertiary }]}>Turn insight into action</Text>
              <View style={[styles.dividerLine, { backgroundColor: palette.borderLight }]} />
            </View>

            <TouchableOpacity
              style={styles.createRitualButton}
              onPress={handleOpenRitualModal}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[palette.textPrimary, '#2D4A38']}
                style={styles.createRitualGradient}
              >
                <View style={styles.createRitualIcon}>
                  <Ionicons name="leaf" size={24} color={palette.accent} />
                </View>
                <View style={styles.createRitualContent}>
                  <Text style={[styles.createRitualTitle, { color: palette.textInverse }]}>Create a Daily Ritual</Text>
                  <Text style={[styles.createRitualSubtitle, { color: palette.accentLight }]}>Transform this insight into a habit</Text>
                </View>
                <Ionicons name="add-circle" size={28} color={palette.accent} />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Create Ritual Modal */}
      <Modal
        visible={showRitualModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseRitualModal}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: palette.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: palette.borderLight }]}>
            <TouchableOpacity onPress={handleCloseRitualModal} style={styles.modalClose}>
              <Ionicons name="close" size={24} color={palette.textSecondary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>New Daily Ritual</Text>
            <View style={styles.modalClose} />
          </View>

          {ritualCreated ? (
            <Animated.View entering={FadeInUp.duration(500)} style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={64} color={palette.success} />
              </View>
              <Text style={[styles.successTitle, { color: palette.textPrimary }]}>Ritual Created!</Text>
              <Text style={[styles.successSubtitle, { color: palette.textTertiary }]}>
                Your new daily ritual has been added to The Practice
              </Text>
            </Animated.View>
          ) : (
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Source Insight */}
              <View style={[styles.sourceInsight, { backgroundColor: palette.accentMuted, borderColor: palette.borderAccent }]}>
                <Text style={[styles.sourceLabel, { color: palette.textTertiary }]}>Based on insight:</Text>
                <Text style={[styles.sourceTitle, { color: palette.textSecondary }]} numberOfLines={2}>{insight?.title}</Text>
              </View>

              {isSuggestingRitual ? (
                <View style={styles.suggestingContainer}>
                  <ActivityIndicator size="large" color={palette.accent} />
                  <Text style={[styles.suggestingText, { color: palette.textTertiary }]}>AI is crafting a ritual suggestion...</Text>
                </View>
              ) : (
                <>
                  {/* Ritual Name Input */}
                  <View style={styles.inputSection}>
                    <Text style={[styles.inputLabel, { color: palette.textSecondary }]}>Ritual Name</Text>
                    <TextInput
                      style={[styles.textInput, { backgroundColor: palette.cardBg, borderColor: palette.border, color: palette.textSecondary }]}
                      value={ritualTitle}
                      onChangeText={setRitualTitle}
                      placeholder="e.g., Morning Gratitude Practice"
                      placeholderTextColor={palette.textTertiary}
                      maxLength={50}
                    />
                  </View>

                  {/* Description Input */}
                  <View style={styles.inputSection}>
                    <Text style={[styles.inputLabel, { color: palette.textSecondary }]}>Description (optional)</Text>
                    <TextInput
                      style={[styles.textInput, styles.textInputMultiline, { backgroundColor: palette.cardBg, borderColor: palette.border, color: palette.textSecondary }]}
                      value={ritualDescription}
                      onChangeText={setRitualDescription}
                      placeholder="What does this ritual involve?"
                      placeholderTextColor={palette.textTertiary}
                      multiline
                      numberOfLines={3}
                      maxLength={200}
                    />
                  </View>

                  {/* Info Note */}
                  <View style={[styles.infoNote, { backgroundColor: palette.accentMuted }]}>
                    <Ionicons name="information-circle" size={18} color={palette.accent} />
                    <Text style={[styles.infoNoteText, { color: palette.textSecondary }]}>
                      This ritual will be linked to this insight and appear in your daily Practice.
                    </Text>
                  </View>

                  {/* Create Button */}
                  <Button
                    title={isCreatingRitual ? 'Creating...' : 'Create Ritual'}
                    onPress={handleCreateRitual}
                    variant="gold"
                    fullWidth
                    size="lg"
                    disabled={!ritualTitle.trim() || isCreatingRitual}
                  />
                </>
              )}

              <View style={styles.modalSpacer} />
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginTop: Spacing.lg,
  },
  backButtonError: {
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.pill,
  },
  backButtonText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
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
    fontWeight: Typography.weights.medium,
  },
  dateContainer: {
    marginBottom: Spacing.lg,
  },
  dateText: {
    fontSize: Typography.sizes.caption,
  },
  insightTitle: {
    fontSize: Typography.sizes.display,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
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
  },
  insightContent: {
    fontSize: Typography.sizes.bodyLarge,
    lineHeight: Typography.sizes.bodyLarge * Typography.lineHeights.loose,
    marginBottom: Spacing.xxl,
  },
  coachAttribution: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
  },
  coachInfo: {
    flex: 1,
  },
  coachLabel: {
    fontSize: Typography.sizes.caption,
    marginBottom: 2,
  },
  coachName: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
  },
  sessionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  sessionLinkText: {
    flex: 1,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
  },

  // Action Section - Insight to Action
  actionSection: {
    marginTop: Spacing.xl,
  },
  actionDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: Typography.sizes.caption,
    fontStyle: 'italic',
    letterSpacing: Typography.letterSpacing.wide,
  },
  createRitualButton: {
    borderRadius: Radius.squircle,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  createRitualGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  createRitualIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createRitualContent: {
    flex: 1,
  },
  createRitualTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    marginBottom: 2,
  },
  createRitualSubtitle: {
    fontSize: Typography.sizes.caption,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  modalClose: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xl,
  },
  sourceInsight: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
  },
  sourceLabel: {
    fontSize: Typography.sizes.caption,
    marginBottom: Spacing.xs,
  },
  sourceTitle: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    fontStyle: 'italic',
  },
  suggestingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxxl,
    gap: Spacing.lg,
  },
  suggestingText: {
    fontSize: Typography.sizes.body,
    fontStyle: 'italic',
  },
  inputSection: {
    marginBottom: Spacing.xl,
  },
  inputLabel: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    letterSpacing: Typography.letterSpacing.wide,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    fontSize: Typography.sizes.body,
  },
  textInputMultiline: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: Spacing.md,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  infoNoteText: {
    flex: 1,
    fontSize: Typography.sizes.caption,
    lineHeight: Typography.sizes.caption * Typography.lineHeights.relaxed,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxxl,
  },
  successIcon: {
    marginBottom: Spacing.xl,
  },
  successTitle: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    marginBottom: Spacing.sm,
  },
  successSubtitle: {
    fontSize: Typography.sizes.body,
    textAlign: 'center',
  },
  modalSpacer: {
    height: 100,
  },
  bottomSpacer: {
    height: 100,
  },
});
