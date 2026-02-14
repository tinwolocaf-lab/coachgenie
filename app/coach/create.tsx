import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useAlert } from '@/contexts/AlertContext';
import { Typography, Spacing, Radius, EditorialSpacing, Shadows } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import {
  createCoachDraft,
  getCoachByIdResolved,
  publishCoach,
  unpublishCoach,
  updateCoach,
  uploadCoachImage,
} from '@/lib/coaches';

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
  const { coachId } = useLocalSearchParams<{ coachId?: string }>();
  const { palette, subscriptionTier } = useThemeSafe();
  const { showToast, showAlert } = useAlert();

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [method, setMethod] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string>(COACH_ICONS[0]);
  const [selectedColor, setSelectedColor] = useState<string>(COACH_COLORS[0]);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const [isLoadingCoach, setIsLoadingCoach] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  const canCreate = subscriptionTier === 'sovereign' || subscriptionTier === 'oracle';
  const isEditing = Boolean(coachId);

  const generatedPrompt = useMemo(
    () => generateSystemPrompt(name, tagline, method),
    [name, tagline, method],
  );

  useEffect(() => {
    if (!coachId) return;

    let mounted = true;
    const loadCoach = async () => {
      setIsLoadingCoach(true);
      try {
        const coach = await getCoachByIdResolved(coachId);
        if (!mounted || !coach) return;

        setName(coach.name || '');
        setTagline(coach.tagline || '');
        setDescription(coach.description || '');
        setMethod(coach.method || '');
        setSystemPrompt(coach.system_prompt || '');
        setSelectedIcon(coach.icon_name || COACH_ICONS[0]);
        setSelectedColor(coach.color || COACH_COLORS[0]);
        setImageUrl(coach.image_url ?? null);
        setIsPublished(Boolean(coach.is_public && coach.marketplace_status === 'published'));
      } catch (error) {
        showToast('Error', { variant: 'error', message: error instanceof Error ? error.message : 'Failed to load coach.' });
      } finally {
        if (mounted) setIsLoadingCoach(false);
      }
    };

    void loadCoach();
    return () => {
      mounted = false;
    };
  }, [coachId, showToast]);

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

  const handlePickImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showAlert('Permission required', 'Photo library permission is required to upload coach images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: true,
        aspect: [1, 1],
      });

      if (result.canceled || !result.assets?.[0]?.uri) {
        return;
      }

      const pickedUri = result.assets[0].uri;
      setImageUri(pickedUri);
      setIsUploadingImage(true);

      const uploaded = await uploadCoachImage(pickedUri);
      setImagePath(uploaded.path);
      setImageUrl(uploaded.url);
      showToast('Image uploaded', { variant: 'success', message: 'Coach image uploaded successfully.' });
    } catch (error) {
      showToast('Upload failed', { variant: 'error', message: error instanceof Error ? error.message : 'Unable to upload image.' });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!canCreate) {
      showAlert('Upgrade required', 'Custom coach creation is available on Sovereign and Oracle plans.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'View plans', onPress: () => router.push('/paywall') },
      ]);
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const finalPrompt = (systemPrompt || generatedPrompt).trim();
      const payload = {
        name: name.trim(),
        tagline: tagline.trim(),
        description: description.trim() || method.trim(),
        method: method.trim(),
        systemPrompt: finalPrompt,
        iconName: selectedIcon,
        color: selectedColor,
        imagePath,
        imageUrl,
      };

      if (isEditing && coachId) {
        await updateCoach(coachId, payload);
        showToast('Saved', { variant: 'success', message: 'Coach updated.' });
      } else {
        await createCoachDraft(payload);
        showToast('Created', { variant: 'success', message: 'Coach draft created.' });
      }

      router.back();
    } catch (err) {
      showToast('Error', { variant: 'error', message: err instanceof Error ? err.message : 'Failed to save coach.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublishToggle = async () => {
    if (!coachId) return;

    try {
      setIsSaving(true);
      if (isPublished) {
        await unpublishCoach(coachId);
        setIsPublished(false);
        showToast('Unpublished', { variant: 'success', message: 'Coach removed from marketplace.' });
      } else {
        await publishCoach(coachId);
        setIsPublished(true);
        showToast('Published', { variant: 'success', message: 'Coach is now in marketplace.' });
      }
    } catch (error) {
      showToast('Failed', { variant: 'error', message: error instanceof Error ? error.message : 'Try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const inputStyle = [styles.input, { backgroundColor: palette.cardBg, borderColor: palette.border, color: palette.textPrimary }];

  const renderStepOne = () => (
    <Animated.View entering={FadeInUp.duration(350)} key="step1">
      <Text style={[styles.stepHeading, { color: palette.textPrimary }]}>Name your coach</Text>
      <Text style={[styles.stepDescription, { color: palette.textTertiary }]}>Give your coach a distinctive name, tagline, and short description.</Text>
      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: palette.textSecondary }]}>Name *</Text>
        <TextInput style={inputStyle} value={name} onChangeText={setName} placeholder="e.g., The Strategist" placeholderTextColor={palette.textTertiary} maxLength={40} />
      </View>
      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: palette.textSecondary }]}>Tagline</Text>
        <TextInput style={inputStyle} value={tagline} onChangeText={setTagline} placeholder="e.g., Clarity through structured thinking" placeholderTextColor={palette.textTertiary} maxLength={80} />
      </View>
      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: palette.textSecondary }]}>Description</Text>
        <TextInput style={[...inputStyle, styles.inputMultiline]} value={description} onChangeText={setDescription} placeholder="What this coach helps people achieve" placeholderTextColor={palette.textTertiary} multiline numberOfLines={4} maxLength={320} textAlignVertical="top" />
      </View>
    </Animated.View>
  );

  const renderStepTwo = () => (
    <Animated.View entering={FadeInUp.duration(350)} key="step2">
      <Text style={[styles.stepHeading, { color: palette.textPrimary }]}>Coaching method</Text>
      <Text style={[styles.stepDescription, { color: palette.textTertiary }]}>What frameworks, philosophies, or techniques does this coach use?</Text>
      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: palette.textSecondary }]}>Method / Approach *</Text>
        <TextInput style={[...inputStyle, styles.inputMultiline]} value={method} onChangeText={setMethod} placeholder="Describe the coaching style and approach..." placeholderTextColor={palette.textTertiary} multiline numberOfLines={6} maxLength={900} textAlignVertical="top" />
      </View>
    </Animated.View>
  );

  const renderStepThree = () => (
    <Animated.View entering={FadeInUp.duration(350)} key="step3">
      <Text style={[styles.stepHeading, { color: palette.textPrimary }]}>System prompt</Text>
      <Text style={[styles.stepDescription, { color: palette.textTertiary }]}>This defines your coach&apos;s personality. Generated from your inputs and fully editable.</Text>
      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: palette.textSecondary }]}>Prompt</Text>
        <TextInput style={[...inputStyle, styles.inputLarge]} value={systemPrompt || generatedPrompt} onChangeText={setSystemPrompt} multiline numberOfLines={10} maxLength={6000} textAlignVertical="top" />
      </View>
    </Animated.View>
  );

  const renderStepFour = () => (
    <Animated.View entering={FadeInUp.duration(350)} key="step4">
      <Text style={[styles.stepHeading, { color: palette.textPrimary }]}>Visual identity</Text>
      <Text style={[styles.stepDescription, { color: palette.textTertiary }]}>Choose icon, color, and optional image.</Text>

      <View style={styles.fieldGroup}>
        <Text style={[styles.label, { color: palette.textSecondary }]}>Coach image</Text>
        <TouchableOpacity style={[styles.imageUploadCard, { borderColor: palette.border, backgroundColor: palette.cardBg }]} onPress={handlePickImage}>
          {isUploadingImage ? (
            <ActivityIndicator size="small" color={palette.accent} />
          ) : imageUri || imageUrl ? (
            <Image source={{ uri: imageUri || imageUrl || '' }} style={styles.uploadedImage} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={28} color={palette.textTertiary} />
              <Text style={[styles.imageUploadText, { color: palette.textTertiary }]}>Tap to upload image</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

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

        {imageUri || imageUrl ? (
          <Image source={{ uri: imageUri || imageUrl || '' }} style={styles.reviewImage} />
        ) : null}

        <View style={[styles.reviewDivider, { backgroundColor: palette.borderLight }]} />
        <Text style={[styles.reviewSectionTitle, { color: palette.textSecondary }]}>Description</Text>
        <Text style={[styles.reviewBody, { color: palette.textTertiary }]} numberOfLines={3}>{description || method}</Text>
        <Text style={[styles.reviewSectionTitle, { color: palette.textSecondary, marginTop: Spacing.lg }]}>Method</Text>
        <Text style={[styles.reviewBody, { color: palette.textTertiary }]} numberOfLines={4}>{method}</Text>
        <Text style={[styles.reviewSectionTitle, { color: palette.textSecondary, marginTop: Spacing.lg }]}>System Prompt</Text>
        <Text style={[styles.reviewBody, { color: palette.textTertiary }]} numberOfLines={5}>{systemPrompt || generatedPrompt}</Text>
      </View>

      {isEditing && coachId ? (
        <TouchableOpacity
          style={[styles.publishButton, { borderColor: palette.border, backgroundColor: palette.cardBg }]}
          onPress={() => {
            void handlePublishToggle();
          }}
          disabled={isSaving}
        >
          <Ionicons name={isPublished ? 'eye-off-outline' : 'earth-outline'} size={18} color={palette.accent} />
          <Text style={[styles.publishButtonText, { color: palette.accent }]}>{isPublished ? 'Unpublish from marketplace' : 'Publish to marketplace'}</Text>
        </TouchableOpacity>
      ) : null}
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

  if (!canCreate) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.gateContainer}>
          <Animated.View entering={FadeIn.duration(400)} style={styles.gateContent}>
            <Ionicons name="lock-closed" size={48} color={palette.accent} />
            <Text style={[styles.gateTitle, { color: palette.textPrimary }]}>Sovereign or Oracle Required</Text>
            <Text style={[styles.gateBody, { color: palette.textTertiary }]}>Custom coach creation is available on Sovereign and Oracle plans.</Text>
            <TouchableOpacity style={[styles.gateButton, { backgroundColor: palette.accent }]} onPress={() => router.push('/paywall')}>
              <Text style={[styles.gateButtonText, { color: palette.textInverse }]}>View Plans</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoadingCoach) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.gateContainer}>
          <ActivityIndicator size="small" color={palette.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: palette.borderLight }]}> 
        <TouchableOpacity style={styles.headerBack} onPress={handleBack}>
          <Ionicons name={step === 1 ? 'close' : 'chevron-back'} size={24} color={palette.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>{isEditing ? 'Edit Coach' : 'Create Coach'}</Text>
        <Text style={[styles.headerStep, { color: palette.textTertiary }]}>{step} / {TOTAL_STEPS}</Text>
      </View>

      <View style={[styles.progressTrack, { backgroundColor: palette.borderLight }]}> 
        <Animated.View style={[styles.progressFill, { width: `${(step / TOTAL_STEPS) * 100}%`, backgroundColor: palette.accent }]} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {renderStep()}
        </ScrollView>

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
              style={[styles.primaryButton, { backgroundColor: palette.accent, opacity: isSaving ? 0.6 : 1 }, Shadows.gold]}
              onPress={() => {
                void handleSaveDraft();
              }}
              disabled={isSaving}
            >
              <Ionicons name="sparkles" size={18} color={palette.textInverse} />
              <Text style={[styles.primaryButtonText, { color: palette.textInverse }]}>{isSaving ? 'Saving...' : isEditing ? 'Save Coach' : 'Create Coach'}</Text>
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
  gateContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: EditorialSpacing.breathingMargin },
  gateContent: { alignItems: 'center', gap: Spacing.lg },
  gateTitle: { fontSize: Typography.sizes.title, fontFamily: Typography.fonts.serif, fontWeight: Typography.weights.bold, marginTop: Spacing.md },
  gateBody: { fontSize: Typography.sizes.body, fontFamily: Typography.fonts.sans, textAlign: 'center', lineHeight: 22 },
  gateButton: { paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xxxl, borderRadius: Radius.pill, marginTop: Spacing.md },
  gateButtonText: { fontSize: Typography.sizes.body, fontFamily: Typography.fonts.sansMedium, fontWeight: Typography.weights.semibold },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderBottomWidth: 1 },
  headerBack: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: Typography.sizes.title, fontFamily: Typography.fonts.serif, fontWeight: Typography.weights.bold },
  headerStep: { fontSize: Typography.sizes.caption, fontFamily: Typography.fonts.sans, width: 40, textAlign: 'right' },
  progressTrack: { height: 3 },
  progressFill: { height: 3, borderRadius: 2 },
  scrollContent: { paddingHorizontal: EditorialSpacing.breathingMargin, paddingTop: EditorialSpacing.sectionGap, paddingBottom: 120 },
  stepHeading: { fontSize: Typography.sizes.headline, fontFamily: Typography.fonts.serif, fontWeight: Typography.weights.bold, marginBottom: Spacing.sm },
  stepDescription: { fontSize: Typography.sizes.body, fontFamily: Typography.fonts.sans, lineHeight: 22, marginBottom: EditorialSpacing.sectionGap },
  fieldGroup: { marginBottom: Spacing.xl },
  label: { fontSize: Typography.sizes.caption, fontFamily: Typography.fonts.sansSemibold, fontWeight: Typography.weights.semibold, letterSpacing: Typography.letterSpacing.wide, textTransform: 'uppercase', marginBottom: Spacing.sm },
  input: { borderWidth: 1, borderRadius: Radius.lg, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg, fontSize: Typography.sizes.body, fontFamily: Typography.fonts.sans },
  inputMultiline: { height: 130, paddingTop: Spacing.md },
  inputLarge: { height: 220, paddingTop: Spacing.md },
  imageUploadCard: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  uploadedImage: {
    width: '100%',
    height: 180,
  },
  imagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  imageUploadText: {
    fontSize: Typography.sizes.caption,
    fontFamily: Typography.fonts.sans,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  gridItem: { width: 46, height: 46, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  colorRow: { flexDirection: 'row', gap: Spacing.md, flexWrap: 'wrap' },
  colorSwatch: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'transparent' },
  reviewCard: { borderRadius: Radius.squircle, padding: EditorialSpacing.cardPadding, borderWidth: 1 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  reviewIcon: { width: 52, height: 52, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  reviewMeta: { flex: 1 },
  reviewName: { fontSize: Typography.sizes.subtitle, fontFamily: Typography.fonts.serif, fontWeight: Typography.weights.bold },
  reviewTagline: { fontSize: Typography.sizes.body, fontFamily: Typography.fonts.sans, marginTop: 2 },
  reviewImage: {
    width: '100%',
    height: 180,
    borderRadius: Radius.md,
    marginTop: Spacing.lg,
  },
  reviewDivider: { height: 1, marginVertical: Spacing.lg },
  reviewSectionTitle: { fontSize: Typography.sizes.caption, fontFamily: Typography.fonts.sansSemibold, fontWeight: Typography.weights.semibold, letterSpacing: Typography.letterSpacing.wide, textTransform: 'uppercase', marginBottom: Spacing.sm },
  reviewBody: { fontSize: Typography.sizes.body, fontFamily: Typography.fonts.sans, lineHeight: 22 },
  publishButton: {
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  publishButtonText: {
    fontSize: Typography.sizes.body,
    fontFamily: Typography.fonts.sansSemibold,
  },
  footer: { paddingHorizontal: EditorialSpacing.breathingMargin, paddingVertical: Spacing.lg, borderTopWidth: 1 },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg, borderRadius: Radius.pill },
  primaryButtonText: { fontSize: Typography.sizes.bodyLarge, fontFamily: Typography.fonts.sansSemibold, fontWeight: Typography.weights.semibold },
});
