import React, { useState, useRef, useEffect } from 'react';
import {
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search...',
  onFocus,
  onBlur,
}: SearchBarProps) {
  const { palette } = useThemeSafe();
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const focusProgress = useSharedValue(0);
  const iconScale = useSharedValue(1);

  useEffect(() => {
    focusProgress.value = withSpring(isFocused ? 1 : 0, Timing.springGentle);
  }, [isFocused, focusProgress]);

  const handleFocus = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsFocused(true);
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
  };

  const handleClear = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChangeText('');
    inputRef.current?.focus();
  };

  const handleIconPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    iconScale.value = withSpring(0.8, Timing.springBouncy);
    setTimeout(() => {
      iconScale.value = withSpring(1, Timing.springBouncy);
    }, 100);
    inputRef.current?.focus();
  };

  const containerStyle = useAnimatedStyle(() => ({
    borderWidth: interpolate(
      focusProgress.value,
      [0, 1],
      [1, 2],
      Extrapolation.CLAMP
    ),
    borderColor: focusProgress.value > 0.5 ? palette.accent : palette.border,
    shadowOpacity: interpolate(
      focusProgress.value,
      [0, 1],
      [0.04, 0.1],
      Extrapolation.CLAMP
    ),
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
    opacity: interpolate(
      focusProgress.value,
      [0, 1],
      [0.5, 1],
      Extrapolation.CLAMP
    ),
  }));

  const clearButtonStyle = useAnimatedStyle(() => ({
    opacity: value.length > 0 ? 1 : 0,
    transform: [
      {
        scale: value.length > 0 ? 1 : 0.5,
      },
    ],
  }));

  return (
    <Animated.View style={[styles.container, { backgroundColor: palette.cardBg }, containerStyle]}>
      <AnimatedTouchable
        onPress={handleIconPress}
        style={[styles.iconWrapper, iconStyle]}
        activeOpacity={0.7}
      >
        <Ionicons
          name="search"
          size={20}
          color={isFocused ? palette.accent : palette.textTertiary}
        />
      </AnimatedTouchable>

      <TextInput
        ref={inputRef}
        style={[styles.input, { color: palette.textSecondary }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={palette.textTertiary}
        onFocus={handleFocus}
        onBlur={handleBlur}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Animated.View style={[styles.clearButtonWrapper, clearButtonStyle]}>
        <TouchableOpacity
          onPress={handleClear}
          style={styles.clearButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close-circle" size={18} color={palette.textTertiary} />
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    ...Shadows.subtle,
  },
  iconWrapper: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: Typography.sizes.body,
    padding: 0,
    height: 24,
  },
  clearButtonWrapper: {
    marginLeft: Spacing.sm,
  },
  clearButton: {
    padding: 2,
  },
});
