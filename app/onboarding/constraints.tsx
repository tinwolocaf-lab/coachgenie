import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { ProgressDots } from '@/components/ui/ProgressDots';
import { Constraints } from '@/types';
import { getOnboardingState, updateConstraints } from '@/store/onboarding';

const TIME_OPTIONS = [
  { value: 1, label: '1 hour' },
  { value: 2, label: '2 hours' },
  { value: 4, label: '4 hours' },
  { value: 6, label: '6+ hours' },
];

const ENERGY_OPTIONS = [
  { value: 'low' as const, label: 'Low', icon: 'battery-dead' as const, description: 'Limited energy, need gentle pacing' },
  { value: 'medium' as const, label: 'Medium', icon: 'battery-half' as const, description: 'Steady energy throughout the day' },
  { value: 'high' as const, label: 'High', icon: 'battery-full' as const, description: 'High energy, ready for intensity' },
];

const FOCUS_TIME_OPTIONS = [
  { value: 'morning' as const, label: 'Morning', icon: 'sunny-outline' as const },
  { value: 'afternoon' as const, label: 'Afternoon', icon: 'partly-sunny-outline' as const },
  { value: 'evening' as const, label: 'Evening', icon: 'moon-outline' as const },
];

export default function ConstraintsScreen() {
  const router = useRouter();
  const [constraints, setConstraints] = useState<Constraints>({
    available_hours_per_day: 4,
    energy_level: 'medium',
    best_time_for_focus: 'morning',
  });

  useEffect(() => {
    loadState();
  }, []);

  const loadState = async () => {
    const state = await getOnboardingState();
    setConstraints(state.constraints);
  };

  const handleContinue = async () => {
    await updateConstraints(constraints);
    router.push('/onboarding/preferences');
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <ProgressDots total={5} current={2} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.duration(400)}>
          <Text style={styles.title}>Your constraints</Text>
          <Text style={styles.subtitle}>
            Help your coaches understand your time and energy limitations so
            they can give realistic, achievable advice.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(400).delay(200)}>
          <Text style={styles.sectionTitle}>Daily focus time available</Text>
          <View style={styles.optionsRow}>
            {TIME_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.timeOption,
                  constraints.available_hours_per_day === option.value &&
                    styles.timeOptionSelected,
                ]}
                onPress={() =>
                  setConstraints((prev) => ({
                    ...prev,
                    available_hours_per_day: option.value,
                  }))
                }
              >
                <Text
                  style={[
                    styles.timeOptionText,
                    constraints.available_hours_per_day === option.value &&
                      styles.timeOptionTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(400).delay(300)}>
          <Text style={styles.sectionTitle}>Current energy level</Text>
          <View style={styles.energyOptions}>
            {ENERGY_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.energyOption,
                  constraints.energy_level === option.value &&
                    styles.energyOptionSelected,
                ]}
                onPress={() =>
                  setConstraints((prev) => ({
                    ...prev,
                    energy_level: option.value,
                  }))
                }
              >
                <Ionicons
                  name={option.icon}
                  size={24}
                  color={
                    constraints.energy_level === option.value
                      ? Colors.electricIndigo
                      : Colors.slateGray
                  }
                />
                <Text
                  style={[
                    styles.energyLabel,
                    constraints.energy_level === option.value &&
                      styles.energyLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
                <Text style={styles.energyDescription}>{option.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(400).delay(400)}>
          <Text style={styles.sectionTitle}>Best time for deep focus</Text>
          <View style={styles.optionsRow}>
            {FOCUS_TIME_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.focusTimeOption,
                  constraints.best_time_for_focus === option.value &&
                    styles.focusTimeOptionSelected,
                ]}
                onPress={() =>
                  setConstraints((prev) => ({
                    ...prev,
                    best_time_for_focus: option.value,
                  }))
                }
              >
                <Ionicons
                  name={option.icon}
                  size={24}
                  color={
                    constraints.best_time_for_focus === option.value
                      ? Colors.electricIndigo
                      : Colors.slateGray
                  }
                />
                <Text
                  style={[
                    styles.focusTimeText,
                    constraints.best_time_for_focus === option.value &&
                      styles.focusTimeTextSelected,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
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
          style={styles.continueButton}
        />
      </View>
    </SafeAreaView>
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
  sectionTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    color: Colors.slateCharcoal,
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  timeOption: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  timeOptionSelected: {
    backgroundColor: Colors.electricIndigo,
    borderColor: Colors.electricIndigo,
  },
  timeOptionText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.slateCharcoal,
  },
  timeOptionTextSelected: {
    color: Colors.white,
  },
  energyOptions: {
    gap: Spacing.sm,
  },
  energyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  energyOptionSelected: {
    borderColor: Colors.electricIndigo,
    backgroundColor: Colors.electricIndigo + '08',
  },
  energyLabel: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    color: Colors.slateCharcoal,
    marginLeft: Spacing.md,
    minWidth: 70,
  },
  energyLabelSelected: {
    color: Colors.electricIndigo,
  },
  energyDescription: {
    flex: 1,
    fontSize: Typography.sizes.body,
    color: Colors.slateGray,
    marginLeft: Spacing.sm,
  },
  focusTimeOption: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  focusTimeOptionSelected: {
    borderColor: Colors.electricIndigo,
    backgroundColor: Colors.electricIndigo + '08',
  },
  focusTimeText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.slateCharcoal,
    marginTop: Spacing.sm,
  },
  focusTimeTextSelected: {
    color: Colors.electricIndigo,
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
