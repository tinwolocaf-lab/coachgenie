import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAlert } from '@/contexts/AlertContext';
import { Typography, Spacing, Radius, EditorialSpacing, Shadows } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { useAuthSafe } from '@/hooks/useConditionalAuth';

const TOTAL_STEPS = 5;

const COACH_ICONS = [
  'sparkles', 'bulb', 'flame', 'leaf', 'heart', 'diamond',
  'compass', 'telescope', 'book', 'school', 'rocket', 'shield',
  'sunny', 'moon', 'star', 'fitness', 'musical-notes', 'color-palette',
] as const;

const COACH_COLORS = [
  '#C5A059', '#1B3022', '#5D4E6D', '#3D5A80',
  '#E07A5F', '#81B29A', '#C67B5B', '#2A9D8F',
] as const;

function generateSystemPrompt(name: string, tagline: string, method: string): string {
  return `You are ${name}, a coaching AI.${tagline ? ` ${tagline}.` : ''}\n\nYour coaching approach:\n${method || '(Describe your method above to generate a prompt.)'}\n\nGuidelines:\n- Ask thoughtful questions before giving advice.\n- Tailor responses to the user's context and goals.\n- Be direct yet compassionate.\n- Encourage reflection and personal accountability.`;
}

export default function CreateCoachScreen() {
  const router = useRouter();
  const { palette, subscriptionTier } = useThemeSafe();
  const auth = useAuthSafe();
  const { showToast, showAlert } = useAlert();

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [method, setMethod] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string>(COACH_ICONS[0]);
  const [selectedColor, setSelectedColor] = useState<string>(COACH_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);

  const isOracle = subscriptionTier === 'oracle';

  const generatedPrompt = useMemo(
    () => generateSystemPrompt(name, tagline, method),
    [name, tagline, method],
  );

  const canContinue = (): boolean => {
    switch (step) {
      case 1: return name.trim().length > 0;
      case 2: return method.trim().length > 0;
      case 3: return (systemPrompt || generatedPrompt).trim().length > 0;
      case 4: return true;
      case 5: return true;
      default: return false;
    }
  };

  const handleNext = () => {
    if (step === 3 && !systemPrompt) setSystemPrompt(generatedPrompt);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === 1) { router.back(); return; }
    setStep((s) => s - 1);
  };

  const handleCreate = async () => {
    if (!auth.user?.id) {
      showAlert('Sign in required', 'Please sign in to create a custom coach.');
      return;
    }
    if (!isOracle) {
      showAlert('Oracle tier required', 'Custom coach creation is available for Oracle members.');
      return;
    }

    setIsCreating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const finalPrompt = systemPrompt || generatedPrompt;
      const { error } = await supabase.from('coaches').insert({
        user_id: auth.user.id,
        name: name.trim(),
        tagline: tagline.trim(),
        description: method.trim(),
        system_prompt: finalPrompt,
        icon_name: selectedIcon,
        color: selectedColor,
        method: method.trim(),
        version: '1.0',
        is_public: false,
      });

      if (error) throw error;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      console.error('Error creating coach:', err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast('Error', { variant: 'error', message: 'Failed to create coach. Please try again.' });
    } finally {
      setIsCreating(false);
    }
  };

  // -- Step renderers --

  const inputStyle = [styles.input, { backgroundColor: palette.cardBg, borderColor: palette.border, color: palette.textPrimary }];

  const renderStepOne = () => (
    <Animated.View entering={FadeInUp.duration(350)} key="step1">
      <Text style={[styles.stepHeading, { color: palette.textPrimary }]}>Name your coach</Text>
      <Text style={[styles.stepDescription, { color: palette.textTertiary }]}>
        Give your coach a distinctive name and a short tagline.
      </Text>
      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: palette.textSecondary }]}>Name *</Text>
        <TextInput style={inputStyle} value={name} onChangeText={setName} placeholder="e.g., The Strategist" placeholderTextColor={palette.textTertiary} maxLength={40} />
      </View>
      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: palette.textSecondary }]}>Tagline</Text>
        <TextInput style={inputStyle} value={tagline} onChangeText={setTagline} placeholder="e.g., Clarity through structured thinking" placeholderTextColor={palette.textTertiary} maxLength={80} />
      </View>
    </Animated.View>
  );

  const renderStepTwo = () => (
    <Animated.View entering={FadeInUp.duration(350)} key="step2">
      <Text style={[styles.stepHeading, { color: palette.textPrimary }]}>Coaching method</Text>
      <Text style={[styles.stepDescription, { color: palette.textTertiary }]}>
        What frameworks, philosophies, or techniques does this coach use?
      </Text>
      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: palette.textSecondary }]}>Method / Approach *</Text>
        <TextInput style={[...inputStyle, styles.inputMultiline]} value={method} onChangeText={setMethod} placeholder="Describe the coaching style and approach..." placeholderTextColor={palette.textTertiary} multiline numberOfLines={5} maxLength={500} textAlignVertical="top" />
      </View>
    </Animated.View>
  );

  const renderStepThree = () => (
    <Animated.View entering={FadeInUp.duration(350)} key="step3">
      <Text style={[styles.stepHeading, { color: palette.textPrimary }]}>System prompt</Text>
      <Text style={[styles.stepDescription, { color: palette.textTertiary }]}>
        This defines your coach&apos;s personality. Generated from your inputs — feel free to refine.
      </Text>
      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: palette.textSecondary }]}>Prompt</Text>
        <TextInput style={[...inputStyle, styles.inputLarge]} value={systemPrompt || generatedPrompt} onChangeText={setSystemPrompt} multiline numberOfLines={8} maxLength={2000} textAlignVertical="top" />
      </View>
    </Animated.View>
  );

  const renderStepFour = () => (
    <Animated.View entering={FadeInUp.duration(350)} key="step4">
      <Text style={[styles.stepHeading, { color: palette.textPrimary }]}>Icon and color</Text>
      <Text style={[styles.stepDescription, { color: palette.textTertiary }]}>Choose a visual identity for your coach.</Text>
      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: palette.textSecondary }]}>Icon</Text>
        <View style={styles.grid}>
          {COACH_ICONS.map((icon) => (
            <TouchableOpacity key={icon} style={[styles.gridItem, { backgroundColor: selectedIcon === icon ? selectedColor : palette.cardBg, borderColor: selectedIcon === icon ? 'transparent' : palette.border }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedIcon(icon); }}>
              <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={22} color={selectedIcon === icon ? '#FFFFFF' : palette.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: palette.textSecondary }]}>Color</Text>
        <View style={styles.colorRow}>
          {COACH_COLORS.map((color) => (
            <TouchableOpacity key={color} style={[styles.colorSwatch, { backgroundColor: color }, selectedColor === color && { borderColor: palette.textPrimary }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedColor(color); }}>
              {selectedColor === color && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Animated.View>
  );

  const renderStepFive = () => (
    <Animated.View entering={FadeInUp.duration(350)} key="step5">
      <Text style={[styles.stepHeading, { color: palette.textPrimary }]}>Review</Text>
      <Text style={[styles.stepDescription, { color: palette.textTertiary }]}>Everything look good? Go back to edit any step.</Text>
      <View style={[styles.reviewCard, { backgroundColor: palette.cardBg, borderColor: palette.border }, Shadows.sm]}>
        <View style={styles.reviewHeader}>
          <View style={[styles.reviewIcon, { backgroundColor: selectedColor }]}>
            <Ionicons name={selectedIcon as keyof typeof Ionicons.glyphMap} size={24} color="#FFFFFF" />
          </View>
          <View style={styles.reviewMeta}>
            <Text style={[styles.reviewName, { color: palette.textPrimary }]}>{name}</Text>
            {tagline ? <Text style={[styles.reviewTagline, { color: palette.textTertiary }]}>{tagline}</Text> : null}
          </View>
        </View>
        <View style={[styles.reviewDivider, { backgroundColor: palette.borderLight }]} />
        <Text style={[styles.reviewSectionTitle, { color: palette.textSecondary }]}>Method</Text>
        <Text style={[styles.reviewBody, { color: palette.textTertiary }]} numberOfLines={3}>{method}</Text>
        <Text style={[styles.reviewSectionTitle, { color: palette.textSecondary, marginTop: Spacing.lg }]}>System Prompt</Text>
        <Text style={[styles.reviewBody, { color: palette.textTertiary }]} numberOfLines={4}>{systemPrompt || generatedPrompt}</Text>
      </View>
    </Animated.View>
  );

  const renderStep = () => {
    switch (step) {
      case 1: return renderStepOne();
      case 2: return renderStepTwo();
      case 3: return renderStepThree();
      case 4: return renderStepFour();
      case 5: return renderStepFive();
      default: return null;
    }
  };

  if (!isOracle) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.gateContainer}>
          <Animated.View entering={FadeIn.duration(400)} style={styles.gateContent}>
            <Ionicons name="lock-closed" size={48} color={palette.accent} />
            <Text style={[styles.gateTitle, { color: palette.textPrimary }]}>Oracle Tier Required</Text>
            <Text style={[styles.gateBody, { color: palette.textTertiary }]}>
              Custom coach creation is available exclusively for Oracle members.
            </Text>
            <TouchableOpacity style={[styles.gateButton, { backgroundColor: palette.accent }]} onPress={() => router.back()}>
              <Text style={[styles.gateButtonText, { color: palette.textInverse }]}>Go Back</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: palette.borderLight }]}>
        <TouchableOpacity style={styles.headerBack} onPress={handleBack}>
          <Ionicons name={step === 1 ? 'close' : 'chevron-back'} size={24} color={palette.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Create Coach</Text>
        <Text style={[styles.headerStep, { color: palette.textTertiary }]}>{step} / {TOTAL_STEPS}</Text>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressTrack, { backgroundColor: palette.borderLight }]}>
        <Animated.View style={[styles.progressFill, { width: `${(step / TOTAL_STEPS) * 100}%`, backgroundColor: palette.accent }]} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderStep()}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: palette.borderLight, backgroundColor: palette.background }]}>
          {step < TOTAL_STEPS ? (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: palette.accent, opacity: canContinue() ? 1 : 0.4 }, Shadows.gold]}
              onPress={handleNext}
              disabled={!canContinue()}
            >
              <Text style={[styles.primaryButtonText, { color: palette.textInverse }]}>Continue</Text>
              <Ionicons name="arrow-forward" size={18} color={palette.textInverse} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: palette.accent, opacity: isCreating ? 0.6 : 1 }, Shadows.gold]}
              onPress={handleCreate}
              disabled={isCreating}
            >
              <Ionicons name="sparkles" size={18} color={palette.textInverse} />
              <Text style={[styles.primaryButtonText, { color: palette.textInverse }]}>
                {isCreating ? 'Creating...' : 'Create Coach'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  // Gate screen
  gateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: EditorialSpacing.breathingMargin },
  gateContent: { alignItems: 'center', gap: Spacing.lg },
  gateTitle: { fontSize: Typography.sizes.title, fontFamily: Typography.fonts.serif, fontWeight: Typography.weights.bold, marginTop: Spacing.md },
  gateBody: { fontSize: Typography.sizes.body, fontFamily: Typography.fonts.sans, textAlign: 'center', lineHeight: 22 },
  gateButton: { paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xxxl, borderRadius: Radius.pill, marginTop: Spacing.md },
  gateButtonText: { fontSize: Typography.sizes.body, fontFamily: Typography.fonts.sansMedium, fontWeight: Typography.weights.semibold },
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1 },
  headerBack: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: Typography.sizes.title, fontFamily: Typography.fonts.serif, fontWeight: Typography.weights.bold },
  headerStep: { fontSize: Typography.sizes.caption, fontFamily: Typography.fonts.sans, width: 40, textAlign: 'right' },
  // Progress
  progressTrack: { height: 3 },
  progressFill: { height: 3, borderRadius: 2 },
  // Content
  scrollContent: { paddingHorizontal: EditorialSpacing.breathingMargin, paddingTop: EditorialSpacing.sectionGap, paddingBottom: 120 },
  stepHeading: { fontSize: Typography.sizes.headline, fontFamily: Typography.fonts.serif, fontWeight: Typography.weights.bold, marginBottom: Spacing.sm },
  stepDescription: { fontSize: Typography.sizes.body, fontFamily: Typography.fonts.sans, lineHeight: 22, marginBottom: EditorialSpacing.sectionGap },
  // Fields
  fieldGroup: { marginBottom: Spacing.xl },
  label: { fontSize: Typography.sizes.caption, fontFamily: Typography.fonts.sansSemibold, fontWeight: Typography.weights.semibold, letterSpacing: Typography.letterSpacing.wide, textTransform: 'uppercase', marginBottom: Spacing.sm },
  input: { borderWidth: 1, borderRadius: Radius.lg, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, fontSize: Typography.sizes.body, fontFamily: Typography.fonts.sans },
  inputMultiline: { height: 130, paddingTop: Spacing.md },
  inputLarge: { height: 200, paddingTop: Spacing.md },
  // Grid (icons)
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  gridItem: { width: 46, height: 46, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  // Colors
  colorRow: { flexDirection: 'row', gap: Spacing.md },
  colorSwatch: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'transparent' },
  // Review
  reviewCard: { borderRadius: Radius.squircle, padding: EditorialSpacing.cardPadding, borderWidth: 1 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  reviewIcon: { width: 52, height: 52, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  reviewMeta: { flex: 1 },
  reviewName: { fontSize: Typography.sizes.subtitle, fontFamily: Typography.fonts.serif, fontWeight: Typography.weights.bold },
  reviewTagline: { fontSize: Typography.sizes.body, fontFamily: Typography.fonts.sans, marginTop: 2 },
  reviewDivider: { height: 1, marginVertical: Spacing.lg },
  reviewSectionTitle: { fontSize: Typography.sizes.caption, fontFamily: Typography.fonts.sansSemibold, fontWeight: Typography.weights.semibold, letterSpacing: Typography.letterSpacing.wide, textTransform: 'uppercase', marginBottom: Spacing.sm },
  reviewBody: { fontSize: Typography.sizes.body, fontFamily: Typography.fonts.sans, lineHeight: 22 },
  // Footer
  footer: { paddingHorizontal: EditorialSpacing.breathingMargin, paddingVertical: Spacing.lg, borderTopWidth: 1 },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg, borderRadius: Radius.pill },
  primaryButtonText: { fontSize: Typography.sizes.bodyLarge, fontFamily: Typography.fonts.sansSemibold, fontWeight: Typography.weights.semibold },
});
