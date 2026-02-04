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
import { useTextGeneration } from '@fastshot/ai';
import { Colors, Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CoachIcon } from '@/components/ui/CoachIcon';
import { Coach, Message, Session, SessionResult, ContextVault } from '@/types';
import { getCoachById } from '@/data/coaches';
import {
  addSession,
  updateSession,
  getContextVault,
  updateDayPlan,
  getDayPlans,
} from '@/store/app';
import {
  buildCoachingPrompt,
  generateSessionArtifacts,
} from '@/lib/ai-coaching';

export default function ChatScreen() {
  const router = useRouter();
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

  const flatListRef = useRef<FlatList>(null);
  const pulseAnim = useSharedValue(1);

  const { generateText, isLoading: aiLoading } = useTextGeneration({
    onSuccess: (response) => {
      handleAIResponse(response);
    },
    onError: (err) => {
      console.error('AI Error:', err);
      const errorMessage: Message = {
        id: Date.now().toString(),
        session_id: sessionId || '',
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Let me try a different approach. What specific area would you like to focus on?',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setIsStreaming(false);
    },
  });

  useEffect(() => {
    if (isStreaming || aiLoading) {
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
  }, [isStreaming, aiLoading, pulseAnim]);

  useEffect(() => {
    initializeChat();
  }, [coachId]);

  const initializeChat = async () => {
    if (!coachId) return;

    const coachData = getCoachById(coachId);
    setCoach(coachData || null);

    const vault = await getContextVault();
    setUserContext(vault);

    const newSessionId = Date.now().toString();
    setSessionId(newSessionId);

    const newSession: Session = {
      id: newSessionId,
      user_id: vault?.user_id || 'local-user',
      coach_id: coachId,
      title: 'New Session',
      status: 'active',
      created_at: new Date().toISOString(),
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
      session_id: newSessionId,
      role: 'assistant',
      content: greeting,
      created_at: new Date().toISOString(),
    };

    setMessages([initialMessage]);
  };

  const handleSend = async () => {
    if (!inputText.trim() || isStreaming || aiLoading) return;

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
      if (!coach) return;

      const fullPrompt = buildCoachingPrompt(
        coach,
        userContext,
        updatedMessages.slice(0, -1),
        currentInput
      );

      await generateText(fullPrompt);
    } catch (error) {
      console.error('Error sending message:', error);
      setIsStreaming(false);
    }
  };

  const handleAIResponse = async (response: string) => {
    const chunkSize = 3;
    for (let i = 0; i <= response.length; i += chunkSize) {
      await new Promise((resolve) => setTimeout(resolve, 15));
      setStreamingText(response.slice(0, i));
    }
    setStreamingText(response);

    const assistantMessage: Message = {
      id: Date.now().toString(),
      session_id: sessionId || '',
      role: 'assistant',
      content: response,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setStreamingText('');
    setIsStreaming(false);

    if (messages.length === 1 && sessionId) {
      const title = response.slice(0, 50) + (response.length > 50 ? '...' : '');
      await updateSession(sessionId, { title });
    }

    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
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
  };

  const generateSessionResults = async () => {
    if (!coach || isGeneratingArtifacts) return;

    setIsGeneratingArtifacts(true);

    try {
      const artifacts = await generateSessionArtifacts(
        messages,
        coach,
        userContext
      );

      setSessionResult(artifacts);

      if (sessionId) {
        await updateSession(sessionId, {
          summary: artifacts.summary,
          status: 'completed',
          completed_at: new Date().toISOString(),
        });
      }

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
          <View style={[styles.speakerDot, isUser && styles.speakerDotUser]} />
          <Text style={[styles.speakerLabel, isUser && styles.speakerLabelUser]}>
            {isUser ? 'You' : coach?.name || 'Coach'}
          </Text>
          <Text style={styles.timestamp}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        {/* Message content - transcript style */}
        <View style={[styles.transcriptContent, isUser && styles.transcriptContentUser]}>
          <Text style={[styles.transcriptText, isUser && styles.transcriptTextUser]}>
            {item.content}
          </Text>
        </View>
      </Animated.View>
    );
  };

  if (!coach) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={Colors.burnishedGold} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Premium Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-down" size={28} color={Colors.midnightEmerald} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <CoachIcon iconName={coach.icon_name} color={coach.color} size="sm" />
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{coach.name}</Text>
            <Text style={styles.headerSubtitle}>Session in progress</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => sessionResult ? setShowPaperArtifact(true) : generateSessionResults()}
          style={styles.insightsButton}
          disabled={isGeneratingArtifacts}
        >
          {isGeneratingArtifacts ? (
            <ActivityIndicator size="small" color={Colors.burnishedGold} />
          ) : (
            <>
              <Ionicons name="sparkles" size={18} color={Colors.burnishedGold} />
              {sessionResult && <View style={styles.insightsBadge} />}
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
                    <View style={styles.speakerDot} />
                    <Text style={styles.speakerLabel}>{coach.name}</Text>
                    <Animated.View style={[styles.typingIndicator, pulseStyle]}>
                      <Text style={styles.typingText}>composing</Text>
                    </Animated.View>
                  </View>
                  <View style={styles.transcriptContent}>
                    <Text style={styles.transcriptText}>{streamingText}</Text>
                    <Animated.View style={[styles.cursor, pulseStyle]} />
                  </View>
                </Animated.View>
              )}
              {(aiLoading && !isStreaming && !streamingText) && (
                <Animated.View entering={FadeIn.duration(300)} style={styles.thinkingContainer}>
                  <View style={styles.thinkingDots}>
                    <View style={styles.thinkingDot} />
                    <View style={[styles.thinkingDot, { marginHorizontal: 4 }]} />
                    <View style={styles.thinkingDot} />
                  </View>
                  <Text style={styles.thinkingText}>{coach.name} is reflecting...</Text>
                </Animated.View>
              )}
            </>
          )}
        />

        {/* Premium Input */}
        <View style={[styles.inputContainer, { paddingBottom: insets.bottom || Spacing.md }]}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Share your thoughts..."
              placeholderTextColor={Colors.stoneGray}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
              editable={!aiLoading && !isStreaming}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!inputText.trim() || aiLoading || isStreaming) && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!inputText.trim() || aiLoading || isStreaming}
            >
              <Ionicons
                name="arrow-up"
                size={20}
                color={(!inputText.trim() || aiLoading || isStreaming) ? Colors.stoneGray : Colors.white}
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
  const insets = useSafeAreaInsets();

  if (!sessionResult) return null;

  return (
    <View style={[paperStyles.container, { paddingTop: insets.top }]}>
      {/* Paper Header */}
      <View style={paperStyles.header}>
        <TouchableOpacity onPress={onClose} style={paperStyles.closeButton}>
          <Ionicons name="close" size={24} color={Colors.stoneGray} />
        </TouchableOpacity>
        <Text style={paperStyles.headerTitle}>Session Insights</Text>
        <View style={paperStyles.headerSpacer} />
      </View>

      <ScrollView
        style={paperStyles.scrollView}
        contentContainerStyle={paperStyles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Coach Attribution */}
        <Animated.View entering={FadeInUp.duration(600)} style={paperStyles.attribution}>
          <CoachIcon iconName={coach.icon_name} color={coach.color} size="md" />
          <View style={paperStyles.attributionText}>
            <Text style={paperStyles.attributionLabel}>Guided by</Text>
            <Text style={paperStyles.attributionName}>{coach.name}</Text>
          </View>
        </Animated.View>

        {/* Summary Section */}
        <Animated.View entering={FadeInUp.duration(600).delay(100)} style={paperStyles.section}>
          <Text style={paperStyles.sectionTitle}>Summary</Text>
          <View style={paperStyles.summaryCard}>
            <Text style={paperStyles.summaryText}>{sessionResult.summary}</Text>
          </View>
        </Animated.View>

        {/* Next Actions */}
        {sessionResult.next_actions && sessionResult.next_actions.length > 0 && (
          <Animated.View entering={FadeInUp.duration(600).delay(200)} style={paperStyles.section}>
            <Text style={paperStyles.sectionTitle}>Next Actions</Text>
            <View style={paperStyles.actionsContainer}>
              {sessionResult.next_actions.map((action, index) => (
                <Animated.View
                  key={action.id}
                  entering={FadeInUp.duration(400).delay(300 + index * 100)}
                  style={paperStyles.actionItem}
                >
                  <View style={paperStyles.actionNumber}>
                    <Text style={paperStyles.actionNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={paperStyles.actionText}>{action.title}</Text>
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Signature Line */}
        <Animated.View entering={FadeInUp.duration(600).delay(400)} style={paperStyles.signatureSection}>
          <View style={paperStyles.signatureLine} />
          <Text style={paperStyles.signatureLabel}>Committed on {new Date().toLocaleDateString()}</Text>
        </Animated.View>
      </ScrollView>

      {/* Footer Actions */}
      <View style={[paperStyles.footer, { paddingBottom: insets.bottom || Spacing.xl }]}>
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
    backgroundColor: Colors.warmOatmeal,
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
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.warmOatmeal,
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
    color: Colors.midnightEmerald,
    fontFamily: Typography.fonts.serif,
  },
  headerSubtitle: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
    marginTop: 2,
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
    backgroundColor: Colors.success,
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
    backgroundColor: Colors.burnishedGold,
    marginRight: Spacing.sm,
  },
  speakerDotUser: {
    backgroundColor: Colors.midnightEmerald,
  },
  speakerLabel: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    color: Colors.burnishedGold,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wider,
    flex: 1,
  },
  speakerLabelUser: {
    color: Colors.midnightEmerald,
  },
  timestamp: {
    fontSize: Typography.sizes.micro,
    color: Colors.stoneGray,
  },
  transcriptContent: {
    paddingLeft: Spacing.lg,
    borderLeftWidth: 2,
    borderLeftColor: Colors.goldMuted,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  transcriptContentUser: {
    borderLeftColor: Colors.borderLight,
  },
  transcriptText: {
    fontSize: Typography.sizes.bodyLarge,
    color: Colors.charcoal,
    lineHeight: Typography.sizes.bodyLarge * Typography.lineHeights.relaxed,
    fontFamily: Typography.fonts.serif,
  },
  transcriptTextUser: {
    fontFamily: Typography.fonts.sans,
  },
  cursor: {
    width: 2,
    height: 20,
    backgroundColor: Colors.burnishedGold,
    marginLeft: 4,
    marginBottom: 2,
  },
  typingIndicator: {
    backgroundColor: Colors.goldMuted,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  typingText: {
    fontSize: Typography.sizes.micro,
    color: Colors.burnishedGold,
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
    backgroundColor: Colors.burnishedGold,
  },
  thinkingText: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
    fontStyle: 'italic',
  },

  // Input
  inputContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Colors.warmOatmeal,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: Colors.white,
    borderRadius: Radius.squircle,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.xs,
    paddingVertical: Spacing.xs,
    ...Shadows.sm,
  },
  input: {
    flex: 1,
    fontSize: Typography.sizes.body,
    color: Colors.charcoal,
    maxHeight: 100,
    paddingVertical: Spacing.sm,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.burnishedGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.warmOatmealDark,
  },
});

const paperStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.warmOatmeal,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    color: Colors.midnightEmerald,
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
    borderBottomColor: Colors.borderLight,
  },
  attributionText: {
    marginLeft: Spacing.md,
  },
  attributionLabel: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wider,
  },
  attributionName: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    color: Colors.midnightEmerald,
    fontFamily: Typography.fonts.serif,
  },
  section: {
    marginBottom: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    color: Colors.stoneGray,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wider,
    marginBottom: Spacing.md,
  },
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.squircle,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.sm,
  },
  summaryText: {
    fontSize: Typography.sizes.bodyLarge,
    color: Colors.charcoal,
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
    backgroundColor: Colors.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  actionNumberText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    color: Colors.burnishedGold,
    fontFamily: Typography.fonts.serif,
  },
  actionText: {
    flex: 1,
    fontSize: Typography.sizes.body,
    color: Colors.charcoal,
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
    backgroundColor: Colors.border,
    marginBottom: Spacing.md,
  },
  signatureLabel: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
    fontStyle: 'italic',
  },
  footer: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    backgroundColor: Colors.warmOatmeal,
  },
});
