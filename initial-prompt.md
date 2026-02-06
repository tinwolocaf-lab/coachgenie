00_PROMPT.md

PLAN_V2 (Repo Alignment + Improvements)

Purpose
This section updates the original plan to match the current Coachgenie repo and makes a concrete, sequenced improvement roadmap. It does not replace the original scope; it reconciles it with what is already built and what is missing.

Current repo reality (as of now)
- No backend API exists yet (no apps/api or server directory).
- AI calls run on-device via @fastshot/ai (violates "model keys server only").
- Data is split between AsyncStorage and Supabase, with inconsistent table names.
- Supabase migrations do not include most tables referenced by the app (rituals, archive, sanctuary).
- Coach Package schema is not implemented; coaches are hard-coded in data/coaches.ts.
- Streaming is simulated on client; real SSE/WebSocket is not implemented.

Decisions (explicit to reduce churn)
- Canonical tables: use coaching_sessions and session_messages (already used in supabase-archive and supabase-sanctuary).
- Keep existing sessions/messages tables for now (legacy), but migrate usage to canonical tables.
- Single source of truth: Supabase for all user data, AsyncStorage only for cache/offline.
- AI must run server-side only (Edge Functions or Node API).

Open decisions (needs owner choice)
- Coach Package storage: coach_versions.package_json in Supabase vs static JSON bundles.

Chosen decisions
- Backend: Supabase Edge Functions (selected).
- Provider: OpenRouter for all AI calls (selected).

Milestones v2 (mapped to current repo)
M0: UI shell + auth + nav (mostly done)
M1: Context Vault + onboarding (mostly done, needs Supabase canonical data path)
M2: Coach Library + sessions (partial, not DB-backed)
M3: Artifacts + plans + streaming (client-only; needs server)
M4: Archive (insights/synthesis/history) (partial, needs DB + server)
M5: Rituals + streaks + daily reflections (partial, needs DB)
M6: Notifications + reminders (future)

Phase plan (sequenced, PR-sized)

Phase 1: Schema alignment + migrations (3-5 days)
- Add missing tables in supabase/migrations/0003_*.sql:
  rituals, ritual_completions, ritual_streaks
  daily_reflections
  growth_chapters, chapter_milestones
  editorial_nudges
  coaching_sessions, session_messages
  key_insights, breakthroughs
  monthly_synthesis, history_queries
  insight_collections, insight_collection_items
  session_artifacts
- Add RLS policies for each table (auth.uid() = user_id).
- Add updated_at triggers for user-owned tables.
- Update types/database.ts to reflect schema.
- Decide and document canonical table names (see Decisions above).

Phase 2: Server-side AI + auth (4-7 days)
- Implement API layer (Edge Functions or Node API).
- Add routes:
  POST /chat/stream (SSE)
  POST /artifacts/generate
  POST /plans/generate
  POST /archive/monthly-synthesis
  POST /archive/ask-history
- Verify Supabase JWT on every request.
- Move all AI prompt + artifact generation to server.

Phase 3: Mobile refactor to API + DB (4-6 days)
- Add lib/apiClient.ts with auth header injection.
- Replace @fastshot/ai usage in app/chat/[coachId].tsx with SSE streaming.
- Replace AsyncStorage writes in store/app.ts with Supabase writes (keep cache only).
- Coach list from Supabase; data/coaches.ts becomes fallback seed only.

Phase 4: Coach Packages (2-4 days)
- Add Zod schema and validation for coach packages.
- Store package JSON in coach_versions.
- Validate on install and before session start.

Phase 5: UX completion (3-6 days)
- Artifacts displayed in archive screens and session detail.
- Plan screen powered by session_artifacts, not local store.
- Context Vault fully backed by Supabase with last updated.
- Add "Regenerate last answer".

Phase 6: Archive + Rituals productionization (4-7 days)
- Ensure all supabase-archive and supabase-rituals tables exist and match types.
- Move archive AI to server.
- Add monthly synthesis job.

Phase 7: Tests + observability (2-4 days)
- Zod validation tests for coach packages.
- RLS CRUD tests using Supabase local.
- SSE streaming tests.
- Error reporting + request IDs.

Definition of done (Plan v2)
- No AI calls in client; all AI on server.
- All user data in Supabase with RLS.
- Chat streaming works end-to-end (SSE).
- Artifacts persisted and visible.
- Coach packages validated at runtime.
- Tests cover auth middleware + schemas.

You are building a production-quality MVP of an “Agentic Coaching App” that runs as:
	•	Mobile app: Expo + React Native (TypeScript)
	•	Backend API: Node.js (TypeScript) with a small HTTP server (Fastify or Express)
	•	Database + Auth: Supabase (must use Supabase Auth, Postgres, Storage, Row Level Security)
	•	Dev environment: built to run in Replit (2026), including local dev scripts and deployable API.

Non-negotiables
	1.	Do NOT use Replit Auth or Replit DB.
	2.	All user data must be secured using Supabase RLS policies.
	3.	The mobile app must be beginner-friendly (3-minute onboarding) while supporting advanced users later.
	4.	Milestones 0–3 only in this build:
	•	M0: Repo bootstrap + API health + mobile shell
	•	M1: Supabase Auth + Context Vault CRUD
	•	M2: Coach Library + install/select coach + chat with session storage
	•	M3: Planner output + session artifacts (summary, next actions, 7-day plan)

Security + architecture requirements
	•	Use Supabase JWT (from the mobile app) to authorize API calls.
	•	The API must verify Supabase JWT on every request that touches user data.
	•	LLM/provider API keys must live ONLY on the server (apps/api). Never ship model keys in the mobile app.
	•	Database writes triggered by AI (sessions/messages/artifacts/plans) should happen in the API to maintain consistency.

Delivery requirements (you must produce these artifacts)
	1.	A working monorepo with the folder structure in 01_FOLDER_STRUCTURE.md.
	2.	A validated Coach Package format that conforms to 02_COACH_PACKAGE_SCHEMA.md.
	3.	Mobile screens that meet the exact requirements in 03_UI_REQUIREMENTS.md.
	4.	API routes + Supabase SQL migrations that match 04_API_AND_DB.md.

Definition of done (Milestones 0–3)
	•	User can sign up / sign in using Supabase Auth.
	•	User completes onboarding; Context Vault is created and editable.
	•	User can browse a Coach Library (seeded public coaches), install/select one.
	•	User can chat with a coach; messages stream; session is saved.
	•	Every session ends with:
	•	Session summary artifact
	•	Next action(s)
	•	Updated “7-day plan” artifact (M3)

Testing requirements
	•	Add basic automated checks:
	•	API: unit tests for auth middleware + schema validation for key endpoints
	•	Shared schema validation tests for coach packages
	•	Add runtime validation:
	•	Zod schemas for request/response payloads

Environment variables (minimum)

Mobile (Expo):
	•	EXPO_PUBLIC_SUPABASE_URL
	•	EXPO_PUBLIC_SUPABASE_ANON_KEY
	•	EXPO_PUBLIC_API_BASE_URL

API:
	•	SUPABASE_URL
	•	SUPABASE_SERVICE_ROLE_KEY
	•	SUPABASE_JWT_SECRET (or fetch JWKS depending on approach)
	•	MODEL_PROVIDER_API_KEY (e.g., OPENAI_API_KEY / ANTHROPIC_API_KEY, etc.)

Implementation plan (how you should work)
	•	Implement milestone-by-milestone.
	•	Keep the UI minimal, fast, and consistent.
	•	Prefer boring, proven patterns:
	•	Zod for validation
	•	SQL migrations for schema
	•	Strict RLS
	•	Whenever unsure, choose simpler designs that preserve forwards compatibility.

⸻

01_FOLDER_STRUCTURE.md

Monorepo layout

coach-app/
  apps/
    mobile/
      app/                      # expo-router screens
        (auth)/
          sign-in.tsx
          sign-up.tsx
        (onboarding)/
          welcome.tsx
          values.tsx
          goals.tsx
          constraints.tsx
          preferences.tsx
          finish.tsx
        (main)/
          home.tsx
          coach-library.tsx
          coach-details/[coachId].tsx
          chat/[sessionId].tsx
          context-vault.tsx
          plan.tsx
          artifacts/[sessionId].tsx
        _layout.tsx
      src/
        components/
          Button.tsx
          Card.tsx
          Input.tsx
          CoachTile.tsx
          MessageBubble.tsx
          ArtifactCard.tsx
          LoadingState.tsx
        lib/
          supabaseClient.ts       # supabase-js client (anon)
          apiClient.ts            # fetch wrapper with JWT injection
          auth.ts                 # auth helpers
          analytics.ts            # event hooks (stubbed for MVP)
        state/
          useSessionStore.ts      # lightweight store (zustand or context)
          useUserStore.ts
        styles/
          theme.ts                # colors, spacing, typography
        types/
          supabase.ts             # generated types (optional)
      assets/
      app.json
      package.json
      tsconfig.json

    api/
      src/
        server.ts                 # createServer + listen
        plugins/
          auth.ts                 # verify Supabase JWT middleware
          supabase.ts             # admin client (service role)
        routes/
          health.ts
          profile.ts
          contextVault.ts
          coaches.ts
          sessions.ts
          chat.ts                 # streaming endpoint
          plans.ts                # generate 7-day plan (M3)
        services/
          coachRuntime/
            orchestrator.ts       # routes intent -> coach/planner
            promptBuilder.ts      # builds prompts from coach package + context
            toolPermissions.ts    # enforce allowed tools
          llm/
            client.ts             # provider wrapper
            streaming.ts          # SSE/websocket helper
          db/
            repositories.ts       # typed DB calls
        schemas/
          apiSchemas.ts           # zod request/response schemas
        utils/
          errors.ts
          logger.ts
      test/
        auth.test.ts
        schemas.test.ts
      package.json
      tsconfig.json

  packages/
    shared/
      src/
        coachPackage/
          schema.ts               # zod schema + types
          validate.ts
          examples/
            focus-coach.json
            systems-coach.json
        dto/
          api.ts                  # shared request/response types
        constants/
          limits.ts
      package.json
      tsconfig.json

    ui-tokens/
      src/
        theme.ts                  # optional shared design tokens
      package.json
      tsconfig.json

  supabase/
    migrations/
      0001_init.sql
      0002_seed_public_coaches.sql
    seed/
      README.md

  docs/
    00_PROMPT.md
    01_FOLDER_STRUCTURE.md
    02_COACH_PACKAGE_SCHEMA.md
    03_UI_REQUIREMENTS.md
    04_API_AND_DB.md

  .env.example
  package.json                   # workspace root
  tsconfig.base.json
  README.md

Key conventions
	•	Mobile uses expo-router screen groups: (auth), (onboarding), (main).
	•	API is the only place that calls the model provider.
	•	packages/shared owns the Coach Package schema and validation (used by both mobile and API).
	•	Supabase migrations are source-controlled under supabase/migrations.

⸻

02_COACH_PACKAGE_SCHEMA.md

Overview

A “Coach Package” is a JSON document that defines:
	•	identity + versioning
	•	coaching behavior (tone, method, boundaries)
	•	memory rules (what to store and how)
	•	runnable protocols (structured coaching flows)
	•	output templates (for artifacts like plans)
	•	tool permissions (what the agent is allowed to do)

The package must be:
	•	portable (export/import)
	•	versioned
	•	validatable (Zod + optional JSON Schema)

File format
	•	Filename: *.coachpack.json
	•	Content type: JSON
	•	UTF-8

⸻

Coach Package: JSON Schema (logical schema)

Top-level fields
	•	package_version (string): schema version for this coach package format
	•	id (string UUID): unique package ID
	•	slug (string): human-friendly identifier (kebab-case)
	•	name (string)
	•	description (string)
	•	author (object)
	•	visibility (enum): "public" | "unlisted" | "private"
	•	version (string): semantic version e.g. "1.2.0"
	•	changelog (string, optional)
	•	tags (string[])
	•	icon (object, optional): references storage path or bundled asset
	•	defaults (object): runtime defaults (tone, verbosity, etc.)
	•	behavior (object): coaching method + guardrails
	•	memory (object): what to store and how
	•	protocols (array): runnable workflows
	•	templates (object): structured output templates
	•	tools (object): tool permissions + limits
	•	evals (object, optional): self-checks after responses
	•	localization (object, optional): language hints

⸻

Concrete JSON (authoritative example)

{
  "package_version": "2026-01",
  "id": "2c33d63e-6df6-4c78-9d8c-6b3be4a89ac9",
  "slug": "daily-clarity-coach",
  "name": "Daily Clarity Coach",
  "description": "Turns vague intention into a clear plan for today, aligned to your values and constraints.",
  "author": {
    "name": "Better Creating",
    "contact": "support@example.com"
  },
  "visibility": "public",
  "version": "1.0.0",
  "changelog": "Initial release.",
  "tags": ["productivity", "clarity", "planning"],
  "icon": {
    "type": "supabase_storage_path",
    "value": "coach-icons/daily-clarity.png"
  },
  "defaults": {
    "tone": "calm_direct",
    "directness": 0.7,
    "verbosity": "medium",
    "session_goal": "end_with_one_next_action",
    "safety_mode": "standard"
  },
  "behavior": {
    "role": "coach",
    "method": "clarify->constrain->commit",
    "rules": [
      "Always ask at most 2 questions before proposing a plan.",
      "Prefer small commitments over large plans.",
      "Never shame; be firm and practical."
    ],
    "boundaries": {
      "medical": "not_a_medical_provider",
      "legal": "not_a_lawyer",
      "crisis": "provide_crisis_resources"
    },
    "style": {
      "voice": "minimal",
      "formatting": "bullets_then_next_action",
      "avoid": ["fluff", "long_monologues"]
    }
  },
  "memory": {
    "profile_fields": [
      { "key": "values", "type": "string_array", "update": "user_confirmed" },
      { "key": "goals_30d", "type": "string_array", "update": "user_confirmed" },
      { "key": "constraints", "type": "string_array", "update": "assistant_suggested_user_confirmed" },
      { "key": "preferences", "type": "json", "update": "assistant_suggested_user_confirmed" }
    ],
    "working_fields": [
      { "key": "active_projects", "type": "json", "ttl_days": 30, "update": "assistant_suggested_user_confirmed" },
      { "key": "current_week_plan", "type": "json", "ttl_days": 14, "update": "assistant_only" }
    ],
    "retention": {
      "session_summaries_days": 180,
      "raw_messages_days": 90
    }
  },
  "protocols": [
    {
      "id": "unstuck-5min",
      "name": "Unstuck Protocol (5 min)",
      "trigger_phrases": ["stuck", "procrastinating", "overwhelmed"],
      "steps": [
        { "type": "ask", "prompt": "What exactly feels hard right now? Give me one sentence." },
        { "type": "ask", "prompt": "If this were 10x smaller, what would it be?" },
        {
          "type": "propose",
          "template": "Offer 3 tiny next actions. Ask user to pick one."
        },
        { "type": "commit", "template": "Turn the chosen action into a 10-minute commitment." },
        { "type": "reflect", "template": "Ask what obstacle might block it and how to remove it." }
      ],
      "outputs": ["next_action", "session_summary"]
    }
  ],
  "templates": {
    "session_summary": {
      "format": "markdown",
      "sections": ["What you said", "What matters", "Decision", "Next action", "If-then plan"]
    },
    "seven_day_plan": {
      "format": "json",
      "schema_hint": {
        "days": [
          { "day": "YYYY-MM-DD", "top_3": ["string"], "time_blocks": ["string"], "notes": "string" }
        ]
      }
    }
  },
  "tools": {
    "allowed": ["create_task", "update_plan", "write_note"],
    "limits": {
      "max_tool_calls_per_turn": 3,
      "max_plan_horizon_days": 14
    },
    "confirmations": {
      "create_task": "always",
      "update_plan": "suggest_then_apply"
    }
  },
  "evals": {
    "post_turn_checks": [
      "Does the response end with a single next action?",
      "Is it aligned to stated constraints?",
      "Did the coach ask <= 2 questions before proposing?"
    ],
    "on_fail": "revise_once"
  },
  "localization": {
    "primary_language": "en",
    "supported_languages": ["en"]
  }
}


⸻

Validation rules (minimum)
	•	package_version, id, slug, name, version, behavior, memory, tools must exist.
	•	id must be UUID.
	•	version must be semver.
	•	protocols[].steps[].type must be one of: ask | propose | commit | reflect | tool | end.
	•	tools.allowed is an allowlist; runtime must deny any tool not in this list.

⸻

03_UI_REQUIREMENTS.md

Global UI principles
	•	Minimal, spacious, high-contrast.
	•	No “agent complexity” exposed to beginners.
	•	Every session produces a visible artifact.
	•	Primary CTA is always obvious.

Navigation
	•	Stack for onboarding/auth
	•	Tab or top-level nav for:
	•	Home
	•	Coaches
	•	Plan
	•	Vault

⸻

(auth) Sign In

Route: (auth)/sign-in
	•	Fields: Email, Password
	•	Buttons: “Sign in”, “Create account”, “Forgot password”
	•	States:
	•	loading
	•	invalid credentials
	•	offline
	•	Success: navigate to onboarding (if first run) else Home

(auth) Sign Up

Route: (auth)/sign-up
	•	Fields: Email, Password, Confirm Password
	•	Checkbox: “I agree to terms”
	•	Success: create account in Supabase Auth, then onboarding

⸻

(onboarding) Welcome

Route: (onboarding)/welcome
	•	Copy: “Set up your coaching in 3 minutes.”
	•	CTA: “Start”
	•	Secondary: “Skip (use defaults)” (still creates minimal vault)

(onboarding) Values

Route: (onboarding)/values
	•	UI: selectable chips + optional custom input
	•	Prompt: “Pick 3–5 values”
	•	Validation: min 1 value
	•	CTA: “Next”

(onboarding) Goals

Route: (onboarding)/goals
	•	Prompt: “What are you focused on this month?”
	•	UI: 1–3 short text entries
	•	CTA: “Next”

(onboarding) Constraints

Route: (onboarding)/constraints
	•	Prompt: “What constraints should your coach respect?”
	•	UI: suggested chips (time, energy, work schedule) + custom
	•	CTA: “Next”

(onboarding) Preferences

Route: (onboarding)/preferences
	•	Toggles/sliders:
	•	Tone: Calm ↔ Intense
	•	Directness: Gentle ↔ Direct
	•	Accountability: Low ↔ High
	•	CTA: “Finish”

(onboarding) Finish

Route: (onboarding)/finish
	•	Shows: “Your Context Vault is ready.”
	•	Shows 3 starter coaches (cards):
	•	Daily Clarity
	•	Deep Work
	•	Systems Builder
	•	CTA: “Choose coach” (installs + navigates to Home)

⸻

(main) Home

Route: (main)/home
	•	Sections:
	1.	“Today” card:
	•	Top 3 (from latest plan artifact if exists)
	•	“One next action” (from last session)
	•	CTA: “Start a check-in” (opens chat with active coach)
	2.	“Active Coach” card:
	•	name + short description
	•	CTA: “Chat”
	3.	“Recent” list:
	•	last 5 sessions with timestamp and outcome label
	•	Empty state:
	•	“Start your first session” button

⸻

(main) Coach Library

Route: (main)/coach-library
	•	Header: search bar
	•	Filters: tags (productivity, focus, systems)
	•	List sections:
	•	Featured
	•	Popular
	•	New
	•	Each coach tile shows:
	•	icon, name, one-line promise
	•	“Try” (opens preview modal) + “Install”
	•	Must support:
	•	Pull-to-refresh
	•	Offline cached list (best effort)

(main) Coach Details

Route: (main)/coach-details/[coachId]
	•	Shows:
	•	coach icon/name/description
	•	“What it helps with” bullets
	•	“How it works” (protocol names)
	•	Version + author
	•	CTAs:
	•	Install / Uninstall
	•	Set as Active
	•	Start Session

⸻

(main) Chat

Route: (main)/chat/[sessionId]
	•	Minimal chat stream UI:
	•	user bubbles
	•	assistant bubbles
	•	typing indicator while streaming
	•	Action drawer (bottom sheet):
	•	“Summary”
	•	“Next actions”
	•	“Plan”
	•	Input:
	•	text field + send
	•	optional mic button (stub for MVP)
	•	End-of-session UX:
	•	When coach outputs artifacts, show “Session Results” panel:
	•	Summary card
	•	Next action list
	•	Update plan button
	•	Hard requirements:
	•	Streaming responses (SSE or websocket)
	•	Messages persisted to DB
	•	“Regenerate last answer” (M3 optional)

⸻

(main) Context Vault

Route: (main)/context-vault
	•	Editable sections:
	•	Values
	•	Goals (30 days)
	•	Constraints
	•	Preferences
	•	Each section:
	•	edit icon
	•	save confirmation
	•	Data safety:
	•	show “Last updated”
	•	confirm destructive edits

⸻

(main) Plan

Route: (main)/plan
	•	Displays latest “7-day plan”
	•	Each day shows:
	•	Top 3
	•	Time blocks (optional)
	•	CTA:
	•	“Adjust with coach” → opens chat with an intent hint (“plan_adjust”)

⸻

(main) Artifacts

Route: (main)/artifacts/[sessionId]
	•	Lists artifacts for that session:
	•	Summary
	•	Next actions
	•	Plan update
	•	Export options (M3):
	•	copy to clipboard
	•	share sheet (basic)

⸻

UX acceptance criteria for Milestones 0–3
	•	A first-time user can go from install → first coaching output in < 3 minutes.
	•	A returning user can open app → see today’s Top 3 → start a session in < 10 seconds.

⸻

04_API_AND_DB.md

A) Supabase DB schema (Milestones 0–3)

Core principles
	•	Use auth.users as the source of truth for identity.
	•	All user-owned rows use user_id uuid references auth.users(id).
	•	Enable RLS on every user-owned table.
	•	Public coaches are readable by all authenticated users; installed coach links are per-user.

⸻

SQL migration: 0001_init.sql

-- Enable extensions
create extension if not exists "pgcrypto";

-- Helper: updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- USER PROFILE (optional; auth.users already exists)
create table if not exists public.user_profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  display_name text,
  avatar_url text
);

create trigger set_user_profile_updated_at
before update on public.user_profile
for each row execute function public.set_updated_at();

alter table public.user_profile enable row level security;

create policy "profile_read_own"
on public.user_profile for select
using (auth.uid() = user_id);

create policy "profile_write_own"
on public.user_profile for insert
with check (auth.uid() = user_id);

create policy "profile_update_own"
on public.user_profile for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);


-- CONTEXT VAULT
create table if not exists public.context_vault (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  values text[] not null default '{}',
  goals_30d text[] not null default '{}',
  constraints text[] not null default '{}',
  preferences jsonb not null default '{}'::jsonb
);

create trigger set_context_vault_updated_at
before update on public.context_vault
for each row execute function public.set_updated_at();

alter table public.context_vault enable row level security;

create policy "vault_read_own"
on public.context_vault for select
using (auth.uid() = user_id);

create policy "vault_write_own"
on public.context_vault for insert
with check (auth.uid() = user_id);

create policy "vault_update_own"
on public.context_vault for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);


-- COACHES (public catalog)
create table if not exists public.coaches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  slug text not null unique,
  name text not null,
  description text not null,
  tags text[] not null default '{}',
  visibility text not null default 'public', -- public|unlisted|private (MVP uses public)
  author_name text,
  icon_path text, -- Supabase Storage path (optional)
  is_featured boolean not null default false
);

create trigger set_coaches_updated_at
before update on public.coaches
for each row execute function public.set_updated_at();

alter table public.coaches enable row level security;

-- Authenticated users can read public coaches
create policy "coaches_read_public"
on public.coaches for select
using (visibility = 'public');

-- (MVP) Writes only from service role / admin tooling; no public insert/update policies.


-- COACH VERSIONS (package JSON)
create table if not exists public.coach_versions (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references public.coaches(id) on delete cascade,
  created_at timestamptz not null default now(),
  version text not null, -- semver
  package_json jsonb not null,
  changelog text,
  is_current boolean not null default false
);

create unique index if not exists coach_versions_unique
on public.coach_versions (coach_id, version);

create index if not exists coach_versions_current_idx
on public.coach_versions (coach_id) where is_current = true;

alter table public.coach_versions enable row level security;

create policy "coach_versions_read_public"
on public.coach_versions for select
using (
  exists (
    select 1 from public.coaches c
    where c.id = coach_versions.coach_id and c.visibility = 'public'
  )
);

-- INSTALLED COACHES (per user)
create table if not exists public.installed_coaches (
  user_id uuid not null references auth.users(id) on delete cascade,
  coach_id uuid not null references public.coaches(id) on delete cascade,
  installed_at timestamptz not null default now(),
  is_active boolean not null default false,
  primary key (user_id, coach_id)
);

alter table public.installed_coaches enable row level security;

create policy "installed_read_own"
on public.installed_coaches for select
using (auth.uid() = user_id);

create policy "installed_write_own"
on public.installed_coaches for insert
with check (auth.uid() = user_id);

create policy "installed_update_own"
on public.installed_coaches for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);


-- SESSIONS
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  coach_id uuid references public.coaches(id) on delete set null,
  coach_version_id uuid references public.coach_versions(id) on delete set null,
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  title text,
  intent text, -- e.g., "checkin", "plan_adjust", "unstuck"
  status text not null default 'active' -- active|ended
);

create index if not exists sessions_user_idx on public.sessions(user_id, created_at desc);

alter table public.sessions enable row level security;

create policy "sessions_read_own"
on public.sessions for select
using (auth.uid() = user_id);

create policy "sessions_write_own"
on public.sessions for insert
with check (auth.uid() = user_id);

create policy "sessions_update_own"
on public.sessions for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);


-- SESSION MESSAGES
create table if not exists public.session_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  role text not null, -- user|assistant|system
  content text not null,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists session_messages_session_idx
on public.session_messages(session_id, created_at asc);

alter table public.session_messages enable row level security;

create policy "messages_read_own"
on public.session_messages for select
using (auth.uid() = user_id);

create policy "messages_write_own"
on public.session_messages for insert
with check (auth.uid() = user_id);


-- SESSION ARTIFACTS (summary, next actions, plan)
create table if not exists public.session_artifacts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  type text not null, -- summary|next_actions|seven_day_plan|note
  format text not null default 'markdown', -- markdown|json
  content jsonb not null -- store markdown as {"text": "..."} or JSON directly
);

create index if not exists session_artifacts_session_idx
on public.session_artifacts(session_id, created_at desc);

alter table public.session_artifacts enable row level security;

create policy "artifacts_read_own"
on public.session_artifacts for select
using (auth.uid() = user_id);

create policy "artifacts_write_own"
on public.session_artifacts for insert
with check (auth.uid() = user_id);


-- OPTIONAL: CURRENT PLAN (denormalized pointer)
create table if not exists public.user_current_plan (
  user_id uuid primary key references auth.users(id) on delete cascade,
  updated_at timestamptz not null default now(),
  plan_artifact_id uuid references public.session_artifacts(id) on delete set null
);

create trigger set_user_current_plan_updated_at
before update on public.user_current_plan
for each row execute function public.set_updated_at();

alter table public.user_current_plan enable row level security;

create policy "current_plan_read_own"
on public.user_current_plan for select
using (auth.uid() = user_id);

create policy "current_plan_write_own"
on public.user_current_plan for insert
with check (auth.uid() = user_id);

create policy "current_plan_update_own"
on public.user_current_plan for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);


⸻

SQL seed: 0002_seed_public_coaches.sql (M2 requirement)

-- Insert a few public coaches
insert into public.coaches (slug, name, description, tags, visibility, author_name, is_featured)
values
  ('daily-clarity-coach', 'Daily Clarity Coach', 'Turn today into a clear plan with one next action.', array['productivity','clarity'], 'public', 'Better Creating', true),
  ('deep-work-coach', 'Deep Work Coach', 'Design focus sprints and protect attention.', array['focus','productivity'], 'public', 'Better Creating', true),
  ('systems-builder-coach', 'Systems Builder Coach', 'Build simple systems that reduce friction and increase consistency.', array['systems','habits'], 'public', 'Better Creating', true)
on conflict (slug) do nothing;

For each seeded coach, insert a corresponding coach_versions row with is_current = true and a valid package_json matching 02_COACH_PACKAGE_SCHEMA.md.

⸻

B) API routes (Milestones 0–3)

Auth model
	•	Mobile authenticates with Supabase Auth.
	•	Mobile includes Supabase access token in API calls:
	•	Authorization: Bearer <supabase_access_token>
	•	API verifies token (either:
	•	verify JWT with SUPABASE_JWT_SECRET, or
	•	use Supabase JWKS verification approach)

API base
	•	Base URL: /v1
	•	Response format: JSON
	•	Streaming: SSE (text/event-stream) for chat

⸻

Milestone 0 routes

GET /health

Returns { "ok": true, "time": "..." }

⸻

Milestone 1 routes (Context Vault)

GET /v1/me

Returns minimal profile + onboarding status:
	•	has_context_vault: boolean
	•	active_coach_id: uuid | null

PUT /v1/context-vault

Upserts the user vault.
Body:

{
  "values": ["..."],
  "goals_30d": ["..."],
  "constraints": ["..."],
  "preferences": { "tone": "calm_direct", "directness": 0.7, "accountability": 0.6 }
}

GET /v1/context-vault

Returns the vault.

Implementation note:
	•	This could also be done directly via supabase-js in the mobile app, but keeping a single API path simplifies validation and future logic.

⸻

Milestone 2 routes (Coach library + sessions + chat)

GET /v1/coaches

Query params:
	•	q (optional search)
	•	tag (optional)
Returns public coaches + current version metadata.

GET /v1/coaches/:coachId

Returns coach + current coach_versions.package_json.

POST /v1/installed-coaches

Install a coach for the user.
Body:

{ "coach_id": "uuid" }

PUT /v1/installed-coaches/active

Set active coach.
Body:

{ "coach_id": "uuid" }

Behavior:
	•	sets all installed rows is_active=false then set chosen true.

POST /v1/sessions

Create a new session.
Body:

{ "coach_id": "uuid", "intent": "checkin" }

Returns:
	•	session_id

GET /v1/sessions/:sessionId

Returns session metadata + recent artifacts.

GET /v1/sessions/:sessionId/messages

Returns ordered messages (paged).

⸻

Chat (streaming)

POST /v1/chat/stream

SSE streaming endpoint.

Body:

{
  "session_id": "uuid",
  "user_message": "string",
  "client_context": { "screen": "chat" }
}

Server responsibilities:
	1.	Verify JWT; derive user_id.
	2.	Load:
	•	context_vault for user
	•	active coach package (coach_versions.package_json)
	•	recent session messages (windowed)
	3.	Run orchestrator:
	•	choose protocol if triggered
	•	assemble prompt
	4.	Stream assistant tokens to client.
	5.	Persist:
	•	user message
	•	assistant message
	6.	Generate “session_summary” artifact at end of turn (M2 lightweight summary).

SSE events:
	•	event: token { "t": "..." }
	•	event: done { "message_id": "...", "artifacts": [...] }
	•	event: error { "code": "...", "message": "..." }

⸻

Milestone 3 routes (Planner + artifacts)

POST /v1/plans/generate

Creates/updates a 7-day plan artifact using:
	•	context vault
	•	recent sessions
	•	explicit user request

Body:

{
  "session_id": "uuid",
  "horizon_days": 7
}

Returns:
	•	artifact_id + plan JSON

Server responsibilities:
	•	Write a session_artifacts row with type=seven_day_plan
	•	Upsert user_current_plan.plan_artifact_id

GET /v1/plan/current

Returns the current plan artifact (if set).

⸻

C) DB access patterns (Milestones 0–3)

Mobile (Expo) uses Supabase directly for:
	•	Auth flows
	•	Reading public coach list (optional; can go via API)
	•	Basic profile display

API uses Supabase admin client for:
	•	Validated writes (sessions/messages/artifacts)
	•	Coach package retrieval
	•	Enforcing tool permissions and consistent outputs

⸻

D) Data retention defaults (M0–M3)
	•	session_messages: keep all for now, but plan to TTL later (schema already supports future retention policy).
	•	session_artifacts: keep longer than raw messages (artifact-first UX).
