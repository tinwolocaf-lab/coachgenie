import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { ProgressDots } from '@/components/ui/ProgressDots';
import { Slider } from '@/components/ui/Slider';
import { Preferences } from '@/types';
import { getOnboardingState, updatePreferences } from '@/store/onboarding';

const RESPONSE_LENGTH_OPTIONS = [
  { value: 'concise' as const, label: 'Concise', description: 'Brief, to-the-point responses' },
  { value: 'balanced' as const, label: 'Balanced', description: 'Mix of detail and brevity' },
  { value: 'detailed' as const, label: 'Detailed', description: 'Thorough, in-depth guidance' },
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

  const handleContinue = async () => {
    await updatePreferences(preferences);
    router.push('/onboarding/coach-selection');
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <ProgressDots total={5} current={3} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.duration(400)}>
          <Text style={styles.title}>Coaching style</Text>
          <Text style={styles.subtitle}>
            Customize how your coaches communicate with you. These preferences
            shape the tone and approach of all your coaching sessions.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(400).delay(200)}>
          <View style={styles.sliderSection}>
            <View style={styles.sliderHeader}>
              <Text style={styles.sliderTitle}>Tone</Text>
              <View style={styles.toneIndicator}>
                <Text style={styles.toneValue}>
                  {preferences.tone < 33
                    ? 'Gentle'
                    : preferences.tone < 66
                    ? 'Balanced'
                    : 'Direct'}
                </Text>
              </View>
            </View>
            <Slider
              value={preferences.tone}
              onValueChange={(value) =>
                setPreferences((prev) => ({ ...prev, tone: value }))
              }
              leftLabel="Gentle & Supportive"
              rightLabel="Direct & Assertive"
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(400).delay(300)}>
          <View style={styles.sliderSection}>
            <View style={styles.sliderHeader}>
              <Text style={styles.sliderTitle}>Directness</Text>
              <View style={styles.toneIndicator}>
                <Text style={styles.toneValue}>
                  {preferences.directness < 33
                    ? 'Nurturing'
                    : preferences.directness < 66
                    ? 'Balanced'
                    : 'Challenging'}
                </Text>
              </View>
            </View>
            <Slider
              value={preferences.directness}
              onValueChange={(value) =>
                setPreferences((prev) => ({ ...prev, directness: value }))
              }
              leftLabel="Nurturing"
              rightLabel="Challenging"
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(400).delay(400)}>
          <Text style={styles.sectionTitle}>Response length</Text>
          <View style={styles.lengthOptions}>
            {RESPONSE_LENGTH_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.lengthOption,
                  preferences.response_length === option.value &&
                    styles.lengthOptionSelected,
                ]}
                onPress={() =>
                  setPreferences((prev) => ({
                    ...prev,
                    response_length: option.value,
                  }))
                }
              >
                <Text
                  style={[
                    styles.lengthLabel,
                    preferences.response_length === option.value &&
                      styles.lengthLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
                <Text style={styles.lengthDescription}>{option.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.duration(400).delay(500)}
          style={styles.previewCard}
        >
          <Text style={styles.previewTitle}>Preview</Text>
          <Text style={styles.previewText}>
            {getPreviewText(preferences)}
          </Text>
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

function getPreviewText(preferences: Preferences): string {
  const toneStyle = preferences.tone < 33 ? 'gentle' : preferences.tone < 66 ? 'balanced' : 'direct';
  const directStyle = preferences.directness < 33 ? 'supportive' : preferences.directness < 66 ? 'encouraging' : 'challenging';

  if (toneStyle === 'gentle' && directStyle === 'supportive') {
    return '"I notice you might be feeling overwhelmed. Let\'s take a breath and look at one small step you could take today. What feels manageable right now?"';
  }
  if (toneStyle === 'direct' && directStyle === 'challenging') {
    return '"You\'re capable of more than you think. What\'s the one thing you\'ve been avoiding that would make the biggest impact? Let\'s tackle it now."';
  }
  return '"Let\'s break this down together. What\'s the most important thing you want to accomplish today, and what might get in the way?"';
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
  sliderSection: {
    marginBottom: Spacing.xl,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sliderTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    color: Colors.slateCharcoal,
  },
  toneIndicator: {
    backgroundColor: Colors.electricIndigo + '15',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  toneValue: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    color: Colors.electricIndigo,
  },
  sectionTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    color: Colors.slateCharcoal,
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  lengthOptions: {
    gap: Spacing.sm,
  },
  lengthOption: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  lengthOptionSelected: {
    borderColor: Colors.electricIndigo,
    backgroundColor: Colors.electricIndigo + '08',
  },
  lengthLabel: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    color: Colors.slateCharcoal,
    marginBottom: Spacing.xs,
  },
  lengthLabelSelected: {
    color: Colors.electricIndigo,
  },
  lengthDescription: {
    fontSize: Typography.sizes.body,
    color: Colors.slateGray,
  },
  previewCard: {
    marginTop: Spacing.xxl,
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  previewTitle: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    color: Colors.slateLight,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  previewText: {
    fontSize: Typography.sizes.body,
    color: Colors.slateGray,
    lineHeight: 22,
    fontStyle: 'italic',
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
