---
name: supabase-patterns
description: Current Supabase patterns for schema design, RLS, Edge Functions, auth verification, and client integration. Use when implementing backend logic or secure data access in Coachgenie.
---

# Supabase Patterns

Last verified: 2026-02-06

## Data Model and SQL Conventions

- Use snake_case table/column names.
- Include `created_at`/`updated_at` on mutable business tables.
- Add indexes for frequent filters and joins.
- Keep migration files idempotent and explicit.

## RLS First

- Enable RLS on all user-data tables.
- Write least-privilege policies.
- Scope by `auth.uid()` where user ownership applies.

```sql
alter table session_messages enable row level security;

create policy "Users can read own session messages"
  on session_messages for select
  using (
    exists (
      select 1 from coaching_sessions cs
      where cs.id = session_messages.session_id
      and cs.user_id = auth.uid()
    )
  );
```

## Edge Functions (Deno)

### Security baseline
- Validate CORS and method early.
- Require auth for protected endpoints.
- Use anon client with forwarded `Authorization` for user-scoped access.
- Use service role only for trusted server-side operations.

### Function structure
1. Handle OPTIONS/preflight.
2. Parse and validate input.
3. Verify user identity.
4. Execute business logic.
5. Return normalized JSON or SSE response.

## Auth Verification in Functions

- For user-authenticated endpoints, verify bearer token using Supabase auth APIs in-function.
- If manually verifying JWTs, prefer Supabase JWT signing keys and current JOSE guidance.

## Secrets and Environment

- Keep secrets in Supabase project secrets, not client env.
- Typical server secrets:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (server only)
  - `OPENROUTER_API_KEY` (server only)

## Streaming/SSE from Edge Functions

- Set `Content-Type: text/event-stream`.
- Set `Cache-Control: no-cache` and `Connection: keep-alive`.
- Emit explicit terminal event (`done`) and close stream.

## Client Integration (Expo)

- Use one shared Supabase client with AsyncStorage session persistence.
- Keep `EXPO_PUBLIC_*` keys non-secret.
- Route AI/backend operations through Edge Functions (`/functions/v1/*`).

## Operational Best Practices

- Run migrations in CI before app deploy.
- Keep environment/project refs consistent across app and Supabase CLI.
- Monitor Edge Function logs for auth errors, latency spikes, and provider failures.

## Sources

- Supabase docs home: https://supabase.com/docs
- Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Edge Functions overview: https://supabase.com/docs/guides/functions
- Auth in Edge Functions: https://supabase.com/docs/guides/functions/auth
- JWT verification guide: https://supabase.com/docs/guides/auth/jwts
