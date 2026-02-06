// Morning Intention Screen - Phase 5: The Practice
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
import { useAuthSafe } from '@/hooks/useConditionalAuth';
import {
  getDailyReflection,
  saveDailyReflection,
  getTodayDate,
  getGrowthChapters,
} from '@/lib/supabase-rituals';
import { getMorningPrompt } from '@/lib/ritualPrompts';
import { getContextVault } from '@/store/app';
import { DailyReflection, GrowthChapter } from '@/types';

export default function MorningIntentionScreen() {
  const router = useRouter();
  const auth = useAuthSafe();

  const [prompt, setPrompt] = useState<string>('');
  const [response, setResponse] = useState<string>('');
  const [existingReflection, setExistingReflection] = useState<DailyReflection | null>(null);
  const [activeChapter, setActiveChapter] = useState<GrowthChapter | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const inputScale = useSharedValue(1);

  const loadData = useCallback(async () => {
    if (!auth?.user?.id) return;

    try {
      // Load existing reflection
      const today = getTodayDate();
      const existing = await getDailyReflection(auth.user.id, today, 'morning');
      if (existing) {
        setExistingReflection(existing);
        setPrompt(existing.prompt || '');
        setResponse(existing.response || '');
      }

      // Load context for personalized prompt
      const context = await getContextVault();

      // Load active chapter
      const chapters = await getGrowthChapters(auth.user.id, 'active');
      const primary = chapters.find(c => c.is_primary) || chapters[0] || null;
      setActiveChapter(primary);

      // Generate prompt if no existing reflection
      if (!existing) {
        const generatedPrompt = getMorningPrompt(context, primary);
        setPrompt(generatedPrompt);
      }
    } catch (error) {
      console.error('Error loading morning data:', error);
      setPrompt('What intention will guide your actions today?');
    }
  }, [auth?.user?.id]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSave = async () => {
    if (!auth?.user?.id || !response.trim()) return;

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const reflection = await saveDailyReflection(auth.user.id, {
        date: getTodayDate(),
        reflection_type: 'morning',
        prompt,
        response: response.trim(),
        mood: undefined,
        energy_level: undefined,
      });

      if (reflection) {
        setShowConfirmation(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Auto-close after showing confirmation
        setTimeout(() => {
          router.back();
        }, 1500);
      }
    } catch (error) {
      console.error('Error saving morning intention:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleInputFocus = () => {
    inputScale.value = withSpring(1.01, Timing.springGentle);
  };

  const handleInputBlur = () => {
    inputScale.value = withSpring(1, Timing.springGentle);
  };

  const inputStyle = useAnimatedStyle(() => ({
    transform: [{ scale: inputScale.value }],
  }));

  // Get current date for display
  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  // Get greeting based on time
  const hour = today.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (showConfirmation) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Animated.View
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
          style={styles.confirmationContainer}
        >
          <LinearGradient
            colors={[Colors.goldMuted, Colors.warmOatmeal]}
            style={styles.confirmationGradient}
          >
            <Animated.View
              entering={FadeInUp.duration(400).delay(100)}
              style={styles.confirmationContent}
            >
              <View style={styles.confirmationIcon}>
                <Ionicons name="sunny" size={48} color={Colors.burnishedGold} />
              </View>
              <Text style={styles.confirmationTitle}>Intention Set</Text>
              <Text style={styles.confirmationSubtitle}>
                May your day unfold with purpose
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
        <Animated.View
          entering={FadeIn.duration(400)}
          style={styles.header}
        >
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Ionicons name="close" size={24} color={Colors.charcoal} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.sunIcon}>
              <Ionicons name="sunny" size={20} color={Colors.burnishedGold} />
            </View>
            <Text style={styles.headerTitle}>Morning Intention</Text>
          </View>
          <View style={styles.headerRight} />
        </Animated.View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Greeting */}
          <Animated.View
            entering={FadeInUp.duration(400).delay(100)}
            style={styles.greetingSection}
          >
            <Text style={styles.dateText}>{dateString}</Text>
            <Text style={styles.greetingText}>{greeting}</Text>
          </Animated.View>

          {/* Active Chapter Context */}
          {activeChapter && (
            <Animated.View
              entering={FadeInUp.duration(400).delay(200)}
              style={styles.chapterContext}
            >
              <Ionicons name="flag" size={14} color={Colors.burnishedGold} />
              <Text style={styles.chapterText}>
                Current chapter: {activeChapter.title}
              </Text>
            </Animated.View>
          )}

          {/* Prompt Card */}
          <Animated.View
            entering={FadeInUp.duration(500).delay(300)}
            style={styles.promptCard}
          >
            <View style={styles.promptQuote}>
              <Ionicons name="chatbubble-outline" size={16} color={Colors.stoneGray} />
            </View>
            <Text style={styles.promptText}>{prompt}</Text>
          </Animated.View>

          {/* Response Input */}
          <Animated.View
            entering={FadeInUp.duration(500).delay(400)}
            style={[styles.inputCard, inputStyle]}
          >
            <TextInput
              style={styles.input}
              placeholder="Write your intention..."
              placeholderTextColor={Colors.stoneGray}
              value={response}
              onChangeText={setResponse}
              multiline
              textAlignVertical="top"
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              editable={!existingReflection}
            />
            {existingReflection && (
              <View style={styles.editedBadge}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                <Text style={styles.editedText}>Saved today</Text>
              </View>
            )}
          </Animated.View>

          {/* Tips */}
          {!existingReflection && (
            <Animated.View
              entering={FadeInUp.duration(500).delay(500)}
              style={styles.tipsSection}
            >
              <Text style={styles.tipsTitle}>A few words are enough</Text>
              <Text style={styles.tipsText}>
                The power is in the pause—in taking a moment to choose your focus.
              </Text>
            </Animated.View>
          )}
        </ScrollView>

        {/* Save Button */}
        {!existingReflection && (
          <Animated.View
            entering={FadeInUp.duration(400).delay(500)}
            style={styles.footer}
          >
            <Button
              title={isSaving ? 'Saving...' : 'Set Intention'}
              onPress={handleSave}
              variant="gold"
              fullWidth
              size="lg"
              disabled={!response.trim() || isSaving}
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
  sunIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.goldMuted,
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
    paddingBottom: Spacing.section,
  },
  greetingSection: {
    marginBottom: Spacing.xxl,
  },
  dateText: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
    letterSpacing: Typography.letterSpacing.wide,
    marginBottom: Spacing.xs,
  },
  greetingText: {
    fontSize: Typography.sizes.display,
    fontWeight: Typography.weights.light,
    fontFamily: Typography.fonts.serif,
    color: Colors.midnightEmerald,
    letterSpacing: Typography.letterSpacing.tight,
  },
  chapterContext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xxl,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.goldMuted,
    borderRadius: Radius.md,
    alignSelf: 'flex-start',
  },
  chapterText: {
    fontSize: Typography.sizes.caption,
    color: Colors.charcoal,
    fontWeight: Typography.weights.medium,
  },
  promptCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.squircle,
    padding: Spacing.xxl,
    marginBottom: Spacing.xxl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  promptQuote: {
    marginBottom: Spacing.md,
  },
  promptText: {
    fontSize: Typography.sizes.title,
    fontFamily: Typography.fonts.serif,
    fontStyle: 'italic',
    color: Colors.midnightEmerald,
    lineHeight: Typography.sizes.title * Typography.lineHeights.relaxed,
  },
  inputCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.squircle,
    padding: Spacing.xl,
    marginBottom: Spacing.xxl,
    borderWidth: 1,
    borderColor: Colors.borderGold,
    minHeight: 160,
    ...Shadows.md,
  },
  input: {
    fontSize: Typography.sizes.bodyLarge,
    color: Colors.charcoal,
    lineHeight: Typography.sizes.bodyLarge * Typography.lineHeights.relaxed,
    minHeight: 120,
  },
  editedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.md,
  },
  editedText: {
    fontSize: Typography.sizes.caption,
    color: Colors.success,
    fontWeight: Typography.weights.medium,
  },
  tipsSection: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  tipsTitle: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.charcoal,
    marginBottom: Spacing.xs,
  },
  tipsText: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
    textAlign: 'center',
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },
  footer: {
    padding: Spacing.xxl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    backgroundColor: Colors.warmOatmeal,
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
  },
  confirmationIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    ...Shadows.gold,
  },
  confirmationTitle: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    color: Colors.midnightEmerald,
    marginBottom: Spacing.sm,
  },
  confirmationSubtitle: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
    fontStyle: 'italic',
  },
});
