import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, Radius, EditorialSpacing, Shadows } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CoachIcon } from '@/components/ui/CoachIcon';
import { useAlert } from '@/contexts/AlertContext';
import {
  deleteCoachOrRequestReview,
  listMyCoaches,
  listMyDeletionRequests,
  publishCoach,
  unpublishCoach,
} from '@/lib/coaches';
import type { Coach, CoachDeletionRequest } from '@/types';

export default function ManageCoachesScreen() {
  const router = useRouter();
  const { palette, subscriptionTier } = useThemeSafe();
  const { showAlert, showToast } = useAlert();

  const [coaches, setCoaches] = useState<Coach[]>([]);
  const [requests, setRequests] = useState<CoachDeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyCoachId, setBusyCoachId] = useState<string | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [pendingDeleteCoachId, setPendingDeleteCoachId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  const canCreate = subscriptionTier === 'sovereign' || subscriptionTier === 'oracle';

  const requestsByCoachId = useMemo(() => {
    const map = new Map<string, CoachDeletionRequest>();
    for (const request of requests) {
      if (!map.has(request.coach_id)) {
        map.set(request.coach_id, request);
      }
    }
    return map;
  }, [requests]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [myCoaches, myRequests] = await Promise.all([listMyCoaches(), listMyDeletionRequests()]);
      setCoaches(myCoaches);
      setRequests(myRequests);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handlePublishToggle = async (coach: Coach) => {
    try {
      setBusyCoachId(coach.id);
      if (coach.marketplace_status === 'published' && coach.is_public) {
        await unpublishCoach(coach.id);
        showToast('Coach unpublished', { variant: 'success', message: `${coach.name} is no longer visible in marketplace.` });
      } else {
        await publishCoach(coach.id);
        showToast('Coach published', { variant: 'success', message: `${coach.name} is now visible in marketplace.` });
      }
      await load();
    } catch (error) {
      showToast('Action failed', { variant: 'error', message: error instanceof Error ? error.message : 'Try again.' });
    } finally {
      setBusyCoachId(null);
    }
  };

  const requestDeleteWithReason = async () => {
    if (!pendingDeleteCoachId) return;
    try {
      setBusyCoachId(pendingDeleteCoachId);
      await deleteCoachOrRequestReview(pendingDeleteCoachId, deleteReason);
      setDeleteModalVisible(false);
      setDeleteReason('');
      setPendingDeleteCoachId(null);
      showToast('Request submitted', {
        variant: 'success',
        message: 'Deletion request submitted for admin review.',
      });
      await load();
    } catch (error) {
      showToast('Request failed', { variant: 'error', message: error instanceof Error ? error.message : 'Try again.' });
    } finally {
      setBusyCoachId(null);
    }
  };

  const handleDelete = (coach: Coach) => {
    showAlert(
      'Delete coach',
      `Delete ${coach.name}? If other users have installed this coach, a deletion request will be created instead.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: async () => {
            try {
              setBusyCoachId(coach.id);
              await deleteCoachOrRequestReview(coach.id);
              showToast('Coach deleted', { variant: 'success', message: `${coach.name} has been deleted.` });
              await load();
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Unable to delete coach.';
              if (message.toLowerCase().includes('reason')) {
                setPendingDeleteCoachId(coach.id);
                setDeleteReason('');
                setDeleteModalVisible(true);
              } else {
                showToast('Delete failed', { variant: 'error', message });
              }
            } finally {
              setBusyCoachId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={palette.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Coach Studio</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Card variant="glass" style={styles.heroCard}>
          <Text style={[styles.heroTitle, { color: palette.textPrimary }]}>Create, publish, and manage your coaches</Text>
          <Text style={[styles.heroBody, { color: palette.textTertiary }]}>Published coaches appear in the marketplace. Installed users keep their existing snapshot version.</Text>
          <Button
            title={canCreate ? 'Create Coach' : 'Upgrade to Create Coaches'}
            variant="gold"
            size="md"
            onPress={() => (canCreate ? router.push('/coach/create') : router.push('/paywall'))}
            style={styles.heroButton}
          />
        </Card>

        <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>My Coaches</Text>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={palette.accent} />
          </View>
        ) : coaches.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={[styles.emptyTitle, { color: palette.textPrimary }]}>No custom coaches yet</Text>
            <Text style={[styles.emptyBody, { color: palette.textTertiary }]}>Create your first coach to publish it to the marketplace.</Text>
          </Card>
        ) : (
          coaches.map((coach) => {
            const request = requestsByCoachId.get(coach.id);
            const isBusy = busyCoachId === coach.id;

            return (
              <Card key={coach.id} style={styles.coachCard}>
                <View style={styles.coachHeaderRow}>
                  <CoachIcon iconName={coach.icon_name} color={coach.color} size="md" />
                  <View style={styles.coachMeta}>
                    <Text style={[styles.coachName, { color: palette.textPrimary }]}>{coach.name}</Text>
                    <Text style={[styles.coachStatus, { color: palette.textTertiary }]}>
                      {coach.marketplace_status === 'published' ? 'Published' : 'Draft/Unpublished'}
                    </Text>
                  </View>
                </View>

                {request ? (
                  <View style={[styles.requestBadge, { backgroundColor: palette.warningLight }]}> 
                    <Text style={[styles.requestText, { color: palette.warning }]}>Deletion request: {request.status}</Text>
                  </View>
                ) : null}

                <View style={styles.actionRow}>
                  <Button
                    title="Edit"
                    variant="outline"
                    size="sm"
                    onPress={() => router.push({ pathname: '/coach/create', params: { coachId: coach.id } })}
                    style={styles.actionButton}
                  />
                  <Button
                    title={coach.marketplace_status === 'published' && coach.is_public ? 'Unpublish' : 'Publish'}
                    variant="gold"
                    size="sm"
                    onPress={() => {
                      void handlePublishToggle(coach);
                    }}
                    loading={isBusy}
                    style={styles.actionButton}
                  />
                  <Button
                    title="Delete"
                    variant="ghost"
                    size="sm"
                    onPress={() => handleDelete(coach)}
                    loading={isBusy}
                    style={styles.actionButton}
                  />
                </View>
              </Card>
            );
          })
        )}

        <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>Deletion Requests</Text>
        {requests.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={[styles.emptyBody, { color: palette.textTertiary }]}>No deletion requests yet.</Text>
          </Card>
        ) : (
          requests.map((request) => (
            <Card key={request.id} style={styles.requestCard}>
              <Text style={[styles.requestCoachId, { color: palette.textSecondary }]}>Coach: {request.coach_id}</Text>
              <Text style={[styles.requestStatus, { color: palette.textPrimary }]}>Status: {request.status}</Text>
              {request.admin_reason ? (
                <Text style={[styles.requestAdminReason, { color: palette.textTertiary }]}>Admin note: {request.admin_reason}</Text>
              ) : null}
            </Card>
          ))
        )}
      </ScrollView>

      <Modal visible={deleteModalVisible} transparent animationType="fade" onRequestClose={() => setDeleteModalVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: palette.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: palette.cardBg }]}> 
            <Text style={[styles.modalTitle, { color: palette.textPrimary }]}>Request coach deletion</Text>
            <Text style={[styles.modalBody, { color: palette.textTertiary }]}>Explain why this coach should be removed from marketplace.</Text>
            <TextInput
              value={deleteReason}
              onChangeText={setDeleteReason}
              placeholder="Reason for deletion request"
              placeholderTextColor={palette.textTertiary}
              style={[styles.modalInput, { borderColor: palette.border, color: palette.textPrimary }]}
              multiline
            />
            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="outline"
                size="sm"
                onPress={() => {
                  setDeleteModalVisible(false);
                  setPendingDeleteCoachId(null);
                }}
                style={styles.modalActionBtn}
              />
              <Button
                title="Submit"
                variant="gold"
                size="sm"
                onPress={() => {
                  void requestDeleteWithReason();
                }}
                style={styles.modalActionBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: Typography.sizes.title,
    fontFamily: Typography.fonts.serif,
    fontWeight: Typography.weights.bold,
  },
  headerSpacer: { width: 40 },
  scrollContent: {
    paddingHorizontal: EditorialSpacing.breathingMargin,
    paddingBottom: Spacing.xxxl,
  },
  heroCard: {
    marginBottom: Spacing.xl,
    ...Shadows.sm,
  },
  heroTitle: {
    fontSize: Typography.sizes.subtitle,
    fontFamily: Typography.fonts.serif,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.sm,
  },
  heroBody: {
    fontSize: Typography.sizes.body,
    lineHeight: 22,
  },
  heroButton: {
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.sizes.caption,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wide,
    marginBottom: Spacing.md,
    fontFamily: Typography.fonts.sansSemibold,
  },
  loadingWrap: {
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  emptyCard: {
    marginBottom: Spacing.lg,
  },
  emptyTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontFamily: Typography.fonts.serif,
    marginBottom: Spacing.sm,
  },
  emptyBody: {
    fontSize: Typography.sizes.body,
  },
  coachCard: {
    marginBottom: Spacing.md,
  },
  coachHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  coachMeta: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  coachName: {
    fontSize: Typography.sizes.bodyLarge,
    fontFamily: Typography.fonts.serif,
    fontWeight: Typography.weights.semibold,
  },
  coachStatus: {
    fontSize: Typography.sizes.caption,
    marginTop: 2,
  },
  requestBadge: {
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    alignSelf: 'flex-start',
    marginBottom: Spacing.md,
  },
  requestText: {
    fontSize: Typography.sizes.caption,
    fontFamily: Typography.fonts.sansSemibold,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  requestCard: {
    marginBottom: Spacing.sm,
  },
  requestCoachId: {
    fontSize: Typography.sizes.caption,
    marginBottom: Spacing.xs,
  },
  requestStatus: {
    fontSize: Typography.sizes.body,
    marginBottom: Spacing.xs,
  },
  requestAdminReason: {
    fontSize: Typography.sizes.caption,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  modalCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  modalTitle: {
    fontSize: Typography.sizes.subtitle,
    fontFamily: Typography.fonts.serif,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.sm,
  },
  modalBody: {
    fontSize: Typography.sizes.body,
    marginBottom: Spacing.md,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    minHeight: 110,
    padding: Spacing.md,
    textAlignVertical: 'top',
    fontSize: Typography.sizes.body,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  modalActionBtn: {
    flex: 1,
  },
});
