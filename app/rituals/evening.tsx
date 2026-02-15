// Evening Audit Screen - Phase 3: The Oracle & AI Resonance
// Candlelight aesthetic with warm ambers, deep shadows, and AI Resonance letter
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
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Typography, Spacing, Radius } from '@/constants/theme';
import { PremiumPageTransition } from '@/components/ui/PremiumPageTransition';
import { useAuthSafe } from '@/hooks/useConditionalAuth';
import { useAlert } from '@/contexts/AlertContext';
import {
  getDailyReflection,
  saveDailyReflection,
  getTodayDate,
  getRitualsWithStatus,
} from '@/lib/supabase-rituals';
import { generateClosingThought } from '@/lib/apiClient';
import { canAccessFeature, getUserTier } from '@/lib/feature-gates';
import { getContextVault } from '@/store/app';
import { WidgetBridge } from '@/lib/widgetBridge';
import { DailyReflection, RitualWithStatus, ContextVault } from '@/types';
import { AIResonanceNote, CandlelightPalette } from '@/components/oracle/AIResonanceNote';
import { VoiceMode } from '@/components/chat/VoiceMode';

// Candlelight theme constants
const CL = CandlelightPalette;

export default function EveningAuditScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const auth = useAuthSafe();
  const { showAlert } = useAlert();

  const [existingReflection, setExistingReflection] = useState<DailyReflection | null>(null);
  const [morningIntention, setMorningIntention] = useState<string | null>(null);
  const [wins, setWins] = useState<string[]>(['']);
  const [lessons, setLessons] = useState<string[]>(['']);
  const [ritualProgress, setRitualProgress] = useState(0);
  const [rituals, setRituals] = useState<RitualWithStatus[]>([]);
  const [userContext, setUserContext] = useState<ContextVault | null>(null);
  const [userName, setUserName] = useState('');

  const [resonanceLetter, setResonanceLetter] = useState<string>('');
  const [isGeneratingResonance, setIsGeneratingResonance] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showResonance, setShowResonance] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [voiceNotesEnabled, setVoiceNotesEnabled] = useState(false);

  // Candlelight ambient animation
  const glowPulse = useSharedValue(0);

  useEffect(() => {
    glowPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [glowPulse]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glowPulse.value, [0, 1], [0.05, 0.12]),
  }));

  useEffect(() => {
    if (auth?.user) {
      const metadata = auth.user.user_metadata || {};
      const name = metadata.full_name || metadata.name || auth.user.email?.split('@')[0] || '';
      setUserName(name.split(' ')[0]);
    }
  }, [auth?.user]);

  const loadData = useCallback(async () => {
    if (!auth?.user?.id) return;

    try {
      const today = getTodayDate();

      const existingEvening = await getDailyReflection(auth.user.id, today, 'evening');
      if (existingEvening) {
        setExistingReflection(existingEvening);
        setWins(existingEvening.wins?.length ? existingEvening.wins : ['']);
        setLessons(existingEvening.lessons?.length ? existingEvening.lessons : ['']);
        if (existingEvening.ai_closing_thought) {
          setResonanceLetter(existingEvening.ai_closing_thought);
          setShowResonance(true);
        }
      }

      const morningReflection = await getDailyReflection(auth.user.id, today, 'morning');
      if (morningReflection?.response) {
        setMorningIntention(morningReflection.response);
      }

      const todayRituals = await getRitualsWithStatus(auth.user.id, today);
      setRituals(todayRituals);
      const completed = todayRituals.filter(r => r.is_completed_today).length;
      const progress = todayRituals.length > 0 ? Math.round((completed / todayRituals.length) * 100) : 0;
      setRitualProgress(progress);

      const context = await getContextVault();
      setUserContext(context);
    } catch (error) {
      console.error('Error loading evening data:', error);
    }
  }, [auth?.user?.id]);

  // Load data
  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const loadVoiceAccess = async () => {
      try {
        const tier = await getUserTier();
        setVoiceNotesEnabled(canAccessFeature(tier, 'voiceNotes'));
      } catch (error) {
        console.warn('Could not resolve tier for voice notes:', error);
        setVoiceNotesEnabled(false);
      }
    };

    void loadVoiceAccess();
  }, []);

  const handleVoiceDisabledPress = useCallback(() => {
    showAlert('Voice Messages', 'Voice messages are available on Sovereign and Oracle plans.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'View Plans', onPress: () => router.push('/paywall') },
    ]);
  }, [router, showAlert]);

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

  const handleSave = async () => {
    if (!auth?.user?.id) return;

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const filteredWins = wins.filter(w => w.trim());
      const filteredLessons = lessons.filter(l => l.trim());

      // Generate closing thought if not already generated
      let finalThought = resonanceLetter;
      if (!finalThought && (filteredWins.length > 0 || filteredLessons.length > 0)) {
        setIsGeneratingResonance(true);
        finalThought = await generateClosingThought({
          wins: filteredWins,
          lessons: filteredLessons,
          morningIntention,
          ritualProgress,
          values: userContext?.values ?? [],
          goals: userContext?.goals.map(goal => goal.title) ?? [],
        });
        setResonanceLetter(finalThought);
        setIsGeneratingResonance(false);
      }

      // Save reflection
      const reflection = await saveDailyReflection(auth.user.id, {
        date: getTodayDate(),
        reflection_type: 'evening',
        wins: filteredWins,
        lessons: filteredLessons,
        ai_closing_thought: finalThought,
      });

      if (reflection) {
        // Sync evening reflection to widget
        WidgetBridge.updateReflection({
          contentType: 'evening',
          mainContent: filteredWins[0] || 'Evening reflection complete',
          insight: finalThought?.slice(0, 100),
          timeOfDay: 'evening',
          subtitle: filteredLessons[0],
        }).catch(() => {});

        // Show the Resonance experience
        setShowResonance(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error saving evening audit:', error);
      setIsGeneratingResonance(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleResonanceComplete = () => {
    setShowCompletion(true);
  };

  const hasContent = wins.some(w => w.trim()) || lessons.some(l => l.trim());

  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <PremiumPageTransition>
      {showCompletion ? (
        <View style={styles.completionContainer}>
          <StatusBar barStyle="light-content" />
          <Animated.View
            entering={FadeIn.duration(800)}
            style={styles.completionContent}
          >
            <Animated.View entering={FadeInUp.duration(600).delay(200)}>
              <View style={styles.completionMoon}>
                <Ionicons name="moon" size={36} color={CL.accent} />
              </View>
            </Animated.View>

            <Animated.View entering={FadeInUp.duration(600).delay(500)}>
              <Text style={styles.completionTitle}>Day Complete</Text>
            </Animated.View>

            <Animated.View entering={FadeInUp.duration(600).delay(800)}>
              <Text style={styles.completionSubtitle}>
                Rest well and rise renewed
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInUp.duration(600).delay(1200)}>
              <TouchableOpacity style={styles.completionButton} onPress={handleClose}>
                <Text style={styles.completionButtonText}>Close</Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </View>
      ) : showResonance && resonanceLetter ? (
        <View style={styles.resonanceContainer}>
          <StatusBar barStyle="light-content" />
          <SafeAreaView style={styles.resonanceSafe} edges={['top', 'bottom']}>
            {/* Ambient candlelight glow */}
            <Animated.View style={[styles.ambientGlow, glowStyle]}>
              <LinearGradient
                colors={['#E8B44D15', 'transparent', '#E8B44D08']}
                style={StyleSheet.absoluteFillObject}
              />
            </Animated.View>

            <ScrollView
              contentContainerStyle={styles.resonanceScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {/* Resonance header */}
              <Animated.View entering={FadeIn.duration(600)} style={styles.resonanceHeader}>
                <View style={styles.resonanceMoon}>
                  <Ionicons name="moon" size={24} color={CL.accent} />
                </View>
                <Text style={styles.resonanceTitle}>Evening Reflection</Text>
                <Text style={styles.resonanceDate}>{dateString}</Text>
              </Animated.View>

              {/* Brief recap of what was entered */}
              <Animated.View entering={FadeInUp.duration(500).delay(300)} style={styles.recapSection}>
                {wins.filter(w => w.trim()).length > 0 && (
                  <View style={styles.recapBlock}>
                    <Text style={styles.recapLabel}>TODAY&apos;S WINS</Text>
                    {wins.filter(w => w.trim()).map((win, i) => (
                      <Text key={i} style={styles.recapItem}>{win}</Text>
                    ))}
                  </View>
                )}
                {lessons.filter(l => l.trim()).length > 0 && (
                  <View style={styles.recapBlock}>
                    <Text style={styles.recapLabel}>LESSONS</Text>
                    {lessons.filter(l => l.trim()).map((lesson, i) => (
                      <Text key={i} style={styles.recapItem}>{lesson}</Text>
                    ))}
                  </View>
                )}
              </Animated.View>

              {/* AI Resonance note */}
              <AIResonanceNote
                letter={resonanceLetter}
                onComplete={handleResonanceComplete}
                userName={userName}
              />

              {/* Spacer */}
              <View style={{ height: 60 }} />
            </ScrollView>

            {/* Close button */}
            {showCompletion && (
              <Animated.View entering={FadeIn.duration(400)} style={styles.resonanceCloseRow}>
                <TouchableOpacity style={styles.resonanceCloseBtn} onPress={handleClose}>
                  <Text style={styles.resonanceCloseText}>Rest well</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </SafeAreaView>
        </View>
      ) : (
        <View style={styles.container}>
          <StatusBar barStyle="light-content" />

          {/* Ambient candlelight glow */}
          <Animated.View style={[styles.ambientGlow, glowStyle]}>
            <LinearGradient
              colors={['#E8B44D10', 'transparent', '#E8B44D05']}
              style={StyleSheet.absoluteFillObject}
            />
          </Animated.View>

          <SafeAreaView style={styles.safeArea} edges={['top']}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.keyboardView}
            >
              {/* Header */}
              <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
                <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                  <Ionicons name="close" size={22} color={CL.textSecondary} />
                </TouchableOpacity>
                <View style={styles.headerCenter}>
                  <View style={styles.moonIcon}>
                    <Ionicons name="moon" size={16} color={CL.accent} />
                  </View>
                  <Text style={styles.headerTitle}>Evening Audit</Text>
                </View>
                <View style={styles.headerRight} />
              </Animated.View>

              {/* Header border */}
              <View style={styles.headerBorder} />

              <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Date & greeting */}
                <Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.dateSection}>
                  <Text style={styles.dateText}>{dateString}</Text>
                  <LinearGradient
                    colors={['transparent', CL.accent + '30', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.dateLine}
                  />
                </Animated.View>

                {/* Practice progress */}
                <Animated.View entering={FadeInUp.duration(400).delay(200)} style={styles.progressSection}>
                  <View style={styles.progressRow}>
                    <Text style={styles.progressLabel}>DAILY PRACTICE</Text>
                    <Text style={styles.progressValue}>{ritualProgress}%</Text>
                  </View>
                  <View style={styles.progressBar}>
                    <LinearGradient
                      colors={[CL.accentWarm, CL.accent]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.progressFill, { width: `${ritualProgress}%` }]}
                    />
                  </View>
                  <Text style={styles.progressDetail}>
                    {rituals.filter(r => r.is_completed_today).length} of {rituals.length} rituals
                  </Text>
                </Animated.View>

                {/* Morning intention reference */}
                {morningIntention && (
                  <Animated.View entering={FadeInUp.duration(400).delay(300)} style={styles.intentionSection}>
                    <View style={styles.intentionRow}>
                      <Ionicons name="sunny-outline" size={14} color={CL.accent + '80'} />
                      <Text style={styles.intentionLabel}>this morning&apos;s intention</Text>
                    </View>
                    <Text style={styles.intentionText}>&ldquo;{morningIntention}&rdquo;</Text>
                  </Animated.View>
                )}

                {/* Wins section */}
                <Animated.View entering={FadeInUp.duration(400).delay(400)} style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionEmoji}>✦</Text>
                    <Text style={styles.sectionTitle}>Wins</Text>
                    <Text style={styles.sectionHint}>what went well</Text>
                    {!existingReflection && (
                      <VoiceMode
                        onTranscription={(text) => {
                          // Add transcribed text to next empty win slot or create new one
                          const emptyIdx = wins.findIndex(w => !w.trim());
                          if (emptyIdx >= 0) {
                            handleUpdateWin(emptyIdx, text);
                          } else if (wins.length < 5) {
                            setWins([...wins, text]);
                          }
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        }}
                        isEnabled={voiceNotesEnabled}
                        onDisabledPress={handleVoiceDisabledPress}
                      />
                    )}
                  </View>

                  {wins.map((win, index) => (
                    <View key={`win-${index}`} style={styles.inputRow}>
                      <TextInput
                        style={styles.inputField}
                        placeholder="Something that went well..."
                        placeholderTextColor={CL.textTertiary + '80'}
                        value={win}
                        onChangeText={(value) => handleUpdateWin(index, value)}
                        multiline
                        editable={!existingReflection}
                        returnKeyType="next"
                      />
                      {wins.length > 1 && !existingReflection && (
                        <TouchableOpacity
                          style={styles.removeBtn}
                          onPress={() => handleRemoveWin(index)}
                        >
                          <Ionicons name="close-circle" size={18} color={CL.textTertiary} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}

                  {wins.length < 5 && !existingReflection && (
                    <TouchableOpacity style={styles.addBtn} onPress={handleAddWin}>
                      <Ionicons name="add" size={16} color={CL.accent} />
                      <Text style={styles.addBtnText}>Add win</Text>
                    </TouchableOpacity>
                  )}
                </Animated.View>

                {/* Lessons section */}
                <Animated.View entering={FadeInUp.duration(400).delay(500)} style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionEmoji}>◆</Text>
                    <Text style={styles.sectionTitle}>Lessons</Text>
                    <Text style={styles.sectionHint}>what you learned</Text>
                    {!existingReflection && (
                      <VoiceMode
                        onTranscription={(text) => {
                          const emptyIdx = lessons.findIndex(l => !l.trim());
                          if (emptyIdx >= 0) {
                            handleUpdateLesson(emptyIdx, text);
                          } else if (lessons.length < 5) {
                            setLessons([...lessons, text]);
                          }
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        }}
                        isEnabled={voiceNotesEnabled}
                        onDisabledPress={handleVoiceDisabledPress}
                      />
                    )}
                  </View>

                  {lessons.map((lesson, index) => (
                    <View key={`lesson-${index}`} style={styles.inputRow}>
                      <TextInput
                        style={styles.inputField}
                        placeholder="Something you learned..."
                        placeholderTextColor={CL.textTertiary + '80'}
                        value={lesson}
                        onChangeText={(value) => handleUpdateLesson(index, value)}
                        multiline
                        editable={!existingReflection}
                        returnKeyType="next"
                      />
                      {lessons.length > 1 && !existingReflection && (
                        <TouchableOpacity
                          style={styles.removeBtn}
                          onPress={() => handleRemoveLesson(index)}
                        >
                          <Ionicons name="close-circle" size={18} color={CL.textTertiary} />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}

                  {lessons.length < 5 && !existingReflection && (
                    <TouchableOpacity style={styles.addBtn} onPress={handleAddLesson}>
                      <Ionicons name="add" size={16} color={CL.accent} />
                      <Text style={styles.addBtnText}>Add lesson</Text>
                    </TouchableOpacity>
                  )}
                </Animated.View>

                {/* Existing Resonance (for already-completed audits) */}
                {existingReflection && resonanceLetter && (
                  <Animated.View entering={FadeInUp.duration(400).delay(600)}>
                    <AIResonanceNote letter={resonanceLetter} userName={userName} />
                  </Animated.View>
                )}

                <View style={styles.bottomSpacer} />
              </ScrollView>

              {/* Save Button / Generating state */}
              {!existingReflection && (
                <Animated.View
                  entering={FadeInUp.duration(400).delay(700)}
                  style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}
                >
                  <TouchableOpacity
                    style={[
                      styles.saveButton,
                      (!hasContent || isSaving || isGeneratingResonance) && styles.saveButtonDisabled,
                    ]}
                    onPress={handleSave}
                    disabled={!hasContent || isSaving || isGeneratingResonance}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={
                        hasContent && !isSaving
                          ? [CL.accentWarm, CL.accent]
                          : [CL.cardBorder, CL.cardBorder]
                      }
                      style={styles.saveButtonGradient}
                    >
                      {isSaving || isGeneratingResonance ? (
                        <Text style={styles.saveButtonText}>
                          {isGeneratingResonance ? 'The Oracle is writing...' : 'Saving...'}
                        </Text>
                      ) : (
                        <>
                          <Ionicons name="moon" size={18} color="#FFFFFF" />
                          <Text style={styles.saveButtonText}>Complete Day</Text>
                        </>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              )}
            </KeyboardAvoidingView>
          </SafeAreaView>
        </View>
      )}
    </PremiumPageTransition>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CL.background,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },

  // Ambient glow
  ambientGlow: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    zIndex: 1,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: CL.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.sizes.body,
    fontFamily: Typography.fonts.sansMedium,
    color: CL.textPrimary,
    letterSpacing: Typography.letterSpacing.wider,
  },
  headerRight: {
    width: 40,
  },
  headerBorder: {
    height: 1,
    backgroundColor: CL.divider,
    marginHorizontal: Spacing.xl,
  },

  // Content
  content: {
    flex: 1,
    zIndex: 1,
  },
  contentContainer: {
    padding: Spacing.xl,
    paddingTop: Spacing.lg,
  },

  // Date section
  dateSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  dateText: {
    fontSize: Typography.sizes.caption,
    fontFamily: Typography.fonts.sansLight,
    color: CL.textTertiary,
    letterSpacing: Typography.letterSpacing.display,
    textTransform: 'uppercase',
    marginBottom: Spacing.md,
  },
  dateLine: {
    width: 60,
    height: 1.5,
    borderRadius: 1,
  },

  // Progress
  progressSection: {
    marginBottom: Spacing.xxl,
    padding: Spacing.lg,
    backgroundColor: CL.cardBg,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: CL.cardBorder,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  progressLabel: {
    fontSize: Typography.sizes.micro,
    fontFamily: Typography.fonts.sansMedium,
    color: CL.textTertiary,
    letterSpacing: Typography.letterSpacing.display,
    textTransform: 'uppercase',
  },
  progressValue: {
    fontSize: Typography.sizes.title,
    fontFamily: Typography.fonts.serif,
    fontWeight: Typography.weights.bold,
    color: CL.accent,
  },
  progressBar: {
    height: 4,
    backgroundColor: CL.cardBorder,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressDetail: {
    fontSize: Typography.sizes.micro,
    fontFamily: Typography.fonts.sansLight,
    color: CL.textTertiary,
    letterSpacing: Typography.letterSpacing.wider,
  },

  // Intention
  intentionSection: {
    marginBottom: Spacing.xxl,
    padding: Spacing.lg,
    backgroundColor: CL.cardBg,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: CL.cardBorder,
    borderLeftWidth: 2,
    borderLeftColor: CL.accent + '40',
  },
  intentionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  intentionLabel: {
    fontSize: Typography.sizes.micro,
    fontFamily: Typography.fonts.sansLight,
    color: CL.textTertiary,
    letterSpacing: Typography.letterSpacing.wider,
    textTransform: 'lowercase',
  },
  intentionText: {
    fontSize: Typography.sizes.body,
    fontFamily: Typography.fonts.serifRegular,
    fontStyle: 'italic',
    color: CL.textSecondary,
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
  sectionEmoji: {
    fontSize: 12,
    color: CL.accent,
  },
  sectionTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontFamily: Typography.fonts.serif,
    fontWeight: Typography.weights.semibold,
    color: CL.textPrimary,
    letterSpacing: Typography.letterSpacing.editorial,
  },
  sectionHint: {
    fontSize: Typography.sizes.micro,
    fontFamily: Typography.fonts.sansLight,
    color: CL.textTertiary,
    marginLeft: 'auto',
    letterSpacing: Typography.letterSpacing.wider,
    textTransform: 'lowercase',
  },

  // Input rows
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  inputField: {
    flex: 1,
    backgroundColor: CL.cardBg,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    paddingTop: Spacing.md,
    fontSize: Typography.sizes.body,
    fontFamily: Typography.fonts.sans,
    color: CL.textPrimary,
    borderWidth: 1,
    borderColor: CL.cardBorder,
    minHeight: 48,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },
  removeBtn: {
    padding: Spacing.sm,
    marginLeft: Spacing.sm,
    marginTop: Spacing.sm,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.md,
    paddingLeft: Spacing.sm,
  },
  addBtnText: {
    fontSize: Typography.sizes.body,
    fontFamily: Typography.fonts.sansMedium,
    color: CL.accent,
    letterSpacing: Typography.letterSpacing.wide,
  },

  // Footer
  footer: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: CL.divider,
    backgroundColor: CL.background,
    zIndex: 1,
  },
  saveButton: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  saveButtonText: {
    fontSize: Typography.sizes.body,
    fontFamily: Typography.fonts.sansMedium,
    color: '#FFFFFF',
    letterSpacing: Typography.letterSpacing.wide,
  },

  bottomSpacer: {
    height: Spacing.section,
  },

  // Resonance full-screen
  resonanceContainer: {
    flex: 1,
    backgroundColor: CL.background,
  },
  resonanceSafe: {
    flex: 1,
  },
  resonanceScrollContent: {
    paddingTop: Spacing.xxl,
  },
  resonanceHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
  },
  resonanceMoon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: CL.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  resonanceTitle: {
    fontSize: Typography.sizes.headline,
    fontFamily: Typography.fonts.serif,
    fontWeight: Typography.weights.bold,
    color: CL.textPrimary,
    letterSpacing: Typography.letterSpacing.editorial,
    marginBottom: Spacing.sm,
  },
  resonanceDate: {
    fontSize: Typography.sizes.caption,
    fontFamily: Typography.fonts.sansLight,
    color: CL.textTertiary,
    letterSpacing: Typography.letterSpacing.display,
    textTransform: 'uppercase',
  },

  // Recap
  recapSection: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  recapBlock: {
    marginBottom: Spacing.lg,
  },
  recapLabel: {
    fontSize: Typography.sizes.micro,
    fontFamily: Typography.fonts.sansMedium,
    color: CL.textTertiary,
    letterSpacing: Typography.letterSpacing.display,
    marginBottom: Spacing.sm,
  },
  recapItem: {
    fontSize: Typography.sizes.body,
    fontFamily: Typography.fonts.sansLight,
    color: CL.textSecondary,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
    marginBottom: Spacing.xs,
    paddingLeft: Spacing.md,
  },

  // Resonance close
  resonanceCloseRow: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  resonanceCloseBtn: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxl,
    borderRadius: Radius.pill,
    backgroundColor: CL.cardBg,
    borderWidth: 1,
    borderColor: CL.cardBorder,
  },
  resonanceCloseText: {
    fontSize: Typography.sizes.body,
    fontFamily: Typography.fonts.sansMedium,
    color: CL.textSecondary,
    letterSpacing: Typography.letterSpacing.wider,
  },

  // Completion
  completionContainer: {
    flex: 1,
    backgroundColor: CL.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  completionContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  completionMoon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: CL.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxl,
  },
  completionTitle: {
    fontSize: Typography.sizes.headline,
    fontFamily: Typography.fonts.serif,
    fontWeight: Typography.weights.bold,
    color: CL.textPrimary,
    letterSpacing: Typography.letterSpacing.editorial,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  completionSubtitle: {
    fontSize: Typography.sizes.body,
    fontFamily: Typography.fonts.sansLight,
    color: CL.textTertiary,
    textAlign: 'center',
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
    marginBottom: Spacing.xxxl,
  },
  completionButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xxxl,
    borderRadius: Radius.pill,
    backgroundColor: CL.cardBg,
    borderWidth: 1,
    borderColor: CL.cardBorder,
  },
  completionButtonText: {
    fontSize: Typography.sizes.body,
    fontFamily: Typography.fonts.sansMedium,
    color: CL.textSecondary,
    letterSpacing: Typography.letterSpacing.wider,
  },
});
