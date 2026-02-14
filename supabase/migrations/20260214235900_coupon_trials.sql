-- Migration: 20260214235900_coupon_trials
-- Description: Admin-managed coupon trials with one-time user redemption and atomic limits

-- ============================================
-- TRIAL COUPONS (ADMIN-MANAGED)
-- ============================================
CREATE TABLE IF NOT EXISTS public.trial_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL CHECK (
    length(btrim(code)) >= 3
    AND code = upper(code)
    AND code ~ '^[A-Z0-9_-]+$'
  ),
  target_tier TEXT NOT NULL CHECK (target_tier IN ('sovereign', 'oracle')),
  trial_days INTEGER NOT NULL DEFAULT 30 CHECK (trial_days >= 1 AND trial_days <= 365),
  max_redemptions INTEGER NOT NULL CHECK (max_redemptions > 0),
  redemptions_count INTEGER NOT NULL DEFAULT 0 CHECK (redemptions_count >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_trial_coupons_code_ci
  ON public.trial_coupons ((lower(code)));

CREATE INDEX IF NOT EXISTS idx_trial_coupons_activity_window
  ON public.trial_coupons (is_active, starts_at, ends_at);

ALTER TABLE public.trial_coupons ENABLE ROW LEVEL SECURITY;
-- Service-role only by default (no direct user policies).

-- ============================================
-- TRIAL COUPON REDEMPTIONS (ONE PER USER LIFETIME)
-- ============================================
CREATE TABLE IF NOT EXISTS public.trial_coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.trial_coupons(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_tier TEXT NOT NULL CHECK (target_tier IN ('sovereign', 'oracle')),
  trial_days INTEGER NOT NULL CHECK (trial_days >= 1 AND trial_days <= 365),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ NOT NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_trial_coupon_redemptions_user_unique
  ON public.trial_coupon_redemptions(user_id);

CREATE INDEX IF NOT EXISTS idx_trial_coupon_redemptions_user_end
  ON public.trial_coupon_redemptions(user_id, ends_at DESC);

CREATE INDEX IF NOT EXISTS idx_trial_coupon_redemptions_coupon_id
  ON public.trial_coupon_redemptions(coupon_id);

ALTER TABLE public.trial_coupon_redemptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'trial_coupon_redemptions'
      AND policyname = 'trial_coupon_redemptions_select_own'
  ) THEN
    CREATE POLICY trial_coupon_redemptions_select_own
      ON public.trial_coupon_redemptions FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- UPDATED_AT TRIGGER SUPPORT
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
  ) THEN
    DROP TRIGGER IF EXISTS update_trial_coupons_updated_at ON public.trial_coupons;
    CREATE TRIGGER update_trial_coupons_updated_at
      BEFORE UPDATE ON public.trial_coupons
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- ============================================
-- ATOMIC COUPON REDEMPTION FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.billing_redeem_coupon(
  p_user_id UUID,
  p_coupon_code TEXT
)
RETURNS TABLE (
  coupon_id UUID,
  target_tier TEXT,
  trial_days INTEGER,
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := NOW();
  v_coupon RECORD;
  v_trial_start TIMESTAMPTZ := NOW();
  v_trial_end TIMESTAMPTZ;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_COUPON';
  END IF;

  IF p_coupon_code IS NULL OR btrim(p_coupon_code) = '' THEN
    RAISE EXCEPTION 'INVALID_COUPON';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.trial_coupon_redemptions tcr
    WHERE tcr.user_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'COUPON_ALREADY_REDEEMED';
  END IF;

  SELECT
    tc.id,
    tc.target_tier,
    tc.trial_days,
    tc.max_redemptions,
    tc.redemptions_count,
    tc.is_active,
    tc.starts_at,
    tc.ends_at
  INTO v_coupon
  FROM public.trial_coupons tc
  WHERE lower(tc.code) = lower(btrim(p_coupon_code))
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID_COUPON';
  END IF;

  IF v_coupon.is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'COUPON_INACTIVE';
  END IF;

  IF v_coupon.starts_at IS NOT NULL AND v_coupon.starts_at > v_now THEN
    RAISE EXCEPTION 'COUPON_NOT_STARTED';
  END IF;

  IF v_coupon.ends_at IS NOT NULL AND v_coupon.ends_at <= v_now THEN
    RAISE EXCEPTION 'COUPON_EXPIRED';
  END IF;

  IF v_coupon.redemptions_count >= v_coupon.max_redemptions THEN
    RAISE EXCEPTION 'COUPON_MAX_REDEMPTIONS_REACHED';
  END IF;

  v_trial_end := v_trial_start + make_interval(days => v_coupon.trial_days);

  BEGIN
    INSERT INTO public.trial_coupon_redemptions (
      coupon_id,
      user_id,
      target_tier,
      trial_days,
      starts_at,
      ends_at,
      redeemed_at
    )
    VALUES (
      v_coupon.id,
      p_user_id,
      v_coupon.target_tier,
      v_coupon.trial_days,
      v_trial_start,
      v_trial_end,
      v_now
    );
  EXCEPTION
    WHEN unique_violation THEN
      RAISE EXCEPTION 'COUPON_ALREADY_REDEEMED';
  END;

  UPDATE public.trial_coupons
  SET
    redemptions_count = redemptions_count + 1,
    updated_at = NOW()
  WHERE id = v_coupon.id;

  RETURN QUERY
  SELECT
    v_coupon.id,
    v_coupon.target_tier::TEXT,
    v_coupon.trial_days::INTEGER,
    v_trial_start,
    v_trial_end;
END;
$$;

REVOKE ALL ON FUNCTION public.billing_redeem_coupon(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.billing_redeem_coupon(UUID, TEXT) TO service_role;
