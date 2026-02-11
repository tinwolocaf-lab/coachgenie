-- Migration: 0007_rituals_schema_backfill
-- Purpose: Backfill rituals/chapters/reflections schema on projects that are
-- still on legacy core tables.

CREATE OR REPLACE FUNCTION public.coachgenie_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TABLE IF NOT EXISTS public.growth_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  vision TEXT,
  why_it_matters TEXT,
  target_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'archived')),
  cover_color TEXT NOT NULL DEFAULT '#C5A059',
  icon TEXT NOT NULL DEFAULT 'sparkles',
  progress_percentage INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.growth_chapters ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'growth_chapters' AND policyname = 'Users can view own growth chapters'
  ) THEN
    CREATE POLICY "Users can view own growth chapters"
      ON public.growth_chapters FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'growth_chapters' AND policyname = 'Users can manage own growth chapters'
  ) THEN
    CREATE POLICY "Users can manage own growth chapters"
      ON public.growth_chapters FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

DROP TRIGGER IF EXISTS update_growth_chapters_updated_at ON public.growth_chapters;
CREATE TRIGGER update_growth_chapters_updated_at
  BEFORE UPDATE ON public.growth_chapters
  FOR EACH ROW
  EXECUTE FUNCTION public.coachgenie_set_updated_at();

CREATE TABLE IF NOT EXISTS public.chapter_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES public.growth_chapters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  order_index INTEGER NOT NULL DEFAULT 0,
  linked_rituals TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chapter_milestones ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'chapter_milestones' AND policyname = 'Users can view own chapter milestones'
  ) THEN
    CREATE POLICY "Users can view own chapter milestones"
      ON public.chapter_milestones FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'chapter_milestones' AND policyname = 'Users can manage own chapter milestones'
  ) THEN
    CREATE POLICY "Users can manage own chapter milestones"
      ON public.chapter_milestones FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

DROP TRIGGER IF EXISTS update_chapter_milestones_updated_at ON public.chapter_milestones;
CREATE TRIGGER update_chapter_milestones_updated_at
  BEFORE UPDATE ON public.chapter_milestones
  FOR EACH ROW
  EXECUTE FUNCTION public.coachgenie_set_updated_at();

CREATE TABLE IF NOT EXISTS public.rituals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'sparkles',
  color TEXT NOT NULL DEFAULT '#C5A059',
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekdays', 'weekends', 'weekly')),
  reminder_time TEXT,
  linked_insight_id UUID,
  linked_chapter_id UUID REFERENCES public.growth_chapters(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.rituals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'rituals' AND policyname = 'Users can view own rituals'
  ) THEN
    CREATE POLICY "Users can view own rituals"
      ON public.rituals FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'rituals' AND policyname = 'Users can manage own rituals'
  ) THEN
    CREATE POLICY "Users can manage own rituals"
      ON public.rituals FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

DROP TRIGGER IF EXISTS update_rituals_updated_at ON public.rituals;
CREATE TRIGGER update_rituals_updated_at
  BEFORE UPDATE ON public.rituals
  FOR EACH ROW
  EXECUTE FUNCTION public.coachgenie_set_updated_at();

CREATE TABLE IF NOT EXISTS public.ritual_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ritual_id UUID NOT NULL REFERENCES public.rituals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_date DATE NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  note TEXT,
  UNIQUE(ritual_id, completed_date)
);

ALTER TABLE public.ritual_completions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ritual_completions' AND policyname = 'Users can view own ritual completions'
  ) THEN
    CREATE POLICY "Users can view own ritual completions"
      ON public.ritual_completions FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ritual_completions' AND policyname = 'Users can manage own ritual completions'
  ) THEN
    CREATE POLICY "Users can manage own ritual completions"
      ON public.ritual_completions FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.ritual_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ritual_id UUID NOT NULL REFERENCES public.rituals(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  total_completions INTEGER NOT NULL DEFAULT 0,
  last_completed_date DATE,
  streak_started_date DATE,
  consistency_score INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, ritual_id)
);

ALTER TABLE public.ritual_streaks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ritual_streaks' AND policyname = 'Users can view own ritual streaks'
  ) THEN
    CREATE POLICY "Users can view own ritual streaks"
      ON public.ritual_streaks FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ritual_streaks' AND policyname = 'Users can manage own ritual streaks'
  ) THEN
    CREATE POLICY "Users can manage own ritual streaks"
      ON public.ritual_streaks FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

DROP TRIGGER IF EXISTS update_ritual_streaks_updated_at ON public.ritual_streaks;
CREATE TRIGGER update_ritual_streaks_updated_at
  BEFORE UPDATE ON public.ritual_streaks
  FOR EACH ROW
  EXECUTE FUNCTION public.coachgenie_set_updated_at();

CREATE TABLE IF NOT EXISTS public.daily_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reflection_type TEXT NOT NULL CHECK (reflection_type IN ('morning', 'evening')),
  prompt TEXT,
  response TEXT,
  wins TEXT[] NOT NULL DEFAULT '{}',
  lessons TEXT[] NOT NULL DEFAULT '{}',
  ai_closing_thought TEXT,
  mood INTEGER,
  energy_level INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date, reflection_type)
);

ALTER TABLE public.daily_reflections ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'daily_reflections' AND policyname = 'Users can view own daily reflections'
  ) THEN
    CREATE POLICY "Users can view own daily reflections"
      ON public.daily_reflections FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'daily_reflections' AND policyname = 'Users can manage own daily reflections'
  ) THEN
    CREATE POLICY "Users can manage own daily reflections"
      ON public.daily_reflections FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

DROP TRIGGER IF EXISTS update_daily_reflections_updated_at ON public.daily_reflections;
CREATE TRIGGER update_daily_reflections_updated_at
  BEFORE UPDATE ON public.daily_reflections
  FOR EACH ROW
  EXECUTE FUNCTION public.coachgenie_set_updated_at();

CREATE TABLE IF NOT EXISTS public.editorial_nudges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nudge_type TEXT NOT NULL CHECK (nudge_type IN ('alignment', 'encouragement', 'reflection', 'milestone')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  related_chapter_id UUID REFERENCES public.growth_chapters(id) ON DELETE SET NULL,
  related_ritual_id UUID REFERENCES public.rituals(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.editorial_nudges ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'editorial_nudges' AND policyname = 'Users can view own editorial nudges'
  ) THEN
    CREATE POLICY "Users can view own editorial nudges"
      ON public.editorial_nudges FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'editorial_nudges' AND policyname = 'Users can manage own editorial nudges'
  ) THEN
    CREATE POLICY "Users can manage own editorial nudges"
      ON public.editorial_nudges FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_growth_chapters_user_id ON public.growth_chapters(user_id);
CREATE INDEX IF NOT EXISTS idx_chapter_milestones_chapter_id ON public.chapter_milestones(chapter_id);
CREATE INDEX IF NOT EXISTS idx_rituals_user_id ON public.rituals(user_id);
CREATE INDEX IF NOT EXISTS idx_ritual_completions_user_id ON public.ritual_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_ritual_streaks_user_id ON public.ritual_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_reflections_user_date ON public.daily_reflections(user_id, date);
CREATE INDEX IF NOT EXISTS idx_editorial_nudges_user_id ON public.editorial_nudges(user_id);
