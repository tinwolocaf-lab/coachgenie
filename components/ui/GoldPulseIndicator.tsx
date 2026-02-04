// Gold Pulse/Shimmer Typing Indicator - Premium meditation-like effect
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  interpolate,
  interpolateColor,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';

interface GoldPulseIndicatorProps {
  coachName?: string;
  variant?: 'pulse' | 'shimmer' | 'dust';
}

// Single pulsing orb
function PulsingOrb({ delay, size }: { delay: number; size: number }) {
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) }),
          withTiming(0.6, { duration: 800, easing: Easing.in(Easing.ease) })
        ),
        -1,
        true
      )
    );

    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 800, easing: Easing.out(Easing.ease) }),
          withTiming(0.3, { duration: 800, easing: Easing.in(Easing.ease) })
        ),
        -1,
        true
      )
    );
  }, [delay, scale, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.orb,
        { width: size, height: size, borderRadius: size / 2 },
        animatedStyle,
      ]}
    />
  );
}

// Shimmer bar effect
function ShimmerBar() {
  const translateX = useSharedValue(-100);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(200, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    );
  }, [translateX]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.shimmerContainer}>
      <View style={styles.shimmerTrack}>
        <Animated.View style={[styles.shimmerGradient, shimmerStyle]}>
          <LinearGradient
            colors={['transparent', Colors.goldShimmer, Colors.burnishedGold, Colors.goldShimmer, 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.shimmerGradientInner}
          />
        </Animated.View>
      </View>
    </View>
  );
}

// Floating dust particles
function DustParticle({ index }: { index: number }) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);

  const baseDelay = index * 150;
  const duration = 2000 + Math.random() * 1000;

  useEffect(() => {
    // Vertical float
    translateY.value = withDelay(
      baseDelay,
      withRepeat(
        withSequence(
          withTiming(-20 - Math.random() * 15, { duration, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 0 })
        ),
        -1,
        false
      )
    );

    // Horizontal drift
    const drift = (Math.random() - 0.5) * 20;
    translateX.value = withDelay(
      baseDelay,
      withRepeat(
        withSequence(
          withTiming(drift, { duration, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 0 })
        ),
        -1,
        false
      )
    );

    // Fade in and out
    opacity.value = withDelay(
      baseDelay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: duration * 0.3, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: duration * 0.7, easing: Easing.in(Easing.ease) })
        ),
        -1,
        false
      )
    );

    // Scale
    scale.value = withDelay(
      baseDelay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: duration * 0.2, easing: Easing.out(Easing.ease) }),
          withTiming(0.3, { duration: duration * 0.8, easing: Easing.in(Easing.ease) })
        ),
        -1,
        false
      )
    );
  }, [baseDelay, duration, translateY, translateX, opacity, scale]);

  const particleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  const size = 3 + Math.random() * 4;
  const left = 10 + (index * 20) % 80;

  return (
    <Animated.View
      style={[
        styles.dustParticle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          left: `${left}%`,
          bottom: 5,
        },
        particleStyle,
      ]}
    />
  );
}

export function GoldPulseIndicator({
  coachName = 'Coach',
  variant = 'pulse',
}: GoldPulseIndicatorProps) {
  const textOpacity = useSharedValue(0.6);

  useEffect(() => {
    textOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.6, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [textOpacity]);

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const renderIndicator = () => {
    switch (variant) {
      case 'shimmer':
        return <ShimmerBar />;
      case 'dust':
        return (
          <View style={styles.dustContainer}>
            {[...Array(8)].map((_, i) => (
              <DustParticle key={i} index={i} />
            ))}
          </View>
        );
      case 'pulse':
      default:
        return (
          <View style={styles.pulseContainer}>
            <PulsingOrb delay={0} size={8} />
            <PulsingOrb delay={200} size={8} />
            <PulsingOrb delay={400} size={8} />
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.indicatorWrapper}>
        {renderIndicator()}
      </View>
      <Animated.Text style={[styles.text, textStyle]}>
        {coachName} is reflecting...
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  indicatorWrapper: {
    marginRight: Spacing.md,
    minWidth: 60,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orb: {
    backgroundColor: Colors.burnishedGold,
    shadowColor: Colors.burnishedGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
  shimmerContainer: {
    width: 60,
    height: 8,
    overflow: 'hidden',
    borderRadius: 4,
  },
  shimmerTrack: {
    flex: 1,
    backgroundColor: Colors.goldMuted,
    borderRadius: 4,
    overflow: 'hidden',
  },
  shimmerGradient: {
    position: 'absolute',
    width: 100,
    height: '100%',
  },
  shimmerGradientInner: {
    flex: 1,
    width: '100%',
  },
  dustContainer: {
    width: 80,
    height: 30,
    position: 'relative',
  },
  dustParticle: {
    position: 'absolute',
    backgroundColor: Colors.burnishedGold,
    shadowColor: Colors.burnishedGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
    elevation: 3,
  },
  text: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
    fontStyle: 'italic',
    fontFamily: Typography.fonts.serif,
  },
});

export default GoldPulseIndicator;
