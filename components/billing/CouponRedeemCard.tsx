import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Typography, Spacing, Radius } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { useAlert } from '@/contexts/AlertContext';
import {
  ApiFunctionError,
  redeemCoupon,
  type RedeemCouponResponse,
} from '@/lib/apiClient';

interface CouponRedeemCardProps {
  onRedeemed?: (payload: RedeemCouponResponse) => void | Promise<void>;
}

const COUPON_CODE_REGEX = /^[A-Za-z0-9_-]{3,64}$/;

function getCouponErrorMessage(error: unknown): string {
  if (error instanceof ApiFunctionError) {
    const code = error.code?.toUpperCase();
    switch (code) {
      case 'COUPON_INVALID':
        return 'This coupon code is invalid.';
      case 'COUPON_INACTIVE':
        return 'This coupon is currently inactive.';
      case 'COUPON_NOT_STARTED':
        return 'This coupon is not active yet.';
      case 'COUPON_EXPIRED':
        return 'This coupon has expired.';
      case 'COUPON_MAX_REDEMPTIONS_REACHED':
        return 'This coupon has reached its redemption limit.';
      case 'COUPON_ALREADY_REDEEMED':
        return 'You have already redeemed a coupon trial.';
      case 'COUPON_TIER_NOT_HIGHER':
        return 'This coupon does not provide a higher tier than your current plan.';
      default:
        return error.message || 'Coupon could not be applied.';
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Coupon could not be applied.';
}

function getTierLabel(tier: RedeemCouponResponse['tier']): string {
  return tier === 'oracle' ? 'Oracle' : tier === 'sovereign' ? 'Sovereign' : 'Free';
}

function CouponRedeemCard({ onRedeemed }: CouponRedeemCardProps) {
  const { palette } = useThemeSafe();
  const { showToast } = useAlert();

  const [couponCode, setCouponCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isErrorFeedback, setIsErrorFeedback] = useState(false);

  const handleRedeem = async () => {
    const normalizedCode = couponCode.trim().toUpperCase();
    if (!COUPON_CODE_REGEX.test(normalizedCode)) {
      const message = 'Enter a valid coupon code (3-64 letters, numbers, underscores, or hyphens).';
      setFeedback(message);
      setIsErrorFeedback(true);
      showToast('Invalid code', { variant: 'info', message });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const payload = await redeemCoupon(normalizedCode);
      const endDate = new Date(payload.trial_end).toLocaleDateString();
      const message = `${getTierLabel(payload.tier)} trial active until ${endDate}.`;

      setCouponCode('');
      setFeedback(message);
      setIsErrorFeedback(false);
      showToast('Trial activated', { variant: 'success', message });

      if (onRedeemed) {
        await onRedeemed(payload);
      }
    } catch (error) {
      const message = getCouponErrorMessage(error);
      setFeedback(message);
      setIsErrorFeedback(true);
      showToast('Coupon not applied', { variant: 'error', message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { borderColor: palette.borderLight, backgroundColor: palette.backgroundSecondary }]}>
      <Text style={[styles.title, { color: palette.textPrimary }]}>Have a coupon?</Text>
      <Text style={[styles.subtitle, { color: palette.textTertiary }]}>
        Apply a trial code to unlock a higher plan for a limited time.
      </Text>

      <View style={[styles.inputRow, { borderColor: palette.border, backgroundColor: palette.cardBg }]}>
        <Ionicons name="pricetag-outline" size={16} color={palette.textTertiary} />
        <TextInput
          style={[styles.input, { color: palette.textPrimary }]}
          value={couponCode}
          onChangeText={setCouponCode}
          placeholder="ENTER COUPON CODE"
          placeholderTextColor={palette.textTertiary}
          autoCapitalize="characters"
          autoCorrect={false}
          editable={!isSubmitting}
        />
      </View>

      <TouchableOpacity
        onPress={() => {
          void handleRedeem();
        }}
        disabled={isSubmitting}
        style={[
          styles.button,
          {
            backgroundColor: palette.accent,
            opacity: isSubmitting ? 0.7 : 1,
          },
        ]}
        activeOpacity={0.85}
      >
        <Text style={[styles.buttonText, { color: palette.textInverse }]}>
          {isSubmitting ? 'Applying...' : 'Apply Coupon'}
        </Text>
      </TouchableOpacity>

      {feedback ? (
        <Text
          style={[
            styles.feedback,
            { color: isErrorFeedback ? palette.error : palette.success },
          ]}
        >
          {feedback}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.sizes.bodyLarge,
    fontFamily: Typography.fonts.serif,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: Typography.sizes.caption,
    marginBottom: Spacing.md,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  input: {
    flex: 1,
    fontSize: Typography.sizes.body,
    fontFamily: Typography.fonts.sans,
    paddingVertical: Spacing.sm + 2,
    marginLeft: Spacing.sm,
    letterSpacing: Typography.letterSpacing.wide,
  },
  button: {
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  buttonText: {
    fontSize: Typography.sizes.body,
    fontFamily: Typography.fonts.sansSemibold,
    fontWeight: Typography.weights.semibold,
  },
  feedback: {
    marginTop: Spacing.sm,
    fontSize: Typography.sizes.caption,
    fontFamily: Typography.fonts.sans,
  },
});

export default CouponRedeemCard;
