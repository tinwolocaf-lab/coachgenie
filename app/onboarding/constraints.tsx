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
import { Colors, Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
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
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View style={[styles.progressFill, { width: '40%' }]} />
        </View>
        <Text style={styles.progressText}>2 of 5</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Question Header */}
        <Animated.View entering={FadeInUp.duration(800)} style={styles.questionContainer}>
          <Text style={styles.question}>What&apos;s your capacity?</Text>
          <Text style={styles.questionSubtitle}>
            Understanding your constraints helps us craft realistic, sustainable guidance.
          </Text>
        </Animated.View>

        {/* Available Time Section */}
        <Animated.View entering={FadeInUp.duration(600).delay(200)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="time-outline" size={18} color={Colors.burnishedGold} />
            </View>
            <Text style={styles.sectionTitle}>Daily focus time</Text>
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
            <View style={styles.sectionIcon}>
              <Ionicons name="battery-half-outline" size={18} color={Colors.burnishedGold} />
            </View>
            <Text style={styles.sectionTitle}>Current energy</Text>
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
            <View style={styles.sectionIcon}>
              <Ionicons name="sparkles-outline" size={18} color={Colors.burnishedGold} />
            </View>
            <Text style={styles.sectionTitle}>Peak focus hours</Text>
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
        style={[styles.timeOption, selected && styles.timeOptionSelected]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <Text style={[styles.timeLabel, selected && styles.timeLabelSelected]}>
          {option.label}
        </Text>
        <Text style={[styles.timeDescription, selected && styles.timeDescriptionSelected]}>
          {option.description}
        </Text>
        {selected && (
          <View style={styles.timeCheckmark}>
            <Ionicons name="checkmark" size={12} color={Colors.white} />
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
        style={[styles.energyOption, selected && styles.energyOptionSelected]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={[styles.energyIconContainer, { backgroundColor: `${option.color}20` }]}>
          <Ionicons
            name={option.icon}
            size={24}
            color={selected ? Colors.burnishedGold : option.color}
          />
        </View>
        <View style={styles.energyContent}>
          <Text style={[styles.energyLabel, selected && styles.energyLabelSelected]}>
            {option.label}
          </Text>
          <Text style={styles.energyDescription}>{option.description}</Text>
        </View>
        {selected && (
          <View style={styles.energyCheck}>
            <Ionicons name="checkmark-circle" size={24} color={Colors.burnishedGold} />
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
            <Ionicons name={option.icon} size={28} color={Colors.white} />
            <Text style={styles.focusLabelSelected}>{option.label}</Text>
            <Text style={styles.focusSublabelSelected}>{option.sublabel}</Text>
          </LinearGradient>
        ) : (
          <View style={styles.focusContent}>
            <Ionicons name={option.icon} size={28} color={option.color} />
            <Text style={styles.focusLabel}>{option.label}</Text>
            <Text style={styles.focusSublabel}>{option.sublabel}</Text>
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
    backgroundColor: Colors.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    color: Colors.charcoal,
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
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadows.sm,
  },
  timeOptionSelected: {
    borderColor: Colors.burnishedGold,
  },
  timeLabel: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.bold,
    color: Colors.charcoal,
    marginBottom: Spacing.xs,
  },
  timeLabelSelected: {
    color: Colors.burnishedGold,
  },
  timeDescription: {
    fontSize: Typography.sizes.micro,
    color: Colors.stoneGray,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wide,
  },
  timeDescriptionSelected: {
    color: Colors.burnishedGold,
  },
  timeCheckmark: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.burnishedGold,
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
    backgroundColor: Colors.white,
    borderRadius: Radius.squircle,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadows.sm,
  },
  energyOptionSelected: {
    borderColor: Colors.burnishedGold,
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
    color: Colors.charcoal,
    fontFamily: Typography.fonts.serif,
    marginBottom: Spacing.xs,
  },
  energyLabelSelected: {
    color: Colors.burnishedGold,
  },
  energyDescription: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
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
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  focusLabel: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    color: Colors.charcoal,
    fontFamily: Typography.fonts.serif,
    marginTop: Spacing.sm,
  },
  focusLabelSelected: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
    fontFamily: Typography.fonts.serif,
    marginTop: Spacing.sm,
  },
  focusSublabel: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
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
