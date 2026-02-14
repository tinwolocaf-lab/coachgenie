import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated from "react-native-reanimated";
import { Typography, Spacing, Radius, Shadows } from "@/constants/theme";
import { useThemeSafe } from "@/contexts/ThemeContext";
import { Button } from "@/components/ui/Button";
import {
  getOfferings,
  restorePurchases,
  getUserSubscriptionTier,
} from "@/lib/revenuecat";
import type { SubscriptionTier } from "@/lib/feature-gates";
import Purchases from "react-native-purchases";

interface TierInfo {
  id: SubscriptionTier;
  name: string;
  monthlyPriceLabel: string;
  yearlyPriceLabel: string;
  monthlyPriceCents?: number;
  yearlyPriceCents?: number;
  tagline: string;
  features: { label: string; included: boolean }[];
  highlight?: boolean;
}

const TIERS: TierInfo[] = [
  {
    id: "free",
    name: "Free",
    monthlyPriceLabel: "Free",
    yearlyPriceLabel: "Free",
    tagline: "Start your coaching practice",
    features: [
      { label: "1 coach (Daily Clarity)", included: true },
      { label: "50 monthly credits", included: true },
      { label: "Basic archive", included: true },
      { label: "Text coaching only", included: true },
      { label: "All coaches", included: false },
      { label: "Voice notes", included: false },
      { label: "Live voice coaching", included: false },
      { label: "Integrations", included: false },
      { label: "Premium AI models", included: false },
    ],
  },
  {
    id: "sovereign",
    name: "Sovereign",
    monthlyPriceLabel: "$19.99/mo",
    yearlyPriceLabel: "$179.99/yr",
    monthlyPriceCents: 1999,
    yearlyPriceCents: 17999,
    tagline: "High-agency coaching, daily",
    highlight: true,
    features: [
      { label: "300 monthly credits", included: true },
      { label: "All coaches", included: true },
      { label: "Full archive access", included: true },
      { label: "Voice notes + transcription", included: true },
      { label: "Live voice coaching", included: true },
      { label: "Integrations", included: true },
      { label: "All atmospheres", included: true },
      { label: "Curated chat model selection", included: true },
      { label: "Premium AI reasoning models", included: false },
    ],
  },
  {
    id: "oracle",
    name: "Oracle",
    monthlyPriceLabel: "$49.99/mo",
    yearlyPriceLabel: "$449.99/yr",
    monthlyPriceCents: 4999,
    yearlyPriceCents: 44999,
    tagline: "Deep coaching with premium intelligence",
    features: [
      { label: "Everything in Sovereign", included: true },
      { label: "1000 monthly credits", included: true },
      {
        label: "Premium AI lineup: Opus 4.6, GPT-5.2 Extra High, Gemini 3 Pro",
        included: true,
      },
      { label: "Extended live voice sessions", included: true },
      { label: "Custom coach creation", included: true },
      { label: "Proactive nudges", included: true },
      { label: "Growth dashboard", included: true },
      { label: "Priority support", included: true },
      { label: "Early access features", included: true },
    ],
  },
];

function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function PaywallScreen() {
  const router = useRouter();
  const { palette, setSubscriptionTier } = useThemeSafe();
  const { targetTier } = useLocalSearchParams<{ targetTier?: string }>();
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(
    (targetTier as SubscriptionTier) || "sovereign",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleSelectTier = (tier: SubscriptionTier) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTier(tier);
  };

  const handlePurchase = async () => {
    if (selectedTier === "free") {
      router.back();
      return;
    }

    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const offerings = await getOfferings();
      if (!offerings) {
        throw new Error("No offerings available");
      }

      const packageId =
        selectedTier === "oracle" ? "oracle_annual" : "sovereign_annual";
      const pkg =
        offerings.availablePackages.find(
          (p) => p.identifier === packageId || p.identifier === `$rc_annual`,
        ) || offerings.annual;

      if (pkg) {
        await Purchases.purchasePackage(pkg);
        const tier = await getUserSubscriptionTier();
        setSubscriptionTier(tier);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      }
    } catch (error: unknown) {
      const userCancelled = Boolean(
        error &&
        typeof error === "object" &&
        "userCancelled" in error &&
        (error as { userCancelled?: boolean }).userCancelled,
      );
      if (userCancelled) {
        // User cancelled - do nothing
      } else {
        console.error("[Paywall] Purchase error:", error);
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
      if (tier !== "free") {
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
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.background }]}
      edges={["top", "bottom"]}
    >
      {/* Header */}
      <Animated.View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.closeButton}
        >
          <Ionicons name="close" size={24} color={palette.textSecondary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>
          Choose Your Plan
        </Text>
        <View style={styles.headerSpacer} />
      </Animated.View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Tier Cards */}
        {TIERS.map((tier, index) => (
          <Animated.View key={tier.id}>
            <TouchableOpacity
              style={[
                styles.tierCard,
                {
                  backgroundColor: palette.cardBg,
                  borderColor: palette.border,
                },
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
                <View
                  style={[
                    styles.popularBadge,
                    { backgroundColor: palette.accent },
                  ]}
                >
                  <Text
                    style={[styles.popularText, { color: palette.textInverse }]}
                  >
                    MOST POPULAR
                  </Text>
                </View>
              )}

              <View style={styles.tierHeader}>
                <View style={styles.tierTitleRow}>
                  <Text
                    style={[styles.tierName, { color: palette.textPrimary }]}
                  >
                    {tier.name}
                  </Text>
                  {selectedTier === tier.id && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={palette.accent}
                    />
                  )}
                </View>
                <Text
                  style={[styles.tierTagline, { color: palette.textTertiary }]}
                >
                  {tier.tagline}
                </Text>
                <View style={styles.priceRow}>
                  <Text style={[styles.tierPrice, { color: palette.accent }]}>
                    {tier.yearlyPriceLabel}
                  </Text>
                </View>
                {tier.id !== "free" && tier.monthlyPriceCents && tier.yearlyPriceCents && (
                  <>
                    <Text style={[styles.monthlyPrice, { color: palette.textTertiary }]}>
                      ≈ {formatUsd(tier.yearlyPriceCents / 12)}/mo billed yearly
                    </Text>
                    <Text style={[styles.savingsText, { color: palette.success }]}>
                      Save {formatUsd(tier.monthlyPriceCents - tier.yearlyPriceCents / 12)}/mo
                      {' '}(
                      {Math.round(((tier.monthlyPriceCents - tier.yearlyPriceCents / 12) / tier.monthlyPriceCents) * 100)}
                      %)
                      {' '}vs monthly {tier.monthlyPriceLabel}
                    </Text>
                  </>
                )}
              </View>

              <View
                style={[
                  styles.tierDivider,
                  { backgroundColor: palette.borderLight },
                ]}
              />

              <View style={styles.featuresList}>
                {tier.features.map((feature, idx) => (
                  <View key={idx} style={styles.featureItem}>
                    <Ionicons
                      name={
                        feature.included ? "checkmark-circle" : "close-circle"
                      }
                      size={18}
                      color={
                        feature.included
                          ? palette.success
                          : palette.textTertiary
                      }
                    />
                    <Text
                      style={[
                        styles.featureText,
                        {
                          color: feature.included
                            ? palette.textSecondary
                            : palette.textTertiary,
                        },
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
        <Animated.View>
          <TouchableOpacity
            onPress={handleRestore}
            style={styles.restoreButton}
            disabled={isRestoring}
          >
            <Text style={[styles.restoreText, { color: palette.textTertiary }]}>
              {isRestoring ? "Restoring..." : "Restore Purchases"}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      {/* Footer CTA */}
      <View
        style={[
          styles.footer,
          {
            borderTopColor: palette.borderLight,
            backgroundColor: palette.background,
          },
        ]}
      >
        <Button
          title={
            selectedTier === "free"
              ? "Continue Free"
              : `Subscribe to ${selectedTier === "sovereign" ? "Sovereign" : "Oracle"}`
          }
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  closeButton: { padding: Spacing.xs },
  headerTitle: {
    flex: 1,
    textAlign: "center",
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
    overflow: "hidden",
    ...Shadows.sm,
  },
  popularBadge: {
    alignSelf: "center",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  tierName: {
    fontSize: Typography.sizes.headline,
    fontFamily: Typography.fonts.serif,
    fontWeight: Typography.weights.bold,
  },
  tierTagline: { fontSize: Typography.sizes.body, marginBottom: Spacing.md },
  priceRow: { flexDirection: "row", alignItems: "baseline", gap: Spacing.sm },
  tierPrice: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.bold,
    fontFamily: Typography.fonts.serif,
  },
  monthlyPrice: { fontSize: Typography.sizes.caption, marginTop: Spacing.xs },
  savingsText: { fontSize: Typography.sizes.caption, marginTop: 2 },
  tierDivider: { height: 1, marginHorizontal: Spacing.xl },
  featuresList: { padding: Spacing.xl, gap: Spacing.sm },
  featureItem: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  featureText: { fontSize: Typography.sizes.body, flex: 1 },
  restoreButton: { alignItems: "center", paddingVertical: Spacing.lg },
  restoreText: {
    fontSize: Typography.sizes.body,
    textDecorationLine: "underline",
  },
  footer: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
  },
});
