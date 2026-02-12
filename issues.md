# CoachGenie — iOS Build Issue Report

**Date:** February 12, 2026
**Build:** EAS iOS build (`Coachgenie.app`) on iPhone 16e Simulator (iOS 26.0)
**Mode:** Guest mode (no Supabase auth)

---

## Critical Issues

### 1. Vault tab stuck on "Loading your vault..." indefinitely

**Screen:** `(tabs)/vault`
**Severity:** Critical — entire tab is non-functional

The Vault tab displays "Loading your vault..." text centered on a blank screen and never resolves. There is no loading spinner, no timeout, no error message, and no retry button. The user has no indication that anything went wrong or any way to recover.

**Root cause:** In `app/(tabs)/vault.tsx` (lines 29-40, 85-93), the `loadData()` function calls `getContextVault()` which depends on Supabase auth. In guest mode (or when Supabase is unreachable), the promise likely never resolves or silently fails. The error is caught and logged to console but never reflected in the UI. The component checks `if (!vault)` and renders the loading state permanently.

**Expected behavior:** Should show an empty-state screen (e.g., "Set up your Context Vault to personalize coaching") with an action button, or fall back to local AsyncStorage data.

---

### 2. Onboarding session screen hangs on "Starting your first coaching session..."

**Screen:** `onboarding/session`
**Severity:** Critical — blocks onboarding completion

When reaching the final onboarding step, the screen shows only "Starting your first coaching session..." with a blank white area. No chat messages appear, no loading indicator, no timeout handling.

**Root cause:** In `app/onboarding/session.tsx` (lines 91-123), `loadCoachAndStartSession()` looks up the selected coach from `SAMPLE_COACHES` by `data.selectedCoachId`. If no coach was selected during onboarding (e.g., the user navigated via deep link, or state was lost), `selectedCoach` is `undefined` and the `if (selectedCoach)` block never executes. The screen stays in its initial loading state forever with no fallback.

**Expected behavior:** Should either select a default coach automatically, show an error with a "Go back" button, or redirect the user to the coach selection step.

---

### 3. Chat, Coach Detail, and Insights Dashboard all show "Upgrade Required" for the free coach

**Screens:** `chat/daily-clarity`, `coach/daily-clarity`, `insights-dashboard`
**Severity:** High — core features are inaccessible

Attempting to open a chat with the Daily Clarity Coach (which is listed as the free coach in the paywall — "1 coach (Daily Clarity)") shows an "Upgrade Required: This coach requires a Sovereign or Oracle subscription" dialog. The same dialog appears on coach detail and insights dashboard screens.

**Expected behavior:** The Daily Clarity Coach should be accessible without a subscription. The upgrade gate should only apply to premium coaches (Deep Work, Systems Builder, Strategic Thinking, Mindset).

---

## High-Priority Issues

### 4. Brand name inconsistency: "Coachgenie" vs "CoachGenie"

**Screens:** Onboarding welcome, Login, vs. Onboarding name screen
**Severity:** High — brand identity confusion

The onboarding welcome screen (`app/onboarding/index.tsx`, line 59) and the login screen (`app/(auth)/login.tsx`, lines 293, 429) display the brand as **"Coachgenie"** (lowercase 'g'). However, the onboarding name screen shows **"CoachGenie"** (camelCase). The app bundle ID is `com.coachgenie.app` (all lowercase), and the EAS build file is `Coachgenie.app`.

**Expected behavior:** All instances should use a single consistent brand name. Recommend "CoachGenie" (camelCase) to match the name screen and emphasize the two-word compound.

---

### 5. Archive "Breakthroughs" card text wraps poorly

**Screen:** `archive` (Wisdom tab)
**Severity:** Medium — visual defect

The two `QuickActionCard` components ("All Insights" and "Breakthroughs") split the screen width evenly using `flex: 1`. On the iPhone 16e screen, "Breakthroughs" wraps to two lines as **"Breakth\noughs"**, breaking mid-word in an ugly way.

**Root cause:** `quickActionCard` style has `flex: 1` and the card layout is `flexDirection: 'row'` with a 40px icon + margin, title text, count, and chevron all competing for horizontal space. The word "Breakthroughs" is too long for the remaining width.

**Suggested fix:** Use `numberOfLines={1}` with `adjustsFontSizeToFit` on the title, or shorten to "Breakthr..." or use an abbreviated label.

---

### 6. Oracle screen has no visible close/back button on initial view

**Screen:** `oracle/index`
**Severity:** Medium — UX confusion

The Oracle opens as a full-screen modal showing an eye icon, "The Oracle" title, and "a space for deeper seeing" tagline. While the code does have a chevron-down close button in the header (line 282-284), the initial splash/loading animation covers the full screen without any visible navigation chrome. A user unfamiliar with the app may feel trapped.

**Expected behavior:** The close button should be visible from the moment the screen appears, even during the entrance animation.

---

### 7. Navigation stack corruption via deep links

**Screens:** All screens navigated via `coachgenie://` deep links
**Severity:** Medium — development/testing concern, potential production issue

When navigating between screens via deep links (e.g., `coachgenie://oracle` then `coachgenie://chat/daily-clarity`), the previous screen's header ("THE ORACLE") persists in the status bar area behind the new screen. Modal dialogs (like "Upgrade Required") stack on top of each other and are not dismissed when navigating to a new route. The login screen was observed with both "THE ORACLE" header and the "Upgrade Required" dialog layered behind and on top of it simultaneously.

**Impact:** While deep links may not be the primary user navigation path, this suggests the router's modal/stack management doesn't properly clean up when a new route is pushed externally. Could affect OAuth callbacks and push notification deep links in production.

---

## Medium-Priority Issues

### 8. Home tab greeting doesn't show user name in guest mode

**Screen:** `(tabs)/index`
**Severity:** Low-Medium

The Home tab displays "Good evening" without a comma or user name. The code (lines 209-214) tries to pull the name from `auth.user.user_metadata` or email, but in guest mode there's no user object. The onboarding name step stores the name in AsyncStorage, but the Home screen only reads from Supabase auth metadata.

**Expected behavior:** Should fall back to reading the name from AsyncStorage/onboarding data when no auth user is present.

---

### 9. Paywall price "$0" renders ambiguously in serif font

**Screen:** `paywall`
**Severity:** Low-Medium — visual/typographic issue

The Free tier price is displayed as "$0" but in the serif font (likely Playfair Display), the zero character can be visually ambiguous — it resembles a lowercase "o", making it look like "$o" rather than "$0".

**Suggested fix:** Use `$0` with the sans-serif font (Inter) for prices, or display "Free" instead of "$0".

---

### 10. Gallery tab coach cards show lock icon but no explanation

**Screen:** `(tabs)/coaches`
**Severity:** Low-Medium

Premium coaches (Deep Work Coach visible in screenshot) show a small lock icon in the top-right corner, but there's no label, tooltip, or visual indicator explaining what it means. A new user may not understand that tapping a locked coach will trigger an upgrade prompt.

**Suggested fix:** Add a "Premium" badge or "Sovereign" label near the lock icon for clarity.

---

### 11. Onboarding welcome screen appears non-scrollable

**Screen:** `onboarding/index`
**Severity:** Low-Medium

The onboarding welcome screen shows "Personalized", "Intentional", and "Premium Methodology" feature cards, but the bottom content and "Begin Your Consultation" button are cut off below the visible area. During testing, scrolling via simulated touch did not appear to work. It's unclear if the content is in a ScrollView or if the button is positioned off-screen on smaller devices.

**Expected behavior:** The "Begin Your Consultation" CTA must always be visible or easily reachable via scroll on all device sizes.

---

### 12. Vibe selection screen uses platform emoji instead of custom icons

**Screen:** `onboarding/vibe`
**Severity:** Low — design polish

The vibe cards use native platform emoji (🧘, 💪, 🎯, 💡, 🌊, 🔥) which look different across iOS versions and break the premium editorial aesthetic. The rest of the app uses custom icons (Ionicons) and a carefully crafted visual language.

**Suggested fix:** Replace emoji with custom SVG or Ionicon-based illustrations matching the app's design system.

---

### 13. "Explore all coaches" button missing from onboarding coach screen

**Screen:** `onboarding/coach`
**Severity:** Low

The coach selection screen shows "Start with this coach" as the primary CTA but the "Explore all coaches" secondary action (present in code) is either not visible in the viewport or requires scrolling to reach. Users may feel forced into the recommended coach without seeing alternatives.

---

### 14. Plan tab shows empty state with no call-to-action

**Screen:** `(tabs)/plan`
**Severity:** Low — empty state design

The 7-Day Timeline shows "0% Week Progress — 0 of 0 priorities complete" and lists days with "No activities planned". There's no prominent button to generate a plan or add priorities. The user needs guidance on how to populate their plan.

**Suggested fix:** Add a prominent "Generate Your First Plan" CTA or onboarding tooltip.

---

### 15. Rituals screen ("The Practice") shows correct empty state but Evening Audit card is not interactive

**Screen:** `rituals`
**Severity:** Low

The Evening Audit card with arrow icon appears to be tappable but testing revealed no navigation on tap. The "No rituals yet" empty state and "+ Create Ritual" button are present and well-designed, but the featured ritual card at the top should either navigate to the ritual flow or show a preview.

---

### 16. Account screen in guest mode is minimal

**Screen:** `account`
**Severity:** Low — expected behavior but could be improved

Shows only "Guest Account" with a Sign In button and "Go Back" link. No settings, preferences, theme switching, or any other functionality is accessible without signing in.

**Suggested fix:** Allow theme/atmosphere selection, notification preferences, and app info access even in guest mode.

---

## Database / Backend Issues (from previous sessions, still unresolved)

### 17. Database schema tables don't exist despite migrations being recorded

**Severity:** Critical — app cannot persist any data

Migrations 0001-0005 are recorded in Supabase's migration history but the actual tables (profiles, coaches, sessions, insights, etc.) don't exist in the database. A combined idempotent `repair_schema.sql` was created but has not been executed yet.

**Action required:** Set `SUPABASE_DB_PASSWORD` and run:
```bash
cat supabase/repair_schema.sql | supabase db execute --linked
```

### 18. OPENROUTER_API_KEY may not be set as Supabase secret

**Severity:** High — AI coaching features won't work

The edge functions (chat-stream, plans-generate, etc.) require the OpenRouter API key to be set as a Supabase project secret. This hasn't been verified.

**Action required:** Verify with:
```bash
supabase secrets list
```

---

## Summary

| # | Issue | Severity | Category |
|---|-------|----------|----------|
| 1 | Vault tab infinite loading | Critical | Bug |
| 2 | Onboarding session hangs | Critical | Bug |
| 3 | Free coach blocked by paywall | High | Bug |
| 4 | Brand name inconsistency | High | Branding |
| 5 | "Breakthroughs" text wrapping | Medium | UI |
| 6 | Oracle no visible close button initially | Medium | UX |
| 7 | Deep link navigation stack corruption | Medium | Navigation |
| 8 | Home greeting missing name (guest) | Low-Med | UX |
| 9 | "$0" ambiguous in serif font | Low-Med | Typography |
| 10 | Lock icon without explanation | Low-Med | UX |
| 11 | Onboarding CTA possibly off-screen | Low-Med | Layout |
| 12 | Platform emoji in vibes | Low | Design |
| 13 | "Explore coaches" not visible | Low | UX |
| 14 | Plan tab empty with no CTA | Low | Empty State |
| 15 | Evening Audit card not interactive | Low | UX |
| 16 | Guest account screen minimal | Low | UX |
| 17 | Database tables missing | Critical | Backend |
| 18 | OpenRouter key unverified | High | Backend |
