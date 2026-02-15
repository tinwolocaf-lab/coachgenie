import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Typography, Spacing, Radius, Shadows, EditorialSpacing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { GoldDustLoader } from '@/components/ui/GoldDustLoader';
import { PremiumPageTransition } from '@/components/ui/PremiumPageTransition';
import { AtmosphereGallery } from '@/components/settings/AtmosphereGallery';
import CouponRedeemPanel from '@/components/billing/CouponRedeemCard';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { useAuthSafe } from '@/hooks/useConditionalAuth';
import { invalidateUserTierCache } from '@/lib/feature-gates';
import { getRevenueCatInitError, isRevenueCatReady } from '@/lib/revenuecat';
import {
  ApiFunctionError,
  getAvailableModels,
  getCreditStatus,
  setPreferredModel,
  type AvailableModel,
  type CreditStatusResponse,
  type RedeemCouponResponse,
} from '@/lib/apiClient';
import { useAlert } from '@/contexts/AlertContext';

interface UserProfile {
  email: string;
  fullName: string;
  avatarInitial: string;
}

const MODEL_DISPLAY_NAMES: Record<string, string> = {
  'anthropic/claude-opus-4.6': 'Opus 4.6',
  'openai/gpt-5.2': 'GPT-5.2',
  'openai/gpt-5.2-pro': 'GPT-5.2 Extra High',
  'google/gemini-3-pro-preview': 'Gemini 3 Pro',
};

function getModelDisplayName(modelId: string): string {
  return MODEL_DISPLAY_NAMES[modelId] ?? modelId;
}

export default function AccountScreen() {
  const router = useRouter();
  const { palette, isSovereignMember, setSovereignMember, subscriptionTier, setSubscriptionTier } = useThemeSafe();
  const auth = useAuthSafe();
  const { showToast, showAlert } = useAlert();

  const [profile, setProfile] = useState<UserProfile>({
    email: '',
    fullName: '',
    avatarInitial: 'U',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [creditStatus, setCreditStatus] = useState<CreditStatusResponse | null>(null);
  const [availableModels, setAvailableModels] = useState<AvailableModel[]>([]);
  const [preferredModelId, setPreferredModelId] = useState<string | null>(null);
  const [isBillingLoading, setIsBillingLoading] = useState(false);
  const [isUpdatingModel, setIsUpdatingModel] = useState(false);

  // Animation values
  const headerScale = useSharedValue(1);

  useEffect(() => {
    if (auth.user) {
      const email = auth.user.email || '';
      const metadata = auth.user.user_metadata || {};
      const name = metadata.full_name || metadata.name || email.split('@')[0] || 'User';

      setProfile({
        email,
        fullName: name,
        avatarInitial: name.charAt(0).toUpperCase(),
      });
      setEditedName(name);

      // Sovereign membership is now checked via RevenueCat in ThemeContext
    }
  }, [auth.user]);

  const loadBillingData = useCallback(async () => {
    if (!auth?.isAuthenticated) {
      setCreditStatus(null);
      setAvailableModels([]);
      setPreferredModelId(null);
      return;
    }

    setIsBillingLoading(true);
    try {
      const [status, catalog] = await Promise.all([
        getCreditStatus(),
        getAvailableModels(),
      ]);
      setCreditStatus(status);
      setAvailableModels(catalog.models);
      setPreferredModelId(catalog.preferred_model_id ?? status.preferred_chat_model);
    } catch (error) {
      if (error instanceof ApiFunctionError) {
        console.warn('Failed to load billing details:', error.message);
      } else {
        console.warn('Failed to load billing details:', error);
      }
    } finally {
      setIsBillingLoading(false);
    }
  }, [auth?.isAuthenticated]);

  useEffect(() => {
    void loadBillingData();
  }, [loadBillingData, subscriptionTier]);

  const handleBack = () => {
    router.back();
  };

  const handleEditProfile = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditedName(profile.fullName);
    setIsEditing(false);
  };

  const handleSaveProfile = async () => {
    if (!editedName.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      showAlert('Invalid Name', 'Please enter your name');
      return;
    }

    setIsSaving(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: editedName.trim() }
      });

      if (error) throw error;

      setProfile(prev => ({
        ...prev,
        fullName: editedName.trim(),
        avatarInitial: editedName.trim().charAt(0).toUpperCase(),
      }));
      setIsEditing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error updating profile:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast('Error', { variant: 'error', message: 'Failed to update profile. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    showAlert(
      'Sign Out',
      'Are you sure you want to sign out of your account?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setIsSigningOut(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            try {
              await auth?.signOut();
              router.replace('/(auth)/login');
            } catch (error) {
              console.error('Sign out error:', error);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              setIsSigningOut(false);
            }
          },
        },
      ]
    );
  };

  const handlePremiumRequired = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (!isRevenueCatReady()) {
      const initError = getRevenueCatInitError();
      const message =
        initError === 'expo_go_not_supported'
          ? 'Purchases are unavailable in Expo Go. Use a development build to test subscriptions.'
          : 'Purchases are temporarily unavailable on this build.';
      showToast('Purchases unavailable', {
        variant: 'info',
        message,
      });
    }

    router.push('/paywall');
  };

  const handleChangePassword = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setNewPassword('');
    setShowPasswordModal(true);
  };

  const handleSubmitPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      showAlert('Error', 'Password must be at least 6 characters.');
      return;
    }
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setShowPasswordModal(false);
      setNewPassword('');
      showToast('Success', { variant: 'success', message: 'Your password has been updated.' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update password.';
      showToast('Error', { variant: 'error', message });
    }
  };

  const handleManageSubscription = async () => {
    // Premium haptic feedback for a refined feel
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      let subscriptionUrl: string;

      if (Platform.OS === 'ios') {
        // iOS App Store subscription management
        subscriptionUrl = 'itms-apps://apps.apple.com/account/subscriptions';
      } else {
        // Google Play Store subscription management
        subscriptionUrl = 'https://play.google.com/store/account/subscriptions';
      }

      const canOpen = await Linking.canOpenURL(subscriptionUrl);

      if (canOpen) {
        // Success haptic before opening
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await Linking.openURL(subscriptionUrl);
      } else {
        // Fallback for web or if URL scheme isn't supported
        const fallbackUrl = Platform.OS === 'ios'
          ? 'https://apps.apple.com/account/subscriptions'
          : 'https://play.google.com/store/account/subscriptions';

        await Linking.openURL(fallbackUrl);
      }
    } catch (error) {
      console.error('Failed to open subscription management:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      showAlert(
        'Unable to Open',
        'Could not open subscription management. Please manage your subscription through your device settings.',
        [
          { text: 'OK', style: 'default' },
          {
            text: 'Open Settings',
            onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            }
          }
        ]
      );
    }
  };

  const handleSelectModel = useCallback(async (modelId: string) => {
    if (isUpdatingModel || preferredModelId === modelId) {
      return;
    }

    setIsUpdatingModel(true);
    try {
      await setPreferredModel(modelId);
      setPreferredModelId(modelId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      if (error instanceof ApiFunctionError) {
        console.warn('Failed to update model preference:', error.message);
      } else {
        console.warn('Failed to update model preference:', error);
      }
      showToast('Model Update Failed', { variant: 'error', message: 'Could not save your model preference. Please try again.' });
    } finally {
      setIsUpdatingModel(false);
    }
  }, [isUpdatingModel, preferredModelId, showToast]);

  const handleCouponRedeemed = useCallback(async (payload: RedeemCouponResponse) => {
    invalidateUserTierCache();
    setSubscriptionTier(payload.tier);
    setSovereignMember(payload.tier !== 'free');
    await loadBillingData();
  }, [loadBillingData, setSovereignMember, setSubscriptionTier]);

  const currentPackCredits =
    creditStatus?.pack_credits ??
    (subscriptionTier === 'oracle' ? 1000 : subscriptionTier === 'sovereign' ? 300 : 50);
  const remainingCredits = creditStatus?.balance_credits ?? currentPackCredits;
  const usedCredits = Math.max(0, currentPackCredits - remainingCredits);
  const periodEndLabel = creditStatus?.period_end
    ? new Date(creditStatus.period_end).toLocaleDateString()
    : null;

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: headerScale.value }],
  }));

  // Dynamic styles based on current theme
  const dynamicStyles = {
    container: { backgroundColor: palette.background },
    headerTitle: { color: palette.textPrimary },
    sectionTitle: { color: palette.textTertiary },
    cardBg: { backgroundColor: palette.cardBg },
    textPrimary: { color: palette.textPrimary },
    textSecondary: { color: palette.textSecondary },
    textTertiary: { color: palette.textTertiary },
    accentColor: palette.accent,
    borderColor: palette.border,
  };

  // Show loading state while signing out
  if (isSigningOut) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <GoldDustLoader
            message="Signing out"
            subMessage="See you again soon..."
            size="lg"
          />
        </View>
      </SafeAreaView>
    );
  }

  // If no auth configured, show guest account with limited features
  if (!isSupabaseConfigured || !auth?.isAuthenticated) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top', 'bottom']}>
        <PremiumPageTransition style={styles.container}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <Animated.View entering={FadeInUp.duration(500)} style={styles.header}>
              <TouchableOpacity
                onPress={handleBack}
                style={[styles.backButton, { backgroundColor: palette.cardBg }]}
              >
                <Ionicons name="arrow-back" size={22} color={palette.textSecondary} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, dynamicStyles.headerTitle]}>Account</Text>
              <View style={styles.headerSpacer} />
            </Animated.View>

            {/* Guest Profile Card */}
            <Animated.View entering={FadeIn.duration(500).delay(100)} style={styles.guestProfileSection}>
              <View style={styles.guestIconContainer}>
                <LinearGradient
                  colors={[palette.textTertiary, palette.textSecondary]}
                  style={styles.guestIconBg}
                >
                  <Ionicons name="person-outline" size={40} color={palette.textInverse} />
                </LinearGradient>
              </View>
              <Text style={[styles.guestTitle, { color: palette.textPrimary }]}>Guest Account</Text>
              <Text style={[styles.guestText, { color: palette.textTertiary }]}>
                Sign in to sync your progress across devices and unlock all features.
              </Text>
              <Button
                title="Sign In"
                onPress={() => router.push('/(auth)/login')}
                variant="gold"
                size="lg"
                fullWidth
                style={styles.guestButton}
              />
            </Animated.View>

            {/* Guest Features Section */}
            <Animated.View entering={FadeInUp.duration(500).delay(150)}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>What You Can Do</Text>
              </View>

              <View style={[styles.profileSettingsCard, { backgroundColor: palette.cardBg }]}>
                <View style={[styles.settingItem, { borderBottomColor: palette.borderLight }]}>
                  <View style={[styles.settingIcon, { backgroundColor: palette.successLight }]}>
                    <Ionicons name="checkmark-circle" size={20} color={palette.success} />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={[styles.settingValue, { color: palette.textSecondary }]}>Daily Clarity Coach</Text>
                    <Text style={[styles.settingDescription, { color: palette.textTertiary }]}>Free access to guided coaching sessions</Text>
                  </View>
                </View>

                <View style={[styles.settingItem, { borderBottomColor: palette.borderLight }]}>
                  <View style={[styles.settingIcon, { backgroundColor: palette.successLight }]}>
                    <Ionicons name="checkmark-circle" size={20} color={palette.success} />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={[styles.settingValue, { color: palette.textSecondary }]}>50 monthly credits</Text>
                    <Text style={[styles.settingDescription, { color: palette.textTertiary }]}>Credit-based AI usage across chat and voice</Text>
                  </View>
                </View>

                <View style={styles.settingItem}>
                  <View style={[styles.settingIcon, { backgroundColor: palette.successLight }]}>
                    <Ionicons name="checkmark-circle" size={20} color={palette.success} />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={[styles.settingValue, { color: palette.textSecondary }]}>Theme Atmospheres</Text>
                    <Text style={[styles.settingDescription, { color: palette.textTertiary }]}>Customize your experience</Text>
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* Upgrade Section */}
            <Animated.View entering={FadeInUp.duration(500).delay(180)}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Unlock More</Text>
              </View>

              <TouchableOpacity
                style={[styles.settingsCard, { backgroundColor: palette.cardBg }]}
                onPress={() => router.push('/paywall')}
                activeOpacity={0.9}
              >
                <View style={styles.settingItemClickable}>
                  <View style={[styles.settingIcon, { backgroundColor: palette.accentMuted }]}>
                    <Ionicons name="diamond" size={20} color={palette.accent} />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={[styles.settingValue, { color: palette.textSecondary }]}>Unlock All Features</Text>
                    <Text style={[styles.settingDescription, { color: palette.textTertiary }]}>
                      Get larger credit packs, voice tools, and advanced model access
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={palette.accent} />
                </View>
              </TouchableOpacity>
            </Animated.View>

            {/* Atmospheres Section - Available in Guest Mode */}
            <Animated.View entering={FadeInUp.duration(500).delay(200)}>
              <AtmosphereGallery onPremiumRequired={handlePremiumRequired} />
            </Animated.View>

            {/* App Info Section */}
            <Animated.View entering={FadeInUp.duration(500).delay(300)}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>App Info</Text>
              </View>

              <View style={[styles.settingsCard, { backgroundColor: palette.cardBg }]}>
                <View style={[styles.settingItem, { borderBottomColor: palette.borderLight }]}>
                  <View style={[styles.settingIcon, { backgroundColor: palette.accentMuted }]}>
                    <Ionicons name="information-circle-outline" size={20} color={palette.accent} />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={[styles.settingLabel, { color: palette.textTertiary }]}>Version</Text>
                    <Text style={[styles.settingValue, { color: palette.textSecondary }]}>1.0.0</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.settingItemClickable}
                  onPress={() => {
                    Linking.openURL('https://coachgenie.app/privacy');
                  }}
                >
                  <View style={[styles.settingIcon, { backgroundColor: palette.accentMuted }]}>
                    <Ionicons name="shield-checkmark-outline" size={20} color={palette.accent} />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={[styles.settingLabel, { color: palette.textTertiary }]}>Privacy Policy</Text>
                    <Text style={[styles.settingDescription, { color: palette.textTertiary }]}>View our privacy practices</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={palette.textTertiary} />
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* App Info Footer */}
            <Animated.View entering={FadeIn.duration(400).delay(400)} style={styles.appInfo}>
              <Text style={[styles.appVersion, { color: palette.textTertiary }]}>CoachZeno v1.0.0</Text>
              <Text style={[styles.appCopyright, { color: palette.textTertiary }]}>© 2024 CoachZeno. All rights reserved.</Text>
            </Animated.View>

            <View style={styles.bottomSpacer} />
          </ScrollView>
        </PremiumPageTransition>
      </SafeAreaView>
    );
  }

  return (<>
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}>
      <PremiumPageTransition style={styles.container}>
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
              <TouchableOpacity
                onPress={handleBack}
                style={[styles.backButton, { backgroundColor: palette.cardBg }]}
              >
                <Ionicons name="arrow-back" size={22} color={palette.textSecondary} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, dynamicStyles.headerTitle]}>Account</Text>
              <View style={styles.headerSpacer} />
            </Animated.View>

            {/* Profile Card */}
            <Animated.View entering={FadeIn.duration(600).delay(100)}>
              <View style={[styles.profileCard, { shadowColor: palette.shadowColor }]}>
                <LinearGradient
                  colors={[palette.gradientStart, palette.gradientEnd]}
                  style={styles.profileGradient}
                >
                  <Animated.View style={[styles.avatarContainer, headerAnimatedStyle]}>
                    <LinearGradient
                      colors={[palette.accent, palette.accentLight]}
                      style={[styles.avatarGradient, { shadowColor: palette.accent }]}
                    >
                      <Text style={[styles.avatarText, { color: palette.textInverse }]}>{profile.avatarInitial}</Text>
                    </LinearGradient>
                  </Animated.View>
                  <Text style={[styles.profileName, { color: palette.textInverse }]}>{profile.fullName}</Text>
                  <Text style={[styles.profileEmail, { color: palette.accentLight }]}>{profile.email}</Text>
                  <View style={styles.memberBadge}>
                    <Ionicons name="sparkles" size={14} color={palette.accent} />
                    <Text style={[styles.memberText, { color: palette.accent }]}>
                      {isSovereignMember ? 'Sovereign Member' : 'Premium Member'}
                    </Text>
                  </View>
                </LinearGradient>
              </View>
            </Animated.View>

            {/* Atmospheres Section */}
            <Animated.View entering={FadeInUp.duration(500).delay(150)}>
              <AtmosphereGallery onPremiumRequired={handlePremiumRequired} />
            </Animated.View>

            {/* Edit Profile Section */}
            <Animated.View entering={FadeInUp.duration(500).delay(200)}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Profile Settings</Text>
              </View>

              <View style={[styles.settingsCard, { backgroundColor: palette.cardBg }]}>
                {/* Name Field */}
                <View style={[styles.settingItem, { borderBottomColor: palette.borderLight }]}>
                  <View style={[styles.settingIcon, { backgroundColor: palette.accentMuted }]}>
                    <Ionicons name="person-outline" size={20} color={palette.accent} />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={[styles.settingLabel, { color: palette.textTertiary }]}>Display Name</Text>
                    {isEditing ? (
                      <TextInput
                        style={[styles.settingInput, { color: palette.textSecondary, borderBottomColor: palette.accent }]}
                        value={editedName}
                        onChangeText={setEditedName}
                        placeholder="Enter your name"
                        placeholderTextColor={palette.textTertiary}
                        autoFocus
                      />
                    ) : (
                      <Text style={[styles.settingValue, { color: palette.textSecondary }]}>{profile.fullName}</Text>
                    )}
                  </View>
                  {!isEditing && (
                    <TouchableOpacity
                      onPress={handleEditProfile}
                      style={[styles.editButton, { backgroundColor: palette.accentMuted }]}
                    >
                      <Ionicons name="pencil" size={16} color={palette.accent} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Email Field (Read-only) */}
                <View style={styles.settingItem}>
                  <View style={[styles.settingIcon, { backgroundColor: palette.accentMuted }]}>
                    <Ionicons name="mail-outline" size={20} color={palette.accent} />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={[styles.settingLabel, { color: palette.textTertiary }]}>Email Address</Text>
                    <Text style={[styles.settingValue, { color: palette.textSecondary }]}>{profile.email}</Text>
                  </View>
                  <View style={[styles.verifiedBadge, { backgroundColor: palette.successLight }]}>
                    <Ionicons name="checkmark-circle" size={16} color={palette.success} />
                  </View>
                </View>

                {/* Edit Actions */}
                {isEditing && (
                  <Animated.View entering={FadeIn.duration(300)} style={styles.editActions}>
                    <Button
                      title="Cancel"
                      onPress={handleCancelEdit}
                      variant="outline"
                      size="sm"
                      style={styles.editCancelButton}
                    />
                    <Button
                      title="Save Changes"
                      onPress={handleSaveProfile}
                      variant="gold"
                      size="sm"
                      loading={isSaving}
                      style={styles.editSaveButton}
                    />
                  </Animated.View>
                )}
              </View>
            </Animated.View>

            {/* Subscription Section */}
            <Animated.View entering={FadeInUp.duration(500).delay(300)}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Subscription</Text>
              </View>

              <View style={[styles.subscriptionCard, { backgroundColor: palette.cardBg }]}>
                <View style={styles.subscriptionGradient}>
                  <View style={styles.subscriptionHeader}>
                    <View style={[styles.subscriptionIcon, { backgroundColor: palette.accentMuted }]}>
                      <Ionicons name="diamond" size={24} color={palette.accent} />
                    </View>
                    <View style={styles.subscriptionInfo}>
                      <Text style={[styles.subscriptionTitle, { color: palette.textSecondary }]}>
                        {subscriptionTier === 'oracle' ? 'Oracle Plan' : subscriptionTier === 'sovereign' ? 'Sovereign Plan' : 'Free Plan'}
                      </Text>
                      <Text style={[styles.subscriptionStatus, { color: palette.success }]}>Active</Text>
                    </View>
                    <View style={[styles.subscriptionBadge, { backgroundColor: palette.accent }]}>
                      <Text style={[styles.subscriptionBadgeText, { color: palette.textInverse }]}>CURRENT</Text>
                    </View>
                  </View>
                  <View style={styles.subscriptionFeatures}>
                    <View style={styles.featureItem}>
                      <Ionicons name="checkmark" size={16} color={palette.success} />
                      <Text style={[styles.featureText, { color: palette.textSecondary }]}>
                        {currentPackCredits.toFixed(1)} monthly credits included
                      </Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Ionicons name="checkmark" size={16} color={palette.success} />
                      <Text style={[styles.featureText, { color: palette.textSecondary }]}>
                        {remainingCredits.toFixed(1)} credits remaining this period
                      </Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Ionicons name="checkmark" size={16} color={palette.success} />
                      <Text style={[styles.featureText, { color: palette.textSecondary }]}>
                        {usedCredits.toFixed(1)} credits used this period
                      </Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Ionicons name="checkmark" size={16} color={palette.success} />
                      <Text style={[styles.featureText, { color: palette.textSecondary }]}>
                        {periodEndLabel
                          ? `Current period ends on ${periodEndLabel}`
                          : 'Credits refresh every 30-day billing period'}
                      </Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Ionicons name="checkmark" size={16} color={palette.success} />
                      <Text style={[styles.featureText, { color: palette.textSecondary }]}>
                        {subscriptionTier === 'oracle'
                          ? 'All coaches + premium reasoning model access'
                          : subscriptionTier === 'sovereign'
                            ? 'All coaches + voice messages + integrations'
                            : 'Daily Clarity coach + essential AI access'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={handleManageSubscription}
                    style={[styles.manageButton, { borderTopColor: palette.borderLight }]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.manageButtonText, { color: palette.accent }]}>Manage Subscription</Text>
                    <Ionicons name="arrow-forward" size={14} color={palette.accent} />
                  </TouchableOpacity>

                  <CouponRedeemPanel onRedeemed={handleCouponRedeemed} />
                </View>
              </View>
            </Animated.View>

            {/* Coach Studio Section */}
            <Animated.View entering={FadeInUp.duration(500).delay(320)}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Coach Studio</Text>
              </View>

              <View style={[styles.settingsCard, { backgroundColor: palette.cardBg }]}>
                <TouchableOpacity
                  style={styles.settingItemClickable}
                  onPress={() => {
                    router.push('/coach/manage');
                  }}
                >
                  <View style={[styles.settingIcon, { backgroundColor: palette.accentMuted }]}>
                    <Ionicons name="construct-outline" size={20} color={palette.accent} />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={[styles.settingLabel, { color: palette.textTertiary }]}>Manage Coaches</Text>
                    <Text style={[styles.settingDescription, { color: palette.textTertiary }]}>
                      Create, publish, edit, and request deletion for your custom coaches
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={palette.textTertiary} />
                </TouchableOpacity>

                <View style={[styles.settingItem, { borderTopColor: palette.borderLight, borderTopWidth: 1 }]}>
                  <View style={[styles.settingIcon, { backgroundColor: palette.accentMuted }]}>
                    <Ionicons
                      name={subscriptionTier === 'free' ? 'lock-closed-outline' : 'checkmark-circle-outline'}
                      size={20}
                      color={subscriptionTier === 'free' ? palette.warning : palette.success}
                    />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={[styles.settingLabel, { color: palette.textTertiary }]}>Creation Access</Text>
                    <Text style={[styles.settingDescription, { color: palette.textTertiary }]}>
                      {subscriptionTier === 'free'
                        ? 'Custom coach creation is available on Sovereign and Oracle plans.'
                        : 'Custom coach creation enabled for your plan.'}
                    </Text>
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* Chat Model Section */}
            {subscriptionTier !== 'free' && (
              <Animated.View entering={FadeInUp.duration(500).delay(330)}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Chat Model</Text>
                </View>

                <View style={[styles.settingsCard, { backgroundColor: palette.cardBg }]}>
                  <Text style={[styles.settingDescription, { color: palette.textTertiary, marginBottom: Spacing.md }]}>
                    Choose your default chat model for new conversations. Voice remains Gemini-managed.
                  </Text>

                  {isBillingLoading ? (
                    <View style={styles.modelLoadingState}>
                      <ActivityIndicator size="small" color={palette.accent} />
                    </View>
                  ) : (
                    <View style={styles.modelList}>
                      {availableModels.map((model) => {
                        const isSelected = preferredModelId === model.id;
                        return (
                          <TouchableOpacity
                            key={model.id}
                            style={[
                              styles.modelOption,
                              {
                                borderColor: isSelected ? palette.accent : palette.border,
                                backgroundColor: isSelected ? palette.accentMuted : palette.background,
                              },
                            ]}
                            disabled={isUpdatingModel}
                            onPress={() => {
                              void handleSelectModel(model.id);
                            }}
                          >
                            <View style={styles.modelTextBlock}>
                              <Text style={[styles.modelName, { color: palette.textPrimary }]}>
                                {getModelDisplayName(model.id)}
                              </Text>
                              <Text style={[styles.modelProvider, { color: palette.textTertiary }]}>
                                {model.id}
                              </Text>
                            </View>
                            {isSelected ? (
                              <Ionicons name="checkmark-circle" size={18} color={palette.accent} />
                            ) : null}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              </Animated.View>
            )}

            {/* Connections Section */}
            <Animated.View entering={FadeInUp.duration(500).delay(350)}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Connections</Text>
              </View>

              <View style={[styles.settingsCard, { backgroundColor: palette.cardBg }]}>
                <TouchableOpacity
                  style={styles.settingItemClickable}
                  onPress={() => {
                    router.push('/integrations');
                  }}
                >
                  <View style={[styles.settingIcon, { backgroundColor: palette.accentMuted }]}>
                    <Ionicons name="apps-outline" size={20} color={palette.accent} />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={[styles.settingLabel, { color: palette.textTertiary }]}>Integrations</Text>
                    <Text style={[styles.settingDescription, { color: palette.textTertiary }]}>
                      Connect Calendar, Notion, GitHub and more
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={palette.textTertiary} />
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Security Section */}
            <Animated.View entering={FadeInUp.duration(500).delay(400)}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Security</Text>
              </View>

              <View style={[styles.settingsCard, { backgroundColor: palette.cardBg }]}>
                <TouchableOpacity style={styles.settingItemClickable} onPress={handleChangePassword}>
                  <View style={[styles.settingIcon, { backgroundColor: palette.accentMuted }]}>
                    <Ionicons name="lock-closed-outline" size={20} color={palette.accent} />
                  </View>
                  <View style={styles.settingContent}>
                    <Text style={[styles.settingLabel, { color: palette.textTertiary }]}>Change Password</Text>
                    <Text style={[styles.settingDescription, { color: palette.textTertiary }]}>Update your account password</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={palette.textTertiary} />
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Sign Out Button */}
            <Animated.View entering={FadeInUp.duration(500).delay(500)} style={styles.signOutSection}>
              <TouchableOpacity
                onPress={handleSignOut}
                style={[styles.signOutButton, { backgroundColor: palette.errorLight }]}
                activeOpacity={0.8}
              >
                <View style={styles.signOutContent}>
                  <Ionicons name="log-out-outline" size={20} color={palette.error} />
                  <Text style={[styles.signOutText, { color: palette.error }]}>Sign Out</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>

            {/* App Info */}
            <Animated.View entering={FadeIn.duration(400).delay(600)} style={styles.appInfo}>
              <Text style={[styles.appVersion, { color: palette.textTertiary }]}>CoachZeno v1.0.0</Text>
              <Text style={[styles.appCopyright, { color: palette.textTertiary }]}>© 2024 CoachZeno. All rights reserved.</Text>
            </Animated.View>

            {/* Bottom Spacer */}
            <View style={styles.bottomSpacer} />
          </ScrollView>
        </KeyboardAvoidingView>
      </PremiumPageTransition>
    </SafeAreaView>

    {/* Password Change Modal */}
    <Modal
      visible={showPasswordModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowPasswordModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: palette.cardBg }]}>
          <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>Change Password</Text>
          <Text style={[styles.modalSubtitle, { color: palette.textTertiary }]}>
            Enter your new password (minimum 6 characters)
          </Text>
          <TextInput
            style={[styles.modalInput, { color: palette.textPrimary, borderColor: palette.border }]}
            placeholder="New password"
            placeholderTextColor={palette.textTertiary}
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            autoFocus
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => { setShowPasswordModal(false); setNewPassword(''); }}
            >
              <Text style={[styles.modalCancelText, { color: palette.textTertiary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalSubmitBtn, { backgroundColor: palette.accent }]}
              onPress={handleSubmitPassword}
            >
              <Text style={styles.modalSubmitText}>Update</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  </>
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
    paddingTop: Spacing.md,
    paddingBottom: Spacing.section,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xxl,
    paddingHorizontal: Spacing.xxl,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.subtle,
  },
  headerTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.bold,
    fontFamily: Typography.fonts.serif,
    letterSpacing: Typography.letterSpacing.editorial,
  },
  headerSpacer: {
    width: 44,
  },

  // Profile Card
  profileCard: {
    marginHorizontal: EditorialSpacing.breathingMargin,
    borderRadius: Radius.squircle,
    overflow: 'hidden',
    marginBottom: EditorialSpacing.sectionGap,
    ...Shadows.floating,
  },
  profileGradient: {
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: Spacing.lg,
  },
  avatarGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
  avatarText: {
    fontSize: Typography.sizes.display,
    fontWeight: Typography.weights.bold,
    fontFamily: Typography.fonts.serif,
  },
  profileName: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.bold,
    fontFamily: Typography.fonts.serif,
    letterSpacing: Typography.letterSpacing.editorial,
    marginBottom: Spacing.xs,
  },
  profileEmail: {
    fontSize: Typography.sizes.body,
    fontFamily: Typography.fonts.sansLight,
    marginBottom: Spacing.md,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    gap: Spacing.xs,
  },
  memberText: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.medium,
    letterSpacing: Typography.letterSpacing.wide,
  },

  // Section Headers - Premium Editorial
  sectionHeader: {
    marginBottom: Spacing.lg,
    paddingHorizontal: EditorialSpacing.breathingMargin,
  },
  sectionTitle: {
    fontSize: Typography.sizes.caption,
    fontFamily: Typography.fonts.sansSemibold,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.display,
  },

  // Settings Card - Premium Editorial
  settingsCard: {
    marginHorizontal: EditorialSpacing.breathingMargin,
    borderRadius: Radius.lg,
    marginBottom: EditorialSpacing.sectionGap,
    ...Shadows.md,
  },
  profileSettingsCard: {
    marginHorizontal: EditorialSpacing.breathingMargin,
    borderRadius: Radius.lg,
    marginBottom: EditorialSpacing.sectionGap,
    shadowOpacity: 0,
    elevation: 0,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  settingItemClickable: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: Typography.sizes.caption,
    fontFamily: Typography.fonts.sans,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wider,
  },
  settingValue: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.medium,
  },
  settingInput: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.medium,
    padding: 0,
    borderBottomWidth: 1,
    paddingBottom: Spacing.xs,
  },
  settingDescription: {
    fontSize: Typography.sizes.body,
  },
  modelLoadingState: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modelList: {
    gap: Spacing.sm,
  },
  modelOption: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modelTextBlock: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  modelName: {
    fontSize: Typography.sizes.body,
    fontFamily: Typography.fonts.sansSemibold,
  },
  modelProvider: {
    fontSize: Typography.sizes.caption,
    marginTop: 2,
    letterSpacing: Typography.letterSpacing.wide,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  editCancelButton: {
    minWidth: 100,
  },
  editSaveButton: {
    minWidth: 120,
  },

  // Subscription Card - Floating
  subscriptionCard: {
    marginHorizontal: EditorialSpacing.breathingMargin,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: EditorialSpacing.sectionGap,
    ...Shadows.subtle,
  },
  subscriptionGradient: {
    padding: Spacing.xl,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  subscriptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  subscriptionInfo: {
    flex: 1,
  },
  subscriptionTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.bold,
    fontFamily: Typography.fonts.serif,
    letterSpacing: Typography.letterSpacing.editorial,
  },
  subscriptionStatus: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.medium,
  },
  subscriptionBadge: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
  },
  subscriptionBadgeText: {
    fontSize: Typography.sizes.micro,
    fontWeight: Typography.weights.bold,
    letterSpacing: Typography.letterSpacing.wider,
  },
  subscriptionFeatures: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  featureText: {
    fontSize: Typography.sizes.body,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    marginTop: Spacing.md,
  },
  manageButtonText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
  },

  // Sign Out
  signOutSection: {
    marginBottom: EditorialSpacing.sectionGap,
    paddingHorizontal: EditorialSpacing.breathingMargin,
  },
  signOutButton: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  signOutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  signOutText: {
    fontSize: Typography.sizes.bodyLarge,
    fontFamily: Typography.fonts.sansSemibold,
  },

  // App Info
  appInfo: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.xxl,
  },
  appVersion: {
    fontSize: Typography.sizes.caption,
    marginBottom: Spacing.xs,
  },
  appCopyright: {
    fontSize: Typography.sizes.micro,
  },

  // Guest State
  guestContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  guestContent: {
    alignItems: 'center',
    width: '100%',
  },
  guestProfileSection: {
    alignItems: 'center',
    marginHorizontal: EditorialSpacing.breathingMargin,
    marginBottom: EditorialSpacing.sectionGap,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xxl,
  },
  guestIconContainer: {
    marginBottom: Spacing.xl,
  },
  guestIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  guestTitle: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.bold,
    fontFamily: Typography.fonts.serif,
    letterSpacing: Typography.letterSpacing.editorial,
    marginBottom: Spacing.md,
  },
  guestText: {
    fontSize: Typography.sizes.body,
    textAlign: 'center',
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
    marginBottom: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  guestButton: {
    marginBottom: Spacing.lg,
  },
  guestBackButton: {
    paddingVertical: Spacing.md,
  },
  guestBackText: {
    fontSize: Typography.sizes.body,
    textDecorationLine: 'underline',
  },

  // Bottom Spacer
  bottomSpacer: {
    height: 40,
  },

  // Password Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
  },
  modalTitle: {
    fontSize: Typography.sizes.title,
    fontFamily: Typography.fonts.serif,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.sm,
  },
  modalSubtitle: {
    fontSize: Typography.sizes.body,
    marginBottom: Spacing.lg,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: Typography.sizes.body,
    marginBottom: Spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
  },
  modalCancelBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  modalCancelText: {
    fontSize: Typography.sizes.body,
    fontFamily: Typography.fonts.sansMedium,
  },
  modalSubmitBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.md,
  },
  modalSubmitText: {
    fontSize: Typography.sizes.body,
    fontFamily: Typography.fonts.sansMedium,
    color: '#FFFFFF',
  },
});
