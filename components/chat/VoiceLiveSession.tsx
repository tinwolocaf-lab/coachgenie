// Voice Live Session - Full bidirectional voice conversation with Gemini 2.5 Flash Native Audio
// Replaces record-then-transcribe with real-time streaming voice coaching

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat,
  withSequence, withTiming, Easing,
  FadeIn, SlideInDown, SlideOutDown,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  getRecordingPermissionsAsync, requestRecordingPermissionsAsync,
  RecordingPresets, setAudioModeAsync, useAudioRecorder,
} from 'expo-audio';
import { Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import {
  GeminiLiveSession, getGeminiLiveSession, ConnectionState,
  GEMINI_VOICES, GeminiVoiceId, GeminiLiveError,
} from '@/lib/geminiLive';

interface VoiceLiveSessionProps {
  coachId: string;
  sessionId: string;
  coachName: string;
  isVisible: boolean;
  onClose: () => void;
  onTranscriptUpdate?: (userText: string, aiText: string) => void;
  onInsightSaved?: (title: string, content: string) => void;
}

const FALLBACK_TEXT_MODE_MESSAGE = 'Could not connect to voice service. Falling back to text mode.';
const VOICE_UNAVAILABLE_MESSAGE = 'Voice service is not available right now. Please continue in text mode.';

function normalizeErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (error && typeof error === 'object') {
    try {
      return JSON.stringify(error);
    } catch {
      return 'Unknown voice error';
    }
  }
  return 'Unknown voice error';
}

function isVoiceServiceUnavailableError(error: unknown): boolean {
  if (error instanceof GeminiLiveError) {
    return error.kind === 'voice_service_unavailable';
  }

  const message = normalizeErrorMessage(error).toLowerCase();
  return (
    message.includes('"code":"not_found"') ||
    message.includes('requested function was not found') ||
    message.includes('voice service is not available')
  );
}

export function VoiceLiveSession({
  coachId,
  sessionId,
  coachName,
  isVisible,
  onClose,
  onTranscriptUpdate,
  onInsightSaved,
}: VoiceLiveSessionProps) {
  const { palette } = useThemeSafe();
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [isListening, setIsListening] = useState(false);
  const [aiTranscript, setAiTranscript] = useState('');
  const [userTranscript, setUserTranscript] = useState('');
  const [selectedVoice, setSelectedVoice] = useState<GeminiVoiceId>('Kore');
  const [showVoicePicker, setShowVoicePicker] = useState(false);
  const [sessionDuration, setSessionDuration] = useState(0);

  const geminiSession = useRef<GeminiLiveSession>(getGeminiLiveSession());
  const recorder = useRef(useAudioRecorder(RecordingPresets.HIGH_QUALITY));
  const durationTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptScrollRef = useRef<ScrollView>(null);
  const aiTranscriptRef = useRef('');
  const userTranscriptRef = useRef('');

  // Animations
  const pulseScale = useSharedValue(1);
  const waveAmplitude = useSharedValue(0);
  const connectingRotation = useSharedValue(0);

  // Pulse animation when listening
  useEffect(() => {
    if (isListening) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.3, { duration: 1000, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.in(Easing.ease) }),
        ), -1, false,
      );
      waveAmplitude.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 600 }),
          withTiming(0.3, { duration: 600 }),
        ), -1, true,
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 300 });
      waveAmplitude.value = withTiming(0, { duration: 300 });
    }
  }, [isListening, pulseScale, waveAmplitude]);

  // Connecting spinner
  useEffect(() => {
    if (connectionState === 'connecting') {
      connectingRotation.value = withRepeat(
        withTiming(360, { duration: 1500, easing: Easing.linear }),
        -1, false,
      );
    } else {
      connectingRotation.value = withTiming(0, { duration: 200 });
    }
  }, [connectionState, connectingRotation]);

  // Duration timer
  useEffect(() => {
    if (connectionState === 'connected') {
      durationTimer.current = setInterval(() => {
        setSessionDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (durationTimer.current) {
        clearInterval(durationTimer.current);
        durationTimer.current = null;
      }
    }
    return () => {
      if (durationTimer.current) clearInterval(durationTimer.current);
    };
  }, [connectionState]);

  // Cleanup on unmount
  useEffect(() => {
    const liveSession = geminiSession.current;
    return () => {
      liveSession.disconnect();
      setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    aiTranscriptRef.current = aiTranscript;
  }, [aiTranscript]);

  useEffect(() => {
    userTranscriptRef.current = userTranscript;
  }, [userTranscript]);

  const startAudioCapture = useCallback(async () => {
    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.current.prepareToRecordAsync();
      recorder.current.record();
    } catch (err) {
      console.warn('[VoiceLive] Failed to start audio capture:', err);
      setIsListening(false);
      setConnectionState('error');
      Alert.alert('Microphone Error', 'Could not start microphone capture. Please try again.');
    }
  }, []);

  const ensurePermissions = useCallback(async () => {
    const current = await getRecordingPermissionsAsync();
    if (current.status === 'granted') return true;
    const next = await requestRecordingPermissionsAsync();
    return next.status === 'granted';
  }, []);

  const startVoiceSession = useCallback(async () => {
    const hasPermission = await ensurePermissions();
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Microphone access is needed for voice coaching.');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setConnectionState('connecting');
    setAiTranscript('');
    setUserTranscript('');
    aiTranscriptRef.current = '';
    userTranscriptRef.current = '';
    setSessionDuration(0);

    try {
      await geminiSession.current.connect(
        coachId,
        sessionId,
        {
          onConnected: () => {
            setConnectionState('connected');
            setIsListening(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            startAudioCapture();
          },
          onAudioData: (audioData) => {
            // Audio playback would be handled here
            // For now, we rely on transcript for feedback
          },
          onTranscript: (text, isFinal) => {
            setAiTranscript((prev) => {
              const next = prev + text;
              aiTranscriptRef.current = next;
              return next;
            });
            if (isFinal) {
              onTranscriptUpdate?.(userTranscriptRef.current, aiTranscriptRef.current);
            }
            // Auto-scroll transcript
            setTimeout(() => {
              transcriptScrollRef.current?.scrollToEnd({ animated: true });
            }, 50);
          },
          onInterrupted: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          },
          onToolCall: (toolCall) => {
            if (toolCall.name === 'save_insight' && toolCall.args) {
              const title = toolCall.args.title;
              const content = toolCall.args.content;
              if (typeof title !== 'string' || typeof content !== 'string') {
                return;
              }
              onInsightSaved?.(
                title,
                content,
              );
            }
          },
          onError: (error) => {
            if (isVoiceServiceUnavailableError(error)) {
              console.warn('[VoiceLive] Voice service unavailable:', error);
              setConnectionState('disconnected');
              setIsListening(false);
              Alert.alert('Voice Unavailable', VOICE_UNAVAILABLE_MESSAGE);
              onClose();
              return;
            }

            console.warn('[VoiceLive] Error:', error);
            setConnectionState('error');
            Alert.alert('Voice Error', error);
          },
          onDisconnected: () => {
            setConnectionState('disconnected');
            setIsListening(false);
          },
        },
        selectedVoice,
      );
    } catch (error) {
      const isUnavailable = isVoiceServiceUnavailableError(error);
      const errorMessage = normalizeErrorMessage(error);

      if (isUnavailable) {
        console.warn('[VoiceLive] Voice service unavailable:', errorMessage);
      } else {
        console.warn('[VoiceLive] Connection failed:', error);
      }

      setConnectionState(isUnavailable ? 'disconnected' : 'error');
      Alert.alert(
        isUnavailable ? 'Voice Unavailable' : 'Connection Failed',
        isUnavailable ? VOICE_UNAVAILABLE_MESSAGE : FALLBACK_TEXT_MODE_MESSAGE,
      );
      onClose();
    }
  }, [coachId, sessionId, selectedVoice, ensurePermissions, onClose, onTranscriptUpdate, onInsightSaved, startAudioCapture]);

  const stopVoiceSession = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsListening(false);

    try {
      if (recorder.current.isRecording) {
        await recorder.current.stop();
      }
      await setAudioModeAsync({ allowsRecording: false });
    } catch {
      // ignore
    }

    geminiSession.current.disconnect();
    setConnectionState('disconnected');
  }, []);

  const handleClose = useCallback(async () => {
    await stopVoiceSession();
    onClose();
  }, [stopVoiceSession, onClose]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const waveStyle = useAnimatedStyle(() => ({
    opacity: waveAmplitude.value,
  }));

  const spinnerStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${connectingRotation.value}deg` }],
  }));

  if (!isVisible) return null;

  return (
    <Animated.View
      entering={SlideInDown.duration(400).springify()}
      exiting={SlideOutDown.duration(300)}
      style={[styles.container, { backgroundColor: palette.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: palette.borderLight }]}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={palette.textTertiary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>
            Voice Session
          </Text>
          <Text style={[styles.headerSubtitle, { color: palette.textTertiary }]}>
            {coachName} {connectionState === 'connected' ? `• ${formatDuration(sessionDuration)}` : ''}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowVoicePicker(!showVoicePicker)}
          style={styles.voicePickerButton}
          disabled={connectionState === 'connected'}
        >
          <Ionicons name="options-outline" size={20} color={palette.textTertiary} />
        </TouchableOpacity>
      </View>

      {/* Voice Picker Dropdown */}
      {showVoicePicker && connectionState !== 'connected' && (
        <Animated.View entering={FadeIn.duration(200)} style={[styles.voicePicker, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
          <Text style={[styles.voicePickerTitle, { color: palette.textTertiary }]}>Choose Voice</Text>
          <View style={styles.voiceGrid}>
            {GEMINI_VOICES.map((voice) => (
              <TouchableOpacity
                key={voice.id}
                onPress={() => {
                  setSelectedVoice(voice.id);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.voiceOption,
                  { borderColor: selectedVoice === voice.id ? palette.accent : palette.border },
                  selectedVoice === voice.id && { backgroundColor: palette.accentMuted },
                ]}
              >
                <Text style={[styles.voiceName, { color: selectedVoice === voice.id ? palette.accent : palette.textPrimary }]}>
                  {voice.name}
                </Text>
                <Text style={[styles.voiceDesc, { color: palette.textTertiary }]}>{voice.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      )}

      {/* Transcript Area */}
      <ScrollView
        ref={transcriptScrollRef}
        style={styles.transcriptArea}
        contentContainerStyle={styles.transcriptContent}
        showsVerticalScrollIndicator={false}
      >
        {connectionState === 'disconnected' && !aiTranscript && (
          <View style={styles.placeholderContainer}>
            <Ionicons name="mic-outline" size={48} color={palette.textTertiary} />
            <Text style={[styles.placeholderText, { color: palette.textTertiary }]}>
              Tap the microphone to start a voice coaching session with {coachName}
            </Text>
            <Text style={[styles.placeholderHint, { color: palette.textTertiary }]}>
              Speak naturally — your coach will respond in real-time
            </Text>
          </View>
        )}

        {connectionState === 'connecting' && (
          <View style={styles.placeholderContainer}>
            <Animated.View style={spinnerStyle}>
              <Ionicons name="sync" size={32} color={palette.accent} />
            </Animated.View>
            <Text style={[styles.placeholderText, { color: palette.accent }]}>
              Connecting to {coachName}...
            </Text>
          </View>
        )}

        {aiTranscript ? (
          <View style={styles.transcriptBlock}>
            <View style={styles.transcriptSpeaker}>
              <View style={[styles.speakerDot, { backgroundColor: palette.accent }]} />
              <Text style={[styles.speakerLabel, { color: palette.accent }]}>{coachName}</Text>
            </View>
            <Text style={[styles.transcriptText, { color: palette.textSecondary }]}>
              {aiTranscript}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Voice Controls */}
      <View style={[styles.controlsContainer, { backgroundColor: palette.background, borderTopColor: palette.borderLight }]}>
        {/* Waveform Visualization */}
        {isListening && (
          <Animated.View style={[styles.waveformContainer, waveStyle]}>
            {Array.from({ length: 24 }).map((_, i) => (
              <WaveformBar key={i} index={i} color={palette.accent} isActive={isListening} />
            ))}
          </Animated.View>
        )}

        {/* Main Microphone Button */}
        <View style={styles.micButtonContainer}>
          {isListening && (
            <Animated.View
              style={[
                styles.pulseRing,
                { backgroundColor: palette.accent },
                pulseStyle,
              ]}
            />
          )}
          <TouchableOpacity
            onPress={connectionState === 'connected' ? stopVoiceSession : startVoiceSession}
            disabled={connectionState === 'connecting'}
            style={[
              styles.micButton,
              {
                backgroundColor: isListening ? palette.accent : palette.cardBg,
                borderColor: isListening ? palette.accent : palette.border,
              },
            ]}
          >
            <Ionicons
              name={
                connectionState === 'connecting' ? 'sync' :
                isListening ? 'stop' : 'mic'
              }
              size={32}
              color={isListening ? palette.textInverse : palette.accent}
            />
          </TouchableOpacity>
        </View>

        {/* Status Text */}
        <Text style={[styles.statusText, { color: palette.textTertiary }]}>
          {connectionState === 'connecting' ? 'Connecting...' :
           isListening ? 'Listening — speak naturally' :
           connectionState === 'error' ? 'Connection error — tap to retry' :
           'Tap to start voice coaching'}
        </Text>
      </View>
    </Animated.View>
  );
}

// Waveform bar with randomized animation
function WaveformBar({ index, color, isActive }: { index: number; color: string; isActive: boolean }) {
  const height = useSharedValue(4);

  useEffect(() => {
    if (isActive) {
      const baseHeight = 4 + Math.random() * 8;
      const peakHeight = baseHeight + 12 + Math.random() * 20;
      const duration = 200 + Math.random() * 300;
      height.value = withRepeat(
        withSequence(
          withTiming(peakHeight, { duration }),
          withTiming(baseHeight, { duration }),
        ), -1, true,
      );
    } else {
      height.value = withTiming(4, { duration: 300 });
    }
  }, [height, isActive]);

  const barStyle = useAnimatedStyle(() => ({ height: height.value }));

  return (
    <Animated.View
      style={[
        styles.waveformBar,
        { backgroundColor: color },
        barStyle,
      ]}
    />
  );
}

export default VoiceLiveSession;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
  },
  headerSubtitle: {
    fontSize: Typography.sizes.caption,
    marginTop: 2,
  },
  voicePickerButton: {
    padding: Spacing.xs,
  },
  voicePicker: {
    margin: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: Radius.xl,
    borderWidth: 1,
    ...Shadows.sm,
  },
  voicePickerTitle: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.md,
  },
  voiceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  voiceOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  voiceName: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
  },
  voiceDesc: {
    fontSize: Typography.sizes.micro,
    marginTop: 2,
  },
  transcriptArea: {
    flex: 1,
  },
  transcriptContent: {
    padding: Spacing.xxl,
    flexGrow: 1,
    justifyContent: 'center',
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxxl,
    gap: Spacing.lg,
  },
  placeholderText: {
    fontSize: Typography.sizes.bodyLarge,
    fontFamily: Typography.fonts.serif,
    textAlign: 'center',
    lineHeight: Typography.sizes.bodyLarge * 1.5,
  },
  placeholderHint: {
    fontSize: Typography.sizes.caption,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  transcriptBlock: {
    marginBottom: Spacing.xl,
  },
  transcriptSpeaker: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  speakerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  speakerLabel: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  transcriptText: {
    fontSize: Typography.sizes.bodyLarge,
    lineHeight: Typography.sizes.bodyLarge * 1.6,
    fontFamily: Typography.fonts.serif,
    paddingLeft: Spacing.lg,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(0,0,0,0.1)',
  },
  controlsContainer: {
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxxl,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    gap: 2,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.xl,
  },
  waveformBar: {
    width: 3,
    borderRadius: 2,
    minHeight: 4,
  },
  micButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  pulseRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    opacity: 0.2,
  },
  micButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  statusText: {
    fontSize: Typography.sizes.caption,
    fontStyle: 'italic',
  },
});
