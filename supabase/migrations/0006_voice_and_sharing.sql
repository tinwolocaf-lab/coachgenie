-- Migration: 0006_voice_and_sharing
-- Purpose: Voice + sharing tables with schema-compat bootstrap for projects that
-- still have legacy `sessions` / `session_messages` shape.

CREATE OR REPLACE FUNCTION public.coachgenie_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Canonical sessions table expected by app + edge functions.
CREATE TABLE IF NOT EXISTS public.coaching_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Session',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  summary TEXT,
  breakthrough_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.coaching_sessions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'coaching_sessions'
      AND policyname = 'Users can view own coaching sessions'
  ) THEN
    CREATE POLICY "Users can view own coaching sessions"
      ON public.coaching_sessions FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'coaching_sessions'
      AND policyname = 'Users can manage own coaching sessions'
  ) THEN
    CREATE POLICY "Users can manage own coaching sessions"
      ON public.coaching_sessions FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

DROP TRIGGER IF EXISTS update_coaching_sessions_updated_at ON public.coaching_sessions;
CREATE TRIGGER update_coaching_sessions_updated_at
  BEFORE UPDATE ON public.coaching_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.coachgenie_set_updated_at();

-- Voice and sharing tables.
CREATE TABLE IF NOT EXISTS public.voice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.coaching_sessions(id) ON DELETE SET NULL,
  coach_id TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  word_count INTEGER NOT NULL DEFAULT 0,
  voice_name TEXT NOT NULL DEFAULT 'Kore',
  emotion_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  transcript TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.coach_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id TEXT UNIQUE NOT NULL,
  coach_id TEXT NOT NULL,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coach_config JSONB NOT NULL,
  uses_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.widget_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_focus_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  quick_coach_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  reflection_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  preferred_coach_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_voice_sessions_updated_at ON public.voice_sessions;
CREATE TRIGGER update_voice_sessions_updated_at
  BEFORE UPDATE ON public.voice_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.coachgenie_set_updated_at();

DROP TRIGGER IF EXISTS update_widget_preferences_updated_at ON public.widget_preferences;
CREATE TRIGGER update_widget_preferences_updated_at
  BEFORE UPDATE ON public.widget_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.coachgenie_set_updated_at();

-- Align legacy message schema to fields expected by app.
ALTER TABLE IF EXISTS public.session_messages
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_insight BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS insight_title TEXT,
  ADD COLUMN IF NOT EXISTS voice_session_id UUID REFERENCES public.voice_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS emotion_tags JSONB DEFAULT NULL;

ALTER TABLE public.voice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.widget_preferences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'voice_sessions' AND policyname = 'voice_sessions_select_policy'
  ) THEN
    CREATE POLICY voice_sessions_select_policy
      ON public.voice_sessions FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'voice_sessions' AND policyname = 'voice_sessions_insert_policy'
  ) THEN
    CREATE POLICY voice_sessions_insert_policy
      ON public.voice_sessions FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'voice_sessions' AND policyname = 'voice_sessions_update_policy'
  ) THEN
    CREATE POLICY voice_sessions_update_policy
      ON public.voice_sessions FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_shares' AND policyname = 'coach_shares_select_policy'
  ) THEN
    CREATE POLICY coach_shares_select_policy
      ON public.coach_shares FOR SELECT
      USING (TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_shares' AND policyname = 'coach_shares_insert_policy'
  ) THEN
    CREATE POLICY coach_shares_insert_policy
      ON public.coach_shares FOR INSERT
      WITH CHECK (auth.uid() = creator_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'coach_shares' AND policyname = 'coach_shares_update_policy'
  ) THEN
    CREATE POLICY coach_shares_update_policy
      ON public.coach_shares FOR UPDATE
      USING (auth.uid() = creator_id)
      WITH CHECK (auth.uid() = creator_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'widget_preferences' AND policyname = 'widget_preferences_select_policy'
  ) THEN
    CREATE POLICY widget_preferences_select_policy
      ON public.widget_preferences FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'widget_preferences' AND policyname = 'widget_preferences_insert_policy'
  ) THEN
    CREATE POLICY widget_preferences_insert_policy
      ON public.widget_preferences FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'widget_preferences' AND policyname = 'widget_preferences_update_policy'
  ) THEN
    CREATE POLICY widget_preferences_update_policy
      ON public.widget_preferences FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS voice_sessions_user_id_idx ON public.voice_sessions(user_id);
CREATE INDEX IF NOT EXISTS voice_sessions_session_id_idx ON public.voice_sessions(session_id);
CREATE INDEX IF NOT EXISTS coach_shares_share_id_idx ON public.coach_shares(share_id);
CREATE INDEX IF NOT EXISTS coach_shares_creator_id_idx ON public.coach_shares(creator_id);
CREATE INDEX IF NOT EXISTS session_messages_voice_session_id_idx ON public.session_messages(voice_session_id);
