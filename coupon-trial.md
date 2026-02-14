# Admin-Managed Coupon Trials + Effective-Tier Credit Visibility (Decision-Complete Implementation Plan)

## Summary

Implement admin-managed, database-backed coupon trials that grant plan-specific free access (`sovereign` or `oracle`) for configurable durations, with usage caps and one-time redemption per user. Enforce the trial tier across backend billing and app gating by moving runtime tier decisions to effective tier resolution (paid vs trial, highest wins). Add coupon redemption UI on Paywall and Account, and add clear credit visibility with 1-decimal precision in Account plus a lightweight Home badge.

## 1) Database and migration changes

1. Create a new migration file at `/Users/ricky/dastur/exp/Coachgenie/supabase/migrations/<timestamp>_coupon_trials.sql`.
2. Add table `public.trial_coupons` with columns: `id uuid pk`, `code text not null`, `target_tier text check in ('sovereign','oracle')`, `trial_days int not null default 30 check (trial_days between 1 and 365)`, `max_redemptions int not null check (max_redemptions > 0)`, `redemptions_count int not null default 0`, `is_active boolean not null default true`, `starts_at timestamptz null`, `ends_at timestamptz null`, `metadata jsonb not null default '{}'`, `created_at`, `updated_at`.
3. Add unique index on normalized code (`unique(lower(code))`) so coupon matching is case-insensitive.
4. Add table `public.trial_coupon_redemptions` with columns: `id uuid pk`, `coupon_id uuid references public.trial_coupons(id)`, `user_id uuid references public.profiles(id)`, `target_tier text check in ('sovereign','oracle')`, `trial_days int not null`, `starts_at timestamptz not null default now()`, `ends_at timestamptz not null`, `redeemed_at timestamptz not null default now()`, `created_at timestamptz not null default now()`.
5. Enforce one coupon lifetime per user with `unique(user_id)` on `public.trial_coupon_redemptions`.
6. Add index coverage: `trial_coupon_redemptions(user_id, ends_at desc)`, `trial_coupon_redemptions(coupon_id)`, `trial_coupons(is_active, starts_at, ends_at)`.
7. Add RLS: user can `select` own rows on `trial_coupon_redemptions`; no user insert/update/delete policies; no direct user policies on `trial_coupons` (service-role only).
8. Add `updated_at` trigger support for `trial_coupons` if `update_updated_at_column` exists.
9. Add security-definer SQL function `public.billing_redeem_coupon(p_user_id uuid, p_coupon_code text)` that atomically validates coupon and inserts redemption under row lock.
10. In `public.billing_redeem_coupon`, return structured error codes by raising exceptions for: `INVALID_COUPON`, `COUPON_INACTIVE`, `COUPON_NOT_STARTED`, `COUPON_EXPIRED`, `COUPON_MAX_REDEMPTIONS_REACHED`, `COUPON_ALREADY_REDEEMED`.

## 2) Backend tier resolution and billing behavior

1. Update `/Users/ricky/dastur/exp/Coachgenie/supabase/functions/_shared/revenuecat.ts` so `resolveBillingTier` computes effective tier from two sources:
2. Source A is current paid tier logic (existing RevenueCat + cache flow).
3. Source B is active coupon trial from `public.trial_coupon_redemptions` where `user_id = current user` and `ends_at > now()`.
4. Effective tier rule is `max(paidTier, trialTier)` by existing rank semantics; this matches your selection “highest tier wins.”
5. Extend resolver return metadata to include `paid_tier`, `trial_tier` (nullable), `trial_ends_at` (nullable), and `tier_source` including `'trial_coupon'`.
6. Update `/Users/ricky/dastur/exp/Coachgenie/supabase/functions/_shared/billing.ts` so `ensureActiveCreditAccount` uses trial duration when applicable instead of fixed 30-day period.
7. Preserve 30-day default for non-trial paths; apply trial duration only when resolved tier is currently trial-backed.
8. Keep downgrade behavior as-is; trial expiry will naturally trigger period expiry/reset because trial period end is written as account period end.

## 3) New redemption edge function

1. Add `/Users/ricky/dastur/exp/Coachgenie/supabase/functions/billing-redeem-coupon/index.ts` (POST).
2. Request body schema: `{ code: string }` with strict trim/length/charset validation.
3. Auth required via existing `/Users/ricky/dastur/exp/Coachgenie/supabase/functions/_shared/auth.ts`.
4. Resolve current effective tier first; reject redemption unless coupon tier is strictly higher than current effective tier (your selected rule “any user, but only if coupon tier is higher”).
5. Execute `public.billing_redeem_coupon(...)` via service client RPC.
6. Re-resolve effective tier and call `ensureActiveCreditAccount(...)` immediately so credits and tier unlock apply without app restart.
7. Return payload with fields: `tier`, `tier_source`, `trial_days`, `trial_start`, `trial_end`, `balance_credits`, `pack_credits`, `period_end`.
8. Map SQL errors to stable API codes/messages and non-crashing UX-safe strings.

## 4) Existing credit status endpoint enhancements

1. Update `/Users/ricky/dastur/exp/Coachgenie/supabase/functions/billing-credit-status/index.ts` to include trial metadata in response.
2. Add response fields: `paid_tier`, `trial_tier`, `trial_active`, `trial_end`, `tier_source` (with `'trial_coupon'`).
3. Keep current credit payload fields unchanged for backward compatibility.

## 5) Client API and tier-source unification

1. Update `/Users/ricky/dastur/exp/Coachgenie/lib/apiClient.ts`.
2. Extend `CreditStatusResponse` type with new trial/effective fields and `tier_source` union including `'trial_coupon'`.
3. Add `redeemCoupon(code: string)` API client method calling `billing-redeem-coupon`.
4. Update `/Users/ricky/dastur/exp/Coachgenie/lib/feature-gates.ts` `getUserTier()` to resolve effective tier from backend credit status first, with safe fallback to RevenueCat on failures.
5. Add a small in-memory TTL cache plus `invalidateUserTierCache()` to avoid repeated network fetches in rapid navigation.
6. Invalidate tier cache after purchase/restore/coupon redemption/sign-out transitions.

## 6) Theme and app-level tier consistency

1. Update `/Users/ricky/dastur/exp/Coachgenie/contexts/ThemeContext.tsx`.
2. Replace direct startup assignment from `getUserSubscriptionTier()` with effective tier refresh via `getUserTier()`.
3. Keep RevenueCat listener but use it as a refresh trigger, not final source of truth, so trial tiers are not overwritten by RC-only events.
4. Keep `isSovereignMember` derived from `subscriptionTier !== 'free'` as current behavior.

## 7) UI implementation

1. Add reusable coupon component at `/Users/ricky/dastur/exp/Coachgenie/components/billing/CouponRedeemCard.tsx` with input, submit button, loading state, and message area.
2. Integrate coupon card into `/Users/ricky/dastur/exp/Coachgenie/app/paywall.tsx` below billing interval selector; on success, refresh tier and close-loop messaging.
3. Integrate coupon card into `/Users/ricky/dastur/exp/Coachgenie/app/account.tsx` in Subscription section for post-onboarding redemption.
4. In `/Users/ricky/dastur/exp/Coachgenie/app/account.tsx`, expand credit details to show pack, remaining, used, and period end; render numeric credit values at exactly 1 decimal.
5. Add Home credit badge in `/Users/ricky/dastur/exp/Coachgenie/app/(tabs)/index.tsx` hero area, showing remaining credits with 1 decimal for authenticated users.
6. Keep all coupon failure states user-friendly and non-runtime-error, with explicit “plan unchanged” messaging.

## 8) Public APIs/interfaces/types changes

| Surface         | Change                                                                            | File                                                                                   |
| --------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Edge API        | New POST endpoint `billing-redeem-coupon`                                         | `/Users/ricky/dastur/exp/Coachgenie/supabase/functions/billing-redeem-coupon/index.ts` |
| Edge API        | `billing-credit-status` response enriched with trial metadata                     | `/Users/ricky/dastur/exp/Coachgenie/supabase/functions/billing-credit-status/index.ts` |
| Shared resolver | `resolveBillingTier` returns effective-tier metadata including trial source       | `/Users/ricky/dastur/exp/Coachgenie/supabase/functions/_shared/revenuecat.ts`          |
| Client type     | `CreditStatusResponse` extended with trial fields and updated `tier_source` union | `/Users/ricky/dastur/exp/Coachgenie/lib/apiClient.ts`                                  |
| Client API      | Add `redeemCoupon(code)`                                                          | `/Users/ricky/dastur/exp/Coachgenie/lib/apiClient.ts`                                  |
| DB schema       | New `trial_coupons`, `trial_coupon_redemptions`, and `billing_redeem_coupon` RPC  | `/Users/ricky/dastur/exp/Coachgenie/supabase/migrations/<timestamp>_coupon_trials.sql` |
| Generated types | Regenerate Supabase DB types after migration                                      | `/Users/ricky/dastur/exp/Coachgenie/types/database.ts`                                 |

## 9) Validation scenarios

1. Redeem valid sovereign coupon as free user; tier becomes sovereign; credit pack and period end update immediately.
2. Redeem valid oracle coupon as sovereign paid user; effective tier becomes oracle during trial window.
3. Attempt coupon where target tier is not higher than current effective tier; redemption is rejected with clear message.
4. Attempt second coupon redemption by same user; rejected due to one-coupon-lifetime rule.
5. Hit coupon max redemptions boundary with concurrent requests; only allowed count succeeds.
6. Use coupon with `trial_days = 7`; verify trial unlock expires after 7 days and billing tier/credits reset appropriately.
7. Verify paywall coupon entry and account coupon entry both work and produce consistent state.
8. Verify account credit summary and home badge show 1-decimal precision.
9. Verify no runtime error toast on expected coupon input failures; all errors are handled as UX messages.
10. Run static checks after implementation: `npm run lint` and `npx tsc --noEmit`.

## 10) Assumptions and defaults locked

1. Admin management is database-driven only; no admin UI is built in this scope.
2. Coupon codes are case-insensitive.
3. One coupon redemption lifetime per user.
4. Effective tier is highest of paid and trial.
5. Any user may redeem only when coupon tier is strictly higher than current effective tier.
6. Trial duration comes from coupon at redemption time; default is 30 days unless admin sets another value.
7. Credits are shown with 1 decimal in UI.
8. Credit visibility surfaces are Account detail + Home badge.
