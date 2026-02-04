// Today's Breakthrough View - Premium session wrap-up
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withSequence,
  FadeIn,
  FadeInUp,
  FadeInDown,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
import { Breakthrough, Coach } from '@/types';
import { Button } from '@/components/ui/Button';
import { CoachIcon } from '@/components/ui/CoachIcon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Close button */}
      <TouchableOpacity
        onPress={onClose}
        style={styles.closeButton}
        hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
      >
        <Ionicons name="close" size={28} color={Colors.stoneGray} />
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
              colors={['transparent', Colors.burnishedGold, 'transparent']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.goldAccentGradient}
            />
          </Animated.View>

          {/* Title */}
          <Text style={styles.label}>TODAY'S BREAKTHROUGH</Text>
          <Text style={styles.title}>{breakthrough.title}</Text>

          {/* Gold accent line bottom */}
          <Animated.View style={[styles.goldAccentLine, goldLineStyle]}>
            <LinearGradient
              colors={['transparent', Colors.burnishedGold, 'transparent']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.goldAccentGradient}
            />
          </Animated.View>
        </Animated.View>

        {/* Coach Attribution */}
        <Animated.View
          entering={FadeInUp.delay(300).duration(500)}
          style={styles.coachAttribution}
        >
          <CoachIcon iconName={coach.icon_name} color={coach.color} size="md" />
          <View style={styles.coachInfo}>
            <Text style={styles.guidedBy}>Guided by</Text>
            <Text style={styles.coachName}>{coach.name}</Text>
          </View>
          {(sessionDuration || messagesCount) && (
            <View style={styles.sessionStats}>
              {sessionDuration && (
                <View style={styles.stat}>
                  <Ionicons name="time-outline" size={14} color={Colors.stoneGray} />
                  <Text style={styles.statText}>{formatDuration(sessionDuration)}</Text>
                </View>
              )}
              {messagesCount && (
                <View style={styles.stat}>
                  <Ionicons name="chatbubbles-outline" size={14} color={Colors.stoneGray} />
                  <Text style={styles.statText}>{messagesCount} exchanges</Text>
                </View>
              )}
            </View>
          )}
        </Animated.View>

        {/* Summary */}
        <Animated.View style={contentStyle}>
          <View style={styles.summaryCard}>
            <Text style={styles.summary}>{breakthrough.summary}</Text>
          </View>
        </Animated.View>

        {/* Key Takeaways */}
        {breakthrough.keyTakeaways.length > 0 && (
          <Animated.View
            entering={FadeInUp.delay(500).duration(500)}
            style={styles.section}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Ionicons name="bulb-outline" size={20} color={Colors.burnishedGold} />
              </View>
              <Text style={styles.sectionTitle}>Key Realizations</Text>
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
                      colors={[Colors.burnishedGold, Colors.goldLight]}
                      style={styles.takeawayBulletGradient}
                    />
                  </View>
                  <Text style={styles.takeawayText}>{takeaway}</Text>
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
              <View style={styles.sectionIcon}>
                <Ionicons name="checkbox-outline" size={20} color={Colors.success} />
              </View>
              <Text style={styles.sectionTitle}>Committed Actions</Text>
            </View>

            <View style={styles.actionsContainer}>
              {breakthrough.actionItems.map((action, index) => (
                <Animated.View
                  key={action.id}
                  entering={FadeInUp.delay(800 + index * 100).duration(400)}
                  style={styles.actionItem}
                >
                  <View style={styles.actionNumber}>
                    <Text style={styles.actionNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.actionText}>{action.title}</Text>
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
          <View style={styles.signatureLine} />
          <Text style={styles.signatureText}>
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
          colors={['transparent', Colors.warmOatmeal]}
          style={styles.footerGradient}
        >
          <View style={styles.footerButtons}>
            {onShare && (
              <TouchableOpacity
                style={styles.shareButton}
                onPress={onShare}
              >
                <Ionicons name="share-outline" size={22} color={Colors.midnightEmerald} />
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
    backgroundColor: Colors.warmOatmeal,
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
    color: Colors.burnishedGold,
    letterSpacing: Typography.letterSpacing.widest,
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: Typography.sizes.hero,
    fontWeight: Typography.weights.light,
    color: Colors.midnightEmerald,
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
    borderBottomColor: Colors.borderLight,
  },
  coachInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  guidedBy: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wide,
  },
  coachName: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    color: Colors.midnightEmerald,
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
    color: Colors.stoneGray,
  },

  // Summary
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.squircle,
    padding: Spacing.xxl,
    marginBottom: Spacing.xxxl,
    borderWidth: 1,
    borderColor: Colors.borderGold,
    ...Shadows.md,
  },
  summary: {
    fontSize: Typography.sizes.subtitle,
    color: Colors.charcoal,
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
    backgroundColor: Colors.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    color: Colors.midnightEmerald,
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
    color: Colors.charcoal,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },

  // Actions
  actionsContainer: {
    gap: Spacing.md,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.subtle,
  },
  actionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  actionNumberText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    color: Colors.success,
  },
  actionText: {
    flex: 1,
    fontSize: Typography.sizes.body,
    color: Colors.charcoal,
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
    backgroundColor: Colors.border,
    marginBottom: Spacing.md,
  },
  signatureText: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
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
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  planButton: {
    flex: 1,
  },
});

export default BreakthroughView;
