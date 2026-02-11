import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInUp,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { CoachIcon } from '@/components/ui/CoachIcon';
import { SAMPLE_COACHES } from '@/data/coaches';
import {
  getOnboardingData,
  completeNewOnboarding,
  getOpeningQuestion,
} from '@/lib/onboarding';

interface ChatMessage {
  id: string;
  role: 'user' | 'coach';
  content: string;
  timestamp: Date;
}

const MOCK_RESPONSES = [
  {
    follow: 0,
    responses: [
      "That's insightful. I'm noticing a pattern here. Can you tell me more about what specifically triggered this feeling?",
      "I appreciate that honesty. That's actually the first step. How long have you been thinking about this?",
      "That resonates. A lot of people feel that way. What would solving this unlock for you?",
    ],
  },
  {
    follow: 1,
    responses: [
      "I see. And when that happens, what's your typical response? What do you usually do?",
      "Interesting. Have you tried anything to address this? What worked, and what didn't?",
      "That makes sense. What would be the ideal scenario? Paint me a picture of what success looks like.",
    ],
  },
  {
    follow: 2,
    responses: [
      "Great start! I'm seeing some real clarity here. Let's build on this in our future sessions—we're just getting warmed up.",
      "This is excellent material to work with. You've given me a lot to explore with you next time.",
      "I can feel your commitment to this. Let's turn these insights into action in our next coaching session.",
    ],
  },
];

export default function FirstSessionScreen() {
  const router = useRouter();
  const { palette } = useThemeSafe();
  const scrollViewRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [coachInfo, setCoachInfo] = useState<any>(null);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [exchangeCount, setExchangeCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const opacityValue = useSharedValue(0);

  useEffect(() => {
    loadCoachAndStartSession();
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    if (scrollViewRef.current && messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const loadCoachAndStartSession = async () => {
    try {
      const data = await getOnboardingData();
      const selectedCoach = SAMPLE_COACHES.find((c) => c.id === data.selectedCoachId);

      if (selectedCoach) {
        setCoachInfo(selectedCoach);

        // Generate opening message
        const vibeLabels = data.vibes.map((v) =>
          v
            .replace('-', ' ')
            .split(' ')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
        );

        const openingQuestion = getOpeningQuestion(vibeLabels);

        const openingMessage: ChatMessage = {
          id: '1',
          role: 'coach',
          content: openingQuestion,
          timestamp: new Date(),
        };

        setMessages([openingMessage]);
        setSessionStarted(true);
      }
    } catch (error) {
      console.error('Error loading coach:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Add user message
    const userMessage: ChatMessage = {
      id: String(messages.length + 1),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');

    // Simulate coach response
    setIsLoading(true);

    // Determine which response to show based on exchange count
    const responseSet = MOCK_RESPONSES[Math.min(exchangeCount, 2)];
    const coachResponse =
      responseSet.responses[Math.floor(Math.random() * responseSet.responses.length)];

    // Simulate delay
    await new Promise((resolve) => setTimeout(resolve, 1200 + Math.random() * 800));

    const coachMessage: ChatMessage = {
      id: String(messages.length + 2),
      role: 'coach',
      content: coachResponse,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, coachMessage]);
    setExchangeCount((prev) => prev + 1);
    setIsLoading(false);

    // Check if session is complete (3 exchanges = 6 messages total)
    if (messages.length + 2 >= 6) {
      setIsComplete(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleEnterCoachGenie = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);

    try {
      await completeNewOnboarding();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!sessionStarted || !coachInfo) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: palette.background }]}
        edges={['bottom']}
      >
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: palette.textTertiary }]}>
            Starting your first coaching session...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={['bottom']}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={100}
      >
        {/* Header */}
        <Animated.View
          entering={FadeInUp.duration(600).delay(200)}
          style={[styles.header, { borderBottomColor: palette.border }]}
        >
          <CoachIcon
            iconName={coachInfo.icon_name}
            color={coachInfo.color}
            size="md"
            variant="default"
          />
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>
              {coachInfo.name}
            </Text>
            <Text style={[styles.headerSubtitle, { color: palette.textTertiary }]}>
              Your first session
            </Text>
          </View>
        </Animated.View>

        {/* Chat Messages */}
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((message, index) => (
            <Animated.View
              key={message.id}
              entering={FadeInUp.duration(400).delay(index * 100)}
              style={[
                styles.messageRow,
                message.role === 'coach' && styles.coachMessageRow,
              ]}
            >
              <ChatBubble message={message} coach={coachInfo} />
            </Animated.View>
          ))}

          {/* Completion message */}
          {isComplete && (
            <Animated.View
              entering={FadeInUp.duration(600)}
              style={styles.completionBubble}
            >
              <View
                style={[
                  styles.completionContent,
                  { backgroundColor: palette.accentMuted },
                ]}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={palette.accent}
                  style={styles.completionIcon}
                />
                <Text style={[styles.completionText, { color: palette.textPrimary }]}>
                  Great start! You've laid the foundation for meaningful growth. Let's continue this conversation when you're ready.
                </Text>
              </View>
            </Animated.View>
          )}
        </ScrollView>

        {/* Input or Complete Button */}
        {!isComplete ? (
          <View style={[styles.inputContainer, { borderTopColor: palette.border }]}>
            <View style={styles.inputRow}>
              <TextInput
                style={[
                  styles.input,
                  {
                    color: palette.textPrimary,
                    borderColor: palette.border,
                    backgroundColor: palette.cardBg,
                  },
                ]}
                placeholder="Your response..."
                placeholderTextColor={palette.textTertiary}
                value={inputValue}
                onChangeText={setInputValue}
                editable={!isLoading}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                onPress={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                style={[
                  styles.sendButton,
                  {
                    backgroundColor:
                      inputValue.trim() && !isLoading
                        ? palette.accent
                        : palette.border,
                  },
                ]}
              >
                <Ionicons name="send" size={18} color={palette.textInverse} />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <Animated.View
            entering={FadeInUp.duration(400)}
            style={styles.completeFooter}
          >
            <Button
              title="Enter CoachGenie"
              onPress={handleEnterCoachGenie}
              disabled={isLoading}
              loading={isLoading}
              variant="gold"
              size="lg"
              fullWidth
            />
          </Animated.View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

interface ChatBubbleProps {
  message: ChatMessage;
  coach: any;
}

function ChatBubble({ message, coach }: ChatBubbleProps) {
  const { palette } = useThemeSafe();
  const isCoach = message.role === 'coach';

  return (
    <View
      style={[
        styles.bubble,
        isCoach
          ? [styles.coachBubble, { backgroundColor: palette.cardBg }]
          : [styles.userBubble, { backgroundColor: palette.accent }],
      ]}
    >
      <Text
        style={[
          styles.bubbleText,
          {
            color: isCoach ? palette.textPrimary : palette.textInverse,
          },
        ]}
      >
        {message.content}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
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

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    gap: Spacing.lg,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
  },
  headerSubtitle: {
    fontSize: Typography.sizes.body,
    marginTop: Spacing.xs,
  },

  // Messages
  messagesContent: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
  },
  messageRow: {
    marginBottom: Spacing.md,
    flexDirection: 'row',
  },
  coachMessageRow: {
    justifyContent: 'flex-start',
  },

  bubble: {
    maxWidth: '85%',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
  },
  userBubble: {
    marginLeft: 'auto',
    borderBottomRightRadius: Radius.sm,
  },
  coachBubble: {
    marginRight: 'auto',
    borderBottomLeftRadius: Radius.sm,
    ...Shadows.sm,
  },
  bubbleText: {
    fontSize: Typography.sizes.body,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },

  // Completion
  completionBubble: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  completionContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    gap: Spacing.md,
  },
  completionIcon: {
    marginTop: Spacing.xs,
    flexShrink: 0,
  },
  completionText: {
    flex: 1,
    fontSize: Typography.sizes.body,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },

  // Input
  inputContainer: {
    borderTopWidth: 1,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  inputRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    maxHeight: 100,
    fontSize: Typography.sizes.body,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Complete Footer
  completeFooter: {
    paddingHorizontal: Spacing.xxl,
    paddingBottom: Spacing.xl,
    paddingTop: Spacing.lg,
  },
});
