import React, { useState, useEffect } from 'react';
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
import { Constraints } from '@/types';
import { getOnboardingState, updateConstraints } from '@/store/onboarding';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TIME_OPTIONS = [
  { value: 1, label: '1h', description: 'Light' },
  { value: 2, label: '2h', description: 'Moderate' },
  { value: 4, label: '4h', description: 'Focused' },
  { value: 6, label: '6h+', description: 'Intensive' },
];

const ENERGY_OPTIONS = [
  {
    value: 'low' as const,
    label: 'Gentle',
    icon: 'leaf-outline' as const,
    description: 'Need careful pacing and recovery time',
    color: '#6B8E7B',
  },
  {
    value: 'medium' as const,
    label: 'Steady',
    icon: 'pulse-outline' as const,
    description: 'Consistent energy throughout the day',
    color: '#C5A059',
  },
  {
    value: 'high' as const,
    label: 'Vibrant',
    icon: 'flash-outline' as const,
    description: 'Ready for intensity and challenges',
    color: '#E07B4C',
  },
];

const FOCUS_TIME_OPTIONS = [
  { value: 'morning' as const, label: 'Dawn', sublabel: '6am - 12pm', icon: 'sunny' as const, color: '#F4A261' },
  { value: 'afternoon' as const, label: 'Day', sublabel: '12pm - 6pm', icon: 'partly-sunny' as const, color: '#C5A059' },
  { value: 'evening' as const, label: 'Dusk', sublabel: '6pm - 12am', icon: 'moon' as const, color: '#6B8E7B' },
];

export default function ConstraintsScreen() {
  const router = useRouter();
  const { palette } = useThemeSafe();
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

  const handleTimeSelect = (value: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setConstraints((prev) => ({ ...prev, available_hours_per_day: value }));
  };

  const handleEnergySelect = (value: 'low' | 'medium' | 'high') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setConstraints((prev) => ({ ...prev, energy_level: value }));
  };

  const handleFocusSelect = (value: 'morning' | 'afternoon' | 'evening') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setConstraints((prev) => ({ ...prev, best_time_for_focus: value }));
  };

  const handleContinue = async () => {
    await updateConstraints(constraints);
    router.push('/onboarding/preferences');
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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Question Header */}
        <Animated.View entering={FadeInUp.duration(800)} style={styles.questionContainer}>
          <Text style={[styles.question, { color: palette.textPrimary }]}>What&apos;s your capacity?</Text>
          <Text style={[styles.questionSubtitle, { color: palette.textTertiary }]}>
            Understanding your constraints helps us craft realistic, sustainable guidance.
          </Text>
        </Animated.View>

        {/* Available Time Section */}
        <Animated.View entering={FadeInUp.duration(600).delay(200)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: palette.accentMuted }]}>
              <Ionicons name="time-outline" size={18} color={palette.accent} />
            </View>
            <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>Daily focus time</Text>
          </View>
          <View style={styles.timeGrid}>
            {TIME_OPTIONS.map((option, index) => (
              <TimeOption
                key={option.value}
                option={option}
                selected={constraints.available_hours_per_day === option.value}
                onPress={() => handleTimeSelect(option.value)}
                index={index}
              />
            ))}
          </View>
        </Animated.View>

        {/* Energy Level Section */}
        <Animated.View entering={FadeInUp.duration(600).delay(400)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: palette.accentMuted }]}>
              <Ionicons name="battery-half-outline" size={18} color={palette.accent} />
            </View>
            <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>Current energy</Text>
          </View>
          <View style={styles.energyList}>
            {ENERGY_OPTIONS.map((option, index) => (
              <EnergyOption
                key={option.value}
                option={option}
                selected={constraints.energy_level === option.value}
                onPress={() => handleEnergySelect(option.value)}
                index={index}
              />
            ))}
          </View>
        </Animated.View>

        {/* Focus Time Section */}
        <Animated.View entering={FadeInUp.duration(600).delay(600)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: palette.accentMuted }]}>
              <Ionicons name="sparkles-outline" size={18} color={palette.accent} />
            </View>
            <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>Peak focus hours</Text>
          </View>
          <View style={styles.focusGrid}>
            {FOCUS_TIME_OPTIONS.map((option, index) => (
              <FocusTimeOption
                key={option.value}
                option={option}
                selected={constraints.best_time_for_focus === option.value}
                onPress={() => handleFocusSelect(option.value)}
                index={index}
              />
            ))}
          </View>
        </Animated.View>
      </ScrollView>

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
          variant="primary"
          style={styles.continueButton}
        />
      </View>
    </SafeAreaView>
  );
}

function TimeOption({
  option,
  selected,
  onPress,
  index,
}: {
  option: typeof TIME_OPTIONS[0];
  selected: boolean;
  onPress: () => void;
  index: number;
}) {
  const { palette } = useThemeSafe();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, Timing.springBouncy);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, Timing.springBouncy);
  };

  return (
    <Animated.View
      entering={FadeIn.duration(400).delay(200 + index * 80)}
      style={animatedStyle}
    >
      <TouchableOpacity
        style={[styles.timeOption, { backgroundColor: palette.cardBg }, selected && { borderColor: palette.accent }]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <Text style={[styles.timeLabel, { color: palette.textSecondary }, selected && { color: palette.accent }]}>
          {option.label}
        </Text>
        <Text style={[styles.timeDescription, { color: palette.textTertiary }, selected && { color: palette.accent }]}>
          {option.description}
        </Text>
        {selected && (
          <View style={[styles.timeCheckmark, { backgroundColor: palette.accent }]}>
            <Ionicons name="checkmark" size={12} color={palette.textInverse} />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

function EnergyOption({
  option,
  selected,
  onPress,
  index,
}: {
  option: typeof ENERGY_OPTIONS[0];
  selected: boolean;
  onPress: () => void;
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
      entering={FadeIn.duration(400).delay(400 + index * 100)}
      style={animatedStyle}
    >
      <TouchableOpacity
        style={[styles.energyOption, { backgroundColor: palette.cardBg }, selected && { borderColor: palette.accent }]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={[styles.energyIconContainer, { backgroundColor: `${option.color}20` }]}>
          <Ionicons
            name={option.icon}
            size={24}
            color={selected ? palette.accent : option.color}
          />
        </View>
        <View style={styles.energyContent}>
          <Text style={[styles.energyLabel, { color: palette.textSecondary }, selected && { color: palette.accent }]}>
            {option.label}
          </Text>
          <Text style={[styles.energyDescription, { color: palette.textTertiary }]}>{option.description}</Text>
        </View>
        {selected && (
          <View style={styles.energyCheck}>
            <Ionicons name="checkmark-circle" size={24} color={palette.accent} />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

function FocusTimeOption({
  option,
  selected,
  onPress,
  index,
}: {
  option: typeof FOCUS_TIME_OPTIONS[0];
  selected: boolean;
  onPress: () => void;
  index: number;
}) {
  const { palette } = useThemeSafe();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, Timing.springBouncy);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, Timing.springBouncy);
  };

  return (
    <Animated.View
      entering={FadeIn.duration(400).delay(600 + index * 100)}
      style={[{ flex: 1 }, animatedStyle]}
    >
      <TouchableOpacity
        style={[styles.focusOption, selected && styles.focusOptionSelected]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {selected ? (
          <LinearGradient
            colors={[option.color, `${option.color}DD`]}
            style={styles.focusGradient}
          >
            <Ionicons name={option.icon} size={28} color={palette.textInverse} />
            <Text style={[styles.focusLabelSelected, { color: palette.textInverse }]}>{option.label}</Text>
            <Text style={styles.focusSublabelSelected}>{option.sublabel}</Text>
          </LinearGradient>
        ) : (
          <View style={[styles.focusContent, { backgroundColor: palette.cardBg }]}>
            <Ionicons name={option.icon} size={28} color={option.color} />
            <Text style={[styles.focusLabel, { color: palette.textSecondary }]}>{option.label}</Text>
            <Text style={[styles.focusSublabel, { color: palette.textTertiary }]}>{option.sublabel}</Text>
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

  // Sections
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
  },

  // Time Options
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  timeOption: {
    width: (SCREEN_WIDTH - Spacing.xxl * 2 - Spacing.md * 3) / 4,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadows.sm,
  },
  timeLabel: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.xs,
  },
  timeDescription: {
    fontSize: Typography.sizes.micro,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wide,
  },
  timeCheckmark: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Energy Options
  energyList: {
    gap: Spacing.md,
  },
  energyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.squircle,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadows.sm,
  },
  energyIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  energyContent: {
    flex: 1,
  },
  energyLabel: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    marginBottom: Spacing.xs,
  },
  energyDescription: {
    fontSize: Typography.sizes.body,
  },
  energyCheck: {
    marginLeft: Spacing.md,
  },

  // Focus Time Options
  focusGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  focusOption: {
    borderRadius: Radius.squircle,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  focusOptionSelected: {
    ...Shadows.gold,
  },
  focusGradient: {
    padding: Spacing.lg,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  focusContent: {
    padding: Spacing.lg,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  focusLabel: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    marginTop: Spacing.sm,
  },
  focusLabelSelected: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    marginTop: Spacing.sm,
  },
  focusSublabel: {
    fontSize: Typography.sizes.caption,
    marginTop: Spacing.xs,
  },
  focusSublabelSelected: {
    fontSize: Typography.sizes.caption,
    color: 'rgba(255,255,255,0.8)',
    marginTop: Spacing.xs,
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
