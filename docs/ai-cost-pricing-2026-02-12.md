# AI Cost and Pricing Model (2026-02-12)

## Models currently used in code

- Text chat (tier-routed in `chat-stream`):
  - Free: `google/gemini-2.5-flash-lite`
  - Sovereign: `openai/gpt-4o-mini`
  - Oracle: `anthropic/claude-sonnet-4.5`
- Voice transcription (`voice-transcribe`): OpenRouter audio input with `OPENROUTER_AUDIO_MODEL` fallback to `OPENROUTER_CHAT_MODEL`.
  - Current `.env` sets `OPENROUTER_CHAT_MODEL=gemini-2.5-flash-lite`, so transcription currently routes to `google/gemini-2.5-flash-lite` unless overridden.
- Realtime voice (`voice-session-config` + `lib/geminiLive.ts`): `gemini-2.5-flash-native-audio-preview` via Gemini API key.
- TTS (`voice-tts`): OpenAI `tts-1`.

## Live pricing references used

- OpenRouter models/prices API and pricing field docs:
  - https://openrouter.ai/api/v1/models
  - https://openrouter.ai/docs/overview/models
  - https://openrouter.ai/docs/use-cases/reasoning-tokens#pricing-object
- Gemini API pricing (Native Audio / Live):
  - https://ai.google.dev/gemini-api/docs/pricing
- OpenAI pricing (TTS):
  - https://platform.openai.com/docs/pricing

## Unit-cost assumptions

### OpenRouter (USD per token)

From live `/api/v1/models` snapshot:

- `google/gemini-2.5-flash-lite`
  - prompt: `0.0000001`
  - completion: `0.0000004`
  - audio: `0.0000003`
- `openai/gpt-4o-mini`
  - prompt: `0.00000015`
  - completion: `0.0000006`
- `anthropic/claude-sonnet-4.5`
  - prompt: `0.000003`
  - completion: `0.000015`

### Gemini Live (Native Audio)

From Gemini pricing page:

- audio input: `$3.00 / 1M` audio tokens
- audio output: `$12.00 / 1M` audio tokens
- text input: `$0.50 / 1M` tokens
- text output: `$2.00 / 1M` tokens

### OpenAI TTS

From OpenAI pricing page:

- `tts-1`: `$15.00 / 1M` characters

## Cost scenarios used for plan calibration

Assumptions for modeling:

- Average text turn:
  - input: `2200` tokens (system + context + recent history)
  - output: `300` tokens
- Transcription audio rate approximation: `2400` audio tokens/min + `200` output text tokens/min (OpenRouter audio-input + text-output billing).
- Live voice approximation: `2400` audio input tokens/min + `2400` audio output tokens/min + small text in/out.
- Add `$0.25/month` misc AI calls (plans, breakthroughs, synthesis, insight-title, etc.) for active users.

Estimated monthly COGS:

- Sovereign scenario (gpt-4o-mini text + gemini live + transcription)
  - Light: `$1.15`
  - Typical: `$4.03`
  - Heavy: `$10.03`
- Oracle scenario (claude-sonnet-4.5 text + gemini live + transcription)
  - Light: `$4.32`
  - Typical: `$13.57`
  - Heavy: `$29.09`

## Margin sanity check (store-fee adjusted)

Using conservative first-year app-store net (70% of gross):

- Sovereign @ `$19.99/mo`:
  - Net revenue: `$13.99`
  - Margin after AI COGS:
    - Light: `~91.8%`
    - Typical: `~71.2%`
    - Heavy: `~28.3%`
- Oracle @ `$49.99/mo`:
  - Net revenue: `$34.99`
  - Margin after AI COGS:
    - Light: `~87.7%`
    - Typical: `~61.2%`
    - Heavy: `~16.9%`

## Pricing update applied in app

To reduce loss risk while keeping voice/transcription and premium-model access:

- Sovereign: `19.99/mo` and `179.99/yr`
- Oracle: `49.99/mo` and `449.99/yr`

Feature-limit alignment applied:

- Free: `2 sessions/day`, `12 messages/session`, text-only (no live voice coaching).
- Sovereign: `8 sessions/day`, `40 messages/session`, voice notes + live voice.
- Oracle: `12 sessions/day`, `60 messages/session`, premium reasoning model and extended voice.

## Important operational note

Current profitability still depends on **enforcement** of fair-use behavior in runtime flows (especially voice duration and high-volume message loops). Plan copy and gate values now reflect safer economics, but runtime guardrails should continue to be tightened as usage data arrives.

Practical next hardening steps:

1. Set `OPENROUTER_AUDIO_MODEL=google/gemini-2.5-flash-lite` explicitly in all environments for predictable transcription pricing.
2. Add server-side monthly voice-minute quotas per tier.
3. Add per-user model-cost telemetry (token/audio usage by endpoint) and alert if AI COGS exceeds target gross-margin thresholds.
