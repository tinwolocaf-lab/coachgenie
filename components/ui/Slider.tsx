import React from 'react';
import { View, Text, StyleSheet, PanResponder, ViewStyle } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { Radius, Typography, Spacing } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';

interface SliderProps {
  value: number;
  onValueChange: (value: number) => void;
  minValue?: number;
  maxValue?: number;
  leftLabel?: string;
  rightLabel?: string;
  label?: string;
  style?: ViewStyle;
}

export function Slider({
  value,
  onValueChange,
  minValue = 0,
  maxValue = 100,
  leftLabel,
  rightLabel,
  label,
  style,
}: SliderProps) {
  const { palette } = useThemeSafe();
  const sliderWidth = useSharedValue(300);
  const percentage = ((value - minValue) / (maxValue - minValue)) * 100;

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        updateValue(evt.nativeEvent.locationX);
      },
      onPanResponderMove: (evt) => {
        updateValue(evt.nativeEvent.locationX);
      },
    })
  ).current;

  const updateValue = (locationX: number) => {
    const width = sliderWidth.value;
    const clampedX = Math.max(0, Math.min(locationX, width));
    const newPercentage = clampedX / width;
    const newValue = Math.round(minValue + newPercentage * (maxValue - minValue));
    onValueChange(newValue);
  };

  const handleLayout = (event: { nativeEvent: { layout: { width: number } } }) => {
    sliderWidth.value = event.nativeEvent.layout.width;
  };

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={[styles.label, { color: palette.textSecondary }]}>{label}</Text>}
      <View
        style={[styles.track, { backgroundColor: palette.border }]}
        onLayout={handleLayout}
        {...panResponder.panHandlers}
      >
        <View style={[styles.fill, { width: `${percentage}%`, backgroundColor: palette.accent }]} />
        <View
          style={[
            styles.thumb,
            {
              left: `${percentage}%`,
              backgroundColor: palette.cardBg,
              borderColor: palette.accent,
              shadowColor: palette.shadowColor,
            },
          ]}
        />
      </View>
      {(leftLabel || rightLabel) && (
        <View style={styles.labels}>
          <Text style={[styles.labelText, { color: palette.textTertiary }]}>{leftLabel}</Text>
          <Text style={[styles.labelText, { color: palette.textTertiary }]}>{rightLabel}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  label: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    marginBottom: Spacing.md,
  },
  track: {
    height: 8,
    borderRadius: Radius.full,
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    borderRadius: Radius.full,
  },
  thumb: {
    position: 'absolute',
    top: -8,
    width: 24,
    height: 24,
    marginLeft: -12,
    borderRadius: Radius.full,
    borderWidth: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  labelText: {
    fontSize: Typography.sizes.caption,
  },
});

export default Slider;
