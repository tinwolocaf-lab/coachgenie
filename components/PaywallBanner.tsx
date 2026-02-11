import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';

interface PaywallBannerProps {
  onDismiss?: () => void;
}

export function PaywallBanner({ onDismiss }: PaywallBannerProps) {
  const router = useRouter();
  const { palette } = useThemeSafe();

  const handleUpgrade = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/paywall');
  };

  return (
    <Animated.View entering={FadeInUp.duration(500)}>
      <TouchableOpacity
        style={[styles.container, { shadowColor: palette.shadowColor }]}
        onPress={handleUpgrade}
        activeOpacity={0.95}
      >
        <LinearGradient
          colors={[palette.gradientStart, palette.gradientEnd]}
          style={styles.gradient}
        >
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons name="diamond" size={24} color={palette.accent} />
            </View>
            <View style={styles.textContainer}>
              <Text style={[styles.title, { color: palette.textInverse }]}>
                Unlock Full Access
              </Text>
              <Text style={[styles.subtitle, { color: `${palette.textInverse}BB` }]}>
                All coaches, unlimited sessions, integrations
              </Text>
            </View>
            <View style={styles.arrowContainer}>
              <Ionicons name="arrow-forward" size={18} color={palette.accent} />
            </View>
          </View>

          {onDismiss && (
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onDismiss();
              }}
              style={styles.dismissButton}
            >
              <Ionicons name="close" size={16} color={`${palette.textInverse}88`} />
            </TouchableOpacity>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.squircle,
    overflow: 'hidden',
    ...Shadows.floating,
  },
  gradient: {
    padding: Spacing.xl,
    position: 'relative',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: Typography.sizes.bodyLarge,
    fontFamily: Typography.fonts.serif,
    fontWeight: Typography.weights.semibold,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: Typography.sizes.caption,
  },
  arrowContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissButton: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    padding: Spacing.xs,
  },
});
