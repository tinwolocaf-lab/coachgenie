import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
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

  const loadData = useCallback(async () => {
    try {
      const data = await getContextVault();
      setVault(data);
    } catch (error) {
      console.error('Error loading vault:', error);
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

  if (!vault) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
        <View style={styles.loading}>
          <Text style={[styles.loadingText, { color: palette.textTertiary }]}>Loading your vault...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
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

        {/* Values Section */}
        <Animated.View entering={FadeInUp.duration(400).delay(100)}>
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Core Values</Text>
                <Text style={styles.sectionSubtitle}>
                  What drives your decisions
                </Text>
              </View>
              {editingSection !== 'values' && (
                <TouchableOpacity onPress={handleEditValues}>
                  <Ionicons name="pencil" size={20} color={Colors.electricIndigo} />
                </TouchableOpacity>
              )}
            </View>

            {editingSection === 'values' ? (
              <>
                <View style={styles.chipsContainer}>
                  {AVAILABLE_VALUES.map((value) => (
                    <Chip
                      key={value}
                      label={value}
                      selected={tempValues.includes(value)}
                      onPress={() => toggleValue(value)}
                      disabled={
                        !tempValues.includes(value) && tempValues.length >= 5
                      }
                    />
                  ))}
                </View>
                <View style={styles.editActions}>
                  <Button
                    title="Cancel"
                    onPress={() => setEditingSection(null)}
                    variant="ghost"
                    size="sm"
                  />
                  <Button
                    title="Save"
                    onPress={handleSaveValues}
                    size="sm"
                  />
                </View>
              </>
            ) : (
              <View style={styles.valuesDisplay}>
                {vault.values.map((value) => (
                  <View key={value} style={styles.valueBadge}>
                    <Text style={styles.valueBadgeText}>{value}</Text>
                  </View>
                ))}
              </View>
            )}
          </Card>
        </Animated.View>

        {/* Goals Section */}
        <Animated.View entering={FadeInUp.duration(400).delay(200)}>
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Goals</Text>
                <Text style={styles.sectionSubtitle}>
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
                <Text style={styles.emptyText}>No goals set yet</Text>
              )}
            </View>
          </Card>
        </Animated.View>

        {/* Constraints Section */}
        <Animated.View entering={FadeInUp.duration(400).delay(300)}>
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Constraints</Text>
                <Text style={styles.sectionSubtitle}>
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
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Coaching Style</Text>
                <Text style={styles.sectionSubtitle}>
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
                <Text style={styles.prefLabel}>Response length</Text>
                <View style={styles.responseLengthBadge}>
                  <Text style={styles.responseLengthText}>
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
          <Text style={styles.lastUpdated}>
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
  return (
    <View style={styles.goalItem}>
      <View style={styles.goalHeader}>
        {goal.is_30_day_focus && (
          <Ionicons
            name="star"
            size={16}
            color={Colors.warning}
            style={styles.goalStar}
          />
        )}
        <Text style={styles.goalTitle}>{goal.title}</Text>
      </View>
      {goal.is_30_day_focus && (
        <View style={styles.focusBadge}>
          <Text style={styles.focusBadgeText}>30-Day Focus</Text>
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
  return (
    <View style={styles.constraintItem}>
      <Ionicons name={icon} size={20} color={Colors.slateGray} />
      <Text style={styles.constraintLabel}>{label}</Text>
      <Text style={styles.constraintValue}>{value}</Text>
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
  return (
    <View style={styles.preferenceItem}>
      <Text style={styles.prefLabel}>{label}</Text>
      <View style={styles.prefBarContainer}>
        <Text style={styles.prefBarLabel}>{leftLabel}</Text>
        <View style={styles.prefBar}>
          <View style={[styles.prefBarFill, { width: `${value}%` }]} />
        </View>
        <Text style={styles.prefBarLabel}>{rightLabel}</Text>
      </View>
    </View>
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
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  header: {
    paddingVertical: Spacing.lg,
  },
  headerTitle: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.bold,
    color: Colors.slateCharcoal,
    marginBottom: Spacing.xs,
  },
  headerSubtitle: {
    fontSize: Typography.sizes.body,
    color: Colors.slateGray,
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
    color: Colors.slateCharcoal,
  },
  sectionSubtitle: {
    fontSize: Typography.sizes.caption,
    color: Colors.slateLight,
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
    backgroundColor: Colors.electricIndigo + '15',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
  },
  valueBadgeText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.electricIndigo,
  },
  goalsList: {
    gap: Spacing.md,
  },
  goalItem: {
    backgroundColor: Colors.inputBg,
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
    color: Colors.slateCharcoal,
    flex: 1,
  },
  focusBadge: {
    backgroundColor: Colors.warningLight,
    alignSelf: 'flex-start',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
    marginTop: Spacing.sm,
  },
  focusBadgeText: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    color: Colors.warning,
  },
  emptyText: {
    fontSize: Typography.sizes.body,
    color: Colors.slateLight,
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
    color: Colors.slateGray,
    marginLeft: Spacing.md,
  },
  constraintValue: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    color: Colors.slateCharcoal,
  },
  preferencesList: {
    gap: Spacing.lg,
  },
  preferenceItem: {},
  prefLabel: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.slateCharcoal,
    marginBottom: Spacing.sm,
  },
  prefBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prefBarLabel: {
    fontSize: Typography.sizes.caption,
    color: Colors.slateLight,
    width: 70,
  },
  prefBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    marginHorizontal: Spacing.sm,
    overflow: 'hidden',
  },
  prefBarFill: {
    height: '100%',
    backgroundColor: Colors.electricIndigo,
    borderRadius: 3,
  },
  responseLengthItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  responseLengthBadge: {
    backgroundColor: Colors.inputBg,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
  },
  responseLengthText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.slateCharcoal,
  },
  lastUpdated: {
    fontSize: Typography.sizes.caption,
    color: Colors.slateLight,
    textAlign: 'center',
    marginTop: Spacing.lg,
  },
});
