import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Share,
  StyleSheet,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAlert } from '@/contexts/AlertContext';
import * as Clipboard from 'expo-clipboard';
import Animated, {
  FadeIn,
  SlideInDown,
  useSharedValue,
  withSpring,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Coach } from '@/types';
import { createShareLink } from '@/lib/coachSharing';

interface ShareCoachModalProps {
  coach: Coach;
  isVisible: boolean;
  onClose: () => void;
  onShareSuccess?: (deepLink: string) => void;
}

export const ShareCoachModal: React.FC<ShareCoachModalProps> = ({
  coach,
  isVisible,
  onClose,
  onShareSuccess,
}) => {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const { showToast } = useAlert();
  const isDark = colorScheme === 'dark';

  const [loading, setLoading] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scaleValue = useSharedValue(0);

  const generateShareLink = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await createShareLink(coach.id, {
        name: coach.name,
        system_prompt: coach.system_prompt,
        method: coach.method,
        icon_name: coach.icon_name,
        color: coach.color,
        tagline: coach.tagline,
        description: coach.description,
      });

      setShareLink(response.webUrl);
      setDeepLink(response.deepLink);
      scaleValue.value = withSpring(1);
    } catch (err) {
      console.error('Error generating share link:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate share link');
    } finally {
      setLoading(false);
    }
  }, [
    coach.id,
    coach.name,
    coach.system_prompt,
    coach.method,
    coach.icon_name,
    coach.color,
    coach.tagline,
    coach.description,
    scaleValue,
  ]);

  useEffect(() => {
    if (!isVisible) {
      setShareLink(null);
      setDeepLink(null);
      setCopied(false);
      setError(null);
      scaleValue.value = 0;
    }
  }, [coach.id, isVisible, scaleValue]);

  // Generate share link on mount when modal becomes visible
  useEffect(() => {
    if (isVisible && !shareLink) {
      generateShareLink();
    }
  }, [generateShareLink, isVisible, shareLink]);

  const handleCopyLink = async () => {
    if (!shareLink) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Clipboard.setStringAsync(shareLink);
      setCopied(true);

      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Copy Failed', { variant: 'error', message: 'Failed to copy link to clipboard' });
    }
  };

  const handleShare = async () => {
    if (!shareLink) return;

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await Share.share({
        message: `Check out the ${coach.name} coach! ${shareLink}`,
        title: `Share ${coach.name}`,
        url: shareLink,
      });

      onShareSuccess?.(deepLink || '');
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }));

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          backgroundColor: isDark ? 'rgba(26, 26, 46, 0.5)' : 'rgba(0, 0, 0, 0.5)',
        },
      ]}
      entering={FadeIn}
    >
      <TouchableOpacity
        style={StyleSheet.absoluteFill}
        onPress={onClose}
        activeOpacity={1}
      />

      <Animated.View
        entering={SlideInDown.springify().damping(15).mass(1)}
        style={[
          styles.container,
          {
            backgroundColor: isDark ? '#2a2a4a' : '#ffffff',
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              borderBottomColor: isDark ? '#3a3a5a' : '#f0f0f0',
            },
          ]}
        >
          <Text
            style={[
              styles.title,
              {
                color: isDark ? '#e8e8e8' : '#1a1a2e',
              },
            ]}
          >
            Share Coach
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text
              style={[
                styles.closeButton,
                {
                  color: isDark ? '#a0a0c0' : '#666',
                },
              ]}
            >
              ✕
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Coach Preview */}
          <Animated.View style={[styles.coachPreview, animatedStyle]}>
            <View
              style={[
                styles.avatarContainer,
                {
                  backgroundColor: coach.color,
                  opacity: 0.1,
                },
              ]}
            >
              <Text style={styles.avatarText}>
                {coach.icon_name.charAt(0).toUpperCase()}
              </Text>
            </View>

            <Text
              style={[
                styles.coachName,
                {
                  color: isDark ? '#e8e8e8' : '#1a1a2e',
                },
              ]}
            >
              {coach.name}
            </Text>

            <Text
              style={[
                styles.coachTagline,
                {
                  color: isDark ? '#b0b0d0' : '#666',
                },
              ]}
            >
              {coach.tagline}
            </Text>
          </Animated.View>

          {/* Loading or Link Preview */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator
                size="large"
                color="#d4af37"
              />
              <Text
                style={[
                  styles.loadingText,
                  {
                    color: isDark ? '#b0b0d0' : '#666',
                  },
                ]}
              >
                Generating share link...
              </Text>
            </View>
          ) : error ? (
            <View
              style={[
                styles.errorContainer,
                {
                  backgroundColor: isDark ? '#4a2a2a' : '#fff3f0',
                  borderColor: '#d9534f',
                },
              ]}
            >
              <Text
                style={[
                  styles.errorText,
                  {
                    color: isDark ? '#ff9999' : '#d9534f',
                  },
                ]}
              >
                {error}
              </Text>
            </View>
          ) : shareLink ? (
            <View>
              {/* Preview Section */}
              <View
                style={[
                  styles.previewSection,
                  {
                    backgroundColor: isDark ? '#1a1a2e' : '#f8f8f8',
                    borderColor: isDark ? '#3a3a5a' : '#e0e0e0',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.previewLabel,
                    {
                      color: isDark ? '#b0b0d0' : '#999',
                    },
                  ]}
                >
                  Recipients will see:
                </Text>

                <View
                  style={[
                    styles.previewCard,
                    {
                      backgroundColor: isDark ? '#2a2a4a' : '#ffffff',
                      borderColor: isDark ? '#3a3a5a' : '#e0e0e0',
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.previewAvatar,
                      {
                        backgroundColor: coach.color,
                        opacity: 0.15,
                      },
                    ]}
                  >
                    <Text style={styles.previewAvatarText}>
                      {coach.icon_name.charAt(0).toUpperCase()}
                    </Text>
                  </View>

                  <Text
                    style={[
                      styles.previewName,
                      {
                        color: isDark ? '#e8e8e8' : '#1a1a2e',
                      },
                    ]}
                  >
                    {coach.name}
                  </Text>

                  <Text
                    style={[
                      styles.previewSpecialty,
                      {
                        color: isDark ? '#b0b0d0' : '#666',
                      },
                    ]}
                  >
                    {coach.method}
                  </Text>
                </View>
              </View>

              {/* Share Link Display */}
              <View style={styles.linkSection}>
                <View
                  style={[
                    styles.linkBox,
                    {
                      backgroundColor: isDark ? '#1a1a2e' : '#f8f8f8',
                      borderColor: '#d4af37',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.linkText,
                      {
                        color: isDark ? '#b0b0d0' : '#666',
                      },
                    ]}
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {shareLink}
                  </Text>
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.buttonsContainer}>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.copyButton,
                    {
                      backgroundColor: isDark ? '#d4af37' : '#d4af37',
                    },
                  ]}
                  onPress={handleCopyLink}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      {
                        color: isDark ? '#1a1a2e' : '#1a1a2e',
                      },
                    ]}
                  >
                    {copied ? '✓ Copied' : 'Copy Link'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.shareButton,
                    {
                      backgroundColor: isDark ? '#4a4a7a' : '#e8e8e8',
                    },
                  ]}
                  onPress={handleShare}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      {
                        color: isDark ? '#d4af37' : '#1a1a2e',
                      },
                    ]}
                  >
                    Share
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  container: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    fontSize: 24,
    fontWeight: '400',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  coachPreview: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#d4af37',
  },
  coachName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  coachTagline: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
  },
  previewSection: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  previewCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  previewAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewAvatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#d4af37',
  },
  previewName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  previewSpecialty: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  linkSection: {
    marginBottom: 20,
  },
  linkBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    justifyContent: 'center',
    minHeight: 44,
  },
  linkText: {
    fontSize: 12,
    fontWeight: '500',
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  copyButton: {
    flex: 1.2,
  },
  shareButton: {
    flex: 1,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
