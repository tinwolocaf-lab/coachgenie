import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { ProgressDots } from '@/components/ui/ProgressDots';
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
    setGoals((prev) => prev.filter((g) => g.id !== id));
    if (focusGoalId === id) {
      setFocusGoalId(goals[0]?.id || null);
    }
  };

  const setAsFocus = (id: string) => {
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
      <View style={styles.header}>
        <ProgressDots total={5} current={1} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.duration(400)}>
          <Text style={styles.title}>Set your goals</Text>
          <Text style={styles.subtitle}>
            What do you want to achieve? Add your goals and select one as your
            30-day focus. This helps your coach prioritize your sessions.
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.duration(400).delay(200)}
          style={styles.inputContainer}
        >
          <TextInput
            style={styles.input}
            placeholder="Enter a goal..."
            placeholderTextColor={Colors.slateLight}
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
            <Ionicons name="add" size={24} color={Colors.white} />
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.goalsList}>
          {goals.map((goal, index) => (
            <Animated.View
              key={goal.id}
              entering={FadeIn.duration(300).delay(index * 100)}
            >
              <GoalItem
                goal={goal}
                isFocus={goal.id === focusGoalId}
                onRemove={() => removeGoal(goal.id)}
                onSetFocus={() => setAsFocus(goal.id)}
              />
            </Animated.View>
          ))}
        </View>

        {goals.length > 0 && (
          <Text style={styles.hint}>
            Tap the star to set as 30-day focus
          </Text>
        )}
      </ScrollView>

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
          style={styles.continueButton}
        />
      </View>
    </SafeAreaView>
  );
}

function GoalItem({
  goal,
  isFocus,
  onRemove,
  onSetFocus,
}: {
  goal: Goal;
  isFocus: boolean;
  onRemove: () => void;
  onSetFocus: () => void;
}) {
  return (
    <View style={[styles.goalItem, isFocus && styles.goalItemFocus]}>
      <TouchableOpacity onPress={onSetFocus} style={styles.starButton}>
        <Ionicons
          name={isFocus ? 'star' : 'star-outline'}
          size={20}
          color={isFocus ? Colors.warning : Colors.slateLight}
        />
      </TouchableOpacity>
      <Text style={styles.goalText} numberOfLines={2}>
        {goal.title}
      </Text>
      <TouchableOpacity onPress={onRemove} style={styles.removeButton}>
        <Ionicons name="close-circle" size={22} color={Colors.slateLight} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.offWhite,
  },
  header: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xl,
  },
  title: {
    fontSize: Typography.sizes.display,
    fontWeight: Typography.weights.bold,
    color: Colors.slateCharcoal,
    marginBottom: Spacing.md,
  },
  subtitle: {
    fontSize: Typography.sizes.bodyLarge,
    color: Colors.slateGray,
    lineHeight: 24,
    marginBottom: Spacing.xxl,
  },
  inputContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    fontSize: Typography.sizes.bodyLarge,
    color: Colors.slateCharcoal,
  },
  addButton: {
    width: 48,
    height: 48,
    backgroundColor: Colors.electricIndigo,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    backgroundColor: Colors.border,
  },
  goalsList: {
    gap: Spacing.md,
  },
  goalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  goalItemFocus: {
    borderColor: Colors.warning,
    backgroundColor: Colors.warningLight + '30',
  },
  starButton: {
    padding: Spacing.xs,
    marginRight: Spacing.sm,
  },
  goalText: {
    flex: 1,
    fontSize: Typography.sizes.bodyLarge,
    color: Colors.slateCharcoal,
  },
  removeButton: {
    padding: Spacing.xs,
  },
  hint: {
    fontSize: Typography.sizes.caption,
    color: Colors.slateLight,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xl,
    gap: Spacing.md,
  },
  backButton: {
    flex: 0.4,
  },
  continueButton: {
    flex: 0.6,
  },
});
