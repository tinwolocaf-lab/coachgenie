import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Link, useRouter, useLocalSearchParams } from 'expo-router';
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
function AuthenticatedLogin() {
  const router = useRouter();
  const params = useLocalSearchParams<{ error?: string }>();
  const auth = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  // Handle error from URL params (e.g., from callback failures)
  useEffect(() => {
    if (params.error) {
      setUrlError(decodeURIComponent(params.error));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }, [params.error]);

  // Clear URL error when auth error changes or user interacts
  const clearErrors = () => {
    if (urlError) setUrlError(null);
    if (localError) setLocalError(null);
  };

  const isLoading = auth.isLoading;
  const error = urlError || localError || auth.error?.message || null;

  const getErrorMessage = (err: unknown): string => {
    if (!err) return 'Sign-in failed. Please try again.';
    if (typeof err === 'string') return err;
    if (typeof err === 'object') {
      const message = (err as { message?: unknown }).message;
      if (typeof message === 'string' && message.trim()) return message;
    }
    return 'Sign-in failed. Please try again.';
  };

  const isExpectedAuthMessage = (message: string): boolean => {
    const normalized = message.toLowerCase();
    return normalized.includes('invalid login credentials')
      || normalized.includes('email not confirmed')
      || normalized.includes('invalid email')
      || normalized.includes('invalid password')
      || normalized.includes('too many requests');
  };

  const handleEmailLogin = async () => {
    clearErrors();
    if (!email.trim() || !password.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Required Fields', 'Please enter your email and password to continue.');
      return;
    }
    try {
      await auth.signInWithEmail(email, password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      const message = getErrorMessage(err);
      setLocalError(message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      if (__DEV__ && !isExpectedAuthMessage(message)) {
        console.warn('Unexpected login error:', err);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    clearErrors();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await auth.signInWithGoogle();
    } catch (err) {
      const message = getErrorMessage(err);
      setLocalError(message);
      if (__DEV__ && !isExpectedAuthMessage(message)) {
        console.warn('Unexpected Google sign-in error:', err);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleAppleSignIn = async () => {
    clearErrors();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await auth.signInWithApple();
    } catch (err) {
      const message = getErrorMessage(err);
      setLocalError(message);
      if (__DEV__ && !isExpectedAuthMessage(message)) {
        console.warn('Unexpected Apple sign-in error:', err);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  return (
    <LoginUI
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      showPassword={showPassword}
      setShowPassword={setShowPassword}
      isLoading={isLoading}
      error={error}
      onInputChange={clearErrors}
      onEmailLogin={handleEmailLogin}
      onGoogleSignIn={handleGoogleSignIn}
      onAppleSignIn={handleAppleSignIn}
      showGuestMode={false}
      onContinueAsGuest={() => router.replace('/onboarding')}
    />
  );
}

// Unauthenticated/guest mode login
function GuestLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Required Fields', 'Please enter your email and password to continue.');
      return;
    }
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

  const handleContinueAsGuest = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace('/onboarding');
  };

  return (
    <LoginUI
      email={email}
      setEmail={setEmail}
      password={password}
      setPassword={setPassword}
      showPassword={showPassword}
      setShowPassword={setShowPassword}
      isLoading={isLoading}
      error={null}
      onInputChange={() => {}}
      onEmailLogin={handleEmailLogin}
      onGoogleSignIn={handleGoogleSignIn}
      onAppleSignIn={handleAppleSignIn}
      showGuestMode={true}
      onContinueAsGuest={handleContinueAsGuest}
    />
  );
}

function AuthConfigurationError() {
  const { palette } = useThemeSafe();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      <View style={styles.authConfigErrorContainer}>
        <Text style={[styles.authConfigErrorTitle, { color: palette.textPrimary }]}>
          Authentication Unavailable
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
export default function LoginScreen() {
  if (isSupabaseConfigured) {
    return <AuthenticatedLogin />;
  }
  if (isGuestModeEnabled) {
    return <GuestLogin />;
  }
  return <AuthConfigurationError />;
}

// Shared UI component
interface LoginUIProps {
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
  isLoading: boolean;
  error: string | null;
  onInputChange: () => void;
  onEmailLogin: () => void;
  onGoogleSignIn: () => void;
  onAppleSignIn: () => void;
  showGuestMode: boolean;
  onContinueAsGuest: () => void;
}

function LoginUI({
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  isLoading,
  error,
  onInputChange,
  onEmailLogin,
  onGoogleSignIn,
  onAppleSignIn,
  showGuestMode,
  onContinueAsGuest,
}: LoginUIProps) {
  const { palette } = useThemeSafe();

  // Show premium loading state
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
        <View style={[styles.loadingContainer, { backgroundColor: palette.background }]}>
          <GoldDustLoader
            message="Authenticating"
            subMessage="Preparing your coaching experience..."
            size="lg"
          />
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
          {/* Editorial Header */}
          <Animated.View entering={FadeInUp.duration(600).delay(100)} style={styles.header}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={[palette.accent, palette.accentLight]}
                style={styles.logoGradient}
              >
                <Ionicons name="sparkles" size={32} color={palette.textInverse} />
              </LinearGradient>
            </View>
            <Text style={[styles.brandName, { color: palette.textPrimary }]}>CoachGenie</Text>
            <Text style={[styles.tagline, { color: palette.textTertiary }]}>Personal growth, elevated.</Text>
          </Animated.View>

          {/* Welcome Text */}
          <Animated.View entering={FadeIn.duration(500).delay(200)} style={styles.welcomeSection}>
            <Text style={[styles.welcomeTitle, { color: palette.textPrimary }]}>Welcome back</Text>
            <Text style={[styles.welcomeSubtitle, { color: palette.textTertiary }]}>
              Continue your journey with personalized AI coaching
            </Text>
          </Animated.View>

          {/* OAuth Buttons */}
          <Animated.View entering={FadeIn.duration(500).delay(300)} style={styles.oauthSection}>
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
          <Animated.View entering={FadeIn.duration(400).delay(400)} style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: palette.border }]} />
            <Text style={[styles.dividerText, { color: palette.textTertiary }]}>or sign in with email</Text>
            <View style={[styles.dividerLine, { backgroundColor: palette.border }]} />
          </Animated.View>

          {/* Email Form */}
          <Animated.View entering={FadeInDown.duration(500).delay(500)} style={styles.form}>
            <View style={styles.inputWrapper}>
              <Text style={[styles.inputLabel, { color: palette.textSecondary }]}>Email</Text>
              <View style={[styles.inputContainer, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
                <Ionicons name="mail-outline" size={18} color={palette.textTertiary} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: palette.textSecondary }]}
                  placeholder="your@email.com"
                  placeholderTextColor={palette.textTertiary}
                  value={email}
                  onChangeText={(value) => {
                    onInputChange();
                    setEmail(value);
                  }}
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
                  placeholder="Enter your password"
                  placeholderTextColor={palette.textTertiary}
                  value={password}
                  onChangeText={(value) => {
                    onInputChange();
                    setPassword(value);
                  }}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
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

            {error && (
              <Animated.View entering={FadeIn.duration(300)} style={[styles.errorContainer, { backgroundColor: palette.errorLight }]}>
                <Ionicons name="alert-circle" size={16} color={palette.error} />
                <Text style={[styles.errorText, { color: palette.error }]}>{error}</Text>
              </Animated.View>
            )}

            <Button
              title="Sign In"
              onPress={onEmailLogin}
              loading={isLoading}
              disabled={isLoading}
              fullWidth
              variant="gold"
              size="lg"
              style={styles.signInButton}
            />

            <Link href="/(auth)/forgot-password" asChild>
              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={[styles.forgotPasswordText, { color: palette.accent }]}>Forgot your password?</Text>
              </TouchableOpacity>
            </Link>
          </Animated.View>

          {/* Sign Up Link */}
          <Animated.View entering={FadeIn.duration(400).delay(600)} style={styles.signUpContainer}>
            <View style={[styles.signUpDivider, { backgroundColor: palette.border }]} />
            <Text style={[styles.signUpText, { color: palette.textTertiary }]}>New to CoachGenie?</Text>
            <Link href="/(auth)/signup" asChild>
              <TouchableOpacity style={styles.signUpButton}>
                <Text style={[styles.signUpLink, { color: palette.accent }]}>Create an account</Text>
                <Ionicons name="arrow-forward" size={14} color={palette.accent} />
              </TouchableOpacity>
            </Link>
          </Animated.View>

          {/* Guest Mode */}
          {showGuestMode && (
            <Animated.View entering={FadeIn.duration(400).delay(700)} style={styles.guestContainer}>
              <TouchableOpacity onPress={onContinueAsGuest} style={styles.guestButton}>
                <Text style={[styles.guestText, { color: palette.textTertiary }]}>Explore without an account</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
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
    paddingTop: Spacing.xl,
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
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logoContainer: {
    marginBottom: Spacing.lg,
  },
  logoGradient: {
    width: 72,
    height: 72,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.gold,
  },
  brandName: {
    fontSize: Typography.sizes.display,
    fontWeight: Typography.weights.bold,
    fontFamily: Typography.fonts.serif,
    letterSpacing: Typography.letterSpacing.tight,
  },
  tagline: {
    fontSize: Typography.sizes.body,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
  },

  // Welcome
  welcomeSection: {
    marginBottom: Spacing.xxl,
  },
  welcomeTitle: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    marginBottom: Spacing.xs,
  },
  welcomeSubtitle: {
    fontSize: Typography.sizes.body,
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
  },

  // OAuth
  oauthSection: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
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
  signInButton: {
    marginTop: Spacing.md,
  },
  forgotPassword: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  forgotPasswordText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
  },

  // Sign Up
  signUpContainer: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
  },
  signUpDivider: {
    width: 40,
    height: 1,
    marginBottom: Spacing.lg,
  },
  signUpText: {
    fontSize: Typography.sizes.body,
    marginBottom: Spacing.sm,
  },
  signUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  signUpLink: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
  },

  // Guest Mode
  guestContainer: {
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
  guestButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  guestText: {
    fontSize: Typography.sizes.body,
    textDecorationLine: 'underline',
  },
});
