// Transcript Entry - A single entry in the Oracle's editorial transcript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
// Haptics used by GhostTyping child component
import { Typography, Spacing } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { GhostTyping } from './GhostTyping';
import { Message } from '@/types';

interface TranscriptEntryProps {
  message: Message;
  index: number;
  isLatest: boolean;
  isStreaming: boolean;
  onGhostTypingComplete?: () => void;
}

export function TranscriptEntry({
  message,
  index,
  isLatest,
  isStreaming,
  onGhostTypingComplete,
}: TranscriptEntryProps) {
  const { palette } = useThemeSafe();
  const isUser = message.role === 'user';

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Animated.View
      entering={isLatest && !isStreaming ? FadeInUp.duration(600).springify() : FadeIn.duration(400).delay(Math.min(index * 100, 500))}
      style={styles.container}
    >
      {/* Divider line for visual rhythm */}
      {index > 0 && (
        <View style={[styles.divider, { backgroundColor: palette.borderLight }]}>
          <View style={[styles.dividerDot, { backgroundColor: palette.accent + '40' }]} />
        </View>
      )}

      {/* Speaker attribution */}
      <View style={styles.attributionRow}>
        <View
          style={[
            styles.speakerBar,
            { backgroundColor: isUser ? palette.textPrimary : palette.accent },
          ]}
        />
        <Text
          style={[
            styles.speakerLabel,
            { color: isUser ? palette.textTertiary : palette.accent },
          ]}
        >
          {isUser ? 'YOU' : 'THE ORACLE'}
        </Text>
        <Text style={[styles.timeLabel, { color: palette.textTertiary + '80' }]}>
          {formatTime(message.created_at)}
        </Text>
      </View>

      {/* Content */}
      <View
        style={[
          styles.contentContainer,
          isUser ? styles.userContent : styles.oracleContent,
        ]}
      >
        {isUser ? (
          // User text: clean sans-serif
          <Text style={[styles.userText, { color: palette.textSecondary }]}>
            {message.content}
          </Text>
        ) : isLatest && isStreaming ? (
          // Oracle streaming: ghost typing
          <GhostTyping
            text={message.content}
            onComplete={onGhostTypingComplete}
            speed={18}
            isSerif
            hapticEnabled
          />
        ) : (
          // Oracle completed: editorial serif
          <Text style={[styles.oracleText, { color: palette.textPrimary }]}>
            {message.content}
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },

  // Divider
  divider: {
    height: 1,
    marginBottom: Spacing.xl,
    marginHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
  },

  // Attribution
  attributionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  speakerBar: {
    width: 16,
    height: 2,
    borderRadius: 1,
    marginRight: Spacing.sm,
  },
  speakerLabel: {
    fontSize: Typography.sizes.micro,
    fontFamily: Typography.fonts.sansMedium,
    letterSpacing: Typography.letterSpacing.display,
    textTransform: 'uppercase',
    flex: 1,
  },
  timeLabel: {
    fontSize: Typography.sizes.micro,
    fontFamily: Typography.fonts.sansLight,
    letterSpacing: Typography.letterSpacing.wider,
  },

  // Content
  contentContainer: {
    paddingHorizontal: Spacing.xl,
  },
  userContent: {
    paddingLeft: Spacing.xl + Spacing.md,
  },
  oracleContent: {
    paddingLeft: Spacing.xl,
    paddingRight: Spacing.lg,
  },

  // Text styles
  userText: {
    fontSize: Typography.sizes.body,
    fontFamily: Typography.fonts.sans,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
    letterSpacing: Typography.letterSpacing.normal,
  },
  oracleText: {
    fontSize: Typography.sizes.bodyLarge,
    fontFamily: Typography.fonts.serifRegular,
    lineHeight: Typography.sizes.bodyLarge * Typography.lineHeights.loose,
    letterSpacing: Typography.letterSpacing.editorial,
  },
});
