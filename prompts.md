I want to make this application the smartest coach application ever, and I don't want it to be something like a simple application, just like chat application, it should be something different, like... So this application needs lots of things that should make it more of an agentic coach, and for those reasons, I want you to kind of explore the abilities of the AI agents in 2026 and in which areas we can improve these AI agent coaches. So I want you to explore those things in details, and after exploring those things in details online with the information in 2026 February, I want you to create a very detailed plan of, I would say, revolutionizing this application kind of with all of the details of the implementation, so that after that, we can implement those things.

Create two new shared modules for the Supabase Edge Functions in `supabase/functions/_shared/`: (1) `rate-limiter.ts` - a Deno-based rate limiting module with RateLimitResult type, DEFAULT_LIMITS constants, checkRateLimit/checkChatRateLimit/formatRateLimitError functions; (2) `fallback-policy.ts` - a model fallback chain and SLO configuration module with FallbackChain/SloConfig types, DEFAULT_FALLBACK_CHAIN and SLOS constants, getNextFallbackModel/shouldFallback/buildFallbackHeaders functions.

Create a feature flags system for CoachGenie: (1) SQL migration `20260215000005_feature_flags.sql` with a `feature_flags` table (name, enabled, rollout_percentage, allowed_tiers, allowed_user_ids, metadata), RLS policies, index, and default flag seeds for revolution features; (2) Shared Deno module `feature-flags.ts` with FeatureFlag/FlagCheckResult types, in-memory TTL cache, isFeatureEnabled/checkFeatureFlag/getAllFlags/clearFlagCache/hashUserForRollout functions for server-side feature gating.

as there is only gemini api available via openrouter, i want you to do the latest gemini api for all of the api usage purposes. and while doing so if you are not sure what to use exactly for some purposes, ask me for clarification

Fix runtime stability issues that can break real-device readiness: RevenueCat invalid API key/init behavior in Expo Go, no-op paywall presentation in preview mode, Supabase `breakthroughs` table-missing errors (`PGRST205`), Reanimated transform/layout animation warnings, VirtualizedList slowness warnings, and Clipboard deprecation from React Native core.

When I move the Vault page, the app is failing to load and crashing. Fix that issue, investigate and fix the Java errors shown on other pages, fix the ugly squarish UI inside the Evening Audit card, and debug/fix why rituals report "saved successfully" but do not appear in the rituals list.

Do deep research about how to add useful Android widgets with the latest data in 2026 February, taking into account the codebase. Create a list of things and plan that can be implemented to the app.

Implement Phase 1 (fix existing 3 widgets) and Phase 2 (build 6 new widgets) of the Android Widgets Plan: Ritual Checklist Widget (4×3), Today's Plan Widget (4×4), Weekly Progress Ring Widget (2×2), Quote of the Day Widget (4×2), Active Coach Card Widget (3×2), Credit Balance Widget (2×1). Register all widgets in app.json, task handler, storage, bridge, and index. Extend WidgetStorage with new types, create shared defaults, and add WidgetBridge update methods for each new widget.

Fix theme color contrast across all 9 atmospheres: replace hardcoded colors (#FFFFFF, #243D2E, rgba(0,0,0,...)) with palette tokens, migrate ShareCoachModal and ImportCoachCard from useColorScheme() to useThemeSafe(), fix gradients using textPrimary as gradient color, add textColor field to FeaturedRitual for accent-gradient-safe text, add surfaceBg prop to MarkdownText for theme-aware code/blockquote backgrounds, fix safety banners in chat, and update shimmer/border/overlay colors across 24 files in 4 priority tiers.

Highest-impact stability improvements I’d do next:

Stop showing debug/runtime warning banners in production.
Right now production can still surface non-fatal console issues as UI banners via GlobalErrorBoundary.tsx (line 49) and errorHandling.ts (line 192).
Keep this overlay for __DEV__, send prod issues to telemetry only.
Add request timeouts + cancellation to all network calls.
fetch calls in apiClient.ts (line 301) and other endpoints have no timeout/AbortController, so hangs can freeze UX.
Add a shared fetchWithTimeout + retry policy for safe/idempotent endpoints.
Validate/normalize AsyncStorage payloads before rendering.
Vault UI assumes full object shape at vault.tsx (line 272) and vault.tsx (line 303).
Storage reads currently raw-parse JSON in app.ts (line 156).
Add schema normalization (defaults) to prevent crashes from legacy/corrupt local data.
Add startup “schema readiness” checks for Supabase tables/functions.
Rituals and breakthroughs can silently degrade when tables are missing (PGRST205) in supabase-rituals.ts (line 48) and supabase-sanctuary.ts (line 379).
Add a boot health-check and show explicit “migration required” UI instead of silent empty states.
Remove swallowed async errors.
Multiple .catch(() => {}) paths hide failures (example index.tsx (line 131), _layout.tsx (line 213), plan.tsx (line 120)).
Replace with a logNonFatal() helper + user-safe fallback.
Make ritual creation transactional and explicit on partial failure.
createRitual inserts ritual then streak separately without checking second insert outcome in supabase-rituals.ts (line 200).
Move to one RPC transaction or handle rollback; show clear error if result is null (new-ritual.tsx (line 98)).
Harden timer lifecycle patterns to reduce race conditions.
Many setTimeout UI flows in sanctuary ([coachId].tsx (line 222), (line 257), (line 324)) and animation helpers (AnimatedContainer.tsx (line 158), (line 191)) can fire after navigation/unmount.
Track timeout IDs and clear on unmount.
Fix RevenueCat listener lifecycle.
Listener unsubscribe is currently a no-op in revenuecat.ts (line 149) while ThemeProvider subscribes in ThemeContext.tsx (line 733).
Verify SDK remove-listener API and implement real teardown to prevent duplicate handlers.
Add real release guardrails in scripts/CI.
package.json has no typecheck/tests (package.json (line 5)).
Also TS currently includes edge functions and fails on Deno URL imports (gemini.ts (line 1), config tsconfig.json).
Split app TS check from functions TS check and gate production builds on both.
Add crash/issue observability (Sentry or similar).
You currently rely on console + boundary; no external crash pipeline is present.
Add release-tagged crash reporting for Android prod so you can detect regressions before users report them.

fix these issues in this codebase one by one!!!

[$gemini-api-dev](/Users/ricky/.agents/skills/gemini-api-dev/SKILL.md) check if all of the Gemini APIs are used properly and fix where they are not.

[$gemini-openrouter-integration](/Users/ricky/.codex/skills/gemini-openrouter-integration/SKILL.md) check the openrouter configurations as well

[$premium-mobile-ui-system](/Users/ricky/.codex/skills/premium-mobile-ui-system/SKILL.md) if there are rooms for improvement, use your skills and improve the app!

[$security-best-practices](/Users/ricky/.codex/skills/security-best-practices/SKILL.md) check for security!
