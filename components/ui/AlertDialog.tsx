import React, { useCallback } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { Typography, Radius, Spacing, Shadows, Timing } from '@/constants/theme';
import type { AlertItem, AlertButton } from '@/contexts/AlertContext';

interface AlertDialogProps {
  item: AlertItem;
  onDismiss: () => void;
}

function AnimatedButton({
  button,
  palette,
  useHorizontal,
  isFirst,
  onPress,
}: {
  button: AlertButton;
  palette: any;
  useHorizontal: boolean;
  isFirst: boolean;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 200 });
  };

  const isCancel = button.style === 'cancel';
  const isDestructive = button.style === 'destructive';

  const textColor = isCancel
    ? palette.textSecondary
    : '#FFFFFF';

  return (
    <Animated.View
      style={[
        animatedStyle,
        useHorizontal && styles.buttonFlex,
        useHorizontal && !isFirst && { marginLeft: Spacing.sm },
        !useHorizontal && !isFirst && { marginTop: Spacing.sm },
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {isCancel ? (
          <View
            style={[
              styles.button,
              {
                backgroundColor: palette.accent + '10',
                borderColor: palette.accent + '30',
                borderWidth: 1.5,
              },
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
          </View>
        ) : (
          <LinearGradient
            colors={
              isDestructive
                ? [palette.error, palette.error + 'CC']
                : [palette.accent, palette.accent + 'DD']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.button}
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
          </LinearGradient>
        )}
      </Pressable>
    </Animated.View>
  );
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
          .damping(25)
          .stiffness(80)
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
          {/* Header icon */}
          <Animated.View
            entering={ZoomIn.springify().damping(12).stiffness(150).delay(100)}
            style={[styles.headerIcon, { backgroundColor: palette.accent + '15' }]}
          >
            <Ionicons name="information-circle" size={28} color={palette.accent} />
          </Animated.View>

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

          {/* Gold divider */}
          <LinearGradient
            colors={['transparent', palette.accent + '50', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.divider}
          />

          <View
            style={[
              styles.buttonContainer,
              useHorizontal ? styles.buttonRow : styles.buttonColumn,
            ]}
          >
            {item.buttons.map((button, i) => (
              <AnimatedButton
                key={i}
                button={button}
                palette={palette}
                useHorizontal={useHorizontal}
                isFirst={i === 0}
                onPress={() => handleButton(button)}
              />
            ))}
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
    padding: Spacing.xxxl,
    overflow: 'hidden',
    ...Shadows.floating,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.lg,
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
    marginBottom: Spacing.lg,
  },
  divider: {
    height: 1,
    marginBottom: Spacing.xl,
  },
  buttonContainer: {
    marginTop: Spacing.xs,
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
