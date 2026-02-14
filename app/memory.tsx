import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { useAuthSafe } from '@/hooks/useConditionalAuth';
import { useAlert } from '@/contexts/AlertContext';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type MemoryType = 'episodic' | 'semantic' | 'profile' | 'summary';

interface MemoryItem {
  id: string;
  memory_type: MemoryType;
  source_type: string;
  content: string;
  salience_score: number;
  confidence_score: number;
  created_at: string;
  ttl_expires_at: string | null;
}

const MEMORY_TYPE_CONFIG: Record<MemoryType, { icon: string; label: string; color: string }> = {
  episodic: { icon: 'time-outline', label: 'Experiences', color: '#3D7A5C' },
  semantic: { icon: 'library-outline', label: 'Knowledge', color: '#6B5B95' },
  profile: { icon: 'person-outline', label: 'Profile', color: '#C5A059' },
  summary: { icon: 'document-text-outline', label: 'Summaries', color: '#4A90D9' },
};

const FILTER_TABS: { key: 'all' | MemoryType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'profile', label: 'Profile' },
  { key: 'episodic', label: 'Experiences' },
  { key: 'semantic', label: 'Knowledge' },
  { key: 'summary', label: 'Summaries' },
];

export default function MemoryScreen() {
  const router = useRouter();
  const { palette } = useThemeSafe();
  const auth = useAuthSafe();
  const { showToast, showAlert } = useAlert();
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | MemoryType>('all');

  const loadMemories = useCallback(async () => {
    if (!isSupabaseConfigured || !auth?.user?.id) return;

    try {
      let query = supabase
        .from('user_memories')
        .select('id, memory_type, source_type, content, salience_score, confidence_score, created_at, ttl_expires_at')
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (activeFilter !== 'all') {
        query = query.eq('memory_type', activeFilter);
      }

      const { data, error } = await query;

      if (!error && data) {
        setMemories(data as MemoryItem[]);
      }
    } catch (err) {
      console.error('[Memory] Error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [auth?.user?.id, activeFilter]);

  useEffect(() => {
    loadMemories();
  }, [loadMemories]);

  const handleDelete = (memoryId: string) => {
    showAlert(
      'Delete Memory',
      'This will permanently remove this memory. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.from('user_memories').delete().eq('id', memoryId);
              setMemories((prev) => prev.filter((m) => m.id !== memoryId));
              showToast('Memory deleted', { variant: 'info' });
            } catch {
              showToast('Failed to delete', { variant: 'error' });
            }
          },
        },
      ]
    );
  };

  const filteredMemories = memories;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <Animated.View entering={FadeInUp.duration(500)} style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: palette.cardBg }]}
        >
          <Ionicons name="arrow-back" size={22} color={palette.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Memory</Text>
        <View style={styles.headerSpacer} />
      </Animated.View>

      {/* Description */}
      <Animated.View entering={FadeInUp.duration(500).delay(100)} style={styles.descriptionContainer}>
        <Text style={[styles.description, { color: palette.textTertiary }]}>
          Everything your coach remembers about you. This context helps personalize your coaching experience.
        </Text>
      </Animated.View>

      {/* Filter tabs */}
      <Animated.View entering={FadeInUp.duration(400).delay(150)}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => {
                  setActiveFilter(tab.key);
                  setLoading(true);
                }}
                style={[
                  styles.filterTab,
                  { borderColor: isActive ? palette.accent : palette.textTertiary + '30' },
                  isActive && { backgroundColor: `${palette.accent}15` },
                ]}
              >
                <Text
                  style={[
                    styles.filterLabel,
                    { color: isActive ? palette.accent : palette.textSecondary },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadMemories(); }} tintColor={palette.accent} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={palette.accent} />
          </View>
        ) : filteredMemories.length === 0 ? (
          <Animated.View entering={FadeInUp.duration(500)} style={styles.emptyState}>
            <Ionicons name="layers-outline" size={48} color={palette.textTertiary} />
            <Text style={[styles.emptyTitle, { color: palette.textSecondary }]}>
              No memories yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: palette.textTertiary }]}>
              As you chat with your coach, memories will be stored here to personalize future conversations.
            </Text>
          </Animated.View>
        ) : (
          filteredMemories.map((memory, index) => {
            const config = MEMORY_TYPE_CONFIG[memory.memory_type];
            return (
              <Animated.View key={memory.id} entering={FadeInUp.duration(400).delay(index * 30)}>
                <View style={[styles.memoryCard, { backgroundColor: palette.cardBg }]}>
                  <View style={styles.memoryHeader}>
                    <View style={[styles.memoryIcon, { backgroundColor: `${config.color}15` }]}>
                      <Ionicons name={config.icon as any} size={16} color={config.color} />
                    </View>
                    <View style={styles.memoryHeaderText}>
                      <Text style={[styles.memoryType, { color: config.color }]}>
                        {config.label}
                      </Text>
                      <Text style={[styles.memoryDate, { color: palette.textTertiary }]}>
                        {new Date(memory.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDelete(memory.id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={16} color={palette.textTertiary} />
                    </TouchableOpacity>
                  </View>
                  <Text
                    style={[styles.memoryContent, { color: palette.textPrimary }]}
                    numberOfLines={4}
                  >
                    {memory.content}
                  </Text>
                  {memory.salience_score > 0.7 && (
                    <View style={[styles.salienceBadge, { backgroundColor: `${palette.accent}12` }]}>
                      <Ionicons name="star" size={10} color={palette.accent} />
                      <Text style={[styles.salienceText, { color: palette.accent }]}>
                        High relevance
                      </Text>
                    </View>
                  )}
                </View>
              </Animated.View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.subtle,
  },
  headerTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.bold as any,
    fontFamily: Typography.fonts.serif,
  },
  headerSpacer: { width: 44 },
  descriptionContainer: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
  },
  description: {
    fontSize: Typography.sizes.body,
    lineHeight: 20,
  },
  filterContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  filterTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
    marginRight: Spacing.sm,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  content: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  loadingContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.md,
  },
  emptyTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold as any,
    fontFamily: Typography.fonts.serif,
  },
  emptySubtitle: {
    fontSize: Typography.sizes.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  memoryCard: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
    ...Shadows.subtle,
  },
  memoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  memoryIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memoryHeaderText: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  memoryType: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  memoryDate: {
    fontSize: 11,
    marginTop: 1,
  },
  memoryContent: {
    fontSize: Typography.sizes.body,
    lineHeight: 21,
  },
  salienceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: Spacing.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  salienceText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
