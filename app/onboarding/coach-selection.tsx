import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
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
import { Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { CoachIcon } from '@/components/ui/CoachIcon';
import { SAMPLE_COACHES } from '@/data/coaches';
import { Coach } from '@/types';
import {
  setSelectedCoach,
} from '@/store/onboarding';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CoachSelectionScreen() {
  const router = useRouter();
  const { palette } = useThemeSafe();
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
      await setSelectedCoach(selectedCoachId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push('/onboarding/trial');
    } catch (error) {
      console.error('Error completing onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    setIsLoading(true);
    try {
      const defaultCoachId = 'coach-daily-clarity';
      await setSelectedCoach(defaultCoachId);
      router.push('/onboarding/trial');
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
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { backgroundColor: palette.border }]}>
          <Animated.View style={[styles.progressFill, { width: '80%', backgroundColor: palette.accent }]} />
        </View>
        <Text style={[styles.progressText, { color: palette.textTertiary }]}>4 of 5</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Completion Badge */}
        <Animated.View entering={FadeInUp.duration(600)} style={styles.completionBadge}>
          <LinearGradient
            colors={[palette.accent, palette.accentLight]}
            style={styles.badgeGradient}
          >
            <Ionicons name="checkmark-circle" size={20} color={palette.textInverse} />
            <Text style={[styles.badgeText, { color: palette.textInverse }]}>Profile Complete</Text>
          </LinearGradient>
        </Animated.View>

        {/* Header */}
        <Animated.View entering={FadeInUp.duration(600).delay(100)} style={styles.headerSection}>
          <Text style={[styles.title, { color: palette.textPrimary }]}>Choose your guide</Text>
          <Text style={[styles.subtitle, { color: palette.textTertiary }]}>
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
            <Text style={[styles.skipText, { color: palette.textTertiary }]}>Continue with default coach</Text>
            <Ionicons name="arrow-forward" size={16} color={palette.textTertiary} />
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
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={[styles.coachCard, { backgroundColor: palette.textInverse }, selected && { borderColor: palette.accent, ...Shadows.gold }]}
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
              <Ionicons name="checkmark-circle" size={20} color={palette.textInverse} />
              <Text style={[styles.selectionBadgeText, { color: palette.textInverse }]}>Selected</Text>
            </View>

            {/* Coach Info */}
            <View style={styles.selectedCoachContent}>
              <CoachIcon
                iconName={coach.icon_name}
                color={palette.textInverse}
                size="xl"
                variant="solid"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              />
              <Text style={[styles.selectedCoachName, { color: palette.textInverse }]}>{coach.name}</Text>
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
                <Text style={[styles.coachName, { color: palette.textPrimary }]}>{coach.name}</Text>
                <Text style={[styles.coachTagline, { color: palette.textTertiary }]}>{coach.tagline}</Text>
              </View>
            </View>

            {/* Method Preview */}
            <View style={[styles.methodSection, { backgroundColor: palette.backgroundSecondary }]}>
              <View style={[styles.methodAccent, { backgroundColor: coach.color }]} />
              <Text style={[styles.methodText, { color: palette.textTertiary }]} numberOfLines={2}>
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
    fontFamily: Typography.fonts.serif,
    marginBottom: Spacing.md,
  },
  subtitle: {
    fontSize: Typography.sizes.body,
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
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadows.md,
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
  },
  selectedCoachContent: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  selectedCoachName: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.semibold,
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
    fontFamily: Typography.fonts.serif,
  },
  coachTagline: {
    fontSize: Typography.sizes.body,
    marginTop: Spacing.xs,
  },
  methodSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
