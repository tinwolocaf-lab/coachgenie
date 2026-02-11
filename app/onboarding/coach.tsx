import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { CoachIcon } from '@/components/ui/CoachIcon';
import { SAMPLE_COACHES } from '@/data/coaches';
import { Coach } from '@/types';
import {
  findBestCoach,
  getOnboardingData,
  saveOnboardingData,
  getCoachGreeting,
} from '@/lib/onboarding';

export default function CoachScreen() {
  const router = useRouter();
  const { palette } = useThemeSafe();
  const [recommendedCoach, setRecommendedCoach] = useState<Coach | null>(null);
  const [showAllCoaches, setShowAllCoaches] = useState(false);
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    loadRecommendation();
  }, []);

  const loadRecommendation = async () => {
    try {
      const data = await getOnboardingData();

      const vibeLabels = data.vibes.map((v) => v.replace('-', ' ').split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '));

      const bestCoach = findBestCoach(vibeLabels);
      if (bestCoach) {
        setRecommendedCoach(bestCoach);
        setSelectedCoachId(bestCoach.id);
        setGreeting(getCoachGreeting(bestCoach, vibeLabels, data.name || 'there'));
      }
    } catch (error) {
      console.error('Error loading recommendation:', error);
    }
  };

  const handleContinue = async () => {
    if (!selectedCoachId) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await saveOnboardingData({ selectedCoachId });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push('/onboarding/session');
    } catch (error) {
      console.error('Error saving coach selection:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!recommendedCoach) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['bottom']}
      >
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: palette.textTertiary }]}>
            Finding your perfect coach...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['bottom']}
    >
      {!showAllCoaches ? (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View
            entering={FadeInUp.duration(600).delay(200)}
            style={styles.headerSection}
          >
            <Text style={[styles.title, { color: palette.textPrimary }]}>
              Meet your guide
            </Text>
            <Text style={[styles.subtitle, { color: palette.textTertiary }]}>
              {"Based on your answers, we've matched you with the perfect coach"}
            </Text>
          </Animated.View>

          {/* Recommended Coach Card */}
          <Animated.View
            entering={FadeInUp.duration(600).delay(400)}
            style={styles.recommendedSection}
          >
            <PremiumCoachCard coach={recommendedCoach} recommended={true} />
          </Animated.View>

          {/* Greeting Message */}
          <Animated.View
            entering={FadeIn.duration(600).delay(600)}
            style={styles.greetingSection}
          >
            <View
              style={[
                styles.greetingBubble,
                { backgroundColor: palette.cardBg },
              ]}
            >
              <View
                style={[
                  styles.greetingIconContainer,
                  { backgroundColor: recommendedCoach.color },
                ]}
              >
                <CoachIcon
                  iconName={recommendedCoach.icon_name}
                  color={palette.textInverse}
                  size="sm"
                  variant="solid"
                />
              </View>
              <Text style={[styles.greetingText, { color: palette.textPrimary }]}>
                {greeting}
              </Text>
            </View>
          </Animated.View>

          {/* See All Coaches Link */}
          <Animated.View
            entering={FadeInUp.duration(400).delay(800)}
            style={styles.seeAllSection}
          >
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowAllCoaches(true);
              }}
              style={styles.seeAllButton}
            >
              <Text style={[styles.seeAllText, { color: palette.accent }]}>
                Explore all coaches
              </Text>
              <Ionicons name="arrow-forward" size={16} color={palette.accent} />
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      ) : (
        <CoachCarousel
          selectedCoachId={selectedCoachId}
          onSelectCoach={(coachId) => setSelectedCoachId(coachId)}
          onBack={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowAllCoaches(false);
          }}
        />
      )}

      {/* Continue Button */}
      <Animated.View
        entering={FadeInUp.duration(400).delay(1000)}
        style={styles.footer}
      >
        <Button
          title="Start with this coach"
          onPress={handleContinue}
          disabled={!selectedCoachId || isLoading}
          loading={isLoading}
          variant="gold"
          size="lg"
          fullWidth
        />
      </Animated.View>
    </SafeAreaView>
  );
}

interface PremiumCoachCardProps {
  coach: Coach;
  recommended?: boolean;
}

function PremiumCoachCard({ coach, recommended }: PremiumCoachCardProps) {
  const { palette } = useThemeSafe();

  return (
    <View
      style={[
        styles.coachCardWrapper,
        { backgroundColor: palette.cardBg },
        Shadows.md,
      ]}
    >
      {recommended && (
        <LinearGradient
          colors={[coach.color, `${coach.color}DD`]}
          style={styles.recommendedBadge}
        >
          <Ionicons name="star" size={12} color={palette.textInverse} />
          <Text style={[styles.recommendedBadgeText, { color: palette.textInverse }]}>
            Recommended for you
          </Text>
        </LinearGradient>
      )}

      <View style={styles.coachCardContent}>
        <CoachIcon
          iconName={coach.icon_name}
          color={coach.color}
          size="xl"
          variant="default"
          style={{ marginBottom: Spacing.lg }}
        />

        <Text style={[styles.coachName, { color: palette.textPrimary }]}>
          {coach.name}
        </Text>
        <Text style={[styles.coachTagline, { color: palette.textTertiary }]}>
          {coach.tagline}
        </Text>

        <View style={styles.methodSectionCard}>
          <Text style={[styles.methodLabel, { color: palette.textTertiary }]}>
            Approach
          </Text>
          <Text style={[styles.methodTextCard, { color: palette.textPrimary }]}>
            {coach.method}
          </Text>
        </View>
      </View>
    </View>
  );
}

interface CoachCarouselProps {
  selectedCoachId: string | null;
  onSelectCoach: (coachId: string) => void;
  onBack: () => void;
}

function CoachCarousel({
  selectedCoachId,
  onSelectCoach,
  onBack,
}: CoachCarouselProps) {
  const { palette } = useThemeSafe();

  return (
    <Animated.View entering={FadeInUp.duration(400)} style={styles.carouselContainer}>
      {/* Header */}
      <View style={styles.carouselHeader}>
        <TouchableOpacity
          onPress={onBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={24} color={palette.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.carouselTitle, { color: palette.textPrimary }]}>
          All Coaches
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Coaches List */}
      <FlatList
        data={SAMPLE_COACHES}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onSelectCoach(item.id);
            }}
            activeOpacity={0.7}
            style={[
              styles.carouselCoachCard,
              selectedCoachId === item.id && {
                backgroundColor: item.color,
                borderColor: item.color,
              },
            ]}
          >
            <CoachIcon
              iconName={item.icon_name}
              color={selectedCoachId === item.id ? palette.textInverse : item.color}
              size="lg"
              variant="default"
            />
            <Text
              style={[
                styles.carouselCoachName,
                {
                  color: selectedCoachId === item.id ? palette.textInverse : palette.textPrimary,
                },
              ]}
            >
              {item.name}
            </Text>
            {selectedCoachId === item.id && (
              <View style={styles.carouselCheckmark}>
                <Ionicons name="checkmark" size={20} color={palette.textInverse} />
              </View>
            )}
          </TouchableOpacity>
        )}
        scrollEnabled={true}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.carouselList}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.lg,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: Typography.sizes.body,
  },

  // Header
  headerSection: {
    marginBottom: Spacing.xl,
  },
  title: {
    fontSize: Typography.sizes.display,
    fontWeight: Typography.weights.light,
    fontFamily: Typography.fonts.serif,
    marginBottom: Spacing.md,
    letterSpacing: Typography.letterSpacing.tight,
  },
  subtitle: {
    fontSize: Typography.sizes.body,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },

  // Coach Card
  recommendedSection: {
    marginBottom: Spacing.xl,
  },
  coachCardWrapper: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  recommendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  recommendedBadgeText: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wide,
  },
  coachCardContent: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
  },
  coachName: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  coachTagline: {
    fontSize: Typography.sizes.body,
    marginBottom: Spacing.lg,
    textAlign: 'center',
  },
  methodSectionCard: {
    width: '100%',
    marginTop: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  methodLabel: {
    fontSize: Typography.sizes.caption,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wide,
    marginBottom: Spacing.sm,
  },
  methodTextCard: {
    fontSize: Typography.sizes.body,
    fontStyle: 'italic',
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
    textAlign: 'center',
  },

  // Greeting
  greetingSection: {
    marginBottom: Spacing.xxl,
  },
  greetingBubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    gap: Spacing.lg,
    ...Shadows.sm,
  },
  greetingIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  greetingText: {
    flex: 1,
    fontSize: Typography.sizes.body,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },

  // See All
  seeAllSection: {
    marginBottom: Spacing.xxxl,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  seeAllText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
  },

  // Carousel
  carouselContainer: {
    flex: 1,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
  },
  carouselHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  carouselTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
  },
  carouselList: {
    gap: Spacing.md,
  },
  carouselCoachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.1)',
    ...Shadows.sm,
  },
  carouselCoachName: {
    flex: 1,
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    marginLeft: Spacing.lg,
  },
  carouselCheckmark: {
    marginLeft: Spacing.md,
  },

  // Footer
  footer: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.lg,
  },
});
