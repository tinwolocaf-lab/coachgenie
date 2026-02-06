# Premium UI/UX Renewal Plan

## Objective

Deliver a full visual and interaction renewal so Coachgenie feels premium, intentional, and production-grade across iOS and Android while preserving existing product flows.

## Product-Level Design Direction

- Visual language: editorial + cinematic + tactile.
- Core feeling: calm confidence, high clarity, low noise.
- Interaction style: deliberate motion, soft depth, instant feedback.
- Constraint: no purple bias, no default-looking generic UI.

## North-Star Outcomes

1. System consistency
- Shared design tokens drive the majority of surfaces.
- No isolated one-off visual patterns for primary actions.

2. Premium execution
- Strong hierarchy in typography and spacing.
- Depth model (surface/elevation/border) is coherent.
- Buttons/inputs/cards look handcrafted, not boilerplate.

3. Accessibility + comfort
- Touch targets stay at mobile-safe sizes.
- Text and controls maintain readable contrast.
- Motion is meaningful and not excessive.

4. Runtime quality
- Transitions and interactions stay smooth in typical usage.
- No new runtime warnings or regressions in auth/tab flows.

## Current UX Issues (Audit Summary)

- Theme foundation is partially premium but inconsistent across surfaces.
- Shared components (`Button`, `Card`, `Input`) are functional but not visually unified enough.
- Tab shell has effects, but visual depth and icon treatment can be tighter.
- Some auth/error states leak across screens, reducing trust (already partially fixed).
- Screen-level styles often mix legacy color aliases and direct values.

## Renewal Strategy

Use a 4-layer system, implemented top-down.

### Layer 1: Foundation (Tokens)

- Colors: elevate neutral/ink/accent system and edge contrast.
- Typography: stronger editorial hierarchy and fallback-safe families.
- Spacing/radius/shadows: normalize rhythm and premium depth.
- Motion timings: harmonize interaction cadence.

### Layer 2: Core Components

- Button: tactile press behavior, premium variants, cleaner loading state.
- Card: distinct surface modes (`default`, `elevated`, `glass`, `gold`) with tighter borders/elevation.
- Input: clearer focus ring + error state + label hierarchy.

### Layer 3: App Shell

- Tab bar: cleaner floating dock profile, stronger active state, reduced visual clutter.
- Base backgrounds: subtle gradients/surfaces that avoid flat blankness.

### Layer 4: Screen Pass

- Prioritize high-traffic screens first:
  - Home (`app/(tabs)/index.tsx`)
  - Coaches (`app/(tabs)/coaches.tsx`)
  - Plan (`app/(tabs)/plan.tsx`)
  - Vault (`app/(tabs)/vault.tsx`)
  - Auth (`app/(auth)/*`)
- Standardize section headers, spacing cadence, and CTA rhythm.

## Implementation Plan (Detailed)

### Phase A: Foundation Refactor

Files:
- `constants/theme.ts`
- `contexts/ThemeContext.tsx` (compatibility alignment)

Changes:
- Define stronger premium token values for neutral surfaces, high-contrast text, and accent.
- Improve typography defaults and weights for an editorial look.
- Refine elevation model to avoid muddy shadows.
- Keep legacy aliases for compatibility to prevent broad regressions.

Acceptance criteria:
- Existing screens compile unchanged.
- Visual baseline noticeably upgraded without per-screen edits.

### Phase B: Component Renewal

Files:
- `components/ui/Button.tsx`
- `components/ui/Card.tsx`
- `components/ui/Input.tsx`

Changes:
- Rework variant styling and micro-interactions for premium polish.
- Tighten border radius, spacing, line-height and state transitions.
- Improve disabled/loading/pressed semantics.

Acceptance criteria:
- All existing call sites still work with current props.
- Components read as one coherent system.

### Phase C: Shell Renewal

Files:
- `app/(tabs)/_layout.tsx`

Changes:
- Refine tab icon container treatment and active indicator language.
- Improve dock depth, blur balance, and spacing.

Acceptance criteria:
- Tab bar feels premium and legible in all atmospheres.
- No new animation warnings from tab interactions.

### Phase D: Screen Harmonization (Rolling)

Files (incremental):
- `app/(tabs)/index.tsx`
- `app/(tabs)/coaches.tsx`
- `app/(tabs)/plan.tsx`
- `app/(tabs)/vault.tsx`
- `app/(auth)/login.tsx`
- `app/(auth)/signup.tsx`
- `app/(auth)/forgot-password.tsx`

Changes:
- Normalize vertical rhythm and section framing.
- Remove noisy decorative effects where they don’t add hierarchy.
- Promote premium content layout patterns (hero, section cadence, anchored CTAs).

Acceptance criteria:
- Cross-screen visual language is consistent.
- UX remains familiar while looking clearly upgraded.

## QA Matrix

### Visual QA

- iOS: iPhone with notch + non-notch simulator.
- Android: phone aspect ratio and default Expo Go rendering.
- Light/dark atmospheres where applicable.

### Interaction QA

- Tap states on all primary/secondary/ghost buttons.
- Input focus/blur/error states.
- Tab navigation transitions and haptics.

### Functional QA

- Auth flows: login, forgot password, signup.
- Tab entry and primary CTA navigation.
- No new runtime exceptions introduced by style changes.

## Risk Management

- Keep API signatures stable for shared components.
- Preserve legacy token aliases until screen migration is complete.
- Make changes in layers so regressions can be isolated quickly.

## Definition of Done

- Foundation + components + shell are renewed and shipped.
- Core tab/auth surfaces visually align with premium direction.
- No blocking lint/runtime regressions from renewed files.
- Follow-up screen pass backlog is documented and prioritized.
