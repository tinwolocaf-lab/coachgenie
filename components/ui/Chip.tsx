import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius, Typography, Spacing } from '@/constants/theme';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Chip({
  label,
  selected = false,
  onPress,
  disabled = false,
  style,
}: ChipProps) {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        selected && styles.selected,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, selected && styles.textSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    backgroundColor: Colors.inputBg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  selected: {
    backgroundColor: Colors.electricIndigo,
    borderColor: Colors.electricIndigo,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.slateCharcoal,
  },
  textSelected: {
    color: Colors.white,
  },
});

export default Chip;
