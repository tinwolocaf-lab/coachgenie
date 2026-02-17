# Security Best Practices Report

## Executive Summary
I reviewed the React Native app and Supabase Edge Functions for high-impact security issues. Two backend findings require immediate attention: one unauthenticated privileged runner and one ownership bypass in approval flows. I also found OAuth flow hardening gaps and token-handling weaknesses on the client.

## Critical Findings

### SEC-001: Unauthenticated privileged eval runner endpoint
- Severity: Critical
- Location:
  - `supabase/functions/coach-eval-runner/index.ts:26`
  - `supabase/functions/coach-eval-runner/index.ts:43`
- Evidence:
  - The comment states "Auth: requires service-role key" but no service-role validation is implemented.
  - The handler immediately creates a service client and executes privileged DB writes/LLM calls.
- Impact:
  - Any caller able to invoke this function can trigger expensive eval runs and write evaluation data, causing cost abuse and integrity issues.
- Recommended fix:
  - Add explicit service-role auth (same pattern as `memory-compact`) before any work.
  - Reject requests without exact `Bearer <SUPABASE_SERVICE_ROLE_KEY>`.
  - Optionally add an additional internal secret header and/or IP allowlist for CI runners.

## High Findings

### SEC-002: Approval request ownership bypass (IDOR risk)
- Severity: High
- Location:
  - `supabase/functions/actions-execute/index.ts:67`
  - `supabase/functions/actions-execute/index.ts:70`
  - `supabase/functions/actions-execute/index.ts:73`
  - `supabase/functions/actions-execute/index.ts:153`
  - `supabase/functions/_shared/tool-policy.ts:116`
  - `supabase/functions/_shared/tool-policy.ts:145`
- Evidence:
  - `approve` / `reject` / `status` flows pass only `approval_id` and do not pass `userId`.
  - Shared helper queries/updates `approval_requests` by `id` only while using `createServiceClient` (bypasses RLS).
- Impact:
  - If an approval ID is exposed, another authenticated user could query/resolve/execute someone else’s approval workflow.
- Recommended fix:
  - Pass `auth.userId` to `handleResolve`, `handleStatus`, `checkApproval`, and `resolveApproval`.
  - Add `.eq('user_id', userId)` to all approval queries/updates.
  - Prefer `userClient` where possible for user-scoped reads.

## Medium Findings

### SEC-003: OAuth callback/state validation gap
- Severity: Medium
- Location:
  - `app/integrations/callback.tsx:13`
  - `app/integrations/callback.tsx:42`
  - `supabase/functions/integrations-exchange-token/index.ts:57`
  - `supabase/functions/integrations-exchange-token/index.ts:85`
- Evidence:
  - Callback screen consumes `code` and `provider` from URL params and exchanges tokens directly.
  - No state/nonce validation is performed in callback handling.
  - Backend accepts caller-supplied `redirect_uri` without allowlist validation.
- Impact:
  - Deep-link/account-linking CSRF becomes possible (attacker-controlled integration could be linked to victim account if victim opens crafted callback link while authenticated).
- Recommended fix:
  - Persist per-flow `state` (and provider) in secure local storage and verify before exchange.
  - Enforce `redirect_uri` allowlist per provider in the edge function.
  - Keep OAuth exchange only in the validated `AuthSession` flow path.

### SEC-004: OAuth tokens are overexposed to the mobile client runtime
- Severity: Medium
- Location:
  - `lib/integrations/api.ts:30`
  - `types/database.ts:1716`
  - `types/database.ts:1723`
- Evidence:
  - `listIntegrations()` uses `.select('*')` on `user_integrations`.
  - Table includes `access_token` and `refresh_token` columns.
- Impact:
  - Third-party OAuth tokens are fetched into JS runtime unnecessarily, increasing leak surface (debug logs, crash reports, compromised device/runtime).
- Recommended fix:
  - Replace wildcard select with explicit non-secret column list.
  - Consider moving refresh/access tokens to server-only access patterns.

### SEC-005: Supabase session persisted in unencrypted AsyncStorage
- Severity: Medium
- Location:
  - `lib/supabase.ts:35`
- Evidence:
  - Supabase auth storage is configured with `AsyncStorage`.
- Impact:
  - On compromised/rooted devices, bearer tokens are easier to extract than with secure enclave/keystore-backed storage.
- Recommended fix:
  - Migrate to SecureStore-backed auth storage adapter.
  - Force token rotation/sign-out after migration.

## Low Findings

### SEC-006: Non-TLS Supabase URL allowed by client validation
- Severity: Low
- Location:
  - `lib/supabase.ts:15`
- Evidence:
  - URL validator accepts both `http:` and `https:`.
- Impact:
  - Production misconfiguration could allow plaintext transport and token interception.
- Recommended fix:
  - Enforce `https:` outside development.

## Dependency Observation
- `npm audit --omit=dev --json` reports two high vulnerabilities in transitive production dependencies (`tar`, `@isaacs/brace-expansion`) with fixes available.

## Suggested Fix Order
1. SEC-001
2. SEC-002
3. SEC-003
4. SEC-004
5. SEC-005
6. SEC-006
