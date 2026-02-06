---
inclusion: auto
fileMatchPattern: "**/*.{tsx,ts}"
---

# Premium UI/UX Implementation Guidelines

## Context

You are implementing a premium UI/UX renewal for Coachgenie, an AI-powered coaching mobile app. The goal is to transform the app from functional to premium while maintaining its editorial + tactile design direction.

## Core Principles

### 1. Editorial Luxury
- Magazine-quality layouts with generous whitespace
- Serif typography (Georgia) for headlines and display text
- Sans-serif (Avenir Next) for body and UI elements
- High-quality imagery and iconography

### 2. Tactile Confidence
- Every interaction must feel responsive and intentional
- Use spring physics for natural motion
- Haptic feedback for important actions
- Smooth transitions between states

### 3. Calm Sophistication
- Premium without being loud or flashy
- Warm color palette (oatmeal, brass gold, midnight emerald)
- Subtle gradients and shadows
- Purposeful use of accent colors

### 4. Accessible Excellence
- WCAG AA minimum contrast ratios (4.5:1 for text)
- Touch targets ≥ 44x44px
- Support for dynamic type
- Reduced motion support

## Design System Usage

### Colors
Always use theme tokens from `constants/theme.ts`:
- **Surfaces**: `Colors.warmOatmeal`, `Colors.cardBg`, `Colors.white`
- **Text**: `Colors.midnightEmerald`, `Colors.charcoal`, `Colors.stoneGray`
- **Accent**: `Colors.burnishedGold`, `Colors.goldLight`
- **Semantic**: `Colors.success`, `Colors.warning`, `Colors.error`

### Typography
Use Typography tokens for consistency:
- **Display**: `Typography.sizes.display` (36px) or `Typography.sizes.hero` (44px)
- **Headlines**: `Typography.sizes.headline` (28px)
- **Titles**: `Typography.sizes.title` (22px)
- **Body**: `Typography.sizes.body` (15px) or `Typography.sizes.bodyLarge` (17px)
- **Captions**: `Typography.sizes.caption` (12px)

### Spacing
Use Spacing tokens for rhythm:
- **Micro**: `Spacing.xs` (4px), `Spacing.sm` (8px)
- **Standard**: `Spacing.md` (12px), `Spacing.lg` (16px), `Spacing.xl` (20px)
- **Large**: `Spacing.xxl` (24px), `Spacing.xxxl` (32px)
- **Sections**: `Spacing.section` (40px), `Spacing.hero` (48px)

### Shadows
Use Shadow presets for depth:
- **Subtle**: `Shadows.subtle` - minimal elevation
- **Small**: `Shadows.sm` - cards on background
- **Medium**: `Shadows.md` - elevated cards
- **Large**: `Shadows.lg` - modals and overlays
- **Gold**: `Shadows.gold` - premium elements

### Radius
Use Radius tokens for consistency:
- **Small**: `Radius.sm` (8px), `Radius.md` (12px)
- **Medium**: `Radius.lg` (16px), `Radius.xl` (20px)
- **Large**: `Radius.squircle` (28px)
- **Pill**: `Radius.pill` (100px)

## Component Guidelines

### Button
```typescript
import { Button } from '@/components/ui/Button';

// Primary action
<Button 
  title="Continue" 
  onPress={handlePress} 
  variant="gold" 
  size="lg" 
  fullWidth 
/>

// Secondary action
<Button 
  title="Cancel" 
  onPress={handleCancel} 
  variant="outline" 
  size="md" 
/>

// Ghost action
<Button 
  title="Learn More" 
  onPress={handleLearnMore} 
  variant="ghost" 
/>
```

**Rules**:
- Use `gold` variant for primary CTAs
- Use `outline` for secondary actions
- Use `ghost` for tertiary actions
- Always provide `fullWidth` for mobile primary actions
- Include loading states for async actions

### Card
```typescript
import { Card } from '@/components/ui/Card';

// Elevated card
<Card variant="elevated" padding="lg">
  {content}
</Card>

// Glass card
<Card variant="glass" padding="md">
  {content}
</Card>

// Tappable card
<Card variant="elevated" onPress={handlePress}>
  {content}
</Card>
```

**Rules**:
- Use `elevated` for important content
- Use `glass` for overlays and floating elements
- Use `gold` variant sparingly for premium features
- Always provide `onPress` if card is interactive

### Input
```typescript
import { Input } from '@/components/ui/Input';

<Input
  label="Email"
  placeholder="your@email.com"
  value={email}
  onChangeText={setEmail}
  keyboardType="email-address"
  autoCapitalize="none"
  error={emailError}
/>
```

**Rules**:
- Always provide labels for accessibility
- Use appropriate keyboard types
- Show error states clearly
- Provide helpful placeholder text

## Animation Guidelines

### Spring Physics
Use spring animations for natural motion:
```typescript
import { withSpring } from 'react-native-reanimated';
import { Timing } from '@/constants/theme';

// Gentle spring (default)
scale.value = withSpring(1, Timing.springGentle);

// Bouncy spring (playful)
scale.value = withSpring(1, Timing.springBouncy);
```

### Timing
Use timing presets for consistency:
- **Instant**: `Timing.instant` (100ms) - immediate feedback
- **Fast**: `Timing.fast` (180ms) - quick transitions
- **Normal**: `Timing.normal` (320ms) - standard animations
- **Slow**: `Timing.slow` (460ms) - dramatic reveals
- **Elegant**: `Timing.elegant` (640ms) - premium transitions

### Staggered Animations
For lists and grids:
```typescript
import { StaggeredFadeIn } from '@/components/ui/AnimatedContainer';

{items.map((item, index) => (
  <StaggeredFadeIn key={item.id} index={index} baseDelay={200} staggerDelay={80}>
    <ItemCard item={item} />
  </StaggeredFadeIn>
))}
```

## Haptic Feedback

Use haptics for important interactions:
```typescript
import * as Haptics from 'expo-haptics';

// Light tap (navigation, selection)
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

// Medium press (buttons, actions)
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

// Heavy action (destructive, important)
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

// Success notification
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

// Error notification
Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
```

## Screen Layout Patterns

### Hero Section
```typescript
<View style={styles.heroSection}>
  <Text style={styles.heroTitle}>Welcome back</Text>
  <Text style={styles.heroSubtitle}>Continue your journey</Text>
</View>

const styles = StyleSheet.create({
  heroSection: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.hero,
    paddingBottom: Spacing.section,
  },
  heroTitle: {
    fontSize: Typography.sizes.display,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    color: Colors.midnightEmerald,
    letterSpacing: Typography.letterSpacing.tight,
  },
  heroSubtitle: {
    fontSize: Typography.sizes.bodyLarge,
    color: Colors.stoneGray,
    marginTop: Spacing.sm,
  },
});
```

### Section Pattern
```typescript
<View style={styles.section}>
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionTitle}>Section Title</Text>
    <Text style={styles.sectionSubtitle}>Optional subtitle</Text>
  </View>
  <View style={styles.sectionContent}>
    {content}
  </View>
</View>

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: Spacing.xxl,
    marginBottom: Spacing.section,
  },
  sectionHeader: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    color: Colors.charcoal,
  },
  sectionSubtitle: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
    marginTop: Spacing.xs,
  },
  sectionContent: {
    gap: Spacing.md,
  },
});
```

## Common Patterns

### Loading States
```typescript
import { GoldDustLoader } from '@/components/ui/GoldDustLoader';

{isLoading ? (
  <View style={styles.loadingContainer}>
    <GoldDustLoader 
      message="Loading" 
      subMessage="Please wait..." 
      size="lg" 
    />
  </View>
) : (
  <Content />
)}
```

### Empty States
```typescript
<View style={styles.emptyState}>
  <Ionicons name="folder-open-outline" size={64} color={Colors.stoneGray} />
  <Text style={styles.emptyTitle}>No items yet</Text>
  <Text style={styles.emptySubtitle}>Get started by adding your first item</Text>
  <Button 
    title="Add Item" 
    onPress={handleAdd} 
    variant="gold" 
    style={styles.emptyButton} 
  />
</View>
```

### Error States
```typescript
<View style={styles.errorContainer}>
  <Ionicons name="alert-circle" size={16} color={Colors.error} />
  <Text style={styles.errorText}>{error}</Text>
</View>

const styles = StyleSheet.create({
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.errorLight,
    padding: Spacing.md,
    borderRadius: Radius.md,
    gap: Spacing.sm,
  },
  errorText: {
    fontSize: Typography.sizes.body,
    color: Colors.error,
    flex: 1,
  },
});
```

## Performance Considerations

### Animation Performance
- Use `useNativeDriver: true` when possible
- Avoid animating layout properties (width, height, padding)
- Prefer transform and opacity animations
- Use `shouldRasterizeIOS` for complex views

### Image Optimization
- Use appropriate image sizes
- Implement lazy loading for lists
- Use `expo-image` for better performance
- Provide placeholder images

### List Performance
- Use `FlatList` or `FlashList` for long lists
- Implement `getItemLayout` for fixed-height items
- Use `removeClippedSubviews` on Android
- Implement pagination for large datasets

## Testing Checklist

Before considering a component or screen complete:

- [ ] Visual design matches premium standards
- [ ] All touch targets are ≥ 44x44px
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] Animations are smooth (60fps)
- [ ] Haptic feedback is appropriate
- [ ] Loading states are implemented
- [ ] Error states are handled
- [ ] Empty states are designed
- [ ] Works on iOS and Android
- [ ] Tested on multiple screen sizes
- [ ] Accessibility labels are provided
- [ ] Reduced motion is supported

## Common Mistakes to Avoid

1. **Don't mix color values**: Always use theme tokens, never hardcode colors
2. **Don't skip haptics**: Every important interaction needs haptic feedback
3. **Don't use generic animations**: Use spring physics and timing presets
4. **Don't ignore accessibility**: Test with screen readers and dynamic type
5. **Don't over-animate**: Less is more, be purposeful
6. **Don't forget loading states**: Every async action needs a loading state
7. **Don't use tiny touch targets**: Minimum 44x44px always
8. **Don't skip error handling**: Every action can fail, handle it gracefully

## Resources

- **Design System**: `constants/theme.ts`
- **Components**: `components/ui/`
- **Examples**: `app/(tabs)/index.tsx` (home screen reference)
- **Animation**: React Native Reanimated 2 docs
- **Haptics**: Expo Haptics docs
- **Accessibility**: React Native Accessibility Guide

---

**Remember**: Premium is in the details. Every pixel, every animation, every interaction matters. Take the time to get it right.
