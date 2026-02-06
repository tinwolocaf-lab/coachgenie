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
function AuthenticatedLogin() {
  const router = useRouter();
  const params = useLocalSearchParams<{ error?: string }>();
  const useAuth = getAuthHook();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const auth = useAuth ? useAuth() : null;

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

  const isLoading = auth?.isLoading || false;
  const error = urlError || localError || auth?.error?.message || null;

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
      await auth?.signInWithEmail(email, password);
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
      await auth?.signInWithGoogle();
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
      await auth?.signInWithApple();
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
      onEmailLogin={handleEmailLogin}
      onGoogleSignIn={handleGoogleSignIn}
      onAppleSignIn={handleAppleSignIn}
      showGuestMode={true}
      onContinueAsGuest={handleContinueAsGuest}
    />
  );
}

// Main export
export default function LoginScreen() {
  if (isSupabaseConfigured) {
    return <AuthenticatedLogin />;
  }
  return <GuestLogin />;
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
  onEmailLogin,
  onGoogleSignIn,
  onAppleSignIn,
  showGuestMode,
  onContinueAsGuest,
}: LoginUIProps) {
  // Show premium loading state
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
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
          {/* Editorial Header */}
          <Animated.View entering={FadeInUp.duration(600).delay(100)} style={styles.header}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={[Colors.burnishedGold, Colors.goldLight]}
                style={styles.logoGradient}
              >
                <Ionicons name="sparkles" size={32} color={Colors.white} />
              </LinearGradient>
            </View>
            <Text style={styles.brandName}>Coachgenie</Text>
            <Text style={styles.tagline}>Personal growth, elevated.</Text>
          </Animated.View>

          {/* Welcome Text */}
          <Animated.View entering={FadeIn.duration(500).delay(200)} style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>Welcome back</Text>
            <Text style={styles.welcomeSubtitle}>
              Continue your journey with personalized AI coaching
            </Text>
          </Animated.View>

          {/* OAuth Buttons */}
          <Animated.View entering={FadeIn.duration(500).delay(300)} style={styles.oauthSection}>
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
          <Animated.View entering={FadeIn.duration(400).delay(400)} style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or sign in with email</Text>
            <View style={styles.dividerLine} />
          </Animated.View>

          {/* Email Form */}
          <Animated.View entering={FadeInDown.duration(500).delay(500)} style={styles.form}>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Email</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={18} color={Colors.stoneGray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor={Colors.stoneGray}
                  value={email}
                  onChangeText={(value) => {
                    clearErrors();
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
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={18} color={Colors.stoneGray} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={Colors.stoneGray}
                  value={password}
                  onChangeText={(value) => {
                    clearErrors();
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
                    color={Colors.stoneGray}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {error && (
              <Animated.View entering={FadeIn.duration(300)} style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color={Colors.error} />
                <Text style={styles.errorText}>{error}</Text>
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
                <Text style={styles.forgotPasswordText}>Forgot your password?</Text>
              </TouchableOpacity>
            </Link>
          </Animated.View>

          {/* Sign Up Link */}
          <Animated.View entering={FadeIn.duration(400).delay(600)} style={styles.signUpContainer}>
            <View style={styles.signUpDivider} />
            <Text style={styles.signUpText}>New to Coachgenie?</Text>
            <Link href="/(auth)/signup" asChild>
              <TouchableOpacity style={styles.signUpButton}>
                <Text style={styles.signUpLink}>Create an account</Text>
                <Ionicons name="arrow-forward" size={14} color={Colors.burnishedGold} />
              </TouchableOpacity>
            </Link>
          </Animated.View>

          {/* Guest Mode */}
          {showGuestMode && (
            <Animated.View entering={FadeIn.duration(400).delay(700)} style={styles.guestContainer}>
              <TouchableOpacity onPress={onContinueAsGuest} style={styles.guestButton}>
                <Text style={styles.guestText}>Explore without an account</Text>
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
    backgroundColor: Colors.warmOatmeal,
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
    backgroundColor: Colors.warmOatmeal,
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
    color: Colors.midnightEmerald,
    fontFamily: Typography.fonts.serif,
    letterSpacing: Typography.letterSpacing.tight,
  },
  tagline: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
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
    color: Colors.midnightEmerald,
    fontFamily: Typography.fonts.serif,
    marginBottom: Spacing.xs,
  },
  welcomeSubtitle: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
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
  signInButton: {
    marginTop: Spacing.md,
  },
  forgotPassword: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  forgotPasswordText: {
    fontSize: Typography.sizes.body,
    color: Colors.burnishedGold,
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
    backgroundColor: Colors.border,
    marginBottom: Spacing.lg,
  },
  signUpText: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
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
    color: Colors.burnishedGold,
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
    color: Colors.stoneGray,
    textDecorationLine: 'underline',
  },
});
