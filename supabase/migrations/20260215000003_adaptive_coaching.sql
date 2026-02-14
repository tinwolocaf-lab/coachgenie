-- Phase 2: Adaptive Coaching Engine
-- Adds intervention tagging, effectiveness scoring, and behavior commitment contracts

-- ── Coaching Interventions ──────────────────────────────────────────────
-- Tracks which coaching technique was used per assistant message
create table if not exists public.coaching_interventions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid references public.coaching_sessions(id) on delete set null,
  run_id uuid references public.agent_runs(id) on delete set null,
  message_id uuid references public.session_messages(id) on delete set null,
  intervention_type text not null, -- reframing|accountability|goal_setting|validation|challenging|motivational|reflective|psychoeducation|action_planning|boundary_setting
  confidence numeric(4,3) default 0.7,
  context_summary text, -- brief context of why this intervention was chosen
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_interventions_user on public.coaching_interventions(user_id);
create index if not exists idx_interventions_session on public.coaching_interventions(session_id);
create index if not exists idx_interventions_type on public.coaching_interventions(user_id, intervention_type);

-- ── Intervention Effectiveness ──────────────────────────────────────────
-- Scores how effective an intervention was based on user follow-up signals
create table if not exists public.intervention_effectiveness (
  id uuid primary key default gen_random_uuid(),
  intervention_id uuid not null references public.coaching_interventions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  signal_type text not null, -- user_feedback|sentiment_shift|commitment_completed|session_return|goal_progress
  score numeric(4,3) not null, -- 0.0 to 1.0
  details jsonb default '{}'::jsonb,
  measured_at timestamptz default now()
);

create index if not exists idx_effectiveness_intervention on public.intervention_effectiveness(intervention_id);
create index if not exists idx_effectiveness_user on public.intervention_effectiveness(user_id);

-- ── Behavior Commitments ────────────────────────────────────────────────
-- User behavior contracts created during coaching sessions
create table if not exists public.behavior_commitments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid references public.coaching_sessions(id) on delete set null,
  title text not null,
  description text,
  commitment_type text not null default 'action', -- action|habit|boundary|experiment
  status text not null default 'active', -- active|completed|abandoned|expired
  due_date date,
  frequency text, -- daily|weekly|once|custom
  progress numeric(5,2) default 0, -- 0 to 100
  check_in_count int default 0,
  last_check_in_at timestamptz,
  completed_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_commitments_user on public.behavior_commitments(user_id);
create index if not exists idx_commitments_status on public.behavior_commitments(user_id, status);

-- ── RLS Policies ────────────────────────────────────────────────────────

alter table public.coaching_interventions enable row level security;
alter table public.intervention_effectiveness enable row level security;
alter table public.behavior_commitments enable row level security;

create policy "Users can view own interventions"
  on public.coaching_interventions for select
  using (auth.uid() = user_id);

create policy "Users can view own effectiveness scores"
  on public.intervention_effectiveness for select
  using (auth.uid() = user_id);

create policy "Users can manage own commitments"
  on public.behavior_commitments for all
  using (auth.uid() = user_id);

-- Service role can insert interventions and effectiveness scores
create policy "Service can insert interventions"
  on public.coaching_interventions for insert
  with check (true);

create policy "Service can insert effectiveness"
  on public.intervention_effectiveness for insert
  with check (true);
