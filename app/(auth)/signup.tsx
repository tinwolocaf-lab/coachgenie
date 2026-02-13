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
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInUp,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { GoldDustLoader } from '@/components/ui/GoldDustLoader';
import { isGuestModeEnabled, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';

// Wrapper component when auth is available
function AuthenticatedSignUp() {
  const auth = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const isLoading = auth.isLoading;
  const error = auth.error?.message || localError;
  const pendingVerification = auth.pendingEmailVerification || emailSent;

  const validateForm = (): boolean => {
    if (!email.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setLocalError('Please enter your email address');
      return false;
    }
    if (!password.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setLocalError('Please create a password');
      return false;
    }
    if (password.length < 8) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setLocalError('Password must be at least 8 characters');
      return false;
    }
    if (password !== confirmPassword) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setLocalError('Passwords do not match');
      return false;
    }
    setLocalError(null);
    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    try {
      const result = await auth.signUpWithEmail(email, password);
      if (result?.emailConfirmationRequired) {
        setEmailSent(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error('Sign up error:', err);
    }
  };

  const handleGoogleSignIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await auth.signInWithGoogle();
  };

  const handleAppleSignIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await auth.signInWithApple();
  };

  return (
    <SignUpUI
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      confirmPassword={confirmPassword}
      setConfirmPassword={setConfirmPassword}
      showPassword={showPassword}
      setShowPassword={setShowPassword}
      isLoading={isLoading}
      error={error}
      pendingVerification={pendingVerification}
      onSignUp={handleSignUp}
      onGoogleSignIn={handleGoogleSignIn}
      onAppleSignIn={handleAppleSignIn}
    />
  );
}

// Guest sign up
function GuestSignUp() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    if (!email.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setLocalError('Please enter your email address');
      return false;
    }
    if (!password.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setLocalError('Please create a password');
      return false;
    }
    if (password.length < 8) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setLocalError('Password must be at least 8 characters');
      return false;
    }
    if (password !== confirmPassword) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setLocalError('Passwords do not match');
      return false;
    }
    setLocalError(null);
    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/onboarding');
    }, 500);
  };

  const handleGoogleSignIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      router.replace('/onboarding');
    }, 500);
  };

  const handleAppleSignIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      router.replace('/onboarding');
    }, 500);
  };

  return (
    <SignUpUI
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      confirmPassword={confirmPassword}
      setConfirmPassword={setConfirmPassword}
      showPassword={showPassword}
      setShowPassword={setShowPassword}
      isLoading={isLoading}
      error={localError}
      pendingVerification={false}
      onSignUp={handleSignUp}
      onGoogleSignIn={handleGoogleSignIn}
      onAppleSignIn={handleAppleSignIn}
    />
  );
}

function AuthConfigurationError() {
  const { palette } = useThemeSafe();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      <View style={styles.authConfigErrorContainer}>
        <Text style={[styles.authConfigErrorTitle, { color: palette.textPrimary }]}>
          Sign-up Unavailable
        </Text>
        <Text style={[styles.authConfigErrorBody, { color: palette.textTertiary }]}>
          This build is missing required Supabase authentication configuration.
          Contact support or rebuild with EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY set.
        </Text>
      </View>
    </SafeAreaView>
  );
}

// Main export
export default function SignUpScreen() {
  if (isSupabaseConfigured) {
    return <AuthenticatedSignUp />;
  }
  if (isGuestModeEnabled) {
    return <GuestSignUp />;
  }
  return <AuthConfigurationError />;
}

// Shared UI component
interface SignUpUIProps {
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
  isLoading: boolean;
  error: string | null;
  pendingVerification: boolean;
  onSignUp: () => void;
  onGoogleSignIn: () => void;
  onAppleSignIn: () => void;
}

function SignUpUI({
  email,
  setEmail,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  showPassword,
  setShowPassword,
  isLoading,
  error,
  pendingVerification,
  onSignUp,
  onGoogleSignIn,
  onAppleSignIn,
}: SignUpUIProps) {
  const { palette } = useThemeSafe();

  // Show premium loading state
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
        <View style={[styles.loadingContainer, { backgroundColor: palette.background }]}>
          <GoldDustLoader
            message="Creating your account"
            subMessage="Setting up your personalized experience..."
            size="lg"
          />
        </View>
      </SafeAreaView>
    );
  }

  // Show verification pending screen
  if (pendingVerification) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
        <View style={styles.verificationContainer}>
          <Animated.View entering={FadeIn.duration(600)} style={styles.verificationContent}>
            <View style={styles.verificationIconContainer}>
              <LinearGradient
                colors={[palette.accent, palette.accentLight]}
                style={styles.verificationIconBg}
              >
                <Ionicons name="mail" size={40} color={palette.textInverse} />
              </LinearGradient>
            </View>
            <Text style={[styles.verificationTitle, { color: palette.textPrimary }]}>Verify Your Email</Text>
            <Text style={[styles.verificationText, { color: palette.textTertiary }]}>
              We&apos;ve sent a verification link to
            </Text>
            <Text style={[styles.verificationEmail, { color: palette.textSecondary }]}>{email}</Text>
            <View style={[styles.verificationInstructions, { backgroundColor: palette.cardBg }]}>
              <View style={styles.instructionItem}>
                <View style={[styles.instructionNumber, { backgroundColor: palette.accentMuted }]}>
                  <Text style={[styles.instructionNumberText, { color: palette.accent }]}>1</Text>
                </View>
                <Text style={[styles.instructionText, { color: palette.textSecondary }]}>Open your email inbox</Text>
              </View>
              <View style={styles.instructionItem}>
                <View style={[styles.instructionNumber, { backgroundColor: palette.accentMuted }]}>
                  <Text style={[styles.instructionNumberText, { color: palette.accent }]}>2</Text>
                </View>
                <Text style={[styles.instructionText, { color: palette.textSecondary }]}>Click the verification link</Text>
              </View>
              <View style={styles.instructionItem}>
                <View style={[styles.instructionNumber, { backgroundColor: palette.accentMuted }]}>
                  <Text style={[styles.instructionNumberText, { color: palette.accent }]}>3</Text>
                </View>
                <Text style={[styles.instructionText, { color: palette.textSecondary }]}>Return here to sign in</Text>
              </View>
            </View>
            <Text style={[styles.verificationNote, { color: palette.textTertiary }]}>
              Can&apos;t find it? Check your spam folder.
            </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity style={styles.backToLoginButton}>
                <Ionicons name="arrow-back" size={16} color={palette.accent} />
                <Text style={[styles.backToLoginText, { color: palette.accent }]}>Back to Sign In</Text>
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
              <Text style={[styles.title, { color: palette.textPrimary }]}>Begin Your Journey</Text>
              <Text style={[styles.subtitle, { color: palette.textTertiary }]}>
                Create an account to unlock personalized AI coaching
              </Text>
            </View>
          </Animated.View>

          {/* OAuth Buttons */}
          <Animated.View entering={FadeIn.duration(500).delay(100)} style={styles.oauthSection}>
            <TouchableOpacity
              style={[styles.oauthButton, { backgroundColor: palette.cardBg, borderColor: palette.border }]}
              onPress={onGoogleSignIn}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              <View style={[styles.oauthIconContainer, { backgroundColor: palette.backgroundSecondary }]}>
                <Ionicons name="logo-google" size={20} color={palette.textSecondary} />
              </View>
              <Text style={[styles.oauthButtonText, { color: palette.textSecondary }]}>Continue with Google</Text>
              <View style={[styles.oauthArrow, { backgroundColor: palette.backgroundSecondary }]}>
                <Ionicons name="arrow-forward" size={16} color={palette.textTertiary} />
              </View>
            </TouchableOpacity>

            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={[styles.oauthButton, { backgroundColor: palette.cardBg, borderColor: palette.border }]}
                onPress={onAppleSignIn}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                <View style={[styles.oauthIconContainer, { backgroundColor: palette.backgroundSecondary }]}>
                  <Ionicons name="logo-apple" size={20} color={palette.textSecondary} />
                </View>
                <Text style={[styles.oauthButtonText, { color: palette.textSecondary }]}>Continue with Apple</Text>
                <View style={[styles.oauthArrow, { backgroundColor: palette.backgroundSecondary }]}>
                  <Ionicons name="arrow-forward" size={16} color={palette.textTertiary} />
                </View>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Divider */}
          <Animated.View entering={FadeIn.duration(400).delay(200)} style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: palette.border }]} />
            <Text style={[styles.dividerText, { color: palette.textTertiary }]}>or sign up with email</Text>
            <View style={[styles.dividerLine, { backgroundColor: palette.border }]} />
          </Animated.View>

          {/* Email Form */}
          <Animated.View entering={FadeInDown.duration(500).delay(300)} style={styles.form}>
            <View style={styles.inputWrapper}>
              <Text style={[styles.inputLabel, { color: palette.textSecondary }]}>Email</Text>
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

            <View style={styles.inputWrapper}>
              <Text style={[styles.inputLabel, { color: palette.textSecondary }]}>Password</Text>
              <View style={[styles.inputContainer, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
                <Ionicons name="lock-closed-outline" size={18} color={palette.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: palette.textSecondary }]}
                  placeholder="Create a password"
                  placeholderTextColor={palette.textTertiary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                  editable={!isLoading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.passwordToggle}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={palette.textTertiary}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={[styles.inputLabel, { color: palette.textSecondary }]}>Confirm Password</Text>
              <View style={[styles.inputContainer, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color={palette.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: palette.textSecondary }]}
                  placeholder="Confirm your password"
                  placeholderTextColor={palette.textTertiary}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                  editable={!isLoading}
                />
              </View>
            </View>

            <View style={styles.passwordHintContainer}>
              <Ionicons name="information-circle-outline" size={14} color={palette.textTertiary} />
              <Text style={[styles.passwordHint, { color: palette.textTertiary }]}>
                Password must be at least 8 characters
              </Text>
            </View>

            {error && (
              <Animated.View entering={FadeIn.duration(300)} style={[styles.errorContainer, { backgroundColor: palette.errorLight }]}>
                <Ionicons name="alert-circle" size={16} color={palette.error} />
                <Text style={[styles.errorText, { color: palette.error }]}>{error}</Text>
              </Animated.View>
            )}

            <Button
              title="Create Account"
              onPress={onSignUp}
              loading={isLoading}
              disabled={isLoading}
              fullWidth
              variant="gold"
              size="lg"
              style={styles.signUpButton}
            />
          </Animated.View>

          {/* Sign In Link */}
          <Animated.View entering={FadeIn.duration(400).delay(400)} style={styles.signInContainer}>
            <Text style={[styles.signInText, { color: palette.textTertiary }]}>Already have an account?</Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity style={styles.signInButton}>
                <Text style={[styles.signInLink, { color: palette.accent }]}>Sign In</Text>
                <Ionicons name="arrow-forward" size={14} color={palette.accent} />
              </TouchableOpacity>
            </Link>
          </Animated.View>

          {/* Terms */}
          <Animated.View entering={FadeIn.duration(400).delay(500)} style={styles.termsContainer}>
            <Text style={[styles.termsText, { color: palette.textTertiary }]}>
              By creating an account, you agree to our{' '}
              <Text style={{ color: palette.accent, fontWeight: Typography.weights.medium }}>Terms of Service</Text> and{' '}
              <Text style={{ color: palette.accent, fontWeight: Typography.weights.medium }}>Privacy Policy</Text>
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
  authConfigErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.md,
  },
  authConfigErrorTitle: {
    fontSize: Typography.sizes.headline,
    fontFamily: Typography.fonts.serif,
    fontWeight: Typography.weights.semibold,
    textAlign: 'center',
  },
  authConfigErrorBody: {
    fontSize: Typography.sizes.body,
    textAlign: 'center',
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },

  // Header
  header: {
    marginBottom: Spacing.xxl,
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
    gap: Spacing.xs,
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

  // OAuth
  oauthSection: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  oauthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    ...Shadows.subtle,
  },
  oauthIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  oauthButtonText: {
    flex: 1,
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.medium,
    marginLeft: Spacing.md,
  },
  oauthArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: Typography.sizes.caption,
    marginHorizontal: Spacing.lg,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wider,
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
  passwordToggle: {
    padding: Spacing.sm,
  },
  passwordHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  passwordHint: {
    fontSize: Typography.sizes.caption,
    fontStyle: 'italic',
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
  signUpButton: {
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

  // Terms
  termsContainer: {
    paddingHorizontal: Spacing.lg,
  },
  termsText: {
    fontSize: Typography.sizes.caption,
    textAlign: 'center',
    lineHeight: 18,
  },

  // Verification screen
  verificationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  verificationContent: {
    alignItems: 'center',
    width: '100%',
  },
  verificationIconContainer: {
    marginBottom: Spacing.xl,
  },
  verificationIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.gold,
  },
  verificationTitle: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    marginBottom: Spacing.md,
  },
  verificationText: {
    fontSize: Typography.sizes.body,
    textAlign: 'center',
  },
  verificationEmail: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  verificationInstructions: {
    width: '100%',
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    gap: Spacing.lg,
    ...Shadows.subtle,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  instructionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionNumberText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
  },
  instructionText: {
    fontSize: Typography.sizes.body,
    flex: 1,
  },
  verificationNote: {
    fontSize: Typography.sizes.caption,
    fontStyle: 'italic',
    marginBottom: Spacing.xxl,
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
