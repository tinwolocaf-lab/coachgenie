-- Phase 8: Feature Flags and Staged Rollout
-- Simple feature flag system for server-side gating

create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  enabled boolean not null default false,
  rollout_percentage int not null default 0, -- 0-100
  allowed_tiers text[] default '{}', -- empty = all tiers
  allowed_user_ids uuid[] default '{}', -- empty = all users (within rollout %)
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_feature_flags_name on public.feature_flags(name);

-- RLS
alter table public.feature_flags enable row level security;

-- Service role can manage all flags
create policy "Service can manage feature flags"
  on public.feature_flags for all
  with check (true);

-- Insert default feature flags for the revolution features
insert into public.feature_flags (name, description, enabled, rollout_percentage) values
  ('memory_plane', 'User memory retrieval and storage', true, 100),
  ('council_sessions', 'Multi-role coaching council', true, 100),
  ('daily_operating_loop', 'Morning/midday/evening coaching loop', true, 100),
  ('voice_session_summaries', 'Auto-summarize voice sessions', true, 100),
  ('proactive_nudges', 'Proactive coaching nudges', true, 100),
  ('action_approvals', 'Approval-gated actions', true, 50),
  ('minors_safeguards', 'Minors detection and safeguards', true, 100),
  ('memory_compaction', 'Scheduled memory compaction', true, 100),
  ('intervention_tracking', 'Coaching intervention tagging', true, 100),
  ('safety_escalation', 'Crisis routing and escalation', true, 100)
on conflict (name) do nothing;
