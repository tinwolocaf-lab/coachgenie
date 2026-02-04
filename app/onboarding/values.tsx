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
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  interpolate,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { AVAILABLE_VALUES } from '@/types';
import { getOnboardingState, updateValues } from '@/store/onboarding';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - Spacing.xxl * 2 - Spacing.md) / 2;

// Vision board card configurations
const VALUE_CONFIGS: Record<string, { icon: keyof typeof Ionicons.glyphMap; colors: [string, string] }> = {
  Growth: { icon: 'trending-up', colors: ['#3D7A5C', '#5A9F7A'] },
  Balance: { icon: 'scale', colors: ['#6366F1', '#818CF8'] },
  Achievement: { icon: 'trophy', colors: ['#C5A059', '#D4B77A'] },
  Creativity: { icon: 'color-palette', colors: ['#EC4899', '#F472B6'] },
  Connection: { icon: 'people', colors: ['#F59E0B', '#FBBF24'] },
  Health: { icon: 'heart', colors: ['#EF4444', '#F87171'] },
  Wealth: { icon: 'diamond', colors: ['#1B3022', '#2D4A39'] },
  Learning: { icon: 'book', colors: ['#8B5CF6', '#A78BFA'] },
  Leadership: { icon: 'flag', colors: ['#0EA5E9', '#38BDF8'] },
  Freedom: { icon: 'airplane', colors: ['#14B8A6', '#2DD4BF'] },
  Impact: { icon: 'globe', colors: ['#F97316', '#FB923C'] },
  Authenticity: { icon: 'finger-print', colors: ['#6B7280', '#9CA3AF'] },
};

export default function ValuesScreen() {
  const router = useRouter();
  const [selectedValues, setSelectedValues] = useState<string[]>([]);

  useEffect(() => {
    loadState();
  }, []);

  const loadState = async () => {
    const state = await getOnboardingState();
    if (state.values.length > 0) {
      setSelectedValues(state.values);
    }
  };

  const toggleValue = (value: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedValues((prev) => {
      if (prev.includes(value)) {
        return prev.filter((v) => v !== value);
      }
      if (prev.length >= 5) {
        return prev;
      }
      return [...prev, value];
    });
  };

  const handleContinue = async () => {
    await updateValues(selectedValues);
    router.push('/onboarding/goals');
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View style={[styles.progressFill, { width: '20%' }]} />
        </View>
        <Text style={styles.progressText}>1 of 5</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Consultation Question */}
        <Animated.View entering={FadeInUp.duration(800)} style={styles.questionContainer}>
          <Text style={styles.question}>What drives you?</Text>
          <Text style={styles.questionSubtitle}>
            Select up to 5 values that guide your decisions. This helps us understand what matters most to you.
          </Text>
        </Animated.View>

        {/* Vision Board Grid */}
        <Animated.View entering={FadeIn.duration(800).delay(400)} style={styles.visionBoard}>
          {AVAILABLE_VALUES.map((value, index) => (
            <VisionCard
              key={value}
              value={value}
              selected={selectedValues.includes(value)}
              disabled={!selectedValues.includes(value) && selectedValues.length >= 5}
              onPress={() => toggleValue(value)}
              index={index}
            />
          ))}
        </Animated.View>

        {/* Selection indicator */}
        <Animated.View entering={FadeInUp.duration(600).delay(600)} style={styles.selectionIndicator}>
          <View style={styles.dots}>
            {[...Array(5)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i < selectedValues.length && styles.dotFilled,
                ]}
              />
            ))}
          </View>
          <Text style={styles.selectionText}>
            {selectedValues.length === 0
              ? 'Select your values'
              : `${selectedValues.length} of 5 selected`}
          </Text>
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
          disabled={selectedValues.length === 0}
          variant="primary"
          style={styles.continueButton}
        />
      </View>
    </SafeAreaView>
  );
}

function VisionCard({
  value,
  selected,
  disabled,
  onPress,
  index,
}: {
  value: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
  index: number;
}) {
  const scale = useSharedValue(1);
  const config = VALUE_CONFIGS[value] || VALUE_CONFIGS.Growth;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: interpolate(scale.value, [0.95, 1], [0.9, disabled ? 0.4 : 1]),
  }));

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.95, Timing.springBouncy);
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, Timing.springBouncy);
  };

  return (
    <Animated.View
      entering={FadeInUp.duration(500).delay(200 + index * 50)}
      style={animatedStyle}
    >
      <TouchableOpacity
        style={[
          styles.visionCard,
          selected && styles.visionCardSelected,
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        disabled={disabled}
      >
        <LinearGradient
          colors={selected ? config.colors : [Colors.white, Colors.warmOatmealDark]}
          style={styles.visionCardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={[styles.iconContainer, selected && styles.iconContainerSelected]}>
            <Ionicons
              name={config.icon}
              size={28}
              color={selected ? Colors.white : config.colors[0]}
            />
          </View>
          <Text style={[styles.valueName, selected && styles.valueNameSelected]}>
            {value}
          </Text>

          {/* Selection indicator */}
          {selected && (
            <View style={styles.checkBadge}>
              <Ionicons name="checkmark" size={14} color={Colors.white} />
            </View>
          )}
        </LinearGradient>
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

  // Vision Board
  visionBoard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  visionCard: {
    width: CARD_WIDTH,
    borderRadius: Radius.squircle,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadows.sm,
  },
  visionCardSelected: {
    borderColor: Colors.burnishedGold,
    ...Shadows.gold,
  },
  visionCardGradient: {
    padding: Spacing.lg,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.warmOatmeal,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  iconContainerSelected: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  valueName: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    color: Colors.charcoal,
    fontFamily: Typography.fonts.serif,
    textAlign: 'center',
  },
  valueNameSelected: {
    color: Colors.white,
  },
  checkBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.burnishedGold,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Selection Indicator
  selectionIndicator: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dots: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.border,
  },
  dotFilled: {
    backgroundColor: Colors.burnishedGold,
  },
  selectionText: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
    letterSpacing: Typography.letterSpacing.wide,
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
