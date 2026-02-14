# CoachGenie Revolution Plan v2 (Research-Validated, February 2026)

> Updated: February 14, 2026
> Purpose: Validate and upgrade the revolution plan using current (Jan-Feb 2026) agent ecosystem, safety guidance, and implementation constraints in this repository.

## 1) Executive Verdict on the Current Plan

The current plan is strong in vision and product ambition, but it is **not yet implementation-safe** for an agentic coaching product at 2026 quality bar.

What is already strong:
- Memory-first strategy (RAG + pattern detection)
- Behavioral science orientation
- Proactive coaching direction
- Multi-agent coaching concept (Council + handoffs)
- Voice as a major UX mode

What is missing or under-specified:
- Reliable agent runtime (state machine/orchestration, retries, failure policies)
- Eval flywheel (dataset, graders, trace-level scoring, release gates)
- Safety architecture (risk tiers, crisis routing, minors safeguards, approval gates)
- Action policy and tool permissions (what can run automatically vs require confirmation)
- Memory lifecycle (episodic vs semantic vs profile memory, pruning/compaction)
- Operational rollout plan (SLOs, kill switches, canarying, incident response)

Bottom line: your direction is right; this v2 plan turns it into a production program.

---

## 2) 2026 Landscape Signals That Change the Plan

These are the most relevant shifts as of February 2026 and what they imply for CoachGenie.

### 2.1 Agent platforms matured from "prompt chains" to runtime systems
- OpenAI now centers agent building around Responses + Agents SDK + tool stack + tracing/evals; Jan-Feb 2026 changelog adds continued model/runtime updates (including `gpt-5.2-codex` in Jan 2026 and inference speed updates in Feb 2026).
- OpenAI guidance now explicitly highlights traces, handoffs, tools, and reproducible eval workflows.

Implication:
- Do not ship as ad-hoc chained prompts only.
- Build a first-class orchestration runtime with typed steps, trace IDs, and policy checks.

### 2.2 Voice agents are now first-class and low-latency by design
- OpenAI voice guidance emphasizes speech-to-speech architecture, transport choice (WebRTC/WebSocket), and explicit handoff patterns.

Implication:
- Voice should be treated as a primary runtime path, not a separate bolt-on feature.
- Architect one coaching brain that serves both text and voice, with modality adapters.

### 2.3 Context + tool ecosystems converged around MCP/connectors
- MCP is now a practical interoperability standard across ecosystems.
- OpenAI/Anthropic both support connector/MCP patterns, with explicit warnings to use trusted/official servers and approval policies.

Implication:
- Build tool governance from day one.
- Prefer official connectors where possible, with per-tool approval policies.

### 2.4 Frontier models improved, but reliability is still imperfect
- OpenAI computer-use docs still report meaningful reliability limits (e.g., OSWorld metric context), and require user confirmation for sensitive steps.

Implication:
- Agentic "actions" must be tiered by risk and require confirmation for sensitive operations.
- No fully autonomous high-risk flows in early releases.

### 2.5 Long-context + compaction changed memory architecture
- Anthropic Feb 2026 notes: Opus 4.6 + adaptive thinking, 1M context beta, compaction API.
- OpenAI supports conversation compaction and background processing.

Implication:
- Combine vector memory with compaction/summarization loops; do not rely on raw conversation replay.

### 2.6 Mental-health-style conversational products need explicit clinical boundaries
- RCT evidence in 2025 shows potential symptom improvements for some chatbot interventions.
- Other longitudinal evidence shows heavy usage can correlate with loneliness/dependence risks.

Implication:
- Build dual goals: efficacy + anti-dependence safeguards (session caps, return-to-human nudges, risk routing).

### 2.7 Regulation is now implementation-timed, not theoretical
- EU AI Act applicability milestones are active through 2025 and major provisions apply in 2026.

Implication:
- Add compliance-by-design tracks now (transparency, logging, risk management, governance artifacts).

---

## 3) Repository Reality Check (What You Already Have)

Existing strengths in this codebase:
- `supabase/functions/chat-stream/index.ts` already has streaming, billing, tier model selection.
- `supabase/functions/_shared/context-builder.ts` already enriches prompts with context vault + integrations data.
- `supabase/functions/patterns-detect/index.ts` and `supabase/functions/nudges-generate/index.ts` already provide early proactive logic.
- Voice transcription path exists in `supabase/functions/voice-transcribe/index.ts`.
- Integrations + billing + marketplace foundations are already present in migrations/functions.

Current gaps vs agentic target:
- No canonical `agent_run`/`agent_step` trace model in DB.
- No reusable orchestration kernel module.
- No memory plane (embeddings + summaries + profile memory) wired to chat runtime.
- No explicit safety/risk router for crisis, minors, and high-risk prompts.
- No eval dataset + grader pipeline bound to release quality gates.

---

## 4) North Star Product Definition

CoachGenie should become a **Personal Coaching Operating System** with 5 required properties:

1. Continuity: remembers and evolves with the user over months.
2. Agency: can plan, follow up, and execute low-risk tasks with consent.
3. Scientific adaptation: interventions personalized by measured outcomes.
4. Multimodal relationship: text + voice + contextual signals.
5. Safe autonomy: explicit risk boundaries, human-in-the-loop where needed.

---

## 5) Target Architecture (v2)

## 5.1 Runtime Layers

1. Experience Layer
- Expo screens, voice session UI, proactive inbox, approvals center.

2. Agent Runtime Layer
- Orchestrator graph: `sense -> plan -> retrieve -> strategize -> respond -> reflect -> schedule`.
- Deterministic step contracts and retry policies.

3. Tooling Layer
- Integration tools (calendar, notion, github, tasks, notifications).
- Action tools (draft/schedule/create), all policy-gated.

4. Memory Layer
- Episodic memory (events/messages)
- Semantic memory (embeddings + retrieval)
- Profile memory (stable facts/preferences/goals)
- Compacted summaries (rolling timeline)

5. Safety + Governance Layer
- Moderation, risk scoring, crisis detection, minors mode, approvals.

6. Evaluation + Observability Layer
- Agent traces, step outcomes, grader scores, online KPIs.

## 5.2 Orchestrator Contract

Every agent run should emit:
- `run_id`, `user_id`, `session_id`, `trigger_type`
- ordered `steps[]` with `input`, `output`, `latency_ms`, `cost`, `errors`
- `safety_decisions[]`
- `tool_calls[]` with approval outcome
- `final_response` and `post_actions`

---

## 6) Data Model v2 (Additive, Migration-First)

Use additive migrations only, aligned with your existing migration strategy.

### 6.1 Core runtime tables

```sql
create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  session_id uuid references public.coaching_sessions(id) on delete set null,
  trigger_type text not null, -- user_message|voice_turn|scheduled_nudge|calendar_event
  model_provider text not null,
  model_id text not null,
  status text not null default 'completed', -- completed|failed|aborted
  latency_ms int,
  total_input_tokens int,
  total_output_tokens int,
  total_cost_usd numeric(12,6),
  created_at timestamptz default now()
);

create table if not exists public.agent_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.agent_runs(id) on delete cascade,
  step_index int not null,
  step_name text not null, -- context_build|memory_retrieve|strategy|response|post_actions
  status text not null,
  input jsonb,
  output jsonb,
  error text,
  latency_ms int,
  created_at timestamptz default now()
);
```

### 6.2 Memory plane tables

```sql
create extension if not exists vector;

create table if not exists public.user_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  memory_type text not null, -- episodic|semantic|profile|summary
  source_type text not null, -- session_message|journal|ritual|calendar|health|system
  source_id uuid,
  content text not null,
  embedding vector(1536),
  salience_score numeric(4,3) default 0.5,
  confidence_score numeric(4,3) default 0.7,
  ttl_expires_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_user_memories_user on public.user_memories(user_id);
create index if not exists idx_user_memories_type on public.user_memories(user_id, memory_type);
create index if not exists idx_user_memories_embedding on public.user_memories using hnsw (embedding vector_cosine_ops);

create table if not exists public.user_state_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  state jsonb not null, -- mood trend, active commitments, confidence, risk flags
  summary text,
  created_at timestamptz default now()
);
```

### 6.3 Safety and approvals

```sql
create table if not exists public.safety_incidents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  run_id uuid references public.agent_runs(id) on delete set null,
  severity text not null, -- low|medium|high|critical
  category text not null, -- self_harm|minors|medical|financial|abuse|policy
  detection_source text not null, -- moderation|rule|model
  details jsonb not null,
  resolved boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  run_id uuid references public.agent_runs(id) on delete set null,
  tool_name text not null,
  action_summary text not null,
  payload jsonb not null,
  status text not null default 'pending', -- pending|approved|rejected|expired
  expires_at timestamptz,
  created_at timestamptz default now(),
  decided_at timestamptz
);
```

### 6.4 Evaluation tables

```sql
create table if not exists public.coach_eval_cases (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  input jsonb not null,
  expected jsonb,
  tags text[] default '{}',
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.coach_eval_runs (
  id uuid primary key default gen_random_uuid(),
  commit_sha text,
  model_id text,
  score numeric(5,2),
  metrics jsonb not null,
  created_at timestamptz default now()
);
```

---

## 7) Edge Function Program (Detailed)

## 7.1 New shared modules

Add in `supabase/functions/_shared/`:
- `agent-orchestrator.ts`
- `memory.ts`
- `memory-compaction.ts`
- `risk-engine.ts`
- `tool-policy.ts`
- `eval-grader.ts`
- `trace.ts`

## 7.2 Upgrade existing functions

1. `chat-stream/index.ts`
- Replace direct prompt assembly with orchestrator call.
- Flow:
  - ingest user message
  - run safety pre-check
  - build context (vault + integrations + state snapshot)
  - retrieve memories
  - select coaching strategy
  - generate response
  - async post-actions: memory write, intervention tagging, scheduling

2. `_shared/context-builder.ts`
- Keep existing integrations context.
- Add:
  - memory snippets (top-k semantic + recency blend)
  - state snapshot summary
  - time-of-day policy
  - last intervention effectiveness summary

3. `patterns-detect/index.ts`
- Convert from simple heuristics to hybrid:
  - SQL feature extraction
  - LLM labeling with confidence
  - write to `user_state_snapshots`

4. `nudges-generate/index.ts`
- Policy-based generator:
  - max nudge frequency caps
  - anti-spam cooldowns
  - anti-dependence logic (if high usage, prompt offline action)

5. `voice-transcribe/index.ts`
- Keep current path initially.
- Add run traces and safety checks on transcript.

## 7.3 New functions

- `memory-upsert`
- `memory-retrieve`
- `memory-compact` (scheduled)
- `agent-run` (single entry point for user/scheduled triggers)
- `actions-execute` (approval-gated)
- `safety-escalate` (hotline/resources + incident logging)
- `coach-eval-runner` (CI/manual)

---

## 8) Product Features Program (What Users Actually Get)

## 8.1 "Coach That Remembers"
- Every session references prior context with clear provenance labels.
- User can inspect and edit long-term profile memories (control + trust).

## 8.2 "Daily Operating Loop"
- Morning intent, midday course-correct, evening reflection.
- Generated from calendar + commitments + recent emotional trend.

## 8.3 "Actionable Coaching"
- Agent drafts actions (calendar blocks, reminders, ritual setup).
- Sensitive actions always require confirmation.

## 8.4 "Coach Council"
- Keep council concept but enforce roles:
  - Analyst coach (patterns)
  - Challenger coach (friction/accountability)
  - Integrator coach (synthesis)
- Output is one unified action plan and one weekly experiment.

## 8.5 Voice Companion
- Unified coaching brain for voice and text.
- Voice sessions feed same memory and intervention analytics.

---

## 9) Safety Architecture (Non-Negotiable)

## 9.1 Risk tiers

Tier 0: Everyday coaching
- Normal responses

Tier 1: Sensitive life topics (stress, burnout, mild anxiety)
- Increased caution language
- no overconfident diagnosis

Tier 2: High-risk signals (self-harm cues, severe crisis language)
- immediate crisis-safe response template
- show emergency resources by locale
- log incident + reduce autonomy

Tier 3: Minors mode
- additional safeguards and age-appropriate content controls

## 9.2 Required controls
- Input moderation + output moderation
- HITL for high-stakes recommendations
- Confirm-before-act policy for purchases/posting/sensitive external actions
- Incident audit trail in `safety_incidents`

## 9.3 Anti-dependence product guardrails
- Session intensity monitor (frequency + duration)
- Nudges encouraging real-world social/physical actions
- "Pause and reset" flows after heavy usage bursts

---

## 10) Evaluation and Quality Gates

## 10.1 Offline eval suite

Categories:
- Coaching quality (clarity, empathy, actionability)
- Personalization correctness (uses true context; avoids hallucinated memories)
- Safety handling (policy stress tests)
- Tool behavior (approval policy compliance)

Release gate (minimum):
- Safety pass rate >= 99%
- Memory attribution precision >= 95%
- Coaching actionability score >= baseline + 10%
- Tool policy violations = 0

## 10.2 Online metrics
- D7 / D30 retention
- Weekly active coaching minutes (with healthy-use caps)
- Commitment completion rate
- Breakthrough rate (validated rubric)
- Crisis escalation false negative rate (must trend downward)

---

## 11) Rollout Plan (24 Weeks)

## Phase 0 (Weeks 1-2): Runtime + Observability Foundation
Deliverables:
- `agent_runs` / `agent_steps` tables
- basic orchestrator wrapper in `chat-stream`
- traces in logs/dashboard
- first eval dataset (50 canonical coaching cases)

## Phase 1 (Weeks 3-5): Memory Plane v2
Deliverables:
- `user_memories` + embedding ingestion
- `memory-retrieve` in chat path
- memory confidence + salience scoring
- user-visible memory inspector (read-only)

## Phase 2 (Weeks 6-8): Adaptive Coaching Engine
Deliverables:
- intervention tagging
- effectiveness scoring loop
- behavior commitment contract v1
- upgraded `patterns-detect` to write state snapshots

## Phase 3 (Weeks 9-11): Proactive Agent Loop
Deliverables:
- scheduled `agent-run` triggers
- policy-driven nudges
- morning/midday/evening loop
- notification fatigue controls

## Phase 4 (Weeks 12-14): Action Tools + Approvals
Deliverables:
- approvals center UI
- `approval_requests` + `actions-execute`
- calendar/task drafting actions
- strict confirmation flows for sensitive tasks

## Phase 5 (Weeks 15-17): Council and Handoffs
Deliverables:
- role-based council runtime
- dynamic specialist handoff cards
- synthesis output contract

## Phase 6 (Weeks 18-20): Voice Unification
Deliverables:
- shared text/voice orchestrator path
- voice transcript safety checks
- voice session summaries + memory integration

## Phase 7 (Weeks 21-22): Safety Hardening
Deliverables:
- crisis routing playbooks
- minors safeguards mode
- red-team eval suite expansion

## Phase 8 (Weeks 23-24): Scale + Launch Readiness
Deliverables:
- SLOs, rate limits, fallback policies
- feature flags and staged rollout
- launch dashboard + incident runbooks

---

## 12) Concrete File-by-File Implementation Map

## Backend
- `supabase/functions/chat-stream/index.ts`: route through orchestrator, add trace IDs.
- `supabase/functions/_shared/context-builder.ts`: inject memory/state/policy blocks.
- `supabase/functions/patterns-detect/index.ts`: rewrite for hybrid analytics + snapshot writes.
- `supabase/functions/nudges-generate/index.ts`: replace static templates with policy-driven planner.
- `supabase/functions/voice-transcribe/index.ts`: add safety pass and trace writes.
- `supabase/functions/_shared/`: add orchestration/memory/safety/eval modules.

## Mobile app
- New screens:
  - `app/coach-inbox/index.tsx` (proactive actions)
  - `app/approvals/index.tsx` (approve/reject actions)
  - `app/memory/index.tsx` (inspect/edit memory)
- Update chat and voice UIs to show:
  - memory attribution chips
  - risk-safe messaging banners when needed

## Data
- New additive migration files for runtime/memory/safety/evals tables.
- Regenerate `types/database.ts` immediately after migrations.

---

## 13) Cost and Latency Guardrails

- Use tiered model routing:
  - fast model for routine nudges
  - stronger reasoning model for complex sessions and council synthesis
- Enforce token budgets per run.
- Use compaction when conversation depth grows.
- Background asynchronous post-processing for non-blocking tasks.

Targets:
- P50 turn latency < 2.5s (text)
- P95 turn latency < 6.0s (text)
- voice partial response < 800ms after turn end

---

## 14) What Changes From the Old Plan (Diff Summary)

Keep from old plan:
- RAG memory goal
- Behavioral science + commitments
- Ambient signals (calendar/health)
- Council sessions
- Voice-first future

Change in v2:
- Add runtime orchestration before adding many features
- Make evals and trace grading a release gate, not a later add-on
- Add safety/risk/approval framework before autonomous actions
- Add anti-dependence and crisis policies explicitly
- Extend timeline to 24 weeks for safe production delivery

---

## 15) Immediate Next Implementation Steps (Week 1)

1. Create migration `20260215_agent_runtime_foundation.sql`:
- `agent_runs`, `agent_steps`, `safety_incidents`, `approval_requests`

2. Add `_shared/agent-orchestrator.ts` skeleton:
- typed run contract
- step runner utilities
- trace writer

3. Modify `chat-stream/index.ts`:
- call orchestrator for single path
- preserve existing billing semantics

4. Add first eval fixture set (`docs/evals/coach-core-v1.jsonl`):
- 50 cases (10 safety, 10 personalization, 10 actionability, 10 tool-policy, 10 emotional-support)

5. Add basic dashboard query panel:
- run success/failure
- mean latency
- safety incident counts

---

## 16) Research References (Jan-Feb 2026 prioritized)

### Agent platforms and runtime
- OpenAI API changelog (Jan-Feb 2026): https://developers.openai.com/api/docs/changelog
- OpenAI Agents SDK guide: https://developers.openai.com/api/docs/guides/agents-sdk
- OpenAI voice agents guide: https://developers.openai.com/api/docs/guides/voice-agents
- OpenAI connectors/MCP guide: https://developers.openai.com/api/docs/guides/tools-connectors-mcp
- OpenAI computer use guide: https://developers.openai.com/api/docs/guides/tools-computer-use
- OpenAI agent evals + trace grading:
  - https://developers.openai.com/api/docs/guides/agent-evals
  - https://developers.openai.com/api/docs/guides/trace-grading
- OpenAI safety guidance:
  - https://developers.openai.com/api/docs/guides/safety-best-practices
  - https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance

### Cross-provider and MCP
- Anthropic tool use implementation: https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use
- Anthropic release notes (Feb 2026 updates): https://platform.claude.com/docs/en/release-notes/overview
- MCP overview/spec intro: https://modelcontextprotocol.io/docs/getting-started/intro

### Personalization and agentic interaction trends (Google Jan 2026)
- Personal Intelligence (Gemini): https://blog.google/innovation-and-ai/products/gemini-app/personal-intelligence/
- Personal Intelligence in Search AI Mode: https://blog.google/products-and-platforms/products/search/personal-intelligence-ai-mode-search/
- Agentic Vision in Gemini 3 Flash: https://blog.google/innovation-and-ai/technology/developers-tools/agentic-vision-gemini-3-flash/
- Gemini in Chrome auto browse + confirmation controls: https://blog.google/products-and-platforms/products/chrome/gemini-3-auto-browse/

### Evidence for mental health-style chatbot outcomes and risks
- Dartmouth trial summary (NEJM AI trial context): https://home.dartmouth.edu/news/2025/03/first-therapy-chatbot-trial-yields-mental-health-benefits
- Longitudinal RCT psychosocial effects: https://arxiv.org/abs/2503.17473
- CBT chatbot RCT (JMIR): https://mhealth.jmir.org/2025/1/e63806

### Regulatory timeline context
- EU AI Act policy timeline (official): https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai

