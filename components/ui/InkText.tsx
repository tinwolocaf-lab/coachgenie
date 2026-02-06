// InkText Component - Premium Rebirth
// Text appears to 'soak' into the screen with a soft fade-in, mimicking ink hitting textured paper
import React, { useEffect, useRef } from 'react';
import { TextStyle, StyleProp } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useThemeSafe } from '@/contexts/ThemeContext';

interface InkTextProps {
  text: string;
  style?: StyleProp<TextStyle>;
  delay?: number;
  duration?: number;
  charByChar?: boolean;
  onComplete?: () => void;
}

// Individual character that fades in with ink-soak effect
function InkCharacter({
  char,
  index,
  totalChars,
  baseDuration,
  baseDelay,
  style,
}: {
  char: string;
  index: number;
  totalChars: number;
  baseDuration: number;
  baseDelay: number;
  style?: StyleProp<TextStyle>;
}) {
  const progress = useSharedValue(0);
  const { palette } = useThemeSafe();

  useEffect(() => {
    // Stagger each character with slight randomness for organic feel
    const charDelay = baseDelay + index * 40 + Math.random() * 20;
    progress.value = withDelay(
      charDelay,
      withTiming(1, {
        duration: baseDuration,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      })
    );
  }, [index, baseDelay, baseDuration, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(progress.value, [0, 0.3, 1], [0, 0.4, 1]);
    const scale = interpolate(progress.value, [0, 0.5, 1], [0.95, 1.01, 1]);
    // Simulate ink spread - slight blur at start
    const blur = interpolate(progress.value, [0, 0.4, 1], [2, 0.5, 0]);

    return {
      opacity,
      transform: [{ scale }],
      // Use text shadow for organic "ink soak" feel
      textShadowColor: `${palette.textPrimary}${Math.round(blur * 20).toString(16).padStart(2, '0')}`,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: blur,
    };
  });

  return (
    <Animated.Text style={[style, animatedStyle]}>
      {char === ' ' ? ' ' : char}
    </Animated.Text>
  );
}

export function InkText({
  text,
  style,
  delay = 0,
  duration = 600,
  charByChar = false,
  onComplete,
}: InkTextProps) {
  const progress = useSharedValue(0);
  const { palette } = useThemeSafe();
  const hasTriggeredComplete = useRef(false);

  useEffect(() => {
    if (!charByChar) {
      progress.value = withDelay(
        delay,
        withTiming(1, {
          duration,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1),
        })
      );
    }

    // Trigger onComplete after animation
    if (onComplete && !hasTriggeredComplete.current) {
      hasTriggeredComplete.current = true;
      const totalDuration = charByChar
        ? delay + text.length * 40 + duration
        : delay + duration;
      const timer = setTimeout(onComplete, totalDuration);
      return () => clearTimeout(timer);
    }
  }, [delay, duration, charByChar, text, progress, onComplete]);

  // Full text ink soak (simpler, for body text)
  const fullTextStyle = useAnimatedStyle(() => {
    const opacity = interpolate(progress.value, [0, 0.3, 1], [0, 0.3, 1]);
    const translateY = interpolate(progress.value, [0, 1], [3, 0]);

    return {
      opacity,
      transform: [{ translateY }],
      textShadowColor: `${palette.textPrimary}10`,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: interpolate(progress.value, [0, 0.5, 1], [3, 1, 0]),
    };
  });

  if (charByChar) {
    // Character-by-character ink effect for dramatic text
    const chars = text.split('');
    return (
      <Animated.View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {chars.map((char, index) => (
          <InkCharacter
            key={`${index}-${char}`}
            char={char}
            index={index}
            totalChars={chars.length}
            baseDuration={duration}
            baseDelay={delay}
            style={style}
          />
        ))}
      </Animated.View>
    );
  }

  return (
    <Animated.Text style={[style, fullTextStyle]}>
      {text}
    </Animated.Text>
  );
}

export default InkText;
