import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeInDown,
  SlideInDown,
  SlideOutDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { CoachIcon } from '@/components/ui/CoachIcon';
import { Coach, Message, Session, SessionResult, ContextVault } from '@/types';
import { getCoachById } from '@/data/coaches';
import { supabase } from '@/lib/supabase';
import {
  addSession,
  updateSession,
  getContextVault,
  updateDayPlan,
  getDayPlans,
} from '@/store/app';
import { createSession, updateSessionById } from '@/lib/supabase-sanctuary';
import { streamChat, generateArtifacts } from '@/lib/apiClient';
import { getUserTier, getRemainingSessionsToday, incrementSessionCount, canAccessCoach, canAccessFeature, SubscriptionTier } from '@/lib/feature-gates';
import { VoiceLiveSession } from '@/components/chat/VoiceLiveSession';

export default function ChatScreen() {
  const router = useRouter();
  const { palette, subscriptionTier } = useThemeSafe();
  const insets = useSafeAreaInsets();
  const { coachId, context } = useLocalSearchParams<{
    coachId: string;
    context?: string;
  }>();

  const [coach, setCoach] = useState<Coach | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showPaperArtifact, setShowPaperArtifact] = useState(false);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const [userContext, setUserContext] = useState<ContextVault | null>(null);
  const [isGeneratingArtifacts, setIsGeneratingArtifacts] = useState(false);
  const [showVoiceMode, setShowVoiceMode] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>('free');

  const flatListRef = useRef<FlatList>(null);
  const pulseAnim = useSharedValue(1);

  useEffect(() => {
    if (isStreaming) {
      pulseAnim.value = withRepeat(
        withSequence(
          withTiming(0.4, { duration: 600 }),
          withTiming(1, { duration: 600 })
        ),
        -1
      );
    } else {
      pulseAnim.value = 1;
    }
  }, [isStreaming, pulseAnim]);

  useEffect(() => {
    initializeChat();
  }, [coachId]);

  const initializeChat = async () => {
    if (!coachId) return;

    const coachData = getCoachById(coachId);
    setCoach(coachData || null);

    // Check feature gates
    const tier = await getUserTier();
    if (!canAccessCoach(tier, coachId)) {
      Alert.alert(
        'Upgrade Required',
        'This coach requires a Sovereign or Oracle subscription.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => router.back() },
          { text: 'View Plans', onPress: () => { router.back(); router.push('/paywall'); } },
        ]
      );
      return;
    }

    const remaining = await getRemainingSessionsToday(tier);
    if (remaining <= 0) {
      Alert.alert(
        'Session Limit Reached',
        'You\'ve used all 3 free sessions today. Upgrade for unlimited sessions.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => router.back() },
          { text: 'Upgrade', onPress: () => { router.back(); router.push('/paywall'); } },
        ]
      );
      return;
    }

    // Check voice coaching availability
    setCurrentTier(tier);
    const hasVoice = canAccessFeature(tier, 'voiceCoaching');
    setVoiceEnabled(hasVoice);

    const vault = await getContextVault();
    setUserContext(vault);

    const { data: authData } = await supabase.auth.getSession();
    const authUser = authData.session?.user;
    if (!authUser) {
      Alert.alert('Sign in required', 'Please sign in to start a coaching session.');
      router.replace('/(auth)/login');
      return;
    }

    await incrementSessionCount();
    const dbSession = await createSession(authUser.id, coachId, 'New Session');
    if (!dbSession) {
      Alert.alert('Error', 'Could not start a session. Please try again.');
      return;
    }

    setSessionId(dbSession.id);

    const newSession: Session = {
      id: dbSession.id,
      user_id: authUser.id,
      coach_id: coachId,
      title: dbSession.title,
      status: dbSession.status as Session['status'],
      created_at: dbSession.created_at,
    };

    await addSession(newSession);

    let greeting = `Welcome. I'm here to help you make meaningful progress today. What's on your mind?`;

    if (context === 'plan') {
      greeting = `Let's refine your plan together. What would you like to adjust or focus on?`;
    } else if (vault && vault.goals.length > 0) {
      const focusGoal = vault.goals.find((g) => g.is_30_day_focus);
      if (focusGoal) {
        greeting = `Good to see you. Your 30-day focus is "${focusGoal.title}". How can I help you move forward today?`;
      }
    }

    const initialMessage: Message = {
      id: Date.now().toString(),
      session_id: dbSession.id,
      role: 'assistant',
      content: greeting,
      created_at: new Date().toISOString(),
    };

    setMessages([initialMessage]);
  };

  const handleSend = async () => {
    if (!inputText.trim() || isStreaming) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMessage: Message = {
      id: Date.now().toString(),
      session_id: sessionId || '',
      role: 'user',
      content: inputText.trim(),
      created_at: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    const currentInput = inputText.trim();
    setInputText('');
    setIsStreaming(true);
    setStreamingText('');

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      if (!coach || !sessionId) {
        throw new Error('Session not ready');
      }

      let streamedText = '';
      await streamChat(sessionId, currentInput, {
        onToken: (chunk) => {
          streamedText += chunk;
          setStreamingText(streamedText);
        },
        onError: (message) => {
          throw new Error(message);
        },
      });

      const assistantMessage: Message = {
        id: Date.now().toString(),
        session_id: sessionId,
        role: 'assistant',
        content: streamedText || 'I am here to help. What would you like to focus on next?',
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setStreamingText('');
      setIsStreaming(false);

      if (messages.length === 1 && sessionId) {
        const title = assistantMessage.content.slice(0, 50) + (assistantMessage.content.length > 50 ? '...' : '');
        await updateSession(sessionId, { title });
        await updateSessionById(sessionId, { title });
      }

      const lastUserMessage = updatedMessages.filter(m => m.role === 'user').pop();
      if (lastUserMessage) {
        const input = lastUserMessage.content.toLowerCase();
        if (
          input.includes('done') ||
          input.includes('finish') ||
          input.includes('end session') ||
          input.includes('wrap up') ||
          input.includes('that helps') ||
          input.includes("that's all")
        ) {
          await generateSessionResults();
        }
      }

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      setIsStreaming(false);

      const errorMessage: Message = {
        id: Date.now().toString(),
        session_id: sessionId || '',
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again in a moment.',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const generateSessionResults = async () => {
    if (!coach || isGeneratingArtifacts) return;

    setIsGeneratingArtifacts(true);

    try {
      if (!sessionId) {
        throw new Error('Session not ready');
      }

      const artifacts = await generateArtifacts(sessionId);
      setSessionResult(artifacts);

      await updateSession(sessionId, {
        summary: artifacts.summary,
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
      await updateSessionById(sessionId, {
        summary: artifacts.summary,
        status: 'completed',
        completed_at: new Date().toISOString(),
      });

      if (artifacts.plan_updates && artifacts.plan_updates.length > 0) {
        const existingPlans = await getDayPlans();

        for (const update of artifacts.plan_updates) {
          const existingPlan = existingPlans.find(p => p.date === update.date);

          const dayPlan = {
            id: existingPlan?.id || `plan-${update.date}-${Date.now()}`,
            user_id: userContext?.user_id || 'local-user',
            date: update.date,
            top_priorities: update.priorities || existingPlan?.top_priorities || [],
            time_blocks: update.time_blocks || existingPlan?.time_blocks || [],
            created_at: existingPlan?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          await updateDayPlan(dayPlan);
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowPaperArtifact(true);
    } catch (error) {
      console.error('Error generating session results:', error);
    } finally {
      setIsGeneratingArtifacts(false);
    }
  };

  const handleEndSession = useCallback(async () => {
    Alert.alert(
      'End Session',
      'Would you like to generate insights from this session?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Generate Insights', onPress: generateSessionResults },
        { text: 'Exit', style: 'destructive', onPress: () => router.back() },
      ]
    );
  }, [messages, coach, userContext, sessionId, router]);

  const handleBack = () => {
    if (messages.length > 2) {
      handleEndSession();
    } else {
      router.back();
    }
  };

  const handleConfirmArtifact = () => {
    setShowPaperArtifact(false);
    router.push('/(tabs)/plan');
  };

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseAnim.value,
  }));

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isUser = item.role === 'user';

    return (
      <Animated.View
        entering={FadeInUp.duration(400).delay(Math.min(index * 50, 200))}
        style={styles.transcriptEntry}
      >
        {/* Speaker indicator */}
        <View style={styles.speakerRow}>
          <View style={[styles.speakerDot, { backgroundColor: palette.accent }, isUser && { backgroundColor: palette.textPrimary }]} />
          <Text style={[styles.speakerLabel, { color: palette.accent }, isUser && { color: palette.textPrimary }]}>
            {isUser ? 'You' : coach?.name || 'Coach'}
          </Text>
          <Text style={[styles.timestamp, { color: palette.textTertiary }]}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        {/* Message content - transcript style */}
        <View style={[styles.transcriptContent, { borderLeftColor: palette.accentMuted }, isUser && { borderLeftColor: palette.borderLight }]}>
          <Text style={[styles.transcriptText, { color: palette.textSecondary }, isUser && styles.transcriptTextUser]}>
            {item.content}
          </Text>
        </View>
      </Animated.View>
    );
  };

  if (!coach) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={palette.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Premium Header */}
      <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.background }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-down" size={28} color={palette.textPrimary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <CoachIcon iconName={coach.icon_name} color={coach.color} size="sm" />
          <View style={styles.headerInfo}>
            <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>{coach.name}</Text>
            <Text style={[styles.headerSubtitle, { color: palette.textTertiary }]}>Session in progress</Text>
          </View>
        </View>

        {/* Voice Mode Toggle */}
        <TouchableOpacity
          onPress={() => {
            if (!voiceEnabled) {
              Alert.alert('Voice Coaching', 'Voice coaching is available on Sovereign and Oracle plans.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Upgrade', onPress: () => { router.back(); router.push('/paywall'); } },
              ]);
              return;
            }
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setShowVoiceMode(true);
          }}
          style={[styles.voiceButton, !voiceEnabled && { opacity: 0.4 }]}
        >
          <Ionicons name="mic" size={18} color={palette.accent} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => sessionResult ? setShowPaperArtifact(true) : generateSessionResults()}
          style={styles.insightsButton}
          disabled={isGeneratingArtifacts}
        >
          {isGeneratingArtifacts ? (
            <ActivityIndicator size="small" color={palette.accent} />
          ) : (
            <>
              <Ionicons name="sparkles" size={18} color={palette.accent} />
              {sessionResult && <View style={[styles.insightsBadge, { backgroundColor: palette.success }]} />}
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Transcript-style messages */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={() => (
            <>
              {isStreaming && streamingText && (
                <Animated.View entering={FadeIn.duration(300)} style={styles.transcriptEntry}>
                  <View style={styles.speakerRow}>
                    <View style={[styles.speakerDot, { backgroundColor: palette.accent }]} />
                    <Text style={[styles.speakerLabel, { color: palette.accent }]}>{coach.name}</Text>
                    <Animated.View style={[styles.typingIndicator, { backgroundColor: palette.accentMuted }, pulseStyle]}>
                      <Text style={[styles.typingText, { color: palette.accent }]}>composing</Text>
                    </Animated.View>
                  </View>
                  <View style={[styles.transcriptContent, { borderLeftColor: palette.accentMuted }]}>
                    <Text style={[styles.transcriptText, { color: palette.textSecondary }]}>{streamingText}</Text>
                    <Animated.View style={[styles.cursor, { backgroundColor: palette.accent }, pulseStyle]} />
                  </View>
                </Animated.View>
              )}
              {(isStreaming && !streamingText) && (
                <Animated.View entering={FadeIn.duration(300)} style={styles.thinkingContainer}>
                  <View style={styles.thinkingDots}>
                    <View style={[styles.thinkingDot, { backgroundColor: palette.accent }]} />
                    <View style={[styles.thinkingDot, { backgroundColor: palette.accent, marginHorizontal: 4 }]} />
                    <View style={[styles.thinkingDot, { backgroundColor: palette.accent }]} />
                  </View>
                  <Text style={[styles.thinkingText, { color: palette.textTertiary }]}>{coach.name} is reflecting...</Text>
                </Animated.View>
              )}
            </>
          )}
        />

        {/* Premium Input */}
        <View style={[styles.inputContainer, { paddingBottom: insets.bottom || Spacing.md, backgroundColor: palette.background, borderTopColor: palette.borderLight }]}>
          <View style={[styles.inputWrapper, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
            <TextInput
              style={[styles.input, { color: palette.textSecondary }]}
              placeholder="Share your thoughts..."
              placeholderTextColor={palette.textTertiary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
              editable={!isStreaming}
            />
            <TouchableOpacity
              style={[styles.sendButton, { backgroundColor: palette.accent }, (!inputText.trim() || isStreaming) && { backgroundColor: palette.backgroundSecondary }]}
              onPress={handleSend}
              disabled={!inputText.trim() || isStreaming}
            >
              <Ionicons
                name="arrow-up"
                size={20}
                color={(!inputText.trim() || isStreaming) ? palette.textTertiary : palette.textInverse}
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Paper Artifact Modal */}
      <Modal
        visible={showPaperArtifact}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPaperArtifact(false)}
      >
        <PaperArtifact
          sessionResult={sessionResult}
          coach={coach}
          onClose={() => setShowPaperArtifact(false)}
          onConfirm={handleConfirmArtifact}
        />
      </Modal>

      {/* Voice Live Session Modal */}
      <Modal
        visible={showVoiceMode}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowVoiceMode(false)}
      >
        <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
          <VoiceLiveSession
            coachId={coachId || ''}
            sessionId={sessionId || ''}
            coachName={coach?.name || 'Coach'}
            isVisible={showVoiceMode}
            onClose={() => setShowVoiceMode(false)}
            onTranscriptUpdate={(userText, aiText) => {
              // Add voice transcript to chat messages
              if (aiText) {
                const aiMessage: Message = {
                  id: `voice-${Date.now()}`,
                  session_id: sessionId || '',
                  role: 'assistant',
                  content: aiText,
                  created_at: new Date().toISOString(),
                };
                setMessages(prev => [...prev, aiMessage]);
              }
            }}
            onInsightSaved={(title, content) => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function PaperArtifact({
  sessionResult,
  coach,
  onClose,
  onConfirm,
}: {
  sessionResult: SessionResult | null;
  coach: Coach;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const { palette } = useThemeSafe();
  const insets = useSafeAreaInsets();

  if (!sessionResult) return null;

  return (
    <View style={[paperStyles.container, { paddingTop: insets.top, backgroundColor: palette.background }]}>
      {/* Paper Header */}
      <View style={[paperStyles.header, { borderBottomColor: palette.borderLight }]}>
        <TouchableOpacity onPress={onClose} style={paperStyles.closeButton}>
          <Ionicons name="close" size={24} color={palette.textTertiary} />
        </TouchableOpacity>
        <Text style={[paperStyles.headerTitle, { color: palette.textPrimary }]}>Session Insights</Text>
        <View style={paperStyles.headerSpacer} />
      </View>

      <ScrollView
        style={paperStyles.scrollView}
        contentContainerStyle={paperStyles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Coach Attribution */}
        <Animated.View entering={FadeInUp.duration(600)} style={[paperStyles.attribution, { borderBottomColor: palette.borderLight }]}>
          <CoachIcon iconName={coach.icon_name} color={coach.color} size="md" />
          <View style={paperStyles.attributionText}>
            <Text style={[paperStyles.attributionLabel, { color: palette.textTertiary }]}>Guided by</Text>
            <Text style={[paperStyles.attributionName, { color: palette.textPrimary }]}>{coach.name}</Text>
          </View>
        </Animated.View>

        {/* Summary Section */}
        <Animated.View entering={FadeInUp.duration(600).delay(100)} style={paperStyles.section}>
          <Text style={[paperStyles.sectionTitle, { color: palette.textTertiary }]}>Summary</Text>
          <View style={[paperStyles.summaryCard, { backgroundColor: palette.cardBg, borderColor: palette.borderLight }]}>
            <Text style={[paperStyles.summaryText, { color: palette.textSecondary }]}>{sessionResult.summary}</Text>
          </View>
        </Animated.View>

        {/* Next Actions */}
        {sessionResult.next_actions && sessionResult.next_actions.length > 0 && (
          <Animated.View entering={FadeInUp.duration(600).delay(200)} style={paperStyles.section}>
            <Text style={[paperStyles.sectionTitle, { color: palette.textTertiary }]}>Next Actions</Text>
            <View style={paperStyles.actionsContainer}>
              {sessionResult.next_actions.map((action, index) => (
                <Animated.View
                  key={action.id}
                  entering={FadeInUp.duration(400).delay(300 + index * 100)}
                  style={[paperStyles.actionItem, { backgroundColor: palette.cardBg, borderColor: palette.borderLight }]}
                >
                  <View style={[paperStyles.actionNumber, { backgroundColor: palette.accentMuted }]}>
                    <Text style={[paperStyles.actionNumberText, { color: palette.accent }]}>{index + 1}</Text>
                  </View>
                  <Text style={[paperStyles.actionText, { color: palette.textSecondary }]}>{action.title}</Text>
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Signature Line */}
        <Animated.View entering={FadeInUp.duration(600).delay(400)} style={paperStyles.signatureSection}>
          <View style={[paperStyles.signatureLine, { backgroundColor: palette.border }]} />
          <Text style={[paperStyles.signatureLabel, { color: palette.textTertiary }]}>Committed on {new Date().toLocaleDateString()}</Text>
        </Animated.View>
      </ScrollView>

      {/* Footer Actions */}
      <View style={[paperStyles.footer, { paddingBottom: insets.bottom || Spacing.xl, borderTopColor: palette.borderLight, backgroundColor: palette.background }]}>
        <Button
          title="View Plan"
          onPress={onConfirm}
          variant="gold"
          size="lg"
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Spacing.md,
  },
  headerInfo: {
    marginLeft: Spacing.md,
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
  voiceButton: {
    padding: Spacing.sm,
  },
  insightsButton: {
    padding: Spacing.sm,
    position: 'relative',
  },
  insightsBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Chat
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },

  // Transcript style
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

  // Thinking
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

  // Input
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
});

const paperStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.xxl,
  },
  attribution: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
    paddingBottom: Spacing.xl,
    borderBottomWidth: 1,
  },
  attributionText: {
    marginLeft: Spacing.md,
  },
  attributionLabel: {
    fontSize: Typography.sizes.caption,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wider,
  },
  attributionName: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
  },
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wider,
    marginBottom: Spacing.md,
  },
  summaryCard: {
    borderRadius: Radius.squircle,
    padding: Spacing.xl,
    borderWidth: 1,
    ...Shadows.sm,
  },
  summaryText: {
    fontSize: Typography.sizes.bodyLarge,
    lineHeight: Typography.sizes.bodyLarge * Typography.lineHeights.relaxed,
    fontFamily: Typography.fonts.serif,
    fontStyle: 'italic',
  },
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
    fontFamily: Typography.fonts.serif,
  },
  actionText: {
    flex: 1,
    fontSize: Typography.sizes.body,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },
  signatureSection: {
    alignItems: 'center',
    marginTop: Spacing.xxl,
    paddingTop: Spacing.xl,
  },
  signatureLine: {
    width: 200,
    height: 1,
    marginBottom: Spacing.md,
  },
  signatureLabel: {
    fontSize: Typography.sizes.caption,
    fontStyle: 'italic',
  },
  footer: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
  },
});
