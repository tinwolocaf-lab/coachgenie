import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Colors, Typography, Spacing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ProgressDots } from '@/components/ui/ProgressDots';
import { AVAILABLE_VALUES } from '@/types';
import { getOnboardingState, updateValues } from '@/store/onboarding';

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
      <View style={styles.header}>
        <ProgressDots total={5} current={0} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.duration(400)}>
          <Text style={styles.title}>What drives you?</Text>
          <Text style={styles.subtitle}>
            Select up to 5 core values that guide your decisions and goals.
            These help your coaches understand what matters most to you.
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.duration(400).delay(200)}
          style={styles.chipsContainer}
        >
          {AVAILABLE_VALUES.map((value) => (
            <Chip
              key={value}
              label={value}
              selected={selectedValues.includes(value)}
              onPress={() => toggleValue(value)}
              disabled={
                !selectedValues.includes(value) && selectedValues.length >= 5
              }
            />
          ))}
        </Animated.View>

        <View style={styles.counter}>
          <Text style={styles.counterText}>
            {selectedValues.length}/5 selected
          </Text>
        </View>
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
          disabled={selectedValues.length < 1}
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
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  counter: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  counterText: {
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
