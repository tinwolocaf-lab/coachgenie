-- User integrations: OAuth tokens per user per provider
CREATE TABLE IF NOT EXISTS public.user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google_calendar', 'notion', 'github', 'todoist', 'linear')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'error')),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[],
  provider_email TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Integration data: cached data from providers for coaching context
CREATE TABLE IF NOT EXISTS public.integration_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES public.user_integrations(id) ON DELETE CASCADE,
  data_type TEXT NOT NULL CHECK (data_type IN ('calendar_event', 'notion_page', 'github_activity', 'task')),
  external_id TEXT,
  title TEXT,
  content JSONB DEFAULT '{}'::JSONB,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(integration_id, external_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_integrations_user
  ON public.user_integrations(user_id);

CREATE INDEX IF NOT EXISTS idx_integration_data_user_type
  ON public.integration_data(user_id, data_type);

CREATE INDEX IF NOT EXISTS idx_integration_data_starts_at
  ON public.integration_data(starts_at);

-- RLS
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own integrations"
  ON public.user_integrations
  FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own integration data"
  ON public.integration_data
  FOR ALL
  USING (auth.uid() = user_id);

-- Push notifications support (only if profiles table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS push_token TEXT;
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- Custom coaches support (only if coaches table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'coaches') THEN
    ALTER TABLE public.coaches ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
    ALTER TABLE public.coaches ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT FALSE;
  END IF;
END $$;
