-- Migration: 20260215_agent_runtime_foundation
-- Description: Foundation tables for agentic runtime — run tracking, step logging,
--              safety incident records, and user approval requests.

-- ============================================
-- AGENT RUNS (one row per agent execution)
-- ============================================
CREATE TABLE IF NOT EXISTS public.agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.coaching_sessions(id) ON DELETE SET NULL,
  trigger_type TEXT NOT NULL,        -- user_message|voice_turn|scheduled_nudge|calendar_event
  model_provider TEXT NOT NULL,
  model_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed', -- completed|failed|aborted
  latency_ms INT,
  total_input_tokens INT,
  total_output_tokens INT,
  total_cost_usd NUMERIC(12,6),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.agent_runs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- AGENT STEPS (individual steps within a run)
-- ============================================
CREATE TABLE IF NOT EXISTS public.agent_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.agent_runs(id) ON DELETE CASCADE,
  step_index INT NOT NULL,
  step_name TEXT NOT NULL,           -- context_build|memory_retrieve|strategy|response|post_actions
  status TEXT NOT NULL,
  input JSONB,
  output JSONB,
  error TEXT,
  latency_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.agent_steps ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SAFETY INCIDENTS (safety event logging)
-- ============================================
CREATE TABLE IF NOT EXISTS public.safety_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  run_id UUID REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  severity TEXT NOT NULL,            -- low|medium|high|critical
  category TEXT NOT NULL,            -- self_harm|minors|medical|financial|abuse|policy
  detection_source TEXT NOT NULL,    -- moderation|rule|model
  details JSONB NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.safety_incidents ENABLE ROW LEVEL SECURITY;

-- ============================================
-- APPROVAL REQUESTS (user approval for sensitive actions)
-- ============================================
CREATE TABLE IF NOT EXISTS public.approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  run_id UUID REFERENCES public.agent_runs(id) ON DELETE SET NULL,
  tool_name TEXT NOT NULL,
  action_summary TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|approved|rejected|expired
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  decided_at TIMESTAMPTZ
);

ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_agent_runs_user_id
  ON public.agent_runs(user_id);

CREATE INDEX IF NOT EXISTS idx_agent_runs_session_id
  ON public.agent_runs(session_id);

CREATE INDEX IF NOT EXISTS idx_agent_runs_created_at
  ON public.agent_runs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_steps_run_id
  ON public.agent_steps(run_id);

CREATE INDEX IF NOT EXISTS idx_safety_incidents_user_id
  ON public.safety_incidents(user_id);

CREATE INDEX IF NOT EXISTS idx_safety_incidents_severity
  ON public.safety_incidents(severity);

CREATE INDEX IF NOT EXISTS idx_approval_requests_user_id
  ON public.approval_requests(user_id);

CREATE INDEX IF NOT EXISTS idx_approval_requests_status
  ON public.approval_requests(status);

-- ============================================
-- RLS POLICIES — users can SELECT their own rows
-- ============================================

-- agent_runs: select own
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_runs'
      AND policyname = 'agent_runs_select_own'
  ) THEN
    CREATE POLICY agent_runs_select_own
      ON public.agent_runs FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- agent_steps: select own (via run ownership)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'agent_steps'
      AND policyname = 'agent_steps_select_own'
  ) THEN
    CREATE POLICY agent_steps_select_own
      ON public.agent_steps FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.agent_runs ar
          WHERE ar.id = agent_steps.run_id
            AND ar.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- safety_incidents: select own
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'safety_incidents'
      AND policyname = 'safety_incidents_select_own'
  ) THEN
    CREATE POLICY safety_incidents_select_own
      ON public.safety_incidents FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- approval_requests: select own
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'approval_requests'
      AND policyname = 'approval_requests_select_own'
  ) THEN
    CREATE POLICY approval_requests_select_own
      ON public.approval_requests FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;
