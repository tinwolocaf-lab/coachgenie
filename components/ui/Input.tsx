import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextInputProps,
} from 'react-native';
import { Radius, Typography, Spacing } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
}

export function Input({
  label,
  error,
  containerStyle,
  style,
  ...props
}: InputProps) {
  const { palette } = useThemeSafe();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={[styles.label, { color: palette.textSecondary }]}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: palette.backgroundSecondary,
            borderColor: palette.border,
            color: palette.textSecondary,
          },
          isFocused && {
            borderColor: palette.accent,
            backgroundColor: palette.cardBg,
          },
          error && { borderColor: palette.error },
          style,
        ]}
        placeholderTextColor={palette.textTertiary}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />
      {error && <Text style={[styles.error, { color: palette.error }]}>{error}</Text>}
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
  },
  error: {
    fontSize: Typography.sizes.caption,
    marginTop: Spacing.xs,
  },
});

export default Input;
