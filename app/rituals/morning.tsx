// Morning Intention - Premium Rebirth: The Opening
// An immersive, minimalist ritual that feels like opening a luxury journal
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withDelay,
  withSpring,
  interpolate,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import { Typography, Spacing, Radius, Timing, EditorialSpacing } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { InkText } from '@/components/ui/InkText';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  getDailyReflection,
  saveDailyReflection,
  getTodayDate,
  getGrowthChapters,
} from '@/lib/supabase-rituals';
import { getMorningPrompt, generateDailyMuse } from '@/lib/ai-rituals';
import { getContextVault } from '@/store/app';
import { DailyReflection, GrowthChapter, ContextVault } from '@/types';

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

// Phases of the Morning Intention ritual
type RitualPhase = 'opening' | 'intention' | 'muse' | 'complete';

export default function MorningIntentionScreen() {
  const router = useRouter();
  const { palette } = useThemeSafe();
  const useAuth = getAuthHook();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const auth = useAuth && isSupabaseConfigured ? useAuth() : null;

  const [phase, setPhase] = useState<RitualPhase>('opening');
  const [intention, setIntention] = useState('');
  const [dailyMuse, setDailyMuse] = useState('');
  const [prompt, setPrompt] = useState('');
  const [existingReflection, setExistingReflection] = useState<DailyReflection | null>(null);
  const [activeChapter, setActiveChapter] = useState<GrowthChapter | null>(null);
  const [userContext, setUserContext] = useState<ContextVault | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingMuse, setIsGeneratingMuse] = useState(false);

  const inputRef = useRef<TextInput>(null);

  // Animation values
  const openingOpacity = useSharedValue(0);
  const openingScale = useSharedValue(0.95);
  const intentionOpacity = useSharedValue(0);
  const museOpacity = useSharedValue(0);
  const completeOpacity = useSharedValue(0);
  const inputGlow = useSharedValue(0);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [auth?.user?.id]);

  const loadData = useCallback(async () => {
    if (!auth?.user?.id) return;

    try {
      const today = getTodayDate();
      const existing = await getDailyReflection(auth.user.id, today, 'morning');
      if (existing) {
        setExistingReflection(existing);
        setIntention(existing.response || '');
        setPhase('intention');
        intentionOpacity.value = 1;
      }

      const context = await getContextVault();
      setUserContext(context);

      const chapters = await getGrowthChapters(auth.user.id, 'active');
      const primary = chapters.find(c => c.is_primary) || chapters[0] || null;
      setActiveChapter(primary);

      if (!existing) {
        const generatedPrompt = getMorningPrompt(context, primary);
        setPrompt(generatedPrompt);
      }
    } catch (error) {
      console.error('Error loading morning data:', error);
      setPrompt('What intention will guide your actions today?');
    }
  }, [auth?.user?.id, intentionOpacity]);

  // Opening animation sequence
  useEffect(() => {
    if (phase === 'opening') {
      // Fade in the opening text
      openingOpacity.value = withDelay(
        400,
        withTiming(1, {
          duration: 1200,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        })
      );
      openingScale.value = withDelay(
        400,
        withTiming(1, {
          duration: 1500,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        })
      );

      // Subtle haptic on opening
      const timer1 = setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }, 600);

      // Transition to intention phase after opening
      const timer2 = setTimeout(() => {
        if (!existingReflection) {
          transitionToIntention();
        }
      }, 3500);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [phase, existingReflection]);

  const transitionToIntention = () => {
    // Fade out opening
    openingOpacity.value = withTiming(0, {
      duration: 600,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });

    setTimeout(() => {
      setPhase('intention');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Fade in intention phase
      intentionOpacity.value = withTiming(1, {
        duration: 800,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });

      // Auto-focus input after animation
      setTimeout(() => {
        inputRef.current?.focus();
      }, 900);
    }, 700);
  };

  const handleSetIntention = async () => {
    if (!intention.trim() || !auth?.user?.id) return;

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Save the intention
      const reflection = await saveDailyReflection(auth.user.id, {
        date: getTodayDate(),
        reflection_type: 'morning',
        prompt,
        response: intention.trim(),
        mood: undefined,
        energy_level: undefined,
      });

      if (reflection) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Generate the Daily Muse
        setIsGeneratingMuse(true);
        setPhase('muse');

        // Fade out intention
        intentionOpacity.value = withTiming(0, { duration: 500 });

        setTimeout(async () => {
          // Fade in muse phase
          museOpacity.value = withTiming(1, {
            duration: 800,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
          });

          // Generate AI Daily Muse
          const muse = await generateDailyMuse(intention.trim(), userContext, activeChapter);
          setDailyMuse(muse);
          setIsGeneratingMuse(false);

          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }, 600);
      }
    } catch (error) {
      console.error('Error saving morning intention:', error);
      setIsSaving(false);
    }
  };

  const handleComplete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Fade to complete
    museOpacity.value = withTiming(0, { duration: 400 });

    setTimeout(() => {
      setPhase('complete');
      completeOpacity.value = withTiming(1, {
        duration: 800,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Auto-close after confirmation
      setTimeout(() => {
        router.back();
      }, 2000);
    }, 500);
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  // Ink effect - glow when typing
  const handleInputFocus = () => {
    inputGlow.value = withSpring(1, Timing.springGentle);
  };

  const handleInputBlur = () => {
    inputGlow.value = withSpring(0, Timing.springGentle);
  };

  // Animated styles
  const openingStyle = useAnimatedStyle(() => ({
    opacity: openingOpacity.value,
    transform: [{ scale: openingScale.value }],
  }));

  const intentionStyle = useAnimatedStyle(() => ({
    opacity: intentionOpacity.value,
  }));

  const museStyle = useAnimatedStyle(() => ({
    opacity: museOpacity.value,
  }));

  const completeStyle = useAnimatedStyle(() => ({
    opacity: completeOpacity.value,
  }));

  const inputContainerStyle = useAnimatedStyle(() => ({
    borderColor: interpolate(
      inputGlow.value,
      [0, 1],
      [0, 1]
    ) > 0.5 ? palette.accent : palette.borderLight,
    shadowOpacity: interpolate(inputGlow.value, [0, 1], [0.05, 0.15]),
    shadowRadius: interpolate(inputGlow.value, [0, 1], [8, 24]),
    transform: [{ scale: interpolate(inputGlow.value, [0, 1], [1, 1.005]) }],
  }));

  // Get date for display
  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  // ========== RENDER PHASES ==========

  // Phase: Opening - "The day is yours."
  if (phase === 'opening') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleClose}
          activeOpacity={0.6}
        >
          <Ionicons name="close" size={22} color={palette.textTertiary} />
        </TouchableOpacity>

        <Animated.View style={[styles.openingContainer, openingStyle]}>
          <Text style={[styles.openingDate, { color: palette.textTertiary }]}>
            {dateString}
          </Text>
          <InkText
            text="The day is yours."
            style={[styles.openingText, { color: palette.textPrimary }]}
            delay={800}
            duration={1200}
            charByChar
          />
        </Animated.View>
      </SafeAreaView>
    );
  }

  // Phase: Intention - Single-focus input
  if (phase === 'intention') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <Animated.View style={[styles.intentionContainer, intentionStyle]}>
            {/* Minimal header */}
            <View style={styles.intentionHeader}>
              <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
                <Ionicons name="close" size={22} color={palette.textTertiary} />
              </TouchableOpacity>
              <Text style={[styles.intentionDateSmall, { color: palette.textTertiary }]}>
                {dateString}
              </Text>
              <View style={styles.closeBtnSpacer} />
            </View>

            {/* Chapter context if available */}
            {activeChapter && !existingReflection && (
              <View style={[styles.chapterPill, { backgroundColor: palette.accentMuted }]}>
                <Ionicons name="flag" size={12} color={palette.accent} />
                <Text style={[styles.chapterPillText, { color: palette.textSecondary }]}>
                  {activeChapter.title}
                </Text>
              </View>
            )}

            {/* The prompt - editorial serif */}
            <View style={styles.promptSection}>
              {!existingReflection && prompt ? (
                <InkText
                  text={prompt}
                  style={[styles.intentionPrompt, { color: palette.textPrimary }]}
                  delay={200}
                  duration={800}
                />
              ) : (
                <Text style={[styles.intentionPrompt, { color: palette.textPrimary }]}>
                  Your morning intention
                </Text>
              )}
            </View>

            {/* The Input - Single focus, ink effect */}
            <Animated.View style={[
              styles.intentionInputCard,
              {
                backgroundColor: palette.cardBg,
                shadowColor: palette.shadowColor,
              },
              inputContainerStyle,
            ]}>
              <TextInput
                ref={inputRef}
                style={[styles.intentionInput, {
                  color: palette.textPrimary,
                  fontFamily: Typography.fonts.serifRegular,
                }]}
                placeholder="What will guide you today..."
                placeholderTextColor={palette.textTertiary}
                value={intention}
                onChangeText={(text) => {
                  setIntention(text);
                  // Subtle haptic on each word boundary
                  if (text.endsWith(' ') || text.endsWith('.')) {
                    Haptics.selectionAsync();
                  }
                }}
                multiline
                textAlignVertical="top"
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                editable={!existingReflection}
              />
              {existingReflection && (
                <View style={[styles.savedBadge, { backgroundColor: palette.successLight }]}>
                  <Ionicons name="checkmark-circle" size={14} color={palette.success} />
                  <Text style={[styles.savedBadgeText, { color: palette.success }]}>
                    Set for today
                  </Text>
                </View>
              )}
            </Animated.View>

            {/* Gentle guidance */}
            {!existingReflection && !intention.trim() && (
              <InkText
                text="A few words are enough. The power is in the pause."
                style={[styles.guidanceText, { color: palette.textTertiary }]}
                delay={1200}
                duration={600}
              />
            )}

            {/* Set Intention Button */}
            {!existingReflection && (
              <View style={styles.intentionFooter}>
                <TouchableOpacity
                  style={[
                    styles.setIntentionBtn,
                    {
                      backgroundColor: intention.trim() ? palette.accent : palette.border,
                    },
                    intention.trim() ? styles.setIntentionBtnActive : null,
                  ]}
                  onPress={handleSetIntention}
                  disabled={!intention.trim() || isSaving}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.setIntentionBtnText, {
                    color: intention.trim() ? palette.textInverse : palette.textTertiary,
                  }]}>
                    {isSaving ? 'Setting...' : 'Set Intention'}
                  </Text>
                  {intention.trim() && !isSaving && (
                    <Ionicons name="arrow-forward" size={18} color={palette.textInverse} style={{ marginLeft: 8 }} />
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Back button if already saved */}
            {existingReflection && (
              <View style={styles.intentionFooter}>
                <TouchableOpacity
                  style={[styles.backBtn, { borderColor: palette.border }]}
                  onPress={handleClose}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-back" size={18} color={palette.textSecondary} />
                  <Text style={[styles.backBtnText, { color: palette.textSecondary }]}>
                    Return
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // Phase: Muse - Daily Muse AI coaching prompt appears
  if (phase === 'muse') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
        <Animated.View style={[styles.museContainer, museStyle]}>
          {/* Your intention echoed back */}
          <View style={styles.museIntentionEcho}>
            <Text style={[styles.museLabel, { color: palette.textTertiary }]}>
              YOUR INTENTION
            </Text>
            <Text style={[styles.museIntentionText, { color: palette.textPrimary }]}>
              {intention}
            </Text>
          </View>

          {/* Decorative divider */}
          <View style={[styles.museDivider, { backgroundColor: palette.accent }]} />

          {/* Daily Muse */}
          <View style={styles.museContent}>
            <Text style={[styles.museLabel, { color: palette.textTertiary }]}>
              DAILY MUSE
            </Text>
            {isGeneratingMuse ? (
              <View style={styles.museLoading}>
                <Text style={[styles.museLoadingText, { color: palette.textTertiary }]}>
                  ···
                </Text>
              </View>
            ) : (
              <InkText
                text={dailyMuse}
                style={[styles.museText, { color: palette.textPrimary }]}
                delay={300}
                duration={1200}
                charByChar={false}
                onComplete={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              />
            )}
          </View>

          {/* Continue button */}
          {!isGeneratingMuse && dailyMuse && (
            <Animated.View
              entering={FadeIn.duration(600).delay(1500)}
              style={styles.museFooter}
            >
              <TouchableOpacity
                style={[styles.museBtn, { backgroundColor: palette.accent }]}
                onPress={handleComplete}
                activeOpacity={0.85}
              >
                <Text style={[styles.museBtnText, { color: palette.textInverse }]}>
                  Begin Your Day
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </Animated.View>
      </SafeAreaView>
    );
  }

  // Phase: Complete - Confirmation
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      <Animated.View style={[styles.completeContainer, completeStyle]}>
        <View style={[styles.completeIcon, { backgroundColor: palette.accentMuted }]}>
          <Ionicons name="sunny" size={40} color={palette.accent} />
        </View>
        <InkText
          text="Intention set."
          style={[styles.completeTitle, { color: palette.textPrimary }]}
          delay={200}
          duration={800}
          charByChar
        />
        <InkText
          text="May your day unfold with purpose."
          style={[styles.completeSubtitle, { color: palette.textTertiary }]}
          delay={800}
          duration={600}
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },

  // ===== OPENING PHASE =====
  skipButton: {
    position: 'absolute',
    top: 60,
    right: EditorialSpacing.breathingMargin,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  openingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: EditorialSpacing.breathingMargin * 2,
  },
  openingDate: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.caption,
    letterSpacing: Typography.letterSpacing.wider,
    textTransform: 'uppercase',
    marginBottom: Spacing.xxl,
  },
  openingText: {
    fontFamily: Typography.fonts.serif,
    fontSize: Typography.sizes.hero,
    lineHeight: Typography.sizes.hero * Typography.lineHeights.snug,
    letterSpacing: Typography.letterSpacing.editorial,
    textAlign: 'center',
  },

  // ===== INTENTION PHASE =====
  intentionContainer: {
    flex: 1,
    paddingHorizontal: EditorialSpacing.breathingMargin,
  },
  intentionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    marginBottom: Spacing.xl,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnSpacer: {
    width: 40,
  },
  intentionDateSmall: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.caption,
    letterSpacing: Typography.letterSpacing.wider,
    textTransform: 'uppercase',
  },
  chapterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    gap: Spacing.sm,
    marginBottom: Spacing.xxl,
  },
  chapterPillText: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.medium,
  },
  promptSection: {
    marginBottom: EditorialSpacing.sectionGap,
  },
  intentionPrompt: {
    fontFamily: Typography.fonts.serifRegular,
    fontSize: Typography.sizes.title,
    lineHeight: Typography.sizes.title * Typography.lineHeights.relaxed,
    letterSpacing: Typography.letterSpacing.editorial,
    fontStyle: 'italic',
  },
  intentionInputCard: {
    borderRadius: Radius.xl,
    padding: EditorialSpacing.cardPadding,
    minHeight: 180,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
    marginBottom: Spacing.xxl,
  },
  intentionInput: {
    fontSize: Typography.sizes.bodyLarge,
    lineHeight: Typography.sizes.bodyLarge * Typography.lineHeights.editorial,
    minHeight: 140,
    letterSpacing: Typography.letterSpacing.normal,
  },
  savedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-end',
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    marginTop: Spacing.sm,
  },
  savedBadgeText: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.medium,
  },
  guidanceText: {
    fontFamily: Typography.fonts.sansLight,
    fontSize: Typography.sizes.body,
    textAlign: 'center',
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
    fontStyle: 'italic',
    paddingHorizontal: Spacing.xxl,
  },
  intentionFooter: {
    paddingVertical: Spacing.xl,
    paddingBottom: Spacing.section,
    marginTop: 'auto',
  },
  setIntentionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg + 2,
    borderRadius: Radius.pill,
  },
  setIntentionBtnActive: {
    shadowColor: '#C5A059',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 6,
  },
  setIntentionBtnText: {
    fontFamily: Typography.fonts.sansSemibold,
    fontSize: Typography.sizes.bodyLarge,
    letterSpacing: Typography.letterSpacing.wide,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  backBtnText: {
    fontFamily: Typography.fonts.sansMedium,
    fontSize: Typography.sizes.body,
  },

  // ===== MUSE PHASE =====
  museContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: EditorialSpacing.breathingMargin * 1.5,
  },
  museIntentionEcho: {
    marginBottom: EditorialSpacing.sectionGap,
  },
  museLabel: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.micro,
    letterSpacing: Typography.letterSpacing.display,
    textTransform: 'uppercase',
    marginBottom: Spacing.md,
  },
  museIntentionText: {
    fontFamily: Typography.fonts.sansLight,
    fontSize: Typography.sizes.body,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
    fontStyle: 'italic',
    opacity: 0.7,
  },
  museDivider: {
    width: 40,
    height: 2,
    borderRadius: 1,
    opacity: 0.4,
    marginBottom: EditorialSpacing.sectionGap,
  },
  museContent: {
    marginBottom: EditorialSpacing.sectionGap,
  },
  museLoading: {
    paddingVertical: Spacing.xxl,
  },
  museLoadingText: {
    fontFamily: Typography.fonts.serifRegular,
    fontSize: Typography.sizes.display,
    letterSpacing: Typography.letterSpacing.widest,
    textAlign: 'center',
  },
  museText: {
    fontFamily: Typography.fonts.serifRegular,
    fontSize: Typography.sizes.headline,
    lineHeight: Typography.sizes.headline * Typography.lineHeights.relaxed,
    letterSpacing: Typography.letterSpacing.editorial,
  },
  museFooter: {
    paddingTop: Spacing.xxl,
  },
  museBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg + 2,
    borderRadius: Radius.pill,
    shadowColor: '#C5A059',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 6,
  },
  museBtnText: {
    fontFamily: Typography.fonts.sansSemibold,
    fontSize: Typography.sizes.bodyLarge,
    letterSpacing: Typography.letterSpacing.wide,
  },

  // ===== COMPLETE PHASE =====
  completeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: EditorialSpacing.breathingMargin * 2,
  },
  completeIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xxxl,
    shadowColor: '#C5A059',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 6,
  },
  completeTitle: {
    fontFamily: Typography.fonts.serif,
    fontSize: Typography.sizes.display,
    letterSpacing: Typography.letterSpacing.editorial,
    marginBottom: Spacing.md,
  },
  completeSubtitle: {
    fontFamily: Typography.fonts.sansLight,
    fontSize: Typography.sizes.body,
    letterSpacing: Typography.letterSpacing.wide,
    fontStyle: 'italic',
  },
});
