// Contextual Menu - Long-press actions for messages
import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { EnhancedMessage } from '@/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ContextualMenuProps {
  visible: boolean;
  message: EnhancedMessage | null;
  position: { x: number; y: number };
  onClose: () => void;
  onHighlight: (message: EnhancedMessage) => void;
  onReflectFurther: (message: EnhancedMessage) => void;
  onSaveInsight: (message: EnhancedMessage) => void;
  onCopy: (message: EnhancedMessage) => void;
}

interface MenuAction {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
}

export function ContextualMenu({
  visible,
  message,
  position,
  onClose,
  onHighlight,
  onReflectFurther,
  onSaveInsight,
  onCopy,
}: ContextualMenuProps) {
  const { palette } = useThemeSafe();
  const menuScale = useSharedValue(0.9);
  const menuOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      menuScale.value = withSpring(1, Timing.springBouncy);
      menuOpacity.value = withTiming(1, { duration: 200 });
    } else {
      menuScale.value = withTiming(0.9, { duration: 150 });
      menuOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [visible, menuScale, menuOpacity]);

  const menuStyle = useAnimatedStyle(() => ({
    transform: [{ scale: menuScale.value }],
    opacity: menuOpacity.value,
  }));

  if (!message) return null;

  const isCoachMessage = message.role === 'assistant';

  const actions: MenuAction[] = [
    ...(isCoachMessage ? [
      {
        id: 'reflect',
        label: 'Reflect Further',
        icon: 'chatbubble-ellipses-outline' as keyof typeof Ionicons.glyphMap,
        color: palette.accent,
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onReflectFurther(message);
          onClose();
        },
      },
      {
        id: 'highlight',
        label: message.is_insight ? 'Remove Highlight' : 'Highlight',
        icon: message.is_insight ? 'bookmark' : 'bookmark-outline' as keyof typeof Ionicons.glyphMap,
        color: palette.accent,
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onHighlight(message);
          onClose();
        },
      },
      {
        id: 'save',
        label: 'Save to Journal',
        icon: 'journal-outline' as keyof typeof Ionicons.glyphMap,
        color: palette.success,
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onSaveInsight(message);
          onClose();
        },
      },
    ] : []),
    {
      id: 'copy',
      label: 'Copy Text',
      icon: 'copy-outline' as keyof typeof Ionicons.glyphMap,
      color: palette.textTertiary,
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onCopy(message);
        onClose();
      },
    },
  ];

  // Calculate menu position to keep it on screen
  const menuWidth = 220;
  const menuHeight = actions.length * 56 + 20;
  let menuX = position.x - menuWidth / 2;
  let menuY = position.y - menuHeight - 20;

  // Keep on screen
  menuX = Math.max(Spacing.lg, Math.min(SCREEN_WIDTH - menuWidth - Spacing.lg, menuX));
  if (menuY < 100) {
    menuY = position.y + 20;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <BlurView intensity={15} style={StyleSheet.absoluteFill} tint="dark" />

        <Animated.View
          style={[
            styles.menuContainer,
            { left: menuX, top: menuY, backgroundColor: palette.cardBg },
            menuStyle,
          ]}
        >
          {actions.map((action, index) => (
            <TouchableOpacity
              key={action.id}
              style={[
                styles.menuItem,
                { borderBottomColor: palette.borderLight },
                index === 0 && styles.menuItemFirst,
                index === actions.length - 1 && styles.menuItemLast,
              ]}
              onPress={action.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: `${action.color}15` }]}>
                <Ionicons name={action.icon} size={20} color={action.color} />
              </View>
              <Text style={[styles.menuItemText, { color: palette.textSecondary }]}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// Reflect Further Modal
interface ReflectFurtherModalProps {
  visible: boolean;
  message: EnhancedMessage | null;
  expandedContent: string;
  isLoading: boolean;
  coachName: string;
  coachColor: string;
  onClose: () => void;
  onAddToConversation: () => void;
}

export function ReflectFurtherModal({
  visible,
  message,
  expandedContent,
  isLoading,
  coachName,
  coachColor,
  onClose,
  onAddToConversation,
}: ReflectFurtherModalProps) {
  const { palette } = useThemeSafe();

  if (!message) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.reflectOverlay}>
        <Animated.View
          entering={SlideInDown.springify()}
          exiting={SlideOutDown}
          style={[styles.reflectContainer, { backgroundColor: palette.background }]}
        >
          {/* Header */}
          <View style={[styles.reflectHeader, { borderBottomColor: palette.borderLight }]}>
            <TouchableOpacity onPress={onClose} style={styles.reflectClose}>
              <Ionicons name="chevron-down" size={28} color={palette.textTertiary} />
            </TouchableOpacity>
            <View style={styles.reflectHeaderCenter}>
              <View style={[styles.reflectCoachDot, { backgroundColor: coachColor }]} />
              <Text style={[styles.reflectTitle, { color: palette.textPrimary }]}>Reflecting Deeper</Text>
            </View>
            <View style={styles.reflectHeaderSpacer} />
          </View>

          {/* Original message */}
          <View style={[styles.reflectOriginal, { backgroundColor: palette.backgroundSecondary }]}>
            <Text style={[styles.reflectOriginalLabel, { color: palette.textTertiary }]}>You asked about:</Text>
            <Text style={[styles.reflectOriginalText, { color: palette.textSecondary }]} numberOfLines={3}>
              "{message.content}"
            </Text>
          </View>

          {/* Expanded content */}
          <View style={styles.reflectContent}>
            {isLoading ? (
              <View style={styles.reflectLoading}>
                <Text style={[styles.reflectLoadingText, { color: palette.textTertiary }]}>
                  {coachName} is contemplating...
                </Text>
              </View>
            ) : (
              <Text style={[styles.reflectExpandedText, { color: palette.textSecondary }]}>
                {expandedContent}
              </Text>
            )}
          </View>

          {/* Actions */}
          {!isLoading && expandedContent && (
            <View style={styles.reflectActions}>
              <TouchableOpacity
                style={[styles.addToConversationButton, { backgroundColor: palette.textPrimary }]}
                onPress={onAddToConversation}
              >
                <Ionicons name="add-circle-outline" size={20} color={palette.textInverse} />
                <Text style={[styles.addToConversationText, { color: palette.textInverse }]}>
                  Continue in Conversation
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Contextual Menu
  overlay: {
    flex: 1,
  },
  menuContainer: {
    position: 'absolute',
    borderRadius: Radius.xl,
    minWidth: 220,
    ...Shadows.xl,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
  },
  menuItemFirst: {
    paddingTop: Spacing.lg,
  },
  menuItemLast: {
    borderBottomWidth: 0,
    paddingBottom: Spacing.lg,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  menuItemText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
  },

  // Reflect Further Modal
  reflectOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  reflectContainer: {
    borderTopLeftRadius: Radius.squircle,
    borderTopRightRadius: Radius.squircle,
    maxHeight: SCREEN_HEIGHT * 0.8,
    ...Shadows.xl,
  },
  reflectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  reflectClose: {
    padding: Spacing.xs,
  },
  reflectHeaderCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reflectCoachDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  reflectTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
  },
  reflectHeaderSpacer: {
    width: 44,
  },
  reflectOriginal: {
    padding: Spacing.xl,
    margin: Spacing.lg,
    borderRadius: Radius.lg,
  },
  reflectOriginalLabel: {
    fontSize: Typography.sizes.caption,
    marginBottom: Spacing.xs,
  },
  reflectOriginalText: {
    fontSize: Typography.sizes.body,
    fontStyle: 'italic',
  },
  reflectContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
    maxHeight: 300,
  },
  reflectLoading: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  reflectLoadingText: {
    fontSize: Typography.sizes.body,
    fontStyle: 'italic',
  },
  reflectExpandedText: {
    fontSize: Typography.sizes.bodyLarge,
    lineHeight: Typography.sizes.bodyLarge * Typography.lineHeights.relaxed,
    fontFamily: Typography.fonts.serif,
  },
  reflectActions: {
    padding: Spacing.xl,
    paddingTop: 0,
  },
  addToConversationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.pill,
    gap: Spacing.sm,
  },
  addToConversationText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
  },
});

export default ContextualMenu;
