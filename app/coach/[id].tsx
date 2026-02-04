import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CoachIcon } from '@/components/ui/CoachIcon';
import { Coach } from '@/types';
import { getCoachById } from '@/data/coaches';
import {
  getInstalledCoaches,
  installCoach,
  uninstallCoach,
  setActiveCoachId,
  getActiveCoachId,
} from '@/store/app';

export default function CoachDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [coach, setCoach] = useState<Coach | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCoach();
  }, [id]);

  const loadCoach = async () => {
    if (!id) return;

    const coachData = getCoachById(id);
    setCoach(coachData || null);

    const installed = await getInstalledCoaches();
    const isCoachInstalled = installed.some((c) => c.coach_id === id);
    setIsInstalled(isCoachInstalled);

    const activeId = await getActiveCoachId();
    setIsActive(activeId === id);
  };

  const handleInstall = async () => {
    if (!coach) return;
    setLoading(true);
    try {
      await installCoach({
        id: Date.now().toString(),
        user_id: 'local-user',
        coach_id: coach.id,
        is_active: false,
        installed_at: new Date().toISOString(),
      });
      setIsInstalled(true);
      Alert.alert('Installed', `${coach.name} has been added to your coaches.`);
    } catch (error) {
      console.error('Error installing coach:', error);
      Alert.alert('Error', 'Failed to install coach.');
    } finally {
      setLoading(false);
    }
  };

  const handleUninstall = async () => {
    if (!coach) return;

    if (isActive) {
      Alert.alert(
        'Cannot Uninstall',
        'This is your active coach. Please set another coach as active first.'
      );
      return;
    }

    Alert.alert(
      'Uninstall Coach',
      `Are you sure you want to remove ${coach.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Uninstall',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await uninstallCoach(coach.id);
              setIsInstalled(false);
              Alert.alert('Uninstalled', `${coach.name} has been removed.`);
            } catch (error) {
              console.error('Error uninstalling coach:', error);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSetActive = async () => {
    if (!coach) return;
    setLoading(true);
    try {
      await setActiveCoachId(coach.id);
      setIsActive(true);
      Alert.alert('Active Coach', `${coach.name} is now your active coach.`);
    } catch (error) {
      console.error('Error setting active coach:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = () => {
    if (coach) {
      // Navigate to the premium Sanctuary session
      router.push(`/sanctuary/${coach.id}`);
    }
  };

  const handleBack = () => {
    router.back();
  };

  if (!coach) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.electricIndigo} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Coach Header */}
        <Animated.View
          entering={FadeInUp.duration(400)}
          style={styles.coachHeader}
        >
          <CoachIcon iconName={coach.icon_name} color={coach.color} size="lg" />
          <Text style={styles.coachName}>{coach.name}</Text>
          <Text style={styles.coachTagline}>{coach.tagline}</Text>

          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>Version {coach.version}</Text>
          </View>
        </Animated.View>

        {/* Description */}
        <Animated.View entering={FadeInUp.duration(400).delay(100)}>
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.description}>{coach.description}</Text>
          </Card>
        </Animated.View>

        {/* Method */}
        <Animated.View entering={FadeInUp.duration(400).delay(200)}>
          <Card style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Coaching Method</Text>
            <Text style={styles.method}>{coach.method}</Text>
          </Card>
        </Animated.View>

        {/* Actions */}
        <Animated.View
          entering={FadeInUp.duration(400).delay(300)}
          style={styles.actions}
        >
          {isInstalled ? (
            <>
              {/* Primary action - Enter Session */}
              <Button
                title="Enter Sanctuary"
                onPress={handleStartChat}
                variant="gold"
                fullWidth
                icon={<Ionicons name="sparkles" size={18} color={Colors.white} />}
              />

              {!isActive && (
                <Button
                  title="Set as Primary Coach"
                  onPress={handleSetActive}
                  variant="outline"
                  fullWidth
                  loading={loading}
                  style={styles.secondaryAction}
                />
              )}

              {isActive && (
                <View style={styles.activeBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
                  <Text style={styles.activeBadgeText}>Your Primary Coach</Text>
                </View>
              )}

              {!isActive && (
                <Button
                  title="Remove from Library"
                  onPress={handleUninstall}
                  variant="ghost"
                  fullWidth
                  loading={loading}
                  style={styles.secondaryAction}
                />
              )}
            </>
          ) : (
            <>
              <Button
                title="Add to Your Library"
                onPress={handleInstall}
                variant="gold"
                fullWidth
                loading={loading}
                icon={<Ionicons name="add-circle-outline" size={18} color={Colors.white} />}
              />
              <Text style={styles.installHint}>
                Install to unlock private sessions with this coach
              </Text>
            </>
          )}
        </Animated.View>

        {/* Info Footer */}
        <Animated.View
          entering={FadeIn.duration(300).delay(400)}
          style={styles.infoFooter}
        >
          <View style={styles.infoItem}>
            <Ionicons name="shield-checkmark" size={16} color={Colors.success} />
            <Text style={styles.infoText}>Verified coach</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="lock-closed" size={16} color={Colors.slateLight} />
            <Text style={styles.infoText}>Your data stays private</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.offWhite,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: Typography.sizes.body,
    color: Colors.slateGray,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: Typography.sizes.bodyLarge,
    color: Colors.electricIndigo,
    marginLeft: Spacing.xs,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  coachHeader: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  coachName: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.bold,
    color: Colors.slateCharcoal,
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  coachTagline: {
    fontSize: Typography.sizes.bodyLarge,
    color: Colors.slateGray,
    marginTop: Spacing.sm,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: Spacing.lg,
  },
  versionBadge: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.inputBg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
  },
  versionText: {
    fontSize: Typography.sizes.caption,
    color: Colors.slateGray,
    fontWeight: Typography.weights.medium,
  },
  sectionCard: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.sizes.subtitle,
    fontWeight: Typography.weights.semibold,
    color: Colors.slateCharcoal,
    marginBottom: Spacing.md,
  },
  description: {
    fontSize: Typography.sizes.body,
    color: Colors.slateGray,
    lineHeight: 22,
  },
  method: {
    fontSize: Typography.sizes.body,
    color: Colors.slateGray,
    lineHeight: 22,
  },
  actions: {
    marginTop: Spacing.lg,
  },
  secondaryAction: {
    marginTop: Spacing.md,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.successLight,
    borderRadius: Radius.pill,
    gap: Spacing.sm,
  },
  activeBadgeText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.success,
  },
  installHint: {
    marginTop: Spacing.lg,
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  infoFooter: {
    marginTop: Spacing.xxl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: Typography.sizes.caption,
    color: Colors.slateLight,
    marginLeft: Spacing.sm,
  },
});
