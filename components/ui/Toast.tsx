import React, { useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  runOnJS,
  SlideInUp,
  Easing,
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
  success: 'checkmark',
  error: 'close',
  warning: 'warning',
  info: 'information',
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

  // Staggered animation values
  const accentBarScale = useSharedValue(0);
  const iconScale = useSharedValue(0);
  const progressScale = useSharedValue(1);

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

    // Staggered entrance: accent bar → icon → progress
    accentBarScale.value = withDelay(100, withSpring(1, { damping: 20, stiffness: 150 }));
    iconScale.value = withDelay(150, withSpring(1, { damping: 14, stiffness: 160 }));
    progressScale.value = withTiming(0, {
      duration: item.duration,
      easing: Easing.linear,
    });
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

  const accentBarStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: accentBarScale.value }],
  }));

  const iconAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const progressBarStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: progressScale.value }],
  }));

  const topOffset = insets.top + 8 + index * 78;

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
          {/* Accent bar on left edge */}
          <Animated.View
            style={[
              styles.accentBar,
              { backgroundColor: variantColor },
              accentBarStyle,
            ]}
          />

          {/* Double-ring icon */}
          <Animated.View style={[styles.iconOuter, { borderColor: variantColor + '40' }, iconAnimStyle]}>
            <View style={[styles.iconInner, { backgroundColor: variantColor + '20' }]}>
              <Ionicons
                name={VARIANT_ICONS[item.variant]}
                size={16}
                color={variantColor}
              />
            </View>
          </Animated.View>

          <View style={styles.textWrap}>
            <Text
              style={[
                styles.title,
                {
                  color: palette.textPrimary,
                  fontFamily: Typography.fonts.serif,
                  letterSpacing: Typography.letterSpacing.wide,
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

          {/* Circular close button */}
          <TouchableOpacity
            onPress={dismiss}
            hitSlop={12}
            style={[styles.closeBtn, { backgroundColor: palette.textTertiary + '15' }]}
          >
            <Ionicons name="close" size={14} color={palette.textTertiary} />
          </TouchableOpacity>

          {/* Progress bar at bottom */}
          <Animated.View
            style={[
              styles.progressBar,
              { backgroundColor: variantColor + '50' },
              progressBarStyle,
            ]}
          />
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
    paddingLeft: Spacing.lg + 6, // extra space for accent bar
    borderRadius: Radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    ...Shadows.floating,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 6,
    bottom: 6,
    width: 3,
    borderRadius: 2,
  },
  iconOuter: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  iconInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
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
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    transformOrigin: 'left',
  },
});
