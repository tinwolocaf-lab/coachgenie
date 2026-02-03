import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp, FadeInDown } from 'react-native-reanimated';
import { Colors, Typography, Spacing } from '@/constants/theme';
import { Button } from '@/components/ui/Button';

export default function WelcomeScreen() {
  const router = useRouter();

  const handleStart = () => {
    router.push('/onboarding/values');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Animated.View
          entering={FadeInUp.duration(600).delay(200)}
          style={styles.header}
        >
          <View style={styles.logoContainer}>
            <Text style={styles.logoIcon}>🧭</Text>
          </View>
          <Text style={styles.title}>Coachgenie</Text>
          <Text style={styles.subtitle}>Your personal AI coaching companion</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInUp.duration(600).delay(400)}
          style={styles.features}
        >
          <FeatureItem
            emoji="🎯"
            title="Personalized Coaching"
            description="AI coaches adapted to your unique goals and style"
          />
          <FeatureItem
            emoji="📋"
            title="Smart Planning"
            description="Dynamic 7-day plans that evolve with you"
          />
          <FeatureItem
            emoji="💡"
            title="Deep Focus"
            description="Clarity sessions to cut through the noise"
          />
        </Animated.View>

        <Animated.View
          entering={FadeInDown.duration(600).delay(600)}
          style={styles.footer}
        >
          <Button
            title="Get Started"
            onPress={handleStart}
            size="lg"
            fullWidth
          />
          <Text style={styles.footerText}>
            3 minutes to set up your coaching experience
          </Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

function FeatureItem({
  emoji,
  title,
  description,
}: {
  emoji: string;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureEmoji}>{emoji}</Text>
      <View style={styles.featureText}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.offWhite,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xxl,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    paddingTop: Spacing.section,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.electricIndigo + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  logoIcon: {
    fontSize: 40,
  },
  title: {
    fontSize: Typography.sizes.hero,
    fontWeight: Typography.weights.bold,
    color: Colors.slateCharcoal,
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.sizes.subtitle,
    color: Colors.slateGray,
    textAlign: 'center',
  },
  features: {
    gap: Spacing.xl,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.lg,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  featureEmoji: {
    fontSize: 32,
    marginRight: Spacing.lg,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: Typography.sizes.bodyLarge,
    fontWeight: Typography.weights.semibold,
    color: Colors.slateCharcoal,
    marginBottom: Spacing.xs,
  },
  featureDescription: {
    fontSize: Typography.sizes.body,
    color: Colors.slateGray,
    lineHeight: 20,
  },
  footer: {
    paddingBottom: Spacing.xl,
    alignItems: 'center',
  },
  footerText: {
    marginTop: Spacing.md,
    fontSize: Typography.sizes.caption,
    color: Colors.slateLight,
  },
});
