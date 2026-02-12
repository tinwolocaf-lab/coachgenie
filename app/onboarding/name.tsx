import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { saveOnboardingData } from '@/lib/onboarding';

export default function NameScreen() {
  const router = useRouter();
  const { palette } = useThemeSafe();
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const trimmedName = name.trim();
  const isNameValid = trimmedName.length > 0;

  const handleContinue = async () => {
    if (!isNameValid) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setIsLoading(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await saveOnboardingData({ name: trimmedName });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push('/onboarding/vibe');
    } catch (error) {
      console.error('Error saving name:', error);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInUp.duration(420)} style={styles.headerSection}>
            <Text style={[styles.title, { color: palette.textPrimary }]}>Let&apos;s start with your name</Text>
            <Text style={[styles.subtitle, { color: palette.textTertiary }]}>Your coach will use this to personalize every session.</Text>
          </Animated.View>

          <Animated.View
            entering={FadeInUp.duration(420).delay(120)}
            style={[styles.inputCard, { backgroundColor: palette.cardBg, borderColor: isNameValid ? palette.accent : palette.borderLight }]}
          >
            <Text style={[styles.inputLabel, { color: palette.textPrimary }]}>Name</Text>
            <View style={[styles.inputRow, { borderColor: palette.border }]}>
              <TextInput
                style={[styles.input, { color: palette.textPrimary }]}
                placeholder="Type your name"
                placeholderTextColor={palette.textTertiary}
                value={name}
                onChangeText={setName}
                editable={!isLoading}
                maxLength={50}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleContinue}
                onFocus={() => {
                  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              />
              {isNameValid ? <Ionicons name="checkmark-circle" size={20} color={palette.accent} /> : null}
            </View>
            <Text style={[styles.metaText, { color: palette.textTertiary }]}>{name.length}/50</Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(420).delay(220)} style={styles.tipSection}>
            <View style={[styles.tipCard, { backgroundColor: palette.accentMuted }]}>
              <Ionicons name="sparkles" size={16} color={palette.accent} />
              <Text style={[styles.tipText, { color: palette.textPrimary }]}>You can always update this later in account settings.</Text>
            </View>
          </Animated.View>
        </ScrollView>

        <Animated.View entering={FadeInUp.duration(360).delay(280)} style={styles.footer}>
          <Button
            title="Continue"
            onPress={handleContinue}
            disabled={!isNameValid || isLoading}
            loading={isLoading}
            variant="gold"
            size="lg"
            fullWidth
          />
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl,
    gap: Spacing.xl,
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
  inputCard: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.sm,
    ...Shadows.sm,
  },
  inputLabel: {
    fontSize: Typography.sizes.caption,
    letterSpacing: Typography.letterSpacing.wide,
    textTransform: 'uppercase',
    fontWeight: Typography.weights.semibold,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    minHeight: 52,
  },
  input: {
    flex: 1,
    fontSize: Typography.sizes.bodyLarge,
    fontFamily: Typography.fonts.sans,
  },
  metaText: {
    alignSelf: 'flex-end',
    fontSize: Typography.sizes.caption,
  },
  tipSection: {
    marginTop: Spacing.xs,
  },
  tipCard: {
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipText: {
    flex: 1,
    fontSize: Typography.sizes.body,
    lineHeight: Typography.sizes.body * Typography.lineHeights.snug,
  },
  footer: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.md,
  },
});
