# Coach Marketplace V1 (Sovereign/Oracle Creation, All-Tier Usage)

## Summary
Implement a Supabase-backed custom coach marketplace without breaking existing flows by using an additive schema migration, a unified coach data layer, and snapshot-based installs.
This plan is the exact checklist content to write into `/Users/ricky/dastur/exp/Coachgenie/plan.md` when execution mode is enabled.

## Decisions Locked
- `Tuberine` maps to existing `sovereign` tier.
- Custom coach creation/edit/publish allowed for `sovereign` and `oracle`.
- Marketplace install/use allowed for **all tiers including free**.
- Installed coaches use **snapshot behavior** (creator edits do not auto-update existing installs).
- If deletion is admin-approved, remove from marketplace/new installs, but keep existing installed snapshots usable.
- Admin review is Supabase-admin workflow (no in-app admin panel in v1).
- Schema strategy is additive compatibility (no destructive normalization).

## Public API / Interface / Type Changes
- Add a new coach domain module at `/Users/ricky/dastur/exp/Coachgenie/lib/coaches.ts` with exported APIs:
  - `listMarketplaceCoaches()`
  - `listInstalledCoaches()`
  - `getCoachByIdResolved(coachId)`
  - `createCoachDraft(input)`
  - `updateCoach(coachId, patch)`
  - `publishCoach(coachId)`
  - `unpublishCoach(coachId)`
  - `installCoachFromMarketplace(coachId)`
  - `uninstallCoach(coachId)`
  - `deleteCoachOrRequestReview(coachId, reason?)`
  - `uploadCoachImage(uri)`
- Update `/Users/ricky/dastur/exp/Coachgenie/lib/supabase-sanctuary.ts`:
  - Change `createSession(userId, coachId, title?)` to `createSession(userId, coachId, title?, coachSnapshot?)`.
- Extend `/Users/ricky/dastur/exp/Coachgenie/types/index.ts`:
  - Add `CoachSource`, `CoachMarketplaceStatus`, `CoachInstallSnapshot`, `CoachDeletionRequest`.
- Regenerate `/Users/ricky/dastur/exp/Coachgenie/types/database.ts` after SQL migration.
- Keep `canAccessCoach(tier, coachId)` backward-compatible, add marketplace-aware access helper in `/Users/ricky/dastur/exp/Coachgenie/lib/feature-gates.ts`.

## Implementation Checklist

### 1) Database + Storage Foundation
- [x] Create migration `/Users/ricky/dastur/exp/Coachgenie/supabase/migrations/<timestamp>_coach_marketplace_v1.sql`.
- [x] Add additive columns to `public.coaches` required by app/runtime:
  - `tagline`, `method`, `system_prompt`, `icon_name`, `color`, `image_path`, `image_url`, `version`, `is_public`, `marketplace_status`, `published_at`, `updated_at`.
- [x] Backfill new coach columns for existing rows (safe defaults, no row drops).
- [x] Extend `public.installed_coaches` with snapshot fields:
  - `snapshot_name`, `snapshot_tagline`, `snapshot_description`, `snapshot_method`, `snapshot_system_prompt`, `snapshot_icon_name`, `snapshot_color`, `snapshot_image_url`, `snapshot_version`, `uninstalled_at`.
- [x] Add `coach_snapshot JSONB` to `public.coaching_sessions`.
- [x] Create `public.coach_deletion_requests` with `pending/approved/rejected` status and admin reason fields.
- [x] Add indexes for marketplace listing, owner queries, install lookups, deletion requests.
- [x] Add/adjust RLS:
  - `coaches` insert/update only by owner with tier in `('sovereign','oracle')` via billing table check.
  - `coaches` delete only by owner when no active installs by other users.
  - public read only for published/non-removed marketplace coaches.
  - owners can read/manage their own drafts/unlisted entries.
  - deletion request insert/select by requester; update by service role/admin only.
- [x] Create storage bucket `coach-images` as public.
- [x] Add storage object policies for `coach-images`:
  - public read.
  - owner-only write/delete under path prefix `{auth.uid()}/...`.

### 2) Edge Function Reliability + Snapshot Usage
- [x] Update `/Users/ricky/dastur/exp/Coachgenie/supabase/functions/chat-stream/index.ts`:
  - prefer `coaching_sessions.coach_snapshot` prompt/method.
  - fallback to `coaches` row if snapshot missing.
  - fallback to generic prompt if coach row lookup fails.
- [x] Update `/Users/ricky/dastur/exp/Coachgenie/supabase/functions/voice-session-config/index.ts` with same snapshot-first logic.
- [x] Ensure neither function hard-fails due missing coach prompt columns on legacy rows.
- [x] Keep existing `/Users/ricky/dastur/exp/Coachgenie/supabase/functions/coach-share/index.ts` functional (legacy sharing) but route new marketplace UX through new domain APIs.

### 3) Coach Domain Layer + Sync
- [x] Implement `/Users/ricky/dastur/exp/Coachgenie/lib/coaches.ts` as canonical coach source (built-in + marketplace + installed snapshots).
- [x] Keep `/Users/ricky/dastur/exp/Coachgenie/data/coaches.ts` as built-in seed/fallback only.
- [x] Implement local cache sync in `/Users/ricky/dastur/exp/Coachgenie/store/app.ts`:
  - migrate old local installs to Supabase on first authenticated launch.
  - mirror installed snapshot metadata locally for fast rendering.
- [x] Add image upload helper using Expo picker + Supabase Storage upload flow.

### 4) UI/Navigation Features
- [x] Extend `/Users/ricky/dastur/exp/Coachgenie/app/account.tsx` with new `Coach Studio` section:
  - create coach
  - manage my coaches
  - deletion requests status
  - free-tier create action locked with paywall CTA
- [x] Expand `/Users/ricky/dastur/exp/Coachgenie/app/coach/create.tsx`:
  - support create + edit
  - image selection/upload
  - full prompt/method/metadata editing
  - publish/unpublish controls
  - sovereign/oracle gate enforcement
- [x] Add `My Coaches` screen at `/Users/ricky/dastur/exp/Coachgenie/app/coach/manage.tsx`.
- [x] Update `/Users/ricky/dastur/exp/Coachgenie/app/(tabs)/coaches.tsx` to include marketplace feed from Supabase.
- [x] Update `/Users/ricky/dastur/exp/Coachgenie/app/coach/[id].tsx` for dynamic coach details and owner actions.
- [x] Add deletion-request modal with required reason when direct delete is blocked.
- [x] Register any new routes in `/Users/ricky/dastur/exp/Coachgenie/app/_layout.tsx`.

### 5) Consistency Sweep (No Broken Paths)
- [x] Replace direct static `getCoachById` usage in runtime screens with resolved coach service where needed:
  - `/Users/ricky/dastur/exp/Coachgenie/app/chat/[coachId].tsx`
  - `/Users/ricky/dastur/exp/Coachgenie/app/sanctuary/[coachId].tsx`
  - `/Users/ricky/dastur/exp/Coachgenie/app/(tabs)/index.tsx`
  - `/Users/ricky/dastur/exp/Coachgenie/app/(tabs)/plan.tsx`
  - archive coach label/icon lookups in `/Users/ricky/dastur/exp/Coachgenie/app/archive/...`
  - `/Users/ricky/dastur/exp/Coachgenie/app/insights-dashboard.tsx`
- [x] Ensure onboarding still works with built-in coaches when marketplace/network is unavailable.
- [x] Keep guest mode behavior intact when Supabase is not configured.

### 6) Tier/Paywall Copy + Gate Updates
- [x] Update `/Users/ricky/dastur/exp/Coachgenie/lib/feature-gates.ts`:
  - `customCoaches` enabled for `sovereign` and `oracle`.
  - marketplace coach access allowed for free users (while preserving existing premium lock behavior for curated premium built-ins).
- [x] Update plan copy in `/Users/ricky/dastur/exp/Coachgenie/app/paywall.tsx` and `/Users/ricky/dastur/exp/Coachgenie/app/account.tsx` for new coach feature matrix.
- [x] Keep legacy sharing import path compatible with current `coaches` schema in `lib/coachSharing.ts`.

### 7) Requested Documentation Updates
- [x] Write this checklist into `/Users/ricky/dastur/exp/Coachgenie/plan.md`.
- [x] Update `/Users/ricky/dastur/exp/Coachgenie/CLAUDE.md` with new coach marketplace architecture and tier rules.
- [x] Update `/Users/ricky/dastur/exp/Coachgenie/Agents.md` with the same implementation constraints and migration order.
- [x] Add note on canonical plan naming (`free`, `sovereign`, `oracle`) and custom-coach eligibility (`sovereign`, `oracle`).

### 8) Migration + Verification Execution
- [x] Run SQL migration via CLI (`supabase db push` or linked equivalent).
- [x] Regenerate DB types into `/Users/ricky/dastur/exp/Coachgenie/types/database.ts`.
- [x] Run lint/build checks used in this repo.
- [ ] Perform end-to-end smoke on Android build profile after migration.

## Test Cases and Scenarios
1. Free user cannot create/edit/publish custom coach; paywall path shown.
2. Sovereign user creates coach with uploaded image, edits prompt, publishes successfully.
3. Published coach appears in marketplace list for another account.
4. Free user can install/use published marketplace coach (per locked decision).
5. Installer uses snapshot v1; creator updates coach to v2; installer still sees v1 until reinstall.
6. Owner deletes coach with zero external installs: hard delete succeeds.
7. Owner deletes coach with active external installs: delete blocked; deletion request required and saved.
8. Admin approves deletion request: coach removed from marketplace/new installs; existing installed snapshots remain usable.
9. Admin rejects deletion request with reason: owner sees rejection reason/status.
10. Chat and voice functions succeed using `coach_snapshot` even if coach row prompt fields are missing/legacy.
11. Legacy built-in coaches and onboarding flow still work offline/guest.
12. No regressions in existing voice/paywall/model selection flows.

## Assumptions and Defaults
- Billing truth for DB enforcement uses existing Supabase billing tables/cache.
- No v1 in-app admin console; moderation handled in Supabase admin tooling.
- Existing share-link flow remains available but is not the primary marketplace flow.
- Existing installed snapshot survives approved deletion to avoid breaking active users.
- File naming remains as existing root docs (`CLAUDE.md`, `Agents.md`).

## External Research (Current Docs)
- Supabase storage access control and RLS behavior: [Access Control](https://supabase.com/docs/guides/storage/security/access-control)
- Supabase storage object ownership and folder-based policies: [Ownership](https://supabase.com/docs/guides/storage/security/ownership)
- Supabase storage schema design and public/private guidance: [Schema Design](https://supabase.com/docs/guides/storage/schema/design)
- Supabase bucket creation options (public/private, limits): [Creating Buckets](https://supabase.com/docs/guides/storage/buckets/creating-buckets)
- Supabase JS upload (React Native ArrayBuffer guidance): [Storage Upload Reference](https://supabase.com/docs/reference/javascript/v1/storage-from-upload)
- Expo Image Picker API (permissions + picker flow): [Expo ImagePicker](https://docs.expo.dev/versions/latest/sdk/imagepicker/)
- Expo FileSystem API for base64 reads: [Expo FileSystem](https://docs.expo.dev/versions/latest/sdk/filesystem/)
