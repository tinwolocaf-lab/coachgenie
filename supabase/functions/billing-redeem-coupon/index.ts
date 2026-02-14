import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { corsHeaders, handleOptions } from '../_shared/cors.ts';
import { requireAuth } from '../_shared/auth.ts';
import { createServiceClient } from '../_shared/supabase.ts';
import { ensureActiveCreditAccount, creditStatusResponsePayload } from '../_shared/billing.ts';
import { resolveBillingTier } from '../_shared/revenuecat.ts';
import { getTierRank, normalizeTier } from '../_shared/modelCatalog.ts';

interface RedeemCouponBody {
  code?: string;
}

interface CouponPreviewRow {
  target_tier: string;
}

interface CouponRedemptionRow {
  coupon_id: string;
  target_tier: string;
  trial_days: number;
  trial_start: string;
  trial_end: string;
}

const COUPON_CODE_REGEX = /^[A-Za-z0-9_-]{3,64}$/;

function mapCouponError(message: string): { status: number; code: string; message: string } {
  const normalized = message.toUpperCase();

  if (normalized.includes('INVALID_COUPON')) {
    return {
      status: 400,
      code: 'COUPON_INVALID',
      message: 'This coupon code is invalid.',
    };
  }
  if (normalized.includes('COUPON_INACTIVE')) {
    return {
      status: 409,
      code: 'COUPON_INACTIVE',
      message: 'This coupon is currently inactive.',
    };
  }
  if (normalized.includes('COUPON_NOT_STARTED')) {
    return {
      status: 409,
      code: 'COUPON_NOT_STARTED',
      message: 'This coupon is not active yet.',
    };
  }
  if (normalized.includes('COUPON_EXPIRED')) {
    return {
      status: 409,
      code: 'COUPON_EXPIRED',
      message: 'This coupon has expired.',
    };
  }
  if (normalized.includes('COUPON_MAX_REDEMPTIONS_REACHED')) {
    return {
      status: 409,
      code: 'COUPON_MAX_REDEMPTIONS_REACHED',
      message: 'This coupon has reached its redemption limit.',
    };
  }
  if (normalized.includes('COUPON_ALREADY_REDEEMED')) {
    return {
      status: 409,
      code: 'COUPON_ALREADY_REDEEMED',
      message: 'You have already redeemed a coupon trial.',
    };
  }

  return {
    status: 500,
    code: 'COUPON_REDEEM_FAILED',
    message: 'Failed to redeem coupon.',
  };
}

function parseCouponCode(raw: unknown): string | null {
  if (typeof raw !== 'string') {
    return null;
  }
  const trimmed = raw.trim();
  if (!COUPON_CODE_REGEX.test(trimmed)) {
    return null;
  }
  return trimmed.toUpperCase();
}

function isCouponTier(value: string): value is 'sovereign' | 'oracle' {
  return value === 'sovereign' || value === 'oracle';
}

serve(async (request) => {
  const optionsResponse = handleOptions(request);
  if (optionsResponse) return optionsResponse;

  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
  }

  let payload: RedeemCouponBody;
  try {
    payload = await request.json();
  } catch {
    return new Response(
      JSON.stringify({
        code: 'BAD_REQUEST',
        message: 'Invalid JSON body.',
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const couponCode = parseCouponCode(payload.code);
  if (!couponCode) {
    return new Response(
      JSON.stringify({
        code: 'BAD_REQUEST',
        message: 'Coupon code must be 3-64 characters and contain only letters, numbers, underscores, or hyphens.',
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let auth;
  try {
    auth = await requireAuth(request);
  } catch (error) {
    return new Response((error as Error).message, { status: 401, headers: corsHeaders });
  }

  const { userId } = auth;
  const serviceClient = createServiceClient();

  try {
    const currentTier = await resolveBillingTier(serviceClient, userId);
    const { data: couponPreview, error: couponPreviewError } = await serviceClient
      .from('trial_coupons')
      .select('target_tier')
      .eq('code', couponCode)
      .maybeSingle();

    if (couponPreviewError) {
      return new Response(
        JSON.stringify({
          code: 'COUPON_REDEEM_FAILED',
          message: couponPreviewError.message,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!couponPreview || !isCouponTier((couponPreview as CouponPreviewRow).target_tier)) {
      return new Response(
        JSON.stringify({
          code: 'COUPON_INVALID',
          message: 'This coupon code is invalid.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const targetTier = normalizeTier((couponPreview as CouponPreviewRow).target_tier);
    if (getTierRank(targetTier) <= getTierRank(currentTier.tier)) {
      return new Response(
        JSON.stringify({
          code: 'COUPON_TIER_NOT_HIGHER',
          message: 'This coupon does not provide a higher tier than your current plan.',
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: redemptionData, error: redemptionError } = await serviceClient.rpc('billing_redeem_coupon', {
      p_user_id: userId,
      p_coupon_code: couponCode,
    });

    if (redemptionError) {
      const mapped = mapCouponError(redemptionError.message);
      return new Response(
        JSON.stringify(mapped),
        { status: mapped.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const redemptionRow = Array.isArray(redemptionData)
      ? (redemptionData[0] as CouponRedemptionRow | undefined)
      : undefined;

    if (!redemptionRow) {
      return new Response(
        JSON.stringify({
          code: 'COUPON_REDEEM_FAILED',
          message: 'Coupon redemption did not return a valid result.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const effectiveTier = await resolveBillingTier(serviceClient, userId);
    const status = await ensureActiveCreditAccount(
      serviceClient,
      userId,
      effectiveTier.tier,
      {
        tierSource: effectiveTier.source,
        trialTier: effectiveTier.trialTier,
        trialEndsAt: effectiveTier.trialEndsAt,
      }
    );
    const trialActive =
      effectiveTier.trialTier !== null &&
      typeof effectiveTier.trialEndsAt === 'string' &&
      new Date(effectiveTier.trialEndsAt).getTime() > Date.now();

    return new Response(
      JSON.stringify({
        ...creditStatusResponsePayload(status),
        tier_source: effectiveTier.source,
        paid_tier: effectiveTier.paidTier,
        trial_tier: effectiveTier.trialTier,
        trial_active: trialActive,
        trial_end: effectiveTier.trialEndsAt,
        trial_days: redemptionRow.trial_days,
        trial_start: redemptionRow.trial_start,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        code: 'COUPON_REDEEM_FAILED',
        message: error instanceof Error ? error.message : 'Failed to redeem coupon.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
