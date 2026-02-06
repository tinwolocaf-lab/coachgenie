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
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { toggleInsightHighlight } from '@/lib/supabase-sanctuary';
import { createRitualFromInsight, getRituals } from '@/lib/supabase-rituals';
import { suggestRitualFromInsight } from '@/lib/apiClient';
import { KeyInsight } from '@/types';
import { getCoachById } from '@/data/coaches';
import { CoachIcon } from '@/components/ui/CoachIcon';
import { Button } from '@/components/ui/Button';

// Dynamic auth hook
const getAuthHook = () => {
  if (isSupabaseConfigured) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require('@fastshot/auth').useAuth;
    } catch {
      return null;
    }
  }
  return null;
};

export default function InsightDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const useAuth = getAuthHook();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const auth = useAuth && isSupabaseConfigured ? useAuth() : null;

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
    if (!insight || !auth?.user) return;

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

        {/* Insight-to-Action: Create Ritual Button */}
        {auth?.user && (
          <Animated.View entering={FadeInDown.duration(500).delay(700)} style={styles.actionSection}>
            <View style={styles.actionDivider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Turn insight into action</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.createRitualButton}
              onPress={handleOpenRitualModal}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={[Colors.midnightEmerald, '#2D4A38']}
                style={styles.createRitualGradient}
              >
                <View style={styles.createRitualIcon}>
                  <Ionicons name="leaf" size={24} color={Colors.burnishedGold} />
                </View>
                <View style={styles.createRitualContent}>
                  <Text style={styles.createRitualTitle}>Create a Daily Ritual</Text>
                  <Text style={styles.createRitualSubtitle}>Transform this insight into a habit</Text>
                </View>
                <Ionicons name="add-circle" size={28} color={Colors.burnishedGold} />
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
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleCloseRitualModal} style={styles.modalClose}>
              <Ionicons name="close" size={24} color={Colors.charcoal} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Daily Ritual</Text>
            <View style={styles.modalClose} />
          </View>

          {ritualCreated ? (
            <Animated.View entering={FadeInUp.duration(500)} style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={64} color={Colors.success} />
              </View>
              <Text style={styles.successTitle}>Ritual Created!</Text>
              <Text style={styles.successSubtitle}>
                Your new daily ritual has been added to The Practice
              </Text>
            </Animated.View>
          ) : (
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Source Insight */}
              <View style={styles.sourceInsight}>
                <Text style={styles.sourceLabel}>Based on insight:</Text>
                <Text style={styles.sourceTitle} numberOfLines={2}>{insight?.title}</Text>
              </View>

              {isSuggestingRitual ? (
                <View style={styles.suggestingContainer}>
                  <ActivityIndicator size="large" color={Colors.burnishedGold} />
                  <Text style={styles.suggestingText}>AI is crafting a ritual suggestion...</Text>
                </View>
              ) : (
                <>
                  {/* Ritual Name Input */}
                  <View style={styles.inputSection}>
                    <Text style={styles.inputLabel}>Ritual Name</Text>
                    <TextInput
                      style={styles.textInput}
                      value={ritualTitle}
                      onChangeText={setRitualTitle}
                      placeholder="e.g., Morning Gratitude Practice"
                      placeholderTextColor={Colors.stoneGray}
                      maxLength={50}
                    />
                  </View>

                  {/* Description Input */}
                  <View style={styles.inputSection}>
                    <Text style={styles.inputLabel}>Description (optional)</Text>
                    <TextInput
                      style={[styles.textInput, styles.textInputMultiline]}
                      value={ritualDescription}
                      onChangeText={setRitualDescription}
                      placeholder="What does this ritual involve?"
                      placeholderTextColor={Colors.stoneGray}
                      multiline
                      numberOfLines={3}
                      maxLength={200}
                    />
                  </View>

                  {/* Info Note */}
                  <View style={styles.infoNote}>
                    <Ionicons name="information-circle" size={18} color={Colors.burnishedGold} />
                    <Text style={styles.infoNoteText}>
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
    backgroundColor: Colors.borderLight,
  },
  dividerText: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
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
    color: Colors.white,
    marginBottom: 2,
  },
  createRitualSubtitle: {
    fontSize: Typography.sizes.caption,
    color: Colors.goldLight,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.warmOatmeal,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
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
    color: Colors.midnightEmerald,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xl,
  },
  sourceInsight: {
    backgroundColor: Colors.goldMuted,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.borderGold,
  },
  sourceLabel: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
    marginBottom: Spacing.xs,
  },
  sourceTitle: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.charcoal,
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
    color: Colors.stoneGray,
    fontStyle: 'italic',
  },
  inputSection: {
    marginBottom: Spacing.xl,
  },
  inputLabel: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    color: Colors.charcoal,
    letterSpacing: Typography.letterSpacing.wide,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  textInput: {
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    fontSize: Typography.sizes.body,
    color: Colors.charcoal,
  },
  textInputMultiline: {
    height: 100,
    textAlignVertical: 'top',
    paddingTop: Spacing.md,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.goldMuted,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  infoNoteText: {
    flex: 1,
    fontSize: Typography.sizes.caption,
    color: Colors.charcoal,
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
    color: Colors.midnightEmerald,
    marginBottom: Spacing.sm,
  },
  successSubtitle: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
    textAlign: 'center',
  },
  modalSpacer: {
    height: 100,
  },
  bottomSpacer: {
    height: 100,
  },
});
