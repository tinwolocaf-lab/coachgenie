// Today's Breakthrough View - Premium session wrap-up
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  FadeIn,
  FadeInUp,
  FadeInDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { Coach } from '@/types';
import { Button } from '@/components/ui/Button';
import { CoachIcon } from '@/components/ui/CoachIcon';

interface BreakthroughViewProps {
  breakthrough: {
    title: string;
    summary: string;
    keyTakeaways: string[];
    actionItems: { id: string; title: string; completed: boolean }[];
  };
  coach: Coach;
  sessionDuration?: number; // in minutes
  messagesCount?: number;
  onClose: () => void;
  onViewPlan: () => void;
  onShare?: () => void;
}

export function BreakthroughView({
  breakthrough,
  coach,
  sessionDuration,
  messagesCount,
  onClose,
  onViewPlan,
  onShare,
}: BreakthroughViewProps) {
  const insets = useSafeAreaInsets();
  const { palette } = useThemeSafe();

  // Animated values
  const headerScale = useSharedValue(0.9);
  const contentOpacity = useSharedValue(0);
  const goldLineWidth = useSharedValue(0);

  useEffect(() => {
    // Entrance animations
    headerScale.value = withSpring(1, Timing.springGentle);
    contentOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
    goldLineWidth.value = withDelay(600, withTiming(100, { duration: 800 }));

    // Haptic on entry
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [headerScale, contentOpacity, goldLineWidth]);

  const headerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: headerScale.value }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const goldLineStyle = useAnimatedStyle(() => ({
    width: `${goldLineWidth.value}%`,
  }));

  // Format duration
  const formatDuration = (minutes?: number) => {
    if (!minutes) return null;
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours} hour${hours > 1 ? 's' : ''}`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: palette.background }]}>
      {/* Close button */}
      <TouchableOpacity
        onPress={onClose}
        style={styles.closeButton}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
      >
        <Ionicons name="close" size={28} color={palette.textTertiary} />
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <Animated.View style={[styles.heroSection, headerStyle]}>
          {/* Gold accent line */}
          <Animated.View style={[styles.goldAccentLine, goldLineStyle]}>
            <LinearGradient
              colors={['transparent', palette.accent, 'transparent']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.goldAccentGradient}
            />
          </Animated.View>

          {/* Title */}
          <Text style={[styles.label, { color: palette.accent }]}>{"TODAY'S BREAKTHROUGH"}</Text>
          <Text style={[styles.title, { color: palette.textPrimary }]}>{breakthrough.title}</Text>

          {/* Gold accent line bottom */}
          <Animated.View style={[styles.goldAccentLine, goldLineStyle]}>
            <LinearGradient
              colors={['transparent', palette.accent, 'transparent']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.goldAccentGradient}
            />
          </Animated.View>
        </Animated.View>

        {/* Coach Attribution */}
        <Animated.View
          entering={FadeInUp.delay(300).duration(500)}
          style={[styles.coachAttribution, { borderBottomColor: palette.borderLight }]}
        >
          <CoachIcon iconName={coach.icon_name} color={coach.color} size="md" />
          <View style={styles.coachInfo}>
            <Text style={[styles.guidedBy, { color: palette.textTertiary }]}>Guided by</Text>
            <Text style={[styles.coachName, { color: palette.textPrimary }]}>{coach.name}</Text>
          </View>
          {(sessionDuration || messagesCount) && (
            <View style={styles.sessionStats}>
              {sessionDuration && (
                <View style={styles.stat}>
                  <Ionicons name="time-outline" size={14} color={palette.textTertiary} />
                  <Text style={[styles.statText, { color: palette.textTertiary }]}>{formatDuration(sessionDuration)}</Text>
                </View>
              )}
              {messagesCount && (
                <View style={styles.stat}>
                  <Ionicons name="chatbubbles-outline" size={14} color={palette.textTertiary} />
                  <Text style={[styles.statText, { color: palette.textTertiary }]}>{messagesCount} exchanges</Text>
                </View>
              )}
            </View>
          )}
        </Animated.View>

        {/* Summary */}
        <Animated.View style={contentStyle}>
          <View style={[styles.summaryCard, { backgroundColor: palette.cardBg, borderColor: palette.borderAccent }]}>
            <Text style={[styles.summary, { color: palette.textSecondary }]}>{breakthrough.summary}</Text>
          </View>
        </Animated.View>

        {/* Key Takeaways */}
        {breakthrough.keyTakeaways.length > 0 && (
          <Animated.View
            entering={FadeInUp.delay(500).duration(500)}
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: palette.accentMuted }]}>
                <Ionicons name="bulb-outline" size={20} color={palette.accent} />
              </View>
              <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Key Realizations</Text>
            </View>

            <View style={styles.takeawaysContainer}>
              {breakthrough.keyTakeaways.map((takeaway, index) => (
                <Animated.View
                  key={index}
                  entering={FadeInUp.delay(600 + index * 100).duration(400)}
                  style={styles.takeawayItem}
                >
                  <View style={styles.takeawayBullet}>
                    <LinearGradient
                      colors={[palette.accent, palette.accentLight]}
                      style={styles.takeawayBulletGradient}
                    />
                  </View>
                  <Text style={[styles.takeawayText, { color: palette.textSecondary }]}>{takeaway}</Text>
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Action Items */}
        {breakthrough.actionItems.length > 0 && (
          <Animated.View
            entering={FadeInUp.delay(700).duration(500)}
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, { backgroundColor: palette.accentMuted }]}>
                <Ionicons name="checkbox-outline" size={20} color={palette.success} />
              </View>
              <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Committed Actions</Text>
            </View>

            <View style={styles.actionsContainer}>
              {breakthrough.actionItems.map((action, index) => (
                <Animated.View
                  key={action.id}
                  entering={FadeInUp.delay(800 + index * 100).duration(400)}
                  style={[styles.actionItem, { backgroundColor: palette.cardBg, borderColor: palette.borderLight }]}
                >
                  <View style={[styles.actionNumber, { backgroundColor: palette.successLight }]}>
                    <Text style={[styles.actionNumberText, { color: palette.success }]}>{index + 1}</Text>
                  </View>
                  <Text style={[styles.actionText, { color: palette.textSecondary }]}>{action.title}</Text>
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Signature */}
        <Animated.View
          entering={FadeIn.delay(1000).duration(600)}
          style={styles.signatureSection}
        >
          <View style={[styles.signatureLine, { backgroundColor: palette.border }]} />
          <Text style={[styles.signatureText, { color: palette.textTertiary }]}>
            Committed on {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </Animated.View>

        {/* Bottom spacer for buttons */}
        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Footer Actions */}
      <Animated.View
        entering={FadeInDown.delay(800).duration(500)}
        style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}
      >
        <LinearGradient
          colors={['transparent', palette.background]}
          style={styles.footerGradient}
        >
          <View style={styles.footerButtons}>
            {onShare && (
              <TouchableOpacity
                style={[styles.shareButton, { backgroundColor: palette.cardBg, borderColor: palette.border }]}
                onPress={onShare}
              >
                <Ionicons name="share-outline" size={22} color={palette.textPrimary} />
              </TouchableOpacity>
            )}
            <Button
              title="View Your Plan"
              onPress={onViewPlan}
              variant="gold"
              size="lg"
              style={styles.planButton}
            />
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: Spacing.lg,
    zIndex: 100,
    padding: Spacing.sm,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.hero,
  },

  // Hero
  heroSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  goldAccentLine: {
    height: 1,
    marginVertical: Spacing.lg,
  },
  goldAccentGradient: {
    flex: 1,
  },
  label: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    letterSpacing: Typography.letterSpacing.widest,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.sizes.hero,
    fontWeight: Typography.weights.light,
    fontFamily: Typography.fonts.serif,
    textAlign: 'center',
    lineHeight: Typography.sizes.hero * Typography.lineHeights.tight,
  },

  // Coach Attribution
  coachAttribution: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
    paddingBottom: Spacing.xxl,
    borderBottomWidth: 1,
  },
  coachInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  guidedBy: {
    fontSize: Typography.sizes.caption,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wide,
  },
  coachName: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
  },
  sessionStats: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: Typography.sizes.caption,
  },

  // Summary
  summaryCard: {
    borderRadius: Radius.squircle,
    padding: Spacing.xxl,
    marginBottom: Spacing.xxxl,
    borderWidth: 1,
    ...Shadows.md,
  },
  summary: {
    fontSize: Typography.sizes.subtitle,
    lineHeight: Typography.sizes.subtitle * Typography.lineHeights.relaxed,
    fontFamily: Typography.fonts.serif,
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // Sections
  section: {
    marginBottom: Spacing.xxxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
  },

  // Takeaways
  takeawaysContainer: {
    gap: Spacing.md,
  },
  takeawayItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  takeawayBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    marginRight: Spacing.md,
    overflow: 'hidden',
  },
  takeawayBulletGradient: {
    flex: 1,
  },
  takeawayText: {
    flex: 1,
    fontSize: Typography.sizes.body,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },

  // Actions
  actionsContainer: {
    gap: Spacing.md,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    ...Shadows.subtle,
  },
  actionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  actionNumberText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
  },
  actionText: {
    flex: 1,
    fontSize: Typography.sizes.body,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },

  // Signature
  signatureSection: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  signatureLine: {
    width: 200,
    height: 1,
    marginBottom: Spacing.md,
  },
  signatureText: {
    fontSize: Typography.sizes.caption,
    fontStyle: 'italic',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  footerGradient: {
    paddingTop: Spacing.xxl,
    paddingHorizontal: Spacing.xxl,
  },
  footerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  shareButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    ...Shadows.sm,
  },
  planButton: {
    flex: 1,
  },
});

export default BreakthroughView;
