-- Coachgenie Database Schema
-- Migration: 0001_init
-- Description: Initial database schema with all core tables and RLS policies

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USER PROFILES
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can only read and update their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- CONTEXT VAULT
-- ============================================
CREATE TABLE IF NOT EXISTS public.context_vaults (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  values TEXT[] DEFAULT '{}',
  constraints JSONB DEFAULT '{"available_hours_per_day": 4, "energy_level": "medium", "best_time_for_focus": "morning"}',
  preferences JSONB DEFAULT '{"tone": 50, "directness": 50, "response_length": "balanced"}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS for context_vaults
ALTER TABLE public.context_vaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own vault"
  ON public.context_vaults FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own vault"
  ON public.context_vaults FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vault"
  ON public.context_vaults FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- GOALS
-- ============================================
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  is_30_day_focus BOOLEAN DEFAULT FALSE,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for goals
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own goals"
  ON public.goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own goals"
  ON public.goals FOR ALL
  USING (auth.uid() = user_id);

-- ============================================
-- COACHES
-- ============================================
CREATE TABLE IF NOT EXISTS public.coaches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  tagline TEXT NOT NULL,
  description TEXT NOT NULL,
  icon_name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366F1',
  method TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1.0.0',
  is_public BOOLEAN DEFAULT TRUE,
  system_prompt TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for coaches
ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;

-- Everyone can read public coaches
CREATE POLICY "Anyone can view public coaches"
  ON public.coaches FOR SELECT
  USING (is_public = TRUE);

-- ============================================
-- INSTALLED COACHES (User-Coach relationship)
-- ============================================
CREATE TABLE IF NOT EXISTS public.installed_coaches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT FALSE,
  installed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, coach_id)
);

-- Enable RLS for installed_coaches
ALTER TABLE public.installed_coaches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own installed coaches"
  ON public.installed_coaches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own installed coaches"
  ON public.installed_coaches FOR ALL
  USING (auth.uid() = user_id);

-- ============================================
-- SESSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Session',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS for sessions
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON public.sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own sessions"
  ON public.sessions FOR ALL
  USING (auth.uid() = user_id);

-- ============================================
-- MESSAGES
-- ============================================
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can only access messages from their own sessions
CREATE POLICY "Users can view messages from own sessions"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions
      WHERE sessions.id = messages.session_id
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages to own sessions"
  ON public.messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions
      WHERE sessions.id = messages.session_id
      AND sessions.user_id = auth.uid()
    )
  );

-- ============================================
-- DAY PLANS
-- ============================================
CREATE TABLE IF NOT EXISTS public.day_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Enable RLS for day_plans
ALTER TABLE public.day_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own day plans"
  ON public.day_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own day plans"
  ON public.day_plans FOR ALL
  USING (auth.uid() = user_id);

-- ============================================
-- PRIORITIES
-- ============================================
CREATE TABLE IF NOT EXISTS public.priorities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_plan_id UUID NOT NULL REFERENCES public.day_plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for priorities
ALTER TABLE public.priorities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view priorities from own plans"
  ON public.priorities FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.day_plans
      WHERE day_plans.id = priorities.day_plan_id
      AND day_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage priorities in own plans"
  ON public.priorities FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.day_plans
      WHERE day_plans.id = priorities.day_plan_id
      AND day_plans.user_id = auth.uid()
    )
  );

-- ============================================
-- TIME BLOCKS
-- ============================================
CREATE TABLE IF NOT EXISTS public.time_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  day_plan_id UUID NOT NULL REFERENCES public.day_plans(id) ON DELETE CASCADE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  title TEXT NOT NULL,
  category TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for time_blocks
ALTER TABLE public.time_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view time blocks from own plans"
  ON public.time_blocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.day_plans
      WHERE day_plans.id = time_blocks.day_plan_id
      AND day_plans.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage time blocks in own plans"
  ON public.time_blocks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.day_plans
      WHERE day_plans.id = time_blocks.day_plan_id
      AND day_plans.user_id = auth.uid()
    )
  );

-- ============================================
-- ACTIONS (Next actions from sessions)
-- ============================================
CREATE TABLE IF NOT EXISTS public.actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS for actions
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own actions"
  ON public.actions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own actions"
  ON public.actions FOR ALL
  USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call handle_new_user on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_context_vaults_updated_at
  BEFORE UPDATE ON public.context_vaults
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_day_plans_updated_at
  BEFORE UPDATE ON public.day_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coaches_updated_at
  BEFORE UPDATE ON public.coaches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON public.sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON public.messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_day_plans_user_date ON public.day_plans(user_id, date);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_installed_coaches_user_id ON public.installed_coaches(user_id);
CREATE INDEX IF NOT EXISTS idx_actions_user_id ON public.actions(user_id);
