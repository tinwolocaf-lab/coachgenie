-- Coachgenie Database Schema
-- Migration: 0003_core_alignment
-- Description: Add missing tables to align app data model with current repo

-- ============================================
-- COACHING SESSIONS (canonical)
-- ============================================
CREATE TABLE IF NOT EXISTS public.coaching_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coach_id UUID REFERENCES public.coaches(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'New Session',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  summary TEXT,
  breakthrough_summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.coaching_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own coaching sessions"
  ON public.coaching_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own coaching sessions"
  ON public.coaching_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_coaching_sessions_updated_at
  BEFORE UPDATE ON public.coaching_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- SESSION MESSAGES (canonical)
-- ============================================
CREATE TABLE IF NOT EXISTS public.session_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.coaching_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  is_insight BOOLEAN NOT NULL DEFAULT FALSE,
  insight_title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.session_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages from own coaching sessions"
  ON public.session_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_sessions
      WHERE coaching_sessions.id = session_messages.session_id
      AND coaching_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages to own coaching sessions"
  ON public.session_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coaching_sessions
      WHERE coaching_sessions.id = session_messages.session_id
      AND coaching_sessions.user_id = auth.uid()
    )
  );

-- ============================================
-- SESSION ARTIFACTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.session_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.coaching_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('summary', 'next_actions', 'seven_day_plan', 'note')),
  format TEXT NOT NULL DEFAULT 'markdown' CHECK (format IN ('markdown', 'json')),
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.session_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own session artifacts"
  ON public.session_artifacts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own session artifacts"
  ON public.session_artifacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- KEY INSIGHTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.key_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.coaching_sessions(id) ON DELETE SET NULL,
  coach_id UUID REFERENCES public.coaches(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('mindset', 'strategy', 'productivity', 'systems', 'general')),
  is_highlighted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.key_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own insights"
  ON public.key_insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own insights"
  ON public.key_insights FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- BREAKTHROUGHS
-- ============================================
CREATE TABLE IF NOT EXISTS public.breakthroughs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.coaching_sessions(id) ON DELETE SET NULL,
  coach_id UUID REFERENCES public.coaches(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  key_takeaways TEXT[] NOT NULL DEFAULT '{}',
  action_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.breakthroughs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own breakthroughs"
  ON public.breakthroughs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own breakthroughs"
  ON public.breakthroughs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- INSIGHT COLLECTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.insight_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  theme_keywords TEXT[] NOT NULL DEFAULT '{}',
  color TEXT NOT NULL DEFAULT '#C5A059',
  icon TEXT NOT NULL DEFAULT 'sparkles',
  insight_count INTEGER NOT NULL DEFAULT 0,
  is_auto_generated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.insight_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own insight collections"
  ON public.insight_collections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own insight collections"
  ON public.insight_collections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_insight_collections_updated_at
  BEFORE UPDATE ON public.insight_collections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.insight_collection_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID NOT NULL REFERENCES public.insight_collections(id) ON DELETE CASCADE,
  insight_id UUID NOT NULL REFERENCES public.key_insights(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collection_id, insight_id)
);

ALTER TABLE public.insight_collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own collection items"
  ON public.insight_collection_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.insight_collections
      WHERE insight_collections.id = insight_collection_items.collection_id
      AND insight_collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own collection items"
  ON public.insight_collection_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.insight_collections
      WHERE insight_collections.id = insight_collection_items.collection_id
      AND insight_collections.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.insight_collections
      WHERE insight_collections.id = insight_collection_items.collection_id
      AND insight_collections.user_id = auth.uid()
    )
  );

-- Helper function to increment collection count
CREATE OR REPLACE FUNCTION public.increment_collection_count(collection_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.insight_collections
  SET insight_count = insight_count + 1,
      updated_at = NOW()
  WHERE id = collection_id;
END;
$$;

-- ============================================
-- MONTHLY SYNTHESIS
-- ============================================
CREATE TABLE IF NOT EXISTS public.monthly_synthesis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL,
  title TEXT NOT NULL,
  executive_summary TEXT NOT NULL,
  key_themes JSONB NOT NULL DEFAULT '[]'::jsonb,
  growth_areas TEXT[] NOT NULL DEFAULT '{}',
  patterns_identified JSONB NOT NULL DEFAULT '[]'::jsonb,
  coach_contributions JSONB NOT NULL DEFAULT '{}'::jsonb,
  breakthrough_count INTEGER NOT NULL DEFAULT 0,
  insight_count INTEGER NOT NULL DEFAULT 0,
  session_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, month_year)
);

ALTER TABLE public.monthly_synthesis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own monthly synthesis"
  ON public.monthly_synthesis FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own monthly synthesis"
  ON public.monthly_synthesis FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- HISTORY QUERIES
-- ============================================
CREATE TABLE IF NOT EXISTS public.history_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.history_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own history queries"
  ON public.history_queries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own history queries"
  ON public.history_queries FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- GROWTH CHAPTERS
-- ============================================
CREATE TABLE IF NOT EXISTS public.growth_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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

CREATE POLICY "Users can view own growth chapters"
  ON public.growth_chapters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own growth chapters"
  ON public.growth_chapters FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_growth_chapters_updated_at
  BEFORE UPDATE ON public.growth_chapters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.chapter_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id UUID NOT NULL REFERENCES public.growth_chapters(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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

CREATE POLICY "Users can view own chapter milestones"
  ON public.chapter_milestones FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own chapter milestones"
  ON public.chapter_milestones FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_chapter_milestones_updated_at
  BEFORE UPDATE ON public.chapter_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- RITUALS
-- ============================================
CREATE TABLE IF NOT EXISTS public.rituals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'sparkles',
  color TEXT NOT NULL DEFAULT '#C5A059',
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekdays', 'weekends', 'weekly')),
  reminder_time TEXT,
  linked_insight_id UUID REFERENCES public.key_insights(id) ON DELETE SET NULL,
  linked_chapter_id UUID REFERENCES public.growth_chapters(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.rituals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own rituals"
  ON public.rituals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own rituals"
  ON public.rituals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_rituals_updated_at
  BEFORE UPDATE ON public.rituals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.ritual_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ritual_id UUID NOT NULL REFERENCES public.rituals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  completed_date DATE NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  note TEXT,
  UNIQUE(ritual_id, completed_date)
);

ALTER TABLE public.ritual_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ritual completions"
  ON public.ritual_completions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own ritual completions"
  ON public.ritual_completions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.ritual_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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

CREATE POLICY "Users can view own ritual streaks"
  ON public.ritual_streaks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own ritual streaks"
  ON public.ritual_streaks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_ritual_streaks_updated_at
  BEFORE UPDATE ON public.ritual_streaks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- DAILY REFLECTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.daily_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
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

CREATE POLICY "Users can view own daily reflections"
  ON public.daily_reflections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own daily reflections"
  ON public.daily_reflections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_daily_reflections_updated_at
  BEFORE UPDATE ON public.daily_reflections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- EDITORIAL NUDGES
-- ============================================
CREATE TABLE IF NOT EXISTS public.editorial_nudges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nudge_type TEXT NOT NULL CHECK (nudge_type IN ('alignment', 'encouragement', 'reflection', 'milestone')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  related_chapter_id UUID REFERENCES public.growth_chapters(id) ON DELETE SET NULL,
  related_ritual_id UUID REFERENCES public.rituals(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.editorial_nudges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own editorial nudges"
  ON public.editorial_nudges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own editorial nudges"
  ON public.editorial_nudges FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_user_id ON public.coaching_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_created_at ON public.coaching_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_messages_session_id ON public.session_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_session_messages_created_at ON public.session_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_key_insights_user_id ON public.key_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_key_insights_created_at ON public.key_insights(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_breakthroughs_user_id ON public.breakthroughs(user_id);
CREATE INDEX IF NOT EXISTS idx_breakthroughs_date ON public.breakthroughs(date DESC);
CREATE INDEX IF NOT EXISTS idx_rituals_user_id ON public.rituals(user_id);
CREATE INDEX IF NOT EXISTS idx_ritual_completions_user_id ON public.ritual_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_reflections_user_date ON public.daily_reflections(user_id, date);
CREATE INDEX IF NOT EXISTS idx_growth_chapters_user_id ON public.growth_chapters(user_id);
CREATE INDEX IF NOT EXISTS idx_editorial_nudges_user_id ON public.editorial_nudges(user_id);
