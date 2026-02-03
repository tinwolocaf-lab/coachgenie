import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { CoachIcon } from '@/components/ui/CoachIcon';
import { SAMPLE_COACHES } from '@/data/coaches';
import { Coach } from '@/types';
import {
  completeOnboarding,
  setSelectedCoach,
  getOnboardingState,
} from '@/store/onboarding';
import {
  installCoach,
  setActiveCoachId,
  saveContextVault,
} from '@/store/app';

export default function CoachSelectionScreen() {
  const router = useRouter();
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectCoach = (coachId: string) => {
    setSelectedCoachId(coachId);
  };

  const handleComplete = async () => {
    if (!selectedCoachId) return;

    setIsLoading(true);
    try {
      // Save selected coach
      await setSelectedCoach(selectedCoachId);

      // Install the coach
      await installCoach({
        id: Date.now().toString(),
        user_id: 'local-user',
        coach_id: selectedCoachId,
        is_active: true,
        installed_at: new Date().toISOString(),
      });

      // Set as active coach
      await setActiveCoachId(selectedCoachId);

      // Create context vault from onboarding data
      const onboardingState = await getOnboardingState();
      await saveContextVault({
        id: Date.now().toString(),
        user_id: 'local-user',
        values: onboardingState.values,
        goals: onboardingState.goals,
        constraints: onboardingState.constraints,
        preferences: onboardingState.preferences,
        updated_at: new Date().toISOString(),
      });

      // Complete onboarding
      await completeOnboarding();

      // Navigate to main app
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    setIsLoading(true);
    try {
      // Install default coach (Daily Clarity)
      const defaultCoachId = 'coach-daily-clarity';
      await installCoach({
        id: Date.now().toString(),
        user_id: 'local-user',
        coach_id: defaultCoachId,
        is_active: true,
        installed_at: new Date().toISOString(),
      });
      await setActiveCoachId(defaultCoachId);

      // Create context vault from onboarding data
      const onboardingState = await getOnboardingState();
      await saveContextVault({
        id: Date.now().toString(),
        user_id: 'local-user',
        values: onboardingState.values,
        goals: onboardingState.goals,
        constraints: onboardingState.constraints,
        preferences: onboardingState.preferences,
        updated_at: new Date().toISOString(),
      });

      await completeOnboarding();
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  // Show first 3 coaches for selection
  const displayedCoaches = SAMPLE_COACHES.slice(0, 3);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.duration(400)}>
          <Text style={styles.title}>You&apos;re all set!</Text>
          <Text style={styles.subtitle}>
            Your Context Vault is ready.{'\n'}Choose your first coach to begin.
          </Text>
        </Animated.View>

        <View style={styles.coachesList}>
          {displayedCoaches.map((coach, index) => (
            <Animated.View
              key={coach.id}
              entering={FadeIn.duration(400).delay(200 + index * 100)}
            >
              <CoachCard
                coach={coach}
                selected={selectedCoachId === coach.id}
                onSelect={() => handleSelectCoach(coach.id)}
              />
            </Animated.View>
          ))}
        </View>

        <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
          <Text style={styles.skipText}>Skip (use defaults)</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title="Back"
          onPress={handleBack}
          variant="ghost"
          style={styles.backButton}
        />
        <Button
          title="Choose"
          onPress={handleComplete}
          disabled={!selectedCoachId}
          loading={isLoading}
          style={styles.continueButton}
        />
      </View>
    </SafeAreaView>
  );
}

function CoachCard({
  coach,
  selected,
  onSelect,
}: {
  coach: Coach;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.coachCard, selected && styles.coachCardSelected]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={styles.coachHeader}>
        <CoachIcon iconName={coach.icon_name} color={coach.color} size="md" />
        <View style={styles.coachInfo}>
          <Text style={styles.coachName}>{coach.name}</Text>
          <Text style={styles.coachTagline}>{coach.tagline}</Text>
        </View>
      </View>
      <Button
        title="Choose"
        onPress={onSelect}
        variant={selected ? 'primary' : 'outline'}
        size="sm"
        fullWidth
        style={styles.chooseButton}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.offWhite,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.section,
    paddingBottom: Spacing.xl,
  },
  title: {
    fontSize: Typography.sizes.display,
    fontWeight: Typography.weights.bold,
    color: Colors.slateCharcoal,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.sizes.bodyLarge,
    color: Colors.slateGray,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xxl,
  },
  coachesList: {
    gap: Spacing.lg,
  },
  coachCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  coachCardSelected: {
    borderColor: Colors.electricIndigo,
    backgroundColor: Colors.electricIndigo + '08',
  },
  coachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  coachInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  coachName: {
    fontSize: Typography.sizes.subtitle,
    fontWeight: Typography.weights.semibold,
    color: Colors.slateCharcoal,
    marginBottom: Spacing.xs,
  },
  coachTagline: {
    fontSize: Typography.sizes.body,
    color: Colors.slateGray,
    lineHeight: 20,
  },
  chooseButton: {
    marginTop: Spacing.xs,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  skipText: {
    fontSize: Typography.sizes.body,
    color: Colors.slateLight,
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
