import React, { useEffect, useState, useRef } from 'react';
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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
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
} from '@/store/app';

export default function ChatScreen() {
  const router = useRouter();
  const { coachId, context } = useLocalSearchParams<{
    coachId: string;
    context?: string;
  }>();

  const [coach, setCoach] = useState<Coach | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [sessionResult, setSessionResult] = useState<SessionResult | null>(null);
  const [userContext, setUserContext] = useState<ContextVault | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const fadeAnim = useSharedValue(0);

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
      setIsLoading(false);
      setIsStreaming(false);
    },
  });

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
      user_id: 'local-user',
      coach_id: coachId,
      title: 'New Session',
      status: 'active',
      created_at: new Date().toISOString(),
    };

    await addSession(newSession);

    // Build personalized greeting
    let greeting = `Hello! I'm your ${coachData?.name || 'coach'}. How can I help you today?`;

    if (context === 'plan') {
      greeting = `I see you want to adjust your plan. Let's review your current priorities and make some updates. What would you like to change?`;
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

  const buildSystemPrompt = (): string => {
    if (!coach) return '';

    let systemPrompt = coach.system_prompt;

    // Add user context if available
    if (userContext) {
      systemPrompt += `\n\nUser Context:
- Core Values: ${userContext.values.join(', ') || 'Not specified'}
- Goals: ${userContext.goals.map(g => g.title + (g.is_30_day_focus ? ' (30-day focus)' : '')).join(', ') || 'Not specified'}
- Available focus time: ${userContext.constraints.available_hours_per_day} hours/day
- Energy level: ${userContext.constraints.energy_level}
- Best time for focus: ${userContext.constraints.best_time_for_focus}
- Preferred tone: ${userContext.preferences.tone < 33 ? 'gentle' : userContext.preferences.tone < 66 ? 'balanced' : 'direct'}
- Preferred directness: ${userContext.preferences.directness < 33 ? 'nurturing' : userContext.preferences.directness < 66 ? 'balanced' : 'challenging'}
- Response length preference: ${userContext.preferences.response_length}`;
    }

    return systemPrompt;
  };

  const buildConversationHistory = (): string => {
    // Build a summary of recent conversation for context
    const recentMessages = messages.slice(-6); // Last 6 messages
    return recentMessages
      .map((m) => `${m.role === 'user' ? 'User' : 'Coach'}: ${m.content}`)
      .join('\n');
  };

  const handleSend = async () => {
    if (!inputText.trim() || isLoading || isStreaming || aiLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      session_id: sessionId || '',
      role: 'user',
      content: inputText.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = inputText.trim();
    setInputText('');
    setIsLoading(true);
    setIsStreaming(true);
    setStreamingText('');
    fadeAnim.value = 0;

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const systemPrompt = buildSystemPrompt();
      const conversationHistory = buildConversationHistory();

      const fullPrompt = `${systemPrompt}

Recent conversation:
${conversationHistory}

User: ${currentInput}

Respond as the coach, keeping your response focused and actionable. Be warm but efficient.`;

      await generateText(fullPrompt);
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleAIResponse = async (response: string) => {
    // Simulate streaming effect with character-by-character reveal
    for (let i = 0; i <= response.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 12));
      setStreamingText(response.slice(0, i));
      fadeAnim.value = withTiming(1, { duration: 100 });
    }

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
    setIsLoading(false);

    // Check if this should trigger session result
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    if (lastUserMessage) {
      const input = lastUserMessage.content.toLowerCase();
      if (
        input.includes('done') ||
        input.includes('finish') ||
        input.includes('end session') ||
        input.includes('wrap up')
      ) {
        generateSessionResult(response);
      }
    }

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const generateSessionResult = (lastResponse: string) => {
    // Extract key points from the conversation
    const userMessages = messages.filter(m => m.role === 'user').map(m => m.content);

    const result: SessionResult = {
      summary: `In this session, we explored your priorities and identified actionable next steps. Key topics discussed: ${userMessages.slice(0, 3).join(', ').slice(0, 100)}...`,
      next_actions: [
        {
          id: '1',
          title: 'Complete the top priority task identified',
          completed: false,
        },
        {
          id: '2',
          title: 'Set up a focused work block for tomorrow',
          completed: false,
        },
        {
          id: '3',
          title: 'Review progress at end of day',
          completed: false,
        },
      ],
      plan_updates: [
        {
          date: new Date().toISOString().split('T')[0],
          priorities: [
            { id: '1', title: 'Focus on priority task', completed: false, order: 1 },
            { id: '2', title: 'Deep work session', completed: false, order: 2 },
            { id: '3', title: 'End-of-day review', completed: false, order: 3 },
          ],
        },
      ],
    };

    setSessionResult(result);

    // Update session with summary
    if (sessionId) {
      updateSession(sessionId, {
        summary: result.summary,
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleOpenDrawer = () => {
    setShowDrawer(true);
  };

  const handleUpdatePlan = () => {
    setShowDrawer(false);
    router.push('/(tabs)/plan');
  };

  const streamingAnimStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
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
          <Ionicons name="menu-outline" size={24} color={Colors.slateGray} />
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
                <Animated.View style={[styles.messageContainer, streamingAnimStyle]}>
                  <View style={styles.aiBubble}>
                    <Text style={styles.messageText}>{streamingText}</Text>
                  </View>
                  <Text style={styles.coachTyping}>{coach.name} is typing...</Text>
                </Animated.View>
              )}
              {(isLoading || aiLoading) && !isStreaming && !streamingText && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={Colors.electricIndigo} />
                  <Text style={styles.loadingText}>{coach.name} is thinking...</Text>
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
            editable={!isLoading && !isStreaming && !aiLoading}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading || isStreaming || aiLoading) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading || isStreaming || aiLoading}
          >
            <Ionicons
              name="send"
              size={20}
              color={
                !inputText.trim() || isLoading || isStreaming || aiLoading
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
  },
  messageText: {
    fontSize: Typography.sizes.body,
    color: Colors.slateCharcoal,
    lineHeight: 22,
  },
  userMessageText: {
    color: Colors.white,
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
  loadingText: {
    fontSize: Typography.sizes.caption,
    color: Colors.slateLight,
    marginLeft: Spacing.sm,
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
