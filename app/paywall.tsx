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
import { useAlert } from "@/contexts/AlertContext";
import { Button } from "@/components/ui/Button";
import CouponRedeemPanel from "@/components/billing/CouponRedeemCard";
import {
  getOfferings,
  restorePurchases,
} from "@/lib/revenuecat";
import {
  getUserTier,
  invalidateUserTierCache,
  type SubscriptionTier,
} from "@/lib/feature-gates";
import type { RedeemCouponResponse } from "@/lib/apiClient";
import Purchases, {
  type PurchasesOffering,
  type PurchasesPackage,
} from "react-native-purchases";

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

type BillingInterval = "monthly" | "yearly";

const BILLING_INTERVALS: BillingInterval[] = ["monthly", "yearly"];

function normalizeIdentifier(value: string) {
  return value.toLowerCase();
}

function isPaidSubscriptionTier(
  tier: SubscriptionTier,
): tier is Exclude<SubscriptionTier, "free"> {
  return tier === "sovereign" || tier === "oracle";
}

function getPackageForInterval(
  offerings: PurchasesOffering,
  tier: Exclude<SubscriptionTier, "free">,
  interval: BillingInterval,
): PurchasesPackage | null {
  const packages = offerings.availablePackages || [];
  const preferredIdentifier = `${tier}_${interval === "yearly" ? "annual" : "monthly"}`;
  const fallbackRevenueCatIdentifier =
    interval === "yearly" ? "$rc_annual" : "$rc_monthly";

  const exact = packages.find(
    (p) =>
      p.identifier === preferredIdentifier ||
      p.identifier === fallbackRevenueCatIdentifier,
  );
  if (exact) return exact;

  const intervalNeedles =
    interval === "monthly"
      ? ["monthly", "month"]
      : ["annual", "year", "yearly", "12month"];

  const normalizedTier = normalizeIdentifier(tier);
  const normalizedCandidate = normalizeIdentifier;
  const defaultPackage = interval === "yearly" ? offerings.annual : offerings.monthly;

  return (
    packages.find((p) => {
      const normalizedId = normalizedCandidate(p.identifier);
      const isTierMatch =
        normalizedId.includes(`${normalizedTier}_`) ||
        normalizedId.includes(`-${normalizedTier}`) ||
        normalizedId === normalizedTier;
      const isIntervalMatch = intervalNeedles.some((needle) =>
        normalizedId.includes(needle),
      );
      return isTierMatch && isIntervalMatch;
    }) ??
    defaultPackage
  );
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
      { label: "Marketplace coach installs", included: true },
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
      { label: "Custom coach creation + publishing", included: true },
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

function normalizeErrorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (error && typeof error === "object") {
    try {
      return JSON.stringify(error);
    } catch {
      return "";
    }
  }
  return "";
}

function isRevenueCatPurchaseCancelledError(error: unknown): boolean {
  if (error && typeof error === "object") {
    const maybeCancelled = (error as { userCancelled?: unknown }).userCancelled;
    if (typeof maybeCancelled === "boolean" && maybeCancelled) {
      return true;
    }

    const maybeCode = (error as { code?: unknown }).code;
    if (typeof maybeCode === "string") {
      const normalizedCode = maybeCode.toLowerCase();
      if (
        normalizedCode.includes("purchasecancelled") ||
        normalizedCode.includes("purchase_cancelled")
      ) {
        return true;
      }
    }
  }

  const normalizedMessage = normalizeErrorMessage(error).toLowerCase();
  return (
    normalizedMessage.includes("purchasecancellederror") ||
    normalizedMessage.includes("purchase cancelled") ||
    normalizedMessage.includes("purchase_cancelled")
  );
}

export default function PaywallScreen() {
  const router = useRouter();
  const { palette, setSubscriptionTier } = useThemeSafe();
  const { showToast } = useAlert();
  const { targetTier } = useLocalSearchParams<{ targetTier?: string }>();
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(
    (targetTier as SubscriptionTier) || "sovereign",
  );
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("yearly");
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const handleSelectTier = (tier: SubscriptionTier) => {
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

      const pkg = isPaidSubscriptionTier(selectedTier)
        ? getPackageForInterval(offerings, selectedTier, billingInterval)
        : null;

      if (!pkg) {
        throw new Error(`No ${billingInterval} package found for ${selectedTier}`);
      }

      await Purchases.purchasePackage(pkg);
      invalidateUserTierCache();
      const tier = await getUserTier();
      setSubscriptionTier(tier);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error: unknown) {
      if (isRevenueCatPurchaseCancelledError(error)) {
        showToast("Purchase canceled", {
          variant: "info",
          message: "No payment was made. You are still on your current plan.",
        });
      } else {
        console.warn("[Paywall] Purchase error:", error);
        showToast("Purchase not completed", {
          variant: "error",
          message: "We could not complete the purchase. Your plan is unchanged.",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      await restorePurchases();
      invalidateUserTierCache();
      const tier = await getUserTier();
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

  const handleCouponRedeemed = async (payload: RedeemCouponResponse) => {
    invalidateUserTierCache();
    setSubscriptionTier(payload.tier);
    showToast("Trial activated", {
      variant: "success",
      message: `${payload.tier === "oracle" ? "Oracle" : "Sovereign"} trial is now active.`,
    });
    router.back();
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
        <View style={styles.billingIntervalWrapper}>
          <View style={[styles.billingIntervalContainer, { backgroundColor: palette.cardBg, borderColor: palette.border }]}>
            {BILLING_INTERVALS.map((interval) => (
              <TouchableOpacity
                key={interval}
                onPress={() => setBillingInterval(interval)}
                style={[
                  styles.billingIntervalOption,
                  {
                    backgroundColor: billingInterval === interval ? palette.accent : "transparent",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.billingIntervalText,
                    {
                      color:
                        billingInterval === interval
                          ? palette.textInverse
                          : palette.textSecondary,
                    },
                  ]}
                >
                  {interval === "monthly" ? "Monthly" : "Yearly"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <CouponRedeemPanel onRedeemed={handleCouponRedeemed} />

        {/* Tier Cards */}
        {TIERS.map((tier) => {
          const isYearly = billingInterval === "yearly";
          const priceLabel = isYearly ? tier.yearlyPriceLabel : tier.monthlyPriceLabel;
          return (
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
                      {priceLabel}
                    </Text>
                  </View>
                  {isYearly &&
                    tier.id !== "free" &&
                    typeof tier.monthlyPriceCents === "number" &&
                    typeof tier.yearlyPriceCents === "number" && (
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
          );
        })}

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
              : `Subscribe to ${selectedTier === "sovereign" ? "Sovereign" : "Oracle"} (${billingInterval === "monthly" ? "Monthly" : "Yearly"})`
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
  billingIntervalWrapper: {
    marginBottom: Spacing.lg,
  },
  billingIntervalContainer: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: Radius.lg,
    overflow: "hidden",
  },
  billingIntervalOption: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.md,
    margin: Spacing.xs / 2,
    borderRadius: Radius.md,
  },
  billingIntervalText: {
    fontSize: Typography.sizes.body,
    fontFamily: Typography.fonts.sans,
    fontWeight: Typography.weights.semibold,
  },
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
