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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTextGeneration } from '@fastshot/ai';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { ActionDrawer } from '@/components/ActionDrawer';
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
  const [showDrawer, setShowDrawer] = useState(false);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const [userContext, setUserContext] = useState<ContextVault | null>(null);
  const [isGeneratingArtifacts, setIsGeneratingArtifacts] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const pulseAnim = useSharedValue(1);

  // Use @fastshot/ai for text generation
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

  // Pulse animation for typing indicator
  useEffect(() => {
    if (isStreaming || aiLoading) {
      pulseAnim.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 600 }),
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

    // Get user context for personalization
    const vault = await getContextVault();
    setUserContext(vault);

    // Create a new session
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

    // Build personalized greeting
    let greeting = `Hello! I'm your ${coachData?.name || 'coach'}. How can I help you today?`;

    if (context === 'plan') {
      greeting = `I see you want to adjust your plan. Let's review your current priorities and make some updates. What would you like to change or focus on?`;
    } else if (vault && vault.goals.length > 0) {
      const focusGoal = vault.goals.find((g) => g.is_30_day_focus);
      if (focusGoal) {
        greeting = `Hello! I know your 30-day focus is "${focusGoal.title}". What's on your mind today? How can I help you make progress?`;
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

    // Scroll to bottom
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
    // Simulate streaming effect with character-by-character reveal
    const chunkSize = 3;
    for (let i = 0; i <= response.length; i += chunkSize) {
      await new Promise((resolve) => setTimeout(resolve, 15));
      setStreamingText(response.slice(0, i));
    }
    setStreamingText(response);

    // Add the complete message
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

    // Update session title based on first exchange
    if (messages.length === 1 && sessionId) {
      const title = response.slice(0, 50) + (response.length > 50 ? '...' : '');
      await updateSession(sessionId, { title });
    }

    // Check if this should trigger session result
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

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const generateSessionResults = async () => {
    if (!coach || isGeneratingArtifacts) return;

    setIsGeneratingArtifacts(true);

    try {
      // Generate artifacts using AI
      const artifacts = await generateSessionArtifacts(
        messages,
        coach,
        userContext
      );

      setSessionResult(artifacts);

      // Update session with summary
      if (sessionId) {
        await updateSession(sessionId, {
          summary: artifacts.summary,
          status: 'completed',
          completed_at: new Date().toISOString(),
        });
      }

      // Save plan updates if any
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

      // Show drawer with results
      setShowDrawer(true);
    } catch (error) {
      console.error('Error generating session results:', error);
    } finally {
      setIsGeneratingArtifacts(false);
    }
  };

  const handleEndSession = useCallback(async () => {
    Alert.alert(
      'End Session',
      'Would you like to generate a summary and action items from this session?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Generate Summary',
          onPress: generateSessionResults,
        },
        {
          text: 'Just End',
          style: 'destructive',
          onPress: () => router.back(),
        },
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

  const handleOpenDrawer = () => {
    if (sessionResult) {
      setShowDrawer(true);
    } else if (messages.length > 2) {
      generateSessionResults();
    }
  };

  const handleUpdatePlan = () => {
    setShowDrawer(false);
    router.push('/(tabs)/plan');
  };

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseAnim.value,
  }));

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isUser = item.role === 'user';
    const isLast = index === messages.length - 1;

    return (
      <Animated.View
        entering={FadeInDown.duration(300).delay(Math.min(index * 50, 200))}
        style={[styles.messageContainer, isUser && styles.userMessageContainer]}
      >
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={[styles.messageText, isUser && styles.userMessageText]}>
            {item.content}
          </Text>
        </View>
        {!isUser && isLast && !isStreaming && (
          <Text style={styles.coachTyping}>{coach?.name}</Text>
        )}
      </Animated.View>
    );
  };

  if (!coach) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={Colors.electricIndigo} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.electricIndigo} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{coach.name}</Text>
        <TouchableOpacity onPress={handleOpenDrawer} style={styles.drawerButton}>
          <View style={styles.drawerIconContainer}>
            <Ionicons name="document-text-outline" size={22} color={Colors.slateGray} />
            {sessionResult && <View style={styles.drawerBadge} />}
          </View>
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
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
                <Animated.View style={styles.messageContainer}>
                  <View style={styles.aiBubble}>
                    <Text style={styles.messageText}>{streamingText}</Text>
                    <Animated.View style={[styles.cursor, pulseStyle]} />
                  </View>
                  <Text style={styles.coachTyping}>{coach.name} is typing...</Text>
                </Animated.View>
              )}
              {(aiLoading && !isStreaming && !streamingText) && (
                <View style={styles.loadingContainer}>
                  <Animated.View style={[styles.typingDots, pulseStyle]}>
                    <View style={styles.dot} />
                    <View style={[styles.dot, styles.dotMiddle]} />
                    <View style={styles.dot} />
                  </Animated.View>
                  <Text style={styles.loadingText}>{coach.name} is thinking...</Text>
                </View>
              )}
              {isGeneratingArtifacts && (
                <View style={styles.artifactsLoading}>
                  <ActivityIndicator size="small" color={Colors.electricIndigo} />
                  <Text style={styles.artifactsText}>Generating session summary...</Text>
                </View>
              )}
            </>
          )}
        />

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type your message..."
            placeholderTextColor={Colors.slateLight}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            editable={!aiLoading && !isStreaming}
            onSubmitEditing={handleSend}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || aiLoading || isStreaming) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || aiLoading || isStreaming}
          >
            <Ionicons
              name="send"
              size={20}
              color={
                !inputText.trim() || aiLoading || isStreaming
                  ? Colors.slateLight
                  : Colors.electricIndigo
              }
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Action Drawer */}
      <ActionDrawer
        visible={showDrawer}
        onClose={() => setShowDrawer(false)}
        sessionResult={sessionResult}
        onUpdatePlan={handleUpdatePlan}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.offWhite,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.white,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backText: {
    fontSize: Typography.sizes.bodyLarge,
    color: Colors.electricIndigo,
    marginLeft: Spacing.xs,
  },
  headerTitle: {
    fontSize: Typography.sizes.subtitle,
    fontWeight: Typography.weights.semibold,
    color: Colors.slateCharcoal,
    flex: 2,
    textAlign: 'center',
  },
  drawerButton: {
    flex: 1,
    alignItems: 'flex-end',
    padding: Spacing.xs,
  },
  drawerIconContainer: {
    position: 'relative',
  },
  drawerBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  messageContainer: {
    marginBottom: Spacing.md,
    maxWidth: '85%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
  },
  messageBubble: {
    padding: Spacing.md,
    borderRadius: Radius.xl,
    maxWidth: '100%',
  },
  userBubble: {
    backgroundColor: Colors.electricIndigo,
    borderBottomRightRadius: Radius.sm,
  },
  aiBubble: {
    backgroundColor: Colors.aiMessage,
    borderBottomLeftRadius: Radius.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
  },
  messageText: {
    fontSize: Typography.sizes.body,
    color: Colors.slateCharcoal,
    lineHeight: 22,
  },
  userMessageText: {
    color: Colors.white,
  },
  cursor: {
    width: 2,
    height: 16,
    backgroundColor: Colors.electricIndigo,
    marginLeft: 2,
    marginBottom: 3,
  },
  coachTyping: {
    fontSize: Typography.sizes.caption,
    color: Colors.slateLight,
    marginTop: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.aiMessage,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.xl,
    borderBottomLeftRadius: Radius.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.slateLight,
  },
  dotMiddle: {
    marginHorizontal: Spacing.xs,
  },
  loadingText: {
    fontSize: Typography.sizes.caption,
    color: Colors.slateLight,
    marginLeft: Spacing.sm,
  },
  artifactsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.electricIndigo + '10',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    marginTop: Spacing.md,
  },
  artifactsText: {
    fontSize: Typography.sizes.caption,
    color: Colors.electricIndigo,
    marginLeft: Spacing.sm,
    fontWeight: Typography.weights.medium,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.white,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: Typography.sizes.body,
    color: Colors.slateCharcoal,
    maxHeight: 100,
    marginRight: Spacing.sm,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
