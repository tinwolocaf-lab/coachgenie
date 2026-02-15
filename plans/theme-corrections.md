Theme Color Contrast Fix Plan │
│ │
│ Context │
│ │
│ When switching between the 9 atmospheres, text becomes invisible or unreadable in many places. Two root causes: │
│ │
│ 1. Hardcoded colors (#FFFFFF, #243D2E, rgba(0,0,0,...)) that don't adapt to the current atmosphere palette │
│ 2. Two components (ShareCoachModal, ImportCoachCard) completely bypass the palette system — they use useColorScheme() (OS dark mode) with │
│ hardcoded isDark ternary hex values instead of useThemeSafe() │
│ │
│ Key rules for this fix: │
│ - palette.gradientStart/gradientEnd are always dark across ALL 9 themes → white text is always safe on these │
│ - palette.accent varies: dark on light themes, light on dark themes → use palette.textInverse for text on accent backgrounds │
│ - palette.textPrimary is light on dark themes, dark on light themes → NEVER use as a gradient color │
│ │
│ --- │
│ Tier 1: CRITICAL — Text completely invisible on some themes │
│ │
│ 1.1 Fix gradients using textPrimary as gradient start │
│ │
│ On dark themes, textPrimary is light (#F5F5F7), so gradients like [palette.textPrimary, '#243D2E'] create a light→dark gradient with white │
│ overlay text invisible at the top. │
│ │
│ File: app/(tabs)/plan.tsx │
│ Line: 439 │
│ Current: [palette.textPrimary, '#0D1A11'] │
│ Fix: [palette.gradientStart, palette.gradientEnd] │
│ ──────────────────────────────────────── │
│ File: app/archive/index.tsx │
│ Line: 428 │
│ Current: [palette.textPrimary, '#243D2E'] │
│ Fix: [palette.gradientStart, palette.gradientEnd] │
│ ──────────────────────────────────────── │
│ File: app/archive/breakthroughs.tsx │
│ Line: 132 │
│ Current: [palette.textPrimary, '#243D2E'] │
│ Fix: [palette.gradientStart, palette.gradientEnd] │
│ ──────────────────────────────────────── │
│ File: components/sanctuary/SessionEntry.tsx │
│ Line: 144 │
│ Current: [coach.color, palette.textPrimary, '#0D1A11'] │
│ Fix: [coach.color, palette.gradientStart, palette.gradientEnd] │
│ │
│ 1.2 Fix Featured Ritual Card text on accent gradient │
│ │
│ The morning intention uses [palette.accent, palette.accentLight] as gradient. On Midnight Gallery (accent #C4C9D4) and Graphite (accent │
│ #E0E0E0), this is a light gradient with white text → invisible. │
│ │
│ File: app/(tabs)/index.tsx │
│ │
│ 1. Add textColor: string to the ritual config type (~line 95) │
│ 2. Set per ritual: │
│ - Morning intention (accent gradient): textColor: palette.textInverse │
│ - Other rituals (gradientStart/End gradient): textColor: '#FFFFFF' │
│ 3. In FeaturedRitualCard, use ritual.textColor everywhere instead of hardcoded white: │
│ - Line 1020: checkmark #FFFFFF → ritual.textColor │
│ - Line 1027: arrow rgba(255,255,255,0.9) → ritual.textColor with opacity │
│ - StyleSheet lines 1408, 1426: featuredCompletedText, featuredActionText — move to inline │
│ - StyleSheet lines 1011, 1420: icon bg, button bg — move to inline, derive from textColor │
│ │
│ 1.3 Migrate ShareCoachModal to palette system │
│ │
│ This component uses useColorScheme() + isDark ternary with ~20 hardcoded hex color pairs. It completely ignores the app's atmosphere. │
│ │
│ File: components/coaching/ShareCoachModal.tsx │
│ │
│ - Replace useColorScheme() → useThemeSafe() │
│ - Replace all isDark ? '#xxx' : '#yyy' with palette tokens: │
│ - Overlay bg → palette.overlay │
│ - Container bg #2a2a4a/#ffffff → palette.cardBg │
│ - Border #3a3a5a/#f0f0f0 → palette.border │
│ - Title text #e8e8e8/#1a1a2e → palette.textPrimary │
│ - Subtitle text #b0b0d0/#666 → palette.textSecondary │
│ - Muted text #a0a0c0/#999 → palette.textTertiary │
│ - Gold accent #d4af37 → palette.accent │
│ - Error bg #4a2a2a/#fff3f0 → palette.errorLight │
│ - Error border/text #d9534f/#ff9999 → palette.error │
│ - Buttons: primary bg → palette.accent, secondary bg → palette.backgroundSecondary │
│ │
│ 1.4 Migrate ImportCoachCard to palette system │
│ │
│ Same issue as ShareCoachModal — useColorScheme() + isDark ternary with ~20 hardcoded pairs. │
│ │
│ File: components/coaching/ImportCoachCard.tsx │
│ │
│ - Replace useColorScheme() → useThemeSafe() │
│ - Map all isDark ? '#xxx' : '#yyy' to palette tokens (same mapping as 1.3) │
│ │
│ --- │
│ Tier 2: HIGH — Icons/text poor contrast on specific themes │
│ │
│ 2.1 Fix account modal submit button text │
│ │
│ color: '#FFFFFF' on backgroundColor: palette.accent. On Midnight Gallery/Graphite, accent is light → white invisible. │
│ │
│ File: app/account.tsx │
│ - Line 1410: Remove color: '#FFFFFF' from stylesheet │
│ - Line ~955: Add inline { color: palette.textInverse } │
│ │
│ 2.2 Fix PremiumTabBar focused icon/label │
│ │
│ Hardcoded #FFFFFF on accent-colored pill. Broken on dark themes with light accent. │
│ │
│ File: components/ui/PremiumTabBar.tsx │
│ - Lines 203, 209: Replace '#FFFFFF' with a passed prop or palette.textInverse │
│ - Need to pass palette access to the tab items (check how activeColor is already passed) │
│ │
│ 2.3 Fix AlertDialog button text │
│ │
│ #FFFFFF on accent/error gradient buttons. Same issue — accent can be light. │
│ │
│ File: components/ui/AlertDialog.tsx │
│ - Line 56: Change '#FFFFFF' → palette.textInverse │
│ │
│ 2.4 Fix Oracle send button icon │
│ │
│ #FFFFFF on accent-colored button. │
│ │
│ File: app/oracle/index.tsx │
│ - Line 430: Change '#FFFFFF' → palette.textInverse │
│ │
│ 2.5 Fix WisdomGrid hardcoded category colors + white text │
│ │
│ Hardcoded gradient colors per category that don't adapt to theme, plus white text in stylesheet. │
│ │
│ File: components/archive/WisdomGrid.tsx │
│ - Lines 86-89: Replace hardcoded category gradients with palette-derived colors │
│ - Option: Use palette.gradientStart with slight color shifts, or make categories all use the same gradient │
│ - Lines 288, 295, 317, 330, 337, 342, 348: Replace rgba(255,255,255,...) in stylesheet with palette.textInverse at various opacities (move │
│ from stylesheet to inline) │
│ │
│ 2.6 Fix checkmark icons on success backgrounds │
│ │
│ File: app/(tabs)/index.tsx:1129 — #FFFFFF → palette.textInverse │
│ │
│ 2.7 Fix SynthesisReport theme text │
│ │
│ File: components/archive/SynthesisReport.tsx:500 │
│ - color: 'rgba(255,255,255,0.7)' → move to inline, use palette.textInverse with opacity │
│ │
│ --- │
│ Tier 3: MEDIUM — Theme-aware UI refinements │
│ │
│ 3.1 Fix MarkdownText hardcoded backgrounds │
│ │
│ rgba(0,0,0,...) backgrounds invisible on dark themes. │
│ │
│ File: components/ui/MarkdownText.tsx │
│ - Add surfaceBg?: string prop │
│ - Replace rgba(0,0,0,0.08) (lines 290, 472) → use surfaceBg or fallback │
│ - Replace rgba(0,0,0,0.04) (line 376) → lighter surfaceBg │
│ - Replace rgba(0,0,0,0.12) (line 425) → palette border │
│ - Fix mutedColor default rgba(0,0,0,0.55) → callers should pass palette.textTertiary │
│ │
│ Update 7 call sites (4 files) to pass surfaceBg={palette.accentMuted}: │
│ - app/chat/[coachId].tsx (2 sites) │
│ - app/onboarding/session.tsx (2 sites) │
│ - components/sanctuary/EditorialBlock.tsx (3 sites) │
│ - app/archive/session/[id].tsx (2 sites) │
│ │
│ 3.2 Fix EditorialBlock inline insight gradient │
│ │
│ File: components/sanctuary/EditorialBlock.tsx:106 │
│ - 'rgba(197, 160, 89, 0.25)' → palette.accentShimmer (already has the right semantic) │
│ │
│ 3.3 Fix safety banners in chat │
│ │
│ Hardcoded light backgrounds jarring on dark themes. │
│ │
│ File: app/chat/[coachId].tsx:89-108 │
│ - Blocked: bg → palette.errorLight, text → palette.error │
│ - Warning: bg → palette.warningLight, text → palette.warning │
│ - Session cap: bg → palette.accentMuted, text → palette.accent │
│ │
│ 3.4 Fix onboarding coach card selected text │
│ │
│ File: app/onboarding/coach.tsx │
│ - Lines 196, 265: sparkles/checkmark #FFFFFF → palette.textInverse │
│ - Lines 394, 417, 541: stylesheet color: '#FFFFFF' → move to inline with palette │
│ - Lines 401, 547: rgba(255,255,255,...) → derive from palette.textInverse │
│ │
│ 3.5 Fix coach/create.tsx selected icons │
│ │
│ File: app/coach/create.tsx │
│ - Line 301: #FFFFFF → palette.textInverse │
│ - Line 312: checkmark #FFFFFF → palette.textInverse │
│ - Line 327: review icon #FFFFFF → palette.textInverse │
│ │
│ --- │
│ Tier 4: LOW — Subtle polish issues │
│ │
│ 4.1 Fix coaches tab white borders │
│ │
│ File: app/(tabs)/coaches.tsx │
│ - Lines 541, 590, 627, 661: rgba(255,255,255,0.05) → palette.borderLight │
│ - Line 553: rgba(255,255,255,0.03) → palette.borderLight │
│ │
│ 4.2 Fix FeaturedCard border │
│ │
│ File: components/ui/FeaturedCard.tsx:166 │
│ - rgba(255,255,255,0.05) → move to inline, use palette.borderLight │
│ │
│ 4.3 Fix PaywallBanner white overlays │
│ │
│ File: components/PaywallBanner.tsx │
│ - Lines 88, 109: rgba(255,255,255,0.12) and 0.1 → derive from palette.textInverse │
│ │
│ 4.4 Fix GoldenThread/FluidProgressBar shimmer │
│ │
│ These are decorative shimmer effects on accent gradients. White shimmer on light accent = barely visible. │
│ │
│ - components/ui/GoldenThread.tsx:145 — rgba(255,255,255,0.4) → ${palette.textInverse}66 │
│ - components/rituals/FluidProgressBar.tsx:121 — same fix │
│ │
│ 4.5 Fix AtmosphereGallery preview mini-text │
│ │
│ File: components/settings/AtmosphereGallery.tsx:171,179 │
│ - rgba(255,255,255,0.5) → these are inside theme preview cards, may be intentionally showing that specific theme's colors. Verify before │
│ changing. │
│ │
│ 4.6 Fix FilterPills count badge │
│ │
│ File: components/ui/FilterPills.tsx:189 │
│ - rgba(255,255,255,0.2) → ${palette.textInverse}33 (textInverse at 20%) │
│ │
│ 4.7 Fix coach/manage.tsx overlay │
│ │
│ File: app/coach/manage.tsx:408 │
│ - rgba(0,0,0,0.45) → palette.overlay │
│ │
│ --- │
│ NOT changing │
│ │
│ - Evening ritual (app/rituals/evening.tsx): Uses fixed CandlelightPalette, intentionally theme-independent │
│ - GlobalErrorBoundary: Error fallback screen should have reliable fixed colors, not depend on theme context which may be broken │
│ - Gradient overlay text (white on gradientStart/gradientEnd): All gradient values are dark across all themes — white always correct here │
│ │
│ --- │
│ Files to Modify (24 files) │
│ │
│ ┌─────────────────────────────────────────┬──────┬───────────────────────────────┐ │
│ │ File │ Tier │ Summary │ │
│ ├─────────────────────────────────────────┼──────┼───────────────────────────────┤ │
│ │ app/(tabs)/plan.tsx │ 1 │ Gradient colors │ │
│ ├─────────────────────────────────────────┼──────┼───────────────────────────────┤ │
│ │ app/archive/index.tsx │ 1 │ Gradient colors │ │
│ ├─────────────────────────────────────────┼──────┼───────────────────────────────┤ │
│ │ app/archive/breakthroughs.tsx │ 1 │ Gradient colors │ │
│ ├─────────────────────────────────────────┼──────┼───────────────────────────────┤ │
│ │ components/sanctuary/SessionEntry.tsx │ 1 │ Gradient colors │ │
│ ├─────────────────────────────────────────┼──────┼───────────────────────────────┤ │
│ │ app/(tabs)/index.tsx │ 1+2 │ Ritual textColor, checkmarks │ │
│ ├─────────────────────────────────────────┼──────┼───────────────────────────────┤ │
│ │ components/coaching/ShareCoachModal.tsx │ 1 │ Full palette migration │ │
│ ├─────────────────────────────────────────┼──────┼───────────────────────────────┤ │
│ │ components/coaching/ImportCoachCard.tsx │ 1 │ Full palette migration │ │
│ ├─────────────────────────────────────────┼──────┼───────────────────────────────┤ │
│ │ app/account.tsx │ 2 │ Modal submit text │ │
│ ├─────────────────────────────────────────┼──────┼───────────────────────────────┤ │
│ │ components/ui/PremiumTabBar.tsx │ 2 │ Focused icon color │ │
│ ├─────────────────────────────────────────┼──────┼───────────────────────────────┤ │
│ │ components/ui/AlertDialog.tsx │ 2 │ Button text │ │
│ ├─────────────────────────────────────────┼──────┼───────────────────────────────┤ │
│ │ app/oracle/index.tsx │ 2 │ Send button icon │ │
│ ├─────────────────────────────────────────┼──────┼───────────────────────────────┤ │
│ │ components/archive/WisdomGrid.tsx │ 2 │ Category colors + white text │ │
│ ├─────────────────────────────────────────┼──────┼───────────────────────────────┤ │
│ │ components/archive/SynthesisReport.tsx │ 2 │ Theme text color │ │
│ ├─────────────────────────────────────────┼──────┼───────────────────────────────┤ │
│ │ components/ui/MarkdownText.tsx │ 3 │ surfaceBg prop │ │
│ ├─────────────────────────────────────────┼──────┼───────────────────────────────┤ │
│ │ app/chat/[coachId].tsx │ 3 │ Safety banners + MarkdownText │ │
│ ├─────────────────────────────────────────┼──────┼───────────────────────────────┤ │
│ │ components/sanctuary/EditorialBlock.tsx │ 3 │ Gradient + MarkdownText │ │
│ ├─────────────────────────────────────────┼──────┼───────────────────────────────┤ │
│ │ app/onboarding/coach.tsx │ 3 │ Selected card text │ │
│ ├─────────────────────────────────────────┼──────┼───────────────────────────────┤ │
│ │ app/onboarding/session.tsx │ 3 │ MarkdownText surfaceBg │ │
│ ├─────────────────────────────────────────┼──────┼───────────────────────────────┤ │
│ │ app/archive/session/[id].tsx │ 3 │ MarkdownText surfaceBg │ │
│ ├─────────────────────────────────────────┼──────┼───────────────────────────────┤ │
│ │ app/coach/create.tsx │ 3 │ Selected icon colors │ │
│ ├─────────────────────────────────────────┼──────┼───────────────────────────────┤ │
│ │ app/(tabs)/coaches.tsx │ 4 │ White borders │ │
│ ├─────────────────────────────────────────┼──────┼───────────────────────────────┤ │
│ │ components/ui/FeaturedCard.tsx │ 4 │ Border color │ │
│ ├─────────────────────────────────────────┼──────┼───────────────────────────────┤ │
│ │ components/PaywallBanner.tsx │ 4 │ White overlays │ │
│ ├─────────────────────────────────────────┼──────┼───────────────────────────────┤ │
│ │ components/ui/FilterPills.tsx │ 4 │ Count badge │ │
│ ├─────────────────────────────────────────┼──────┼───────────────────────────────┤ │
│ │ components/ui/GoldenThread.tsx │ 4 │ Shimmer color │ │
│ ├─────────────────────────────────────────┼──────┼───────────────────────────────┤ │
│ │ components/rituals/FluidProgressBar.tsx │ 4 │ Shimmer color │ │
│ ├─────────────────────────────────────────┼──────┼───────────────────────────────┤ │
│ │ app/coach/manage.tsx │ 4 │ Overlay color │ │
│ └─────────────────────────────────────────┴──────┴───────────────────────────────┘ │
│ │
│ --- │
│ Verification │
│ │
│ 1. npm run lint — no type/lint errors │
│ 2. npx expo start --ios — test on simulator │
│ 3. Switch through all 9 atmospheres. On EACH theme verify: │
│ - Home: featured ritual card text readable │
│ - Home: checkmarks visible │
│ - Coaches tab: cards render properly, borders visible │
│ - Plan: "Refine with coach" button readable │
│ - Archive: breakthrough cards, wisdom grid, synthesis report — all text readable │
│ - Chat: safety banners themed, markdown blocks visible │
│ - Tab bar: focused tab icon visible against accent pill │
│ - Account: modal submit button text visible │
│ - Coach sharing/import modals: all text readable, properly themed │
│ - Oracle: send button icon visible │
│ 4. Focus on Midnight Gallery and Graphite — these are where most issues surface
