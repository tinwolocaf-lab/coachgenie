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
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
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
  const { palette } = useThemeSafe();
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

  useEffect(() => {
    loadChapters();
  }, [auth?.user?.id]);

  const loadChapters = useCallback(async () => {
    if (!auth?.user?.id) return;

    try {
      const data = await getGrowthChapters(auth.user.id);
      setChapters(data);
    } catch (error) {
      console.error('Error loading chapters:', error);
    }
  }, [auth?.user?.id]);

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
    router.push(`/rituals/chapter/${chapter.id}`);
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
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={[styles.header, { borderBottomColor: palette.borderLight }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Ionicons name="chevron-back" size={24} color={palette.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Growth Chapters</Text>
          <Text style={[styles.headerSubtitle, { color: palette.textTertiary }]}>Your journey, chapter by chapter</Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: palette.accentMuted }]}
          onPress={() => setShowNewChapterModal(true)}
        >
          <Ionicons name="add" size={24} color={palette.accent} />
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
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Active Chapters</Text>
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
            <View style={[styles.emptyIcon, { backgroundColor: palette.backgroundSecondary }]}>
              <Ionicons name="flag-outline" size={48} color={palette.textTertiary} />
            </View>
            <Text style={[styles.emptyTitle, { color: palette.textPrimary }]}>Begin Your First Chapter</Text>
            <Text style={[styles.emptyText, { color: palette.textTertiary }]}>
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
            <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Completed</Text>
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
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
          <View style={[styles.modalHeader, { borderBottomColor: palette.borderLight }]}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowNewChapterModal(false)}
            >
              <Ionicons name="close" size={24} color={palette.textSecondary} />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: palette.textSecondary }]}>New Chapter</Text>
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
              <Text style={[styles.inputLabel, { color: palette.textSecondary }]}>Chapter Title</Text>
              <TextInput
                style={[styles.input, { backgroundColor: palette.cardBg, color: palette.textSecondary, borderColor: palette.borderLight }]}
                placeholder="e.g., Career Growth, Health & Wellness"
                placeholderTextColor={palette.textTertiary}
                value={newChapter.title}
                onChangeText={(text) => setNewChapter({ ...newChapter, title: text })}
              />
            </View>

            {/* Vision Input */}
            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: palette.textSecondary }]}>Your Vision</Text>
              <Text style={[styles.inputHint, { color: palette.textTertiary }]}>What does success look like?</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: palette.cardBg, color: palette.textSecondary, borderColor: palette.borderLight }]}
                placeholder="Describe where you want to be..."
                placeholderTextColor={palette.textTertiary}
                value={newChapter.vision}
                onChangeText={(text) => setNewChapter({ ...newChapter, vision: text })}
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* Why It Matters */}
            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: palette.textSecondary }]}>Why It Matters</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: palette.cardBg, color: palette.textSecondary, borderColor: palette.borderLight }]}
                placeholder="Why is this chapter important to you?"
                placeholderTextColor={palette.textTertiary}
                value={newChapter.why_it_matters}
                onChangeText={(text) => setNewChapter({ ...newChapter, why_it_matters: text })}
                multiline
                textAlignVertical="top"
              />
            </View>

            {/* Color Picker */}
            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: palette.textSecondary }]}>Cover Color</Text>
              <View style={styles.colorPicker}>
                {CHAPTER_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      newChapter.cover_color === color && { borderColor: palette.accent },
                    ]}
                    onPress={() => setNewChapter({ ...newChapter, cover_color: color })}
                  >
                    {newChapter.cover_color === color && (
                      <Ionicons name="checkmark" size={16} color={palette.textInverse} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Icon Picker */}
            <View style={styles.inputSection}>
              <Text style={[styles.inputLabel, { color: palette.textSecondary }]}>Icon</Text>
              <View style={styles.iconPicker}>
                {CHAPTER_ICONS.map((icon) => (
                  <TouchableOpacity
                    key={icon}
                    style={[
                      styles.iconOption,
                      { backgroundColor: palette.backgroundSecondary },
                      newChapter.icon === icon && { backgroundColor: palette.textPrimary },
                    ]}
                    onPress={() => setNewChapter({ ...newChapter, icon })}
                  >
                    <Ionicons
                      name={icon as keyof typeof Ionicons.glyphMap}
                      size={20}
                      color={newChapter.icon === icon ? palette.textInverse : palette.textSecondary}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Primary Toggle */}
            {chapters.length > 0 && (
              <TouchableOpacity
                style={[styles.primaryToggle, { backgroundColor: palette.cardBg, borderColor: palette.borderLight }]}
                onPress={() => setNewChapter({ ...newChapter, is_primary: !newChapter.is_primary })}
              >
                <View style={styles.primaryToggleContent}>
                  <Ionicons name="star" size={20} color={palette.accent} />
                  <View style={styles.primaryToggleText}>
                    <Text style={[styles.primaryToggleTitle, { color: palette.textSecondary }]}>Set as Primary Chapter</Text>
                    <Text style={[styles.primaryToggleHint, { color: palette.textTertiary }]}>
                      Primary chapters appear on your home screen
                    </Text>
                  </View>
                </View>
                <View style={[styles.checkbox, { borderColor: palette.border }, newChapter.is_primary && { backgroundColor: palette.success, borderColor: palette.success }]}>
                  {newChapter.is_primary && (
                    <Ionicons name="checkmark" size={14} color={palette.textInverse} />
                  )}
                </View>
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Create Button */}
          <View style={[styles.modalFooter, { borderTopColor: palette.borderLight }]}>
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
  const { palette } = useThemeSafe();
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
    <Animated.View entering={FadeInUp.duration(400).delay(100 + index * 80)}>
      <Animated.View style={animatedStyle}>
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
              <Ionicons name="star" size={12} color={palette.accent} />
            </View>
          )}

          <View style={styles.chapterIcon}>
            <Ionicons
              name={chapter.icon as keyof typeof Ionicons.glyphMap || 'flag'}
              size={24}
              color={palette.textInverse}
            />
          </View>

          <Text style={[styles.chapterTitle, { color: palette.textInverse }]} numberOfLines={2}>
            {chapter.title}
          </Text>

          <View style={styles.chapterProgress}>
            <FluidProgressBar
              progress={chapter.progress_percentage}
              height={4}
              color={palette.textInverse}
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
  const { palette } = useThemeSafe();

  return (
    <Animated.View entering={FadeInUp.duration(300).delay(index * 50)}>
      <TouchableOpacity style={[styles.completedRow, { backgroundColor: palette.cardBg }]} onPress={onPress} activeOpacity={0.9}>
        <View style={[styles.completedIcon, { backgroundColor: chapter.cover_color + '20' }]}>
          <Ionicons
            name={chapter.icon as keyof typeof Ionicons.glyphMap || 'checkmark-circle'}
            size={20}
            color={chapter.cover_color}
          />
        </View>
        <View style={styles.completedContent}>
          <Text style={[styles.completedTitle, { color: palette.textSecondary }]}>{chapter.title}</Text>
          <Text style={[styles.completedDate, { color: palette.textTertiary }]}>
            Completed {new Date(chapter.updated_at).toLocaleDateString()}
          </Text>
        </View>
        <Ionicons name="checkmark-circle" size={20} color={palette.success} />
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
  const { palette } = useThemeSafe();

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
            color={palette.textInverse}
          />
        </View>
        <Text style={[styles.previewTitle, { color: palette.textInverse }]} numberOfLines={2}>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
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
  },
  headerSubtitle: {
    fontSize: Typography.sizes.caption,
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  emptyTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: Typography.sizes.body,
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
  },
  completedDate: {
    fontSize: Typography.sizes.caption,
    marginTop: 2,
  },
  bottomSpacer: {
    height: 100,
  },

  // Modal
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
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
    textAlign: 'center',
  },
  inputSection: {
    marginBottom: Spacing.xxl,
  },
  inputLabel: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.sm,
  },
  inputHint: {
    fontSize: Typography.sizes.caption,
    marginBottom: Spacing.sm,
  },
  input: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    fontSize: Typography.sizes.body,
    borderWidth: 1,
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
  iconPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
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
  },
  primaryToggleHint: {
    fontSize: Typography.sizes.caption,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalFooter: {
    padding: Spacing.xxl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
  },
});
