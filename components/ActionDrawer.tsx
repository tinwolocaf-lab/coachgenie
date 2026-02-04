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
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
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
        style={styles.overlay}
      >
        <Pressable style={styles.overlayPress} onPress={onClose} />
      </Animated.View>

      <Animated.View
        entering={SlideInDown.springify().damping(20)}
        exiting={SlideOutDown.duration(300)}
        style={[styles.drawer, { paddingBottom: insets.bottom + Spacing.lg }]}
      >
        {/* Handle */}
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Action Drawer</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={Colors.slateGray} />
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
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
  return (
    <TouchableOpacity
      style={[styles.tab, active && styles.tabActive]}
      onPress={onPress}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function SummaryTab({ summary }: { summary?: string }) {
  if (!summary) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="document-text-outline" size={40} color={Colors.slateLight} />
        <Text style={styles.emptyText}>
          Complete a session to see your summary here.
        </Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.summaryText}>{summary}</Text>
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
  if (actions.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="checkbox-outline" size={40} color={Colors.slateLight} />
        <Text style={styles.emptyText}>
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
                isChecked && styles.actionCheckboxChecked,
              ]}
            >
              {isChecked && (
                <Ionicons name="checkmark" size={14} color={Colors.white} />
              )}
            </View>
            <Text
              style={[
                styles.actionText,
                isChecked && styles.actionTextChecked,
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
  const hasUpdates = planUpdates && planUpdates.length > 0;

  return (
    <View>
      {hasUpdates ? (
        <>
          <Text style={styles.planDescription}>
            Your coach has suggested the following updates to your plan:
          </Text>
          {planUpdates?.map((update, index) => (
            <View key={index} style={styles.planUpdateItem}>
              <Text style={styles.planUpdateDate}>
                {new Date(update.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
              {update.priorities?.map((priority) => (
                <Text key={priority.id} style={styles.planUpdatePriority}>
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
          <Ionicons name="calendar-outline" size={40} color={Colors.slateLight} />
          <Text style={styles.emptyText}>
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
    backgroundColor: Colors.overlay,
  },
  overlayPress: {
    flex: 1,
  },
  drawer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
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
    backgroundColor: Colors.border,
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
    color: Colors.slateCharcoal,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginRight: Spacing.sm,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.electricIndigo,
  },
  tabText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.slateGray,
  },
  tabTextActive: {
    color: Colors.electricIndigo,
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
    color: Colors.slateLight,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 22,
  },
  summaryText: {
    fontSize: Typography.sizes.body,
    color: Colors.slateCharcoal,
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
    borderColor: Colors.border,
    marginRight: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  actionCheckboxChecked: {
    backgroundColor: Colors.electricIndigo,
    borderColor: Colors.electricIndigo,
  },
  actionText: {
    flex: 1,
    fontSize: Typography.sizes.body,
    color: Colors.slateCharcoal,
    lineHeight: 22,
  },
  actionTextChecked: {
    textDecorationLine: 'line-through',
    color: Colors.slateLight,
  },
  planDescription: {
    fontSize: Typography.sizes.body,
    color: Colors.slateGray,
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  planUpdateItem: {
    backgroundColor: Colors.inputBg,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
  },
  planUpdateDate: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
    color: Colors.slateCharcoal,
    marginBottom: Spacing.sm,
  },
  planUpdatePriority: {
    fontSize: Typography.sizes.body,
    color: Colors.slateGray,
    marginLeft: Spacing.sm,
    lineHeight: 22,
  },
  updatePlanButton: {
    marginTop: Spacing.lg,
  },
});

export default ActionDrawer;
