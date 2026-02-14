import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  FlatList,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { CoachIcon } from '@/components/ui/CoachIcon';
import { MarkdownText } from '@/components/ui/MarkdownText';
import { PremiumPageTransition } from '@/components/ui/PremiumPageTransition';
import { VoiceLiveSession } from '@/components/chat/VoiceLiveSession';
import { SAMPLE_COACHES } from '@/data/coaches';
import { Coach, Message, Session } from '@/types';
import {
  getOnboardingData,
  completeNewOnboarding,
  getOpeningQuestion,
} from '@/lib/onboarding';
import { supabase } from '@/lib/supabase';
import { createSession } from '@/lib/supabase-sanctuary';
import { addSession } from '@/store/app';
import {
  isFunctionUnavailableError,
  isInsufficientCreditsError,
  isUnauthorizedError,
  streamChat,
} from '@/lib/apiClient';
import { getUserTier, canAccessFeature } from '@/lib/feature-gates';
import { useAlert } from '@/contexts/AlertContext';

const MIN_USER_TURNS_TO_COMPLETE = 3;

interface ChatMessageRowProps {
  item: Message;
  index: number;
  coachName: string;
  palette: ReturnType<typeof useThemeSafe>['palette'];
}

const ChatMessageRow = React.memo(function ChatMessageRow({
  item,
  index,
  coachName,
  palette,
}: ChatMessageRowProps) {
  const isUser = item.role === 'user';
  const formattedTime = useMemo(
    () => new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    [item.created_at],
  );

  return (
    <Animated.View
      entering={FadeInUp.duration(360).delay(Math.min(index * 60, 220))}
      style={styles.transcriptEntry}
    >
      <View style={styles.speakerRow}>
        <View
          style={[
            styles.speakerDot,
            { backgroundColor: palette.accent },
            isUser && { backgroundColor: palette.textPrimary },
          ]}
        />
        <Text
          style={[
            styles.speakerLabel,
            { color: palette.accent },
            isUser && { color: palette.textPrimary },
          ]}
        >
          {isUser ? 'You' : coachName}
        </Text>
        <Text style={[styles.timestamp, { color: palette.textTertiary }]}>{formattedTime}</Text>
      </View>

      <View
        style={[
          styles.transcriptContent,
          { borderLeftColor: palette.accentMuted },
          isUser && { borderLeftColor: palette.borderLight },
        ]}
      >
        <MarkdownText
          content={item.content}
          textStyle={[
            styles.transcriptText,
            { color: palette.textSecondary },
            isUser && styles.transcriptTextUser,
          ]}
          accentColor={palette.accent}
          mutedColor={palette.textTertiary}
        />
      </View>
    </Animated.View>
  );
});

export default function FirstSessionScreen() {
  const router = useRouter();
  const { palette } = useThemeSafe();
  const insets = useSafeAreaInsets();
  const { showAlert, showToast } = useAlert();

  const [coachInfo, setCoachInfo] = useState<Coach | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isBooting, setIsBooting] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [aiFailureCount, setAiFailureCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [showVoiceMode, setShowVoiceMode] = useState(false);

  const flatListRef = useRef<FlatList<Message>>(null);
  const pulseAnim = useSharedValue(1);

  useEffect(() => {
    if (isStreaming) {
      pulseAnim.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 600 }),
          withTiming(1, { duration: 600 }),
        ),
        -1,
      );
    } else {
      pulseAnim.value = 1;
    }
  }, [isStreaming, pulseAnim]);

  useEffect(() => {
    if (!messages.length && !streamingText) return;

    const timeout = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 80);

    return () => clearTimeout(timeout);
  }, [messages, streamingText]);

  const initializeSession = useCallback(async () => {
    setIsBooting(true);

    try {
      const onboardingData = await getOnboardingData();
      const selectedCoach =
        SAMPLE_COACHES.find((coach) => coach.id === onboardingData.selectedCoachId) ??
        SAMPLE_COACHES.find((coach) => coach.id === 'coach-daily-clarity') ??
        SAMPLE_COACHES[0];

      if (!selectedCoach) {
        throw new Error('No coach available');
      }

      setCoachInfo(selectedCoach);

      let tier: Awaited<ReturnType<typeof getUserTier>> = 'free';
      try {
        tier = await getUserTier();
      } catch (error) {
        console.warn('Could not resolve subscription tier during onboarding session:', error);
      }
      setVoiceEnabled(canAccessFeature(tier, 'voiceCoaching'));

      const { data: authData } = await supabase.auth.getSession();
      const authUser = authData.session?.user;

      if (!authUser) {
        showAlert('Sign in required', 'Please sign in to start your live coaching session.');
        router.replace('/(auth)/login');
        return;
      }

      const dbSession = await createSession(authUser.id, selectedCoach.id, 'First Session', {
        coach_id: selectedCoach.id,
        name: selectedCoach.name,
        method: selectedCoach.method,
        system_prompt: selectedCoach.system_prompt,
        version: selectedCoach.version,
      });
      if (!dbSession) {
        throw new Error('Could not create coaching session');
      }

      const localSession: Session = {
        id: dbSession.id,
        user_id: authUser.id,
        coach_id: selectedCoach.id,
        title: dbSession.title,
        status: dbSession.status as Session['status'],
        created_at: dbSession.created_at,
      };

      try {
        await addSession(localSession);
      } catch (error) {
        console.warn('Could not cache onboarding session locally:', error);
      }
      setSessionId(dbSession.id);

      const vibeLabels =
        onboardingData.vibes.length > 0
          ? onboardingData.vibes.map((vibe) =>
              vibe
                .replace('-', ' ')
                .split(' ')
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' '),
            )
          : ['Personal Growth'];

      const openingMessage: Message = {
        id: `opening-${Date.now()}`,
        session_id: dbSession.id,
        role: 'assistant',
        content: getOpeningQuestion(vibeLabels),
        created_at: new Date().toISOString(),
      };

      setMessages([openingMessage]);
    } catch (error) {
      console.error('Error starting onboarding session:', error);
      showToast('Error', {
        variant: 'error',
        message: 'Could not start your session. Please try again.',
      });
    } finally {
      setIsBooting(false);
    }
  }, [router, showAlert, showToast]);

  useEffect(() => {
    void initializeSession();
  }, [initializeSession]);

  const completeOnboardingAndEnter = useCallback(async () => {
    if (isCompleting) return;

    setIsCompleting(true);

    try {
      await completeNewOnboarding();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast('Error', {
        variant: 'error',
        message: 'Could not complete onboarding. Please try again.',
      });
    } finally {
      setIsCompleting(false);
    }
  }, [isCompleting, router, showToast]);

  const handleSkipForNow = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void completeOnboardingAndEnter();
  }, [completeOnboardingAndEnter]);

  const promptSkipForNow = useCallback(() => {
    showAlert(
      'Skip onboarding for now?',
      'You can enter the app now and start a full coaching session later.',
      [
        { text: 'Stay here', style: 'cancel' },
        {
          text: 'Skip for now',
          onPress: () => {
            handleSkipForNow();
          },
        },
      ],
    );
  }, [handleSkipForNow, showAlert]);

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isStreaming) return;

    if (!sessionId) {
      showToast('Session unavailable', {
        variant: 'warning',
        message: 'Please restart onboarding to begin your session again.',
      });
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userText = inputValue.trim();
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      session_id: sessionId,
      role: 'user',
      content: userText,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsStreaming(true);
    setStreamingText('');

    try {
      let streamedText = '';
      await streamChat(
        sessionId,
        userText,
        {
          onToken: (chunk) => {
            streamedText += chunk;
            setStreamingText(streamedText);
          },
          onError: (message) => {
            throw new Error(message);
          },
        },
      );

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        session_id: sessionId,
        role: 'assistant',
        content: streamedText || 'I am here with you. What feels most important right now?',
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setStreamingText('');
      setIsStreaming(false);
      setAiFailureCount(0);

      const userTurns = messages.filter((message) => message.role === 'user').length + 1;
      if (userTurns >= MIN_USER_TURNS_TO_COMPLETE) {
        setIsComplete(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      setIsStreaming(false);
      setStreamingText('');

      const unavailable = isFunctionUnavailableError(error);
      const insufficientCredits = isInsufficientCreditsError(error);
      const unauthorized = isUnauthorizedError(error);

      if (insufficientCredits) {
        showAlert(
          'Out of Credits',
          'You do not have enough credits to continue. Upgrade your plan to keep coaching.',
          [
            { text: 'Not Now', style: 'cancel' },
            { text: 'View Plans', onPress: () => router.push('/paywall') },
          ],
        );
      } else {
        const nextFailureCount = aiFailureCount + 1;
        setAiFailureCount(nextFailureCount);

        if (unavailable || unauthorized || nextFailureCount >= 2) {
          showAlert(
            'Coaching is having trouble connecting',
            'You can keep trying, or skip onboarding for now and explore the app.',
            [
              { text: 'Keep trying', style: 'cancel' },
              {
                text: 'Skip for now',
                onPress: () => {
                  handleSkipForNow();
                },
              },
            ],
          );
        }
      }

      const errorMessage: Message = {
        id: `assistant-error-${Date.now()}`,
        session_id: sessionId,
        role: 'assistant',
        content: unavailable
          ? 'The coaching service is temporarily unavailable. Please try again in a moment.'
          : unauthorized
            ? 'Your session is not authorized right now. Please try again, or skip onboarding for now.'
          : insufficientCredits
            ? 'You are out of credits for now. Upgrade your plan to continue this conversation.'
            : 'I hit an issue while responding. Please try once more.',
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    }
  }, [
    aiFailureCount,
    handleSkipForNow,
    inputValue,
    isStreaming,
    messages,
    router,
    sessionId,
    showAlert,
    showToast,
  ]);

  const handleEnterCoachZeno = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await completeOnboardingAndEnter();
  }, [completeOnboardingAndEnter]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseAnim.value,
  }));

  const coachName = coachInfo?.name ?? 'Coach';

  const renderMessage = useCallback(
    ({ item, index }: { item: Message; index: number }) => (
      <ChatMessageRow item={item} index={index} coachName={coachName} palette={palette} />
    ),
    [coachName, palette],
  );

  const messageKeyExtractor = useCallback((item: Message) => item.id, []);

  const listFooter = useMemo(
    () => (
      <>
        {isStreaming && streamingText.length > 0 && (
          <Animated.View entering={FadeIn.duration(280)} style={styles.transcriptEntry}>
            <View style={styles.speakerRow}>
              <View style={[styles.speakerDot, { backgroundColor: palette.accent }]} />
              <Text style={[styles.speakerLabel, { color: palette.accent }]}>{coachName}</Text>
              <Animated.View style={[styles.typingIndicator, { backgroundColor: palette.accentMuted }, pulseStyle]}>
                <Text style={[styles.typingText, { color: palette.accent }]}>composing</Text>
              </Animated.View>
            </View>
            <View style={[styles.transcriptContent, { borderLeftColor: palette.accentMuted }]}>
              <MarkdownText
                content={streamingText}
                textStyle={[styles.transcriptText, { color: palette.textSecondary }]}
                accentColor={palette.accent}
                mutedColor={palette.textTertiary}
              />
              <Animated.View style={[styles.cursor, { backgroundColor: palette.accent }, pulseStyle]} />
            </View>
          </Animated.View>
        )}
        {isStreaming && !streamingText.length && (
          <Animated.View entering={FadeIn.duration(280)} style={styles.thinkingContainer}>
            <View style={styles.thinkingDots}>
              <View style={[styles.thinkingDot, { backgroundColor: palette.accent }]} />
              <View style={[styles.thinkingDot, { backgroundColor: palette.accent, marginHorizontal: 4 }]} />
              <View style={[styles.thinkingDot, { backgroundColor: palette.accent }]} />
            </View>
            <Text style={[styles.thinkingText, { color: palette.textTertiary }]}>{coachName} is reflecting...</Text>
          </Animated.View>
        )}
      </>
    ),
    [coachName, isStreaming, palette.accent, palette.accentMuted, palette.textSecondary, palette.textTertiary, pulseStyle, streamingText],
  );

  if (isBooting || !coachInfo) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={palette.accent} style={{ marginBottom: Spacing.md }} />
          <Text style={[styles.loadingText, { color: palette.textTertiary }]}>Starting your first coaching session...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['bottom']}>
      <PremiumPageTransition style={styles.container}>
        <View
          style={[
            styles.header,
            {
              borderBottomColor: palette.borderLight,
              backgroundColor: palette.background,
            },
          ]}
        >
          <View style={styles.headerCenter}>
            <OnboardingCoachAvatar coach={coachInfo} />
            <View style={styles.headerInfo}>
              <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>{coachInfo.name}</Text>
              <Text style={[styles.headerSubtitle, { color: palette.textTertiary }]}>Your first session</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => {
              if (!voiceEnabled) {
                showAlert('Voice Coaching', 'Voice coaching is available on Sovereign and Oracle plans.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Upgrade', onPress: () => router.push('/paywall') },
                ]);
                return;
              }

              if (!sessionId) {
                showToast('Session unavailable', {
                  variant: 'warning',
                  message: 'Voice will be available once your session starts.',
                });
                return;
              }

              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setShowVoiceMode(true);
            }}
            style={[styles.voiceButton, !voiceEnabled && { opacity: 0.4 }]}
          >
            <Ionicons name="mic" size={18} color={palette.accent} />
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={messageKeyExtractor}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={listFooter}
            initialNumToRender={8}
            maxToRenderPerBatch={6}
            windowSize={9}
            removeClippedSubviews={Platform.OS === 'android'}
            keyboardShouldPersistTaps="handled"
          />

          {!isComplete ? (
            <View
              style={[
                styles.inputContainer,
                {
                  paddingBottom: (insets.bottom || Spacing.md) + Spacing.xs,
                  backgroundColor: palette.background,
                  borderTopColor: palette.borderLight,
                },
              ]}
            >
              <View style={[styles.inputWrapper, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
                <TextInput
                  style={[styles.input, { color: palette.textSecondary }]}
                  placeholder="Share your thoughts..."
                  placeholderTextColor={palette.textTertiary}
                  value={inputValue}
                  onChangeText={setInputValue}
                  multiline
                  maxLength={1000}
                  editable={!isStreaming}
                />
                <TouchableOpacity
                  style={[
                    styles.sendButton,
                    { backgroundColor: palette.accent },
                    (!inputValue.trim() || isStreaming || !sessionId) && {
                      backgroundColor: palette.backgroundSecondary,
                    },
                  ]}
                  onPress={handleSendMessage}
                  disabled={!inputValue.trim() || isStreaming || !sessionId}
                >
                  <Ionicons
                    name="arrow-up"
                    size={20}
                    color={
                      !inputValue.trim() || isStreaming || !sessionId
                        ? palette.textTertiary
                        : palette.textInverse
                    }
                  />
                </TouchableOpacity>
              </View>

              <Button
                title="Skip for now"
                onPress={promptSkipForNow}
                disabled={isCompleting}
                loading={isCompleting}
                variant="outline"
                size="sm"
                fullWidth
                style={styles.skipButton}
              />
            </View>
          ) : (
            <Animated.View
              entering={FadeInUp.duration(320)}
              style={[
                styles.completeFooter,
                {
                  borderTopColor: palette.borderLight,
                  backgroundColor: palette.background,
                  paddingBottom: insets.bottom || Spacing.xl,
                },
              ]}
            >
              <View style={[styles.completionCard, { backgroundColor: palette.accentMuted }]}>
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={palette.accent}
                  style={styles.completionIcon}
                />
                <Text style={[styles.completionText, { color: palette.textPrimary }]}>
                  Great start. You&apos;ve built real momentum with your coach.
                </Text>
              </View>
              <Button
                title="Enter CoachZeno"
                onPress={handleEnterCoachZeno}
                disabled={isCompleting}
                loading={isCompleting}
                variant="gold"
                size="lg"
                fullWidth
              />
            </Animated.View>
          )}
        </KeyboardAvoidingView>
      </PremiumPageTransition>

      <Modal
        visible={showVoiceMode}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowVoiceMode(false)}
      >
        <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
          <VoiceLiveSession
            coachId={coachInfo.id}
            sessionId={sessionId || ''}
            coachName={coachInfo.name}
            isVisible={showVoiceMode}
            onClose={() => setShowVoiceMode(false)}
            onTranscriptUpdate={(_userText, aiText) => {
              if (!aiText.trim() || !sessionId) return;

              const aiMessage: Message = {
                id: `voice-${Date.now()}`,
                session_id: sessionId,
                role: 'assistant',
                content: aiText,
                created_at: new Date().toISOString(),
              };

              setMessages((prev) => [...prev, aiMessage]);
            }}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function OnboardingCoachAvatar({ coach }: { coach: Coach }) {
  const { palette } = useThemeSafe();

  if (coach.image) {
    return (
      <View
        style={[
          styles.headerAvatarFrame,
          { borderColor: palette.borderLight, backgroundColor: palette.cardBg },
        ]}
      >
        <Image source={coach.image} style={styles.headerAvatarImage} resizeMode="cover" />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.headerAvatarFrame,
        { borderColor: palette.borderLight, backgroundColor: palette.cardBg },
      ]}
    >
      <CoachIcon iconName={coach.icon_name} color={coach.color} size="md" variant="default" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: Typography.sizes.body,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  headerInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  headerTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
  },
  headerSubtitle: {
    fontSize: Typography.sizes.caption,
    marginTop: 2,
  },
  headerAvatarFrame: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headerAvatarImage: {
    width: '100%',
    height: '100%',
  },
  voiceButton: {
    padding: Spacing.sm,
  },

  chatContainer: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xl,
    paddingBottom: 260,
  },

  transcriptEntry: {
    marginBottom: Spacing.xxl,
  },
  speakerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  speakerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  speakerLabel: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wider,
    flex: 1,
  },
  timestamp: {
    fontSize: Typography.sizes.micro,
  },
  transcriptContent: {
    paddingLeft: Spacing.lg,
    borderLeftWidth: 2,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  transcriptText: {
    fontSize: Typography.sizes.bodyLarge,
    lineHeight: Typography.sizes.bodyLarge * Typography.lineHeights.relaxed,
    fontFamily: Typography.fonts.serif,
  },
  transcriptTextUser: {
    fontFamily: Typography.fonts.sans,
  },
  cursor: {
    width: 2,
    height: 20,
    marginLeft: 4,
    marginBottom: 2,
  },
  typingIndicator: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  typingText: {
    fontSize: Typography.sizes.micro,
    fontStyle: 'italic',
  },

  thinkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  thinkingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  thinkingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  thinkingText: {
    fontSize: Typography.sizes.caption,
    fontStyle: 'italic',
  },

  inputContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: Radius.squircle,
    borderWidth: 1,
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.xs,
    paddingVertical: Spacing.xs,
    ...Shadows.sm,
  },
  input: {
    flex: 1,
    fontSize: Typography.sizes.body,
    maxHeight: 100,
    paddingVertical: Spacing.sm,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    marginTop: Spacing.sm,
  },

  completeFooter: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    gap: Spacing.md,
  },
  completionCard: {
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  completionIcon: {
    flexShrink: 0,
  },
  completionText: {
    flex: 1,
    fontSize: Typography.sizes.body,
    lineHeight: Typography.sizes.body * Typography.lineHeights.snug,
  },
});
