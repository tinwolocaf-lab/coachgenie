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
import { Colors, Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Goal } from '@/types';
import { getOnboardingState, updateGoals } from '@/store/onboarding';

export default function GoalsScreen() {
  const router = useRouter();
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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View style={[styles.progressFill, { width: '40%' }]} />
        </View>
        <Text style={styles.progressText}>2 of 5</Text>
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
            <Text style={styles.question}>What do you aspire to?</Text>
            <Text style={styles.questionSubtitle}>
              Define your goals and mark one as your 30-day priority. This focuses your coaching sessions on what matters most.
            </Text>
          </Animated.View>

          {/* Input Section */}
          <Animated.View entering={FadeInUp.duration(600).delay(200)} style={styles.inputSection}>
            <View style={styles.inputContainer}>
              <View style={styles.inputIconContainer}>
                <Ionicons name="flag-outline" size={20} color={Colors.burnishedGold} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Add a goal..."
                placeholderTextColor={Colors.stoneGray}
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
                  colors={newGoalText.trim() ? [Colors.burnishedGold, Colors.goldLight] : [Colors.border, Colors.border]}
                  style={styles.addButtonGradient}
                >
                  <Ionicons name="add" size={24} color={newGoalText.trim() ? Colors.white : Colors.stoneGray} />
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
              <View style={styles.emptyIcon}>
                <Ionicons name="rocket-outline" size={32} color={Colors.stoneGray} />
              </View>
              <Text style={styles.emptyTitle}>Your aspirations await</Text>
              <Text style={styles.emptyText}>
                Add your goals above. They&apos;ll guide your coaching journey.
              </Text>
            </Animated.View>
          )}

          {/* Hint */}
          {goals.length > 0 && (
            <Animated.View entering={FadeIn.duration(400)} style={styles.hintContainer}>
              <View style={styles.hintIcon}>
                <Ionicons name="star" size={14} color={Colors.burnishedGold} />
              </View>
              <Text style={styles.hintText}>
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
        style={[styles.goalCard, isFocus && styles.goalCardFocus]}
        onPress={onSetFocus}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* Focus Star */}
        <TouchableOpacity onPress={onSetFocus} style={styles.starButton}>
          <View style={[styles.starContainer, isFocus && styles.starContainerFocus]}>
            <Ionicons
              name={isFocus ? 'star' : 'star-outline'}
              size={18}
              color={isFocus ? Colors.white : Colors.stoneGray}
            />
          </View>
        </TouchableOpacity>

        {/* Goal Content */}
        <View style={styles.goalContent}>
          <Text style={[styles.goalText, isFocus && styles.goalTextFocus]} numberOfLines={2}>
            {goal.title}
          </Text>
          {isFocus && (
            <View style={styles.focusBadge}>
              <Text style={styles.focusBadgeText}>30-Day Focus</Text>
            </View>
          )}
        </View>

        {/* Remove Button */}
        <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
          <Ionicons name="close" size={18} color={Colors.stoneGray} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.warmOatmeal,
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
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.burnishedGold,
    borderRadius: 2,
  },
  progressText: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
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
    color: Colors.midnightEmerald,
    fontFamily: Typography.fonts.serif,
    marginBottom: Spacing.md,
  },
  questionSubtitle: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },

  // Input Section
  inputSection: {
    marginBottom: Spacing.xl,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.squircle,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  inputIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: Typography.sizes.body,
    color: Colors.charcoal,
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
    backgroundColor: Colors.white,
    borderRadius: Radius.squircle,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadows.sm,
  },
  goalCardFocus: {
    borderColor: Colors.burnishedGold,
    backgroundColor: Colors.goldMuted,
  },
  starButton: {
    marginRight: Spacing.md,
  },
  starContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.warmOatmealDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starContainerFocus: {
    backgroundColor: Colors.burnishedGold,
  },
  goalContent: {
    flex: 1,
  },
  goalText: {
    fontSize: Typography.sizes.body,
    color: Colors.charcoal,
    fontFamily: Typography.fonts.serif,
    lineHeight: Typography.sizes.body * Typography.lineHeights.normal,
  },
  goalTextFocus: {
    fontWeight: Typography.weights.medium,
  },
  focusBadge: {
    backgroundColor: Colors.burnishedGold,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
  },
  focusBadgeText: {
    fontSize: Typography.sizes.micro,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wide,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.warmOatmealDark,
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
    backgroundColor: Colors.warmOatmealDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    color: Colors.charcoal,
    fontFamily: Typography.fonts.serif,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
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
    backgroundColor: Colors.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hintText: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
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
