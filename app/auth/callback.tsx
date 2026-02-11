// Web OAuth callback page - handles OAuth redirects and token exchange
import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Typography, Spacing, Radius } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { GoldDustLoader } from '@/components/ui/GoldDustLoader';
import { Button } from '@/components/ui/Button';
import { isSupabaseConfigured } from '@/lib/supabase';

// Custom loading component with premium styling
function PremiumLoadingState({ message }: { message: string }) {
  const { palette } = useThemeSafe();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      <View style={styles.loadingContent}>
        <GoldDustLoader
          message={message}
          subMessage="Please wait while we complete the process..."
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}

// Premium error state component
function PremiumErrorState({
  error,
  errorType,
  onRetry,
  onBackToLogin,
}: {
  error: string;
  errorType?: string;
  onRetry: () => void;
  onBackToLogin: () => void;
}) {
  const { palette } = useThemeSafe();

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, []);

  // Get user-friendly error message and guidance
  const getErrorContent = () => {
    const lowerError = error.toLowerCase();

    if (lowerError.includes('expired') || lowerError.includes('ticket')) {
      return {
        title: 'Session Expired',
        message: 'Your authentication session has timed out. This can happen if you wait too long before completing sign-in.',
        suggestion: 'Please try signing in again. The process should only take a moment.',
        icon: 'time-outline' as const,
      };
    }

    if (lowerError.includes('cancelled') || lowerError.includes('dismissed') || errorType === 'BROWSER_DISMISSED') {
      return {
        title: 'Sign-In Cancelled',
        message: 'It looks like the sign-in process was interrupted.',
        suggestion: 'When you\'re ready, tap below to try again.',
        icon: 'close-circle-outline' as const,
      };
    }

    if (lowerError.includes('network') || lowerError.includes('connection')) {
      return {
        title: 'Connection Issue',
        message: 'We couldn\'t establish a secure connection to complete your sign-in.',
        suggestion: 'Please check your internet connection and try again.',
        icon: 'cloud-offline-outline' as const,
      };
    }

    if (lowerError.includes('403') || lowerError.includes('access denied')) {
      return {
        title: 'Access Restricted',
        message: 'There was an issue with the authentication service configuration.',
        suggestion: 'Please try a different sign-in method or contact support if the issue persists.',
        icon: 'lock-closed-outline' as const,
      };
    }

    // Default error
    return {
      title: 'Something Went Wrong',
      message: error || 'An unexpected error occurred during sign-in.',
      suggestion: 'Please try again. If the problem continues, try a different sign-in method.',
      icon: 'alert-circle-outline' as const,
    };
  };

  const content = getErrorContent();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      <View style={styles.errorContent}>
        {/* Error Icon */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.errorIconSection}>
          <View style={styles.errorIconContainer}>
            <LinearGradient
              colors={[palette.error, '#B05858']}
              style={[styles.errorIconGradient, { shadowColor: palette.error }]}
            >
              <Ionicons name={content.icon} size={40} color={palette.textInverse} />
            </LinearGradient>
          </View>
        </Animated.View>

        {/* Error Text */}
        <Animated.View entering={FadeInUp.duration(500).delay(100)} style={styles.errorTextSection}>
          <Text style={[styles.errorTitle, { color: palette.textPrimary }]}>{content.title}</Text>
          <Text style={[styles.errorMessage, { color: palette.textTertiary }]}>{content.message}</Text>
        </Animated.View>

        {/* Suggestion Card */}
        <Animated.View entering={FadeInUp.duration(500).delay(200)} style={[styles.suggestionCard, { backgroundColor: palette.accentMuted, borderColor: palette.borderAccent }]}>
          <View style={[styles.suggestionIconContainer, { backgroundColor: palette.cardBg }]}>
            <Ionicons name="bulb-outline" size={18} color={palette.accent} />
          </View>
          <Text style={[styles.suggestionText, { color: palette.textSecondary }]}>{content.suggestion}</Text>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View entering={FadeInUp.duration(500).delay(300)} style={styles.errorActions}>
          <Button
            title="Try Again"
            onPress={onRetry}
            fullWidth
            variant="gold"
            size="lg"
            icon={<Ionicons name="refresh" size={18} color={palette.textInverse} />}
            style={styles.retryButton}
          />
          <Button
            title="Back to Sign In"
            onPress={onBackToLogin}
            fullWidth
            variant="secondary"
            size="lg"
            style={styles.backButton}
          />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

export default function Callback() {
  const router = useRouter();
  const [error, setError] = useState<{ message: string; type?: string } | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = () => {
    setIsRetrying(true);
    setError(null);
    // Navigate back to login to retry
    setTimeout(() => {
      router.replace('/(auth)/login');
    }, 300);
  };

  const handleBackToLogin = () => {
    router.replace('/(auth)/login');
  };

  // If Supabase is not configured, just redirect
  if (!isSupabaseConfigured) {
    router.replace('/(tabs)');
    return <PremiumLoadingState message="Redirecting" />;
  }

  // Show error state if there's an error
  if (error) {
    return (
      <PremiumErrorState
        error={error.message}
        errorType={error.type}
        onRetry={handleRetry}
        onBackToLogin={handleBackToLogin}
      />
    );
  }

  // Show retrying state
  if (isRetrying) {
    return <PremiumLoadingState message="Preparing sign-in" />;
  }

  // The deep link handler in _layout.tsx already handles token parsing from URL
  // This page just shows a loading state while that process completes
  return <PremiumLoadingState message="Completing sign in" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Loading State
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },

  // Error State
  errorContent: {
    flex: 1,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.xxxl * 2,
  },
  errorIconSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  errorIconContainer: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorIconGradient: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  errorTextSection: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  errorTitle: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  errorMessage: {
    fontSize: Typography.sizes.body,
    textAlign: 'center',
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
    paddingHorizontal: Spacing.lg,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xxl,
    borderWidth: 1,
  },
  suggestionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  suggestionText: {
    flex: 1,
    fontSize: Typography.sizes.body,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },
  errorActions: {
    gap: Spacing.md,
  },
  retryButton: {
    marginBottom: 0,
  },
  backButton: {
    marginBottom: 0,
  },
});
