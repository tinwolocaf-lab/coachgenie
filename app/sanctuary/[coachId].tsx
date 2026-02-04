// The Private Sanctuary - Premium Coaching Session
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
  Modal,
  Alert,
  Clipboard,
  Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  FadeInUp,
  FadeOut,
  SlideInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { useTextGeneration } from '@fastshot/ai';
import { Colors, Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
import { Coach, EnhancedMessage, ContextVault, KeyInsight } from '@/types';
import { getCoachById } from '@/data/coaches';
import { getContextVault } from '@/store/app';
import {
  generateCoachResponse,
  detectInsightInMessage,
  generateBreakthroughSummary,
  expandOnPoint,
  generateInsightTitle,
} from '@/lib/ai-sanctuary';
import {
  saveInsight,
  saveBreakthrough,
} from '@/lib/supabase-sanctuary';

// Components
import { CoachIcon } from '@/components/ui/CoachIcon';
import { Button } from '@/components/ui/Button';
import { SessionEntry } from '@/components/sanctuary/SessionEntry';
import { EditorialBlock, KeyInsightCard } from '@/components/sanctuary/EditorialBlock';
import { GoldPulseIndicator } from '@/components/ui/GoldPulseIndicator';
import { ContextualMenu, ReflectFurtherModal } from '@/components/sanctuary/ContextualMenu';
import { BreakthroughView } from '@/components/sanctuary/BreakthroughView';
import { VoiceNoteInput, VoiceNoteTrigger } from '@/components/sanctuary/VoiceNoteInput';

export default function SanctuaryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { coachId, resume } = useLocalSearchParams<{
    coachId: string;
    resume?: string;
  }>();

  // Core state
  const [coach, setCoach] = useState<Coach | null>(null);
  const [messages, setMessages] = useState<EnhancedMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [userContext, setUserContext] = useState<ContextVault | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // UI state
  const [showEntryAnimation, setShowEntryAnimation] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [showVoiceInput, setShowVoiceInput] = useState(false);

  // Insight state
  const [pendingInsight, setPendingInsight] = useState<{
    content: string;
    messageId?: string;
  } | null>(null);

  // Context menu state
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<EnhancedMessage | null>(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  // Reflect further state
  const [reflectModalVisible, setReflectModalVisible] = useState(false);
  const [reflectContent, setReflectContent] = useState('');
  const [isReflecting, setIsReflecting] = useState(false);

  // Breakthrough state
  const [showBreakthrough, setShowBreakthrough] = useState(false);
  const [breakthroughData, setBreakthroughData] = useState<{
    title: string;
    summary: string;
    keyTakeaways: string[];
    actionItems: { id: string; title: string; completed: boolean }[];
  } | null>(null);
  const [isGeneratingBreakthrough, setIsGeneratingBreakthrough] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  // Animation values
  const inputScale = useSharedValue(1);

  // Initialize session
  useEffect(() => {
    initializeSession();
  }, [coachId]);

  const initializeSession = async () => {
    if (!coachId) return;

    const coachData = getCoachById(coachId);
    if (!coachData) {
      Alert.alert('Error', 'Coach not found');
      router.back();
      return;
    }

    setCoach(coachData);

    // Load user context
    const vault = await getContextVault();
    setUserContext(vault);

    // Create session ID
    const newSessionId = `session-${Date.now()}`;
    setSessionId(newSessionId);
  };

  // Start session after entry animation
  const handleEntryComplete = () => {
    setShowEntryAnimation(false);

    // Add initial greeting with delay for smooth transition
    setTimeout(() => {
      if (!coach) return;

      let greeting = `Welcome to this moment. I'm here to guide you through whatever's on your mind today. What would you like to explore?`;

      if (userContext?.goals && userContext.goals.length > 0) {
        const focusGoal = userContext.goals.find(g => g.is_30_day_focus);
        if (focusGoal) {
          greeting = `Welcome. Your 30-day focus is "${focusGoal.title}." I'm here to help you make meaningful progress. Where shall we begin?`;
        }
      }

      const initialMessage: EnhancedMessage = {
        id: `msg-${Date.now()}`,
        session_id: sessionId || '',
        role: 'assistant',
        content: greeting,
        created_at: new Date().toISOString(),
      };

      setMessages([initialMessage]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, 300);
  };

  // Send message
  const handleSend = async (text?: string) => {
    const messageText = text || inputText.trim();
    if (!messageText || isGenerating || !coach) return;

    // Heavy haptic on send
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Animate input
    inputScale.value = withSpring(0.98, Timing.springBouncy);
    setTimeout(() => {
      inputScale.value = withSpring(1, Timing.springBouncy);
    }, 100);

    // Add user message
    const userMessage: EnhancedMessage = {
      id: `msg-${Date.now()}`,
      session_id: sessionId || '',
      role: 'user',
      content: messageText,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsGenerating(true);
    setStreamingText('');
    Keyboard.dismiss();

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // Generate AI response
      const response = await generateCoachResponse(
        coach,
        userContext,
        messages,
        messageText
      );

      // Simulate streaming for elegant reveal
      await streamResponse(response);

      // Check for insights
      const insightCheck = detectInsightInMessage(response);
      const isInsightMessage = insightCheck.hasInsight;

      // Add assistant message
      const assistantMessage: EnhancedMessage = {
        id: `msg-${Date.now()}`,
        session_id: sessionId || '',
        role: 'assistant',
        content: response,
        created_at: new Date().toISOString(),
        is_insight: isInsightMessage,
        insight_title: insightCheck.insightContent,
      };

      setMessages(prev => [...prev, assistantMessage]);
      setStreamingText('');
      setIsGenerating(false);

      // Light haptic on response
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Show insight card if detected
      if (isInsightMessage && insightCheck.insightContent) {
        setTimeout(() => {
          setPendingInsight({
            content: insightCheck.insightContent!,
            messageId: assistantMessage.id,
          });
        }, 500);
      }

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Check for session completion cues
      checkForSessionEnd(messageText);
    } catch (error) {
      console.error('Error generating response:', error);
      setIsGenerating(false);

      const errorMessage: EnhancedMessage = {
        id: `msg-${Date.now()}`,
        session_id: sessionId || '',
        role: 'assistant',
        content: 'I apologize, but I encountered a moment of reflection. Could you share that thought again?',
        created_at: new Date().toISOString(),
      };

      setMessages(prev => [...prev, errorMessage]);
    }
  };

  // Stream response for elegant reveal
  const streamResponse = async (text: string) => {
    const chunkSize = 2;
    for (let i = 0; i <= text.length; i += chunkSize) {
      await new Promise(resolve => setTimeout(resolve, 10));
      setStreamingText(text.slice(0, i));
    }
    setStreamingText(text);
  };

  // Check for session end cues
  const checkForSessionEnd = (message: string) => {
    const endCues = [
      'thank you',
      'thanks',
      "that's helpful",
      "that helps",
      "i'll do that",
      'perfect',
      'great advice',
      "that's all",
      'goodbye',
      'bye',
    ];

    const lowerMessage = message.toLowerCase();
    const isEnding = endCues.some(cue => lowerMessage.includes(cue));

    if (isEnding && messages.length >= 6) {
      // Offer to generate breakthrough after a delay
      setTimeout(() => {
        Alert.alert(
          'Session Wrap-up',
          'Would you like me to capture today\'s breakthrough?',
          [
            { text: 'Continue', style: 'cancel' },
            { text: 'Generate Breakthrough', onPress: generateBreakthrough },
          ]
        );
      }, 2000);
    }
  };

  // Generate breakthrough summary
  const generateBreakthrough = async () => {
    if (!coach || isGeneratingBreakthrough) return;

    setIsGeneratingBreakthrough(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const breakthrough = await generateBreakthroughSummary(
        coach,
        messages,
        userContext
      );

      if (breakthrough) {
        setBreakthroughData(breakthrough);
        setShowBreakthrough(true);

        // Save to database
        if (userContext?.user_id) {
          await saveBreakthrough(
            userContext.user_id,
            sessionId || undefined,
            coachId,
            breakthrough.title,
            breakthrough.summary,
            breakthrough.keyTakeaways,
            breakthrough.actionItems
          );
        }
      }
    } catch (error) {
      console.error('Error generating breakthrough:', error);
      Alert.alert('Error', 'Could not generate breakthrough. Please try again.');
    } finally {
      setIsGeneratingBreakthrough(false);
    }
  };

  // Handle voice transcription
  const handleVoiceTranscription = (text: string) => {
    setShowVoiceInput(false);
    setInputText(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Auto-send after brief delay for review
    setTimeout(() => {
      handleSend(text);
    }, 500);
  };

  // Context menu handlers
  const handleLongPress = (message: EnhancedMessage, position: { x: number; y: number }) => {
    setSelectedMessage(message);
    setMenuPosition(position);
    setMenuVisible(true);
  };

  const handleHighlight = async (message: EnhancedMessage) => {
    // Toggle insight status
    setMessages(prev =>
      prev.map(m =>
        m.id === message.id ? { ...m, is_insight: !m.is_insight } : m
      )
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleReflectFurther = async (message: EnhancedMessage) => {
    if (!coach) return;

    setSelectedMessage(message);
    setReflectModalVisible(true);
    setIsReflecting(true);
    setReflectContent('');

    try {
      const expanded = await expandOnPoint(coach, message.content, messages);
      setReflectContent(expanded);
    } catch (error) {
      console.error('Error expanding point:', error);
      setReflectContent('I apologize, but I could not expand on this point. Please try again.');
    } finally {
      setIsReflecting(false);
    }
  };

  const handleSaveInsight = async (message: EnhancedMessage) => {
    if (!userContext?.user_id || !coachId) return;

    try {
      const title = await generateInsightTitle(message.content);

      await saveInsight(
        userContext.user_id,
        sessionId || undefined,
        coachId,
        title,
        message.content,
        'general'
      );

      // Update message as insight
      setMessages(prev =>
        prev.map(m =>
          m.id === message.id ? { ...m, is_insight: true, insight_title: title } : m
        )
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved', 'Insight saved to your journal.');
    } catch (error) {
      console.error('Error saving insight:', error);
      Alert.alert('Error', 'Could not save insight. Please try again.');
    }
  };

  const handleCopy = (message: EnhancedMessage) => {
    Clipboard.setString(message.content);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleAddReflectionToConversation = () => {
    if (!reflectContent) return;

    // Add expanded content as a new message
    const expandedMessage: EnhancedMessage = {
      id: `msg-${Date.now()}`,
      session_id: sessionId || '',
      role: 'assistant',
      content: reflectContent,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, expandedMessage]);
    setReflectModalVisible(false);
    setReflectContent('');

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Save pending insight to journal
  const handleSavePendingInsight = async () => {
    if (!pendingInsight || !userContext?.user_id || !coachId) return;

    try {
      const title = await generateInsightTitle(pendingInsight.content);

      await saveInsight(
        userContext.user_id,
        sessionId || undefined,
        coachId,
        title,
        pendingInsight.content,
        'general'
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPendingInsight(null);
    } catch (error) {
      console.error('Error saving insight:', error);
    }
  };

  // Handle back/close
  const handleClose = () => {
    if (messages.length >= 4 && !breakthroughData) {
      Alert.alert(
        'End Session',
        'Would you like to capture today\'s breakthrough before leaving?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Generate Breakthrough', onPress: generateBreakthrough },
          { text: 'Exit', style: 'destructive', onPress: () => router.back() },
        ]
      );
    } else {
      router.back();
    }
  };

  // Input animation style
  const inputContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: inputScale.value }],
  }));

  // Render message
  const renderMessage = ({ item, index }: { item: EnhancedMessage; index: number }) => (
    <EditorialBlock
      message={item}
      coachName={coach?.name || 'Coach'}
      coachColor={coach?.color || Colors.burnishedGold}
      index={index}
      onLongPress={handleLongPress}
      onInsightPress={() => {
        const insight = detectInsightInMessage(item.content);
        if (insight.insightContent) {
          setPendingInsight({
            content: insight.insightContent,
            messageId: item.id,
          });
        }
      }}
    />
  );

  if (!coach) return null;

  // Show entry animation
  if (showEntryAnimation) {
    return (
      <SessionEntry
        coach={coach}
        onAnimationComplete={handleEntryComplete}
      />
    );
  }

  // Show breakthrough view
  if (showBreakthrough && breakthroughData) {
    return (
      <BreakthroughView
        breakthrough={breakthroughData}
        coach={coach}
        messagesCount={messages.length}
        onClose={() => setShowBreakthrough(false)}
        onViewPlan={() => {
          setShowBreakthrough(false);
          router.push('/(tabs)/plan');
        }}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
          <Ionicons name="chevron-down" size={28} color={Colors.midnightEmerald} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerCenter} onPress={() => {}}>
          <CoachIcon iconName={coach.icon_name} color={coach.color} size="sm" />
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>{coach.name}</Text>
            <View style={styles.headerStatus}>
              <View style={[styles.statusDot, { backgroundColor: Colors.success }]} />
              <Text style={styles.headerSubtitle}>In Session</Text>
            </View>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={generateBreakthrough}
          style={styles.headerButton}
          disabled={isGeneratingBreakthrough || messages.length < 4}
        >
          <Ionicons
            name="sparkles"
            size={22}
            color={messages.length < 4 ? Colors.stoneGray : Colors.burnishedGold}
          />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={() => (
            <>
              {/* Streaming message */}
              {isGenerating && streamingText && (
                <Animated.View entering={FadeIn.duration(300)}>
                  <EditorialBlock
                    message={{
                      id: 'streaming',
                      session_id: sessionId || '',
                      role: 'assistant',
                      content: streamingText,
                      created_at: new Date().toISOString(),
                    }}
                    coachName={coach.name}
                    coachColor={coach.color}
                    index={messages.length}
                    isStreaming
                  />
                </Animated.View>
              )}

              {/* Typing indicator */}
              {isGenerating && !streamingText && (
                <Animated.View entering={FadeIn.duration(300)} style={styles.typingContainer}>
                  <GoldPulseIndicator
                    coachName={coach.name}
                    variant="dust"
                  />
                </Animated.View>
              )}
            </>
          )}
        />

        {/* Pending Insight Card */}
        {pendingInsight && (
          <KeyInsightCard
            insightContent={pendingInsight.content}
            coachName={coach.name}
            coachColor={coach.color}
            onSaveToJournal={handleSavePendingInsight}
            onDismiss={() => setPendingInsight(null)}
          />
        )}

        {/* Input Area */}
        <Animated.View
          style={[
            styles.inputContainer,
            { paddingBottom: insets.bottom || Spacing.md },
            inputContainerStyle,
          ]}
        >
          <View style={styles.inputWrapper}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder="Share your thoughts..."
              placeholderTextColor={Colors.stoneGray}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={2000}
              editable={!isGenerating}
              onFocus={() => {
                inputScale.value = withSpring(1.01, Timing.springGentle);
              }}
              onBlur={() => {
                inputScale.value = withSpring(1, Timing.springGentle);
              }}
            />

            <View style={styles.inputActions}>
              {/* Voice note trigger */}
              <VoiceNoteTrigger
                onPress={() => setShowVoiceInput(true)}
                disabled={isGenerating}
              />

              {/* Send button */}
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!inputText.trim() || isGenerating) && styles.sendButtonDisabled,
                ]}
                onPress={() => handleSend()}
                disabled={!inputText.trim() || isGenerating}
              >
                <Ionicons
                  name="arrow-up"
                  size={20}
                  color={(!inputText.trim() || isGenerating) ? Colors.stoneGray : Colors.white}
                />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* Voice Input */}
        {showVoiceInput && (
          <VoiceNoteInput
            onTranscription={handleVoiceTranscription}
            onCancel={() => setShowVoiceInput(false)}
          />
        )}
      </KeyboardAvoidingView>

      {/* Context Menu */}
      <ContextualMenu
        visible={menuVisible}
        message={selectedMessage}
        position={menuPosition}
        onClose={() => setMenuVisible(false)}
        onHighlight={handleHighlight}
        onReflectFurther={handleReflectFurther}
        onSaveInsight={handleSaveInsight}
        onCopy={handleCopy}
      />

      {/* Reflect Further Modal */}
      <ReflectFurtherModal
        visible={reflectModalVisible}
        message={selectedMessage}
        expandedContent={reflectContent}
        isLoading={isReflecting}
        coachName={coach.name}
        coachColor={coach.color}
        onClose={() => {
          setReflectModalVisible(false);
          setReflectContent('');
        }}
        onAddToConversation={handleAddReflectionToConversation}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.warmOatmeal,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.warmOatmeal,
  },
  headerButton: {
    padding: Spacing.sm,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.sm,
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
  headerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Spacing.xs,
  },
  headerSubtitle: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
  },

  // Chat
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  typingContainer: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
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
    maxHeight: 120,
    paddingVertical: Spacing.sm,
    fontFamily: Typography.fonts.sans,
  },
  inputActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingLeft: Spacing.sm,
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
