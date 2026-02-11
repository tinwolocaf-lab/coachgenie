import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInUp,
  FadeInDown,
  useSharedValue,
  withTiming,
  Easing,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { saveOnboardingData } from '@/lib/onboarding';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export default function NameScreen() {
  const router = useRouter();
  const { palette } = useThemeSafe();
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const gradientShift = useSharedValue(0);

  // Subtle animated background gradient shift
  useEffect(() => {
    gradientShift.value = withTiming(1, {
      duration: 6000,
      easing: Easing.inOut(Easing.ease),
    });
  }, [gradientShift]);

  const handleContinue = async () => {
    if (!name.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await saveOnboardingData({ name: name.trim() });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push('/onboarding/vibe');
    } catch (error) {
      console.error('Error saving name:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const isNameValid = name.trim().length > 0;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['bottom']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
        >
          {/* Animated gradient background */}
          <LinearGradient
            colors={[
              palette.background,
              palette.accentMuted,
              palette.background,
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBg}
          />

          {/* Welcome Header */}
          <Animated.View
            entering={FadeInUp.duration(600).delay(200)}
            style={styles.headerSection}
          >
            <View style={styles.welcomeIcon}>
              <LinearGradient
                colors={[palette.accent, palette.accentLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconGradient}
              >
                <Ionicons name="sparkles" size={32} color={palette.textInverse} />
              </LinearGradient>
            </View>

            <Text style={[styles.appName, { color: palette.textPrimary }]}>
              CoachGenie
            </Text>
            <Text style={[styles.appTagline, { color: palette.textTertiary }]}>
              Your AI coaching companion
            </Text>
          </Animated.View>

          {/* Name Input Section */}
          <Animated.View
            entering={FadeInUp.duration(600).delay(400)}
            style={styles.inputSection}
          >
            <Text style={[styles.inputLabel, { color: palette.textPrimary }]}>
              What should I call you?
            </Text>

            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: palette.cardBg,
                  borderColor: isNameValid ? palette.accent : palette.border,
                },
              ]}
            >
              <TextInput
                style={[
                  styles.input,
                  {
                    color: palette.textPrimary,
                    fontFamily: Typography.fonts.sans,
                  },
                ]}
                placeholder="Enter your name..."
                placeholderTextColor={palette.textTertiary}
                value={name}
                onChangeText={setName}
                onFocus={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                editable={!isLoading}
                maxLength={50}
                returnKeyType="done"
                onSubmitEditing={handleContinue}
                autoFocus
                selectTextOnFocus
              />
              {isNameValid && (
                <Animated.View
                  entering={FadeInDown.duration(300)}
                  style={styles.inputIcon}
                >
                  <Ionicons name="checkmark-circle" size={20} color={palette.accent} />
                </Animated.View>
              )}
            </View>

            {/* Character count */}
            <Text style={[styles.charCount, { color: palette.textTertiary }]}>
              {name.length} / 50
            </Text>
          </Animated.View>

          {/* Helpful hint */}
          <Animated.View
            entering={FadeInUp.duration(600).delay(600)}
            style={styles.hintSection}
          >
            <View
              style={[
                styles.hintBox,
                { backgroundColor: palette.accentMuted },
              ]}
            >
              <Ionicons name="information-circle" size={16} color={palette.accent} />
              <Text style={[styles.hintText, { color: palette.textPrimary }]}>
                I'll use your name to personalize your coaching experience
              </Text>
            </View>
          </Animated.View>
        </ScrollView>

        {/* Continue Button */}
        <Animated.View
          entering={FadeInUp.duration(400).delay(800)}
          style={styles.footer}
        >
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
    flex: 1,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xxxl,
    paddingBottom: Spacing.lg,
    justifyContent: 'flex-start',
  },
  gradientBg: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.3,
  },

  // Header
  headerSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
    zIndex: 1,
  },
  welcomeIcon: {
    marginBottom: Spacing.xl,
    ...Shadows.gold,
  },
  iconGradient: {
    width: 72,
    height: 72,
    borderRadius: Radius.squircle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: Typography.sizes.display,
    fontWeight: Typography.weights.light,
    fontFamily: Typography.fonts.serif,
    marginBottom: Spacing.sm,
    letterSpacing: Typography.letterSpacing.tight,
  },
  appTagline: {
    fontSize: Typography.sizes.bodyLarge,
    fontFamily: Typography.fonts.sans,
    letterSpacing: Typography.letterSpacing.wide,
  },

  // Input Section
  inputSection: {
    marginBottom: Spacing.xxxl,
    zIndex: 1,
  },
  inputLabel: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    marginBottom: Spacing.lg,
    letterSpacing: Typography.letterSpacing.tight,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.sm,
    ...Shadows.sm,
  },
  input: {
    flex: 1,
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.regular,
  },
  inputIcon: {
    marginLeft: Spacing.md,
  },
  charCount: {
    fontSize: Typography.sizes.caption,
    textAlign: 'right',
  },

  // Hint
  hintSection: {
    marginBottom: Spacing.xxl,
    zIndex: 1,
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    gap: Spacing.md,
  },
  hintText: {
    flex: 1,
    fontSize: Typography.sizes.body,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },

  // Footer
  footer: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.lg,
  },
});
