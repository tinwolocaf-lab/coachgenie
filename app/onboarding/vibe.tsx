import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { saveOnboardingData } from '@/lib/onboarding';

interface VibeOption {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
}

const VIBE_OPTIONS: VibeOption[] = [
  {
    id: 'mental-clarity',
    label: 'Mental Clarity',
    icon: 'leaf-outline',
    description: 'Cut through chaos and focus on what matters',
  },
  {
    id: 'daily-discipline',
    label: 'Daily Discipline',
    icon: 'fitness-outline',
    description: 'Build consistency and show up for yourself',
  },
  {
    id: 'goal-achievement',
    label: 'Goal Achievement',
    icon: 'flag-outline',
    description: 'Turn ambitions into concrete reality',
  },
  {
    id: 'creative-flow',
    label: 'Creative Flow',
    icon: 'bulb-outline',
    description: 'Unlock your best ideas and express them',
  },
  {
    id: 'stress-relief',
    label: 'Stress Relief',
    icon: 'water-outline',
    description: 'Find calm and restore your peace',
  },
  {
    id: 'peak-performance',
    label: 'Peak Performance',
    icon: 'flash-outline',
    description: 'Reach your highest potential',
  },
];

export default function VibeScreen() {
  const router = useRouter();
  const { palette } = useThemeSafe();
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleVibeToggle = (vibeLabel: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setSelectedVibes((current) => {
      if (current.includes(vibeLabel)) {
        return current.filter((vibe) => vibe !== vibeLabel);
      }

      if (current.length >= 3) {
        return current;
      }

      return [...current, vibeLabel];
    });
  };

  const handleContinue = async () => {
    if (selectedVibes.length === 0) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setIsLoading(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await saveOnboardingData({ vibes: selectedVibes });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push('/onboarding/coach');
    } catch (error) {
      console.error('Error saving vibes:', error);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.duration(420)} style={styles.headerSection}>
          <Text style={[styles.title, { color: palette.textPrimary }]}>What do you want support with?</Text>
          <Text style={[styles.subtitle, { color: palette.textTertiary }]}>Pick up to three focus areas. This shapes your coaching style.</Text>
        </Animated.View>

        <View style={styles.vibesList}>
          {VIBE_OPTIONS.map((vibe, index) => {
            const selected = selectedVibes.includes(vibe.label);
            return (
              <Animated.View key={vibe.id} entering={FadeInUp.duration(350).delay(80 + index * 40)}>
                <TouchableOpacity
                  onPress={() => handleVibeToggle(vibe.label)}
                  activeOpacity={0.8}
                  style={[
                    styles.vibeCard,
                    {
                      backgroundColor: selected ? palette.accent : palette.cardBg,
                      borderColor: selected ? palette.accent : palette.borderLight,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.vibeIconContainer,
                      {
                        backgroundColor: selected ? 'rgba(255,255,255,0.18)' : palette.accentMuted,
                      },
                    ]}
                  >
                    <Ionicons
                      name={vibe.icon}
                      size={22}
                      color={selected ? palette.textInverse : palette.accent}
                    />
                  </View>

                  <View style={styles.vibeCopy}>
                    <Text
                      style={[
                        styles.vibeLabel,
                        { color: selected ? palette.textInverse : palette.textPrimary },
                      ]}
                    >
                      {vibe.label}
                    </Text>
                    <Text
                      style={[
                        styles.vibeDescription,
                        {
                          color: selected ? 'rgba(255,255,255,0.86)' : palette.textTertiary,
                        },
                      ]}
                    >
                      {vibe.description}
                    </Text>
                  </View>

                  {selected ? (
                    <Ionicons name="checkmark-circle" size={22} color={palette.textInverse} />
                  ) : (
                    <Ionicons name="add-circle-outline" size={22} color={palette.textTertiary} />
                  )}
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        <Animated.View entering={FadeInUp.duration(320).delay(260)} style={styles.selectionMetaWrap}>
          <View style={[styles.selectionMeta, { backgroundColor: palette.accentMuted }]}>
            <Ionicons name="sparkles" size={14} color={palette.accent} />
            <Text style={[styles.selectionMetaText, { color: palette.textPrimary }]}>
              {selectedVibes.length > 0
                ? `Selected ${selectedVibes.length} of 3`
                : 'Select at least one to continue'}
            </Text>
          </View>
        </Animated.View>
      </ScrollView>

      <Animated.View entering={FadeInUp.duration(360).delay(340)} style={styles.footer}>
        <Button
          title="Continue"
          onPress={handleContinue}
          disabled={selectedVibes.length === 0 || isLoading}
          loading={isLoading}
          variant="gold"
          size="lg"
          fullWidth
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl,
    gap: Spacing.lg,
  },
  headerSection: {
    gap: Spacing.sm,
  },
  title: {
    fontSize: Typography.sizes.display,
    fontFamily: Typography.fonts.serif,
    fontWeight: Typography.weights.light,
    letterSpacing: Typography.letterSpacing.tight,
  },
  subtitle: {
    fontSize: Typography.sizes.body,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },
  vibesList: {
    gap: Spacing.md,
  },
  vibeCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    ...Shadows.sm,
  },
  vibeIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  vibeCopy: {
    flex: 1,
    gap: 2,
  },
  vibeLabel: {
    fontSize: Typography.sizes.bodyLarge,
    fontFamily: Typography.fonts.serif,
    fontWeight: Typography.weights.semibold,
  },
  vibeDescription: {
    fontSize: Typography.sizes.caption,
    lineHeight: Typography.sizes.caption * Typography.lineHeights.relaxed,
  },
  selectionMetaWrap: {
    marginTop: Spacing.sm,
  },
  selectionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignSelf: 'flex-start',
  },
  selectionMetaText: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    letterSpacing: Typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  footer: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
  },
});
