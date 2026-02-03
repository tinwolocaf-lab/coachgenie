import React from 'react';
import { View, Text, StyleSheet, PanResponder, ViewStyle } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { Colors, Radius, Typography, Spacing } from '@/constants/theme';

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
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={styles.track}
        onLayout={handleLayout}
        {...panResponder.panHandlers}
      >
        <View style={[styles.fill, { width: `${percentage}%` }]} />
        <View style={[styles.thumb, { left: `${percentage}%` }]} />
      </View>
      {(leftLabel || rightLabel) && (
        <View style={styles.labels}>
          <Text style={styles.labelText}>{leftLabel}</Text>
          <Text style={styles.labelText}>{rightLabel}</Text>
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
    color: Colors.slateCharcoal,
    marginBottom: Spacing.md,
  },
  track: {
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: Radius.full,
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    backgroundColor: Colors.electricIndigo,
    borderRadius: Radius.full,
  },
  thumb: {
    position: 'absolute',
    top: -8,
    width: 24,
    height: 24,
    marginLeft: -12,
    backgroundColor: Colors.white,
    borderRadius: Radius.full,
    borderWidth: 3,
    borderColor: Colors.electricIndigo,
    shadowColor: '#000',
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
    color: Colors.slateGray,
  },
});

export default Slider;
