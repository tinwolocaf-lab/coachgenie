# CoachZeno Android Widgets — Implementation Plan

**Date:** February 2026
**Library:** `react-native-android-widget` (upgrade from v0.15 → v0.20.1)
**Platform:** Expo SDK 54 + React Native 0.81.5 (New Architecture)

---

## Current State

The codebase already has foundational widget infrastructure:

- `react-native-android-widget` v0.15.0 installed (needs upgrade to v0.20.1)
- Three widget components exist in `widgets/android/`:
  - **DailyFocusWidget** (2×2 small) — priorities + rituals + streak
  - **QuickCoachWidget** (2×4 medium) — coaching prompt + action buttons
  - **ReflectionWidget** (2×6 large) — reflection prompts + stats
- Widget bridge (`lib/widgetBridge.ts`) with SharedStorage abstraction
- Task handler (`widgets/android/widget-task-handler.tsx`) with click routing
- Deep link scheme (`coachgenie://`) already configured

**What's NOT done yet:**
- No Expo config plugin registered in `app.json` / `app.config.ts`
- `getWidgetData()` in task handler returns `null` (placeholder implementation)
- No native Android module (`CoachgenieWidgetBridge`) created
- Widget bridge `SharedStorage` methods call `NativeModules` that don't exist yet
- No `updatePeriodMillis` configured (no automatic refresh)
- No preview images for widget picker
- Library needs upgrade from v0.15 to v0.20.1

---

## Phase 1: Foundation — Make Existing Widgets Work

**Priority: CRITICAL — must be done before any new widget work**

### 1.1 Upgrade `react-native-android-widget` to v0.20.1

```bash
npm install react-native-android-widget@^0.20.1
```

Key benefits of v0.20:
- `clickAction="OPEN_URI"` with `clickActionData` for deep links (already used in widgets)
- `overflow` prop for clipping views with border radius
- `allowFontScaling` prop for accessibility
- Better launcher compatibility (crop vs. scale fix)
- Dropped support for RN < 0.76 (CoachZeno uses 0.81.5, so compatible)

### 1.2 Register Expo Config Plugin

Add to `app.json` plugins array:

```json
[
  "react-native-android-widget",
  {
    "fonts": ["./assets/fonts/PlayfairDisplay-Bold.ttf", "./assets/fonts/Inter-Regular.ttf"],
    "widgets": [
      {
        "name": "DailyFocusWidget",
        "label": "Daily Focus",
        "description": "Your top priority, ritual progress, and streak",
        "minWidth": "180dp",
        "minHeight": "180dp",
        "targetCellWidth": 2,
        "targetCellHeight": 2,
        "updatePeriodMillis": 1800000
      },
      {
        "name": "QuickCoachWidget",
        "label": "Quick Coach",
        "description": "Coaching nudge with quick action buttons",
        "minWidth": "320dp",
        "minHeight": "180dp",
        "targetCellWidth": 4,
        "targetCellHeight": 2,
        "updatePeriodMillis": 3600000
      },
      {
        "name": "ReflectionWidget",
        "label": "Reflection",
        "description": "Morning intentions and evening reflections with stats",
        "minWidth": "320dp",
        "minHeight": "320dp",
        "targetCellWidth": 4,
        "targetCellHeight": 4,
        "updatePeriodMillis": 3600000
      }
    ]
  }
]
```

### 1.3 Create Entry Point with Widget Registration

Create/update `index.ts` (app entry point):

```typescript
import { registerRootComponent } from 'expo';
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import App from './App';
import { taskHandler } from './widgets/android/widget-task-handler';

registerRootComponent(App);
registerWidgetTaskHandler(taskHandler);
```

Update `package.json` `"main"` field to point to `index.ts`.

### 1.4 Implement Native SharedPreferences Bridge

The widget task handler runs in a **separate headless JS context** — it cannot access React state or AsyncStorage. It needs SharedPreferences.

**Option A (Recommended):** Use `react-native-android-widget`'s built-in `SharedPreferences` from the widget task handler context. The library already provides access to read SharedPreferences within the task handler.

**Option B:** Create a custom native module `CoachgenieWidgetBridge` that exposes `readFromSharedPreferences` and `writeToSharedPreferences` to the JS side.

### 1.5 Wire Up Data Sync

Add `WidgetBridge.syncWidgetData()` calls to key app events:

| Event | Location | Data Synced |
|-------|----------|-------------|
| App foreground | `app/_layout.tsx` (AppState listener) | All widget data |
| Ritual completed | Ritual completion handler | ritualsCompleted, ritualTotal, streakCount |
| Plan updated | Plan generation/edit | topPriority |
| Session ended | Chat session close | coachingPrompt, recommendedCoach |
| Morning ritual done | Morning ritual screen | reflection (morning) |
| Evening audit done | Evening audit screen | reflection (evening), insight |

### 1.6 Generate Widget Preview Images

Create preview screenshots for each widget (shown in Android widget picker). Save as PNG in `assets/widget-previews/`:
- `daily_focus_preview.png` (2×2)
- `quick_coach_preview.png` (2×4)
- `reflection_preview.png` (4×4)

Reference in config: `"previewImage": "./assets/widget-previews/daily_focus_preview.png"`

---

## Phase 2: New Widget Ideas — Ranked by User Value

### Widget 2.1: **Ritual Checklist Widget** (NEW — High Value)

**Size:** 4×3 (medium-tall)
**Purpose:** Interactive ritual checklist directly on home screen — check off rituals without opening the app.

**Data displayed:**
- Time-of-day header (Morning Rituals / Evening Rituals)
- List of today's rituals with checkboxes (✅ / ⬜)
- Completion progress bar
- Streak flame + count
- "Add Ritual" tap action

**Key feature:** Uses `clickAction` with custom actions to **mark rituals complete from the widget** without opening the app. The task handler updates SharedPreferences and re-renders the widget.

**Click actions:**
- `TOGGLE_RITUAL` + `clickActionData: { ritualId: "xxx" }` → toggles completion
- `OPEN_URI` → `coachgenie://rituals` to open full rituals screen

**Why high value:** Habit tracker apps with home screen check-in widgets see **2× daily engagement** (SoundCloud case study with Jetpack Glance). This removes the friction of opening the app just to check off a ritual.

**Implementation notes:**
- Task handler receives `WIDGET_CLICK` with `clickAction = "TOGGLE_RITUAL"`
- Reads current ritual state from SharedPreferences
- Toggles the specific ritual
- Writes back to SharedPreferences
- Calls `requestWidgetUpdate` to re-render
- On next app open, syncs SharedPreferences → AsyncStorage → Supabase

### Widget 2.2: **Weekly Progress Ring Widget** (NEW — High Value)

**Size:** 2×2 (small)
**Purpose:** Visual progress ring showing weekly completion percentage.

**Data displayed:**
- Circular progress indicator (rendered as concentric FlexWidgets with border radius)
- Percentage number in center (e.g., "72%")
- "This Week" label
- Days completed / total days
- Subtle gold glow effect on high completion

**Why high value:** Visual progress is the #1 motivator in habit apps (Habitify, Strides). A glanceable ring on the home screen provides passive motivation throughout the day.

**Data source:** `day_plans` array → count completed priorities per day this week.

### Widget 2.3: **Quote of the Day Widget** (NEW — Medium Value)

**Size:** 4×2 (wide)
**Purpose:** Daily rotating motivational quote from coaching sessions or curated wisdom.

**Data displayed:**
- Quote text (from past coaching insights, breakthroughs, or curated prompts)
- Attribution (coach name or "Your Insight")
- Date
- Tap to open related session or archive

**Content sources (priority order):**
1. User's own breakthroughs/insights from Archive
2. Monthly synthesis key themes
3. Curated coaching wisdom quotes
4. Coach-specific motivational content

**Rotation logic:** Deterministic based on day-of-year (same quote all day, changes at midnight). Prefer user's own insights when available.

**Why medium value:** Personalized content from the user's own coaching journey feels deeply personal vs. generic quote apps. However, it's passive (no interaction).

### Widget 2.4: **Active Coach Card Widget** (NEW — Medium Value)

**Size:** 3×2 (medium)
**Purpose:** Show the user's active coach with a quick-start button.

**Data displayed:**
- Coach emoji + name
- Coach tagline (1 line)
- "Continue Session" or "New Session" button
- Last session timestamp ("2h ago")
- Session count this week

**Click actions:**
- Coach card tap → `coachgenie://chat/{coachId}` (resume or start session)
- "New Session" button → `coachgenie://chat/{coachId}?new=true`

**Why medium value:** Reduces friction from 3 taps (open app → home → chat) to 1 tap. Especially valuable for users who chat with their coach daily.

### Widget 2.5: **Credit Balance Widget** (NEW — Low-Medium Value)

**Size:** 2×1 (tiny)
**Purpose:** Show remaining AI credits at a glance.

**Data displayed:**
- Credit icon (✨)
- Credits remaining number
- Tier badge (Free / Sovereign / Oracle)
- Color-coded: green (>50%), yellow (25-50%), red (<25%)

**Why useful:** Prevents the frustration of opening the app to chat and finding out credits are depleted. Especially important for free tier users.

### Widget 2.6: **Today's Plan Widget** (NEW — High Value)

**Size:** 4×4 (large)
**Purpose:** Full day plan view with time blocks.

**Data displayed:**
- Day + date header
- Top 3 priorities with completion checkboxes
- Time blocks for the day (scrollable list)
- "Generate Plan" button if no plan exists
- Weekly completion mini-bar at bottom

**Click actions:**
- Priority checkboxes → `TOGGLE_PRIORITY` (complete without opening app)
- Time block tap → `OPEN_URI` → `coachgenie://plan`
- "Generate Plan" → `OPEN_URI` → `coachgenie://plan?generate=true`

**Why high value:** Plan-centric users check their priorities 5-10x/day. Having the plan on the home screen makes it the anchor of their daily workflow.

---

## Phase 3: Advanced Features

### 3.1 Configurable Widget Themes

Allow users to pick which app "atmosphere" (theme) the widget uses:

- Original (warm oatmeal + gold) — **default**
- Midnight Gallery (dark blues)
- Botanist (greens)
- Architect (minimal grays)
- Desert Solstice (warm oranges)

Implementation: Use `widgetFeatures: "reconfigurable|configuration_optional"` in config. When user long-presses and selects "Configure," show a theme picker. Store selection in SharedPreferences per widget instance.

### 3.2 Dynamic Content Based on Time of Day

All widgets should adapt their content based on time:

| Time | Widget Behavior |
|------|----------------|
| 5 AM – 9 AM | Morning rituals, intention prompts, "Good Morning" |
| 9 AM – 12 PM | Focus mode, top priority emphasized, deep work nudge |
| 12 PM – 2 PM | Midday check-in, energy level prompt |
| 2 PM – 6 PM | Afternoon push, remaining priorities, session suggestion |
| 6 PM – 10 PM | Evening audit, reflection prompt, achievement summary |
| 10 PM – 5 AM | Sleep mode, minimal display, tomorrow preview |

### 3.3 Widget-to-Widget Communication

When a ritual is completed via the Ritual Checklist Widget:
1. Update DailyFocusWidget ritual count
2. Update ReflectionWidget streak count
3. Update WeeklyProgressRing percentage

Use `requestWidgetUpdate` from the task handler to trigger cascading updates.

### 3.4 Offline-First Widget Data

Widgets must work without internet. Data flow:

```
App writes → SharedPreferences (immediate, local)
                ↓
Widget reads ← SharedPreferences (on update/render)
                ↓
App syncs → Supabase (when online, deferred)
```

SharedPreferences acts as the local cache. Widgets never call network APIs directly.

### 3.5 Smart Coaching Nudges via WorkManager

Schedule background tasks using Android WorkManager (via `react-native-headless-work-manager` or custom native module):

- **Morning nudge** (7 AM): Update QuickCoachWidget with morning coaching prompt
- **Focus reminder** (10 AM): Update DailyFocusWidget with "Deep work block starts now"
- **Evening trigger** (7 PM): Switch ReflectionWidget to evening mode
- **Weekly summary** (Sunday 9 AM): Update WeeklyProgressRing with final stats

Minimum interval: 15 minutes (Android WorkManager constraint).

---

## Phase 4: Polish & Optimization

### 4.1 Widget Preview Generation

Use `providePreview` (Jetpack Glance pattern) — for `react-native-android-widget`, this means generating high-quality preview PNGs that show in the widget picker with real-looking data.

### 4.2 Accessibility

- Set `allowFontScaling: true` on all TextWidgets (v0.20 feature)
- Ensure minimum 44dp touch targets on all clickable elements
- Use sufficient color contrast (WCAG AA) — current gold (#d4af37) on dark (#1a1a2e) passes
- Add `contentDescription` where available

### 4.3 Battery Optimization

- `updatePeriodMillis`: 30 min for DailyFocus (changes frequently), 1 hour for others
- Never fetch from network in widget task handler — read SharedPreferences only
- Widget re-renders only when data actually changes (diff check)
- Use `WIDGET_RESIZED` to adjust layout, not re-fetch data

### 4.4 Error Handling

- If SharedPreferences returns null → show default/placeholder data (already implemented)
- If deep link fails → fall back to opening main app
- If data is stale (>24h) → show "Open app to refresh" message
- Graceful degradation for guests (no auth) → show generic motivational content

---

## Implementation Order

| Step | Task | Effort | Priority |
|------|------|--------|----------|
| 1 | Upgrade library to v0.20.1 | 30 min | P0 |
| 2 | Register Expo config plugin in app.json | 1 hour | P0 |
| 3 | Create entry point with widget handler registration | 30 min | P0 |
| 4 | Implement SharedPreferences native bridge | 2-3 hours | P0 |
| 5 | Wire WidgetBridge.syncWidgetData() to app events | 2 hours | P0 |
| 6 | Test 3 existing widgets on real device | 1 hour | P0 |
| 7 | Build Ritual Checklist Widget (interactive) | 4-5 hours | P1 |
| 8 | Build Today's Plan Widget (interactive) | 4-5 hours | P1 |
| 9 | Build Weekly Progress Ring Widget | 2-3 hours | P1 |
| 10 | Build Quote of the Day Widget | 2-3 hours | P2 |
| 11 | Build Active Coach Card Widget | 2-3 hours | P2 |
| 12 | Build Credit Balance Widget | 1-2 hours | P2 |
| 13 | Generate preview images for all widgets | 2 hours | P2 |
| 14 | Add configurable themes | 3-4 hours | P3 |
| 15 | WorkManager background scheduling | 4-5 hours | P3 |
| 16 | Widget-to-widget cascading updates | 2 hours | P3 |

**Total estimated effort:** ~35-45 hours

---

## Files to Create/Modify

### New Files
- `widgets/android/RitualChecklistWidget.tsx`
- `widgets/android/TodayPlanWidget.tsx`
- `widgets/android/WeeklyProgressWidget.tsx`
- `widgets/android/QuoteWidget.tsx`
- `widgets/android/ActiveCoachWidget.tsx`
- `widgets/android/CreditBalanceWidget.tsx`
- `widgets/android/shared/colors.ts` (shared color themes for widgets)
- `widgets/android/shared/types.ts` (shared widget data types)
- `assets/widget-previews/*.png` (preview images)
- `index.ts` (new entry point with widget handler registration)

### Modified Files
- `package.json` — upgrade library version + change `main` field
- `app.json` — add widget config plugin
- `widgets/android/widget-task-handler.tsx` — register new widgets + implement data fetching
- `lib/widgetBridge.ts` — add sync methods for new widget types
- `app/_layout.tsx` — add AppState listener for widget sync
- Ritual completion handlers — add widget sync calls
- Plan update handlers — add widget sync calls
- Session end handlers — add widget sync calls

---

## Key Technical Decisions

1. **Library choice:** Stay with `react-native-android-widget` (v0.20.1). Don't switch to `expo-widgets` yet — it's iOS-only in SDK 54 and Android support is still in development for SDK 55+.

2. **Data layer:** SharedPreferences (not AsyncStorage) for widget data. Widgets run in a separate process and can't access AsyncStorage.

3. **Update strategy:** Hybrid — `updatePeriodMillis` for periodic refresh + explicit `requestWidgetUpdate` on app events.

4. **Interaction model:** Support direct-from-widget actions (ritual toggle, priority check) to maximize engagement without requiring app open.

5. **Theme system:** Default to dark theme (matches app's premium aesthetic). Configurable themes as a Phase 3 enhancement.

---

## Sources

- [react-native-android-widget Documentation](https://saleksovski.github.io/react-native-android-widget/)
- [react-native-android-widget GitHub](https://github.com/sAleksovski/react-native-android-widget)
- [Expo Config Plugin for Widgets](https://saleksovski.github.io/react-native-android-widget/docs/tutorial/register-widget-expo)
- [Handling Clicks in Widgets](https://saleksovski.github.io/react-native-android-widget/docs/handling-clicks)
- [Jetpack Glance Best Practices](https://developer.android.com/develop/ui/compose/glance)
- [SoundCloud Widget Case Study — 2× engagement](https://android-developers.googleblog.com/2025/02/soundcloud-uses-jetpack-glance-to-build-liked-tracks-widget-in-just-2-weeks.html)
- [Android Widget Update Patterns](https://saleksovski.github.io/react-native-android-widget/docs/update-widget)
- [Expo SDK 54 Changelog](https://expo.dev/changelog/sdk-54)
- [Building Dynamic Home Screen Widgets in React Native 2025](https://medium.com/@faheem.tfora/building-dynamic-home-screen-widgets-in-react-native-android-ios-complete-2025-dc060feacddc)
