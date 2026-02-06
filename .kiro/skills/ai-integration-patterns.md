---
name: ai-integration-patterns
description: Current patterns for LLM integration with OpenRouter, streaming SSE, structured outputs, and resilient conversational features in Coachgenie. Use when implementing or debugging AI-powered chat/coaching features.
---

# AI Integration Patterns

Last verified: 2026-02-06

## Architecture Baseline

- Keep API keys server-side only (Edge Functions).
- Client calls your backend/function endpoints, never provider APIs directly.
- Stream tokens to client for better perceived latency.

## OpenRouter Integration

### Canonical endpoint
```text
POST https://openrouter.ai/api/v1/chat/completions
```

### Headers
- `Authorization: Bearer <OPENROUTER_API_KEY>`
- `Content-Type: application/json`
- Optional ranking/analytics headers:
  - `HTTP-Referer`
  - `X-Title`

### Model discovery
Before hard-coding model ids, check:
```text
GET https://openrouter.ai/api/v1/models
```

Use non-preview IDs for production by default.

## Coachgenie Defaults (Cost-optimized)

- `OPENROUTER_CHAT_MODEL=google/gemini-2.5-flash-lite`
- `OPENROUTER_JSON_MODEL=google/gemini-2.5-flash-lite`
- `OPENROUTER_AUDIO_MODEL=google/gemini-2.5-flash-lite`

Upgrade per feature only when quality requirements justify cost/latency increase.

## Streaming Pattern (SSE)

### Server side
- Call OpenRouter with `stream: true`.
- Parse incoming SSE chunks safely.
- Re-emit as your own stable event protocol (`token`, `done`, `error`).

### Client side
- Parse events incrementally.
- Keep a buffer for split chunks.
- Handle partial JSON and `[DONE]` markers.

## Structured Outputs (Best Practice)

For machine-parseable outputs, use strict JSON schema mode:

- `response_format.type = "json_schema"`
- `response_format.json_schema.strict = true`
- Schema should disallow extras where needed (`additionalProperties: false`).

Reject and retry on malformed payloads instead of silently accepting partial structure.

## Prompting Patterns for Coaching

- Keep system prompt concise and behaviorally explicit.
- Add short user context block (goals, constraints, tone prefs).
- Pass only relevant history window, not full transcript by default.
- Separate “instruction” from “state context” messages.

## Cost and Reliability Controls

- Enforce message window size and token budgets.
- Add retry with exponential backoff for transient provider failures.
- Define fallback model chain for critical paths.
- Instrument latency, token usage, and failure rate per endpoint.

## Error Handling

- Treat provider 4xx/5xx separately from parsing/stream errors.
- Return user-safe fallback messages from backend.
- Avoid surfacing raw provider errors directly to UI.

## Security Checklist

- `OPENROUTER_API_KEY` only in server environment.
- Do not log full prompts/responses containing sensitive user context.
- Scrub PII from debug logs and telemetry.

## Sources

- OpenRouter API overview: https://openrouter.ai/docs/api-reference/overview
- OpenRouter models API: https://openrouter.ai/api/v1/models
- OpenRouter structured outputs: https://openrouter.ai/docs/features/structured-outputs
- Gemini model docs: https://ai.google.dev/gemini-api/docs/models/gemini
