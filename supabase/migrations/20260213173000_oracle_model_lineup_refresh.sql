-- Ensure Oracle model lineup includes the latest premium models.

INSERT INTO public.model_rate_cards (
  provider,
  model_id,
  modality,
  unit_price_usd_per_million,
  effective_date,
  is_active
)
VALUES
  ('openrouter', 'openai/gpt-5.2-pro', 'text_input', 21.00, DATE '2026-02-13', TRUE),
  ('openrouter', 'openai/gpt-5.2-pro', 'text_output', 168.00, DATE '2026-02-13', TRUE)
ON CONFLICT (model_id, modality, effective_date) DO UPDATE
SET
  unit_price_usd_per_million = EXCLUDED.unit_price_usd_per_million,
  is_active = EXCLUDED.is_active;

INSERT INTO public.tier_model_allowlist (
  tier,
  model_id,
  enabled,
  is_default
)
VALUES
  ('oracle', 'anthropic/claude-opus-4.6', TRUE, FALSE),
  ('oracle', 'openai/gpt-5.2-pro', TRUE, FALSE),
  ('oracle', 'google/gemini-3-pro-preview', TRUE, FALSE)
ON CONFLICT (tier, model_id) DO UPDATE
SET
  enabled = EXCLUDED.enabled,
  updated_at = timezone('utc', now());
