-- Ensure breakthroughs table exists for sanctuary/archive persistence.
-- Some environments may have skipped earlier alignment migrations.

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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'breakthroughs'
      AND policyname = 'Users can view own breakthroughs'
  ) THEN
    CREATE POLICY "Users can view own breakthroughs"
      ON public.breakthroughs FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'breakthroughs'
      AND policyname = 'Users can manage own breakthroughs'
  ) THEN
    CREATE POLICY "Users can manage own breakthroughs"
      ON public.breakthroughs FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_breakthroughs_user_id ON public.breakthroughs(user_id);
CREATE INDEX IF NOT EXISTS idx_breakthroughs_date ON public.breakthroughs(date DESC);
