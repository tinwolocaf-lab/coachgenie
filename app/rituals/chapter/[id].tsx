import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { useAuthSafe } from '@/hooks/useConditionalAuth';
import {
  getChapterWithMilestones,
  getGrowthChapters,
  updateGrowthChapter,
} from '@/lib/supabase-rituals';
import { GrowthChapterWithMilestones } from '@/types';

export default function ChapterDetailScreen() {
  const router = useRouter();
  const { palette } = useThemeSafe();
  const auth = useAuthSafe();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const chapterId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [chapter, setChapter] = useState<GrowthChapterWithMilestones | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingPrimary, setIsSettingPrimary] = useState(false);

  const loadChapter = useCallback(async () => {
    if (!chapterId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await getChapterWithMilestones(chapterId);
      setChapter(data);
    } catch (error) {
      console.error('Error loading chapter details:', error);
      setChapter(null);
    } finally {
      setIsLoading(false);
    }
  }, [chapterId]);

  useEffect(() => {
    loadChapter();
  }, [loadChapter]);

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleSetPrimary = async () => {
    if (!chapter || chapter.is_primary || !auth.user) return;

    try {
      setIsSettingPrimary(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const chapters = await getGrowthChapters(auth.user.id);
      const currentPrimary = chapters.find((item) => item.is_primary && item.id !== chapter.id);
      if (currentPrimary) {
        await updateGrowthChapter(currentPrimary.id, { is_primary: false });
      }

      await updateGrowthChapter(chapter.id, { is_primary: true });
      await loadChapter();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error setting primary chapter:', error);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSettingPrimary(false);
    }
  };

  const handleAddRitual = () => {
    if (!chapter) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/rituals/new-ritual',
      params: { chapterId: chapter.id },
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={palette.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!chapter) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: palette.borderLight }]}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="chevron-back" size={24} color={palette.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Chapter</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.centered}>
          <Text style={[styles.emptyTitle, { color: palette.textPrimary }]}>Chapter not found</Text>
          <Text style={[styles.emptyText, { color: palette.textTertiary }]}>
            This chapter may have been deleted or archived.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: palette.borderLight }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color={palette.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Growth Chapter</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInUp.duration(350)} style={[styles.hero, { backgroundColor: palette.cardBg, borderColor: palette.borderLight }]}>
          <View style={[styles.heroIcon, { backgroundColor: chapter.cover_color + '22' }]}>
            <Ionicons
              name={chapter.icon as keyof typeof Ionicons.glyphMap}
              size={22}
              color={chapter.cover_color}
            />
          </View>
          <Text style={[styles.title, { color: palette.textPrimary }]}>{chapter.title}</Text>
          {!!chapter.vision && (
            <Text style={[styles.vision, { color: palette.textSecondary }]}>{chapter.vision}</Text>
          )}
          {!!chapter.why_it_matters && (
            <Text style={[styles.why, { color: palette.textTertiary }]}>{chapter.why_it_matters}</Text>
          )}

          <View style={styles.progressRow}>
            <Text style={[styles.progressLabel, { color: palette.textTertiary }]}>Progress</Text>
            <Text style={[styles.progressValue, { color: palette.accent }]}>
              {Math.round(chapter.progress_percentage)}%
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: palette.borderLight }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: chapter.cover_color,
                  width: `${Math.min(100, Math.max(0, chapter.progress_percentage))}%`,
                },
              ]}
            />
          </View>

          {!chapter.is_primary && (
            <Button
              title="Set As Primary Chapter"
              onPress={handleSetPrimary}
              loading={isSettingPrimary}
              disabled={isSettingPrimary}
              variant="secondary"
              fullWidth
              style={styles.primaryButton}
            />
          )}
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(350).delay(100)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Milestones</Text>
          {chapter.milestones.length === 0 ? (
            <Text style={[styles.emptyText, { color: palette.textTertiary }]}>
              No milestones yet. Add rituals to build momentum.
            </Text>
          ) : (
            chapter.milestones.map((milestone) => (
              <View key={milestone.id} style={[styles.itemCard, { backgroundColor: palette.cardBg, borderColor: palette.borderLight }]}>
                <Ionicons
                  name={milestone.is_completed ? 'checkmark-circle' : 'ellipse-outline'}
                  size={18}
                  color={milestone.is_completed ? palette.success : palette.textTertiary}
                />
                <Text style={[styles.itemText, { color: palette.textSecondary }]}>{milestone.title}</Text>
              </View>
            ))
          )}
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(350).delay(200)} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Linked Rituals</Text>
          {chapter.linked_rituals.length === 0 ? (
            <Text style={[styles.emptyText, { color: palette.textTertiary }]}>
              No rituals linked yet.
            </Text>
          ) : (
            chapter.linked_rituals.map((ritual) => (
              <View key={ritual.id} style={[styles.itemCard, { backgroundColor: palette.cardBg, borderColor: palette.borderLight }]}>
                <Ionicons
                  name={ritual.is_active ? 'sparkles-outline' : 'pause-outline'}
                  size={18}
                  color={palette.accent}
                />
                <Text style={[styles.itemText, { color: palette.textSecondary }]}>{ritual.title}</Text>
              </View>
            ))
          )}
        </Animated.View>

        <Button
          title="Add Ritual To This Chapter"
          onPress={handleAddRitual}
          variant="gold"
          fullWidth
          style={styles.addRitualButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: {
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
  content: {
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  hero: {
    borderWidth: 1,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    ...Shadows.sm,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    marginBottom: Spacing.sm,
  },
  vision: {
    fontSize: Typography.sizes.body,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
    marginBottom: Spacing.sm,
  },
  why: {
    fontSize: Typography.sizes.caption,
    lineHeight: Typography.sizes.caption * Typography.lineHeights.relaxed,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  progressLabel: {
    fontSize: Typography.sizes.caption,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wide,
  },
  progressValue: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  primaryButton: {
    marginTop: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
  },
  itemCard: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  itemText: {
    flex: 1,
    fontSize: Typography.sizes.body,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },
  addRitualButton: {
    marginTop: Spacing.sm,
  },
  emptyTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: Typography.sizes.body,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
    textAlign: 'center',
  },
});
