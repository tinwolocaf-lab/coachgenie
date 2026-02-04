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
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { GoldDustLoader } from '@/components/ui/GoldDustLoader';
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
function AuthenticatedSignUp() {
  const useAuth = getAuthHook();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const auth = useAuth ? useAuth() : null;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  const isLoading = auth?.isLoading || false;
  const error = auth?.error?.message || localError;
  const pendingVerification = auth?.pendingEmailVerification || emailSent;

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
      const result = await auth?.signUpWithEmail(email, password);
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
    await auth?.signInWithGoogle();
  };

  const handleAppleSignIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await auth?.signInWithApple();
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

// Main export
export default function SignUpScreen() {
  if (isSupabaseConfigured) {
    return <AuthenticatedSignUp />;
  }
  return <GuestSignUp />;
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
  // Show premium loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
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
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.verificationContainer}>
          <Animated.View entering={FadeIn.duration(600)} style={styles.verificationContent}>
            <View style={styles.verificationIconContainer}>
              <LinearGradient
                colors={[Colors.burnishedGold, Colors.goldLight]}
                style={styles.verificationIconBg}
              >
                <Ionicons name="mail" size={40} color={Colors.white} />
              </LinearGradient>
            </View>
            <Text style={styles.verificationTitle}>Verify Your Email</Text>
            <Text style={styles.verificationText}>
              We&apos;ve sent a verification link to
            </Text>
            <Text style={styles.verificationEmail}>{email}</Text>
            <View style={styles.verificationInstructions}>
              <View style={styles.instructionItem}>
                <View style={styles.instructionNumber}>
                  <Text style={styles.instructionNumberText}>1</Text>
                </View>
                <Text style={styles.instructionText}>Open your email inbox</Text>
              </View>
              <View style={styles.instructionItem}>
                <View style={styles.instructionNumber}>
                  <Text style={styles.instructionNumberText}>2</Text>
                </View>
                <Text style={styles.instructionText}>Click the verification link</Text>
              </View>
              <View style={styles.instructionItem}>
                <View style={styles.instructionNumber}>
                  <Text style={styles.instructionNumberText}>3</Text>
                </View>
                <Text style={styles.instructionText}>Return here to sign in</Text>
              </View>
            </View>
            <Text style={styles.verificationNote}>
              Can&apos;t find it? Check your spam folder.
            </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity style={styles.backToLoginButton}>
                <Ionicons name="arrow-back" size={16} color={Colors.burnishedGold} />
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
          <Animated.View entering={FadeInUp.duration(500)} style={styles.header}>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity style={styles.backButton}>
                <Ionicons name="arrow-back" size={22} color={Colors.charcoal} />
              </TouchableOpacity>
            </Link>
            <View style={styles.headerTextContainer}>
              <Text style={styles.title}>Begin Your Journey</Text>
              <Text style={styles.subtitle}>
                Create an account to unlock personalized AI coaching
              </Text>
            </View>
          </Animated.View>

          {/* OAuth Buttons */}
          <Animated.View entering={FadeIn.duration(500).delay(100)} style={styles.oauthSection}>
            <TouchableOpacity
              style={styles.oauthButton}
              onPress={onGoogleSignIn}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              <View style={styles.oauthIconContainer}>
                <Ionicons name="logo-google" size={20} color={Colors.charcoal} />
              </View>
              <Text style={styles.oauthButtonText}>Continue with Google</Text>
              <View style={styles.oauthArrow}>
                <Ionicons name="arrow-forward" size={16} color={Colors.stoneGray} />
              </View>
            </TouchableOpacity>

            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.oauthButton}
                onPress={onAppleSignIn}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                <View style={styles.oauthIconContainer}>
                  <Ionicons name="logo-apple" size={20} color={Colors.charcoal} />
                </View>
                <Text style={styles.oauthButtonText}>Continue with Apple</Text>
                <View style={styles.oauthArrow}>
                  <Ionicons name="arrow-forward" size={16} color={Colors.stoneGray} />
                </View>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Divider */}
          <Animated.View entering={FadeIn.duration(400).delay(200)} style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or sign up with email</Text>
            <View style={styles.dividerLine} />
          </Animated.View>

          {/* Email Form */}
          <Animated.View entering={FadeInDown.duration(500).delay(300)} style={styles.form}>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={18} color={Colors.stoneGray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor={Colors.stoneGray}
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
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={18} color={Colors.stoneGray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Create a password"
                  placeholderTextColor={Colors.stoneGray}
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
                    color={Colors.stoneGray}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="shield-checkmark-outline" size={18} color={Colors.stoneGray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm your password"
                  placeholderTextColor={Colors.stoneGray}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                  editable={!isLoading}
                />
              </View>
            </View>

            <View style={styles.passwordHintContainer}>
              <Ionicons name="information-circle-outline" size={14} color={Colors.stoneGray} />
              <Text style={styles.passwordHint}>
                Password must be at least 8 characters
              </Text>
            </View>

            {error && (
              <Animated.View entering={FadeIn.duration(300)} style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color={Colors.error} />
                <Text style={styles.errorText}>{error}</Text>
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
            <Text style={styles.signInText}>Already have an account?</Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity style={styles.signInButton}>
                <Text style={styles.signInLink}>Sign In</Text>
                <Ionicons name="arrow-forward" size={14} color={Colors.burnishedGold} />
              </TouchableOpacity>
            </Link>
          </Animated.View>

          {/* Terms */}
          <Animated.View entering={FadeIn.duration(400).delay(500)} style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By creating an account, you agree to our{' '}
              <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
              <Text style={styles.termsLink}>Privacy Policy</Text>
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
    backgroundColor: Colors.warmOatmeal,
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
    backgroundColor: Colors.warmOatmeal,
  },

  // Header
  header: {
    marginBottom: Spacing.xxl,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.cardBg,
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
    color: Colors.midnightEmerald,
    fontFamily: Typography.fonts.serif,
  },
  subtitle: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
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
    backgroundColor: Colors.cardBg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.subtle,
  },
  oauthIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.warmOatmealDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  oauthButtonText: {
    flex: 1,
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.medium,
    color: Colors.charcoal,
    marginLeft: Spacing.md,
  },
  oauthArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.warmOatmealDark,
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
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
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
    color: Colors.charcoal,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wider,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
  },
  inputIcon: {
    marginRight: Spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.lg,
    fontSize: Typography.sizes.bodyLarge,
    color: Colors.charcoal,
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
    color: Colors.stoneGray,
    fontStyle: 'italic',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorLight,
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  errorText: {
    fontSize: Typography.sizes.body,
    color: Colors.error,
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
    color: Colors.stoneGray,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  signInLink: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    color: Colors.burnishedGold,
  },

  // Terms
  termsContainer: {
    paddingHorizontal: Spacing.lg,
  },
  termsText: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: Colors.burnishedGold,
    fontWeight: Typography.weights.medium,
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
    color: Colors.midnightEmerald,
    fontFamily: Typography.fonts.serif,
    marginBottom: Spacing.md,
  },
  verificationText: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
    textAlign: 'center',
  },
  verificationEmail: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    color: Colors.charcoal,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  verificationInstructions: {
    width: '100%',
    backgroundColor: Colors.cardBg,
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
    backgroundColor: Colors.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionNumberText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    color: Colors.burnishedGold,
  },
  instructionText: {
    fontSize: Typography.sizes.body,
    color: Colors.charcoal,
    flex: 1,
  },
  verificationNote: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
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
    color: Colors.burnishedGold,
  },
});
