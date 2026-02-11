// Voice Note Input - Audio recording with transcription
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
  SlideInRight,
  SlideOutRight,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  RecordingPresets,
  setAudioModeAsync,
  type RecordingStatus,
  useAudioRecorder,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { isFunctionUnavailableError, transcribeVoiceNote } from '@/lib/apiClient';

interface VoiceNoteInputProps {
  onTranscription: (text: string) => void;
  onCancel: () => void;
  disabled?: boolean;
}

type RecordingState = 'idle' | 'recording' | 'processing';

export function VoiceNoteInput({
  onTranscription,
  onCancel,
  disabled = false,
}: VoiceNoteInputProps) {
  const { palette } = useThemeSafe();
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [transcriptionPreview, setTranscriptionPreview] = useState('');
  const recordingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStartTriggeredRef = useRef(false);
  const onCancelRef = useRef(onCancel);
  const recordingUrlRef = useRef<string | null>(null);
  const isRecordingRef = useRef(false);
  const handleRecorderStatus = useCallback((status: RecordingStatus) => {
    if (status.url) {
      recordingUrlRef.current = status.url;
    }
  }, []);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY, handleRecorderStatus);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  // Animations
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.5);
  const micScale = useSharedValue(1);

  useEffect(() => {
    if (recordingState === 'recording') {
      // Pulse animation
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 800, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.in(Easing.ease) })
        ),
        -1,
        false
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.2, { duration: 800, easing: Easing.out(Easing.ease) }),
          withTiming(0.5, { duration: 800, easing: Easing.in(Easing.ease) })
        ),
        -1,
        false
      );
    } else {
      pulseScale.value = withTiming(1);
      pulseOpacity.value = withTiming(0);
    }
  }, [recordingState, pulseScale, pulseOpacity]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const micStyle = useAnimatedStyle(() => ({
    transform: [{ scale: micScale.value }],
  }));

  const closeVoiceInput = useCallback(() => {
    onCancelRef.current();
  }, []);

  const clearRecordingTimer = useCallback(() => {
    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }
  }, []);

  const resetAudioModeSafely = useCallback(async () => {
    await setAudioModeAsync({
      allowsRecording: false,
    }).catch(() => undefined);
  }, []);

  const readRecorderUriSafely = useCallback((): string | null => {
    try {
      return recorder.uri;
    } catch {
      return null;
    }
  }, [recorder]);

  const stopRecorderSafely = useCallback(async () => {
    if (!isRecordingRef.current) {
      return;
    }

    isRecordingRef.current = false;

    try {
      await recorder.stop();
    } catch {
      // Recorder can already be released during rapid unmount/cancel transitions.
    }
  }, [recorder]);

  // Request permissions
  const ensurePermissions = useCallback(async () => {
    const current = await getRecordingPermissionsAsync();
    if (current.status === 'granted') {
      return true;
    }
    const next = await requestRecordingPermissionsAsync();
    return next.status === 'granted';
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const hasPermission = await ensurePermissions();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Please allow microphone access to use voice notes.',
          [{ text: 'OK' }]
        );
        closeVoiceInput();
        return;
      }

      // Configure audio session
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      micScale.value = withSpring(1.1, Timing.springBouncy);

      // Start recording
      recordingUrlRef.current = null;
      await recorder.prepareToRecordAsync();
      recorder.record();
      isRecordingRef.current = true;
      setRecordingState('recording');
      setRecordingDuration(0);

      // Start duration timer
      clearRecordingTimer();
      recordingTimer.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      isRecordingRef.current = false;
      console.warn('Failed to start recording:', error);
      Alert.alert('Error', 'Could not start recording. Please try again.');
      closeVoiceInput();
    }
  }, [clearRecordingTimer, closeVoiceInput, ensurePermissions, micScale, recorder]);

  // Stop recording and transcribe
  const stopRecording = useCallback(async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      micScale.value = withSpring(1, Timing.springBouncy);

      // Clear timer
      clearRecordingTimer();

      setRecordingState('processing');
      setTranscriptionPreview('');

      // Stop recording
      await stopRecorderSafely();
      await resetAudioModeSafely();

      const uri = recordingUrlRef.current ?? readRecorderUriSafely();

      if (!uri) {
        throw new Error('No recording URI');
      }

      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists && info.size && info.size > 24 * 1024 * 1024) {
        Alert.alert('Recording too large', 'Please record a shorter note (max ~24MB).');
        setRecordingState('idle');
        closeVoiceInput();
        return;
      }

      const base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64',
      });

      const fileName = uri.split('/').pop() || 'voice-note.m4a';
      const extension = fileName.split('.').pop()?.toLowerCase();
      const mimeType = extension === 'wav'
        ? 'audio/wav'
        : extension === 'mp3'
          ? 'audio/mpeg'
          : 'audio/m4a';

      const transcription = await transcribeVoiceNote({
        audioBase64: base64Audio,
        fileName,
        mimeType,
        onToken: (chunk) => {
          if (!chunk) return;
          setTranscriptionPreview((prev) => {
            const next = `${prev}${chunk}`;
            return next.length > 240 ? next.slice(-240) : next;
          });
        },
      });

      if (transcription && transcription.trim()) {
        onTranscription(transcription);
      } else {
        Alert.alert(
          'No Speech Detected',
          'We couldn\'t detect any speech. Please try again.',
          [{ text: 'OK' }]
        );
        closeVoiceInput();
        return;
      }

      setRecordingState('idle');
      setTranscriptionPreview('');
    } catch (error) {
      isRecordingRef.current = false;
      if (isFunctionUnavailableError(error)) {
        console.warn('Voice transcription unavailable:', error.message);
        Alert.alert(
          'Voice Unavailable',
          'Voice transcription service is unavailable right now. Please type your message instead.'
        );
      } else {
        console.warn('Failed to transcribe:', error);
        Alert.alert('Transcription Error', 'Could not process your voice note. Please try again.');
      }
      setRecordingState('idle');
      setTranscriptionPreview('');
      closeVoiceInput();
    } finally {
      await resetAudioModeSafely();
    }
  }, [
    clearRecordingTimer,
    closeVoiceInput,
    micScale,
    onTranscription,
    readRecorderUriSafely,
    resetAudioModeSafely,
    stopRecorderSafely,
  ]);

  // Cancel recording
  const cancelRecording = async () => {
    clearRecordingTimer();
    await stopRecorderSafely();
    await resetAudioModeSafely();

    setRecordingState('idle');
    setRecordingDuration(0);
    setTranscriptionPreview('');
    closeVoiceInput();
  };

  useEffect(() => {
    if (disabled || autoStartTriggeredRef.current) return;
    autoStartTriggeredRef.current = true;
    void startRecording();

    return () => {
      autoStartTriggeredRef.current = false;
      clearRecordingTimer();
      void stopRecorderSafely();
      void resetAudioModeSafely();
    };
  }, [clearRecordingTimer, disabled, resetAudioModeSafely, startRecording, stopRecorderSafely]);

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (recordingState === 'idle') {
    return null;
  }

  return (
    <Animated.View
      entering={SlideInRight.duration(300).springify()}
      exiting={SlideOutRight.duration(200)}
      style={[styles.container, { backgroundColor: palette.textPrimary }]}
    >
      <View style={styles.content}>
        {/* Cancel button */}
        <TouchableOpacity
          onPress={cancelRecording}
          style={styles.cancelButton}
          disabled={recordingState === 'processing'}
        >
          <Text style={[styles.cancelText, { color: palette.accentLight }]}>Cancel</Text>
        </TouchableOpacity>

        {/* Recording indicator */}
        <View style={styles.recordingIndicator}>
          {recordingState === 'recording' ? (
            <>
              <View style={styles.waveContainer}>
                {[...Array(5)].map((_, i) => (
                  <WaveBar key={i} index={i} />
                ))}
              </View>
              <Text style={[styles.durationText, { color: palette.textInverse }]}>
                {formatDuration(recordingDuration)}
              </Text>
            </>
          ) : (
            <View style={styles.processingBlock}>
              <Text style={[styles.processingText, { color: palette.accentLight }]}>Transcribing...</Text>
              {!!transcriptionPreview && (
                <Text style={[styles.transcriptionPreview, { color: palette.textInverse }]} numberOfLines={2}>
                  {transcriptionPreview}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Record/Stop button */}
        <TouchableOpacity
          onPress={recordingState === 'recording' ? stopRecording : undefined}
          disabled={recordingState === 'processing'}
          style={styles.recordButtonContainer}
        >
          {/* Pulse */}
          <Animated.View style={[styles.recordButtonPulse, { backgroundColor: palette.accent }, pulseStyle]} />

          {/* Button */}
          <Animated.View style={[styles.recordButton, { backgroundColor: palette.error }, micStyle]}>
            {recordingState === 'processing' ? (
              <Ionicons name="hourglass" size={24} color={palette.textInverse} />
            ) : (
              <Ionicons name="stop" size={24} color={palette.textInverse} />
            )}
          </Animated.View>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// Wave bar component
function WaveBar({ index }: { index: number }) {
  const { palette } = useThemeSafe();
  const height = useSharedValue(10);

  useEffect(() => {
    const baseHeight = 10 + (index % 3) * 5;
    const maxHeight = baseHeight + 15;

    height.value = withRepeat(
      withSequence(
        withTiming(maxHeight, { duration: 300 + index * 50 }),
        withTiming(baseHeight, { duration: 300 + index * 50 })
      ),
      -1,
      true
    );
  }, [height, index]);

  const barStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View style={[styles.waveBar, { backgroundColor: palette.accent }, barStyle]} />
  );
}

// Voice note trigger button (to be used in input area)
interface VoiceNoteTriggerProps {
  onPress: () => void;
  disabled?: boolean;
}

export function VoiceNoteTrigger({ onPress, disabled = false }: VoiceNoteTriggerProps) {
  const { palette } = useThemeSafe();

  return (
    <TouchableOpacity
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      disabled={disabled}
      style={[
        styles.triggerButton,
        { backgroundColor: palette.accentMuted },
        disabled && { backgroundColor: palette.backgroundSecondary },
      ]}
    >
      <Ionicons
        name="mic-outline"
        size={22}
        color={disabled ? palette.textTertiary : palette.accent}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: Radius.squircle,
    borderTopRightRadius: Radius.squircle,
    ...Shadows.xl,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  cancelButton: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  cancelText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
  },
  recordingIndicator: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 40,
  },
  waveBar: {
    width: 3,
    borderRadius: 2,
  },
  durationText: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.sans,
    minWidth: 50,
  },
  processingText: {
    fontSize: Typography.sizes.body,
    fontStyle: 'italic',
  },
  processingBlock: {
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  transcriptionPreview: {
    fontSize: Typography.sizes.caption,
    textAlign: 'center',
  },
  recordButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButtonPulse: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  recordButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },

  // Trigger button
  triggerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default VoiceNoteInput;
