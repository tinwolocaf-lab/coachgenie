# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npx expo start          # Start dev server
npx expo start --ios    # Run on iOS simulator
npx expo start --android # Run on Android emulator
npm run lint            # Run linter
```

No test suite is configured.

## Architecture

**Expo SDK 54 + React Native 0.81.5** app using **Expo Router 6** (file-based routing) with new architecture enabled. TypeScript with strict mode; path alias `@/*` maps to project root.

### Backend

- **Supabase** for auth, database, and edge functions
- Edge functions in `supabase/functions/` (chat-stream, artifacts-generate, plans-generate, sanctuary-_, rituals-_, archive-\*, voice-transcribe)
- API calls go through `lib/apiClient.ts` which builds the functions URL from `EXPO_PUBLIC_SUPABASE_URL`
- Chat uses SSE streaming with a custom parser
- AI model access via OpenRouter (configured in env vars)

### Auth

- Native Supabase auth via `lib/auth.tsx` (AuthProvider + useAuth hook) — no third-party auth wrapper
- Conditional imports via `hooks/useConditionalAuth.ts` — app can run without Supabase configured (guest mode)
- Deep link scheme: `coachgenie://` with OAuth callback at `coachgenie://auth/callback`
- OAuth flows use `expo-web-browser` + Supabase `signInWithOAuth` (Google, Apple)
- Sessions stored in AsyncStorage with auto-refresh via `onAuthStateChange`

### State Management

- **No Redux/Zustand** — uses AsyncStorage CRUD utilities in `store/app.ts` and `store/onboarding.ts`
- Supabase for remote persistence and multi-device sync
- `contexts/ThemeContext.tsx` for theme/atmosphere state with animated transitions

### Navigation

- `app/_layout.tsx`: Root layout (GestureHandler, SafeArea, Theme, Auth providers)
- `app/index.tsx`: Entry router — directs to auth, onboarding, or tabs based on state
- `app/(auth)/`: Login/signup flow
- `app/(tabs)/`: Bottom tabs — Home, Gallery, Plan, Vault
- Modal routes: chat, coach detail, sanctuary, rituals, archive, account

### Design System

- `constants/theme.ts`: Premium editorial design system with 5 switchable "atmospheres" (Original, Midnight Gallery, Botanist, Architect, Desert Solstice)
- Premium themes gated behind "Sovereign Member" status
- Glass morphism effects via expo-blur, gold accents, serif headings
- React Native Reanimated for animations throughout

### Key Patterns

- **Conditional Supabase**: Auth/data modules check `isSupabaseConfigured` before importing, enabling offline dev
- **SSE streaming**: Custom parser in apiClient for chat and transcription with chunk callbacks
- **AI coaching context**: Context Vault (values, goals, constraints) feeds into AI system prompts
- **Installable coaches**: AI coaches with system prompts, browsable in a gallery, multi-coach sessions supported

### Environment Variables

Uses `EXPO_PUBLIC_*` prefix. Required: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`. See `.env` for full list including OpenRouter and RevenueCat keys.

## Key Directories

- `app/` — Expo Router screens
- `components/ui/` — Reusable UI primitives
- `lib/` — Supabase client, API client, AI logic
- `store/` — AsyncStorage state management
- `contexts/` — React Context providers
- `constants/` — Theme and design tokens
- `types/` — TypeScript types (including generated `database.ts`)
- `supabase/functions/` — Edge functions
- `supabase/migrations/` — Database migrations

## Coach Marketplace V1 (Current)

### Canonical Plan/Tier Naming

- Canonical tiers are `free`, `sovereign`, `oracle`.
- `Tuberine` maps to `sovereign` (alias only; storage and gating remain `sovereign`).
- Custom-coach creation/edit/publish is allowed only for `sovereign` and `oracle`.
- Marketplace install/use is allowed for all tiers, including `free`.

### Data + Runtime Rules

- Canonical coach domain layer: `lib/coaches.ts` for marketplace, installed snapshots, and built-in fallback.
- Built-ins in `data/coaches.ts` are seed/fallback, not the canonical mutable source.
- Installed marketplace coaches are snapshot-based; creator edits do not auto-update prior installs.
- If a coach is admin-removed from marketplace, new installs are blocked, but existing installed snapshots remain usable.

### Database + Edge Function Requirements

- Migration-first strategy is additive/non-destructive (no destructive normalization in V1).
- Required migration artifacts include additive `coaches` columns, snapshot fields on `installed_coaches`, `coach_snapshot` in `coaching_sessions`, and `coach_deletion_requests`.
- Storage bucket `coach-images` must be public-read with owner-scoped write/delete policies (`{auth.uid()}/...` path).
- Edge functions must resolve coach config in this order:
  1. `coaching_sessions.coach_snapshot`
  2. `coaches` row
  3. generic fallback prompt/method
- Functions must not hard-fail on legacy rows missing newer prompt fields.

### Migration Order (Do Not Reorder)

1. Apply SQL migration (`supabase db push` on linked project).
2. Regenerate `types/database.ts`.
3. Update client/domain logic and routing.
4. Update paywall/gates and UX copy.
5. Run lint/build checks.
6. Run Android smoke validation.

- Only make changes that are directly requested. Keep solutions simple and focused.
- ALWAYS read and understand relevant files before proposing edits. Do not speculate about code you have not inspected.
- after everytime user request something, first learn all of the files related to that, and then using skills in the skills do the changes!
- always if i ask send you a prompt, make sure to add that prompt in sequence to the prompts.md file so that we can keep track of the prompts. also, if the prompt is repeated, or about github, expo, npm related very short tasks, dont include them in that file.
- when you deploy the android build to the production build, always make sure to upgrade the versions of the app not to have uploading issues to the google play with old versions.
