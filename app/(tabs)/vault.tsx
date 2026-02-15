import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { PremiumPageTransition } from '@/components/ui/PremiumPageTransition';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, Radius } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { ContextVault, Goal, AVAILABLE_VALUES } from '@/types';
import { getContextVault, saveContextVault } from '@/store/app';

export default function VaultScreen() {
  const { palette } = useThemeSafe();
  const [vault, setVault] = useState<ContextVault | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [tempValues, setTempValues] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setHasError(false);
      const data = await getContextVault();
      setVault(data);
    } catch (error) {
      console.error('Error loading vault:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleEditValues = () => {
    if (vault) {
      setTempValues([...vault.values]);
      setEditingSection('values');
    }
  };

  const handleSaveValues = async () => {
    if (vault) {
      const updated = { ...vault, values: tempValues, updated_at: new Date().toISOString() };
      await saveContextVault(updated);
      setVault(updated);
      setEditingSection(null);
    }
  };

  const toggleValue = (value: string) => {
    setTempValues((prev) => {
      if (prev.includes(value)) {
        return prev.filter((v) => v !== value);
      }
      if (prev.length >= 5) return prev;
      return [...prev, value];
    });
  };

  const handleUpdateGoal = async (goalId: string, updates: Partial<Goal>) => {
    if (vault) {
      const updatedGoals = vault.goals.map((g) =>
        g.id === goalId ? { ...g, ...updates } : g
      );
      const updated = { ...vault, goals: updatedGoals, updated_at: new Date().toISOString() };
      await saveContextVault(updated);
      setVault(updated);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={palette.accent} style={{ marginBottom: Spacing.md }} />
          <Text style={[styles.loadingText, { color: palette.textTertiary }]}>Loading your vault...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error or empty state - show setup prompt
  if (!vault || hasError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <PremiumPageTransition>
          <View style={styles.emptyStateContainer}>
            <View style={[styles.emptyStateIcon, { backgroundColor: palette.accentMuted }]}>
              <Ionicons name="diamond-outline" size={48} color={palette.accent} />
            </View>
            <Text style={[styles.emptyStateTitle, { color: palette.textPrimary }]}>
              Set Up Your Context Vault
            </Text>
            <Text style={[styles.emptyStateText, { color: palette.textTertiary }]}>
              Your Context Vault stores your values, goals, and preferences to personalize your coaching experience.
            </Text>
            <Button
              title="Start Setup"
              onPress={async () => {
                // Initialize with default vault
                const defaultVault: ContextVault = {
                  id: 'local-vault',
                  user_id: 'local-user',
                  values: [],
                  goals: [],
                  constraints: {
                    available_hours_per_day: 4,
                    energy_level: 'medium',
                    best_time_for_focus: 'morning',
                  },
                  preferences: {
                    tone: 50,
                    directness: 50,
                    response_length: 'balanced',
                  },
                  updated_at: new Date().toISOString(),
                };
                await saveContextVault(defaultVault);
                setVault(defaultVault);
              }}
              variant="gold"
              size="lg"
            />
            {hasError && (
              <TouchableOpacity onPress={loadData} style={styles.retryButton}>
                <Text style={[styles.retryText, { color: palette.accent }]}>Try Again</Text>
              </TouchableOpacity>
            )}
          </View>
        </PremiumPageTransition>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      <PremiumPageTransition>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={palette.accent}
            />
          }
        >
          {/* Header */}
          <Animated.View entering={FadeInUp.duration(400)} style={styles.header}>
            <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Context Vault</Text>
            <Text style={[styles.headerSubtitle, { color: palette.textTertiary }]}>
              Your identity and goals that shape coaching
            </Text>
          </Animated.View>

          {/* ... existing content ... */}

          {/* Values Section */}
          <View>
            {editingSection === 'values' ? (
              <View key="edit-values">
                <Card style={[styles.sectionCard, { borderColor: palette.accent, borderWidth: 1 }]}>
                  <View style={styles.sectionHeader}>
                    <View>
                      <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>Edit Values</Text>
                      <Text style={[styles.sectionSubtitle, { color: palette.textTertiary }]}>
                        Select up to 5 core values
                      </Text>
                    </View>
                  </View>

                  <View style={styles.chipsContainer}>
                    {AVAILABLE_VALUES.map((value) => {
                      const isSelected = tempValues.includes(value);
                      return (
                        <Chip
                          key={value}
                          label={value}
                          selected={isSelected}
                          onPress={() => toggleValue(value)}
                          style={{ marginBottom: Spacing.sm, marginRight: Spacing.sm }}
                        />
                      );
                    })}
                  </View>

                  <View style={styles.editActions}>
                    <Button
                      title="Cancel"
                      variant="ghost"
                      onPress={() => setEditingSection(null)}
                      size="sm"
                    />
                    <Button
                      title="Save Changes"
                      variant="gold"
                      onPress={handleSaveValues}
                      size="sm"
                      icon={<Ionicons name="checkmark" size={16} color={palette.textInverse} />}
                      disabled={tempValues.length === 0}
                    />
                  </View>
                </Card>
              </View>
            ) : (
              <View key="view-values">
                <Card style={styles.sectionCard}>
                  <View style={styles.sectionHeader}>
                    <View>
                      <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>Core Values</Text>
                      <Text style={[styles.sectionSubtitle, { color: palette.textTertiary }]}>
                        The principles that drive you
                      </Text>
                    </View>
                    <TouchableOpacity onPress={handleEditValues} style={{ padding: Spacing.sm }}>
                      <Ionicons name="pencil" size={18} color={palette.accent} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.valuesDisplay}>
                    {vault.values.map((value) => (
                      <View key={value} style={[styles.valueBadge, { backgroundColor: palette.backgroundSecondary }]}>
                        <Text style={[styles.valueBadgeText, { color: palette.textSecondary }]}>{value}</Text>
                      </View>
                    ))}
                    {vault.values.length === 0 && (
                      <Text style={[styles.emptyText, { color: palette.textTertiary }]}>No values set</Text>
                    )}
                  </View>
                </Card>
              </View>
            )}
          </View>

          {/* Goals Section */}
          <Animated.View entering={FadeInUp.duration(400).delay(200)}>
            <Card style={styles.sectionCard}>
              {/* ... */}
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>Goals</Text>
                  <Text style={[styles.sectionSubtitle, { color: palette.textTertiary }]}>
                    What you&apos;re working toward
                  </Text>
                </View>
              </View>

              <View style={styles.goalsList}>
                {vault.goals.map((goal) => (
                  <GoalItem
                    key={goal.id}
                    goal={goal}
                    onUpdate={(updates) => handleUpdateGoal(goal.id, updates)}
                  />
                ))}
                {vault.goals.length === 0 && (
                  <Text style={[styles.emptyText, { color: palette.textTertiary }]}>No goals set yet</Text>
                )}
              </View>
            </Card>
          </Animated.View>

          {/* Constraints Section */}
          <Animated.View entering={FadeInUp.duration(400).delay(300)}>
            <Card style={styles.sectionCard}>
              {/* ... */}
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>Constraints</Text>
                  <Text style={[styles.sectionSubtitle, { color: palette.textTertiary }]}>
                    Your time and energy limits
                  </Text>
                </View>
              </View>

              <View style={styles.constraintsList}>
                <ConstraintItem
                  icon="time-outline"
                  label="Daily focus time"
                  value={`${vault.constraints.available_hours_per_day} hours`}
                />
                <ConstraintItem
                  icon="battery-half-outline"
                  label="Energy level"
                  value={vault.constraints.energy_level.charAt(0).toUpperCase() +
                    vault.constraints.energy_level.slice(1)}
                />
                <ConstraintItem
                  icon="sunny-outline"
                  label="Best time for focus"
                  value={vault.constraints.best_time_for_focus.charAt(0).toUpperCase() +
                    vault.constraints.best_time_for_focus.slice(1)}
                />
              </View>
            </Card>
          </Animated.View>

          {/* Preferences Section */}
          <Animated.View entering={FadeInUp.duration(400).delay(400)}>
            <Card style={styles.sectionCard}>
              {/* ... */}
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={[styles.sectionTitle, { color: palette.textSecondary }]}>Coaching Style</Text>
                  <Text style={[styles.sectionSubtitle, { color: palette.textTertiary }]}>
                    How you like to be coached
                  </Text>
                </View>
              </View>

              <View style={styles.preferencesList}>
                <PreferenceItem
                  label="Tone"
                  value={vault.preferences.tone}
                  leftLabel="Gentle"
                  rightLabel="Direct"
                />
                <PreferenceItem
                  label="Directness"
                  value={vault.preferences.directness}
                  leftLabel="Nurturing"
                  rightLabel="Challenging"
                />
                <View style={styles.responseLengthItem}>
                  <Text style={[styles.prefLabel, { color: palette.textSecondary }]}>Response length</Text>
                  <View style={[styles.responseLengthBadge, { backgroundColor: palette.backgroundSecondary }]}>
                    <Text style={[styles.responseLengthText, { color: palette.textSecondary }]}>
                      {vault.preferences.response_length.charAt(0).toUpperCase() +
                        vault.preferences.response_length.slice(1)}
                    </Text>
                  </View>
                </View>
              </View>
            </Card>
          </Animated.View>

          {/* Last Updated */}
          <Animated.View entering={FadeIn.duration(300).delay(500)}>
            <Text style={[styles.lastUpdated, { color: palette.textTertiary }]}>
              Last updated:{' '}
              {new Date(vault.updated_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>
          </Animated.View>
        </ScrollView>
      </PremiumPageTransition>
    </SafeAreaView>
  );
}

function GoalItem({
  goal,
  onUpdate,
}: {
  goal: Goal;
  onUpdate: (updates: Partial<Goal>) => void;
}) {
  const { palette } = useThemeSafe();
  return (
    <View style={[styles.goalItem, { backgroundColor: palette.backgroundSecondary }]}>
      <View style={styles.goalHeader}>
        {goal.is_30_day_focus && (
          <Ionicons
            name="star"
            size={16}
            color={palette.warning}
            style={styles.goalStar}
          />
        )}
        <Text style={[styles.goalTitle, { color: palette.textSecondary }]}>{goal.title}</Text>
      </View>
      {goal.is_30_day_focus && (
        <View style={[styles.focusBadge, { backgroundColor: palette.warningLight }]}>
          <Text style={[styles.focusBadgeText, { color: palette.warning }]}>30-Day Focus</Text>
        </View>
      )}
    </View>
  );
}

function ConstraintItem({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const { palette } = useThemeSafe();
  return (
    <View style={styles.constraintItem}>
      <Ionicons name={icon} size={20} color={palette.textTertiary} />
      <Text style={[styles.constraintLabel, { color: palette.textTertiary }]}>{label}</Text>
      <Text style={[styles.constraintValue, { color: palette.textSecondary }]}>{value}</Text>
    </View>
  );
}

function PreferenceItem({
  label,
  value,
  leftLabel,
  rightLabel,
}: {
  label: string;
  value: number;
  leftLabel: string;
  rightLabel: string;
}) {
  const { palette } = useThemeSafe();
  return (
    <View style={styles.preferenceItem}>
      <Text style={[styles.prefLabel, { color: palette.textSecondary }]}>{label}</Text>
      <View style={styles.prefBarContainer}>
        <Text style={[styles.prefBarLabel, { color: palette.textTertiary }]}>{leftLabel}</Text>
        <View style={[styles.prefBar, { backgroundColor: palette.border }]}>
          <View style={[styles.prefBarFill, { width: `${value}%`, backgroundColor: palette.accent }]} />
        </View>
        <Text style={[styles.prefBarLabel, { color: palette.textTertiary }]}>{rightLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: Typography.sizes.body,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 200,
  },
  header: {
    paddingVertical: Spacing.lg,
  },
  headerTitle: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.bold,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    fontSize: Typography.sizes.body,
  },
  sectionCard: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: Typography.sizes.subtitle,
    fontWeight: Typography.weights.semibold,
  },
  sectionSubtitle: {
    fontSize: Typography.sizes.caption,
    marginTop: Spacing.xs,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: Spacing.md,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  valuesDisplay: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  valueBadge: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
  },
  valueBadgeText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
  },
  goalsList: {
    gap: Spacing.md,
  },
  goalItem: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
  },
  goalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalStar: {
    marginRight: Spacing.sm,
  },
  goalTitle: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    flex: 1,
  },
  focusBadge: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
    marginTop: Spacing.sm,
  },
  focusBadgeText: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
  },
  emptyText: {
    fontSize: Typography.sizes.body,
    fontStyle: 'italic',
  },
  constraintsList: {
    gap: Spacing.md,
  },
  constraintItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  constraintLabel: {
    flex: 1,
    fontSize: Typography.sizes.body,
    marginLeft: Spacing.md,
  },
  constraintValue: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
  },
  preferencesList: {
    gap: Spacing.lg,
  },
  preferenceItem: {},
  prefLabel: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    marginBottom: Spacing.sm,
  },
  prefBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prefBarLabel: {
    fontSize: Typography.sizes.caption,
    width: 70,
  },
  prefBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    marginHorizontal: Spacing.sm,
    overflow: 'hidden',
  },
  prefBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  responseLengthItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  responseLengthBadge: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
  },
  responseLengthText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
  },
  lastUpdated: {
    fontSize: Typography.sizes.caption,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
  // Empty State
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  emptyStateIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  emptyStateTitle: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.bold,
    fontFamily: Typography.fonts.serif,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  emptyStateText: {
    fontSize: Typography.sizes.body,
    textAlign: 'center',
    lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed,
    marginBottom: Spacing.xxl,
  },
  retryButton: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
  },
  retryText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
  },
});
