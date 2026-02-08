import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography, Spacing, Radius } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { SessionResult, Action } from '@/types';

interface ActionDrawerProps {
  visible: boolean;
  onClose: () => void;
  sessionResult?: SessionResult | null;
  onUpdatePlan?: () => void;
}

type TabType = 'summary' | 'actions' | 'plan';

export function ActionDrawer({
  visible,
  onClose,
  sessionResult,
  onUpdatePlan,
}: ActionDrawerProps) {
  const insets = useSafeAreaInsets();
  const { palette } = useThemeSafe();
  const [activeTab, setActiveTab] = useState<TabType>('summary');
  const [checkedActions, setCheckedActions] = useState<Set<string>>(new Set());

  const toggleAction = (actionId: string) => {
    setCheckedActions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(actionId)) {
        newSet.delete(actionId);
      } else {
        newSet.add(actionId);
      }
      return newSet;
    });
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(200)}
        style={[styles.overlay, { backgroundColor: palette.overlay }]}
      >
        <Pressable style={styles.overlayPress} onPress={onClose} />
      </Animated.View>

      <Animated.View
        entering={SlideInDown.springify().damping(20)}
        exiting={SlideOutDown.duration(300)}
        style={[styles.drawer, { paddingBottom: insets.bottom + Spacing.lg, backgroundColor: palette.cardBg }]}
      >
        {/* Handle */}
        <View style={styles.handleContainer}>
          <View style={[styles.handle, { backgroundColor: palette.border }]} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: palette.textSecondary }]}>Action Drawer</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={palette.textTertiary} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={[styles.tabs, { borderBottomColor: palette.border }]}>
          <TabButton
            label="Summary"
            active={activeTab === 'summary'}
            onPress={() => setActiveTab('summary')}
          />
          <TabButton
            label="Next Actions"
            active={activeTab === 'actions'}
            onPress={() => setActiveTab('actions')}
          />
          <TabButton
            label="Plan"
            active={activeTab === 'plan'}
            onPress={() => setActiveTab('plan')}
          />
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {activeTab === 'summary' && (
            <SummaryTab summary={sessionResult?.summary} />
          )}
          {activeTab === 'actions' && (
            <ActionsTab
              actions={sessionResult?.next_actions || []}
              checkedActions={checkedActions}
              onToggle={toggleAction}
            />
          )}
          {activeTab === 'plan' && (
            <PlanTab
              planUpdates={sessionResult?.plan_updates}
              onUpdatePlan={onUpdatePlan}
            />
          )}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

function TabButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const { palette } = useThemeSafe();

  return (
    <TouchableOpacity
      style={[styles.tab, active && { borderBottomWidth: 2, borderBottomColor: palette.accent }]}
      onPress={onPress}
    >
      <Text style={[styles.tabText, { color: palette.textTertiary }, active && { color: palette.accent }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function SummaryTab({ summary }: { summary?: string }) {
  const { palette } = useThemeSafe();

  if (!summary) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="document-text-outline" size={40} color={palette.textTertiary} />
        <Text style={[styles.emptyText, { color: palette.textTertiary }]}>
          Complete a session to see your summary here.
        </Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={[styles.summaryText, { color: palette.textSecondary }]}>{summary}</Text>
    </View>
  );
}

function ActionsTab({
  actions,
  checkedActions,
  onToggle,
}: {
  actions: Action[];
  checkedActions: Set<string>;
  onToggle: (id: string) => void;
}) {
  const { palette } = useThemeSafe();

  if (actions.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="checkbox-outline" size={40} color={palette.textTertiary} />
        <Text style={[styles.emptyText, { color: palette.textTertiary }]}>
          Your next actions from the session will appear here.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.actionsList}>
      {actions.map((action) => {
        const isChecked = checkedActions.has(action.id);
        return (
          <TouchableOpacity
            key={action.id}
            style={styles.actionItem}
            onPress={() => onToggle(action.id)}
          >
            <View
              style={[
                styles.actionCheckbox,
                { borderColor: palette.border },
                isChecked && { backgroundColor: palette.accent, borderColor: palette.accent },
              ]}
            >
              {isChecked && (
                <Ionicons name="checkmark" size={14} color={palette.textInverse} />
              )}
            </View>
            <Text
              style={[
                styles.actionText,
                { color: palette.textSecondary },
                isChecked && { textDecorationLine: 'line-through', color: palette.textTertiary },
              ]}
            >
              {action.title}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function PlanTab({
  planUpdates,
  onUpdatePlan,
}: {
  planUpdates?: SessionResult['plan_updates'];
  onUpdatePlan?: () => void;
}) {
  const { palette } = useThemeSafe();
  const hasUpdates = planUpdates && planUpdates.length > 0;

  return (
    <View>
      {hasUpdates ? (
        <>
          <Text style={[styles.planDescription, { color: palette.textTertiary }]}>
            Your coach has suggested the following updates to your plan:
          </Text>
          {planUpdates?.map((update, index) => (
            <View key={index} style={[styles.planUpdateItem, { backgroundColor: palette.backgroundSecondary }]}>
              <Text style={[styles.planUpdateDate, { color: palette.textSecondary }]}>
                {new Date(update.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
              {update.priorities?.map((priority) => (
                <Text key={priority.id} style={[styles.planUpdatePriority, { color: palette.textTertiary }]}>
                  • {priority.title}
                </Text>
              ))}
            </View>
          ))}
          <Button
            title="Update Plan"
            onPress={onUpdatePlan || (() => {})}
            fullWidth
            style={styles.updatePlanButton}
          />
        </>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={40} color={palette.textTertiary} />
          <Text style={[styles.emptyText, { color: palette.textTertiary }]}>
            Plan updates from your coaching session will appear here.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayPress: {
    flex: 1,
  },
  drawer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: Radius.xxl,
    borderTopRightRadius: Radius.xxl,
    maxHeight: '70%',
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: Spacing.md,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  title: {
    fontSize: Typography.sizes.subtitle,
    fontWeight: Typography.weights.semibold,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
  },
  tab: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginRight: Spacing.sm,
  },
  tabText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    fontSize: Typography.sizes.body,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 22,
  },
  summaryText: {
    fontSize: Typography.sizes.body,
    lineHeight: 24,
  },
  actionsList: {
    gap: Spacing.md,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  actionCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    marginRight: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  actionText: {
    flex: 1,
    fontSize: Typography.sizes.body,
    lineHeight: 22,
  },
  planDescription: {
    fontSize: Typography.sizes.body,
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  planUpdateItem: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
  },
  planUpdateDate: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.sm,
  },
  planUpdatePriority: {
    fontSize: Typography.sizes.body,
    marginLeft: Spacing.sm,
    lineHeight: 22,
  },
  updatePlanButton: {
    marginTop: Spacing.lg,
  },
});

export default ActionDrawer;
