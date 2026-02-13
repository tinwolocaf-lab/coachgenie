import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  SlideInUp,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { Typography, Radius, Spacing, Shadows, Timing } from '@/constants/theme';
import type { ToastItem, ToastVariant } from '@/contexts/AlertContext';

const VARIANT_ICONS: Record<ToastVariant, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'close-circle',
  warning: 'warning',
  info: 'information-circle',
};

interface ToastProps {
  item: ToastItem;
  index: number;
  onDismiss: (id: string) => void;
}

export function Toast({ item, index, onDismiss }: ToastProps) {
  const { palette } = useThemeSafe();
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  const variantColor = (() => {
    switch (item.variant) {
      case 'success': return palette.success;
      case 'error': return palette.error;
      case 'warning': return palette.warning;
      case 'info': return palette.accent;
    }
  })();

  useEffect(() => {
    Haptics.notificationAsync(
      item.variant === 'error'
        ? Haptics.NotificationFeedbackType.Error
        : item.variant === 'warning'
          ? Haptics.NotificationFeedbackType.Warning
          : Haptics.NotificationFeedbackType.Success
    );
  }, []);

  // Auto-dismiss timer
  useEffect(() => {
    const timer = setTimeout(() => {
      dismiss();
    }, item.duration);
    return () => clearTimeout(timer);
  }, [item.duration]);

  const dismiss = () => {
    opacity.value = withTiming(0, { duration: 200 }, () => {
      runOnJS(onDismiss)(item.id);
    });
  };

  // Swipe up to dismiss
  const gesture = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY < 0) {
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (e.translationY < -40) {
        translateY.value = withTiming(-200, { duration: 200 });
        opacity.value = withTiming(0, { duration: 200 }, () => {
          runOnJS(onDismiss)(item.id);
        });
      } else {
        translateY.value = withSpring(0, Timing.springGentle);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const topOffset = insets.top + 8 + index * 72;

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        entering={SlideInUp.springify()
          .damping(Timing.springGentle.damping)
          .stiffness(Timing.springGentle.stiffness)
          .mass(Timing.springGentle.mass)}
        style={[
          styles.container,
          animatedStyle,
          { top: topOffset },
        ]}
        pointerEvents="box-none"
      >
        <BlurView
          intensity={80}
          tint={palette.statusBarStyle === 'light' ? 'dark' : 'light'}
          style={[
            styles.blurWrap,
            {
              backgroundColor: palette.glassBg,
              borderColor: palette.glassBorder,
            },
          ]}
        >
          <View style={[styles.iconWrap, { backgroundColor: variantColor + '20' }]}>
            <Ionicons
              name={VARIANT_ICONS[item.variant]}
              size={20}
              color={variantColor}
            />
          </View>
          <View style={styles.textWrap}>
            <Text
              style={[
                styles.title,
                {
                  color: palette.textPrimary,
                  fontFamily: Typography.fonts.serif,
                },
              ]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            {item.message ? (
              <Text
                style={[
                  styles.message,
                  {
                    color: palette.textSecondary,
                    fontFamily: Typography.fonts.sans,
                  },
                ]}
                numberOfLines={2}
              >
                {item.message}
              </Text>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={dismiss}
            hitSlop={12}
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={18} color={palette.textTertiary} />
          </TouchableOpacity>
        </BlurView>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 9999,
  },
  blurWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    ...Shadows.lg,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  textWrap: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  title: {
    fontSize: Typography.sizes.body,
    lineHeight: Typography.sizes.body * Typography.lineHeights.snug,
  },
  message: {
    fontSize: Typography.sizes.caption,
    lineHeight: Typography.sizes.caption * Typography.lineHeights.normal,
    marginTop: 2,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
});
