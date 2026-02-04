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
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { Button } from '@/components/ui/Button';
import { GoldDustLoader } from '@/components/ui/GoldDustLoader';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

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

interface UserProfile {
  email: string;
  fullName: string;
  avatarInitial: string;
}

export default function AccountScreen() {
  const router = useRouter();
  const useAuth = getAuthHook();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const auth = useAuth && isSupabaseConfigured ? useAuth() : null;

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
    }
  }, [auth?.user]);

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

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: headerScale.value }],
  }));

  // Show loading state while signing out
  if (isSigningOut) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
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
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.guestContainer}>
          <Animated.View entering={FadeIn.duration(500)} style={styles.guestContent}>
            <View style={styles.guestIconContainer}>
              <LinearGradient
                colors={[Colors.stoneGray, '#A8A39D']}
                style={styles.guestIconBg}
              >
                <Ionicons name="person-outline" size={40} color={Colors.white} />
              </LinearGradient>
            </View>
            <Text style={styles.guestTitle}>Guest Account</Text>
            <Text style={styles.guestText}>
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
              <Text style={styles.guestBackText}>Go Back</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <Ionicons name="arrow-back" size={22} color={Colors.charcoal} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Account</Text>
            <View style={styles.headerSpacer} />
          </Animated.View>

          {/* Profile Card */}
          <Animated.View entering={FadeIn.duration(600).delay(100)}>
            <View style={styles.profileCard}>
              <LinearGradient
                colors={[Colors.midnightEmerald, '#243D2E']}
                style={styles.profileGradient}
              >
                <Animated.View style={[styles.avatarContainer, headerAnimatedStyle]}>
                  <LinearGradient
                    colors={[Colors.burnishedGold, Colors.goldLight]}
                    style={styles.avatarGradient}
                  >
                    <Text style={styles.avatarText}>{profile.avatarInitial}</Text>
                  </LinearGradient>
                </Animated.View>
                <Text style={styles.profileName}>{profile.fullName}</Text>
                <Text style={styles.profileEmail}>{profile.email}</Text>
                <View style={styles.memberBadge}>
                  <Ionicons name="sparkles" size={14} color={Colors.burnishedGold} />
                  <Text style={styles.memberText}>Premium Member</Text>
                </View>
              </LinearGradient>
            </View>
          </Animated.View>

          {/* Edit Profile Section */}
          <Animated.View entering={FadeInUp.duration(500).delay(200)}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Profile Settings</Text>
            </View>

            <View style={styles.settingsCard}>
              {/* Name Field */}
              <View style={styles.settingItem}>
                <View style={styles.settingIcon}>
                  <Ionicons name="person-outline" size={20} color={Colors.burnishedGold} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingLabel}>Display Name</Text>
                  {isEditing ? (
                    <TextInput
                      style={styles.settingInput}
                      value={editedName}
                      onChangeText={setEditedName}
                      placeholder="Enter your name"
                      placeholderTextColor={Colors.stoneGray}
                      autoFocus
                    />
                  ) : (
                    <Text style={styles.settingValue}>{profile.fullName}</Text>
                  )}
                </View>
                {!isEditing && (
                  <TouchableOpacity onPress={handleEditProfile} style={styles.editButton}>
                    <Ionicons name="pencil" size={16} color={Colors.burnishedGold} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Email Field (Read-only) */}
              <View style={styles.settingItem}>
                <View style={styles.settingIcon}>
                  <Ionicons name="mail-outline" size={20} color={Colors.burnishedGold} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingLabel}>Email Address</Text>
                  <Text style={styles.settingValue}>{profile.email}</Text>
                </View>
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
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
              <Text style={styles.sectionTitle}>Subscription</Text>
            </View>

            <View style={styles.subscriptionCard}>
              <LinearGradient
                colors={[Colors.goldMuted, 'rgba(197, 160, 89, 0.05)']}
                style={styles.subscriptionGradient}
              >
                <View style={styles.subscriptionHeader}>
                  <View style={styles.subscriptionIcon}>
                    <Ionicons name="diamond" size={24} color={Colors.burnishedGold} />
                  </View>
                  <View style={styles.subscriptionInfo}>
                    <Text style={styles.subscriptionTitle}>Premium Plan</Text>
                    <Text style={styles.subscriptionStatus}>Active</Text>
                  </View>
                  <View style={styles.subscriptionBadge}>
                    <Text style={styles.subscriptionBadgeText}>CURRENT</Text>
                  </View>
                </View>
                <View style={styles.subscriptionFeatures}>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark" size={16} color={Colors.success} />
                    <Text style={styles.featureText}>Unlimited AI coaching sessions</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark" size={16} color={Colors.success} />
                    <Text style={styles.featureText}>All premium coaches</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Ionicons name="checkmark" size={16} color={Colors.success} />
                    <Text style={styles.featureText}>Priority support</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.manageButton}>
                  <Text style={styles.manageButtonText}>Manage Subscription</Text>
                  <Ionicons name="arrow-forward" size={14} color={Colors.burnishedGold} />
                </TouchableOpacity>
              </LinearGradient>
            </View>
          </Animated.View>

          {/* Security Section */}
          <Animated.View entering={FadeInUp.duration(500).delay(400)}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Security</Text>
            </View>

            <View style={styles.settingsCard}>
              <TouchableOpacity style={styles.settingItemClickable}>
                <View style={styles.settingIcon}>
                  <Ionicons name="lock-closed-outline" size={20} color={Colors.burnishedGold} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingLabel}>Change Password</Text>
                  <Text style={styles.settingDescription}>Update your account password</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.stoneGray} />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Sign Out Button */}
          <Animated.View entering={FadeInUp.duration(500).delay(500)} style={styles.signOutSection}>
            <TouchableOpacity
              onPress={handleSignOut}
              style={styles.signOutButton}
              activeOpacity={0.8}
            >
              <View style={styles.signOutContent}>
                <Ionicons name="log-out-outline" size={20} color={Colors.error} />
                <Text style={styles.signOutText}>Sign Out</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* App Info */}
          <Animated.View entering={FadeIn.duration(400).delay(600)} style={styles.appInfo}>
            <Text style={styles.appVersion}>Coachgenie v1.0.0</Text>
            <Text style={styles.appCopyright}>© 2024 Coachgenie. All rights reserved.</Text>
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
    backgroundColor: Colors.warmOatmeal,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.section,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.warmOatmeal,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xxl,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.subtle,
  },
  headerTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    color: Colors.midnightEmerald,
    fontFamily: Typography.fonts.serif,
  },
  headerSpacer: {
    width: 44,
  },

  // Profile Card
  profileCard: {
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
    ...Shadows.gold,
  },
  avatarText: {
    fontSize: Typography.sizes.display,
    fontWeight: Typography.weights.bold,
    color: Colors.white,
    fontFamily: Typography.fonts.serif,
  },
  profileName: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
    fontFamily: Typography.fonts.serif,
    marginBottom: Spacing.xs,
  },
  profileEmail: {
    fontSize: Typography.sizes.body,
    color: Colors.goldLight,
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
    color: Colors.burnishedGold,
    fontWeight: Typography.weights.medium,
    letterSpacing: Typography.letterSpacing.wide,
  },

  // Section Headers
  sectionHeader: {
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    color: Colors.stoneGray,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.widest,
  },

  // Settings Card
  settingsCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.lg,
    marginBottom: Spacing.xxl,
    ...Shadows.subtle,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
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
    backgroundColor: Colors.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wide,
  },
  settingValue: {
    fontSize: Typography.sizes.bodyLarge,
    color: Colors.charcoal,
    fontWeight: Typography.weights.medium,
  },
  settingInput: {
    fontSize: Typography.sizes.bodyLarge,
    color: Colors.charcoal,
    fontWeight: Typography.weights.medium,
    padding: 0,
    borderBottomWidth: 1,
    borderBottomColor: Colors.burnishedGold,
    paddingBottom: Spacing.xs,
  },
  settingDescription: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.goldMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.successLight,
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
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.xxl,
    borderWidth: 1,
    borderColor: Colors.borderGold,
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
    backgroundColor: Colors.goldMuted,
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
    color: Colors.charcoal,
    fontFamily: Typography.fonts.serif,
  },
  subscriptionStatus: {
    fontSize: Typography.sizes.caption,
    color: Colors.success,
    fontWeight: Typography.weights.medium,
  },
  subscriptionBadge: {
    backgroundColor: Colors.burnishedGold,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
  },
  subscriptionBadgeText: {
    fontSize: Typography.sizes.micro,
    color: Colors.white,
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
    color: Colors.charcoal,
  },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderGold,
    marginTop: Spacing.md,
  },
  manageButtonText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    color: Colors.burnishedGold,
  },

  // Sign Out
  signOutSection: {
    marginBottom: Spacing.xxl,
  },
  signOutButton: {
    backgroundColor: Colors.errorLight,
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
    color: Colors.error,
  },

  // App Info
  appInfo: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  appVersion: {
    fontSize: Typography.sizes.caption,
    color: Colors.stoneGray,
    marginBottom: Spacing.xs,
  },
  appCopyright: {
    fontSize: Typography.sizes.micro,
    color: Colors.stoneGray,
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
    color: Colors.midnightEmerald,
    fontFamily: Typography.fonts.serif,
    marginBottom: Spacing.md,
  },
  guestText: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
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
    color: Colors.stoneGray,
    textDecorationLine: 'underline',
  },

  // Bottom Spacer
  bottomSpacer: {
    height: 40,
  },
});
