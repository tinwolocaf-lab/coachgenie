// The Oracle - Phase 3: Premium Socratic Coaching Interface
// A transcript-view coaching experience with ghost typing and deep AI resonance
import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withRepeat,
  Easing,
  interpolate,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Typography, Spacing, Radius, Shadows, Timing, EditorialSpacing } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { useFocusMode } from '@/contexts/FocusModeContext';
import { Message, ContextVault } from '@/types';
import { getContextVault } from '@/store/app';
import { useAuthSafe } from '@/hooks/useConditionalAuth';
import { generateOracleResponse, getOracleGreeting } from '@/lib/ai-oracle';
import { TranscriptEntry } from '@/components/oracle/TranscriptEntry';

// Dimensions removed to avoid lint warnings - not needed for current layout

export default function OracleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { palette } = useThemeSafe();
  const { enterFocusMode, exitFocusMode } = useFocusMode();
  // Auth ready for future session persistence
  const auth = useAuthSafe();
  void auth; // Reserved for future session persistence

  // State
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isStreamingEntry, setIsStreamingEntry] = useState(false);
  const [userContext, setUserContext] = useState<ContextVault | null>(null);
  const [showEntrance, setShowEntrance] = useState(true);
  const [, setSessionStarted] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  // Animations
  const entranceOpacity = useSharedValue(1);
  const entranceScale = useSharedValue(0.95);
  const headerOpacity = useSharedValue(0);
  const inputScale = useSharedValue(1);
  const breathePulse = useSharedValue(0);

  // Enable focus mode (hides dock) on mount
  useEffect(() => {
    enterFocusMode();
    return () => {
      exitFocusMode();
    };
  }, [enterFocusMode, exitFocusMode]);

  // Breathing animation for waiting state
  useEffect(() => {
    breathePulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, [breathePulse]);

  // Initialize
  useEffect(() => {
    initializeOracle();
  }, []);

  const initializeOracle = async () => {
    try {
      const vault = await getContextVault();
      setUserContext(vault);
    } catch (error) {
      console.error('Error loading context:', error);
    }
  };

  const startSession = useCallback(() => {
    setSessionStarted(true);

    // Add Oracle's opening greeting
    const greeting = getOracleGreeting(userContext);
    const greetingMessage: Message = {
      id: `oracle-${Date.now()}`,
      session_id: 'oracle-session',
      role: 'assistant',
      content: greeting,
      created_at: new Date().toISOString(),
    };

    setMessages([greetingMessage]);
    setIsStreamingEntry(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [userContext]);

  // Entrance animation
  const handleEntranceComplete = useCallback(() => {
    entranceOpacity.value = withTiming(0, { duration: 800 }, () => {
      runOnJS(setShowEntrance)(false);
      runOnJS(startSession)();
    });
    headerOpacity.value = withTiming(1, { duration: 800 });
  }, [entranceOpacity, headerOpacity, startSession]);

  // Auto-start entrance after delay
  useEffect(() => {
    const timer = setTimeout(() => {
      entranceScale.value = withSpring(1, { damping: 20, stiffness: 90 });
      setTimeout(handleEntranceComplete, 2000);
    }, 500);
    return () => clearTimeout(timer);
  }, [entranceScale, handleEntranceComplete]);

  // Send message
  const handleSend = async () => {
    const messageText = inputText.trim();
    if (!messageText || isGenerating) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Animate input
    inputScale.value = withSequence(
      withTiming(0.97, { duration: 80 }),
      withSpring(1, Timing.springBouncy)
    );

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      session_id: 'oracle-session',
      role: 'user',
      content: messageText,
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsGenerating(true);
    Keyboard.dismiss();

    // Scroll to bottom
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 200);

    try {
      const response = await generateOracleResponse(
        userContext,
        messages,
        messageText
      );

      const oracleMessage: Message = {
        id: `oracle-${Date.now()}`,
        session_id: 'oracle-session',
        role: 'assistant',
        content: response,
        created_at: new Date().toISOString(),
      };

      setMessages(prev => [...prev, oracleMessage]);
      setIsStreamingEntry(true);
      setIsGenerating(false);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Scroll to bottom for ghost typing
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 300);
    } catch (error) {
      console.error('Oracle response error:', error);
      setIsGenerating(false);

      const errorMessage: Message = {
        id: `oracle-error-${Date.now()}`,
        session_id: 'oracle-session',
        role: 'assistant',
        content: 'The stream of thought was briefly interrupted. Share that reflection once more, and we will find our way back to the thread.',
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
      setIsStreamingEntry(true);
    }
  };

  const handleGhostTypingComplete = () => {
    setIsStreamingEntry(false);
    // Scroll to ensure full text is visible
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  // Animated styles
  const entranceAnimStyle = useAnimatedStyle(() => ({
    opacity: entranceOpacity.value,
    transform: [{ scale: entranceScale.value }],
  }));

  const headerAnimStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
  }));

  const inputContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: inputScale.value }],
  }));

  const breatheStyle = useAnimatedStyle(() => ({
    opacity: interpolate(breathePulse.value, [0, 1], [0.3, 0.8]),
    transform: [{ scale: interpolate(breathePulse.value, [0, 1], [1, 1.05]) }],
  }));

  // Render entrance
  if (showEntrance) {
    return (
      <SafeAreaView style={[styles.entranceContainer, { backgroundColor: palette.background }]} edges={['top']}>
        {/* Close button - always visible */}
        <View style={styles.entranceHeader}>
          <TouchableOpacity
            onPress={handleClose}
            style={[styles.entranceCloseButton, { backgroundColor: palette.cardBg, borderRadius: 20 }]}
            hitSlop={12}
          >
            <Ionicons name="close" size={28} color={palette.textSecondary} />
          </TouchableOpacity>
        </View>

        <Animated.View style={[styles.entranceContent, entranceAnimStyle]}>
          {/* Oracle symbol */}
          <View style={[styles.oracleSymbol, { borderColor: palette.accent + '30' }]}>
            <Ionicons name="eye-outline" size={40} color={palette.accent} />
          </View>

          <Text style={[styles.entranceTitle, { color: palette.textPrimary }]}>
            The Oracle
          </Text>
          <Text style={[styles.entranceSubtitle, { color: palette.textTertiary }]}>
            A space for deeper seeing
          </Text>

          {/* Breathing line */}
          <Animated.View style={breatheStyle}>
            <LinearGradient
              colors={['transparent', palette.accent + '40', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.entranceLine}
            />
          </Animated.View>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header - Minimal, editorial */}
      <Animated.View style={[styles.header, headerAnimStyle]}>
        <TouchableOpacity
          onPress={handleClose}
          style={[styles.headerButton, { backgroundColor: palette.cardBg, borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }]}
          hitSlop={12}
        >
          <Ionicons name="close" size={24} color={palette.textSecondary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={[styles.headerDot, { backgroundColor: palette.accent }]} />
          <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>
            The Oracle
          </Text>
        </View>

        <View style={styles.headerButton}>
          <Text style={[styles.headerSessionLabel, { color: palette.textTertiary }]}>
            {messages.filter(m => m.role === 'user').length} reflections
          </Text>
        </View>
      </Animated.View>

      {/* Subtle top border */}
      <View style={[styles.headerBorder, { backgroundColor: palette.borderLight }]} />

      {/* Transcript Area */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.transcriptScroll}
          contentContainerStyle={styles.transcriptContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Session header in transcript */}
          <Animated.View entering={FadeIn.duration(600).delay(300)} style={styles.sessionHeader}>
            <Text style={[styles.sessionDate, { color: palette.textTertiary }]}>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
            <LinearGradient
              colors={['transparent', palette.accent + '25', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.sessionDivider}
            />
          </Animated.View>

          {/* Transcript entries */}
          {messages.map((message, index) => (
            <TranscriptEntry
              key={message.id}
              message={message}
              index={index}
              isLatest={index === messages.length - 1 && message.role === 'assistant'}
              isStreaming={
                index === messages.length - 1 &&
                message.role === 'assistant' &&
                isStreamingEntry
              }
              onGhostTypingComplete={handleGhostTypingComplete}
            />
          ))}

          {/* Thinking indicator */}
          {isGenerating && (
            <Animated.View
              entering={FadeIn.duration(400)}
              exiting={FadeOut.duration(300)}
              style={styles.thinkingContainer}
            >
              <View style={[styles.thinkingDot, { backgroundColor: palette.accent }]}>
                <Animated.View style={breatheStyle}>
                  <View style={[styles.thinkingInner, { backgroundColor: palette.accent }]} />
                </Animated.View>
              </View>
              <Text style={[styles.thinkingText, { color: palette.textTertiary }]}>
                contemplating...
              </Text>
            </Animated.View>
          )}

          {/* Bottom spacer */}
          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Input area - Editorial minimal design */}
        <Animated.View
          style={[
            styles.inputContainer,
            {
              paddingBottom: Math.max(insets.bottom, Spacing.md),
              backgroundColor: palette.background,
              borderTopColor: palette.borderLight,
            },
            inputContainerStyle,
          ]}
        >
          <View style={[styles.inputWrapper, { backgroundColor: palette.cardBg, borderColor: palette.borderLight }]}>
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: palette.textPrimary }]}
              placeholder="Share your reflection..."
              placeholderTextColor={palette.textTertiary + '80'}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={2000}
              editable={!isGenerating}
              returnKeyType="default"
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                {
                  backgroundColor:
                    inputText.trim() && !isGenerating
                      ? palette.accent
                      : palette.borderLight,
                },
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || isGenerating}
              activeOpacity={0.8}
            >
              <Ionicons
                name="arrow-up"
                size={18}
                color={inputText.trim() && !isGenerating ? palette.textInverse : palette.textTertiary}
              />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
  },

  // Entrance
  entranceContainer: {
    flex: 1,
  },
  entranceHeader: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  entranceCloseButton: {
    padding: Spacing.xs,
  },
  entranceContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: EditorialSpacing.breathingMargin,
  },
  oracleSymbol: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  entranceTitle: {
    fontSize: Typography.sizes.giant,
    fontFamily: Typography.fonts.serif,
    fontWeight: Typography.weights.bold,
    letterSpacing: Typography.letterSpacing.editorial,
    marginBottom: Spacing.sm,
  },
  entranceSubtitle: {
    fontSize: Typography.sizes.body,
    fontFamily: Typography.fonts.sansLight,
    letterSpacing: Typography.letterSpacing.wider,
    textTransform: 'lowercase',
    marginBottom: Spacing.xxxl,
  },
  entranceLine: {
    width: 120,
    height: 1.5,
    borderRadius: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerButton: {
    minWidth: 60,
    padding: Spacing.xs,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  headerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  headerTitle: {
    fontSize: Typography.sizes.body,
    fontFamily: Typography.fonts.sansMedium,
    letterSpacing: Typography.letterSpacing.wider,
    textTransform: 'uppercase',
  },
  headerSessionLabel: {
    fontSize: Typography.sizes.micro,
    fontFamily: Typography.fonts.sansLight,
    letterSpacing: Typography.letterSpacing.wide,
    textAlign: 'right',
  },
  headerBorder: {
    height: 1,
    marginHorizontal: Spacing.xl,
  },

  // Transcript
  transcriptScroll: {
    flex: 1,
  },
  transcriptContent: {
    paddingTop: Spacing.xl,
  },

  // Session header
  sessionHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
  },
  sessionDate: {
    fontSize: Typography.sizes.caption,
    fontFamily: Typography.fonts.sansLight,
    letterSpacing: Typography.letterSpacing.display,
    textTransform: 'uppercase',
    marginBottom: Spacing.md,
  },
  sessionDivider: {
    width: 80,
    height: 1.5,
    borderRadius: 1,
  },

  // Thinking
  thinkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  thinkingDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.3,
  },
  thinkingInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  thinkingText: {
    fontSize: Typography.sizes.caption,
    fontFamily: Typography.fonts.sansLight,
    fontStyle: 'italic',
    letterSpacing: Typography.letterSpacing.wider,
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
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.xs,
    paddingVertical: Spacing.xs,
    minHeight: 48,
    ...Shadows.subtle,
  },
  input: {
    flex: 1,
    fontSize: Typography.sizes.body,
    fontFamily: Typography.fonts.sans,
    maxHeight: 120,
    paddingVertical: Spacing.sm,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing.sm,
  },
});
