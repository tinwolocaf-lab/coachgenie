import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface GoldDustLoaderProps {
  message?: string;
  subMessage?: string;
  size?: 'sm' | 'md' | 'lg';
}

interface ParticleProps {
  index: number;
  delay: number;
  size: number;
  x: number;
  y: number;
}

function GoldParticle({ index, delay, size, x, y }: ParticleProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 800, easing: Easing.in(Easing.ease) })
        ),
        -1,
        false
      )
    );

    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-30, { duration: 1400, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 0 })
        ),
        -1,
        false
      )
    );

    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) }),
          withTiming(0.3, { duration: 1100, easing: Easing.in(Easing.ease) })
        ),
        -1,
        false
      )
    );
  }, [delay, opacity, translateY, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          left: x,
          top: y,
        },
        animatedStyle,
      ]}
    />
  );
}

function CentralOrb({ size }: { size: 'sm' | 'md' | 'lg' }) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);
  const rotation = useSharedValue(0);

  const orbSize = size === 'sm' ? 40 : size === 'md' ? 60 : 80;

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    opacity.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.6, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    rotation.value = withRepeat(
      withTiming(360, { duration: 8000, easing: Easing.linear }),
      -1,
      false
    );
  }, [scale, opacity, rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.orbContainer, { width: orbSize, height: orbSize }, animatedStyle]}>
      <View style={[styles.orbOuter, { width: orbSize, height: orbSize, borderRadius: orbSize / 2 }]}>
        <View style={[styles.orbInner, { width: orbSize * 0.6, height: orbSize * 0.6, borderRadius: (orbSize * 0.6) / 2 }]} />
      </View>
    </Animated.View>
  );
}

export function GoldDustLoader({ message, subMessage, size = 'md' }: GoldDustLoaderProps) {
  const containerSize = size === 'sm' ? 100 : size === 'md' ? 150 : 200;

  // Generate particles around the orb
  const particles = [];
  const particleCount = size === 'sm' ? 8 : size === 'md' ? 12 : 16;

  for (let i = 0; i < particleCount; i++) {
    const angle = (i / particleCount) * Math.PI * 2;
    const radius = containerSize / 3;
    const x = containerSize / 2 + Math.cos(angle) * radius - 3;
    const y = containerSize / 2 + Math.sin(angle) * radius - 3;
    const particleSize = 3 + Math.random() * 4;
    const delay = i * 100;

    particles.push(
      <GoldParticle
        key={i}
        index={i}
        delay={delay}
        size={particleSize}
        x={x}
        y={y}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.particleContainer, { width: containerSize, height: containerSize }]}>
        {particles}
        <View style={styles.orbWrapper}>
          <CentralOrb size={size} />
        </View>
      </View>
      {message && (
        <Text style={styles.message}>{message}</Text>
      )}
      {subMessage && (
        <Text style={styles.subMessage}>{subMessage}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xxl,
  },
  particleContainer: {
    position: 'relative',
    marginBottom: Spacing.xl,
  },
  particle: {
    position: 'absolute',
    backgroundColor: Colors.burnishedGold,
    shadowColor: Colors.burnishedGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  orbWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbOuter: {
    backgroundColor: Colors.goldMuted,
    borderWidth: 2,
    borderColor: Colors.burnishedGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbInner: {
    backgroundColor: Colors.burnishedGold,
    shadowColor: Colors.burnishedGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  message: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.medium,
    color: Colors.midnightEmerald,
    textAlign: 'center',
    fontFamily: Typography.fonts.serif,
    marginBottom: Spacing.sm,
  },
  subMessage: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default GoldDustLoader;
