import React, { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { Typography, Radius, Spacing, Shadows, Timing, PremiumButton } from '@/constants/theme';
import type { AlertItem, AlertButton } from '@/contexts/AlertContext';

interface AlertDialogProps {
  item: AlertItem;
  onDismiss: () => void;
}

export function AlertDialog({ item, onDismiss }: AlertDialogProps) {
  const { palette } = useThemeSafe();

  const handleButton = useCallback((button: AlertButton) => {
    Haptics.impactAsync(
      button.style === 'destructive'
        ? Haptics.ImpactFeedbackStyle.Heavy
        : Haptics.ImpactFeedbackStyle.Light
    );
    onDismiss();
    button.onPress?.();
  }, [onDismiss]);

  const useHorizontal = item.buttons.length <= 2;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      style={[styles.overlay, { backgroundColor: palette.overlay }]}
    >
      <Animated.View
        entering={ZoomIn.springify()
          .damping(Timing.springElegant.damping)
          .stiffness(Timing.springElegant.stiffness)
          .mass(Timing.springElegant.mass)}
      >
        <BlurView
          intensity={90}
          tint={palette.statusBarStyle === 'light' ? 'dark' : 'light'}
          style={[
            styles.card,
            {
              backgroundColor: palette.glassBg,
              borderColor: palette.glassBorder,
            },
          ]}
        >
          <Text
            style={[
              styles.title,
              {
                color: palette.textPrimary,
                fontFamily: Typography.fonts.serif,
              },
            ]}
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
            >
              {item.message}
            </Text>
          ) : null}

          <View
            style={[
              styles.buttonContainer,
              useHorizontal ? styles.buttonRow : styles.buttonColumn,
            ]}
          >
            {item.buttons.map((button, i) => {
              const isCancel = button.style === 'cancel';
              const isDestructive = button.style === 'destructive';

              const bgColor = isCancel
                ? 'transparent'
                : isDestructive
                  ? palette.error
                  : palette.accent;

              const textColor = isCancel
                ? palette.textSecondary
                : isDestructive
                  ? '#FFFFFF'
                  : palette.textInverse;

              const borderColor = isCancel ? palette.border : 'transparent';

              return (
                <TouchableOpacity
                  key={i}
                  onPress={() => handleButton(button)}
                  activeOpacity={0.7}
                  style={[
                    styles.button,
                    {
                      backgroundColor: bgColor,
                      borderColor,
                      borderWidth: isCancel ? 1.5 : 0,
                    },
                    useHorizontal && styles.buttonFlex,
                    useHorizontal && i > 0 && { marginLeft: Spacing.sm },
                    !useHorizontal && i > 0 && { marginTop: Spacing.sm },
                  ]}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      {
                        color: textColor,
                        fontFamily: Typography.fonts.sansSemibold,
                      },
                    ]}
                  >
                    {button.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </BlurView>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9998,
    paddingHorizontal: Spacing.xxl,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: Radius.squircle,
    borderWidth: 1,
    padding: Spacing.xxl,
    overflow: 'hidden',
    ...Shadows.floating,
  },
  title: {
    fontSize: Typography.sizes.title,
    lineHeight: Typography.sizes.title * Typography.lineHeights.snug,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: Typography.sizes.body,
    lineHeight: Typography.sizes.body * Typography.lineHeights.normal,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  buttonContainer: {
    marginTop: Spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
  },
  buttonColumn: {
    flexDirection: 'column',
  },
  button: {
    paddingVertical: Spacing.md + 2,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonFlex: {
    flex: 1,
  },
  buttonText: {
    fontSize: Typography.sizes.body,
  },
});
