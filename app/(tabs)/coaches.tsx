import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { CoachIcon } from '@/components/ui/CoachIcon';
import { Coach, InstalledCoach } from '@/types';
import { SAMPLE_COACHES, getCoachById } from '@/data/coaches';
import { getInstalledCoaches, getActiveCoachId } from '@/store/app';

export default function CoachesScreen() {
  const router = useRouter();
  const [installedCoaches, setInstalledCoaches] = useState<InstalledCoach[]>([]);
  const [activeCoachId, setActiveCoachIdState] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const installed = await getInstalledCoaches();
      setInstalledCoaches(installed);
      const activeId = await getActiveCoachId();
      setActiveCoachIdState(activeId);
    } catch (error) {
      console.error('Error loading coaches:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleCoachPress = (coachId: string) => {
    router.push(`/coach/${coachId}`);
  };

  // Get available coaches (not yet installed)
  const installedIds = installedCoaches.map((c) => c.coach_id);
  const availableCoaches = SAMPLE_COACHES.filter(
    (c) => !installedIds.includes(c.id)
  );

  // Get installed coach details
  const myCoaches = installedCoaches
    .map((ic) => ({
      ...ic,
      coach: getCoachById(ic.coach_id),
    }))
    .filter((ic) => ic.coach) as (InstalledCoach & { coach: Coach })[];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.electricIndigo}
          />
        }
      >
        {/* Header */}
        <Animated.View entering={FadeInUp.duration(400)} style={styles.header}>
          <Text style={styles.headerTitle}>Coaches</Text>
          <Text style={styles.headerSubtitle}>
            Your personal coaching team
          </Text>
        </Animated.View>

        {/* My Coaches */}
        {myCoaches.length > 0 && (
          <Animated.View entering={FadeInUp.duration(400).delay(100)}>
            <Text style={styles.sectionTitle}>My Coaches</Text>
            <View style={styles.coachesList}>
              {myCoaches.map((item, index) => (
                <Animated.View
                  key={item.id}
                  entering={FadeIn.duration(300).delay(index * 100)}
                >
                  <InstalledCoachCard
                    coach={item.coach}
                    isActive={item.coach_id === activeCoachId}
                    onPress={() => handleCoachPress(item.coach_id)}
                  />
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Coach Library */}
        <Animated.View entering={FadeInUp.duration(400).delay(200)}>
          <View style={styles.libraryHeader}>
            <Text style={styles.sectionTitle}>Coach Library</Text>
            <Text style={styles.librarySubtitle}>
              Discover specialized coaches for different areas
            </Text>
          </View>
          <View style={styles.coachesList}>
            {availableCoaches.map((coach, index) => (
              <Animated.View
                key={coach.id}
                entering={FadeIn.duration(300).delay(300 + index * 100)}
              >
                <LibraryCoachCard
                  coach={coach}
                  onPress={() => handleCoachPress(coach.id)}
                />
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* All coaches installed message */}
        {availableCoaches.length === 0 && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.allInstalled}>
            <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
            <Text style={styles.allInstalledText}>
              You&apos;ve installed all available coaches!
            </Text>
          </Animated.View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InstalledCoachCard({
  coach,
  isActive,
  onPress,
}: {
  coach: Coach;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <Card
      style={isActive ? [styles.coachCard, styles.coachCardActive] : styles.coachCard}
      onPress={onPress}
    >
      <View style={styles.coachRow}>
        <CoachIcon iconName={coach.icon_name} color={coach.color} size="md" />
        <View style={styles.coachInfo}>
          <View style={styles.coachNameRow}>
            <Text style={styles.coachName}>{coach.name}</Text>
            {isActive && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>Active</Text>
              </View>
            )}
          </View>
          <Text style={styles.coachTagline} numberOfLines={1}>
            {coach.tagline}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.slateLight} />
      </View>
    </Card>
  );
}

function LibraryCoachCard({
  coach,
  onPress,
}: {
  coach: Coach;
  onPress: () => void;
}) {
  return (
    <Card style={styles.libraryCard} onPress={onPress}>
      <CoachIcon iconName={coach.icon_name} color={coach.color} size="lg" />
      <Text style={styles.libraryCoachName}>{coach.name}</Text>
      <Text style={styles.libraryCoachTagline} numberOfLines={2}>
        {coach.tagline}
      </Text>
      <View style={styles.versionBadge}>
        <Text style={styles.versionText}>v{coach.version}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.offWhite,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  header: {
    paddingVertical: Spacing.lg,
  },
  headerTitle: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.bold,
    color: Colors.slateCharcoal,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    fontSize: Typography.sizes.body,
    color: Colors.slateGray,
  },
  sectionTitle: {
    fontSize: Typography.sizes.subtitle,
    fontWeight: Typography.weights.semibold,
    color: Colors.slateCharcoal,
    marginBottom: Spacing.md,
    marginTop: Spacing.lg,
  },
  coachesList: {
    gap: Spacing.md,
  },
  coachCard: {
    padding: Spacing.lg,
  },
  coachCardActive: {
    borderWidth: 2,
    borderColor: Colors.electricIndigo,
  },
  coachRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coachInfo: {
    flex: 1,
    marginLeft: Spacing.md,
    marginRight: Spacing.sm,
  },
  coachNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  coachName: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    color: Colors.slateCharcoal,
  },
  activeBadge: {
    backgroundColor: Colors.electricIndigo,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
    marginLeft: Spacing.sm,
  },
  activeBadgeText: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
  },
  coachTagline: {
    fontSize: Typography.sizes.body,
    color: Colors.slateGray,
  },
  libraryHeader: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  librarySubtitle: {
    fontSize: Typography.sizes.body,
    color: Colors.slateGray,
    marginTop: Spacing.xs,
  },
  libraryCard: {
    alignItems: 'center',
    padding: Spacing.xl,
    marginBottom: Spacing.sm,
  },
  libraryCoachName: {
    fontSize: Typography.sizes.subtitle,
    fontWeight: Typography.weights.semibold,
    color: Colors.slateCharcoal,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  libraryCoachTagline: {
    fontSize: Typography.sizes.body,
    color: Colors.slateGray,
    textAlign: 'center',
    lineHeight: 20,
  },
  versionBadge: {
    marginTop: Spacing.md,
    backgroundColor: Colors.inputBg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  versionText: {
    fontSize: Typography.sizes.caption,
    color: Colors.slateLight,
  },
  allInstalled: {
    alignItems: 'center',
    paddingVertical: Spacing.section,
  },
  allInstalledText: {
    fontSize: Typography.sizes.body,
    color: Colors.slateGray,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
});
