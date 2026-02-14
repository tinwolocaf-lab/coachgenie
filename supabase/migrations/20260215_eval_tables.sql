-- Migration: 20260215_eval_tables
-- Description: Evaluation tables for coach AI quality tracking (service-role only)

-- ============================================
-- COACH EVAL CASES (TEST INPUTS + EXPECTATIONS)
-- ============================================
CREATE TABLE IF NOT EXISTS public.coach_eval_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  input JSONB NOT NULL,
  expected JSONB,
  tags TEXT[] DEFAULT '{}',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_eval_cases_active
  ON public.coach_eval_cases(active);

CREATE INDEX IF NOT EXISTS idx_coach_eval_cases_tags
  ON public.coach_eval_cases USING GIN (tags);

ALTER TABLE public.coach_eval_cases ENABLE ROW LEVEL SECURITY;
-- Service-role only; no public policies.

-- ============================================
-- COACH EVAL RUNS (RUN RESULTS + METRICS)
-- ============================================
CREATE TABLE IF NOT EXISTS public.coach_eval_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commit_sha TEXT,
  model_id TEXT,
  score NUMERIC(5,2),
  metrics JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_eval_runs_created_at
  ON public.coach_eval_runs(created_at);

ALTER TABLE public.coach_eval_runs ENABLE ROW LEVEL SECURITY;
-- Service-role only; no public policies.
