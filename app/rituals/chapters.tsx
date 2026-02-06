// Growth Chapters - Vision Board Interface
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { FluidProgressBar } from '@/components/rituals/FluidProgressBar';
import { isSupabaseConfigured } from '@/lib/supabase';
import {
  getGrowthChapters,
  createGrowthChapter,
  updateGrowthChapter,
} from '@/lib/supabase-rituals';
import { GrowthChapter } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Chapter colors palette
const CHAPTER_COLORS = [
  '#1B3022', // Midnight Emerald
  '#2C4A3E', // Forest
  '#5D4E6D', // Purple Sage
  '#8B4513', // Saddle Brown
  '#4A5568', // Slate
  '#744210', // Amber Dark
] as const;

// Chapter icons
const CHAPTER_ICONS = [
  'flag', 'star', 'rocket', 'bulb', 'heart', 'leaf',
  'compass', 'diamond', 'trophy', 'ribbon', 'medal', 'flame',
] as const;

// Dynamic auth hook
const getAuthHook = () => {
  if (isSupabaseConfigured) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require('@fastshot/auth').useAuth;
    } catch {
      return null;
    }
  }
  return null;
};

export default function GrowthChaptersScreen() {
  const router = useRouter();
  const useAuth = getAuthHook();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const auth = useAuth && isSupabaseConfigured ? useAuth() : null;

  const [chapters, setChapters] = useState<GrowthChapter[]>([]);
  const [showNewChapterModal, setShowNewChapterModal] = useState(false);
  const [newChapter, setNewChapter] = useState<{
    title: string;
    vision: string;
    why_it_matters: string;
    cover_color: string;
    icon: string;
    is_primary: boolean;
  }>({
    title: '',
    vision: '',
    why_it_matters: '',
    cover_color: CHAPTER_COLORS[0],
    icon: CHAPTER_ICONS[0],
    is_primary: false,
  });
  const [isCreating, setIsCreating] = useState(false);

  const loadChapters = useCallback(async () => {
    if (!auth?.user?.id) return;

    try {
      const data = await getGrowthChapters(auth.user.id);
      setChapters(data);
    } catch (error) {
      console.error('Error loading chapters:', error);
    }
  }, [auth?.user?.id]);

  useEffect(() => {
    loadChapters();
  }, [loadChapters]);

  const handleCreateChapter = async () => {
    if (!auth?.user?.id || !newChapter.title.trim()) return;

    setIsCreating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const chapter = await createGrowthChapter(auth.user.id, {
        title: newChapter.title.trim(),
        vision: newChapter.vision.trim() || undefined,
        why_it_matters: newChapter.why_it_matters.trim() || undefined,
        cover_color: newChapter.cover_color,
        icon: newChapter.icon,
        is_primary: chapters.length === 0 || newChapter.is_primary,
        status: 'active',
      });

      if (chapter) {
        await loadChapters();
        setShowNewChapterModal(false);
        setNewChapter({
          title: '',
          vision: '',
          why_it_matters: '',
          cover_color: CHAPTER_COLORS[0],
          icon: CHAPTER_ICONS[0],
          is_primary: false,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error creating chapter:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleChapterPress = (chapter: GrowthChapter) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/rituals',
      params: { chapterId: chapter.id },
    });
  };

  const handleSetPrimary = async (chapter: GrowthChapter) => {
    if (!auth?.user?.id || chapter.is_primary) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Set all others to non-primary
      for (const c of chapters) {
        if (c.is_primary && c.id !== chapter.id) {
          await updateGrowthChapter(c.id, { is_primary: false });
        }
      }

      // Set this one as primary
      await updateGrowthChapter(chapter.id, { is_primary: true });
      await loadChapters();
    } catch (error) {
      console.error('Error setting primary chapter:', error);
    }
  };

  const handleBackPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const activeChapters = chapters.filter(c => c.status === 'active');
  const completedChapters = chapters.filter(c => c.status === 'completed');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Ionicons name="chevron-back" size={24} color={Colors.midnightEmerald} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Growth Chapters</Text>
          <Text style={styles.headerSubtitle}>Your journey, chapter by chapter</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowNewChapterModal(true)}
        >
          <Ionicons name="add" size={24} color={Colors.burnishedGold} />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Vision Board Grid */}
        {activeChapters.length > 0 ? (
          <Animated.View entering={FadeInUp.duration(400).delay(100)}>
            <Text style={styles.sectionTitle}>Active Chapters</Text>
            <View style={styles.chaptersGrid}>
              {activeChapters.map((chapter, index) => (
                <ChapterCard
                  key={chapter.id}
                  chapter={chapter}
                  index={index}
                  onPress={() => handleChapterPress(chapter)}
                  onLongPress={() => handleSetPrimary(chapter)}
                />
              ))}
            </View>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="flag-outline" size={48} color={Colors.stoneGray} />
            </View>
            <Text style={styles.emptyTitle}>Begin Your First Chapter</Text>
            <Text style={styles.emptyText}>
              Growth chapters are your long-term vision areas. Each chapter represents
              a major life theme you&apos;re working on.
            </Text>
            <Button
              title="Create Chapter"
              onPress={() => setShowNewChapterModal(true)}
              variant="gold"
              style={{ marginTop: Spacing.xl }}
            />
          </Animated.View>
        )}

        {/* Completed Chapters */}
        {completedChapters.length > 0 && (
          <Animated.View entering={FadeInUp.duration(400).delay(200)} style={styles.completedSection}>
            <Text style={styles.sectionTitle}>Completed</Text>
            {completedChapters.map((chapter, index) => (
              <CompletedChapterRow
                key={chapter.id}
                chapter={chapter}
                index={index}
                onPress={() => handleChapterPress(chapter)}
              />
            ))}
          </Animated.View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* New Chapter Modal */}
      <Modal
        visible={showNewChapterModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNewChapterModal(false)}
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowNewChapterModal(false)}
            >
              <Ionicons name="close" size={24} color={Colors.charcoal} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Chapter</Text>
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={styles.modalContentContainer}
            keyboardShouldPersistTaps="handled"
          >
            {/* Preview Card */}
            <View style={styles.previewSection}>
              <ChapterPreview
                title={newChapter.title || 'Your Chapter'}
                color={newChapter.cover_color}
                icon={newChapter.icon}
              />
            </View>

            {/* Title Input */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Chapter Title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Career Growth, Health & Wellness"
                placeholderTextColor={Colors.stoneGray}
                value={newChapter.title}
                onChangeText={(text) => setNewChapter({ ...newChapter, title: text })}
              />
            </View>

            {/* Vision Input */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Your Vision</Text>
              <Text style={styles.inputHint}>What does success look like?</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe where you want to be..."
                placeholderTextColor={Colors.stoneGray}
                value={newChapter.vision}
                onChangeText={(text) => setNewChapter({ ...newChapter, vision: text })}
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* Why It Matters */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Why It Matters</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Why is this chapter important to you?"
                placeholderTextColor={Colors.stoneGray}
                value={newChapter.why_it_matters}
                onChangeText={(text) => setNewChapter({ ...newChapter, why_it_matters: text })}
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* Color Picker */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Cover Color</Text>
              <View style={styles.colorPicker}>
                {CHAPTER_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      newChapter.cover_color === color && styles.colorOptionSelected,
                    ]}
                    onPress={() => setNewChapter({ ...newChapter, cover_color: color })}
                  >
                    {newChapter.cover_color === color && (
                      <Ionicons name="checkmark" size={16} color={Colors.white} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Icon Picker */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Icon</Text>
              <View style={styles.iconPicker}>
                {CHAPTER_ICONS.map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    style={[
                      styles.iconOption,
                      newChapter.icon === icon && styles.iconOptionSelected,
                    ]}
                    onPress={() => setNewChapter({ ...newChapter, icon })}
                  >
                    <Ionicons
                      name={icon as keyof typeof Ionicons.glyphMap}
                      size={20}
                      color={newChapter.icon === icon ? Colors.white : Colors.charcoal}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Primary Toggle */}
            {chapters.length > 0 && (
              <TouchableOpacity
                style={styles.primaryToggle}
                onPress={() => setNewChapter({ ...newChapter, is_primary: !newChapter.is_primary })}
              >
                <View style={styles.primaryToggleContent}>
                  <Ionicons name="star" size={20} color={Colors.burnishedGold} />
                  <View style={styles.primaryToggleText}>
                    <Text style={styles.primaryToggleTitle}>Set as Primary Chapter</Text>
                    <Text style={styles.primaryToggleHint}>
                      Primary chapters appear on your home screen
                    </Text>
                  </View>
                </View>
                <View style={[styles.checkbox, newChapter.is_primary && styles.checkboxChecked]}>
                  {newChapter.is_primary && (
                    <Ionicons name="checkmark" size={14} color={Colors.white} />
                  )}
                </View>
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Create Button */}
          <View style={styles.modalFooter}>
            <Button
              title={isCreating ? 'Creating...' : 'Create Chapter'}
              onPress={handleCreateChapter}
              variant="gold"
              fullWidth
              size="lg"
              disabled={!newChapter.title.trim() || isCreating}
              loading={isCreating}
            />
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// Chapter Card Component
function ChapterCard({
  chapter,
  index,
  onPress,
  onLongPress,
}: {
  chapter: GrowthChapter;
  index: number;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const scale = useSharedValue(1);

  const handlePressIn = () => {
    scale.value = withSpring(0.97, Timing.springGentle);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, Timing.springGentle);
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInUp.duration(400).delay(100 + index * 80)}
      style={animatedStyle}
    >
      <TouchableOpacity
        style={styles.chapterCard}
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <LinearGradient
          colors={[chapter.cover_color, lightenColor(chapter.cover_color, 10)]}
          style={styles.chapterGradient}
        >
          {chapter.is_primary && (
            <View style={styles.primaryBadge}>
              <Ionicons name="star" size={12} color={Colors.burnishedGold} />
            </View>
          )}

          <View style={styles.chapterIcon}>
            <Ionicons
              name={chapter.icon as keyof typeof Ionicons.glyphMap || 'flag'}
              size={24}
              color={Colors.white}
            />
          </View>

          <Text style={styles.chapterTitle} numberOfLines={2}>
            {chapter.title}
          </Text>

          <View style={styles.chapterProgress}>
            <FluidProgressBar
              progress={chapter.progress_percentage}
              height={4}
              color={Colors.white}
              backgroundColor="rgba(255,255,255,0.2)"
              showWave={false}
            />
            <Text style={styles.chapterProgressText}>
              {chapter.progress_percentage}%
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// Completed Chapter Row
function CompletedChapterRow({
  chapter,
  index,
  onPress,
}: {
  chapter: GrowthChapter;
  index: number;
  onPress: () => void;
}) {
  return (
    <Animated.View entering={FadeInUp.duration(300).delay(index * 50)}>
      <TouchableOpacity style={styles.completedRow} onPress={onPress} activeOpacity={0.9}>
        <View style={[styles.completedIcon, { backgroundColor: chapter.cover_color + '20' }]}>
          <Ionicons
            name={chapter.icon as keyof typeof Ionicons.glyphMap || 'checkmark-circle'}
            size={20}
            color={chapter.cover_color}
          />
        </View>
        <View style={styles.completedContent}>
          <Text style={styles.completedTitle}>{chapter.title}</Text>
          <Text style={styles.completedDate}>
            Completed {new Date(chapter.updated_at).toLocaleDateString()}
          </Text>
        </View>
        <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
      </TouchableOpacity>
    </Animated.View>
  );
}

// Chapter Preview for Modal
function ChapterPreview({
  title,
  color,
  icon,
}: {
  title: string;
  color: string;
  icon: string;
}) {
  return (
    <View style={styles.previewCard}>
      <LinearGradient
        colors={[color, lightenColor(color, 10)]}
        style={styles.previewGradient}
      >
        <View style={styles.previewIcon}>
          <Ionicons
            name={icon as keyof typeof Ionicons.glyphMap || 'flag'}
            size={28}
            color={Colors.white}
          />
        </View>
        <Text style={styles.previewTitle} numberOfLines={2}>
          {title}
        </Text>
      </LinearGradient>
    </View>
  );
}

// Helper function
function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
  const B = Math.min(255, (num & 0x0000ff) + amt);
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.warmOatmeal,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    color: Colors.midnightEmerald,
  },
  headerSubtitle: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    color: Colors.midnightEmerald,
    marginBottom: Spacing.lg,
  },

  // Chapters Grid
  chaptersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  chapterCard: {
    width: (SCREEN_WIDTH - Spacing.xxl * 2 - Spacing.md) / 2,
    borderRadius: Radius.squircle,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  chapterGradient: {
    padding: Spacing.lg,
    minHeight: 160,
    justifyContent: 'space-between',
  },
  primaryBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chapterIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  chapterTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    color: Colors.white,
    marginBottom: Spacing.md,
  },
  chapterProgress: {
    gap: Spacing.xs,
  },
  chapterProgressText: {
    fontSize: Typography.sizes.micro,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'right',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.hero,
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.warmOatmealDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    color: Colors.midnightEmerald,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
    textAlign: 'center',
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },

  // Completed Section
  completedSection: {
    marginTop: Spacing.xxxl,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBg,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
    ...Shadows.subtle,
  },
  completedIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  completedContent: {
    flex: 1,
  },
  completedTitle: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.charcoal,
  },
  completedDate: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
    marginTop: 2,
  },
  bottomSpacer: {
    height: 100,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.warmOatmeal,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    color: Colors.charcoal,
  },
  modalContent: {
    flex: 1,
  },
  modalContentContainer: {
    padding: Spacing.xxl,
  },
  previewSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  previewCard: {
    width: 160,
    borderRadius: Radius.squircle,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  previewGradient: {
    padding: Spacing.lg,
    alignItems: 'center',
    minHeight: 140,
    justifyContent: 'center',
  },
  previewIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  previewTitle: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
    textAlign: 'center',
  },
  inputSection: {
    marginBottom: Spacing.xxl,
  },
  inputLabel: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    color: Colors.charcoal,
    marginBottom: Spacing.sm,
  },
  inputHint: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
    marginBottom: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    fontSize: Typography.sizes.body,
    color: Colors.charcoal,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.subtle,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  colorPicker: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorOptionSelected: {
    borderColor: Colors.burnishedGold,
  },
  iconPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.warmOatmealDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOptionSelected: {
    backgroundColor: Colors.midnightEmerald,
  },
  primaryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.cardBg,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  primaryToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  primaryToggleText: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  primaryToggleTitle: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.charcoal,
  },
  primaryToggleHint: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  modalFooter: {
    padding: Spacing.xxl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
});
