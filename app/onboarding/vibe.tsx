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
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { saveOnboardingData } from '@/lib/onboarding';

interface VibeOption {
  id: string;
  label: string;
  emoji: string;
  description: string;
}

const VIBE_OPTIONS: VibeOption[] = [
  {
    id: 'mental-clarity',
    label: 'Mental Clarity',
    emoji: '🧘',
    description: 'Cut through chaos and focus on what matters',
  },
  {
    id: 'daily-discipline',
    label: 'Daily Discipline',
    emoji: '💪',
    description: 'Build consistency and show up for yourself',
  },
  {
    id: 'goal-achievement',
    label: 'Goal Achievement',
    emoji: '🎯',
    description: 'Turn ambitions into concrete reality',
  },
  {
    id: 'creative-flow',
    label: 'Creative Flow',
    emoji: '💡',
    description: 'Unlock your best ideas and express them',
  },
  {
    id: 'stress-relief',
    label: 'Stress Relief',
    emoji: '🌊',
    description: 'Find calm and restore your peace',
  },
  {
    id: 'peak-performance',
    label: 'Peak Performance',
    emoji: '🔥',
    description: 'Reach your highest potential',
  },
];

export default function VibeScreen() {
  const router = useRouter();
  const { palette } = useThemeSafe();
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleVibeToggle = (vibeLabel: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setSelectedVibes((current) => {
      if (current.includes(vibeLabel)) {
        return current.filter((v) => v !== vibeLabel);
      } else {
        // Allow up to 3 selections
        if (current.length < 3) {
          return [...current, vibeLabel];
        }
        return current;
      }
    });
  };

  const handleContinue = async () => {
    if (selectedVibes.length === 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await saveOnboardingData({ vibes: selectedVibes });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push('/onboarding/coach');
    } catch (error) {
      console.error('Error saving vibes:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = selectedVibes.length > 0;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['bottom']}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View
          entering={FadeInUp.duration(600).delay(200)}
          style={styles.headerSection}
        >
          <Text style={[styles.title, { color: palette.textPrimary }]}>
            What brings you here today?
          </Text>
          <Text style={[styles.subtitle, { color: palette.textTertiary }]}>
            Select what resonates most (up to 3)
          </Text>
        </Animated.View>

        {/* Vibe Cards Grid */}
        <View style={styles.vibesGrid}>
          {VIBE_OPTIONS.map((vibe, index) => (
            <Animated.View
              key={vibe.id}
              entering={FadeInUp.duration(400).delay(300 + index * 50)}
            >
              <VibeCard
                vibe={vibe}
                selected={selectedVibes.includes(vibe.label)}
                onPress={() => handleVibeToggle(vibe.label)}
              />
            </Animated.View>
          ))}
        </View>

        {/* Selection limit indicator */}
        {selectedVibes.length > 0 && (
          <Animated.View
            entering={FadeInUp.duration(300)}
            style={[
              styles.selectionInfo,
              { backgroundColor: palette.accentMuted },
            ]}
          >
            <Ionicons name="information-circle" size={16} color={palette.accent} />
            <Text style={[styles.selectionInfoText, { color: palette.textPrimary }]}>
              {`You've selected ${selectedVibes.length} of 3`}
            </Text>
          </Animated.View>
        )}
      </ScrollView>

      {/* Continue Button */}
      <Animated.View
        entering={FadeInUp.duration(400).delay(800)}
        style={styles.footer}
      >
        <Button
          title="Continue"
          onPress={handleContinue}
          disabled={!isValid || isLoading}
          loading={isLoading}
          variant="gold"
          size="lg"
          fullWidth
        />
      </Animated.View>
    </SafeAreaView>
  );
}

interface VibeCardProps {
  vibe: VibeOption;
  selected: boolean;
  onPress: () => void;
}

function VibeCard({ vibe, selected, onPress }: VibeCardProps) {
  const { palette } = useThemeSafe();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[
        styles.vibeCard,
        {
          backgroundColor: selected ? palette.accent : palette.cardBg,
          borderColor: selected ? palette.accent : palette.border,
        },
        selected && styles.vibeCardSelected,
      ]}
    >
      {/* Emoji */}
      <Text style={styles.vibeEmoji}>{vibe.emoji}</Text>

      {/* Content */}
      <Text
        style={[
          styles.vibeLabel,
          {
            color: selected ? palette.textInverse : palette.textPrimary,
          },
        ]}
      >
        {vibe.label}
      </Text>
      <Text
        style={[
          styles.vibeDescription,
          {
            color: selected
              ? 'rgba(255,255,255,0.8)'
              : palette.textTertiary,
          },
        ]}
      >
        {vibe.description}
      </Text>

      {/* Selection indicator */}
      {selected && (
        <View style={styles.selectionCheckmark}>
          <Ionicons name="checkmark" size={16} color={palette.textInverse} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.lg,
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
    letterSpacing: Typography.letterSpacing.tight,
  },
  subtitle: {
    fontSize: Typography.sizes.body,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },

  // Grid
  vibesGrid: {
    gap: Spacing.lg,
    marginBottom: Spacing.xxl,
  },
  vibeCard: {
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    position: 'relative',
    ...Shadows.sm,
  },
  vibeCardSelected: {
    ...Shadows.gold,
  },
  vibeEmoji: {
    fontSize: 32,
    marginBottom: Spacing.md,
  },
  vibeLabel: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    marginBottom: Spacing.sm,
  },
  vibeDescription: {
    fontSize: Typography.sizes.body,
    lineHeight: Typography.sizes.body * Typography.lineHeights.snug,
    marginBottom: Spacing.md,
  },
  selectionCheckmark: {
    position: 'absolute',
    top: Spacing.lg,
    right: Spacing.lg,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Selection info
  selectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    gap: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  selectionInfoText: {
    flex: 1,
    fontSize: Typography.sizes.body,
  },

  // Footer
  footer: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.lg,
  },
});
