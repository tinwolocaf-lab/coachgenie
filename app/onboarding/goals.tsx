import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInUp,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  Layout,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { Goal } from '@/types';
import { getOnboardingState, updateGoals } from '@/store/onboarding';

export default function GoalsScreen() {
  const router = useRouter();
  const { palette } = useThemeSafe();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoalText, setNewGoalText] = useState('');
  const [focusGoalId, setFocusGoalId] = useState<string | null>(null);

  useEffect(() => {
    loadState();
  }, []);

  const loadState = async () => {
    const state = await getOnboardingState();
    if (state.goals.length > 0) {
      setGoals(state.goals);
      const focus = state.goals.find((g) => g.is_30_day_focus);
      if (focus) setFocusGoalId(focus.id);
    }
  };

  const addGoal = () => {
    if (!newGoalText.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newGoal: Goal = {
      id: Date.now().toString(),
      title: newGoalText.trim(),
      is_30_day_focus: goals.length === 0,
    };

    setGoals((prev) => [...prev, newGoal]);
    if (goals.length === 0) {
      setFocusGoalId(newGoal.id);
    }
    setNewGoalText('');
  };

  const removeGoal = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGoals((prev) => prev.filter((g) => g.id !== id));
    if (focusGoalId === id) {
      const remaining = goals.filter((g) => g.id !== id);
      setFocusGoalId(remaining[0]?.id || null);
    }
  };

  const setAsFocus = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFocusGoalId(id);
    setGoals((prev) =>
      prev.map((g) => ({
        ...g,
        is_30_day_focus: g.id === id,
      }))
    );
  };

  const handleContinue = async () => {
    const updatedGoals = goals.map((g) => ({
      ...g,
      is_30_day_focus: g.id === focusGoalId,
    }));
    await updateGoals(updatedGoals);
    router.push('/onboarding/constraints');
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { backgroundColor: palette.border }]}>
          <Animated.View style={[styles.progressFill, { width: '40%', backgroundColor: palette.accent }]} />
        </View>
        <Text style={[styles.progressText, { color: palette.textTertiary }]}>2 of 5</Text>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Question Header */}
          <Animated.View entering={FadeInUp.duration(800)} style={styles.questionContainer}>
            <Text style={[styles.question, { color: palette.textPrimary }]}>What do you aspire to?</Text>
            <Text style={[styles.questionSubtitle, { color: palette.textTertiary }]}>
              Define your goals and mark one as your 30-day priority. This focuses your coaching sessions on what matters most.
            </Text>
          </Animated.View>

          {/* Input Section */}
          <Animated.View entering={FadeInUp.duration(600).delay(200)} style={styles.inputSection}>
            <View style={[styles.inputContainer, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
              <View style={[styles.inputIconContainer, { backgroundColor: palette.accentMuted }]}>
                <Ionicons name="flag-outline" size={20} color={palette.accent} />
              </View>
              <TextInput
                style={[styles.input, { color: palette.textSecondary }]}
                placeholder="Add a goal..."
                placeholderTextColor={palette.textTertiary}
                value={newGoalText}
                onChangeText={setNewGoalText}
                onSubmitEditing={addGoal}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[styles.addButton, !newGoalText.trim() && styles.addButtonDisabled]}
                onPress={addGoal}
                disabled={!newGoalText.trim()}
              >
                <LinearGradient
                  colors={newGoalText.trim() ? [palette.accent, palette.accentLight] : [palette.border, palette.border]}
                  style={styles.addButtonGradient}
                >
                  <Ionicons name="add" size={24} color={newGoalText.trim() ? palette.textInverse : palette.textTertiary} />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Goals List */}
          <View style={styles.goalsList}>
            {goals.map((goal, index) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                isFocus={goal.id === focusGoalId}
                onRemove={() => removeGoal(goal.id)}
                onSetFocus={() => setAsFocus(goal.id)}
                index={index}
              />
            ))}
          </View>

          {/* Empty State */}
          {goals.length === 0 && (
            <Animated.View entering={FadeIn.duration(400).delay(400)} style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: palette.backgroundSecondary }]}>
                <Ionicons name="rocket-outline" size={32} color={palette.textTertiary} />
              </View>
              <Text style={[styles.emptyTitle, { color: palette.textSecondary }]}>Your aspirations await</Text>
              <Text style={[styles.emptyText, { color: palette.textTertiary }]}>
                Add your goals above. They&apos;ll guide your coaching journey.
              </Text>
            </Animated.View>
          )}

          {/* Hint */}
          {goals.length > 0 && (
            <Animated.View entering={FadeIn.duration(400)} style={styles.hintContainer}>
              <View style={[styles.hintIcon, { backgroundColor: palette.accentMuted }]}>
                <Ionicons name="star" size={14} color={palette.accent} />
              </View>
              <Text style={[styles.hintText, { color: palette.textTertiary }]}>
                Tap the star to set your 30-day priority focus
              </Text>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View style={styles.footer}>
        <Button
          title="Back"
          onPress={handleBack}
          variant="ghost"
          style={styles.backButton}
        />
        <Button
          title="Continue"
          onPress={handleContinue}
          disabled={goals.length === 0}
          variant="primary"
          style={styles.continueButton}
        />
      </View>
    </SafeAreaView>
  );
}

function GoalCard({
  goal,
  isFocus,
  onRemove,
  onSetFocus,
  index,
}: {
  goal: Goal;
  isFocus: boolean;
  onRemove: () => void;
  onSetFocus: () => void;
  index: number;
}) {
  const { palette } = useThemeSafe();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, Timing.springGentle);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, Timing.springGentle);
  };

  return (
    <Animated.View
      entering={FadeInUp.duration(400).delay(index * 100)}
      exiting={FadeOut.duration(200)}
      layout={Layout.springify()}
      style={animatedStyle}
    >
      <TouchableOpacity
        style={[
          styles.goalCard,
          { backgroundColor: palette.cardBg },
          isFocus && { borderColor: palette.accent, backgroundColor: palette.accentMuted },
        ]}
        onPress={onSetFocus}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* Focus Star */}
        <TouchableOpacity onPress={onSetFocus} style={styles.starButton}>
          <View style={[styles.starContainer, { backgroundColor: palette.backgroundSecondary }, isFocus && { backgroundColor: palette.accent }]}>
            <Ionicons
              name={isFocus ? 'star' : 'star-outline'}
              size={18}
              color={isFocus ? palette.textInverse : palette.textTertiary}
            />
          </View>
        </TouchableOpacity>

        {/* Goal Content */}
        <View style={styles.goalContent}>
          <Text style={[styles.goalText, { color: palette.textSecondary }, isFocus && styles.goalTextFocus]} numberOfLines={2}>
            {goal.title}
          </Text>
          {isFocus && (
            <View style={[styles.focusBadge, { backgroundColor: palette.accent }]}>
              <Text style={[styles.focusBadgeText, { color: palette.textInverse }]}>30-Day Focus</Text>
            </View>
          )}
        </View>

        {/* Remove Button */}
        <TouchableOpacity onPress={onRemove} style={[styles.removeButton, { backgroundColor: palette.backgroundSecondary }]}>
          <Ionicons name="close" size={18} color={palette.textTertiary} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Progress
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.medium,
  },

  // Content
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xxl,
  },

  // Question
  questionContainer: {
    marginBottom: Spacing.xxl,
  },
  question: {
    fontSize: Typography.sizes.display,
    fontWeight: Typography.weights.light,
    fontFamily: Typography.fonts.serif,
    marginBottom: Spacing.md,
  },
  questionSubtitle: {
    fontSize: Typography.sizes.body,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },

  // Input Section
  inputSection: {
    marginBottom: Spacing.xl,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.squircle,
    padding: Spacing.sm,
    borderWidth: 1,
    ...Shadows.sm,
  },
  inputIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: Typography.sizes.body,
    paddingVertical: Spacing.md,
  },
  addButton: {
    marginLeft: Spacing.sm,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonGradient: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Goals List
  goalsList: {
    gap: Spacing.md,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.squircle,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadows.sm,
  },
  starButton: {
    marginRight: Spacing.md,
  },
  starContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalContent: {
    flex: 1,
  },
  goalText: {
    fontSize: Typography.sizes.body,
    fontFamily: Typography.fonts.serif,
    lineHeight: Typography.sizes.body * Typography.lineHeights.normal,
  },
  goalTextFocus: {
    fontWeight: Typography.weights.medium,
  },
  focusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
  },
  focusBadgeText: {
    fontSize: Typography.sizes.micro,
    fontWeight: Typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wide,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.sizes.body,
    textAlign: 'center',
  },

  // Hint
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  hintIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintText: {
    fontSize: Typography.sizes.caption,
  },

  // Footer
  footer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  backButton: {
    flex: 0.35,
  },
  continueButton: {
    flex: 0.65,
  },
});
