---
name: expo-router-patterns
description: Modern Expo Router patterns for file-based navigation, layouts, typed routes, deep links, and auth routing in Expo apps. Use when building or refactoring app navigation.
---

# Expo Router Patterns

Last verified: 2026-02-06

## Core Routing Model

- `app/index.tsx` -> `/`
- `app/profile.tsx` -> `/profile`
- `app/coach/[id].tsx` -> `/coach/:id`
- `app/(tabs)/_layout.tsx` -> tab shell
- `app/(auth)/_layout.tsx` -> auth flow
- `app/+not-found.tsx` -> unmatched routes
- `app/+native-intent.tsx` -> native deep-link rewrite handling

Use route groups `(group)` to organize layouts without changing URL paths.

## Typed Navigation (Recommended)

Enable typed routes in Expo config and use typed `Href` objects where possible.

```typescript
import { router } from 'expo-router';

router.push({
  pathname: '/coach/[id]',
  params: { id: coachId },
});
```

Prefer typed route objects over ad-hoc string interpolation for dynamic routes.

## Layout Patterns

### Root layout (`app/_layout.tsx`)
- Theme providers, auth providers, gesture/safe-area wrappers.
- Global modals and stack-level options.

### Nested layouts
- Put only navigation concerns in `_layout.tsx`.
- Keep feature/business logic in screen components or domain modules.

## URL Parameters

Use `useLocalSearchParams` for route/query params in screens.

```typescript
const { id } = useLocalSearchParams<{ id: string }>();
```

Validate critical params before usage and handle missing values with fallback UI/navigation.

## Deep Linking and Redirects

- Keep app `scheme` configured in `app.json`.
- For native app links/intent edge cases, normalize in `+native-intent.tsx`.
- Keep auth callback routes deterministic (`/(auth)/callback` or equivalent).

## Auth Gating Patterns

- Use layout-level gate checks (auth context/provider) for protected groups.
- Redirect unauthenticated users to auth route using `router.replace`.
- Avoid gate logic duplication in every child screen.

## Navigation Best Practices

1. Use `router.replace` for non-backtrack transitions (login complete, onboarding complete).
2. Use `router.push` for drill-down routes.
3. Use `router.back` only when back stack behavior is guaranteed.
4. Keep route filenames explicit and predictable.
5. Avoid side effects in render paths when handling navigation.

## Common Pitfalls

- Missing `+not-found.tsx` causes poor fallback UX.
- String path typos for dynamic routes when not using typed objects.
- Business logic in `_layout.tsx` leading to re-render churn and hard-to-debug nav issues.

## Sources

- Expo Router docs: https://docs.expo.dev/router/introduction/
- Expo Router notation: https://docs.expo.dev/router/basics/notation/
- URL parameters: https://docs.expo.dev/router/reference/url-parameters/
- Typed routes: https://docs.expo.dev/router/reference/typed-routes/
- Router API: https://docs.expo.dev/versions/latest/sdk/router/
