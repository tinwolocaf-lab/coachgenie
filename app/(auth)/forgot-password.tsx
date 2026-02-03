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
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { isSupabaseConfigured } from '@/lib/supabase';

// Dynamic import for auth
const getAuthHook = () => {
  if (isSupabaseConfigured) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require('@fastshot/auth').useAuth;
    } catch {
      return null;
    }
  }
  return null;
};

// Wrapper component when auth is available
function AuthenticatedForgotPassword() {
  const useAuth = getAuthHook();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const auth = useAuth ? useAuth() : null;

  const [email, setEmail] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const isLoading = auth?.isLoading || false;
  const error = auth?.error?.message || localError;
  const pendingReset = auth?.pendingPasswordReset || resetSent;

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setLocalError('Please enter your email');
      return;
    }

    setLocalError(null);

    try {
      await auth?.resetPassword(email);
      setResetSent(true);
    } catch (err) {
      console.error('Reset password error:', err);
    }
  };

  return (
    <ForgotPasswordUI
      email={email}
      setEmail={setEmail}
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

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setLocalError('Please enter your email');
      return;
    }

    setLocalError(null);
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setResetSent(true);
    }, 500);
  };

  return (
    <ForgotPasswordUI
      email={email}
      setEmail={setEmail}
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
  // Show reset sent screen
  if (pendingReset) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.successContainer}>
          <Animated.View entering={FadeIn.duration(400)} style={styles.successContent}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={48} color={Colors.success} />
            </View>
            <Text style={styles.successTitle}>Check Your Email</Text>
            <Text style={styles.successText}>
              We sent password reset instructions to{'\n'}
              <Text style={styles.successEmail}>{email}</Text>
            </Text>
            <Text style={styles.successSubtext}>
              Follow the link in the email to reset your password. If you don&apos;t see the email, check your spam folder.
            </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity style={styles.backToLoginButton}>
                <Text style={styles.backToLoginText}>Back to Sign In</Text>
              </TouchableOpacity>
            </Link>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
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
          <Animated.View entering={FadeInUp.duration(400)} style={styles.header}>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color={Colors.slateCharcoal} />
              </TouchableOpacity>
            </Link>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter your email address and we&apos;ll send you instructions to reset your password.
            </Text>
          </Animated.View>

          {/* Form */}
          <Animated.View entering={FadeIn.duration(400).delay(200)} style={styles.form}>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={Colors.slateLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={Colors.slateLight}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                editable={!isLoading}
              />
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color={Colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Button
              title="Send Reset Link"
              onPress={onResetPassword}
              loading={isLoading}
              disabled={isLoading}
              fullWidth
              style={styles.resetButton}
            />
          </Animated.View>

          {/* Back to Sign In */}
          <Animated.View entering={FadeIn.duration(400).delay(300)} style={styles.signInContainer}>
            <Text style={styles.signInText}>Remember your password?</Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity>
                <Text style={styles.signInLink}>Sign In</Text>
              </TouchableOpacity>
            </Link>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.offWhite,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  header: {
    marginBottom: Spacing.xxxl,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    ...Shadows.sm,
  },
  title: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.bold,
    color: Colors.slateCharcoal,
    marginBottom: Spacing.md,
  },
  subtitle: {
    fontSize: Typography.sizes.body,
    color: Colors.slateGray,
    lineHeight: 22,
  },
  form: {
    marginBottom: Spacing.xl,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  inputIcon: {
    marginRight: Spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.lg,
    fontSize: Typography.sizes.bodyLarge,
    color: Colors.slateCharcoal,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorLight,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontSize: Typography.sizes.body,
    color: Colors.error,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  resetButton: {
    marginTop: Spacing.sm,
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  signInText: {
    fontSize: Typography.sizes.body,
    color: Colors.slateGray,
  },
  signInLink: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    color: Colors.electricIndigo,
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
  },
  successIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.successLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  successTitle: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.bold,
    color: Colors.slateCharcoal,
    marginBottom: Spacing.md,
  },
  successText: {
    fontSize: Typography.sizes.bodyLarge,
    color: Colors.slateGray,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  successEmail: {
    fontWeight: Typography.weights.semibold,
    color: Colors.slateCharcoal,
  },
  successSubtext: {
    fontSize: Typography.sizes.body,
    color: Colors.slateLight,
    textAlign: 'center',
    marginBottom: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    lineHeight: 22,
  },
  backToLoginButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  backToLoginText: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    color: Colors.electricIndigo,
  },
});
