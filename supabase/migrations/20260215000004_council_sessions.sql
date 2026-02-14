-- Phase 5: Council and Handoffs
-- Adds council session tracking with role-based contributions

-- ── Council Sessions ────────────────────────────────────────────────────
-- A council session is a multi-role coaching synthesis
create table if not exists public.council_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid references public.coaching_sessions(id) on delete set null,
  run_id uuid references public.agent_runs(id) on delete set null,
  status text not null default 'in_progress', -- in_progress|completed|failed
  synthesis text, -- final unified output
  action_plan jsonb, -- structured action items from synthesis
  weekly_experiment jsonb, -- single weekly experiment recommendation
  model_id text,
  total_tokens int default 0,
  latency_ms int,
  created_at timestamptz default now(),
  completed_at timestamptz
);

create index if not exists idx_council_user on public.council_sessions(user_id);

-- ── Council Contributions ───────────────────────────────────────────────
-- Each role's individual contribution before synthesis
create table if not exists public.council_contributions (
  id uuid primary key default gen_random_uuid(),
  council_id uuid not null references public.council_sessions(id) on delete cascade,
  role text not null, -- analyst|challenger|integrator
  content text not null,
  key_points jsonb default '[]'::jsonb,
  model_id text,
  tokens_used int default 0,
  latency_ms int,
  created_at timestamptz default now()
);

create index if not exists idx_contributions_council on public.council_contributions(council_id);

-- ── RLS ─────────────────────────────────────────────────────────────────

alter table public.council_sessions enable row level security;
alter table public.council_contributions enable row level security;

create policy "Users can view own council sessions"
  on public.council_sessions for select
  using (auth.uid() = user_id);

create policy "Service can manage council sessions"
  on public.council_sessions for all
  with check (true);

create policy "Users can view own council contributions"
  on public.council_contributions for select
  using (
    exists (
      select 1 from public.council_sessions cs
      where cs.id = council_id and cs.user_id = auth.uid()
    )
  );

create policy "Service can manage council contributions"
  on public.council_contributions for all
  with check (true);
