# Design Document: Premium UI/UX Renewal

## Overview

This design document outlines the comprehensive premium UI/UX renewal for the Coachgenie mobile application. The renewal transforms the app from functional to premium while maintaining its editorial + tactile design direction. The implementation focuses on refining visual design, enhancing micro-interactions, improving navigation patterns, and adding premium details throughout the application.

### Design Philosophy

The premium renewal is guided by three core principles:

1. **Editorial Luxury**: Magazine-quality layouts with generous whitespace, serif typography for display text, and high-quality visual treatments
2. **Tactile Confidence**: Every interaction feels responsive and intentional with spring physics, haptic feedback, and smooth transitions
3. **Calm Sophistication**: Premium without being loud, using warm colors, subtle gradients, and purposeful accent usage

### Technology Stack

- **Framework**: React Native (Expo)
- **Animation**: React Native Reanimated 2
- **Haptics**: Expo Haptics
- **Navigation**: Expo Router
- **Styling**: StyleSheet with design tokens
- **Gradients**: Expo Linear Gradient
- **Icons**: Expo Vector Icons (Ionicons)

## Architecture

### Component Hierarchy

```
App
├── Theme Provider (Atmosphere System)
├── Navigation Container
│   ├── Tab Navigator
│   │   ├── Home Screen
│   │   ├── Coaches Screen
│   │   ├── Rituals Screen
│   │   ├── Archive Screen
│   │   └── Vault Screen
│   ├── Modal Screens
│   │   ├── Chat Screen
│   │   ├── Coach Detail Screen
│   │   ├── Ritual Detail Screen
│   │   └── Account Screen
│   └── Onboarding Flow
└── Shared Components
    ├── UI Components (Button, Card, Input, etc.)
    ├── Animation Wrappers
    ├── Loading States
    ├── Empty States
    └── Error States
```

### Design System Structure

The design system is centralized in `constants/theme.ts` and provides:

- **Colors**: Semantic color tokens for all UI elements
- **Typography**: Font families, sizes, weights, and text styles
- **Spacing**: Consistent spacing scale from xs (4px) to hero (48px)
- **Radius**: Border radius tokens from xs (4px) to full (9999px)
- **Shadows**: Elevation presets from subtle to xxl
- **Timing**: Animation duration and spring physics presets
- **Gradients**: Predefined gradient combinations
- **Text Styles**: Complete text style presets

### Atmosphere Theme System

The app supports multiple atmosphere themes that provide complete color palette swaps:

1. **Original**: Warm oatmeal and burnished gold (default, free)
2. **Midnight Gallery**: Dark mode with champagne silver (premium)
3. **Botanist**: Sage and bronze nature-inspired (premium)
4. **Architect**: Minimalist bone white and chrome (free)
5. **Desert Solstice**: Terracotta and sun-bleached clay (premium)

Each atmosphere provides:
- Complete color palette
- Status bar style
- Tab bar styling
- Shadow colors
- Glow intensity

## Components and Interfaces

### Core UI Components

#### Button Component

**Interface:**
```typescript
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'gold' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  success?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  haptic?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}
```

**Behavior:**
- Provides spring-based press animation (scale 0.97)
- Triggers haptic feedback on press (medium for primary/gold, light for others)
- Shows loading spinner when `loading` is true
- Disables interaction when `disabled` or `loading`
- Supports gradient backgrounds for gold and primary variants
- Minimum touch target: 44x44px (enforced by minHeight)

**States:**
- Default: Full opacity, scale 1
- Pressed: Scale 0.97, opacity 0.9
- Disabled: Opacity 0.4
- Loading: Shows ActivityIndicator
- Success: Bounce animation (scale 1.05 → 1)

#### Card Component

**Interface:**
```typescript
interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'glass' | 'gold';
  padding?: keyof typeof Spacing;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}
```

**Behavior:**
- Provides elevation shadows based on variant
- Supports press animation when `onPress` is provided
- Glass variant uses translucent background with blur effect
- Gold variant uses gold border and gold shadow

**Variants:**
- **default**: Basic card with subtle shadow
- **elevated**: Enhanced shadow for prominence
- **glass**: Translucent with glass morphism effect
- **gold**: Premium styling with gold accents

#### Input Component

**Interface:**
```typescript
interface InputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  multiline?: boolean;
  numberOfLines?: number;
}
```

**Behavior:**
- Animates border color on focus (transitions to gold)
- Displays error state with red border and error message
- Shows icon on the left if provided
- Minimum height: 56px for accessibility

**States:**
- Default: Border color from theme
- Focused: Gold border, label scales to 0.95
- Error: Red border, error background, error icon
- Disabled: Reduced opacity

#### Progress Ring Component

**Interface:**
```typescript
interface ProgressRingProps {
  progress: number; // 0-100
  size: number;
  strokeWidth: number;
  label: string;
  sublabel?: string;
  color?: string;
}
```

**Behavior:**
- Animates progress changes with spring physics
- Displays percentage in center
- Shows label and optional sublabel below percentage
- Uses SVG for smooth rendering

### Animation Components

#### StaggeredFadeIn

**Interface:**
```typescript
interface StaggeredFadeInProps {
  children: React.ReactNode;
  index: number;
  baseDelay?: number;
  staggerDelay?: number;
}
```

**Behavior:**
- Fades in with upward slide animation
- Delay calculated as: `baseDelay + (index * staggerDelay)`
- Default staggerDelay: 80ms
- Duration: 500ms

#### Spring Press Animation Hook

**Interface:**
```typescript
function useSpringPress(): {
  animatedStyle: AnimatedStyle;
  handlePressIn: () => void;
  handlePressOut: () => void;
}
```

**Behavior:**
- Returns animated style and press handlers
- Scale animates to 0.97 on press, back to 1 on release
- Uses gentle spring physics (damping: 24, stiffness: 92)

### Loading States

#### GoldDustLoader

**Interface:**
```typescript
interface GoldDustLoaderProps {
  message?: string;
  subMessage?: string;
  size?: 'sm' | 'md' | 'lg';
}
```

**Behavior:**
- Displays ActivityIndicator with gold color
- Shows message and optional sub-message
- Fades in with 300ms duration
- Centers content vertically and horizontally

#### Skeleton Screen

**Interface:**
```typescript
interface SkeletonProps {
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}
```

**Behavior:**
- Displays placeholder with shimmer animation
- Shimmer moves from left to right
- Uses gold shimmer color with opacity animation
- Duration: 1500ms loop

### Empty States

#### EmptyState Component

**Interface:**
```typescript
interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  ctaLabel?: string;
  onCtaPress?: () => void;
}
```

**Behavior:**
- Displays large icon (64px) with reduced opacity
- Shows title and subtitle with appropriate typography
- Optional CTA button at bottom
- Fades in with 400ms duration

### Error States

#### ErrorBanner Component

**Interface:**
```typescript
interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}
```

**Behavior:**
- Displays error message with error icon
- Shows retry button if `onRetry` provided
- Shows dismiss button if `onDismiss` provided
- Uses error color with appropriate contrast
- Triggers error haptic feedback on mount

## Data Models

### Atmosphere Palette

```typescript
interface AtmospherePalette {
  // Primary backgrounds
  background: string;
  backgroundSecondary: string;
  cardBg: string;

  // Text colors
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;

  // Accent colors
  accent: string;
  accentLight: string;
  accentMuted: string;
  accentShimmer: string;

  // Functional colors
  success: string;
  successLight: string;
  warning: string;
  warningLight: string;
  error: string;
  errorLight: string;

  // UI elements
  border: string;
  borderAccent: string;
  borderLight: string;

  // Glass effects
  glassBg: string;
  glassBlur: string;
  glassBorder: string;

  // Overlays
  overlay: string;
  overlayLight: string;

  // Chat
  userMessage: string;
  aiMessage: string;

  // Gradients
  gradientStart: string;
  gradientEnd: string;

  // Status bar
  statusBarStyle: 'light' | 'dark';

  // Tab bar
  tabBarBg: string;
  tabBarActive: string;
  tabBarInactive: string;

  // Shadows
  shadowColor: string;

  // Glow intensity
  glowIntensity: number;
}
```

### Animation Configuration

```typescript
interface SpringConfig {
  damping: number;
  stiffness: number;
  mass: number;
}

interface TimingConfig {
  instant: number;    // 100ms
  fast: number;       // 180ms
  normal: number;     // 320ms
  slow: number;       // 460ms
  elegant: number;    // 640ms
  dramatic: number;   // 920ms
  spring: SpringConfig;
  springGentle: SpringConfig;
  springBouncy: SpringConfig;
}
```

### Component State

```typescript
interface InteractiveState {
  isPressed: boolean;
  isDisabled: boolean;
  isLoading: boolean;
  isFocused: boolean;
  hasError: boolean;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I've identified the following testable properties. I've eliminated redundancy by combining similar properties:

- Properties 1.4, 15.2 are the same (WCAG contrast) → Combined into Property 1
- Properties 5.4, 15.7, 18.6 are the same (touch targets) → Combined into Property 2
- Properties 2.9, 15.6 are the same (reduced motion) → Combined into Property 3
- Properties 5.5, 20.1 are similar (component states) → Combined into Property 4
- Properties 12.5, 19.4 are the same (premium indication) → Combined into Property 5

### Visual Design Properties

**Property 1: Color Contrast Compliance**
*For any* text element and its background color from the theme palette, the contrast ratio should be at least 4.5:1 to meet WCAG AA standards
**Validates: Requirements 1.4, 15.2**

### Interaction Properties

**Property 2: Touch Target Accessibility**
*For any* interactive element (button, card with onPress, input, toggle), the minimum touch target dimensions should be 44x44 pixels
**Validates: Requirements 5.4, 15.7, 18.6**

**Property 3: Reduced Motion Support**
*For any* decorative animation, when reduced motion preference is enabled, the animation should be disabled or replaced with an instant transition
**Validates: Requirements 2.9, 15.6**

**Property 4: Interactive State Completeness**
*For any* interactive component (button, input, card), all required states (default, pressed/focused, disabled, loading where applicable) should be implemented
**Validates: Requirements 5.5, 20.1, 20.2**

**Property 5: Spring Animation Physics**
*For any* press animation, the animation should use spring physics configuration rather than linear timing
**Validates: Requirements 2.6**

**Property 6: Haptic Feedback Consistency**
*For any* button press, haptic feedback should be triggered with intensity appropriate to the button variant (medium for primary/gold/danger, light for others)
**Validates: Requirements 2.2**

**Property 7: Destructive Action Haptics**
*For any* destructive action (delete, remove, clear), heavy haptic feedback should be triggered
**Validates: Requirements 2.7**

**Property 8: Success Action Haptics**
*For any* success action (complete, save, submit successfully), success haptic notification should be triggered
**Validates: Requirements 2.8**

**Property 9: Input Focus Animation**
*For any* input field, focusing the input should trigger a border color animation to the accent color
**Validates: Requirements 2.5**

**Property 10: Staggered List Animation**
*For any* list of items with staggered animation, each item's delay should increase by the stagger delay amount (default 80ms)
**Validates: Requirements 6.3**

### Loading State Properties

**Property 11: Long Loading Message**
*For any* loading operation, if loading exceeds 2 seconds, a descriptive message should be displayed
**Validates: Requirements 3.2**

**Property 12: Button Loading State**
*For any* button with async action, setting loading state to true should display an inline loading indicator and disable interaction
**Validates: Requirements 3.3**

**Property 13: Async Component Loading**
*For any* component with async data, a loading state should be implemented and displayed while data is fetching
**Validates: Requirements 5.6**

### Navigation Properties

**Property 14: Scroll Position Preservation**
*For any* screen with scrollable content, navigating away and back should preserve the scroll position
**Validates: Requirements 4.6**

**Property 15: Time-Based Content**
*For any* time-sensitive content (morning/evening rituals), the displayed content should change based on the current time of day
**Validates: Requirements 6.7**

### Screen-Specific Properties

**Property 16: Coach Card Haptics**
*For any* coach card tap, medium haptic feedback should be triggered
**Validates: Requirements 7.2**

**Property 17: Message Animation**
*For any* new message sent in chat, the message should animate in with a slide-up transition
**Validates: Requirements 8.3**

**Property 18: Typing Indicator**
*For any* AI response in progress, a typing indicator with animated dots should be displayed
**Validates: Requirements 8.4**

**Property 19: Ritual Completion Haptics**
*For any* ritual completion action, success haptic feedback should be triggered
**Validates: Requirements 9.2**

**Property 20: Milestone Celebration**
*For any* streak milestone reached (7, 14, 30, 100 days), a celebration animation should be triggered
**Validates: Requirements 9.6**

**Property 21: Archive Search Instant Feedback**
*For any* search query in the archive, results should update instantly as the user types (debounced by max 300ms)
**Validates: Requirements 10.2**

**Property 22: Onboarding Completion Haptics**
*For any* onboarding completion, celebration animation and success haptic feedback should be triggered
**Validates: Requirements 11.6**

**Property 23: Settings Change Feedback**
*For any* setting change, immediate visual feedback should be provided (animation, state update, or confirmation)
**Validates: Requirements 12.3**

**Property 24: Toggle Haptics**
*For any* toggle switch interaction, light haptic feedback should be triggered
**Validates: Requirements 12.6**

**Property 25: Modal Swipe Dismiss**
*For any* dismissible modal, swiping down should dismiss the modal with appropriate animation
**Validates: Requirements 13.7**

### Error Handling Properties

**Property 26: Error Message Display**
*For any* error that occurs, an error message with clear explanation should be displayed to the user
**Validates: Requirements 14.1**

**Property 27: Form Error Highlighting**
*For any* form validation error, the specific field with the error should be highlighted with error styling
**Validates: Requirements 14.3**

**Property 28: Error Haptic Feedback**
*For any* critical error, error haptic feedback should be triggered
**Validates: Requirements 14.6**

### Accessibility Properties

**Property 29: Accessibility Labels**
*For any* interactive element, an accessibility label should be provided for screen readers
**Validates: Requirements 15.1**

**Property 30: Dynamic Type Support**
*For any* text content, the text should scale appropriately when system font size is changed
**Validates: Requirements 15.3**

**Property 31: Image Alternative Text**
*For any* meaningful image, alternative text should be provided for screen readers
**Validates: Requirements 15.4**

### Performance Properties

**Property 32: Instant Interaction Feedback**
*For any* user interaction, immediate visual feedback should be provided before any async operation completes
**Validates: Requirements 16.7**

**Property 33: Achievement Animation**
*For any* achievement moment (streak milestone, goal completion, level up), a celebration animation should be triggered
**Validates: Requirements 17.7**

### Responsive Design Properties

**Property 34: Layout Adaptation**
*For any* screen, the layout should adapt appropriately when screen size changes (orientation, different devices)
**Validates: Requirements 18.1**

**Property 35: Safe Area Handling**
*For any* screen, safe area insets should be respected to avoid content being obscured by notches or system UI
**Validates: Requirements 18.4**

**Property 36: Grid Column Adaptation**
*For any* grid layout, the number of columns should adapt based on screen width (1 column for small, 2 for medium, 3+ for large)
**Validates: Requirements 18.5**

### Theme System Properties

**Property 37: Atmosphere Persistence**
*For any* atmosphere selection, the selected atmosphere should persist across app sessions (stored and restored)
**Validates: Requirements 19.3**

**Property 38: Premium Atmosphere Prompt**
*For any* premium atmosphere selection by a non-premium user, an upgrade prompt should be displayed
**Validates: Requirements 19.5**

**Property 39: Status Bar Style Update**
*For any* atmosphere change, the status bar style should update to match the atmosphere's specified style (light or dark)
**Validates: Requirements 19.7**

### State Management Properties

**Property 40: Loading State Interaction Blocking**
*For any* component in loading state, user interactions should be disabled until loading completes
**Validates: Requirements 20.4**

**Property 41: Rapid Interaction Handling**
*For any* interactive component, rapid successive interactions should not break the component state or cause errors
**Validates: Requirements 20.6**

## Error Handling

### Error Categories

1. **Network Errors**: API failures, timeout, no connection
2. **Validation Errors**: Form input validation, data format errors
3. **Authentication Errors**: Login failures, session expiration
4. **Permission Errors**: Missing permissions for features
5. **Data Errors**: Missing or corrupted data
6. **System Errors**: Unexpected crashes, out of memory

### Error Handling Strategy

**Network Errors:**
- Display error banner with retry button
- Show offline indicator in status bar
- Cache last successful data when possible
- Provide clear messaging about connection issues

**Validation Errors:**
- Highlight specific field with error
- Display inline error message below field
- Prevent form submission until errors resolved
- Provide helpful validation hints

**Authentication Errors:**
- Redirect to login screen
- Preserve navigation state for return
- Display clear message about session expiration
- Offer quick re-authentication

**Permission Errors:**
- Display modal explaining permission need
- Provide button to open system settings
- Offer alternative flows when possible
- Gracefully degrade features

**Data Errors:**
- Display empty state with explanation
- Offer refresh or retry action
- Log error for debugging
- Provide fallback content when possible

**System Errors:**
- Catch with error boundary
- Display friendly error screen
- Offer app restart option
- Log error details for debugging

### Error UI Components

**ErrorBanner:**
- Appears at top of screen
- Red background with white text
- Shows error icon and message
- Includes retry button when applicable
- Auto-dismisses after 5 seconds (unless persistent)

**InlineError:**
- Appears below form field
- Red text with error icon
- Concise error message
- Animates in with slide-down

**ErrorScreen:**
- Full-screen error state
- Large error icon
- Error title and description
- Primary action button (retry, go home, etc.)
- Secondary action (contact support)

## Testing Strategy

### Dual Testing Approach

The premium UI/UX renewal requires both unit testing and property-based testing for comprehensive coverage:

**Unit Tests:**
- Specific examples of component rendering
- Edge cases (empty states, error states, loading states)
- Integration points between components
- User interaction flows
- Accessibility features

**Property-Based Tests:**
- Universal properties across all inputs
- Component state transitions
- Animation configurations
- Theme system consistency
- Accessibility compliance

### Property-Based Testing Configuration

**Library**: fast-check (JavaScript/TypeScript property-based testing)

**Configuration:**
- Minimum 100 iterations per property test
- Each test references its design document property
- Tag format: `Feature: premium-ui-ux-renewal, Property {number}: {property_text}`

**Example Property Test:**
```typescript
import fc from 'fast-check';

// Feature: premium-ui-ux-renewal, Property 2: Touch Target Accessibility
describe('Touch Target Accessibility', () => {
  it('should ensure all interactive elements have minimum 44x44px touch targets', () => {
    fc.assert(
      fc.property(
        fc.record({
          variant: fc.constantFrom('primary', 'secondary', 'ghost', 'outline', 'gold'),
          size: fc.constantFrom('sm', 'md', 'lg'),
        }),
        (props) => {
          const button = renderButton(props);
          const dimensions = button.measure();
          expect(dimensions.width).toBeGreaterThanOrEqual(44);
          expect(dimensions.height).toBeGreaterThanOrEqual(44);
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Unit Testing Focus Areas

**Component Rendering:**
- Button variants render correctly
- Card variants apply correct styles
- Input states display appropriately
- Loading states show indicators
- Empty states display messaging
- Error states show error UI

**User Interactions:**
- Button press triggers onPress callback
- Input focus triggers focus handlers
- Card press triggers onPress when provided
- Toggle switches change state
- Modal dismiss works correctly

**Animation Behavior:**
- Press animations use spring physics
- Staggered animations have correct delays
- Loading animations loop continuously
- Transition animations complete

**Accessibility:**
- All interactive elements have labels
- Images have alternative text
- Text meets contrast requirements
- Touch targets meet minimum size
- Dynamic type scales text

**Theme System:**
- Atmosphere changes apply palette
- Theme persists across sessions
- Premium atmospheres show upgrade prompt
- Status bar updates with theme

### Testing Tools

- **Jest**: Unit test runner
- **React Native Testing Library**: Component testing
- **fast-check**: Property-based testing
- **jest-axe**: Accessibility testing
- **@testing-library/react-hooks**: Hook testing

### Continuous Integration

- Run all tests on every commit
- Require 80% code coverage minimum
- Run property tests with 100 iterations
- Test on both iOS and Android simulators
- Run accessibility audits
- Performance benchmarks for animations

### Manual Testing Checklist

- [ ] Test on real iOS device (iPhone 12+)
- [ ] Test on real Android device (Pixel 4+)
- [ ] Test with VoiceOver enabled
- [ ] Test with TalkBack enabled
- [ ] Test with reduced motion enabled
- [ ] Test with large text size
- [ ] Test with different screen sizes
- [ ] Test all atmosphere themes
- [ ] Test offline scenarios
- [ ] Test error scenarios
- [ ] Test loading states
- [ ] Test empty states
- [ ] Verify haptic feedback on device
- [ ] Verify animations are smooth (60fps)
- [ ] Verify touch targets are comfortable
- [ ] Verify color contrast in all themes

## Implementation Notes

### Animation Performance

- Use `useNativeDriver: true` for transform and opacity animations
- Avoid animating layout properties (width, height, padding, margin)
- Use `shouldRasterizeIOS` for complex animated views
- Implement `getItemLayout` for FlatLists with fixed-height items
- Use `removeClippedSubviews` on Android for long lists

### Haptic Feedback Guidelines

- **Light**: Navigation, selection, minor interactions
- **Medium**: Button presses, important actions
- **Heavy**: Destructive actions, critical confirmations
- **Success**: Achievements, completions, positive outcomes
- **Warning**: Caution states, important notices
- **Error**: Failures, validation errors, critical issues

### Accessibility Best Practices

- Provide meaningful accessibility labels
- Use semantic HTML-like components
- Ensure proper focus order
- Support keyboard navigation
- Provide alternative text for images
- Use ARIA-like props appropriately
- Test with screen readers
- Support dynamic type
- Respect reduced motion
- Maintain color contrast

### Performance Optimization

- Lazy load images with expo-image
- Implement pagination for long lists
- Use FlashList for better list performance
- Memoize expensive computations
- Avoid inline function creation in renders
- Use React.memo for pure components
- Implement proper key props for lists
- Debounce search inputs
- Throttle scroll handlers
- Cache API responses appropriately

### Code Organization

- Keep components small and focused
- Extract reusable logic into hooks
- Use design tokens exclusively (no hardcoded values)
- Organize styles with StyleSheet.create
- Group related components in folders
- Maintain consistent file naming
- Document complex logic with comments
- Use TypeScript for type safety

### Design Token Usage

Always use design tokens from `constants/theme.ts`:

```typescript
// ✅ Correct
<View style={{ backgroundColor: Colors.warmOatmeal }} />
<Text style={{ fontSize: Typography.sizes.body }} />
<View style={{ padding: Spacing.lg }} />

// ❌ Incorrect
<View style={{ backgroundColor: '#F7F4EE' }} />
<Text style={{ fontSize: 15 }} />
<View style={{ padding: 16 }} />
```

### Spring Physics Configuration

Use predefined spring configurations:

```typescript
// Gentle spring (default for most interactions)
scale.value = withSpring(1, Timing.springGentle);

// Bouncy spring (for playful interactions)
scale.value = withSpring(1, Timing.springBouncy);

// Standard spring (for balanced motion)
scale.value = withSpring(1, Timing.spring);
```

### Gradient Usage

Use predefined gradients from theme:

```typescript
<LinearGradient
  colors={Gradients.gold}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
>
  {children}
</LinearGradient>
```

### Shadow Application

Use shadow presets for consistency:

```typescript
const styles = StyleSheet.create({
  card: {
    ...Shadows.md,
  },
  floatingButton: {
    ...Shadows.gold,
  },
});
```

## Migration Strategy

### Phase 1: Foundation (Week 1-2)
- Update design tokens with refined values
- Implement core UI components (Button, Card, Input)
- Create animation utilities and hooks
- Set up property-based testing infrastructure

### Phase 2: Screens (Week 3-4)
- Enhance Home screen with new components
- Update Coaches screen with premium gallery
- Refine Chat interface with new message bubbles
- Improve Rituals screen with enhanced cards

### Phase 3: Details (Week 5-6)
- Add loading states throughout
- Implement empty states
- Add error handling UI
- Enhance onboarding flow
- Polish settings and account screens

### Phase 4: Testing & Polish (Week 7-8)
- Write property-based tests
- Write unit tests
- Conduct accessibility audit
- Performance optimization
- Bug fixes and refinements

### Backward Compatibility

- Maintain existing component APIs where possible
- Provide migration guides for breaking changes
- Support gradual adoption of new components
- Keep old components temporarily with deprecation warnings
- Document all breaking changes in CHANGELOG

### Rollout Strategy

- Feature flag new UI components
- A/B test with subset of users
- Gather feedback and iterate
- Gradual rollout to all users
- Monitor performance metrics
- Track user satisfaction scores

## Success Metrics

### Quantitative Metrics

- Animation performance: 60fps maintained
- Touch target compliance: 100% of interactive elements ≥ 44x44px
- Color contrast compliance: 100% of text meets WCAG AA
- Accessibility score: 100% on automated audits
- Test coverage: ≥ 80% code coverage
- Property test pass rate: 100% with 100 iterations

### Qualitative Metrics

- User feedback on premium feel
- App Store rating improvement
- User session duration increase
- Feature discovery improvement
- User satisfaction scores
- Support ticket reduction

### Performance Benchmarks

- App launch time: < 2 seconds
- Screen transition time: < 300ms
- Animation frame rate: 60fps
- Memory usage: < 200MB
- Bundle size increase: < 10%
