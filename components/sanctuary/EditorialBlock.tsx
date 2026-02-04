// Editorial Block - Premium message card component
import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Dimensions,
} from 'react-native';
import Animated, {
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
import { EnhancedMessage } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface EditorialBlockProps {
  message: EnhancedMessage;
  coachName: string;
  coachColor: string;
  index: number;
  onLongPress?: (message: EnhancedMessage, position: { x: number; y: number }) => void;
  onInsightPress?: (message: EnhancedMessage) => void;
  isStreaming?: boolean;
}

export function EditorialBlock({
  message,
  coachName,
  coachColor,
  index,
  onLongPress,
  onInsightPress,
  isStreaming = false,
}: EditorialBlockProps) {
  const isUser = message.role === 'user';
  const isInsight = message.is_insight;
  const blockRef = useRef<View>(null);

  const scale = useSharedValue(1);
  const highlightOpacity = useSharedValue(0);

  const handlePressIn = () => {
    scale.value = withSpring(0.98, Timing.springGentle);
    highlightOpacity.value = withTiming(1, { duration: 150 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, Timing.springGentle);
    highlightOpacity.value = withTiming(0, { duration: 200 });
  };

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (onLongPress && blockRef.current) {
      blockRef.current.measureInWindow((x, y, width, height) => {
        onLongPress(message, { x: x + width / 2, y: y + height / 2 });
      });
    }
  };

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const highlightStyle = useAnimatedStyle(() => ({
    opacity: highlightOpacity.value,
  }));

  // Format timestamp elegantly
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Check for insight markers in content
  const renderContent = () => {
    const content = message.content;

    // Check for insight pattern
    if (content.includes('💡 INSIGHT:')) {
      const parts = content.split('💡 INSIGHT:');
      return (
        <>
          <Text style={[styles.messageText, isUser && styles.messageTextUser]}>
            {parts[0].trim()}
          </Text>
          {parts[1] && (
            <TouchableOpacity
              style={styles.inlineInsight}
              onPress={() => onInsightPress?.(message)}
            >
              <LinearGradient
                colors={[Colors.goldMuted, 'rgba(197, 160, 89, 0.25)']}
                style={styles.inlineInsightGradient}
              >
                <Ionicons name="bulb" size={16} color={Colors.burnishedGold} />
                <Text style={styles.inlineInsightText}>
                  {parts[1].trim()}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </>
      );
    }

    return (
      <Text style={[styles.messageText, isUser && styles.messageTextUser]}>
        {content}
      </Text>
    );
  };

  return (
    <Animated.View
      entering={FadeInUp.duration(400).delay(Math.min(index * 80, 400))}
      style={[styles.container, containerStyle]}
    >
      <Pressable
        ref={blockRef}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={handleLongPress}
        delayLongPress={400}
      >
        {/* Speaker attribution */}
        <View style={styles.attribution}>
          <View style={[styles.speakerIndicator, { backgroundColor: isUser ? Colors.midnightEmerald : coachColor }]} />
          <Text style={[styles.speakerName, isUser && styles.speakerNameUser]}>
            {isUser ? 'You' : coachName}
          </Text>
          <Text style={styles.timestamp}>{formatTime(message.created_at)}</Text>
          {isInsight && (
            <View style={styles.insightBadge}>
              <Ionicons name="bookmark" size={12} color={Colors.burnishedGold} />
            </View>
          )}
        </View>

        {/* Message card */}
        <View style={[styles.messageCard, isUser ? styles.messageCardUser : styles.messageCardCoach]}>
          {/* Highlight overlay for long press */}
          <Animated.View style={[styles.highlightOverlay, highlightStyle]} />

          {/* Gold accent border for coach messages */}
          {!isUser && (
            <View style={[styles.accentBorder, { backgroundColor: coachColor }]} />
          )}

          {/* Content */}
          <View style={[styles.messageContent, !isUser && styles.messageContentCoach]}>
            {renderContent()}

            {/* Streaming cursor */}
            {isStreaming && (
              <Animated.View style={styles.cursor} />
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// Key Insight Card - Appears when an insight is detected
interface KeyInsightCardProps {
  insightContent: string;
  coachName: string;
  coachColor: string;
  onSaveToJournal: () => void;
  onDismiss: () => void;
}

export function KeyInsightCard({
  insightContent,
  coachName,
  coachColor,
  onSaveToJournal,
  onDismiss,
}: KeyInsightCardProps) {
  return (
    <Animated.View
      entering={FadeInUp.duration(500).springify()}
      style={styles.insightCardContainer}
    >
      <LinearGradient
        colors={[Colors.warmOatmeal, Colors.cream]}
        style={styles.insightCard}
      >
        {/* Gold border accent */}
        <View style={styles.insightCardBorder}>
          <LinearGradient
            colors={[Colors.burnishedGold, Colors.goldLight, Colors.burnishedGold]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.insightCardBorderGradient}
          />
        </View>

        {/* Header */}
        <View style={styles.insightCardHeader}>
          <View style={styles.insightCardIcon}>
            <Ionicons name="bulb" size={24} color={Colors.burnishedGold} />
          </View>
          <Text style={styles.insightCardTitle}>Key Insight</Text>
          <TouchableOpacity onPress={onDismiss} style={styles.insightCardClose}>
            <Ionicons name="close" size={20} color={Colors.stoneGray} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <Text style={styles.insightCardContent}>
          "{insightContent}"
        </Text>

        {/* Attribution */}
        <View style={styles.insightCardAttribution}>
          <View style={[styles.insightCardCoachDot, { backgroundColor: coachColor }]} />
          <Text style={styles.insightCardCoachName}>from {coachName}</Text>
        </View>

        {/* Action */}
        <TouchableOpacity
          style={styles.saveToJournalButton}
          onPress={onSaveToJournal}
        >
          <LinearGradient
            colors={[Colors.burnishedGold, Colors.goldLight]}
            style={styles.saveToJournalGradient}
          >
            <Ionicons name="bookmark-outline" size={18} color={Colors.white} />
            <Text style={styles.saveToJournalText}>Save to Journal</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },

  // Attribution row
  attribution: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    paddingLeft: Spacing.xs,
  },
  speakerIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Spacing.sm,
  },
  speakerName: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    color: Colors.burnishedGold,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wider,
    flex: 1,
  },
  speakerNameUser: {
    color: Colors.midnightEmerald,
  },
  timestamp: {
    fontSize: Typography.sizes.micro,
    color: Colors.stoneGray,
    marginRight: Spacing.sm,
  },
  insightBadge: {
    padding: 2,
  },

  // Message card
  messageCard: {
    position: 'relative',
    borderRadius: Radius.xl,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  messageCardCoach: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  messageCardUser: {
    backgroundColor: Colors.warmOatmealDark,
    borderWidth: 0,
  },
  highlightOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.goldMuted,
    zIndex: 1,
  },
  accentBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: Radius.xl,
    borderBottomLeftRadius: Radius.xl,
  },
  messageContent: {
    padding: Spacing.lg,
    zIndex: 2,
  },
  messageContentCoach: {
    paddingLeft: Spacing.xl,
  },
  messageText: {
    fontSize: Typography.sizes.bodyLarge,
    color: Colors.charcoal,
    lineHeight: Typography.sizes.bodyLarge * Typography.lineHeights.relaxed,
    fontFamily: Typography.fonts.serif,
  },
  messageTextUser: {
    fontFamily: Typography.fonts.sans,
    fontSize: Typography.sizes.body,
  },
  cursor: {
    width: 2,
    height: 20,
    backgroundColor: Colors.burnishedGold,
    marginTop: 4,
  },

  // Inline insight
  inlineInsight: {
    marginTop: Spacing.md,
  },
  inlineInsightGradient: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    gap: Spacing.sm,
  },
  inlineInsightText: {
    flex: 1,
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.midnightEmerald,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
    fontFamily: Typography.fonts.serif,
    fontStyle: 'italic',
  },

  // Key Insight Card
  insightCardContainer: {
    paddingHorizontal: Spacing.lg,
    marginVertical: Spacing.lg,
  },
  insightCard: {
    borderRadius: Radius.squircle,
    padding: Spacing.xl,
    ...Shadows.lg,
  },
  insightCardBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    borderTopLeftRadius: Radius.squircle,
    borderTopRightRadius: Radius.squircle,
    overflow: 'hidden',
  },
  insightCardBorderGradient: {
    flex: 1,
  },
  insightCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  insightCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  insightCardTitle: {
    flex: 1,
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    color: Colors.midnightEmerald,
    fontFamily: Typography.fonts.serif,
  },
  insightCardClose: {
    padding: Spacing.xs,
  },
  insightCardContent: {
    fontSize: Typography.sizes.bodyLarge,
    color: Colors.charcoal,
    lineHeight: Typography.sizes.bodyLarge * Typography.lineHeights.loose,
    fontFamily: Typography.fonts.serif,
    fontStyle: 'italic',
    marginBottom: Spacing.lg,
  },
  insightCardAttribution: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  insightCardCoachDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  insightCardCoachName: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
  },
  saveToJournalButton: {
    borderRadius: Radius.pill,
    overflow: 'hidden',
  },
  saveToJournalGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    gap: Spacing.sm,
  },
  saveToJournalText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
  },
});

export default EditorialBlock;
