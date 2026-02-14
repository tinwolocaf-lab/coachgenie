// The Private Sanctuary - Premium Coaching Session
import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Clipboard,
  Keyboard,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { Coach, EnhancedMessage, ContextVault } from '@/types';
import { getCoachByIdResolved } from '@/lib/coaches';
import { getContextVault } from '@/store/app';
import { supabase } from '@/lib/supabase';
import { canAccessCoach, canAccessFeature, canAccessMarketplaceCoach, getUserTier } from '@/lib/feature-gates';
import {
  detectInsightInMessage,
} from '@/lib/ai-sanctuary';
import {
  ApiFunctionError,
  getCreditStatus,
  streamChat,
  generateBreakthrough as fetchBreakthrough,
  expandOnPoint,
  generateInsightTitle,
  isFunctionUnavailableError,
  isInsufficientCreditsError,
} from '@/lib/apiClient';
import {
  createSession,
  saveInsight,
  saveBreakthrough,
} from '@/lib/supabase-sanctuary';
// Components
import { CoachIcon } from '@/components/ui/CoachIcon';
import { SessionEntry } from '@/components/sanctuary/SessionEntry';
import { EditorialBlock, KeyInsightCard } from '@/components/sanctuary/EditorialBlock';
import { GoldPulseIndicator } from '@/components/ui/GoldPulseIndicator';
import { ContextualMenu, ReflectFurtherModal } from '@/components/sanctuary/ContextualMenu';
import { BreakthroughView } from '@/components/sanctuary/BreakthroughView';
import { VoiceNoteInput, VoiceNoteTrigger } from '@/components/sanctuary/VoiceNoteInput';
import { useAlert } from '@/contexts/AlertContext';

export default function SanctuaryScreen() {
  const router = useRouter();
  const { palette } = useThemeSafe();
  const insets = useSafeAreaInsets();
  const { coachId } = useLocalSearchParams<{
    coachId: string;
  }>();

  // Core state
  const [coach, setCoach] = useState<Coach | null>(null);
  const [messages, setMessages] = useState<EnhancedMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [userContext, setUserContext] = useState<ContextVault | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | undefined>(undefined);

  // UI state
  const [showEntryAnimation, setShowEntryAnimation] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [showVoiceInput, setShowVoiceInput] = useState(false);
  const [voiceNotesEnabled, setVoiceNotesEnabled] = useState(false);

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

  const { showToast, showAlert } = useAlert();

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  // Animation values
  const inputScale = useSharedValue(1);

  // Initialize session
  const initializeSession = useCallback(async () => {
    if (!coachId) return;

    const coachData = await getCoachByIdResolved(coachId);
    if (!coachData) {
      showToast('Error', { variant: 'error', message: 'Coach not found' });
      router.back();
      return;
    }

    const tier = await getUserTier();
    const isMarketplaceCoach = coachData.source === 'marketplace' || coachData.source === 'owned_custom';
    const hasCoachAccess = isMarketplaceCoach
      ? canAccessMarketplaceCoach(tier, coachId)
      : canAccessCoach(tier, coachId);
    if (!hasCoachAccess) {
      showAlert(
        'Upgrade Required',
        'This coach requires a higher subscription tier.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => router.back() },
          { text: 'View Plans', onPress: () => { router.back(); router.push('/paywall'); } },
        ],
      );
      return;
    }

    setCoach(coachData);

    // Load user context
    const vault = await getContextVault();
    setUserContext(vault);

    const { data: authData } = await supabase.auth.getSession();
    const authUser = authData.session?.user;
    if (!authUser) {
      showAlert('Sign in required', 'Please sign in to start a coaching session.');
      router.replace('/(auth)/login');
      return;
    }

    setAuthUserId(authUser.id);
    try {
      const creditStatus = await getCreditStatus();
      setSelectedModelId(creditStatus.preferred_chat_model ?? undefined);
    } catch (error) {
      if (error instanceof ApiFunctionError) {
        console.warn('Failed to load billing status:', error.message);
      } else {
        console.warn('Failed to load billing status:', error);
      }
    }

    const dbSession = await createSession(authUser.id, coachId, 'New Session', {
      coach_id: coachData.id,
      name: coachData.name,
      method: coachData.method,
      system_prompt: coachData.system_prompt,
      version: coachData.version,
    });
    if (!dbSession) {
      showToast('Error', { variant: 'error', message: 'Could not start a session. Please try again.' });
      return;
    }

    setSessionId(dbSession.id);
  }, [coachId, router, showAlert, showToast]);

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);

  useEffect(() => {
    const loadVoiceAccess = async () => {
      try {
        const tier = await getUserTier();
        setVoiceNotesEnabled(canAccessFeature(tier, 'voiceNotes'));
      } catch (error) {
        console.warn('Could not resolve tier for sanctuary voice notes:', error);
        setVoiceNotesEnabled(false);
      }
    };

    void loadVoiceAccess();
  }, []);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 80);
    });

    return () => {
      showSub.remove();
    };
  }, []);

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
    setShowVoiceInput(false);
    setIsGenerating(true);
    setStreamingText('');
    Keyboard.dismiss();

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      if (!sessionId) {
        throw new Error('Session not ready');
      }

      let response = '';
      await streamChat(sessionId, messageText, {
        onToken: (chunk) => {
          response += chunk;
          setStreamingText(response);
        },
        onError: (message) => {
          throw new Error(message);
        },
      }, {
        modelId: selectedModelId,
      });

      // Check for insights
      const insightCheck = detectInsightInMessage(response);
      const isInsightMessage = insightCheck.hasInsight;

      // Add assistant message
      const assistantMessage: EnhancedMessage = {
        id: `msg-${Date.now()}`,
        session_id: sessionId || '',
        role: 'assistant',
        content: response || 'I am here with you. What feels most important right now?',
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
      if (error instanceof ApiFunctionError) {
        console.warn('Error generating response:', error.message);
      } else {
        console.error('Error generating response:', error);
      }
      setIsGenerating(false);

      const insufficientCredits = isInsufficientCreditsError(error);

      if (insufficientCredits) {
        showAlert(
          'Out of Credits',
          'You do not have enough credits to continue. Upgrade your plan to keep coaching.',
          [
            { text: 'Not Now', style: 'cancel' },
            { text: 'View Plans', onPress: () => router.push('/paywall') },
          ]
        );
      }

      const errorMessage: EnhancedMessage = {
        id: `msg-${Date.now()}`,
        session_id: sessionId || '',
        role: 'assistant',
        content: isFunctionUnavailableError(error)
          ? 'The coaching service is temporarily unavailable. Please try again in a moment.'
          : insufficientCredits
            ? 'You are out of credits for now. Upgrade your plan to continue this sanctuary session.'
            : 'I apologize, but I encountered a moment of reflection. Could you share that thought again?',
        created_at: new Date().toISOString(),
      };

      setMessages(prev => [...prev, errorMessage]);
    }
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
        showAlert(
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
      if (!sessionId) {
        throw new Error('Session not ready');
      }

      const breakthrough = await fetchBreakthrough(sessionId);

      if (breakthrough) {
        setBreakthroughData(breakthrough);
        setShowBreakthrough(true);

        // Save to database
        if (authUserId) {
          await saveBreakthrough(
            authUserId,
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
      if (error instanceof ApiFunctionError) {
        console.warn('Error generating breakthrough:', error.message);
      } else {
        console.error('Error generating breakthrough:', error);
      }
      showToast(
        isFunctionUnavailableError(error) ? 'Service Unavailable' : 'Error',
        {
          variant: 'error',
          message: isFunctionUnavailableError(error)
            ? 'Breakthrough service is unavailable right now. Please try again later.'
            : 'Could not generate breakthrough. Please try again.',
        }
      );
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

  const handleVoiceInputCancel = useCallback(() => {
    setShowVoiceInput(false);
  }, []);

  const handleVoiceInputOpen = useCallback(() => {
    if (isGenerating || showVoiceInput) return;
    if (!voiceNotesEnabled) {
      showAlert('Voice Messages', 'Voice messages are available on Sovereign and Oracle plans.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'View Plans', onPress: () => router.push('/paywall') },
      ]);
      return;
    }
    setShowVoiceInput(true);
  }, [isGenerating, showVoiceInput, voiceNotesEnabled, showAlert, router]);

  // Context menu handlers
  const handleLongPress = useCallback((message: EnhancedMessage, position: { x: number; y: number }) => {
    setSelectedMessage(message);
    setMenuPosition(position);
    setMenuVisible(true);
  }, []);

  const handleHighlight = useCallback(async (message: EnhancedMessage) => {
    // Toggle insight status
    setMessages(prev =>
      prev.map(m =>
        m.id === message.id ? { ...m, is_insight: !m.is_insight } : m
      )
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleReflectFurther = useCallback(async (message: EnhancedMessage) => {
    if (!coach) return;

    setSelectedMessage(message);
    setReflectModalVisible(true);
    setIsReflecting(true);
    setReflectContent('');

    try {
      const expanded = await expandOnPoint(message.content);
      setReflectContent(expanded);
    } catch (error) {
      if (error instanceof ApiFunctionError) {
        console.warn('Error expanding point:', error.message);
      } else {
        console.error('Error expanding point:', error);
      }
      setReflectContent(
        isFunctionUnavailableError(error)
          ? 'This service is temporarily unavailable. Please try again shortly.'
          : 'I apologize, but I could not expand on this point. Please try again.'
      );
    } finally {
      setIsReflecting(false);
    }
  }, [coach]);

  const handleSaveInsight = async (message: EnhancedMessage) => {
    if (!authUserId || !coachId) return;

    try {
      const title = await generateInsightTitle(message.content);

      await saveInsight(
        authUserId,
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
      showToast('Saved', { variant: 'success', message: 'Insight saved to your journal.' });
    } catch (error) {
      if (error instanceof ApiFunctionError) {
        console.warn('Error saving insight:', error.message);
      } else {
        console.error('Error saving insight:', error);
      }
      showToast(
        isFunctionUnavailableError(error) ? 'Service Unavailable' : 'Error',
        {
          variant: 'error',
          message: isFunctionUnavailableError(error)
            ? 'Insight service is unavailable right now. Please try again later.'
            : 'Could not save insight. Please try again.',
        }
      );
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
    if (!pendingInsight || !authUserId || !coachId) return;

    try {
      const title = await generateInsightTitle(pendingInsight.content);

      await saveInsight(
        authUserId,
        sessionId || undefined,
        coachId,
        title,
        pendingInsight.content,
        'general'
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setPendingInsight(null);
    } catch (error) {
      if (error instanceof ApiFunctionError) {
        console.warn('Error saving insight:', error.message);
      } else {
        console.error('Error saving insight:', error);
      }
    }
  };

  // Handle back/close
  const handleClose = () => {
    if (messages.length >= 4 && !breakthroughData) {
      showAlert(
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
  const coachName = coach?.name ?? 'Coach';
  const coachColor = coach?.color ?? palette.accent;

  const handleInsightPress = useCallback((message: EnhancedMessage) => {
    const insight = detectInsightInMessage(message.content);
    if (insight.insightContent) {
      setPendingInsight({
        content: insight.insightContent,
        messageId: message.id,
      });
    }
  }, []);

  const renderMessage = useCallback(
    ({ item, index }: { item: EnhancedMessage; index: number }) => (
      <EditorialBlock
        message={item}
        coachName={coachName}
        coachColor={coachColor}
        index={index}
        onLongPress={handleLongPress}
        onInsightPress={handleInsightPress}
      />
    ),
    [coachColor, coachName, handleInsightPress, handleLongPress],
  );

  const messageKeyExtractor = useCallback((item: EnhancedMessage) => item.id, []);

  const listFooter = useMemo(
    () => (
      <>
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
              coachName={coachName}
              coachColor={coachColor}
              index={messages.length}
              isStreaming
            />
          </Animated.View>
        )}

        {isGenerating && !streamingText && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.typingContainer}>
            <GoldPulseIndicator
              coachName={coachName}
              variant="dust"
            />
          </Animated.View>
        )}
      </>
    ),
    [coachColor, coachName, isGenerating, messages.length, sessionId, streamingText],
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
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: palette.borderLight, backgroundColor: palette.background }]}>
        <TouchableOpacity onPress={handleClose} style={styles.headerButton}>
          <Ionicons name="chevron-down" size={28} color={palette.textPrimary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.headerCenter} onPress={() => {}}>
          <CoachIcon iconName={coach.icon_name} color={coach.color} size="sm" />
          <View style={styles.headerInfo}>
            <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>{coach.name}</Text>
            <View style={styles.headerStatus}>
              <View style={[styles.statusDot, { backgroundColor: palette.success }]} />
              <Text style={[styles.headerSubtitle, { color: palette.textTertiary }]}>In Session</Text>
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
            color={messages.length < 4 ? palette.textTertiary : palette.accent}
          />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.chatContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
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
            { paddingBottom: insets.bottom || Spacing.md, backgroundColor: palette.background, borderTopColor: palette.borderLight },
            inputContainerStyle,
          ]}
        >
          <View style={[styles.inputWrapper, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: palette.textSecondary }]}
              placeholder="Share your thoughts..."
              placeholderTextColor={palette.textTertiary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={2000}
              editable={!isGenerating}
              onFocus={() => {
                inputScale.value = withSpring(1.01, Timing.springGentle);
                setTimeout(() => {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }, 80);
              }}
              onBlur={() => {
                inputScale.value = withSpring(1, Timing.springGentle);
              }}
            />

            <View style={styles.inputActions}>
              {/* Voice note trigger */}
              <VoiceNoteTrigger
                onPress={handleVoiceInputOpen}
                disabled={isGenerating || showVoiceInput}
              />

              {/* Send button */}
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  { backgroundColor: palette.accent },
                  (!inputText.trim() || isGenerating) && { backgroundColor: palette.backgroundSecondary },
                ]}
                onPress={() => handleSend()}
                disabled={!inputText.trim() || isGenerating}
              >
                <Ionicons
                  name="arrow-up"
                  size={20}
                  color={(!inputText.trim() || isGenerating) ? palette.textTertiary : palette.textInverse}
                />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {/* Voice Input */}
        {showVoiceInput && (
          <VoiceNoteInput
            onTranscription={handleVoiceTranscription}
            onCancel={handleVoiceInputCancel}
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
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
});
