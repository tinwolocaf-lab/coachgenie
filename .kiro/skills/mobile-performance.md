---
name: mobile-performance
description: Performance optimization patterns for Expo + React Native apps covering startup time, rendering, list virtualization, memory, and profiling workflow. Use when diagnosing jank, slow screens, dropped frames, or excessive bundle/runtime overhead.
---

# Mobile Performance Optimization

Last verified: 2026-02-06

## Performance Workflow (Always in this order)

1. Reproduce the issue with exact device + steps.
2. Measure in production-like mode.
3. Profile to identify JS-thread vs UI-thread bottleneck.
4. Apply targeted fixes.
5. Re-measure and keep only changes with measurable impact.

## Baseline and Tooling

### Validate environment first
```bash
npx expo-doctor@latest
npx expo install --check
```

### Test performance outside dev mode
```bash
npx expo start --no-dev --minify
```

### Analyze JS bundle contributors
Use Expo Atlas to identify heavy dependencies and startup cost hotspots.

## Rendering Performance

### JS vs UI thread
- If input lag and state updates are slow, suspect JS thread overload.
- If animations/navigation stutter while JS is light, suspect UI thread/layout/compositing pressure.

### Minimize expensive re-renders
- Memoize expensive child trees where prop identity is stable.
- Avoid creating new objects/arrays/functions inside hot render paths when avoidable.
- Move heavy transforms out of render into memoized selectors/utilities.

### Avoid console overhead in production
- Remove noisy logs and logging middleware from production bundles.

## Lists and Large Data

- Use `FlatList` or `SectionList` for long collections.
- Tune `initialNumToRender`, `maxToRenderPerBatch`, `windowSize`, and `removeClippedSubviews` with real profiling.
- Use stable keys and avoid index keys.
- Keep list rows shallow and memoized.

## Animation and Motion

- Prefer native-thread-friendly animation paths when possible.
- Keep transitions short and meaningful.
- Avoid mixing layout animation and `transform` on the same view node.

If you see Reanimated warning about `transform` being overwritten by layout animation:
1. Apply layout animation on a wrapper `Animated.View`.
2. Apply `transform` animation on the inner child.

## Assets and Media

- Use optimized image sizes (no oversize source bitmaps).
- Use `expo-image` caching and placeholders for remote media.
- Defer heavy media loads until after first meaningful paint.

## Memory and Subscriptions

- Clean up subscriptions/channels/timers in `useEffect` cleanup.
- Release large refs/state when screen is unfocused or unmounted.
- Avoid unbounded arrays in memory (messages/log buffers/history).

## Expo and Architecture Guidance

- Keep Expo SDK dependencies aligned with expected versions.
- New Architecture is the platform direction; keep libraries compatible and validated with Expo Doctor.
- Evaluate React Compiler incrementally after `react-compiler-healthcheck` and lint readiness.

## Practical Checklist Before Merge

- No major frame drops in key flows on iOS and Android.
- Startup and first-interaction time improved or unchanged.
- No new runtime warnings from animation/layout conflicts.
- Regression test performed on lowest-tier target device class.

## Sources

- Expo development vs production behavior: https://docs.expo.dev/workflow/development-mode/
- Expo React Compiler guide: https://docs.expo.dev/guides/react-compiler
- Expo New Architecture guide: https://docs.expo.dev/guides/new-architecture/
- Expo bundle analysis (Atlas): https://docs.expo.dev/guides/analyzing-bundles/
- React Native performance overview: https://reactnative.dev/docs/performance
- React Native profiling: https://reactnative.dev/docs/profiling
