// AI Resonance Note - A handwritten-style personalized letter from The Oracle
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { GhostTyping } from './GhostTyping';

// Candlelight / dimmed mode warm palette
const CandlelightPalette = {
  background: '#1A1510',
  cardBg: '#231E17',
  cardBorder: '#3D3428',
  textPrimary: '#E8DCC8',
  textSecondary: '#C4B49A',
  textTertiary: '#8A7B66',
  accent: '#D4A547',
  accentWarm: '#C89038',
  warmGlow: '#E8B44D20',
  divider: '#3D342840',
};

interface AIResonanceNoteProps {
  letter: string;
  onComplete?: () => void;
  userName?: string;
}

export function AIResonanceNote({
  letter,
  onComplete,
  userName,
}: AIResonanceNoteProps) {
  const [showLetter, setShowLetter] = useState(false);

  // Animation values
  const noteOpacity = useSharedValue(0);
  const noteScale = useSharedValue(0.96);
  const headerOpacity = useSharedValue(0);
  const footerOpacity = useSharedValue(0);

  useEffect(() => {
    // Sequence: note fades in, then header, then content
    noteOpacity.value = withDelay(300, withTiming(1, { duration: 1000, easing: Easing.out(Easing.quad) }));
    noteScale.value = withDelay(300, withTiming(1, { duration: 1200, easing: Easing.out(Easing.quad) }));
    headerOpacity.value = withDelay(800, withTiming(1, { duration: 800 }));

    // Show letter content after note card animates in
    const timer = setTimeout(() => {
      setShowLetter(true);
      // Subtle haptic for the "letter arriving" feel
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, 1200);

    return () => clearTimeout(timer);
  }, [noteOpacity, noteScale, headerOpacity]);

  const handleGhostTypingComplete = () => {
    // Show footer after typing completes
    footerOpacity.value = withTiming(1, { duration: 800 });
    // Soft notification pulse for completion
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete?.();
  };

  const noteStyle = useAnimatedStyle(() => ({
    opacity: noteOpacity.value,
    transform: [{ scale: noteScale.value }],
  }));

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
  }));

  const footerStyle = useAnimatedStyle(() => ({
    opacity: footerOpacity.value,
  }));

  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });

  return (
    <Animated.View style={[styles.container, noteStyle]}>
      {/* Note card with warm paper texture */}
      <View style={styles.noteCard}>
        {/* Warm glow overlay */}
        <LinearGradient
          colors={[CandlelightPalette.warmGlow, 'transparent', CandlelightPalette.warmGlow]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Gold accent line at top */}
        <LinearGradient
          colors={['transparent', CandlelightPalette.accent + '40', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.topAccent}
        />

        {/* Header */}
        <Animated.View style={[styles.noteHeader, headerStyle]}>
          <Text style={styles.noteLabel}>AI RESONANCE</Text>
          <Text style={styles.noteDate}>{dateString}</Text>
        </Animated.View>

        {/* Divider */}
        <View style={styles.noteDivider} />

        {/* Letter content with ghost typing */}
        <View style={styles.letterContainer}>
          {showLetter ? (
            <GhostTyping
              text={letter}
              onComplete={handleGhostTypingComplete}
              speed={25}
              isSerif
              hapticEnabled
              style={styles.letterContent}
            />
          ) : (
            <View style={styles.letterPlaceholder} />
          )}
        </View>

        {/* Footer - appears after typing completes */}
        <Animated.View style={[styles.noteFooter, footerStyle]}>
          <View style={styles.footerDivider} />
          <View style={styles.footerContent}>
            <View style={styles.oracleSignature}>
              <View style={styles.signatureDot} />
              <Text style={styles.signatureText}>The Oracle</Text>
            </View>
            {userName && (
              <Text style={styles.recipientText}>for {userName}</Text>
            )}
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    marginVertical: Spacing.xl,
  },
  noteCard: {
    backgroundColor: CandlelightPalette.cardBg,
    borderRadius: Radius.squircle,
    borderWidth: 1,
    borderColor: CandlelightPalette.cardBorder,
    padding: Spacing.xxl,
    paddingVertical: Spacing.xl + Spacing.md,
    overflow: 'hidden',
    ...Shadows.lg,
    shadowColor: '#000',
  },
  topAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },

  // Header
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  noteLabel: {
    fontSize: Typography.sizes.micro,
    fontFamily: Typography.fonts.sansMedium,
    letterSpacing: Typography.letterSpacing.display,
    color: CandlelightPalette.accent,
    textTransform: 'uppercase',
  },
  noteDate: {
    fontSize: Typography.sizes.micro,
    fontFamily: Typography.fonts.sansLight,
    letterSpacing: Typography.letterSpacing.wider,
    color: CandlelightPalette.textTertiary,
    textTransform: 'uppercase',
  },

  // Divider
  noteDivider: {
    height: 1,
    backgroundColor: CandlelightPalette.divider,
    marginBottom: Spacing.xl,
  },

  // Letter
  letterContainer: {
    minHeight: 80,
  },
  letterContent: {
    minHeight: 80,
  },
  letterPlaceholder: {
    height: 80,
  },

  // Footer
  noteFooter: {
    marginTop: Spacing.xl,
  },
  footerDivider: {
    height: 1,
    backgroundColor: CandlelightPalette.divider,
    marginBottom: Spacing.lg,
  },
  footerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  oracleSignature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  signatureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: CandlelightPalette.accent,
  },
  signatureText: {
    fontSize: Typography.sizes.caption,
    fontFamily: Typography.fonts.serifRegular,
    fontStyle: 'italic',
    color: CandlelightPalette.textSecondary,
    letterSpacing: Typography.letterSpacing.editorial,
  },
  recipientText: {
    fontSize: Typography.sizes.micro,
    fontFamily: Typography.fonts.sansLight,
    color: CandlelightPalette.textTertiary,
    letterSpacing: Typography.letterSpacing.wider,
    textTransform: 'lowercase',
  },
});

// Export the candlelight palette for the Evening Audit screen
export { CandlelightPalette };
