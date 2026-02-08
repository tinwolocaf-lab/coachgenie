import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInUp, FadeIn } from 'react-native-reanimated';
import { Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { Button } from '@/components/ui/Button';
import { getOfferings, restorePurchases } from '@/lib/revenuecat';
import { getUserSubscriptionTier } from '@/lib/revenuecat';
import type { SubscriptionTier } from '@/lib/feature-gates';
import Purchases from 'react-native-purchases';

interface TierInfo {
  id: SubscriptionTier;
  name: string;
  price: string;
  yearlyPrice: string;
  tagline: string;
  features: { label: string; included: boolean }[];
  highlight?: boolean;
}

const TIERS: TierInfo[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    yearlyPrice: '$0',
    tagline: 'Get started with coaching',
    features: [
      { label: '1 coach (Daily Clarity)', included: true },
      { label: '3 sessions per day', included: true },
      { label: '15 messages per session', included: true },
      { label: 'Basic archive', included: true },
      { label: 'All coaches', included: false },
      { label: 'Voice notes', included: false },
      { label: 'Integrations', included: false },
      { label: 'Premium AI models', included: false },
    ],
  },
  {
    id: 'sovereign',
    name: 'Sovereign',
    price: '$12.99/mo',
    yearlyPrice: '$99.99/yr',
    tagline: 'Unlock your full potential',
    highlight: true,
    features: [
      { label: 'All 5+ coaches', included: true },
      { label: 'Unlimited sessions', included: true },
      { label: 'Unlimited messages', included: true },
      { label: 'Full archive access', included: true },
      { label: 'Voice notes', included: true },
      { label: 'Integrations', included: true },
      { label: 'All atmospheres', included: true },
      { label: 'Premium AI models', included: false },
    ],
  },
  {
    id: 'oracle',
    name: 'Oracle',
    price: '$24.99/mo',
    yearlyPrice: '$199.99/yr',
    tagline: 'The ultimate coaching experience',
    features: [
      { label: 'Everything in Sovereign', included: true },
      { label: 'Premium AI (Claude/GPT-4o)', included: true },
      { label: 'Custom coach creation', included: true },
      { label: 'Proactive nudges', included: true },
      { label: 'Voice coaching', included: true },
      { label: 'Growth dashboard', included: true },
      { label: 'Priority support', included: true },
      { label: 'Early access features', included: true },
    ],
  },
];

export default function PaywallScreen() {
  const router = useRouter();
  const { palette, setSubscriptionTier } = useThemeSafe();
  const { targetTier } = useLocalSearchParams<{ targetTier?: string }>();
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(
    (targetTier as SubscriptionTier) || 'sovereign'
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleSelectTier = (tier: SubscriptionTier) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTier(tier);
  };

  const handlePurchase = async () => {
    if (selectedTier === 'free') {
      router.back();
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const offerings = await getOfferings();
      if (!offerings) {
        throw new Error('No offerings available');
      }

      const packageId = selectedTier === 'oracle' ? 'oracle_annual' : 'sovereign_annual';
      const pkg = offerings.availablePackages.find(
        (p) => p.identifier === packageId || p.identifier === `$rc_annual`
      ) || offerings.annual;

      if (pkg) {
        await Purchases.purchasePackage(pkg);
        const tier = await getUserSubscriptionTier();
        setSubscriptionTier(tier);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      }
    } catch (error: any) {
      if (error?.userCancelled) {
        // User cancelled - do nothing
      } else {
        console.error('[Paywall] Purchase error:', error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      await restorePurchases();
      const tier = await getUserSubscriptionTier();
      setSubscriptionTier(tier);
      if (tier !== 'free') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      }
    } catch {
      // Silently handle
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={palette.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Choose Your Plan</Text>
        <View style={styles.headerSpacer} />
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Tier Cards */}
        {TIERS.map((tier, index) => (
          <Animated.View
            key={tier.id}
            entering={FadeInUp.duration(500).delay(100 + index * 100)}
          >
            <TouchableOpacity
              style={[
                styles.tierCard,
                { backgroundColor: palette.cardBg, borderColor: palette.border },
                selectedTier === tier.id && {
                  borderColor: palette.accent,
                  borderWidth: 2,
                },
                tier.highlight && selectedTier === tier.id && Shadows.gold,
              ]}
              onPress={() => handleSelectTier(tier.id)}
              activeOpacity={0.9}
            >
              {tier.highlight && (
                <View style={[styles.popularBadge, { backgroundColor: palette.accent }]}>
                  <Text style={[styles.popularText, { color: palette.textInverse }]}>MOST POPULAR</Text>
                </View>
              )}

              <View style={styles.tierHeader}>
                <View style={styles.tierTitleRow}>
                  <Text style={[styles.tierName, { color: palette.textPrimary }]}>{tier.name}</Text>
                  {selectedTier === tier.id && (
                    <Ionicons name="checkmark-circle" size={24} color={palette.accent} />
                  )}
                </View>
                <Text style={[styles.tierTagline, { color: palette.textTertiary }]}>{tier.tagline}</Text>
                <View style={styles.priceRow}>
                  <Text style={[styles.tierPrice, { color: palette.accent }]}>{tier.yearlyPrice}</Text>
                  {tier.id !== 'free' && (
                    <Text style={[styles.monthlyPrice, { color: palette.textTertiary }]}>
                      or {tier.price}
                    </Text>
                  )}
                </View>
              </View>

              <View style={[styles.tierDivider, { backgroundColor: palette.borderLight }]} />

              <View style={styles.featuresList}>
                {tier.features.map((feature, idx) => (
                  <View key={idx} style={styles.featureItem}>
                    <Ionicons
                      name={feature.included ? 'checkmark-circle' : 'close-circle'}
                      size={18}
                      color={feature.included ? palette.success : palette.textTertiary}
                    />
                    <Text
                      style={[
                        styles.featureText,
                        { color: feature.included ? palette.textSecondary : palette.textTertiary },
                      ]}
                    >
                      {feature.label}
                    </Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          </Animated.View>
        ))}

        {/* Restore purchases */}
        <Animated.View entering={FadeIn.duration(400).delay(500)}>
          <TouchableOpacity onPress={handleRestore} style={styles.restoreButton} disabled={isRestoring}>
            <Text style={[styles.restoreText, { color: palette.textTertiary }]}>
              {isRestoring ? 'Restoring...' : 'Restore Purchases'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Footer CTA */}
      <View style={[styles.footer, { borderTopColor: palette.borderLight, backgroundColor: palette.background }]}>
        <Button
          title={selectedTier === 'free' ? 'Continue Free' : `Subscribe to ${selectedTier === 'sovereign' ? 'Sovereign' : 'Oracle'}`}
          onPress={handlePurchase}
          variant="gold"
          size="lg"
          fullWidth
          loading={isLoading}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  closeButton: { padding: Spacing.xs },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: Typography.sizes.title,
    fontFamily: Typography.fonts.serif,
    fontWeight: Typography.weights.semibold,
  },
  headerSpacer: { width: 40 },
  scrollContent: { paddingHorizontal: Spacing.xxl, paddingBottom: Spacing.xxl },
  tierCard: {
    borderRadius: Radius.squircle,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  popularBadge: {
    alignSelf: 'center',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    borderBottomLeftRadius: Radius.md,
    borderBottomRightRadius: Radius.md,
  },
  popularText: {
    fontSize: Typography.sizes.micro,
    fontWeight: Typography.weights.bold,
    letterSpacing: Typography.letterSpacing.wider,
  },
  tierHeader: { padding: Spacing.xl },
  tierTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  tierName: {
    fontSize: Typography.sizes.headline,
    fontFamily: Typography.fonts.serif,
    fontWeight: Typography.weights.bold,
  },
  tierTagline: { fontSize: Typography.sizes.body, marginBottom: Spacing.md },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm },
  tierPrice: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.bold,
    fontFamily: Typography.fonts.serif,
  },
  monthlyPrice: { fontSize: Typography.sizes.caption },
  tierDivider: { height: 1, marginHorizontal: Spacing.xl },
  featuresList: { padding: Spacing.xl, gap: Spacing.sm },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  featureText: { fontSize: Typography.sizes.body, flex: 1 },
  restoreButton: { alignItems: 'center', paddingVertical: Spacing.lg },
  restoreText: { fontSize: Typography.sizes.body, textDecorationLine: 'underline' },
  footer: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
  },
});
