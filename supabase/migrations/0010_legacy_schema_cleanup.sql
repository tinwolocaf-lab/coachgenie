-- Migration: 0010_legacy_schema_cleanup
-- Purpose: Remove legacy schema objects after canonical table alignment.

CREATE OR REPLACE FUNCTION public.coachgenie_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Ensure canonical context_vaults exists with the shape used by the current app/functions.
CREATE TABLE IF NOT EXISTS public.context_vaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  values TEXT[] NOT NULL DEFAULT '{}',
  goals JSONB NOT NULL DEFAULT '[]'::jsonb,
  constraints JSONB NOT NULL DEFAULT '{"available_hours_per_day":4,"energy_level":"medium","best_time_for_focus":"morning"}'::jsonb,
  preferences JSONB NOT NULL DEFAULT '{"tone":50,"directness":50,"response_length":"balanced"}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.context_vaults ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'context_vaults' AND policyname = 'Users can view own vault'
  ) THEN
    CREATE POLICY "Users can view own vault"
      ON public.context_vaults FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'context_vaults' AND policyname = 'Users can update own vault'
  ) THEN
    CREATE POLICY "Users can update own vault"
      ON public.context_vaults FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'context_vaults' AND policyname = 'Users can insert own vault'
  ) THEN
    CREATE POLICY "Users can insert own vault"
      ON public.context_vaults FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

DROP TRIGGER IF EXISTS update_context_vaults_updated_at ON public.context_vaults;
CREATE TRIGGER update_context_vaults_updated_at
  BEFORE UPDATE ON public.context_vaults
  FOR EACH ROW
  EXECUTE FUNCTION public.coachgenie_set_updated_at();

-- Migrate legacy context_vault rows into canonical context_vaults.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'context_vault'
  ) THEN
    INSERT INTO public.context_vaults (
      user_id,
      values,
      goals,
      constraints,
      preferences,
      created_at,
      updated_at
    )
    SELECT
      cv.user_id,
      COALESCE(cv.values, '{}'::text[]),
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', gen_random_uuid()::text,
              'title', goal_item,
              'is_30_day_focus', true
            )
          )
          FROM unnest(COALESCE(cv.goals_30d, '{}'::text[])) AS goal_item
        ),
        '[]'::jsonb
      ),
      jsonb_build_object(
        'available_hours_per_day', 4,
        'energy_level', 'medium',
        'best_time_for_focus', 'morning',
        'legacy_constraints', COALESCE(to_jsonb(cv.constraints), '[]'::jsonb)
      ),
      jsonb_build_object(
        'tone', 50,
        'directness',
          CASE
            WHEN cv.preferences IS NOT NULL
              AND jsonb_typeof(cv.preferences->'directness') = 'number'
            THEN LEAST(100, GREATEST(0, ROUND((cv.preferences->>'directness')::numeric * 100)::int))
            ELSE 50
          END,
        'response_length', 'balanced',
        'legacy', COALESCE(cv.preferences, '{}'::jsonb)
      ),
      COALESCE(cv.created_at, NOW()),
      COALESCE(cv.updated_at, NOW())
    FROM public.context_vault AS cv
    ON CONFLICT (user_id) DO UPDATE
      SET values = EXCLUDED.values,
          goals = CASE
            WHEN jsonb_typeof(context_vaults.goals) = 'array' AND jsonb_array_length(context_vaults.goals) > 0
            THEN context_vaults.goals
            ELSE EXCLUDED.goals
          END,
          constraints = CASE
            WHEN context_vaults.constraints ? 'available_hours_per_day'
            THEN context_vaults.constraints
            ELSE EXCLUDED.constraints
          END,
          preferences = CASE
            WHEN context_vaults.preferences ? 'response_length'
            THEN context_vaults.preferences
            ELSE EXCLUDED.preferences
          END,
          updated_at = GREATEST(context_vaults.updated_at, EXCLUDED.updated_at);
  END IF;
END
$$;

-- Drop legacy schema objects that are no longer referenced by app/functions.
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.sessions CASCADE;
DROP TABLE IF EXISTS public.user_current_plan CASCADE;
DROP TABLE IF EXISTS public.user_profile CASCADE;
DROP TABLE IF EXISTS public.context_vault CASCADE;
DROP TABLE IF EXISTS public.coach_versions CASCADE;
