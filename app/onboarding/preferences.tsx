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
  interpolateColor,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Preferences } from '@/types';
import { getOnboardingState, updatePreferences } from '@/store/onboarding';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_SIZE = SCREEN_WIDTH - Spacing.xxl * 2;

// 2D Style Grid positions
const STYLE_POSITIONS = [
  { id: 'gentle-nurturing', tone: 0, directness: 0, label: 'Nurturing', icon: 'heart-outline' },
  { id: 'gentle-balanced', tone: 0, directness: 50, label: 'Supportive', icon: 'hand-left-outline' },
  { id: 'gentle-challenging', tone: 0, directness: 100, label: 'Encouraging', icon: 'sunny-outline' },
  { id: 'balanced-nurturing', tone: 50, directness: 0, label: 'Empathetic', icon: 'leaf-outline' },
  { id: 'balanced-balanced', tone: 50, directness: 50, label: 'Balanced', icon: 'scale-outline' },
  { id: 'balanced-challenging', tone: 50, directness: 100, label: 'Motivating', icon: 'flame-outline' },
  { id: 'direct-nurturing', tone: 100, directness: 0, label: 'Honest', icon: 'shield-checkmark-outline' },
  { id: 'direct-balanced', tone: 100, directness: 50, label: 'Candid', icon: 'megaphone-outline' },
  { id: 'direct-challenging', tone: 100, directness: 100, label: 'Demanding', icon: 'flash-outline' },
];

const RESPONSE_LENGTH_OPTIONS = [
  { value: 'concise' as const, label: 'Brief', icon: 'text-outline' as const, description: 'Quick, actionable insights' },
  { value: 'balanced' as const, label: 'Measured', icon: 'document-text-outline' as const, description: 'Thoughtful depth with clarity' },
  { value: 'detailed' as const, label: 'Thorough', icon: 'book-outline' as const, description: 'Comprehensive exploration' },
];

export default function PreferencesScreen() {
  const router = useRouter();
  const [preferences, setPreferences] = useState<Preferences>({
    tone: 50,
    directness: 50,
    response_length: 'balanced',
  });

  useEffect(() => {
    loadState();
  }, []);

  const loadState = async () => {
    const state = await getOnboardingState();
    setPreferences(state.preferences);
  };

  const handleStyleSelect = (tone: number, directness: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPreferences((prev) => ({ ...prev, tone, directness }));
  };

  const handleLengthSelect = (value: 'concise' | 'balanced' | 'detailed') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPreferences((prev) => ({ ...prev, response_length: value }));
  };

  const handleContinue = async () => {
    await updatePreferences(preferences);
    router.push('/onboarding/coach-selection');
  };

  const handleBack = () => {
    router.back();
  };

  // Find the closest style position to current preferences
  const getSelectedStyleId = () => {
    const toneLevel = preferences.tone < 33 ? 0 : preferences.tone < 66 ? 50 : 100;
    const directnessLevel = preferences.directness < 33 ? 0 : preferences.directness < 66 ? 50 : 100;
    const position = STYLE_POSITIONS.find(
      (p) => p.tone === toneLevel && p.directness === directnessLevel
    );
    return position?.id || 'balanced-balanced';
  };

  const selectedStyleId = getSelectedStyleId();
  const selectedStyle = STYLE_POSITIONS.find((p) => p.id === selectedStyleId);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View style={[styles.progressFill, { width: '60%' }]} />
        </View>
        <Text style={styles.progressText}>3 of 5</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Question Header */}
        <Animated.View entering={FadeInUp.duration(800)} style={styles.questionContainer}>
          <Text style={styles.question}>How should we speak?</Text>
          <Text style={styles.questionSubtitle}>
            Choose the communication style that resonates with you. This shapes every interaction.
          </Text>
        </Animated.View>

        {/* 2D Style Grid */}
        <Animated.View entering={FadeInUp.duration(600).delay(200)} style={styles.styleGridSection}>
          <View style={styles.gridContainer}>
            {/* Y-Axis Label */}
            <View style={styles.yAxisLabel}>
              <Text style={styles.axisLabelText}>DIRECT</Text>
              <View style={styles.axisLine} />
              <Text style={styles.axisLabelText}>GENTLE</Text>
            </View>

            {/* Grid */}
            <View style={styles.grid}>
              {/* X-Axis Label Top */}
              <View style={styles.xAxisLabel}>
                <Text style={styles.axisLabelText}>NURTURING</Text>
                <View style={styles.axisLineHorizontal} />
                <Text style={styles.axisLabelText}>CHALLENGING</Text>
              </View>

              {/* Grid Cells */}
              <View style={styles.gridCells}>
                {STYLE_POSITIONS.map((position, index) => (
                  <StyleGridCell
                    key={position.id}
                    position={position}
                    selected={position.id === selectedStyleId}
                    onPress={() => handleStyleSelect(position.tone, position.directness)}
                    index={index}
                  />
                ))}
              </View>
            </View>
          </View>

          {/* Selected Style Display */}
          <Animated.View entering={FadeIn.duration(400).delay(600)} style={styles.selectedStyleCard}>
            <LinearGradient
              colors={[Colors.midnightEmerald, '#0D1A11']}
              style={styles.selectedStyleGradient}
            >
              <View style={styles.selectedStyleIcon}>
                <Ionicons name={selectedStyle?.icon as any || 'scale-outline'} size={24} color={Colors.burnishedGold} />
              </View>
              <View style={styles.selectedStyleInfo}>
                <Text style={styles.selectedStyleLabel}>Your Style</Text>
                <Text style={styles.selectedStyleName}>{selectedStyle?.label}</Text>
              </View>
              <View style={styles.selectedStyleBadge}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.burnishedGold} />
              </View>
            </LinearGradient>
          </Animated.View>
        </Animated.View>

        {/* Response Length Section */}
        <Animated.View entering={FadeInUp.duration(600).delay(400)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="chatbubbles-outline" size={18} color={Colors.burnishedGold} />
            </View>
            <Text style={styles.sectionTitle}>Response depth</Text>
          </View>
          <View style={styles.lengthGrid}>
            {RESPONSE_LENGTH_OPTIONS.map((option, index) => (
              <LengthOption
                key={option.value}
                option={option}
                selected={preferences.response_length === option.value}
                onPress={() => handleLengthSelect(option.value)}
                index={index}
              />
            ))}
          </View>
        </Animated.View>

        {/* Preview Card */}
        <Animated.View entering={FadeInUp.duration(600).delay(600)} style={styles.previewSection}>
          <View style={styles.previewCard}>
            <View style={styles.previewHeader}>
              <Ionicons name="chatbubble-ellipses-outline" size={16} color={Colors.burnishedGold} />
              <Text style={styles.previewLabel}>Sample Response</Text>
            </View>
            <Text style={styles.previewText}>
              {getPreviewText(preferences)}
            </Text>
            <View style={styles.previewSignature}>
              <View style={styles.previewDot} />
              <Text style={styles.previewSignatureText}>Your Coach</Text>
            </View>
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

function StyleGridCell({
  position,
  selected,
  onPress,
  index,
}: {
  position: typeof STYLE_POSITIONS[0];
  selected: boolean;
  onPress: () => void;
  index: number;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.92, Timing.springBouncy);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, Timing.springBouncy);
  };

  const row = Math.floor(index / 3);
  const col = index % 3;

  return (
    <Animated.View
      entering={FadeIn.duration(300).delay(200 + row * 100 + col * 50)}
      style={[styles.gridCellWrapper, animatedStyle]}
    >
      <TouchableOpacity
        style={[styles.gridCell, selected && styles.gridCellSelected]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {selected ? (
          <LinearGradient
            colors={[Colors.burnishedGold, Colors.goldLight]}
            style={styles.gridCellGradient}
          >
            <Ionicons name={position.icon as any} size={22} color={Colors.white} />
          </LinearGradient>
        ) : (
          <View style={styles.gridCellContent}>
            <Ionicons name={position.icon as any} size={22} color={Colors.stoneGray} />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

function LengthOption({
  option,
  selected,
  onPress,
  index,
}: {
  option: typeof RESPONSE_LENGTH_OPTIONS[0];
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
      entering={FadeIn.duration(400).delay(400 + index * 100)}
      style={[{ flex: 1 }, animatedStyle]}
    >
      <TouchableOpacity
        style={[styles.lengthOption, selected && styles.lengthOptionSelected]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={[styles.lengthIcon, selected && styles.lengthIconSelected]}>
          <Ionicons
            name={option.icon}
            size={20}
            color={selected ? Colors.white : Colors.stoneGray}
          />
        </View>
        <Text style={[styles.lengthLabel, selected && styles.lengthLabelSelected]}>
          {option.label}
        </Text>
        <Text style={styles.lengthDescription}>{option.description}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

function getPreviewText(preferences: Preferences): string {
  const toneStyle = preferences.tone < 33 ? 'gentle' : preferences.tone < 66 ? 'balanced' : 'direct';
  const directStyle = preferences.directness < 33 ? 'nurturing' : preferences.directness < 66 ? 'balanced' : 'challenging';

  if (toneStyle === 'gentle' && directStyle === 'nurturing') {
    return '"I sense you\'re carrying a lot right now. Let\'s take this one breath at a time. What feels like the smallest possible step forward?"';
  }
  if (toneStyle === 'gentle' && directStyle === 'challenging') {
    return '"You have more strength than you realize. I believe in you. What would happen if you tried that thing you\'ve been avoiding?"';
  }
  if (toneStyle === 'direct' && directStyle === 'nurturing') {
    return '"Here\'s what I see clearly: you\'re capable. Let me help you see that too. What\'s holding you back from starting?"';
  }
  if (toneStyle === 'direct' && directStyle === 'challenging') {
    return '"No excuses today. You know what needs to be done. What\'s the one action that will move the needle right now?"';
  }
  return '"Let\'s approach this thoughtfully. What\'s the most important thing you want to accomplish, and what might get in the way?"';
}

const CELL_SIZE = (SCREEN_WIDTH - Spacing.xxl * 2 - 80) / 3;

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

  // Style Grid Section
  styleGridSection: {
    marginBottom: Spacing.xxl,
  },
  gridContainer: {
    flexDirection: 'row',
  },
  yAxisLabel: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.lg,
    marginRight: Spacing.sm,
  },
  axisLabelText: {
    fontSize: Typography.sizes.micro,
    fontWeight: Typography.weights.medium,
    color: Colors.stoneGray,
    letterSpacing: Typography.letterSpacing.wider,
    transform: [{ rotate: '-90deg' }],
    width: 60,
    textAlign: 'center',
  },
  axisLine: {
    flex: 1,
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
  grid: {
    flex: 1,
  },
  xAxisLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.md,
  },
  axisLineHorizontal: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.sm,
  },
  gridCells: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    justifyContent: 'center',
  },
  gridCellWrapper: {
    width: CELL_SIZE,
    height: CELL_SIZE,
  },
  gridCell: {
    flex: 1,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadows.sm,
  },
  gridCellSelected: {
    borderColor: Colors.burnishedGold,
    ...Shadows.gold,
  },
  gridCellContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCellGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Selected Style Card
  selectedStyleCard: {
    marginTop: Spacing.lg,
    borderRadius: Radius.squircle,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  selectedStyleGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  selectedStyleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(197, 160, 89, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.lg,
  },
  selectedStyleInfo: {
    flex: 1,
  },
  selectedStyleLabel: {
    fontSize: Typography.sizes.caption,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wide,
  },
  selectedStyleName: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
    fontFamily: Typography.fonts.serif,
    marginTop: Spacing.xs,
  },
  selectedStyleBadge: {
    marginLeft: Spacing.md,
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

  // Length Options
  lengthGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  lengthOption: {
    backgroundColor: Colors.white,
    borderRadius: Radius.squircle,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...Shadows.sm,
  },
  lengthOptionSelected: {
    borderColor: Colors.burnishedGold,
  },
  lengthIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.warmOatmealDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  lengthIconSelected: {
    backgroundColor: Colors.burnishedGold,
  },
  lengthLabel: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    color: Colors.charcoal,
    fontFamily: Typography.fonts.serif,
    marginBottom: Spacing.xs,
  },
  lengthLabelSelected: {
    color: Colors.burnishedGold,
  },
  lengthDescription: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
    textAlign: 'center',
  },

  // Preview Section
  previewSection: {
    marginBottom: Spacing.xl,
  },
  previewCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.squircle,
    padding: Spacing.xl,
    borderLeftWidth: 3,
    borderLeftColor: Colors.burnishedGold,
    ...Shadows.sm,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  previewLabel: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.medium,
    color: Colors.burnishedGold,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wide,
    marginLeft: Spacing.sm,
  },
  previewText: {
    fontSize: Typography.sizes.bodyLarge,
    color: Colors.charcoal,
    lineHeight: Typography.sizes.bodyLarge * Typography.lineHeights.relaxed,
    fontFamily: Typography.fonts.serif,
    fontStyle: 'italic',
  },
  previewSignature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  previewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.burnishedGold,
    marginRight: Spacing.sm,
  },
  previewSignatureText: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
    fontStyle: 'italic',
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
