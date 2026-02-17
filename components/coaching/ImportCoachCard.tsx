import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAlert } from '@/contexts/AlertContext';
import Animated, {
  FadeIn,
  SlideInUp,
  useSharedValue,
  withSpring,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { CoachConfig, importSharedCoach } from '@/lib/coachSharing';
import { useThemeSafe } from '@/contexts/ThemeContext';

interface ImportCoachCardProps {
  coachConfig: CoachConfig;
  creatorId: string;
  shareId: string;
  onImportSuccess?: (coachId: string, coachName: string) => void;
  onClose?: () => void;
}

export const ImportCoachCard: React.FC<ImportCoachCardProps> = ({
  coachConfig,
  creatorId,
  shareId,
  onImportSuccess,
  onClose,
}) => {
  const { palette } = useThemeSafe();
  const { showToast, showAlert } = useAlert();

  const [importing, setImporting] = useState(false);
  const [previewActive, setPreviewActive] = useState(false);
  const scaleValue = useSharedValue(0.9);

  useEffect(() => {
    scaleValue.value = withSpring(1, {
      damping: 12,
      mass: 0.8,
      overshootClamping: false,
    });
  }, [scaleValue]);

  const handleImportCoach = async () => {
    try {
      setImporting(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const result = await importSharedCoach(shareId);

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      showAlert(
        'Coach Added!',
        `${result.name} has been added to your coaches.`,
        [
          {
            text: 'Got it',
            onPress: () => {
              onImportSuccess?.(result.id, result.name);
            },
          },
        ]
      );
    } catch (error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showToast('Import Failed', { variant: 'error', message: error instanceof Error ? error.message : 'Failed to import coach' });
    } finally {
      setImporting(false);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: palette.background },
      ]}
    >
      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        entering={FadeIn}
      >
        {/* Header with Close */}
        <View style={styles.header}>
          <Text
            style={[
              styles.headerTitle,
              { color: palette.textPrimary },
            ]}
          >
            New Coach Available
          </Text>
          {onClose && (
            <TouchableOpacity onPress={onClose}>
              <Text
                style={[
                  styles.closeButton,
                  { color: palette.textTertiary },
                ]}
              >
                ✕
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Coach Display Card */}
        <Animated.View entering={SlideInUp}>
          <Animated.View
            style={[
              styles.coachCard,
              {
                backgroundColor: palette.cardBg,
                borderColor: palette.border,
              },
              animatedStyle,
            ]}
          >
          {/* Avatar */}
          <View
            style={[
              styles.avatarContainer,
              {
                backgroundColor: coachConfig.color,
                opacity: 0.12,
              },
            ]}
          >
            <Text style={[styles.avatarText, { color: palette.accent }]}>
              {coachConfig.icon_name.charAt(0).toUpperCase()}
            </Text>
          </View>

          {/* Coach Info */}
          <Text
            style={[
              styles.coachName,
              { color: palette.textPrimary },
            ]}
          >
            {coachConfig.name}
          </Text>

          {coachConfig.tagline && (
            <Text
              style={[
                styles.tagline,
                { color: palette.accent },
              ]}
            >
              {coachConfig.tagline}
            </Text>
          )}

          {coachConfig.description && (
            <Text
              style={[
                styles.description,
                { color: palette.textSecondary },
              ]}
            >
              {coachConfig.description}
            </Text>
          )}

          {coachConfig.method && (
            <View style={styles.methodSection}>
              <Text
                style={[
                  styles.methodLabel,
                  { color: palette.textTertiary },
                ]}
              >
                Method:
              </Text>
              <Text
                style={[
                  styles.methodText,
                  { color: palette.textSecondary },
                ]}
              >
                {coachConfig.method}
              </Text>
            </View>
          )}

          {/* Shared By Info */}
          <View
            style={[
              styles.sharedBySection,
              {
                backgroundColor: palette.backgroundSecondary,
                borderColor: palette.border,
              },
            ]}
          >
            <Text
              style={[
                styles.sharedByLabel,
                { color: palette.textTertiary },
              ]}
            >
              Shared by user {creatorId.substring(0, 8)}...
            </Text>
          </View>
          </Animated.View>
        </Animated.View>

        {/* Action Buttons */}
        <View style={styles.buttonsSection}>
          {/* Add Coach Button */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              {
                backgroundColor: palette.accent,
                opacity: importing ? 0.7 : 1,
              },
            ]}
            onPress={handleImportCoach}
            disabled={importing}
            activeOpacity={0.8}
          >
            {importing ? (
              <>
                <ActivityIndicator
                  size="small"
                  color={palette.textInverse}
                  style={styles.buttonSpinner}
                />
                <Text style={[styles.primaryButtonText, { color: palette.textInverse }]}>Adding...</Text>
              </>
            ) : (
              <Text style={[styles.primaryButtonText, { color: palette.textInverse }]}>Add to My Coaches</Text>
            )}
          </TouchableOpacity>

          {/* Preview Chat Button */}
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              { backgroundColor: palette.backgroundSecondary },
            ]}
            onPress={() => setPreviewActive(!previewActive)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                { color: palette.accent },
              ]}
            >
              Preview Chat
            </Text>
          </TouchableOpacity>
        </View>

        {/* Preview Section */}
        {previewActive && (
          <Animated.View
            style={[
              styles.previewSection,
              {
                backgroundColor: palette.cardBg,
                borderColor: palette.border,
              },
            ]}
            entering={FadeIn}
          >
            <Text
              style={[
                styles.previewTitle,
                { color: palette.textPrimary },
              ]}
            >
              First Message
            </Text>

            <Text
              style={[
                styles.previewMessage,
                {
                  color: palette.textSecondary,
                  backgroundColor: palette.backgroundSecondary,
                  borderColor: palette.border,
                },
              ]}
            >
              {getInitialMessage(coachConfig)}
            </Text>
          </Animated.View>
        )}

        {/* Info Section */}
        <View
          style={[
            styles.infoSection,
            {
              backgroundColor: palette.cardBg,
              borderColor: palette.border,
            },
          ]}
        >
          <Text
            style={[
              styles.infoText,
              { color: palette.textSecondary },
            ]}
          >
            This coach will be added to your personal coach collection. You can use it anytime to get personalized guidance.
          </Text>
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

/**
 * Generate an initial message based on coach configuration
 */
function getInitialMessage(config: CoachConfig): string {
  const greetings = [
    `Hey! I'm the ${config.name}.`,
    `Welcome! I'm here as your ${config.name}.`,
    `Great to see you! I'm the ${config.name}.`,
  ];

  const greeting = greetings[Math.floor(Math.random() * greetings.length)];
  return `${greeting} ${config.method.split('.')[0]}.`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    fontSize: 24,
    fontWeight: '400',
  },
  coachCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 44,
    fontWeight: '700',
  },
  coachName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  methodSection: {
    width: '100%',
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  methodLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  methodText: {
    fontSize: 13,
    lineHeight: 19,
  },
  sharedBySection: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  sharedByLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  buttonsSection: {
    gap: 12,
    marginBottom: 24,
  },
  primaryButton: {
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  buttonSpinner: {
    marginRight: 4,
  },
  secondaryButton: {
    paddingVertical: 14,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  previewSection: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewMessage: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  infoSection: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});
