// Ghost Typing Component - Characters appear one-by-one with blur-to-focus
import React, { useEffect, useState, useRef } from 'react';
import { Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Typography } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';

interface GhostTypingProps {
  text: string;
  onComplete?: () => void;
  speed?: number; // ms per character
  isSerif?: boolean;
  style?: object;
  hapticEnabled?: boolean;
}

export function GhostTyping({
  text,
  onComplete,
  speed = 22,
  isSerif = true,
  style,
  hapticEnabled = true,
}: GhostTypingProps) {
  const { palette } = useThemeSafe();
  const [displayedLength, setDisplayedLength] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hapticCountRef = useRef(0);

  const cursorOpacity = useSharedValue(1);

  // Blink cursor
  useEffect(() => {
    if (!isComplete) {
      const blink = setInterval(() => {
        cursorOpacity.value = withTiming(cursorOpacity.value === 1 ? 0.2 : 1, {
          duration: 400,
          easing: Easing.inOut(Easing.ease),
        });
      }, 500);
      return () => clearInterval(blink);
    } else {
      cursorOpacity.value = withTiming(0, { duration: 400 });
    }
  }, [isComplete, cursorOpacity]);

  // Type characters one by one
  useEffect(() => {
    if (!text) return;

    setDisplayedLength(0);
    setIsComplete(false);
    hapticCountRef.current = 0;

    let charIndex = 0;

    const typeNextChar = () => {
      if (charIndex >= text.length) {
        setIsComplete(true);
        if (hapticEnabled) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        onComplete?.();
        return;
      }

      charIndex++;
      setDisplayedLength(charIndex);

      // Subtle haptic every ~30 characters for that "writing" feel
      hapticCountRef.current++;
      if (hapticEnabled && hapticCountRef.current % 30 === 0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      // Variable speed: pause longer on punctuation
      const currentChar = text[charIndex - 1];
      let nextDelay = speed;
      if (currentChar === '.' || currentChar === '?' || currentChar === '!') {
        nextDelay = speed * 6;
      } else if (currentChar === ',') {
        nextDelay = speed * 3;
      } else if (currentChar === ' ') {
        nextDelay = speed * 0.5;
      }

      intervalRef.current = setTimeout(typeNextChar, nextDelay);
    };

    // Small initial delay for dramatic effect
    intervalRef.current = setTimeout(typeNextChar, 400);

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, [text, speed, onComplete, hapticEnabled]);

  const cursorStyle = useAnimatedStyle(() => ({
    opacity: cursorOpacity.value,
  }));

  const displayedText = text.slice(0, displayedLength);
  // The "ghost" portion that's still coming
  const ghostLength = Math.min(displayedLength + 3, text.length);
  const ghostText = text.slice(displayedLength, ghostLength);

  return (
    <Animated.View entering={FadeIn.duration(300)} style={[styles.container, style]}>
      <Text
        style={[
          styles.text,
          isSerif ? styles.serifText : styles.sansText,
          { color: palette.textPrimary },
        ]}
      >
        {displayedText}
        {/* Ghost blur portion */}
        {!isComplete && ghostText.length > 0 && (
          <Text style={[styles.ghostText, { color: palette.textTertiary }]}>
            {ghostText}
          </Text>
        )}
        {/* Cursor */}
        {!isComplete && (
          <Animated.Text style={[styles.cursor, { color: palette.accent }, cursorStyle]}>
            │
          </Animated.Text>
        )}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 20,
  },
  text: {
    fontSize: Typography.sizes.bodyLarge,
    lineHeight: Typography.sizes.bodyLarge * Typography.lineHeights.loose,
  },
  serifText: {
    fontFamily: Typography.fonts.serifRegular,
    letterSpacing: Typography.letterSpacing.editorial,
  },
  sansText: {
    fontFamily: Typography.fonts.sans,
    letterSpacing: Typography.letterSpacing.normal,
  },
  ghostText: {
    opacity: 0.15,
  },
  cursor: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: '100',
  },
});
