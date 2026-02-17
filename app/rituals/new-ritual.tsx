// New Ritual Screen - Create a new daily ritual
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { PremiumPageTransition } from '@/components/ui/PremiumPageTransition';
import Animated, {
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withSequence,
} from 'react-native-reanimated';
import { Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { useAlert } from '@/contexts/AlertContext';
import { Button } from '@/components/ui/Button';
import { useAuthSafe } from '@/hooks/useConditionalAuth';
import { createRitual, getGrowthChapters } from '@/lib/supabase-rituals';
import { GrowthChapter } from '@/types';

// Ritual icons
const RITUAL_ICONS = [
  'sunny', 'moon', 'water', 'leaf', 'heart', 'fitness',
  'book', 'pencil', 'bulb', 'timer', 'walk', 'musical-notes',
  'cafe', 'bed', 'medkit', 'cellular', 'sparkles', 'flame',
] as const;

// Ritual colors
const RITUAL_COLORS = [
  '#C5A059', // Burnished Gold
  '#1B3022', // Midnight Emerald
  '#E07A5F', // Terracotta
  '#5D4E6D', // Purple Sage
  '#3D5A80', // Ocean Blue
  '#81B29A', // Sage Green
] as const;

export default function NewRitualScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ chapterId?: string }>();
  const { palette } = useThemeSafe();
  const { showToast } = useAlert();
  const auth = useAuthSafe();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string>(RITUAL_ICONS[0]);
  const [selectedColor, setSelectedColor] = useState<string>(RITUAL_COLORS[0]);
  const [linkedChapterId, setLinkedChapterId] = useState<string | null>(params.chapterId || null);
  const [chapters, setChapters] = useState<GrowthChapter[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const successScale = useSharedValue(0);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
        successTimeoutRef.current = null;
      }
    };
  }, []);

  const loadChapters = useCallback(async () => {
    if (!auth?.user?.id) return;
    try {
      const data = await getGrowthChapters(auth.user.id, 'active');
      setChapters(data);
    } catch (error) {
      console.error('Error loading chapters:', error);
    }
  }, [auth?.user?.id]);

  useEffect(() => {
    void loadChapters();
  }, [loadChapters]);

  const handleCreate = async () => {
    if (!auth?.user?.id || !title.trim()) return;

    setIsCreating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const result = await createRitual(auth.user.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        icon: selectedIcon,
        color: selectedColor,
        frequency: 'daily',
        linked_chapter_id: linkedChapterId || undefined,
        is_active: true,
        order_index: 0,
      });

      if (result) {
        setShowSuccess(true);
        successScale.value = withSequence(
          withSpring(1.2, Timing.springBouncy),
          withSpring(1, Timing.springGentle)
        );
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        successTimeoutRef.current = setTimeout(() => {
          router.back();
        }, 1500);
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast('Unable to save ritual', {
        variant: 'error',
        message: 'Ritual storage is unavailable. Run latest Supabase migrations, then try again.',
      });
    } catch (error) {
      console.error('Error creating ritual:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast('Ritual creation failed', {
        variant: 'error',
        message: 'Please try again in a moment.',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const successStyle = useAnimatedStyle(() => ({
    transform: [{ scale: successScale.value }],
  }));

  return (
    <PremiumPageTransition>
      {showSuccess ? (
        <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
          <View style={styles.successContainer}>
            <Animated.View style={[styles.successIcon, successStyle]}>
              <Ionicons name="checkmark-circle" size={80} color={palette.success} />
            </Animated.View>
            <Text style={[styles.successTitle, { color: palette.textPrimary }]}>Ritual Created!</Text>
            <Text style={[styles.successSubtitle, { color: palette.textTertiary }]}>
              Your new daily ritual has been added
            </Text>
          </View>
        </SafeAreaView>
      ) : (
        <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: palette.borderLight }]}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
            >
              <Ionicons name="close" size={24} color={palette.textSecondary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>New Ritual</Text>
            <View style={styles.headerSpacer} />
          </View>

          <KeyboardAvoidingView
            style={styles.keyboardView}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}
            >
              {/* Preview Card */}
              <Animated.View entering={FadeInUp.duration(400)} style={styles.previewSection}>
                <Text style={[styles.sectionLabel, { color: palette.textTertiary }]}>Preview</Text>
                <View style={[styles.previewCard, { backgroundColor: palette.cardBg, borderLeftColor: selectedColor }]}>
                  <View style={[styles.previewIcon, { backgroundColor: selectedColor + '20' }]}>
                    <Ionicons
                      name={selectedIcon as keyof typeof Ionicons.glyphMap}
                      size={20}
                      color={selectedColor}
                    />
                  </View>
                  <View style={styles.previewContent}>
                    <Text style={[styles.previewTitle, { color: palette.textSecondary }]} numberOfLines={1}>
                      {title || 'Your ritual name'}
                    </Text>
                    {description ? (
                      <Text style={[styles.previewDescription, { color: palette.textTertiary }]} numberOfLines={1}>
                        {description}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </Animated.View>

              {/* Title Input */}
              <Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.inputSection}>
                <Text style={[styles.inputLabel, { color: palette.textSecondary }]}>Ritual Name *</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: palette.cardBg, borderColor: palette.border, color: palette.textSecondary }]}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g., Morning Meditation"
                  placeholderTextColor={palette.textTertiary}
                  maxLength={50}
                />
              </Animated.View>

              {/* Description Input */}
              <Animated.View entering={FadeInUp.duration(400).delay(150)} style={styles.inputSection}>
                <Text style={[styles.inputLabel, { color: palette.textSecondary }]}>Description (optional)</Text>
                <TextInput
                  style={[styles.textInput, styles.textInputMultiline, { backgroundColor: palette.cardBg, borderColor: palette.border, color: palette.textSecondary }]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="What does this ritual involve?"
                  placeholderTextColor={palette.textTertiary}
                  multiline
                  numberOfLines={3}
                  maxLength={150}
                />
              </Animated.View>

              {/* Icon Picker */}
              <Animated.View entering={FadeInUp.duration(400).delay(200)} style={styles.inputSection}>
                <Text style={[styles.inputLabel, { color: palette.textSecondary }]}>Icon</Text>
                <View style={styles.iconPicker}>
                  {RITUAL_ICONS.map((icon) => (
                    <TouchableOpacity
                      key={icon}
                      style={[
                        styles.iconOption,
                        { backgroundColor: palette.cardBg, borderColor: palette.border },
                        selectedIcon === icon && [styles.iconOptionSelected, { backgroundColor: selectedColor }],
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedIcon(icon);
                      }}
                    >
                      <Ionicons
                        name={icon as keyof typeof Ionicons.glyphMap}
                        size={20}
                        color={selectedIcon === icon ? palette.textInverse : palette.textSecondary}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </Animated.View>

              {/* Color Picker */}
              <Animated.View entering={FadeInUp.duration(400).delay(250)} style={styles.inputSection}>
                <Text style={[styles.inputLabel, { color: palette.textSecondary }]}>Color</Text>
                <View style={styles.colorPicker}>
                  {RITUAL_COLORS.map((color) => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.colorOption,
                        { backgroundColor: color },
                        selectedColor === color && { borderColor: palette.textSecondary },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setSelectedColor(color);
                      }}
                    >
                      {selectedColor === color && (
                        <Ionicons name="checkmark" size={18} color={palette.textInverse} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </Animated.View>

              {/* Link to Chapter (optional) */}
              {chapters.length > 0 && (
                <Animated.View entering={FadeInUp.duration(400).delay(300)} style={styles.inputSection}>
                  <Text style={[styles.inputLabel, { color: palette.textSecondary }]}>Link to Growth Chapter (optional)</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.chapterPicker}
                  >
                    <TouchableOpacity
                      style={[
                        styles.chapterOption,
                        { backgroundColor: palette.cardBg, borderColor: palette.border },
                        !linkedChapterId && { backgroundColor: palette.textPrimary, borderColor: palette.textPrimary },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setLinkedChapterId(null);
                      }}
                    >
                      <Text style={[
                        styles.chapterOptionText,
                        { color: palette.textSecondary },
                        !linkedChapterId && { color: palette.textInverse, fontWeight: Typography.weights.medium },
                      ]}>
                        None
                      </Text>
                    </TouchableOpacity>
                    {chapters.map((chapter) => (
                      <TouchableOpacity
                        key={chapter.id}
                        style={[
                          styles.chapterOption,
                          { backgroundColor: palette.cardBg, borderColor: chapter.cover_color || palette.border },
                          linkedChapterId === chapter.id && { backgroundColor: palette.textPrimary, borderColor: palette.textPrimary },
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setLinkedChapterId(chapter.id);
                        }}
                      >
                        <Text style={[
                          styles.chapterOptionText,
                          { color: palette.textSecondary },
                          linkedChapterId === chapter.id && { color: palette.textInverse, fontWeight: Typography.weights.medium },
                        ]} numberOfLines={1}>
                          {chapter.title}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </Animated.View>
              )}

              {/* Create Button */}
              <Animated.View entering={FadeInUp.duration(400).delay(350)} style={styles.buttonSection}>
                <Button
                  title={isCreating ? 'Creating...' : 'Create Ritual'}
                  onPress={handleCreate}
                  variant="gold"
                  fullWidth
                  size="lg"
                  disabled={!title.trim() || isCreating}
                />
              </Animated.View>

              <View style={styles.bottomSpacer} />
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      )}
    </PremiumPageTransition>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
  },
  headerSpacer: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xl,
  },
  previewSection: {
    marginBottom: Spacing.xl,
  },
  sectionLabel: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    letterSpacing: Typography.letterSpacing.wide,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: Radius.squircle,
    borderLeftWidth: 4,
    ...Shadows.sm,
  },
  previewIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  previewContent: {
    flex: 1,
  },
  previewTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.medium,
  },
  previewDescription: {
    fontSize: Typography.sizes.body,
    marginTop: 2,
  },
  inputSection: {
    marginBottom: Spacing.xl,
  },
  inputLabel: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    letterSpacing: Typography.letterSpacing.wide,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    fontSize: Typography.sizes.body,
  },
  textInputMultiline: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: Spacing.md,
  },
  iconPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  iconOptionSelected: {
    borderColor: 'transparent',
  },
  colorPicker: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  chapterPicker: {
    marginHorizontal: -Spacing.xxl,
    paddingHorizontal: Spacing.xxl,
  },
  chapterOption: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    marginRight: Spacing.sm,
    borderWidth: 1,
  },
  chapterOptionText: {
    fontSize: Typography.sizes.body,
  },
  buttonSection: {
    marginTop: Spacing.lg,
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxxl,
  },
  successIcon: {
    marginBottom: Spacing.xl,
  },
  successTitle: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    marginBottom: Spacing.sm,
  },
  successSubtitle: {
    fontSize: Typography.sizes.body,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 100,
  },
});
