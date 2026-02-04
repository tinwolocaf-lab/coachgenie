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
  Alert,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
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
function AuthenticatedLogin() {
  const router = useRouter();
  const useAuth = getAuthHook();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const auth = useAuth ? useAuth() : null;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const isLoading = auth?.isLoading || false;
  const error = auth?.error?.message || null;

  const handleEmailLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    try {
      await auth?.signInWithEmail(email, password);
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  const handleGoogleSignIn = async () => {
    await auth?.signInWithGoogle();
  };

  const handleAppleSignIn = async () => {
    await auth?.signInWithApple();
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
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      router.replace('/onboarding');
    }, 500);
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      router.replace('/onboarding');
    }, 500);
  };

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      router.replace('/onboarding');
    }, 500);
  };

  const handleContinueAsGuest = () => {
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
          {/* Logo & Header */}
          <Animated.View entering={FadeInUp.duration(400)} style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="sparkles" size={40} color={Colors.electricIndigo} />
            </View>
            <Text style={styles.appName}>Coachgenie</Text>
            <Text style={styles.tagline}>Your AI-powered coaching companion</Text>
          </Animated.View>

          {/* OAuth Buttons */}
          <Animated.View entering={FadeIn.duration(400).delay(200)} style={styles.oauthSection}>
            <TouchableOpacity
              style={styles.oauthButton}
              onPress={onGoogleSignIn}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Ionicons name="logo-google" size={20} color={Colors.slateCharcoal} />
              <Text style={styles.oauthButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={styles.oauthButton}
                onPress={onAppleSignIn}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <Ionicons name="logo-apple" size={20} color={Colors.slateCharcoal} />
                <Text style={styles.oauthButtonText}>Continue with Apple</Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Divider */}
          <Animated.View entering={FadeIn.duration(400).delay(300)} style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </Animated.View>

          {/* Email Form */}
          <Animated.View entering={FadeIn.duration(400).delay(400)} style={styles.form}>
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

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.slateLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={Colors.slateLight}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoComplete="password"
                editable={!isLoading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.passwordToggle}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={Colors.slateLight}
                />
              </TouchableOpacity>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={16} color={Colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Button
              title="Sign In"
              onPress={onEmailLogin}
              loading={isLoading}
              disabled={isLoading}
              fullWidth
              style={styles.signInButton}
            />

            <Link href="/(auth)/forgot-password" asChild>
              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>Forgot password?</Text>
              </TouchableOpacity>
            </Link>
          </Animated.View>

          {/* Sign Up Link */}
          <Animated.View entering={FadeIn.duration(400).delay(500)} style={styles.signUpContainer}>
            <Text style={styles.signUpText}>Don&apos;t have an account?</Text>
            <Link href="/(auth)/signup" asChild>
              <TouchableOpacity>
                <Text style={styles.signUpLink}>Sign Up</Text>
              </TouchableOpacity>
            </Link>
          </Animated.View>

          {/* Guest Mode */}
          {showGuestMode && (
            <Animated.View entering={FadeIn.duration(400).delay(600)} style={styles.guestContainer}>
              <TouchableOpacity onPress={onContinueAsGuest} style={styles.guestButton}>
                <Text style={styles.guestText}>Continue without account</Text>
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
    backgroundColor: Colors.offWhite,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.section,
    paddingBottom: Spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxxl,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: Colors.electricIndigo + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  appName: {
    fontSize: Typography.sizes.display,
    fontWeight: Typography.weights.bold,
    color: Colors.slateCharcoal,
    marginBottom: Spacing.xs,
  },
  tagline: {
    fontSize: Typography.sizes.body,
    color: Colors.slateGray,
    textAlign: 'center',
  },
  oauthSection: {
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  oauthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  oauthButtonText: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.medium,
    color: Colors.slateCharcoal,
    marginLeft: Spacing.md,
  },
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
    fontSize: Typography.sizes.body,
    color: Colors.slateLight,
    marginHorizontal: Spacing.lg,
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
  },
  errorText: {
    fontSize: Typography.sizes.body,
    color: Colors.error,
    marginLeft: Spacing.sm,
    flex: 1,
  },
  signInButton: {
    marginTop: Spacing.sm,
  },
  forgotPassword: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  forgotPasswordText: {
    fontSize: Typography.sizes.body,
    color: Colors.electricIndigo,
    fontWeight: Typography.weights.medium,
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  signUpText: {
    fontSize: Typography.sizes.body,
    color: Colors.slateGray,
  },
  signUpLink: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    color: Colors.electricIndigo,
  },
  guestContainer: {
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
  guestButton: {
    paddingVertical: Spacing.md,
  },
  guestText: {
    fontSize: Typography.sizes.body,
    color: Colors.slateLight,
    textDecorationLine: 'underline',
  },
});
