-- Migration: 0011_credit_billing
-- Description: Credit-based AI billing ledger, rate cards, model allowlists, and voice session metering

-- ============================================
-- CREDIT ACCOUNTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.credit_accounts (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'sovereign', 'oracle')) DEFAULT 'free',
  balance_mcredits BIGINT NOT NULL DEFAULT 0 CHECK (balance_mcredits >= 0),
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_accounts_tier ON public.credit_accounts(tier);
CREATE INDEX IF NOT EXISTS idx_credit_accounts_period_end ON public.credit_accounts(period_end);

ALTER TABLE public.credit_accounts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'credit_accounts' AND policyname = 'credit_accounts_select_own'
  ) THEN
    CREATE POLICY credit_accounts_select_own
      ON public.credit_accounts FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- CREDIT LEDGER (IMMUTABLE EVENTS)
-- ============================================
CREATE TABLE IF NOT EXISTS public.credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('grant', 'debit', 'refund', 'hold', 'release')),
  endpoint TEXT,
  model_id TEXT,
  usage_units JSONB NOT NULL DEFAULT '{}'::jsonb,
  usd_cost NUMERIC(12, 6) NOT NULL DEFAULT 0,
  delta_mcredits BIGINT NOT NULL,
  balance_after_mcredits BIGINT NOT NULL,
  request_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_user_created ON public.credit_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_request ON public.credit_ledger(request_id);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_endpoint ON public.credit_ledger(endpoint);

CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_ledger_user_request_event_unique
  ON public.credit_ledger(user_id, request_id, event_type)
  WHERE request_id IS NOT NULL;

ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'credit_ledger' AND policyname = 'credit_ledger_select_own'
  ) THEN
    CREATE POLICY credit_ledger_select_own
      ON public.credit_ledger FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- MODEL RATE CARDS
-- ============================================
CREATE TABLE IF NOT EXISTS public.model_rate_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  model_id TEXT NOT NULL,
  modality TEXT NOT NULL CHECK (
    modality IN ('text_input', 'text_output', 'audio_input', 'audio_output', 'character_input', 'reasoning')
  ),
  unit_price_usd_per_million NUMERIC(12, 6) NOT NULL CHECK (unit_price_usd_per_million >= 0),
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (model_id, modality, effective_date)
);

CREATE INDEX IF NOT EXISTS idx_model_rate_cards_model_active
  ON public.model_rate_cards(model_id, is_active, effective_date DESC);

ALTER TABLE public.model_rate_cards ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'model_rate_cards' AND policyname = 'model_rate_cards_select_authenticated'
  ) THEN
    CREATE POLICY model_rate_cards_select_authenticated
      ON public.model_rate_cards FOR SELECT
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- ============================================
-- TIER MODEL ALLOWLIST
-- ============================================
CREATE TABLE IF NOT EXISTS public.tier_model_allowlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier TEXT NOT NULL CHECK (tier IN ('free', 'sovereign', 'oracle')),
  model_id TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tier, model_id)
);

CREATE INDEX IF NOT EXISTS idx_tier_model_allowlist_lookup
  ON public.tier_model_allowlist(tier, enabled, is_default);

ALTER TABLE public.tier_model_allowlist ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tier_model_allowlist' AND policyname = 'tier_model_allowlist_select_authenticated'
  ) THEN
    CREATE POLICY tier_model_allowlist_select_authenticated
      ON public.tier_model_allowlist FOR SELECT
      USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- ============================================
-- BILLING TIER CACHE (SERVER-VERIFIED ENTITLEMENTS)
-- ============================================
CREATE TABLE IF NOT EXISTS public.billing_tier_cache (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'sovereign', 'oracle')),
  source TEXT NOT NULL DEFAULT 'revenuecat',
  verified_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_tier_cache_expiry
  ON public.billing_tier_cache(expires_at);

ALTER TABLE public.billing_tier_cache ENABLE ROW LEVEL SECURITY;

-- No direct user policy; service-role only.

-- ============================================
-- VOICE LIVE SESSION BILLING HOLDS
-- ============================================
CREATE TABLE IF NOT EXISTS public.voice_live_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.coaching_sessions(id) ON DELETE SET NULL,
  coach_id UUID REFERENCES public.coaches(id) ON DELETE SET NULL,
  model_id TEXT NOT NULL,
  hold_mcredits BIGINT NOT NULL CHECK (hold_mcredits >= 0),
  debited_mcredits BIGINT NOT NULL DEFAULT 0 CHECK (debited_mcredits >= 0),
  status TEXT NOT NULL CHECK (status IN ('active', 'finalized', 'cancelled')) DEFAULT 'active',
  usage_units JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voice_live_sessions_user_status
  ON public.voice_live_sessions(user_id, status, started_at DESC);

ALTER TABLE public.voice_live_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'voice_live_sessions' AND policyname = 'voice_live_sessions_select_own'
  ) THEN
    CREATE POLICY voice_live_sessions_select_own
      ON public.voice_live_sessions FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- USER MODEL PREFERENCES
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_model_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  preferred_chat_model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_model_preferences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_model_preferences' AND policyname = 'user_model_preferences_select_own'
  ) THEN
    CREATE POLICY user_model_preferences_select_own
      ON public.user_model_preferences FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_model_preferences' AND policyname = 'user_model_preferences_insert_own'
  ) THEN
    CREATE POLICY user_model_preferences_insert_own
      ON public.user_model_preferences FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_model_preferences' AND policyname = 'user_model_preferences_update_own'
  ) THEN
    CREATE POLICY user_model_preferences_update_own
      ON public.user_model_preferences FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- UPDATED_AT TRIGGERS
-- ============================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column'
  ) THEN
    DROP TRIGGER IF EXISTS update_credit_accounts_updated_at ON public.credit_accounts;
    CREATE TRIGGER update_credit_accounts_updated_at
      BEFORE UPDATE ON public.credit_accounts
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

    DROP TRIGGER IF EXISTS update_tier_model_allowlist_updated_at ON public.tier_model_allowlist;
    CREATE TRIGGER update_tier_model_allowlist_updated_at
      BEFORE UPDATE ON public.tier_model_allowlist
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

    DROP TRIGGER IF EXISTS update_billing_tier_cache_updated_at ON public.billing_tier_cache;
    CREATE TRIGGER update_billing_tier_cache_updated_at
      BEFORE UPDATE ON public.billing_tier_cache
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

    DROP TRIGGER IF EXISTS update_voice_live_sessions_updated_at ON public.voice_live_sessions;
    CREATE TRIGGER update_voice_live_sessions_updated_at
      BEFORE UPDATE ON public.voice_live_sessions
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

    DROP TRIGGER IF EXISTS update_user_model_preferences_updated_at ON public.user_model_preferences;
    CREATE TRIGGER update_user_model_preferences_updated_at
      BEFORE UPDATE ON public.user_model_preferences
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- ============================================
-- BILLING HELPER FUNCTIONS (ATOMIC BALANCE OPS)
-- ============================================
CREATE OR REPLACE FUNCTION public.credit_apply_delta(
  p_user_id UUID,
  p_delta BIGINT
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance BIGINT;
  v_new_balance BIGINT;
BEGIN
  SELECT balance_mcredits
    INTO v_balance
  FROM public.credit_accounts
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'CREDIT_ACCOUNT_NOT_FOUND';
  END IF;

  v_new_balance := v_balance + p_delta;
  IF v_new_balance < 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS';
  END IF;

  UPDATE public.credit_accounts
  SET
    balance_mcredits = v_new_balance,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN v_new_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_apply_delta(UUID, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.credit_apply_delta(UUID, BIGINT) TO service_role;

-- ============================================
-- MODEL RATE CARD SEED (2026-02-12 SNAPSHOT)
-- ============================================
INSERT INTO public.model_rate_cards (provider, model_id, modality, unit_price_usd_per_million, effective_date, is_active)
VALUES
  ('openrouter', 'google/gemini-2.5-flash-lite', 'text_input', 0.10, DATE '2026-02-12', TRUE),
  ('openrouter', 'google/gemini-2.5-flash-lite', 'text_output', 0.40, DATE '2026-02-12', TRUE),
  ('openrouter', 'google/gemini-2.5-flash', 'text_input', 0.30, DATE '2026-02-12', TRUE),
  ('openrouter', 'google/gemini-2.5-flash', 'text_output', 2.50, DATE '2026-02-12', TRUE),
  ('openrouter', 'google/gemini-2.5-pro', 'text_input', 1.25, DATE '2026-02-12', TRUE),
  ('openrouter', 'google/gemini-2.5-pro', 'text_output', 10.00, DATE '2026-02-12', TRUE),
  ('openrouter', 'google/gemini-3-flash-preview', 'text_input', 0.50, DATE '2026-02-12', TRUE),
  ('openrouter', 'google/gemini-3-flash-preview', 'text_output', 3.00, DATE '2026-02-12', TRUE),
  ('openrouter', 'google/gemini-3-pro-preview', 'text_input', 2.00, DATE '2026-02-12', TRUE),
  ('openrouter', 'google/gemini-3-pro-preview', 'text_output', 12.00, DATE '2026-02-12', TRUE),
  ('openrouter', 'openai/gpt-4o-mini', 'text_input', 0.15, DATE '2026-02-12', TRUE),
  ('openrouter', 'openai/gpt-4o-mini', 'text_output', 0.60, DATE '2026-02-12', TRUE),
  ('openrouter', 'openai/gpt-4.1-mini', 'text_input', 0.40, DATE '2026-02-12', TRUE),
  ('openrouter', 'openai/gpt-4.1-mini', 'text_output', 1.60, DATE '2026-02-12', TRUE),
  ('openrouter', 'openai/gpt-4.1', 'text_input', 2.00, DATE '2026-02-12', TRUE),
  ('openrouter', 'openai/gpt-4.1', 'text_output', 8.00, DATE '2026-02-12', TRUE),
  ('openrouter', 'openai/gpt-5-mini', 'text_input', 0.25, DATE '2026-02-12', TRUE),
  ('openrouter', 'openai/gpt-5-mini', 'text_output', 2.00, DATE '2026-02-12', TRUE),
  ('openrouter', 'openai/gpt-5', 'text_input', 1.25, DATE '2026-02-12', TRUE),
  ('openrouter', 'openai/gpt-5', 'text_output', 10.00, DATE '2026-02-12', TRUE),
  ('openrouter', 'openai/gpt-5.2', 'text_input', 1.75, DATE '2026-02-12', TRUE),
  ('openrouter', 'openai/gpt-5.2', 'text_output', 14.00, DATE '2026-02-12', TRUE),
  ('openrouter', 'anthropic/claude-3.5-haiku', 'text_input', 0.80, DATE '2026-02-12', TRUE),
  ('openrouter', 'anthropic/claude-3.5-haiku', 'text_output', 4.00, DATE '2026-02-12', TRUE),
  ('openrouter', 'anthropic/claude-sonnet-4.5', 'text_input', 3.00, DATE '2026-02-12', TRUE),
  ('openrouter', 'anthropic/claude-sonnet-4.5', 'text_output', 15.00, DATE '2026-02-12', TRUE),
  ('openrouter', 'anthropic/claude-opus-4.6', 'text_input', 5.00, DATE '2026-02-12', TRUE),
  ('openrouter', 'anthropic/claude-opus-4.6', 'text_output', 25.00, DATE '2026-02-12', TRUE),
  ('openrouter', 'meta-llama/llama-4-maverick', 'text_input', 0.15, DATE '2026-02-12', TRUE),
  ('openrouter', 'meta-llama/llama-4-maverick', 'text_output', 0.60, DATE '2026-02-12', TRUE),
  ('openrouter', 'meta-llama/llama-4-scout', 'text_input', 0.08, DATE '2026-02-12', TRUE),
  ('openrouter', 'meta-llama/llama-4-scout', 'text_output', 0.30, DATE '2026-02-12', TRUE),
  ('openrouter', 'x-ai/grok-4-fast', 'text_input', 0.20, DATE '2026-02-12', TRUE),
  ('openrouter', 'x-ai/grok-4-fast', 'text_output', 0.50, DATE '2026-02-12', TRUE),
  ('openrouter', 'x-ai/grok-4', 'text_input', 3.00, DATE '2026-02-12', TRUE),
  ('openrouter', 'x-ai/grok-4', 'text_output', 15.00, DATE '2026-02-12', TRUE),
  ('gemini', 'gemini-2.5-flash-native-audio-preview', 'text_input', 0.50, DATE '2026-02-12', TRUE),
  ('gemini', 'gemini-2.5-flash-native-audio-preview', 'text_output', 2.00, DATE '2026-02-12', TRUE),
  ('gemini', 'gemini-2.5-flash-native-audio-preview', 'audio_input', 3.00, DATE '2026-02-12', TRUE),
  ('gemini', 'gemini-2.5-flash-native-audio-preview', 'audio_output', 12.00, DATE '2026-02-12', TRUE),
  ('gemini', 'gemini-2.5-flash-preview-tts', 'text_input', 0.50, DATE '2026-02-12', TRUE),
  ('gemini', 'gemini-2.5-flash-preview-tts', 'audio_output', 10.00, DATE '2026-02-12', TRUE),
  ('gemini', 'gemini-2.5-pro-preview-tts', 'text_input', 1.25, DATE '2026-02-12', TRUE),
  ('gemini', 'gemini-2.5-pro-preview-tts', 'audio_output', 20.00, DATE '2026-02-12', TRUE)
ON CONFLICT (model_id, modality, effective_date) DO UPDATE
SET
  provider = EXCLUDED.provider,
  unit_price_usd_per_million = EXCLUDED.unit_price_usd_per_million,
  is_active = EXCLUDED.is_active;

-- ============================================
-- TIER MODEL ALLOWLIST SEED
-- ============================================
INSERT INTO public.tier_model_allowlist (tier, model_id, enabled, is_default)
VALUES
  ('free', 'google/gemini-2.5-flash-lite', TRUE, TRUE),
  ('sovereign', 'google/gemini-2.5-flash-lite', TRUE, FALSE),
  ('sovereign', 'google/gemini-2.5-flash', TRUE, TRUE),
  ('sovereign', 'google/gemini-3-flash-preview', TRUE, FALSE),
  ('sovereign', 'openai/gpt-4o-mini', TRUE, FALSE),
  ('sovereign', 'openai/gpt-4.1-mini', TRUE, FALSE),
  ('sovereign', 'openai/gpt-5-mini', TRUE, FALSE),
  ('sovereign', 'meta-llama/llama-4-scout', TRUE, FALSE),
  ('sovereign', 'meta-llama/llama-4-maverick', TRUE, FALSE),
  ('sovereign', 'x-ai/grok-4-fast', TRUE, FALSE),
  ('oracle', 'google/gemini-2.5-flash-lite', TRUE, FALSE),
  ('oracle', 'google/gemini-2.5-flash', TRUE, TRUE),
  ('oracle', 'google/gemini-2.5-pro', TRUE, FALSE),
  ('oracle', 'google/gemini-3-flash-preview', TRUE, FALSE),
  ('oracle', 'google/gemini-3-pro-preview', TRUE, FALSE),
  ('oracle', 'openai/gpt-4o-mini', TRUE, FALSE),
  ('oracle', 'openai/gpt-4.1-mini', TRUE, FALSE),
  ('oracle', 'openai/gpt-4.1', TRUE, FALSE),
  ('oracle', 'openai/gpt-5-mini', TRUE, FALSE),
  ('oracle', 'openai/gpt-5', TRUE, FALSE),
  ('oracle', 'openai/gpt-5.2', TRUE, FALSE),
  ('oracle', 'anthropic/claude-3.5-haiku', TRUE, FALSE),
  ('oracle', 'anthropic/claude-sonnet-4.5', TRUE, FALSE),
  ('oracle', 'anthropic/claude-opus-4.6', TRUE, FALSE),
  ('oracle', 'meta-llama/llama-4-scout', TRUE, FALSE),
  ('oracle', 'meta-llama/llama-4-maverick', TRUE, FALSE),
  ('oracle', 'x-ai/grok-4-fast', TRUE, FALSE),
  ('oracle', 'x-ai/grok-4', TRUE, FALSE)
ON CONFLICT (tier, model_id) DO UPDATE
SET
  enabled = EXCLUDED.enabled,
  is_default = EXCLUDED.is_default;
