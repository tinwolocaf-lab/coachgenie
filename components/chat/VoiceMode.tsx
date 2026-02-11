// Voice Mode - Microphone toggle + waveform for chat (Oracle tier)
import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat,
  withSequence, withTiming, withSpring, Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  getRecordingPermissionsAsync, requestRecordingPermissionsAsync,
  RecordingPresets, setAudioModeAsync, useAudioRecorder,
} from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '@/lib/supabase';
import { Spacing, Radius } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';

const getFunctionsBaseUrl = () => {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL');
  return `${url.replace(/\/$/, '')}/functions/v1`;
};

interface VoiceModeProps {
  onTranscription: (text: string) => void;
  isEnabled: boolean;
}

export function VoiceMode({ onTranscription, isEnabled }: VoiceModeProps) {
  const { palette } = useThemeSafe();
  const [isActive, setIsActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.4, { duration: 800, easing: Easing.out(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.in(Easing.ease) }),
        ), -1, false,
      );
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.15, { duration: 800, easing: Easing.out(Easing.ease) }),
          withTiming(0.4, { duration: 800, easing: Easing.in(Easing.ease) }),
        ), -1, false,
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 200 });
      pulseOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [isActive, pulseScale, pulseOpacity]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const ensurePermissions = useCallback(async () => {
    const current = await getRecordingPermissionsAsync();
    if (current.status === 'granted') return true;
    const next = await requestRecordingPermissionsAsync();
    return next.status === 'granted';
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const hasPermission = await ensurePermissions();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Microphone access is needed for voice mode.');
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await recorder.prepareToRecordAsync();
      recorder.record();
      setIsActive(true);
    } catch (err) {
      console.error('VoiceMode: failed to start recording', err);
      Alert.alert('Error', 'Could not start recording.');
    }
  }, [ensurePermissions, recorder]);

  const stopRecording = useCallback(async () => {
    if (!recorder.isRecording) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsActive(false);
      setIsProcessing(true);
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false });
      const uri = recorder.uri;
      if (!uri) throw new Error('No recording URI');
      const base64Audio = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
      const fileName = uri.split('/').pop() || 'voice.m4a';
      const ext = fileName.split('.').pop()?.toLowerCase();
      const mimeType = ext === 'wav' ? 'audio/wav' : ext === 'mp3' ? 'audio/mpeg' : 'audio/m4a';
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Not authenticated');
      const res = await fetch(`${getFunctionsBaseUrl()}/voice-transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ audio_base64: base64Audio, file_name: fileName, mime_type: mimeType }),
      });
      if (!res.ok) throw new Error(await res.text());
      const payload = await res.json();
      const text = payload.text || '';
      if (text.trim()) {
        onTranscription(text.trim());
      } else {
        Alert.alert('No Speech Detected', 'Could not detect speech. Please try again.');
      }
    } catch (err) {
      console.error('VoiceMode: transcription failed', err);
      Alert.alert('Error', 'Transcription failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [recorder, onTranscription]);

  useEffect(() => {
    return () => {
      if (recorder.isRecording) void recorder.stop().catch(() => undefined);
      void setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
    };
  }, [recorder]);

  const handlePress = () => {
    if (!isEnabled || isProcessing) return;
    if (isActive) void stopRecording();
    else void startRecording();
  };

  const iconColor = isActive ? palette.accent : isEnabled ? palette.textSecondary : palette.textTertiary;

  return (
    <View style={styles.voiceContainer}>
      <Animated.View style={[styles.pulseRing, { backgroundColor: palette.accent }, pulseStyle]} />
      <TouchableOpacity
        onPress={handlePress}
        disabled={!isEnabled || isProcessing}
        activeOpacity={0.7}
        style={[
          styles.micButton,
          {
            backgroundColor: isActive ? palette.accentMuted : palette.backgroundSecondary,
            borderColor: isActive ? palette.accent : palette.border,
          },
        ]}
      >
        <Ionicons
          name={isProcessing ? 'hourglass' : isActive ? 'mic' : 'mic-outline'}
          size={22}
          color={iconColor}
        />
      </TouchableOpacity>
      {isActive && (
        <View style={styles.waveContainer}>
          {[0, 1, 2, 3, 4].map((i) => (
            <WaveBar key={i} index={i} color={palette.accent} />
          ))}
        </View>
      )}
    </View>
  );
}

// Animated waveform bar
function WaveBar({ index, color }: { index: number; color: string }) {
  const height = useSharedValue(8);
  useEffect(() => {
    const base = 8 + (index % 3) * 4;
    const peak = base + 14;
    height.value = withRepeat(
      withSequence(
        withTiming(peak, { duration: 280 + index * 40 }),
        withTiming(base, { duration: 280 + index * 40 }),
      ), -1, true,
    );
  }, [height, index]);
  const barStyle = useAnimatedStyle(() => ({ height: height.value }));
  return <Animated.View style={[styles.waveBar, { backgroundColor: color }, barStyle]} />;
}

// Voice playback button (TTS placeholder)
interface VoicePlaybackProps {
  text: string;
  isPlaying: boolean;
  onToggle: () => void;
}

export function VoicePlayback({ text: _text, isPlaying, onToggle }: VoicePlaybackProps) {
  const { palette } = useThemeSafe();
  const scale = useSharedValue(1);
  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSpring(1, { damping: 15, stiffness: 150, mass: 0.8 });
    onToggle();
  };
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        style={[
          styles.playbackButton,
          {
            backgroundColor: isPlaying ? palette.accentMuted : palette.backgroundSecondary,
            borderColor: isPlaying ? palette.accent : palette.border,
          },
        ]}
      >
        <Ionicons
          name={isPlaying ? 'volume-high' : 'volume-medium-outline'}
          size={18}
          color={isPlaying ? palette.accent : palette.textSecondary}
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

const centered = { alignItems: 'center' as const, justifyContent: 'center' as const };
const styles = StyleSheet.create({
  voiceContainer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  pulseRing: { position: 'absolute', width: 44, height: 44, borderRadius: 22 },
  micButton: { width: 40, height: 40, borderRadius: Radius.full, borderWidth: 1, ...centered },
  waveContainer: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 28 },
  waveBar: { width: 3, borderRadius: 2 },
  playbackButton: { width: 32, height: 32, borderRadius: Radius.full, borderWidth: 1, ...centered },
});

export default VoiceMode;
