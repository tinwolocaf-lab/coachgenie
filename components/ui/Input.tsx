import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  ViewStyle,
  StyleProp,
  TextStyle,
  TextInputProps,
} from 'react-native';
import { Radius, Typography, Spacing } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { AppText } from './AppText';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  containerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  errorStyle?: StyleProp<TextStyle>;
  helperStyle?: StyleProp<TextStyle>;
}

export function Input({
  label,
  error,
  helperText,
  containerStyle,
  labelStyle,
  errorStyle,
  helperStyle,
  style,
  editable = true,
  allowFontScaling = true,
  maxFontSizeMultiplier = 1.3,
  onFocus: onFocusProp,
  onBlur: onBlurProp,
  accessibilityLabel,
  accessibilityHint,
  ...props
}: InputProps) {
  const { palette } = useThemeSafe();
  const [isFocused, setIsFocused] = useState(false);

  const isDisabled = editable === false;
  const accessibilityDescription = error ?? helperText;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <AppText
          variant="body"
          weight="medium"
          tone="secondary"
          style={[styles.label, labelStyle]}
        >
          {label}
        </AppText>
      )}
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: palette.backgroundSecondary,
            borderColor: palette.border,
            color: palette.textPrimary,
          },
          isFocused && {
            borderColor: palette.accent,
            backgroundColor: palette.cardBg,
          },
          isDisabled && {
            opacity: 0.65,
          },
          error && { borderColor: palette.error },
          style,
        ]}
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityHint={accessibilityHint ?? accessibilityDescription}
        accessibilityState={{ disabled: isDisabled }}
        placeholderTextColor={palette.textTertiary}
        selectionColor={palette.accent}
        editable={editable}
        allowFontScaling={allowFontScaling}
        maxFontSizeMultiplier={maxFontSizeMultiplier}
        onFocus={(event) => {
          setIsFocused(true);
          onFocusProp?.(event);
        }}
        onBlur={(event) => {
          setIsFocused(false);
          onBlurProp?.(event);
        }}
        {...props}
      />
      {error ? (
        <AppText
          variant="caption"
          tone="error"
          weight="medium"
          style={[styles.error, errorStyle]}
        >
          {error}
        </AppText>
      ) : helperText ? (
        <AppText
          variant="caption"
          tone="tertiary"
          style={[styles.error, helperStyle]}
        >
          {helperText}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    marginBottom: Spacing.sm,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    fontSize: Typography.sizes.bodyLarge,
    lineHeight: Math.round(Typography.sizes.bodyLarge * Typography.lineHeights.snug),
    fontFamily: Typography.fonts.sans,
    minHeight: 48,
  },
  error: {
    fontSize: Typography.sizes.caption,
    marginTop: Spacing.xs,
  },
});

export default Input;
