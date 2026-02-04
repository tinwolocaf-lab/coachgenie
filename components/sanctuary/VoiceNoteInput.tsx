// Voice Note Input - Audio recording with transcription
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated as RNAnimated,
  Dimensions,
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
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutRight,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { transcribeAudio } from '@fastshot/ai';
import { Colors, Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const recording = useRef<Audio.Recording | null>(null);
  const recordingTimer = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Request permissions
  const ensurePermissions = async () => {
    if (permissionResponse?.status !== 'granted') {
      const response = await requestPermission();
      return response.status === 'granted';
    }
    return true;
  };

  // Start recording
  const startRecording = async () => {
    try {
      const hasPermission = await ensurePermissions();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Please allow microphone access to use voice notes.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Configure audio session
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      micScale.value = withSpring(1.1, Timing.springBouncy);

      // Start recording
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      recording.current = newRecording;
      setRecordingState('recording');
      setRecordingDuration(0);

      // Start duration timer
      recordingTimer.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Could not start recording. Please try again.');
    }
  };

  // Stop recording and transcribe
  const stopRecording = async () => {
    if (!recording.current) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      micScale.value = withSpring(1, Timing.springBouncy);

      // Clear timer
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
        recordingTimer.current = null;
      }

      setRecordingState('processing');

      // Stop recording
      await recording.current.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recording.current.getURI();
      recording.current = null;

      if (!uri) {
        throw new Error('No recording URI');
      }

      // Transcribe
      const transcription = await transcribeAudio({ audioUri: uri });

      if (transcription && transcription.trim()) {
        onTranscription(transcription);
      } else {
        Alert.alert(
          'No Speech Detected',
          'We couldn\'t detect any speech. Please try again.',
          [{ text: 'OK' }]
        );
      }

      setRecordingState('idle');
    } catch (error) {
      console.error('Failed to transcribe:', error);
      setRecordingState('idle');
      Alert.alert('Transcription Error', 'Could not process your voice note. Please try again.');
    }
  };

  // Cancel recording
  const cancelRecording = async () => {
    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }

    if (recording.current) {
      try {
        await recording.current.stopAndUnloadAsync();
      } catch (e) {
        // Ignore errors during cancellation
      }
      recording.current = null;
    }

    setRecordingState('idle');
    setRecordingDuration(0);
    onCancel();
  };

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
      style={styles.container}
    >
      <View style={styles.content}>
        {/* Cancel button */}
        <TouchableOpacity
          onPress={cancelRecording}
          style={styles.cancelButton}
          disabled={recordingState === 'processing'}
        >
          <Text style={styles.cancelText}>Cancel</Text>
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
              <Text style={styles.durationText}>
                {formatDuration(recordingDuration)}
              </Text>
            </>
          ) : (
            <Text style={styles.processingText}>Processing...</Text>
          )}
        </View>

        {/* Record/Stop button */}
        <TouchableOpacity
          onPress={recordingState === 'recording' ? stopRecording : undefined}
          disabled={recordingState === 'processing'}
          style={styles.recordButtonContainer}
        >
          {/* Pulse */}
          <Animated.View style={[styles.recordButtonPulse, pulseStyle]} />

          {/* Button */}
          <Animated.View style={[styles.recordButton, micStyle]}>
            {recordingState === 'processing' ? (
              <Ionicons name="hourglass" size={24} color={Colors.white} />
            ) : (
              <Ionicons name="stop" size={24} color={Colors.white} />
            )}
          </Animated.View>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// Wave bar component
function WaveBar({ index }: { index: number }) {
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
    <Animated.View style={[styles.waveBar, barStyle]} />
  );
}

// Voice note trigger button (to be used in input area)
interface VoiceNoteTriggerProps {
  onPress: () => void;
  disabled?: boolean;
}

export function VoiceNoteTrigger({ onPress, disabled = false }: VoiceNoteTriggerProps) {
  return (
    <TouchableOpacity
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      disabled={disabled}
      style={[styles.triggerButton, disabled && styles.triggerButtonDisabled]}
    >
      <Ionicons
        name="mic-outline"
        size={22}
        color={disabled ? Colors.stoneGray : Colors.burnishedGold}
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
    backgroundColor: Colors.midnightEmerald,
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
    color: Colors.goldLight,
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
    backgroundColor: Colors.burnishedGold,
    borderRadius: 2,
  },
  durationText: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
    fontFamily: Typography.fonts.sans,
    minWidth: 50,
  },
  processingText: {
    fontSize: Typography.sizes.body,
    color: Colors.goldLight,
    fontStyle: 'italic',
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
    backgroundColor: Colors.burnishedGold,
  },
  recordButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.error,
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
    backgroundColor: Colors.goldMuted,
  },
  triggerButtonDisabled: {
    backgroundColor: Colors.warmOatmealDark,
  },
});

export default VoiceNoteInput;
