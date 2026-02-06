---
name: react-native-patterns
description: Current best-practice patterns for React Native + Expo component architecture, navigation, animations, accessibility, and state management. Use when building or refactoring mobile UI features.
---

# React Native Patterns

Last verified: 2026-02-06

## Component Architecture

- Use typed functional components.
- Keep view components focused; move domain logic to hooks/services.
- Prefer composition over giant monolithic screens.

```typescript
interface Props {
  title: string;
  onPress?: () => void;
}

export function FeatureCard({ title, onPress }: Props) {
  return <Pressable onPress={onPress}><Text>{title}</Text></Pressable>;
}
```

## Hooks and Render Stability

- Use `useMemo` and `useCallback` only where render profiling shows benefit.
- Avoid stale closures in async handlers and effects.
- Keep effect dependencies complete unless there is a deliberate, documented reason.

## List Rendering

- Use `FlatList`/`SectionList` for large lists.
- Stable keys only (no index keys for mutable lists).
- Keep row components shallow and memoized when needed.

## Styling Standards

- Use `StyleSheet.create` for static styles.
- Use theme tokens (spacing, color, typography) over raw literals.
- Keep minimum touch target sizes mobile-safe.

## Animations and Reanimated

- Prefer focused motion with clear UX purpose.
- Do not apply layout animations and `transform` on the same node.
- Use wrapper pattern for layout animation conflicts:
  - outer animated wrapper -> layout transitions
  - inner view -> `transform` animation

## Navigation

- Use Expo Router route groups and nested layouts.
- Use typed route params for dynamic screens.
- Use `router.replace` for auth/onboarding completion transitions.

## Accessibility Baseline

- Add accessibility labels/roles for non-obvious interactive elements.
- Ensure sufficient color contrast for text and controls.
- Keep controls readable with larger text settings.

## Common Pitfalls

1. Unbounded state growth in chat/feed screens.
2. Side effects in render paths.
3. `console.error` for expected UX states (surface inline errors instead).
4. Overusing re-renders via uncontrolled prop identity churn.

## Sources

- React Native docs: https://reactnative.dev/docs/getting-started
- React Native performance: https://reactnative.dev/docs/performance
- React Native accessibility: https://reactnative.dev/docs/accessibility
- Expo docs: https://docs.expo.dev/
