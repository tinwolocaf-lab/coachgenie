import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInUp, FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { GoldDustLoader } from '@/components/ui/GoldDustLoader';
import { isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

// Wrapper component when auth is available
function AuthenticatedForgotPassword() {
  const auth = useAuth();

  const [email, setEmail] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const isLoading = auth.isLoading;
  const error = localError;
  const pendingReset = resetSent;

  const getErrorMessage = (err: unknown): string => {
    if (!err) return 'Unable to send reset link. Please try again.';
    if (typeof err === 'string') return err;
    if (typeof err === 'object') {
      const message = (err as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) return message;
    }
    return 'Unable to send reset link. Please try again.';
  };

  const handleEmailChange = (value: string) => {
    if (localError) setLocalError(null);
    setEmail(value);
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setLocalError('Please enter your email address');
      return;
    }

    setLocalError(null);

    try {
      await auth.resetPassword(email);
      setResetSent(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      setLocalError(getErrorMessage(err));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (__DEV__) {
        console.warn('Reset password request failed:', err);
      }
    }
  };

  return (
    <ForgotPasswordUI
      email={email}
      setEmail={handleEmailChange}
      isLoading={isLoading}
      error={error}
      pendingReset={pendingReset}
      onResetPassword={handleResetPassword}
    />
  );
}

// Guest forgot password
function GuestForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const handleEmailChange = (value: string) => {
    if (localError) setLocalError(null);
    setEmail(value);
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setLocalError('Please enter your email address');
      return;
    }

    setLocalError(null);
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setResetSent(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 500);
  };

  return (
    <ForgotPasswordUI
      email={email}
      setEmail={handleEmailChange}
      isLoading={isLoading}
      error={localError}
      pendingReset={resetSent}
      onResetPassword={handleResetPassword}
    />
  );
}

// Main export
export default function ForgotPasswordScreen() {
  if (isSupabaseConfigured) {
    return <AuthenticatedForgotPassword />;
  }
  return <GuestForgotPassword />;
}

// Shared UI component
interface ForgotPasswordUIProps {
  email: string;
  setEmail: (value: string) => void;
  isLoading: boolean;
  error: string | null;
  pendingReset: boolean;
  onResetPassword: () => void;
}

function ForgotPasswordUI({
  email,
  setEmail,
  isLoading,
  error,
  pendingReset,
  onResetPassword,
}: ForgotPasswordUIProps) {
  const { palette } = useThemeSafe();

  // Show premium loading state
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
        <View style={[styles.loadingContainer, { backgroundColor: palette.background }]}>
          <GoldDustLoader
            message="Sending reset link"
            subMessage="Preparing your recovery email..."
            size="lg"
          />
        </View>
      </SafeAreaView>
    );
  }

  // Show reset sent screen
  if (pendingReset) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
        <View style={styles.successContainer}>
          <Animated.View entering={FadeIn.duration(600)} style={styles.successContent}>
            <View style={styles.successIconContainer}>
              <LinearGradient
                colors={[palette.success, '#4A9B70']}
                style={styles.successIconBg}
              >
                <Ionicons name="checkmark" size={48} color={palette.textInverse} />
              </LinearGradient>
            </View>
            <Text style={[styles.successTitle, { color: palette.textPrimary }]}>Check Your Inbox</Text>
            <Text style={[styles.successText, { color: palette.textTertiary }]}>
              We&apos;ve sent password reset instructions to
            </Text>
            <Text style={[styles.successEmail, { color: palette.textSecondary }]}>{email}</Text>
            <View style={[styles.successInstructions, { backgroundColor: palette.cardBg }]}>
              <View style={styles.instructionItem}>
                <Ionicons name="time-outline" size={20} color={palette.accent} />
                <Text style={[styles.instructionText, { color: palette.textSecondary }]}>
                  The link expires in 24 hours
                </Text>
              </View>
              <View style={styles.instructionItem}>
                <Ionicons name="folder-outline" size={20} color={palette.accent} />
                <Text style={[styles.instructionText, { color: palette.textSecondary }]}>
                  Check your spam folder if you don&apos;t see it
                </Text>
              </View>
            </View>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity style={styles.backToLoginButton}>
                <Ionicons name="arrow-back" size={16} color={palette.accent} />
                <Text style={[styles.backToLoginText, { color: palette.accent }]}>Return to Sign In</Text>
              </TouchableOpacity>
            </Link>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <Animated.View entering={FadeInUp.duration(500)} style={styles.header}>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity style={[styles.backButton, { backgroundColor: palette.cardBg }]}>
                <Ionicons name="arrow-back" size={22} color={palette.textSecondary} />
              </TouchableOpacity>
            </Link>
            <View style={styles.headerTextContainer}>
              <View style={styles.headerIconContainer}>
                <View style={[styles.headerIconBg, { backgroundColor: palette.accentMuted }]}>
                  <Ionicons name="key-outline" size={28} color={palette.accent} />
                </View>
              </View>
              <Text style={[styles.title, { color: palette.textPrimary }]}>Reset Password</Text>
              <Text style={[styles.subtitle, { color: palette.textTertiary }]}>
                Enter the email address associated with your account, and we&apos;ll send you a link to reset your password.
              </Text>
            </View>
          </Animated.View>

          {/* Form */}
          <Animated.View entering={FadeInDown.duration(500).delay(200)} style={styles.form}>
            <View style={styles.inputWrapper}>
              <Text style={[styles.inputLabel, { color: palette.textSecondary }]}>Email Address</Text>
              <View style={[styles.inputContainer, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
                <Ionicons name="mail-outline" size={18} color={palette.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: palette.textSecondary }]}
                  placeholder="your@email.com"
                  placeholderTextColor={palette.textTertiary}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  editable={!isLoading}
                />
              </View>
            </View>

            {error && (
              <Animated.View entering={FadeIn.duration(300)} style={[styles.errorContainer, { backgroundColor: palette.errorLight }]}>
                <Ionicons name="alert-circle" size={16} color={palette.error} />
                <Text style={[styles.errorText, { color: palette.error }]}>{error}</Text>
              </Animated.View>
            )}

            <Button
              title="Send Reset Link"
              onPress={onResetPassword}
              loading={isLoading}
              disabled={isLoading}
              fullWidth
              variant="gold"
              size="lg"
              style={styles.resetButton}
            />
          </Animated.View>

          {/* Back to Sign In */}
          <Animated.View entering={FadeIn.duration(400).delay(300)} style={styles.signInContainer}>
            <Text style={[styles.signInText, { color: palette.textTertiary }]}>Remember your password?</Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity style={styles.signInButton}>
                <Text style={[styles.signInLink, { color: palette.accent }]}>Sign In</Text>
                <Ionicons name="arrow-forward" size={14} color={palette.accent} />
              </TouchableOpacity>
            </Link>
          </Animated.View>

          {/* Security Note */}
          <Animated.View entering={FadeIn.duration(400).delay(400)} style={[styles.securityNote, { backgroundColor: palette.backgroundSecondary }]}>
            <Ionicons name="shield-checkmark-outline" size={16} color={palette.textTertiary} />
            <Text style={[styles.securityText, { color: palette.textTertiary }]}>
              Your security is our priority. We&apos;ll never share your email or send you spam.
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    marginBottom: Spacing.xxxl,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    ...Shadows.subtle,
  },
  headerTextContainer: {
    gap: Spacing.md,
  },
  headerIconContainer: {
    marginBottom: Spacing.md,
  },
  headerIconBg: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
  },
  subtitle: {
    fontSize: Typography.sizes.body,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },

  // Form
  form: {
    marginBottom: Spacing.xl,
  },
  inputWrapper: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wider,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
  },
  inputIcon: {
    marginRight: Spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.lg,
    fontSize: Typography.sizes.bodyLarge,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  errorText: {
    fontSize: Typography.sizes.body,
    flex: 1,
  },
  resetButton: {
    marginTop: Spacing.sm,
  },

  // Sign In
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  signInText: {
    fontSize: Typography.sizes.body,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  signInLink: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
  },

  // Security Note
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.lg,
  },
  securityText: {
    flex: 1,
    fontSize: Typography.sizes.caption,
    lineHeight: Typography.sizes.caption * Typography.lineHeights.relaxed,
  },

  // Success screen
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  successContent: {
    alignItems: 'center',
    width: '100%',
  },
  successIconContainer: {
    marginBottom: Spacing.xl,
  },
  successIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  successTitle: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    marginBottom: Spacing.md,
  },
  successText: {
    fontSize: Typography.sizes.body,
    textAlign: 'center',
  },
  successEmail: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  successInstructions: {
    width: '100%',
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.xxl,
    gap: Spacing.lg,
    ...Shadows.subtle,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  instructionText: {
    fontSize: Typography.sizes.body,
    flex: 1,
  },
  backToLoginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  backToLoginText: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
  },
});
