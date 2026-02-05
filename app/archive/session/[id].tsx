// Editorial Session Review - Premium read-only view of past sessions
import React, { useState, useEffect, useCallback } from 'react';
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
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { getSessionWithMessages } from '@/lib/supabase-archive';
import { EnhancedSession, EnhancedMessage } from '@/types';
import { getCoachById } from '@/data/coaches';
import { CoachIcon } from '@/components/ui/CoachIcon';

export default function SessionReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<EnhancedSession | null>(null);
  const [messages, setMessages] = useState<EnhancedMessage[]>([]);

  const loadSession = useCallback(async () => {
    if (!id) return;

    try {
      const result = await getSessionWithMessages(id);
      if (result) {
        setSession(result.session);
        setMessages(result.messages);
      }
    } catch (error) {
      console.error('Error loading session:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const handleBackPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.burnishedGold} />
          <Text style={styles.loadingText}>Opening session...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.stoneGray} />
          <Text style={styles.errorText}>Session not found</Text>
          <TouchableOpacity style={styles.backButtonError} onPress={handleBackPress}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const coach = getCoachById(session.coach_id);
  const sessionDate = new Date(session.created_at);
  const formattedDate = sessionDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = sessionDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Ionicons name="chevron-back" size={24} color={Colors.midnightEmerald} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerLabel}>Session Transcript</Text>
        </View>
        <View style={styles.headerRight} />
      </Animated.View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Editorial Header */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.editorialHeader}>
          <View style={styles.dateBadge}>
            <Text style={styles.dateText}>{formattedDate}</Text>
            <Text style={styles.timeText}>{formattedTime}</Text>
          </View>

          <Text style={styles.sessionTitle}>{session.title}</Text>

          <View style={styles.coachInfo}>
            <CoachIcon
              iconName={coach?.icon_name || 'person'}
              color={coach?.color || Colors.burnishedGold}
              size="md"
            />
            <View style={styles.coachDetails}>
              <Text style={styles.coachLabel}>In conversation with</Text>
              <Text style={styles.coachName}>{coach?.name || 'Coach'}</Text>
            </View>
          </View>

          {session.status === 'completed' && session.breakthrough_summary && (
            <View style={styles.breakthroughBanner}>
              <LinearGradient
                colors={[Colors.goldMuted, 'rgba(197, 160, 89, 0.05)']}
                style={styles.breakthroughGradient}
              >
                <Ionicons name="star" size={16} color={Colors.burnishedGold} />
                <View style={styles.breakthroughContent}>
                  <Text style={styles.breakthroughLabel}>Breakthrough</Text>
                  <Text style={styles.breakthroughText}>{session.breakthrough_summary}</Text>
                </View>
              </LinearGradient>
            </View>
          )}
        </Animated.View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Ionicons name="chatbubbles" size={16} color={Colors.stoneGray} />
          <View style={styles.dividerLine} />
        </View>

        {/* Transcript */}
        <View style={styles.transcript}>
          {messages.map((message, index) => (
            <MessageBlock
              key={message.id}
              message={message}
              index={index}
              coachName={coach?.name || 'Coach'}
              isLastMessage={index === messages.length - 1}
            />
          ))}
        </View>

        {/* Session Summary */}
        {session.summary && (
          <Animated.View
            entering={FadeInUp.duration(500).delay(messages.length * 50)}
            style={styles.summarySection}
          >
            <View style={styles.summaryHeader}>
              <Ionicons name="document-text" size={16} color={Colors.burnishedGold} />
              <Text style={styles.summaryLabel}>Session Summary</Text>
            </View>
            <Text style={styles.summaryText}>{session.summary}</Text>
          </Animated.View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

interface MessageBlockProps {
  message: EnhancedMessage;
  index: number;
  coachName: string;
  isLastMessage: boolean;
}

function MessageBlock({ message, index, coachName, isLastMessage }: MessageBlockProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    const delay = index * 50;
    opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
    translateY.value = withDelay(delay, withTiming(0, { duration: 400 }));
  }, [index, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const isUser = message.role === 'user';
  const timestamp = new Date(message.created_at).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <Animated.View
      style={[
        styles.messageBlock,
        isUser ? styles.messageBlockUser : styles.messageBlockCoach,
        animatedStyle,
      ]}
    >
      {/* Speaker Label */}
      <View style={styles.speakerRow}>
        <Text style={[styles.speakerName, isUser && styles.speakerNameUser]}>
          {isUser ? 'You' : coachName}
        </Text>
        <Text style={styles.messageTimestamp}>{timestamp}</Text>
      </View>

      {/* Message Content */}
      <Text style={[styles.messageText, isUser && styles.messageTextUser]}>
        {message.content}
      </Text>

      {/* Insight Marker */}
      {message.is_insight && (
        <View style={styles.insightMarker}>
          <Ionicons name="sparkles" size={12} color={Colors.burnishedGold} />
          <Text style={styles.insightLabel}>
            {message.insight_title || 'Key Insight'}
          </Text>
        </View>
      )}

      {/* Decorative line between messages */}
      {!isLastMessage && <View style={styles.messageConnector} />}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.warmOatmeal,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
    marginTop: Spacing.lg,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxxl,
  },
  errorText: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    color: Colors.charcoal,
    marginTop: Spacing.lg,
  },
  backButtonError: {
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.burnishedGold,
    borderRadius: Radius.pill,
  },
  backButtonText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerLabel: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    color: Colors.stoneGray,
    letterSpacing: Typography.letterSpacing.wider,
    textTransform: 'uppercase',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xl,
  },
  editorialHeader: {
    marginBottom: Spacing.xl,
  },
  dateBadge: {
    backgroundColor: Colors.goldMuted,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
    marginBottom: Spacing.lg,
  },
  dateText: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    color: Colors.burnishedGold,
  },
  timeText: {
    fontSize: Typography.sizes.micro,
    color: Colors.stoneGray,
    marginTop: 2,
  },
  sessionTitle: {
    fontSize: Typography.sizes.display,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    color: Colors.midnightEmerald,
    lineHeight: Typography.sizes.display * Typography.lineHeights.tight,
    marginBottom: Spacing.xl,
  },
  coachInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  coachDetails: {
    flex: 1,
  },
  coachLabel: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
    marginBottom: 2,
  },
  coachName: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    color: Colors.charcoal,
  },
  breakthroughBanner: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginTop: Spacing.md,
  },
  breakthroughGradient: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  breakthroughContent: {
    flex: 1,
  },
  breakthroughLabel: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    color: Colors.burnishedGold,
    letterSpacing: Typography.letterSpacing.wide,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  breakthroughText: {
    fontSize: Typography.sizes.body,
    fontStyle: 'italic',
    color: Colors.charcoal,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.xl,
    gap: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  transcript: {
    marginBottom: Spacing.xxl,
  },
  messageBlock: {
    marginBottom: Spacing.xl,
    position: 'relative',
  },
  messageBlockUser: {
    paddingLeft: Spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: Colors.midnightEmerald,
  },
  messageBlockCoach: {
    paddingLeft: Spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: Colors.burnishedGold,
  },
  speakerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  speakerName: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    color: Colors.burnishedGold,
    letterSpacing: Typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  speakerNameUser: {
    color: Colors.midnightEmerald,
  },
  messageTimestamp: {
    fontSize: Typography.sizes.micro,
    color: Colors.stoneGray,
  },
  messageText: {
    fontSize: Typography.sizes.bodyLarge,
    color: Colors.charcoal,
    lineHeight: Typography.sizes.bodyLarge * Typography.lineHeights.relaxed,
  },
  messageTextUser: {
    fontStyle: 'normal',
  },
  insightMarker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.goldMuted,
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    marginTop: Spacing.md,
  },
  insightLabel: {
    fontSize: Typography.sizes.micro,
    fontWeight: Typography.weights.semibold,
    color: Colors.burnishedGold,
  },
  messageConnector: {
    position: 'absolute',
    left: -1.5,
    bottom: -Spacing.xl,
    width: 1,
    height: Spacing.xl,
    backgroundColor: Colors.borderLight,
  },
  summarySection: {
    backgroundColor: Colors.cream,
    padding: Spacing.xl,
    borderRadius: Radius.squircle,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginTop: Spacing.lg,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  summaryLabel: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    color: Colors.burnishedGold,
    letterSpacing: Typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  summaryText: {
    fontSize: Typography.sizes.body,
    color: Colors.charcoal,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },
  bottomSpacer: {
    height: 100,
  },
});
