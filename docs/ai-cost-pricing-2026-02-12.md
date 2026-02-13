# AI Cost and Pricing Model (2026-02-12)

## 1) Snapshot method and sources

This document is recalibrated for the credit-economy rollout and uses live source data captured on **2026-02-12**.

- OpenRouter model pricing snapshot:
  - `GET https://openrouter.ai/api/v1/models`
  - captured at `2026-02-12 17:23:37 UTC`
- Gemini official pricing/capabilities:
  - https://ai.google.dev/gemini-api/docs/pricing
  - https://ai.google.dev/gemini-api/docs/speech-generation
  - https://ai.google.dev/gemini-api/docs/ephemeral-tokens
- OpenRouter docs (pricing object + usage accounting):
  - https://openrouter.ai/docs/overview/models
  - https://openrouter.ai/docs/use-cases/usage-accounting

Notes:
- OpenRouter values are returned in **USD per token**. This doc converts them to **USD per 1M tokens**.
- Gemini voice pricing is taken from Google’s official pricing page sections for:
  - `gemini-2.5-flash-native-audio-preview-12-2025` (Live)
  - `gemini-2.5-flash-preview-tts`
  - `gemini-2.5-pro-preview-tts`

---

## 2) Credit economy constants (implemented)

- `USD_PER_CREDIT = 0.033`
- `1 credit = 1000 mcredits`
- Plan packs (monthly, no rollover):
  - Free: `50`
  - Sovereign: `300`
  - Oracle: `1000`

### Conversion formulas

- `credits = usd_cost / 0.033`
- `mcredits = ceil((usd_cost / 0.033) * 1000)`
- `credits_per_1M_units = usd_per_1M_units / 0.033`

### Dollar value of pack ceilings

- Free 50 credits: `$1.65`
- Sovereign 300 credits: `$9.90`
- Oracle 1000 credits: `$33.00`

---

## 3) Chat model pricing used for tier allowlists

## OpenRouter allowlist snapshot (USD per 1M tokens, then credits per 1M)

| Model | Input $/1M | Output $/1M | Input credits/1M | Output credits/1M |
|---|---:|---:|---:|---:|
| google/gemini-2.5-flash-lite | 0.10 | 0.40 | 3.03 | 12.12 |
| google/gemini-2.5-flash | 0.30 | 2.50 | 9.09 | 75.76 |
| google/gemini-2.5-pro | 1.25 | 10.00 | 37.88 | 303.03 |
| google/gemini-3-flash-preview | 0.50 | 3.00 | 15.15 | 90.91 |
| google/gemini-3-pro-preview | 2.00 | 12.00 | 60.61 | 363.64 |
| openai/gpt-4o-mini | 0.15 | 0.60 | 4.55 | 18.18 |
| openai/gpt-4.1-mini | 0.40 | 1.60 | 12.12 | 48.48 |
| openai/gpt-4.1 | 2.00 | 8.00 | 60.61 | 242.42 |
| openai/gpt-5-mini | 0.25 | 2.00 | 7.58 | 60.61 |
| openai/gpt-5 | 1.25 | 10.00 | 37.88 | 303.03 |
| openai/gpt-5.2 | 1.75 | 14.00 | 53.03 | 424.24 |
| anthropic/claude-3.5-haiku | 0.80 | 4.00 | 24.24 | 121.21 |
| anthropic/claude-sonnet-4.5 | 3.00 | 15.00 | 90.91 | 454.55 |
| anthropic/claude-opus-4.6 | 5.00 | 25.00 | 151.52 | 757.58 |
| meta-llama/llama-4-scout | 0.08 | 0.30 | 2.42 | 9.09 |
| meta-llama/llama-4-maverick | 0.15 | 0.60 | 4.55 | 18.18 |
| x-ai/grok-4-fast | 0.20 | 0.50 | 6.06 | 15.15 |
| x-ai/grok-4 | 3.00 | 15.00 | 90.91 | 454.55 |

---

## 4) Voice stack pricing (Gemini-only policy)

Voice policy implemented:
- STT: Gemini path (`voice-transcribe`)
- TTS: Gemini TTS (`voice-tts`)
- Realtime: Gemini Live with ephemeral tokens (`voice-session-config` + `voice-session-finalize`)

### Gemini Live (`gemini-2.5-flash-native-audio-preview-12-2025`)

From Google pricing page:
- Text input: `$0.50 / 1M` -> `15.15 credits / 1M`
- Text output: `$2.00 / 1M` -> `60.61 credits / 1M`
- Audio input: `$3.00 / 1M` -> `90.91 credits / 1M`
- Audio output: `$12.00 / 1M` -> `363.64 credits / 1M`

### Gemini TTS

`gemini-2.5-flash-preview-tts` (standard):
- Text input: `$0.50 / 1M` -> `15.15 credits / 1M`
- Audio output: `$10.00 / 1M` -> `303.03 credits / 1M`

`gemini-2.5-pro-preview-tts` (standard):
- Text input: `$1.00 / 1M` -> `30.30 credits / 1M`
- Audio output: `$20.00 / 1M` -> `606.06 credits / 1M`

### STT practical baseline (Gemini via current backend metering)

Using `gemini-2.5-flash` rate card assumptions for audio transcription:
- Audio input: `$1.00 / 1M` -> `30.30 credits / 1M`
- Text output: `$2.50 / 1M` -> `75.76 credits / 1M`

---

## 5) Credits-per-action examples (operator sanity)

Assumptions for quick comparability:
- 1 text turn: `2200` input + `350` output tokens
- 1 live minute: `2400` audio-in + `2400` audio-out + small text overhead
- 1 TTS clip: ~`750 chars` equivalent request
- 1 STT minute: `2400` audio tokens + `200` text output tokens

Estimated debit examples:

- Text turn (gemini-2.5-flash-lite): `~0.0109 credits`
- Text turn (openai/gpt-4o-mini): `~0.0164 credits`
- Text turn (google/gemini-2.5-flash): `~0.0465 credits`
- Text turn (openai/gpt-5-mini): `~0.0379 credits`
- Text turn (claude-sonnet-4.5): `~0.3591 credits`
- Text turn (claude-opus-4.6): `~0.5985 credits`
- Live voice minute (Gemini Native Audio): `~1.10 credits`
- STT minute baseline: `~0.0879 credits`
- TTS short clip baseline: `~0.4574 credits`

---

## 6) Plan COGS and margin under 50 / 300 / 1000

Because all AI endpoints debit by measured cost, **max AI COGS per user/month** is credit-pack bounded:

- Free: `<= $1.65`
- Sovereign: `<= $9.90`
- Oracle: `<= $33.00`

Current app pricing:
- Sovereign: `$19.99/mo`
- Oracle: `$49.99/mo`

### Margin bands by pack-consumption level

(Using both 70% net and 85% net store-revenue cases)

| Tier | Consumption | AI COGS | Margin @70% net | Margin @85% net |
|---|---:|---:|---:|---:|
| Sovereign ($19.99) | 35% of pack | $3.47 | 75.2% | 79.6% |
| Sovereign ($19.99) | 60% of pack | $5.94 | 57.6% | 65.0% |
| Sovereign ($19.99) | 100% of pack | $9.90 | 29.3% | 41.7% |
| Oracle ($49.99) | 35% of pack | $11.55 | 67.0% | 72.8% |
| Oracle ($49.99) | 60% of pack | $19.80 | 43.4% | 53.4% |
| Oracle ($49.99) | 100% of pack | $33.00 | 5.7% | 22.3% |

### Heavy-usage stress test (high-end reasoning)

- At `claude-opus-4.6` output pricing, `1M output tokens ~= 757.58 credits`.
- Oracle 1000 credits can fund roughly `1.32M` Opus output tokens before cap.
- This is exactly why strict server-side debit + allowlist + 402 handling is required.

Conclusion:
- The 50/300/1000 design is operationally viable with current prices, but Oracle is thin at worst-case full-burn under 70% net economics.
- Keep a close watch on Oracle full-pack consumption and premium-model mix.

---

## 7) Why `USD_PER_CREDIT = 0.033`

Rationale:
- Preserves user-friendly integer packs (`50 / 300 / 1000`).
- Keeps free pack useful while bounded (`$1.65` equivalent).
- Keeps Sovereign comfortably positive even at full burn.
- Keeps Oracle positive but intentionally constrained by curated model access + voice hold/finalize controls.

This is an **approximate $2 target** for free pack behavior (product intent), tuned downward for margin protection and adoption.

---

## 8) Operational guardrails (must keep)

Implemented guardrails:
- Server-side tier verification with cache and safe fallback to free.
- Server-side allowlist validation for requested chat models.
- Preflight balance checks and unified `402 INSUFFICIENT_CREDITS` responses.
- Voice live hold + finalize reconciliation with refunds for unused hold.
- Immutable credit ledger events for grant/debit/refund/hold/release.

Recommended monitoring KPIs:
1. `avg_ai_cogs_usd_per_paid_user` by tier.
2. `credits_burned / pack_credits` distribution by tier.
3. Premium-model share (% of spend on high-end models).
4. Live voice hold leakage (`hold - finalized debit`).
5. `402` rate (insufficient credits) by endpoint.
6. RevenueCat fallback-rate (`tier_source=fallback`) and stale-cache duration.
7. Net margin estimate after store fee, by tier and cohort.

---

## 9) Product copy alignment (credits-first)

UI/paywall/account copy should consistently describe:
- Monthly credit allocation by tier.
- Credits consumed based on model + modality cost.
- Voice stack fixed to Gemini models (not user-selectable).
- Chat model selection available only on paid tiers and constrained to curated allowlists.

