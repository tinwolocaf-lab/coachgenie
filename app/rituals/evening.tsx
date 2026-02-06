// Evening Audit Screen - Phase 5: The Practice
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FluidProgressBar } from '@/components/rituals/FluidProgressBar';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  getDailyReflection,
  saveDailyReflection,
  getTodayDate,
  getRitualsWithStatus,
} from '@/lib/supabase-rituals';
import { generateClosingThought } from '@/lib/apiClient';
import { getContextVault } from '@/store/app';
import { DailyReflection, RitualWithStatus, ContextVault } from '@/types';

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

export default function EveningAuditScreen() {
  const router = useRouter();
  const useAuth = getAuthHook();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const auth = useAuth && isSupabaseConfigured ? useAuth() : null;

  const [existingReflection, setExistingReflection] = useState<DailyReflection | null>(null);
  const [morningIntention, setMorningIntention] = useState<string | null>(null);
  const [wins, setWins] = useState<string[]>(['']);
  const [lessons, setLessons] = useState<string[]>(['']);
  const [ritualProgress, setRitualProgress] = useState(0);
  const [rituals, setRituals] = useState<RitualWithStatus[]>([]);
  const [userContext, setUserContext] = useState<ContextVault | null>(null);

  const [closingThought, setClosingThought] = useState<string>('');
  const [isGeneratingThought, setIsGeneratingThought] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Load data
  useEffect(() => {
    loadData();
  }, [auth?.user?.id]);

  const loadData = useCallback(async () => {
    if (!auth?.user?.id) return;

    try {
      const today = getTodayDate();

      // Load existing evening reflection
      const existingEvening = await getDailyReflection(auth.user.id, today, 'evening');
      if (existingEvening) {
        setExistingReflection(existingEvening);
        setWins(existingEvening.wins?.length ? existingEvening.wins : ['']);
        setLessons(existingEvening.lessons?.length ? existingEvening.lessons : ['']);
        setClosingThought(existingEvening.ai_closing_thought || '');
      }

      // Load morning intention
      const morningReflection = await getDailyReflection(auth.user.id, today, 'morning');
      if (morningReflection?.response) {
        setMorningIntention(morningReflection.response);
      }

      // Load ritual progress
      const todayRituals = await getRitualsWithStatus(auth.user.id, today);
      setRituals(todayRituals);
      const completed = todayRituals.filter(r => r.is_completed_today).length;
      const progress = todayRituals.length > 0 ? Math.round((completed / todayRituals.length) * 100) : 0;
      setRitualProgress(progress);

      // Load user context
      const context = await getContextVault();
      setUserContext(context);
    } catch (error) {
      console.error('Error loading evening data:', error);
    }
  }, [auth?.user?.id]);

  const handleAddWin = () => {
    if (wins.length < 5) {
      setWins([...wins, '']);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleAddLesson = () => {
    if (lessons.length < 5) {
      setLessons([...lessons, '']);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleUpdateWin = (index: number, value: string) => {
    const newWins = [...wins];
    newWins[index] = value;
    setWins(newWins);
  };

  const handleUpdateLesson = (index: number, value: string) => {
    const newLessons = [...lessons];
    newLessons[index] = value;
    setLessons(newLessons);
  };

  const handleRemoveWin = (index: number) => {
    if (wins.length > 1) {
      setWins(wins.filter((_, i) => i !== index));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleRemoveLesson = (index: number) => {
    if (lessons.length > 1) {
      setLessons(lessons.filter((_, i) => i !== index));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleGenerateClosingThought = async () => {
    if (!auth?.user?.id) return;

    setIsGeneratingThought(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const filteredWins = wins.filter(w => w.trim());
      const filteredLessons = lessons.filter(l => l.trim());

      const thought = await generateClosingThought({
        wins: filteredWins,
        lessons: filteredLessons,
        morningIntention,
        ritualProgress,
        values: userContext?.values ?? [],
        goals: userContext?.goals.map(goal => goal.title) ?? [],
      });

      setClosingThought(thought);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error generating closing thought:', error);
      setClosingThought("Rest well—every effort today was a step forward.");
    } finally {
      setIsGeneratingThought(false);
    }
  };

  const handleSave = async () => {
    if (!auth?.user?.id) return;

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const filteredWins = wins.filter(w => w.trim());
      const filteredLessons = lessons.filter(l => l.trim());

      // Generate closing thought if not already generated
      let finalThought = closingThought;
      if (!finalThought && (filteredWins.length > 0 || filteredLessons.length > 0)) {
        finalThought = await generateClosingThought({
          wins: filteredWins,
          lessons: filteredLessons,
          morningIntention,
          ritualProgress,
          values: userContext?.values ?? [],
          goals: userContext?.goals.map(goal => goal.title) ?? [],
        });
      }

      const reflection = await saveDailyReflection(auth.user.id, {
        date: getTodayDate(),
        reflection_type: 'evening',
        wins: filteredWins,
        lessons: filteredLessons,
        ai_closing_thought: finalThought,
      });

      if (reflection) {
        setShowConfirmation(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        setTimeout(() => {
          router.back();
        }, 2000);
      }
    } catch (error) {
      console.error('Error saving evening audit:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const hasContent = wins.some(w => w.trim()) || lessons.some(l => l.trim());

  if (showConfirmation) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
          style={styles.confirmationContainer}
        >
          <LinearGradient
            colors={[Colors.midnightEmerald + '15', Colors.warmOatmeal]}
            style={styles.confirmationGradient}
          >
            <Animated.View
              entering={FadeInUp.duration(400).delay(100)}
              style={styles.confirmationContent}
            >
              <View style={styles.confirmationIcon}>
                <Ionicons name="moon" size={48} color={Colors.midnightEmerald} />
              </View>
              <Text style={styles.confirmationTitle}>Day Complete</Text>
              {closingThought && (
                <Text style={styles.confirmationThought}>
                  &ldquo;{closingThought}&rdquo;
                </Text>
              )}
              <Text style={styles.confirmationSubtitle}>
                Rest well and rise renewed
              </Text>
            </Animated.View>
          </LinearGradient>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={24} color={Colors.charcoal} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.moonIcon}>
              <Ionicons name="moon" size={20} color={Colors.midnightEmerald} />
            </View>
            <Text style={styles.headerTitle}>Evening Audit</Text>
          </View>
          <View style={styles.headerRight} />
        </Animated.View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Progress Summary */}
          <Animated.View entering={FadeInUp.duration(400).delay(100)}>
            <Card variant="glass" style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>Today&apos;s Practice</Text>
                <Text style={styles.progressPercent}>{ritualProgress}%</Text>
              </View>
              <FluidProgressBar
                progress={ritualProgress}
                height={8}
                showWave
              />
              <View style={styles.progressDetails}>
                <Text style={styles.progressText}>
                  {rituals.filter(r => r.is_completed_today).length} of {rituals.length} rituals completed
                </Text>
              </View>
            </Card>
          </Animated.View>

          {/* Morning Intention Reference */}
          {morningIntention && (
            <Animated.View entering={FadeInUp.duration(400).delay(200)}>
              <Card variant="outlined" style={styles.intentionCard}>
                <View style={styles.intentionHeader}>
                  <Ionicons name="sunny-outline" size={16} color={Colors.burnishedGold} />
                  <Text style={styles.intentionLabel}>This morning&apos;s intention</Text>
                </View>
                <Text style={styles.intentionText}>&ldquo;{morningIntention}&rdquo;</Text>
              </Card>
            </Animated.View>
          )}

          {/* Wins Section */}
          <Animated.View entering={FadeInUp.duration(400).delay(300)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="trophy" size={20} color={Colors.burnishedGold} />
              <Text style={styles.sectionTitle}>Wins</Text>
              <Text style={styles.sectionHint}>What went well?</Text>
            </View>

            {wins.map((win, index) => (
              <View key={index} style={styles.inputRow}>
                <TextInput
                  style={styles.listInput}
                  placeholder="Something that went well..."
                  placeholderTextColor={Colors.stoneGray}
                  value={win}
                  onChangeText={(value) => handleUpdateWin(index, value)}
                  multiline
                  editable={!existingReflection}
                />
                {wins.length > 1 && !existingReflection && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveWin(index)}
                  >
                    <Ionicons name="close-circle" size={20} color={Colors.stoneGray} />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {wins.length < 5 && !existingReflection && (
              <TouchableOpacity style={styles.addButton} onPress={handleAddWin}>
                <Ionicons name="add" size={18} color={Colors.burnishedGold} />
                <Text style={styles.addButtonText}>Add win</Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Lessons Section */}
          <Animated.View entering={FadeInUp.duration(400).delay(400)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="bulb" size={20} color={Colors.midnightEmerald} />
              <Text style={styles.sectionTitle}>Lessons</Text>
              <Text style={styles.sectionHint}>What did you learn?</Text>
            </View>

            {lessons.map((lesson, index) => (
              <View key={index} style={styles.inputRow}>
                <TextInput
                  style={styles.listInput}
                  placeholder="Something you learned..."
                  placeholderTextColor={Colors.stoneGray}
                  value={lesson}
                  onChangeText={(value) => handleUpdateLesson(index, value)}
                  multiline
                  editable={!existingReflection}
                />
                {lessons.length > 1 && !existingReflection && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveLesson(index)}
                  >
                    <Ionicons name="close-circle" size={20} color={Colors.stoneGray} />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {lessons.length < 5 && !existingReflection && (
              <TouchableOpacity style={styles.addButton} onPress={handleAddLesson}>
                <Ionicons name="add" size={18} color={Colors.midnightEmerald} />
                <Text style={styles.addButtonText}>Add lesson</Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* AI Closing Thought */}
          {(closingThought || hasContent) && (
            <Animated.View entering={FadeInUp.duration(400).delay(500)} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="sparkles" size={20} color={Colors.burnishedGold} />
                <Text style={styles.sectionTitle}>Closing Thought</Text>
              </View>

              {closingThought ? (
                <Card variant="gold" style={styles.thoughtCard}>
                  <Text style={styles.thoughtText}>&ldquo;{closingThought}&rdquo;</Text>
                  <View style={styles.aiLabel}>
                    <Ionicons name="sparkles" size={12} color={Colors.burnishedGold} />
                    <Text style={styles.aiLabelText}>AI-generated reflection</Text>
                  </View>
                </Card>
              ) : (
                !existingReflection && (
                  <TouchableOpacity
                    style={styles.generateButton}
                    onPress={handleGenerateClosingThought}
                    disabled={isGeneratingThought}
                  >
                    <LinearGradient
                      colors={[Colors.goldMuted, Colors.warmOatmeal]}
                      style={styles.generateGradient}
                    >
                      {isGeneratingThought ? (
                        <Text style={styles.generateText}>Reflecting...</Text>
                      ) : (
                        <>
                          <Ionicons name="sparkles" size={18} color={Colors.burnishedGold} />
                          <Text style={styles.generateText}>Generate closing thought</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                )
              )}
            </Animated.View>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Save Button */}
        {!existingReflection && (
          <Animated.View entering={FadeInUp.duration(400).delay(600)} style={styles.footer}>
            <Button
              title={isSaving ? 'Saving...' : 'Complete Day'}
              onPress={handleSave}
              variant="primary"
              fullWidth
              size="lg"
              disabled={!hasContent || isSaving}
              loading={isSaving}
            />
          </Animated.View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.warmOatmeal,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  moonIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.midnightEmerald + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    color: Colors.charcoal,
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.xxl,
  },

  // Progress Card
  progressCard: {
    marginBottom: Spacing.xxl,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  progressTitle: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.charcoal,
  },
  progressPercent: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.bold,
    fontFamily: Typography.fonts.serif,
    color: Colors.burnishedGold,
  },
  progressDetails: {
    marginTop: Spacing.sm,
  },
  progressText: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
  },

  // Intention Card
  intentionCard: {
    marginBottom: Spacing.xxl,
  },
  intentionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  intentionLabel: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wide,
  },
  intentionText: {
    fontSize: Typography.sizes.body,
    fontStyle: 'italic',
    color: Colors.charcoal,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },

  // Sections
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    color: Colors.midnightEmerald,
  },
  sectionHint: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
    marginLeft: 'auto',
  },

  // Input Rows
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  listInput: {
    flex: 1,
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    fontSize: Typography.sizes.body,
    color: Colors.charcoal,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    minHeight: 48,
    ...Shadows.subtle,
  },
  removeButton: {
    padding: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
  },
  addButtonText: {
    fontSize: Typography.sizes.body,
    color: Colors.burnishedGold,
    fontWeight: Typography.weights.medium,
  },

  // Closing Thought
  thoughtCard: {
    padding: Spacing.xl,
  },
  thoughtText: {
    fontSize: Typography.sizes.bodyLarge,
    fontStyle: 'italic',
    color: Colors.charcoal,
    lineHeight: Typography.sizes.bodyLarge * Typography.lineHeights.relaxed,
    marginBottom: Spacing.md,
  },
  aiLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  aiLabelText: {
    fontSize: Typography.sizes.micro,
    color: Colors.burnishedGold,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wide,
  },
  generateButton: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderGold,
    borderStyle: 'dashed',
  },
  generateGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  generateText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.burnishedGold,
  },

  // Footer
  footer: {
    padding: Spacing.xxl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    backgroundColor: Colors.warmOatmeal,
  },
  bottomSpacer: {
    height: Spacing.section,
  },

  // Confirmation
  confirmationContainer: {
    flex: 1,
  },
  confirmationGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  confirmationContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  confirmationIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.midnightEmerald + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    ...Shadows.md,
  },
  confirmationTitle: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    color: Colors.midnightEmerald,
    marginBottom: Spacing.md,
  },
  confirmationThought: {
    fontSize: Typography.sizes.body,
    fontStyle: 'italic',
    color: Colors.charcoal,
    textAlign: 'center',
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
    marginBottom: Spacing.lg,
  },
  confirmationSubtitle: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
  },
});
