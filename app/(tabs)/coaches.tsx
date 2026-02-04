import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInUp,
  FadeIn,
  useAnimatedStyle,
  withSpring,
  useSharedValue,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { CoachIcon } from '@/components/ui/CoachIcon';
import { Coach, InstalledCoach } from '@/types';
import { SAMPLE_COACHES, getCoachById } from '@/data/coaches';
import { getInstalledCoaches, getActiveCoachId } from '@/store/app';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/coach/${coachId}`);
  };

  const installedIds = installedCoaches.map((c) => c.coach_id);
  const availableCoaches = SAMPLE_COACHES.filter(
    (c) => !installedIds.includes(c.id)
  );

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
            tintColor={Colors.burnishedGold}
          />
        }
      >
        {/* Header */}
        <Animated.View entering={FadeInUp.duration(600)} style={styles.header}>
          <Text style={styles.headerTitle}>Coach Library</Text>
          <Text style={styles.headerSubtitle}>
            World-class methodologies for every aspect of your growth
          </Text>
        </Animated.View>

        {/* My Coaches Section */}
        {myCoaches.length > 0 && (
          <Animated.View entering={FadeInUp.duration(600).delay(100)}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Coaches</Text>
              <View style={styles.activeBadge}>
                <Text style={styles.activeCount}>{myCoaches.length}</Text>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.myCoachesScroll}
            >
              {myCoaches.map((item, index) => (
                <Animated.View
                  key={item.id}
                  entering={FadeIn.duration(400).delay(index * 100)}
                >
                  <ActiveCoachCard
                    coach={item.coach}
                    isActive={item.coach_id === activeCoachId}
                    onPress={() => handleCoachPress(item.coach_id)}
                  />
                </Animated.View>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Available Coaches - Masterclass Style */}
        <Animated.View entering={FadeInUp.duration(600).delay(200)}>
          <View style={styles.sectionHeaderVertical}>
            <Text style={styles.sectionTitle}>Discover Coaches</Text>
            <Text style={styles.sectionSubtitle}>
              Each coach brings a unique methodology
            </Text>
          </View>

          <View style={styles.coachGrid}>
            {availableCoaches.map((coach, index) => (
              <Animated.View
                key={coach.id}
                entering={FadeInUp.duration(500).delay(300 + index * 100)}
              >
                <MasterclassCoachCard
                  coach={coach}
                  onPress={() => handleCoachPress(coach.id)}
                />
              </Animated.View>
            ))}
          </View>

          {/* All coaches installed */}
          {availableCoaches.length === 0 && (
            <Card variant="glass" style={styles.allInstalledCard}>
              <View style={styles.allInstalledIcon}>
                <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
              </View>
              <Text style={styles.allInstalledTitle}>Library Complete</Text>
              <Text style={styles.allInstalledText}>
                You&apos;ve explored all available coaches. More methodologies coming soon.
              </Text>
            </Card>
          )}
        </Animated.View>

        {/* Bottom spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ActiveCoachCard({
  coach,
  isActive,
  onPress,
}: {
  coach: Coach;
  isActive: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, Timing.springGentle);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, Timing.springGentle);
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={[styles.activeCoachCard, isActive && styles.activeCoachCardHighlight]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <LinearGradient
          colors={[coach.color, `${coach.color}DD`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.activeCoachGradient}
        >
          <CoachIcon
            iconName={coach.icon_name}
            color={Colors.white}
            size="lg"
            variant="solid"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          />
          <Text style={styles.activeCoachName}>{coach.name}</Text>
          {isActive && (
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>Active</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

function MasterclassCoachCard({
  coach,
  onPress,
}: {
  coach: Coach;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.98, Timing.springGentle);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, Timing.springGentle);
  };

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={styles.masterclassCard}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* Card Background */}
        <LinearGradient
          colors={[Colors.midnightEmerald, '#0D1A11']}
          style={styles.masterclassGradient}
        >
          {/* Accent Color Strip */}
          <View style={[styles.accentStrip, { backgroundColor: coach.color }]} />

          {/* Content */}
          <View style={styles.masterclassContent}>
            <View style={styles.masterclassHeader}>
              <CoachIcon
                iconName={coach.icon_name}
                color={coach.color}
                size="xl"
                variant="default"
              />
              <View style={styles.versionBadge}>
                <Text style={styles.versionText}>v{coach.version}</Text>
              </View>
            </View>

            <View style={styles.masterclassInfo}>
              <Text style={styles.masterclassName}>{coach.name}</Text>
              <Text style={styles.masterclassTagline}>{coach.tagline}</Text>
            </View>

            {/* Method Preview */}
            <View style={styles.methodPreview}>
              <View style={styles.methodIcon}>
                <Ionicons name="diamond-outline" size={14} color={Colors.burnishedGold} />
              </View>
              <Text style={styles.methodText} numberOfLines={2}>
                {coach.method}
              </Text>
            </View>

            {/* Footer */}
            <View style={styles.masterclassFooter}>
              <Text style={styles.exploreText}>Explore Methodology</Text>
              <Ionicons name="arrow-forward" size={16} color={Colors.burnishedGold} />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.warmOatmeal,
  },
  scrollContent: {
    paddingBottom: Spacing.section,
  },

  // Header
  header: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  headerTitle: {
    fontSize: Typography.sizes.hero,
    fontWeight: Typography.weights.light,
    color: Colors.midnightEmerald,
    fontFamily: Typography.fonts.serif,
    letterSpacing: Typography.letterSpacing.tight,
  },
  headerSubtitle: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
    marginTop: Spacing.sm,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },

  // Section Headers
  sectionHeader: {
    paddingHorizontal: Spacing.xxl,
    marginBottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderVertical: {
    paddingHorizontal: Spacing.xxl,
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    color: Colors.midnightEmerald,
    fontFamily: Typography.fonts.serif,
  },
  sectionSubtitle: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
    marginTop: Spacing.xs,
  },
  activeBadge: {
    backgroundColor: Colors.burnishedGold,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeCount: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
  },

  // My Coaches
  myCoachesScroll: {
    paddingHorizontal: Spacing.xxl,
    marginBottom: Spacing.xxl,
  },
  activeCoachCard: {
    width: 160,
    marginRight: Spacing.md,
    borderRadius: Radius.squircle,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  activeCoachCardHighlight: {
    borderWidth: 2,
    borderColor: Colors.burnishedGold,
  },
  activeCoachGradient: {
    padding: Spacing.lg,
    alignItems: 'center',
    minHeight: 180,
  },
  activeCoachName: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
    textAlign: 'center',
    marginTop: Spacing.md,
    fontFamily: Typography.fonts.serif,
  },
  currentBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
    marginTop: Spacing.sm,
  },
  currentBadgeText: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
  },

  // Masterclass Cards
  coachGrid: {
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.lg,
  },
  masterclassCard: {
    borderRadius: Radius.squircle,
    overflow: 'hidden',
    ...Shadows.xl,
  },
  masterclassGradient: {
    minHeight: 280,
  },
  accentStrip: {
    height: 4,
    width: '100%',
  },
  masterclassContent: {
    flex: 1,
    padding: Spacing.xl,
  },
  masterclassHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  versionBadge: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.pill,
  },
  versionText: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
  },
  masterclassInfo: {
    marginTop: Spacing.xl,
  },
  masterclassName: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
    fontFamily: Typography.fonts.serif,
  },
  masterclassTagline: {
    fontSize: Typography.sizes.bodyLarge,
    color: Colors.goldLight,
    marginTop: Spacing.xs,
    lineHeight: Typography.sizes.bodyLarge * Typography.lineHeights.relaxed,
  },
  methodPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  methodIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  methodText: {
    flex: 1,
    fontSize: Typography.sizes.body,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },
  masterclassFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: Spacing.xl,
  },
  exploreText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.burnishedGold,
    marginRight: Spacing.sm,
  },

  // All installed
  allInstalledCard: {
    marginHorizontal: Spacing.xxl,
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  allInstalledIcon: {
    marginBottom: Spacing.lg,
  },
  allInstalledTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    color: Colors.midnightEmerald,
    fontFamily: Typography.fonts.serif,
  },
  allInstalledText: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
    textAlign: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },

  bottomSpacer: {
    height: 100,
  },
});
