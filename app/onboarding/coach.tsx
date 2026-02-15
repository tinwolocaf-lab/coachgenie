import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Image,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
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
    void loadRecommendation();
  }, []);

  const loadRecommendation = async () => {
    try {
      const data = await getOnboardingData();
      const vibeLabels = data.vibes.map((vibe) =>
        vibe
          .replace('-', ' ')
          .split(' ')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' '),
      );

      const bestCoach = findBestCoach(vibeLabels);
      if (bestCoach) {
        setRecommendedCoach(bestCoach);
        setSelectedCoachId(bestCoach.id);
        setGreeting(getCoachGreeting(bestCoach, vibeLabels, data.name || 'there'));
      }
    } catch (error) {
      console.warn('Failed to load coach recommendation:', error);
    }
  };

  const handleContinue = async () => {
    if (!selectedCoachId) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setIsLoading(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await saveOnboardingData({ selectedCoachId });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push('/onboarding/session');
    } catch (error) {
      console.error('Error saving coach selection:', error);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const activeCoach = useMemo(() => {
    if (!recommendedCoach) return null;
    return SAMPLE_COACHES.find((coach) => coach.id === selectedCoachId) ?? recommendedCoach;
  }, [recommendedCoach, selectedCoachId]);

  if (!activeCoach || !recommendedCoach) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['bottom']}
      >
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: palette.textTertiary }]}>Finding your perfect coach...</Text>
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
          <Animated.View entering={FadeInUp.duration(600).delay(120)} style={styles.headerSection}>
            <Text style={[styles.title, { color: palette.textPrimary }]}>Meet your guide</Text>
            <Text style={[styles.subtitle, { color: palette.textTertiary }]}>
              Based on your answers, this coach best matches how you want to grow.
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(600).delay(220)} style={styles.recommendedSection}>
            <PremiumCoachCard coach={activeCoach} recommended={activeCoach.id === recommendedCoach.id} />
          </Animated.View>

          <Animated.View entering={FadeIn.duration(500).delay(340)} style={styles.greetingSection}>
            <View style={[styles.greetingBubble, { backgroundColor: palette.cardBg, borderColor: palette.borderLight }]}>
              <CoachAvatar coach={activeCoach} size={44} />
              <Text style={[styles.greetingText, { color: palette.textPrimary }]}>{greeting}</Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(400).delay(420)} style={styles.seeAllSection}>
            <TouchableOpacity
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setShowAllCoaches(true);
              }}
              style={[styles.seeAllButton, { borderColor: palette.border }]}
            >
              <Text style={[styles.seeAllText, { color: palette.textPrimary }]}>Browse all coaches</Text>
              <Ionicons name="arrow-forward" size={16} color={palette.accent} />
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      ) : (
        <CoachCarousel
          selectedCoachId={selectedCoachId}
          onSelectCoach={(coachId) => setSelectedCoachId(coachId)}
          onBack={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowAllCoaches(false);
          }}
        />
      )}

      <Animated.View entering={FadeInUp.duration(450).delay(520)} style={styles.footer}>
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
  recommended: boolean;
}

function PremiumCoachCard({ coach, recommended }: PremiumCoachCardProps) {
  const { palette } = useThemeSafe();

  return (
    <View style={[styles.coachCardWrapper, { backgroundColor: palette.cardBg, borderColor: palette.borderLight }]}>
      <LinearGradient
        colors={[coach.color, `${coach.color}CC`]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.coachHero}
      >
        <CoachAvatar coach={coach} size={64} selected />

        <View style={styles.coachHeroCopy}>
          <Text style={styles.coachHeroName}>{coach.name}</Text>
          <Text style={styles.coachHeroTagline}>{coach.tagline}</Text>
          {recommended && (
            <View style={styles.recommendedBadge}>
              <Ionicons name="sparkles" size={12} color="#FFFFFF" />
              <Text style={[styles.recommendedBadgeText, { color: '#FFFFFF' }]}>Recommended match</Text>
            </View>
          )}
        </View>
      </LinearGradient>

      <View style={styles.coachDetails}>
        <Text style={[styles.methodLabel, { color: palette.textTertiary }]}>Approach</Text>
        <Text style={[styles.methodText, { color: palette.textPrimary }]}>{coach.method}</Text>
      </View>
    </View>
  );
}

interface CoachCarouselProps {
  selectedCoachId: string | null;
  onSelectCoach: (coachId: string) => void;
  onBack: () => void;
}

function CoachCarousel({ selectedCoachId, onSelectCoach, onBack }: CoachCarouselProps) {
  const { palette } = useThemeSafe();

  return (
    <Animated.View entering={FadeInUp.duration(350)} style={styles.carouselContainer}>
      <View style={styles.carouselHeader}>
        <TouchableOpacity
          onPress={onBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.carouselBackButton}
        >
          <Ionicons name="chevron-back" size={24} color={palette.textPrimary} />
        </TouchableOpacity>

        <View style={styles.carouselTitleContainer}>
          <Text style={[styles.carouselTitle, { color: palette.textPrimary }]}>All Coaches</Text>
          <Text style={[styles.carouselSubtitle, { color: palette.textTertiary }]}>Select the one you want to begin with</Text>
        </View>

        <View style={styles.carouselBackButton} />
      </View>

      <FlatList
        data={SAMPLE_COACHES}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const selected = selectedCoachId === item.id;
          return (
            <TouchableOpacity
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelectCoach(item.id);
              }}
              activeOpacity={0.85}
              style={[styles.carouselCoachTouch, { borderColor: selected ? item.color : palette.border }]}
            >
              {selected ? (
                <LinearGradient
                  colors={[item.color, `${item.color}CC`]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.carouselCoachCardSelected}
                >
                  <CoachAvatar coach={item} size={60} selected />
                  <View style={styles.carouselCoachMeta}>
                    <Text style={styles.carouselCoachNameSelected}>{item.name}</Text>
                    <Text numberOfLines={1} style={styles.carouselCoachTaglineSelected}>{item.tagline}</Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                </LinearGradient>
              ) : (
                <View style={[styles.carouselCoachCard, { backgroundColor: palette.cardBg }]}>
                  <CoachAvatar coach={item} size={60} />
                  <View style={styles.carouselCoachMeta}>
                    <Text style={[styles.carouselCoachName, { color: palette.textPrimary }]}>{item.name}</Text>
                    <Text numberOfLines={1} style={[styles.carouselCoachTagline, { color: palette.textTertiary }]}>{item.tagline}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={palette.textTertiary} />
                </View>
              )}
            </TouchableOpacity>
          );
        }}
        scrollEnabled
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.carouselList}
      />
    </Animated.View>
  );
}

interface CoachAvatarProps {
  coach: Coach;
  size: number;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
}

function CoachAvatar({ coach, size, selected = false, style }: CoachAvatarProps) {
  const { palette } = useThemeSafe();

  if (coach.image) {
    return (
      <View
        style={[
          styles.avatarFrame,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: selected ? 'rgba(255,255,255,0.35)' : palette.borderLight,
            backgroundColor: selected ? 'rgba(255,255,255,0.18)' : palette.backgroundSecondary,
          },
          style,
        ]}
      >
        <Image source={coach.image} style={styles.avatarImage} resizeMode="cover" />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.avatarFrame,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: selected ? 'rgba(255,255,255,0.35)' : palette.borderLight,
          backgroundColor: selected ? 'rgba(255,255,255,0.18)' : palette.backgroundSecondary,
        },
        style,
      ]}
    >
      <CoachIcon
        iconName={coach.icon_name}
        color={selected ? palette.textInverse : coach.color}
        size="lg"
        variant="default"
      />
    </View>
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

  recommendedSection: {
    marginBottom: Spacing.xl,
  },
  coachCardWrapper: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    ...Shadows.md,
  },
  coachHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
    padding: Spacing.lg,
  },
  coachHeroCopy: {
    flex: 1,
  },
  coachHeroName: {
    color: '#FFFFFF',
    fontFamily: Typography.fonts.serif,
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
  },
  coachHeroTagline: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: Typography.sizes.body,
    lineHeight: Typography.sizes.body * Typography.lineHeights.snug,
  },
  recommendedBadge: {
    marginTop: Spacing.sm,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: Radius.pill,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
  },
  recommendedBadgeText: {
    color: '#FFFFFF',
    fontSize: Typography.sizes.micro,
    fontWeight: Typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wider,
  },
  coachDetails: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  methodLabel: {
    fontSize: Typography.sizes.caption,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wide,
    marginBottom: Spacing.sm,
  },
  methodText: {
    fontSize: Typography.sizes.body,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
    fontStyle: 'italic',
  },

  greetingSection: {
    marginBottom: Spacing.xl,
  },
  greetingBubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    ...Shadows.sm,
  },
  greetingText: {
    flex: 1,
    fontSize: Typography.sizes.body,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },

  seeAllSection: {
    marginBottom: Spacing.xxl,
  },
  seeAllButton: {
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  seeAllText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.sansSemibold,
  },

  carouselContainer: {
    flex: 1,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
  },
  carouselHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  carouselBackButton: {
    width: 28,
    alignItems: 'center',
  },
  carouselTitleContainer: {
    alignItems: 'center',
    gap: 2,
  },
  carouselTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
  },
  carouselSubtitle: {
    fontSize: Typography.sizes.caption,
    letterSpacing: Typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  carouselList: {
    gap: Spacing.md,
    paddingBottom: 120,
  },
  carouselCoachTouch: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  carouselCoachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  carouselCoachCardSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  carouselCoachMeta: {
    flex: 1,
    gap: 2,
  },
  carouselCoachName: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
  },
  carouselCoachTagline: {
    fontSize: Typography.sizes.caption,
  },
  carouselCoachNameSelected: {
    color: '#FFFFFF',
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
  },
  carouselCoachTaglineSelected: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: Typography.sizes.caption,
  },

  avatarFrame: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },

  footer: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.lg,
  },
});
