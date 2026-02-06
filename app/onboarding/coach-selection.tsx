import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInUp,
  FadeIn,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCoachId(coachId);
  };

  const handleComplete = async () => {
    if (!selectedCoachId) return;

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

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

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

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
      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View style={[styles.progressFill, { width: '80%' }]} />
        </View>
        <Text style={styles.progressText}>4 of 5</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Completion Badge */}
        <Animated.View entering={FadeInUp.duration(600)} style={styles.completionBadge}>
          <LinearGradient
            colors={[Colors.burnishedGold, Colors.goldLight]}
            style={styles.badgeGradient}
          >
            <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
            <Text style={styles.badgeText}>Profile Complete</Text>
          </LinearGradient>
        </Animated.View>

        {/* Header */}
        <Animated.View entering={FadeInUp.duration(600).delay(100)} style={styles.headerSection}>
          <Text style={styles.title}>Choose your guide</Text>
          <Text style={styles.subtitle}>
            Your Context Vault is ready. Select a coach to begin your personalized journey.
          </Text>
        </Animated.View>

        {/* Coach Cards */}
        <View style={styles.coachesList}>
          {displayedCoaches.map((coach, index) => (
            <Animated.View
              key={coach.id}
              entering={FadeIn.duration(500).delay(300 + index * 150)}
            >
              <PremiumCoachCard
                coach={coach}
                selected={selectedCoachId === coach.id}
                onSelect={() => handleSelectCoach(coach.id)}
              />
            </Animated.View>
          ))}
        </View>

        {/* Skip Option */}
        <Animated.View entering={FadeIn.duration(400).delay(800)}>
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Continue with default coach</Text>
            <Ionicons name="arrow-forward" size={16} color={Colors.stoneGray} />
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Footer */}
      <Animated.View entering={FadeInUp.duration(400).delay(600)} style={styles.footer}>
        <Button
          title="Back"
          onPress={handleBack}
          variant="ghost"
          style={styles.backButton}
        />
        <Button
          title="Begin Journey"
          onPress={handleComplete}
          disabled={!selectedCoachId}
          loading={isLoading}
          variant="gold"
          style={styles.continueButton}
        />
      </Animated.View>
    </SafeAreaView>
  );
}

function PremiumCoachCard({
  coach,
  selected,
  onSelect,
}: {
  coach: Coach;
  selected: boolean;
  onSelect: () => void;
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
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={[styles.coachCard, selected && styles.coachCardSelected]}
        onPress={onSelect}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {selected ? (
          <LinearGradient
            colors={[coach.color, `${coach.color}DD`]}
            style={styles.selectedCardGradient}
          >
            {/* Selection Badge */}
            <View style={styles.selectionBadge}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
              <Text style={styles.selectionBadgeText}>Selected</Text>
            </View>

            {/* Coach Info */}
            <View style={styles.selectedCoachContent}>
              <CoachIcon
                iconName={coach.icon_name}
                color={Colors.white}
                size="xl"
                variant="solid"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              />
              <Text style={styles.selectedCoachName}>{coach.name}</Text>
              <Text style={styles.selectedCoachTagline}>{coach.tagline}</Text>
            </View>

            {/* Method */}
            <View style={styles.selectedMethodSection}>
              <View style={styles.methodDivider} />
              <Text style={styles.selectedMethodText}>{coach.method}</Text>
            </View>
          </LinearGradient>
        ) : (
          <View style={styles.cardContent}>
            {/* Coach Header */}
            <View style={styles.coachHeader}>
              <CoachIcon
                iconName={coach.icon_name}
                color={coach.color}
                size="lg"
                variant="default"
              />
              <View style={styles.coachInfo}>
                <Text style={styles.coachName}>{coach.name}</Text>
                <Text style={styles.coachTagline}>{coach.tagline}</Text>
              </View>
            </View>

            {/* Method Preview */}
            <View style={styles.methodSection}>
              <View style={[styles.methodAccent, { backgroundColor: coach.color }]} />
              <Text style={styles.methodText} numberOfLines={2}>
                {coach.method}
              </Text>
            </View>

            {/* Select Button */}
            <TouchableOpacity style={styles.selectButton} onPress={onSelect}>
              <Text style={[styles.selectButtonText, { color: coach.color }]}>
                Select Coach
              </Text>
              <Ionicons name="arrow-forward" size={16} color={coach.color} />
            </TouchableOpacity>
          </View>
        )}
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

  // Completion Badge
  completionBadge: {
    alignSelf: 'flex-start',
    marginBottom: Spacing.lg,
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  badgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  badgeText: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wide,
  },

  // Header
  headerSection: {
    marginBottom: Spacing.xxl,
  },
  title: {
    fontSize: Typography.sizes.display,
    fontWeight: Typography.weights.light,
    color: Colors.midnightEmerald,
    fontFamily: Typography.fonts.serif,
    marginBottom: Spacing.md,
  },
  subtitle: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },

  // Coach Cards
  coachesList: {
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  coachCard: {
    borderRadius: Radius.squircle,
    overflow: 'hidden',
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadows.md,
  },
  coachCardSelected: {
    borderColor: Colors.burnishedGold,
    ...Shadows.gold,
  },
  cardContent: {
    padding: Spacing.xl,
  },

  // Selected Card
  selectedCardGradient: {
    padding: Spacing.xl,
  },
  selectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  selectionBadgeText: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
  },
  selectedCoachContent: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  selectedCoachName: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
    fontFamily: Typography.fonts.serif,
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  selectedCoachTagline: {
    fontSize: Typography.sizes.body,
    color: 'rgba(255,255,255,0.85)',
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  selectedMethodSection: {
    alignItems: 'center',
  },
  methodDivider: {
    width: 40,
    height: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginBottom: Spacing.md,
  },
  selectedMethodText: {
    fontSize: Typography.sizes.body,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Unselected Card
  coachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  coachInfo: {
    flex: 1,
    marginLeft: Spacing.lg,
  },
  coachName: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    color: Colors.midnightEmerald,
    fontFamily: Typography.fonts.serif,
  },
  coachTagline: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
    marginTop: Spacing.xs,
  },
  methodSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.warmOatmealDark,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  methodAccent: {
    width: 3,
    height: '100%',
    minHeight: 32,
    borderRadius: 2,
    marginRight: Spacing.md,
  },
  methodText: {
    flex: 1,
    fontSize: Typography.sizes.body,
    color: Colors.slate,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  selectButtonText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
  },

  // Skip Button
  skipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  skipText: {
    fontSize: Typography.sizes.body,
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
