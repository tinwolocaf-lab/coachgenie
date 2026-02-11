import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  useColorScheme,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  SlideInUp,
  useSharedValue,
  withSpring,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { CoachConfig, importSharedCoach } from '@/lib/coachSharing';

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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

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

      Alert.alert(
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
      Alert.alert(
        'Import Failed',
        error instanceof Error ? error.message : 'Failed to import coach'
      );
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
        {
          backgroundColor: isDark ? '#1a1a2e' : '#ffffff',
        },
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
              {
                color: isDark ? '#e8e8e8' : '#1a1a2e',
              },
            ]}
          >
            New Coach Available
          </Text>
          {onClose && (
            <TouchableOpacity onPress={onClose}>
              <Text
                style={[
                  styles.closeButton,
                  {
                    color: isDark ? '#a0a0c0' : '#999',
                  },
                ]}
              >
                ✕
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Coach Display Card */}
        <Animated.View
          style={[
            styles.coachCard,
            {
              backgroundColor: isDark ? '#2a2a4a' : '#f8f8f8',
              borderColor: isDark ? '#3a3a5a' : '#e0e0e0',
            },
            animatedStyle,
          ]}
          entering={SlideInUp}
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
            <Text style={styles.avatarText}>
              {coachConfig.icon_name.charAt(0).toUpperCase()}
            </Text>
          </View>

          {/* Coach Info */}
          <Text
            style={[
              styles.coachName,
              {
                color: isDark ? '#e8e8e8' : '#1a1a2e',
              },
            ]}
          >
            {coachConfig.name}
          </Text>

          {coachConfig.tagline && (
            <Text
              style={[
                styles.tagline,
                {
                  color: isDark ? '#d4af37' : '#d4af37',
                },
              ]}
            >
              {coachConfig.tagline}
            </Text>
          )}

          {coachConfig.description && (
            <Text
              style={[
                styles.description,
                {
                  color: isDark ? '#b0b0d0' : '#666',
                },
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
                  {
                    color: isDark ? '#a0a0c0' : '#999',
                  },
                ]}
              >
                Method:
              </Text>
              <Text
                style={[
                  styles.methodText,
                  {
                    color: isDark ? '#b0b0d0' : '#666',
                  },
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
                backgroundColor: isDark ? '#1a1a2e' : '#ffffff',
                borderColor: isDark ? '#3a3a5a' : '#e0e0e0',
              },
            ]}
          >
            <Text
              style={[
                styles.sharedByLabel,
                {
                  color: isDark ? '#a0a0c0' : '#999',
                },
              ]}
            >
              Shared by user {creatorId.substring(0, 8)}...
            </Text>
          </View>
        </Animated.View>

        {/* Action Buttons */}
        <View style={styles.buttonsSection}>
          {/* Add Coach Button */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              {
                backgroundColor: '#d4af37',
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
                  color="#1a1a2e"
                  style={styles.buttonSpinner}
                />
                <Text style={styles.primaryButtonText}>Adding...</Text>
              </>
            ) : (
              <Text style={styles.primaryButtonText}>Add to My Coaches</Text>
            )}
          </TouchableOpacity>

          {/* Preview Chat Button */}
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              {
                backgroundColor: isDark ? '#4a4a7a' : '#e8e8e8',
              },
            ]}
            onPress={() => setPreviewActive(!previewActive)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                {
                  color: isDark ? '#d4af37' : '#1a1a2e',
                },
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
                backgroundColor: isDark ? '#2a2a4a' : '#f8f8f8',
                borderColor: isDark ? '#3a3a5a' : '#e0e0e0',
              },
            ]}
            entering={FadeIn}
          >
            <Text
              style={[
                styles.previewTitle,
                {
                  color: isDark ? '#e8e8e8' : '#1a1a2e',
                },
              ]}
            >
              First Message
            </Text>

            <Text
              style={[
                styles.previewMessage,
                {
                  color: isDark ? '#b0b0d0' : '#666',
                  backgroundColor: isDark ? '#1a1a2e' : '#ffffff',
                  borderColor: isDark ? '#3a3a5a' : '#e0e0e0',
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
              backgroundColor: isDark ? '#2a2a4a' : '#f8f8f8',
              borderColor: isDark ? '#3a3a5a' : '#e0e0e0',
            },
          ]}
        >
          <Text
            style={[
              styles.infoText,
              {
                color: isDark ? '#b0b0d0' : '#666',
              },
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
    color: '#d4af37',
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
    color: '#1a1a2e',
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
