import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
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
import { Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { GoldDustLoader } from '@/components/ui/GoldDustLoader';
import { AtmosphereGallery } from '@/components/settings/AtmosphereGallery';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useAuthSafe } from '@/hooks/useConditionalAuth';
import { useThemeSafe } from '@/contexts/ThemeContext';

interface UserProfile {
  email: string;
  fullName: string;
  avatarInitial: string;
}

export default function AccountScreen() {
  const router = useRouter();
  const { palette, isSovereignMember, setSovereignMember } = useThemeSafe();
  const auth = useAuthSafe();

  const [profile, setProfile] = useState<UserProfile>({
    email: '',
    fullName: '',
    avatarInitial: 'U',
  });
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Animation values
  const headerScale = useSharedValue(1);

  useEffect(() => {
    if (auth?.user) {
      const email = auth.user.email || '';
      const metadata = auth.user.user_metadata || {};
      const name = metadata.full_name || metadata.name || email.split('@')[0] || 'User';

      setProfile({
        email,
        fullName: name,
        avatarInitial: name.charAt(0).toUpperCase(),
      });
      setEditedName(name);

      // Check if user has sovereign membership (you would typically check this from your subscription service)
      // For now, we'll check a user metadata flag
      const hasSovereign = metadata.is_sovereign === true;
      setSovereignMember(hasSovereign);
    }
  }, [auth?.user, setSovereignMember]);

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleEditProfile = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditedName(profile.fullName);
    setIsEditing(false);
  };

  const handleSaveProfile = async () => {
    if (!editedName.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert('Invalid Name', 'Please enter your name');
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
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    Alert.alert(
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
    // Navigate to subscription/paywall screen
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Sovereign Membership Required',
      'Unlock premium atmospheres and exclusive features with Sovereign membership.',
      [
        { text: 'Maybe Later', style: 'cancel' },
        {
          text: 'Learn More',
          onPress: () => {
            // Navigate to subscription screen when available
            console.log('Navigate to subscription');
          }
        },
      ]
    );
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

      Alert.alert(
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

  // If no auth configured, show guest account
  if (!isSupabaseConfigured || !auth?.isAuthenticated) {
    return (
      <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top', 'bottom']}>
        <View style={styles.guestContainer}>
          <Animated.View entering={FadeIn.duration(500)} style={styles.guestContent}>
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
              Sign in to access your profile, sync your progress, and unlock personalized features.
            </Text>
            <Button
              title="Sign In"
              onPress={() => router.push('/(auth)/login')}
              variant="gold"
              size="lg"
              fullWidth
              style={styles.guestButton}
            />
            <TouchableOpacity onPress={handleBack} style={styles.guestBackButton}>
              <Text style={[styles.guestBackText, { color: palette.textTertiary }]}>Go Back</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, dynamicStyles.container]} edges={['top']}>
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

            <View style={[styles.subscriptionCard, { borderColor: palette.borderAccent }]}>
              <LinearGradient
                colors={[palette.accentMuted, `${palette.accent}08`]}
                style={styles.subscriptionGradient}
              >
                <View style={styles.subscriptionHeader}>
                  <View style={[styles.subscriptionIcon, { backgroundColor: palette.accentMuted }]}>
                    <Ionicons name="diamond" size={24} color={palette.accent} />
                  </View>
                  <View style={styles.subscriptionInfo}>
                    <Text style={[styles.subscriptionTitle, { color: palette.textSecondary }]}>
                      {isSovereignMember ? 'Sovereign Plan' : 'Premium Plan'}
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
                    <Text style={[styles.featureText, { color: palette.textSecondary }]}>Unlimited AI coaching sessions</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark" size={16} color={palette.success} />
                    <Text style={[styles.featureText, { color: palette.textSecondary }]}>All premium coaches</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark" size={16} color={palette.success} />
                    <Text style={[styles.featureText, { color: palette.textSecondary }]}>
                      {isSovereignMember ? 'All premium atmospheres' : 'Priority support'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={handleManageSubscription}
                  style={[styles.manageButton, { borderTopColor: palette.borderAccent }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.manageButtonText, { color: palette.accent }]}>Manage Subscription</Text>
                  <Ionicons name="arrow-forward" size={14} color={palette.accent} />
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </Animated.View>

          {/* Security Section */}
          <Animated.View entering={FadeInUp.duration(500).delay(400)}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, dynamicStyles.sectionTitle]}>Security</Text>
            </View>

            <View style={[styles.settingsCard, { backgroundColor: palette.cardBg }]}>
              <TouchableOpacity style={styles.settingItemClickable}>
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
            <Text style={[styles.appVersion, { color: palette.textTertiary }]}>Coachgenie v1.0.0</Text>
            <Text style={[styles.appCopyright, { color: palette.textTertiary }]}>© 2024 Coachgenie. All rights reserved.</Text>
          </Animated.View>

          {/* Bottom Spacer */}
          <View style={styles.bottomSpacer} />
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
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
  },
  headerSpacer: {
    width: 44,
  },

  // Profile Card
  profileCard: {
    marginHorizontal: Spacing.xxl,
    borderRadius: Radius.squircle,
    overflow: 'hidden',
    marginBottom: Spacing.xxl,
    ...Shadows.lg,
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
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    marginBottom: Spacing.xs,
  },
  profileEmail: {
    fontSize: Typography.sizes.body,
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

  // Section Headers
  sectionHeader: {
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.widest,
  },

  // Settings Card
  settingsCard: {
    marginHorizontal: Spacing.xxl,
    borderRadius: Radius.lg,
    marginBottom: Spacing.xxl,
    ...Shadows.subtle,
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
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wide,
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

  // Subscription Card
  subscriptionCard: {
    marginHorizontal: Spacing.xxl,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.xxl,
    borderWidth: 1,
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
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
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
    marginBottom: Spacing.xxl,
    paddingHorizontal: Spacing.xxl,
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
    fontWeight: Typography.weights.semibold,
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
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
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
});
