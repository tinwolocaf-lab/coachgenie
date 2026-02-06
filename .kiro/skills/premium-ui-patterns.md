# Premium UI Implementation Patterns

## Overview

This skill provides reusable patterns and code snippets for implementing premium UI/UX in the Coachgenie mobile app. Use these patterns as starting points for consistent, high-quality implementations.

## Component Patterns

### Premium Button with Loading State

```typescript
import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, Radius, Shadows, Timing } from '@/constants/theme';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface PremiumButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'gold' | 'primary' | 'outline';
}

export function PremiumButton({ 
  title, 
  onPress, 
  loading = false, 
  disabled = false,
  variant = 'gold' 
}: PremiumButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, Timing.springGentle);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, Timing.springGentle);
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const gradientColors = variant === 'gold' 
    ? [Colors.burnishedGold, Colors.goldLight]
    : [Colors.midnightEmerald, Colors.charcoal];

  return (
    <AnimatedTouchable
      style={[styles.button, animatedStyle]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={1}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <Text style={styles.buttonText}>{title}</Text>
        )}
      </LinearGradient>
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: Radius.pill,
    overflow: 'hidden',
    ...Shadows.gold,
  },
  gradient: {
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  buttonText: {
    fontSize: Typography.sizes.subtitle,
    fontWeight: Typography.weights.semibold,
    color: Colors.white,
    letterSpacing: Typography.letterSpacing.wide,
  },
});
```

### Elevated Card with Press Animation

```typescript
import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors, Radius, Shadows, Spacing, Timing } from '@/constants/theme';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface ElevatedCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'gold';
}

export function ElevatedCard({ children, onPress, variant = 'default' }: ElevatedCardProps) {
  const scale = useSharedValue(1);
  const elevation = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: -elevation.value * 2 }],
  }));

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withSpring(0.98, Timing.springGentle);
      elevation.value = withSpring(0.5, Timing.springGentle);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, Timing.springGentle);
    elevation.value = withSpring(1, Timing.springGentle);
  };

  const cardStyle = [
    styles.card,
    variant === 'gold' && styles.goldCard,
    animatedStyle,
  ];

  if (onPress) {
    return (
      <AnimatedTouchable
        style={cardStyle}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {children}
      </AnimatedTouchable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...Shadows.lg,
  },
  goldCard: {
    borderColor: Colors.borderGold,
    ...Shadows.gold,
  },
});
```

### Premium Input with Focus Animation

```typescript
import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withTiming, useSharedValue } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Timing } from '@/constants/theme';

interface PremiumInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  secureTextEntry?: boolean;
}

export function PremiumInput({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  icon,
  secureTextEntry,
}: PremiumInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const borderColor = useSharedValue(Colors.border);
  const labelScale = useSharedValue(1);

  const containerStyle = useAnimatedStyle(() => ({
    borderColor: borderColor.value,
  }));

  const labelStyle = useAnimatedStyle(() => ({
    transform: [{ scale: labelScale.value }],
  }));

  const handleFocus = () => {
    setIsFocused(true);
    borderColor.value = withTiming(Colors.burnishedGold, { duration: Timing.fast });
    labelScale.value = withTiming(0.95, { duration: Timing.fast });
  };

  const handleBlur = () => {
    setIsFocused(false);
    borderColor.value = withTiming(Colors.border, { duration: Timing.fast });
    labelScale.value = withTiming(1, { duration: Timing.fast });
  };

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.label, labelStyle]}>
        {label}
      </Animated.Text>
      <Animated.View style={[styles.inputContainer, containerStyle, error && styles.errorContainer]}>
        {icon && (
          <Ionicons 
            name={icon} 
            size={18} 
            color={isFocused ? Colors.burnishedGold : Colors.stoneGray} 
            style={styles.icon}
          />
        )}
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.stoneGray}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={secureTextEntry}
        />
      </Animated.View>
      {error && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle" size={14} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.lg,
  },
  label: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.semibold,
    color: Colors.charcoal,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: Typography.letterSpacing.wider,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.lg,
    minHeight: 56,
  },
  errorContainer: {
    borderColor: Colors.error,
    backgroundColor: Colors.errorLight,
  },
  icon: {
    marginRight: Spacing.md,
  },
  input: {
    flex: 1,
    fontSize: Typography.sizes.bodyLarge,
    color: Colors.charcoal,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: Spacing.xs,
  },
  errorText: {
    fontSize: Typography.sizes.caption,
    color: Colors.error,
  },
});
```

## Screen Patterns

### Hero Section with Animated Greeting

```typescript
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp, useAnimatedStyle, withDelay, withSpring } from 'react-native-reanimated';
import { Colors, Typography, Spacing } from '@/constants/theme';

interface HeroSectionProps {
  greeting: string;
  userName?: string;
  subtitle: string;
}

export function HeroSection({ greeting, userName, subtitle }: HeroSectionProps) {
  return (
    <View style={styles.hero}>
      <Animated.View entering={FadeInUp.duration(600).delay(100)}>
        <Text style={styles.greeting}>
          {greeting}{userName ? ',' : ''}
        </Text>
        {userName && (
          <Text style={styles.userName}>{userName}</Text>
        )}
      </Animated.View>
      <Animated.Text 
        entering={FadeInUp.duration(500).delay(300)} 
        style={styles.subtitle}
      >
        {subtitle}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: Spacing.xxl,
    paddingTop: Spacing.hero,
    paddingBottom: Spacing.section,
  },
  greeting: {
    fontSize: Typography.sizes.display,
    fontWeight: Typography.weights.light,
    fontFamily: Typography.fonts.serif,
    color: Colors.midnightEmerald,
    letterSpacing: Typography.letterSpacing.tight,
  },
  userName: {
    fontSize: Typography.sizes.display,
    fontWeight: Typography.weights.semibold,
    fontFamily: Typography.fonts.serif,
    color: Colors.midnightEmerald,
    letterSpacing: Typography.letterSpacing.tight,
    marginTop: -4,
  },
  subtitle: {
    fontSize: Typography.sizes.bodyLarge,
    color: Colors.stoneGray,
    marginTop: Spacing.md,
    lineHeight: Typography.sizes.bodyLarge * Typography.lineHeights.relaxed,
  },
});
```

### Staggered List Animation

```typescript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Spacing } from '@/constants/theme';

interface StaggeredListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  baseDelay?: number;
  staggerDelay?: number;
}

export function StaggeredList<T>({ 
  items, 
  renderItem, 
  baseDelay = 200, 
  staggerDelay = 80 
}: StaggeredListProps<T>) {
  return (
    <View style={styles.list}>
      {items.map((item, index) => (
        <Animated.View
          key={index}
          entering={FadeInUp.duration(500).delay(baseDelay + index * staggerDelay)}
        >
          {renderItem(item, index)}
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.md,
  },
});
```

### Loading State with Gold Dust

```typescript
import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Colors, Typography, Spacing } from '@/constants/theme';

interface LoadingStateProps {
  message?: string;
  subMessage?: string;
}

export function LoadingState({ message = 'Loading', subMessage }: LoadingStateProps) {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={Colors.burnishedGold} />
      </View>
      <Text style={styles.message}>{message}</Text>
      {subMessage && (
        <Text style={styles.subMessage}>{subMessage}</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxxl,
  },
  loaderContainer: {
    marginBottom: Spacing.xl,
  },
  message: {
    fontSize: Typography.sizes.title,
    fontWeight: Typography.weights.semibold,
    color: Colors.charcoal,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subMessage: {
    fontSize: Typography.sizes.body,
    color: Colors.stoneGray,
    textAlign: 'center',
  },
});
```

### Empty State with CTA

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Button } from '@/components/ui/Button';
import { Colors, Typography, Spacing } from '@/constants/theme';

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  ctaLabel: string;
  onCtaPress: () => void;
}

export function EmptyState({ icon, title, subtitle, ctaLabel, onCtaPress }: EmptyStateProps) {
  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={64} color={Colors.stoneGray} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <Button
        title={ctaLabel}
        onPress={onCtaPress}
        variant="gold"
        size="lg"
        style={styles.cta}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxxl,
  },
  iconContainer: {
    marginBottom: Spacing.xl,
    opacity: 0.6,
  },
  title: {
    fontSize: Typography.sizes.headline,
    fontWeight: Typography.weights.semibold,
    color: Colors.charcoal,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: Typography.sizes.bodyLarge,
    color: Colors.stoneGray,
    textAlign: 'center',
    lineHeight: Typography.sizes.bodyLarge * Typography.lineHeights.relaxed,
    marginBottom: Spacing.xxl,
  },
  cta: {
    minWidth: 200,
  },
});
```

## Animation Patterns

### Spring Press Animation

```typescript
import { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Timing } from '@/constants/theme';

export function useSpringPress() {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, Timing.springGentle);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, Timing.springGentle);
  };

  return { animatedStyle, handlePressIn, handlePressOut };
}
```

### Fade and Slide Animation

```typescript
import { useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
import { Timing } from '@/constants/theme';

export function useFadeSlide(delay = 0) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const animate = () => {
    opacity.value = withDelay(delay, withTiming(1, { duration: Timing.normal }));
    translateY.value = withDelay(delay, withTiming(0, { duration: Timing.normal }));
  };

  return { animatedStyle, animate };
}
```

## Utility Patterns

### Safe Area Wrapper

```typescript
import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';

interface SafeAreaWrapperProps {
  children: React.ReactNode;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

export function SafeAreaWrapper({ children, edges = ['top', 'bottom'] }: SafeAreaWrapperProps) {
  return (
    <SafeAreaView style={styles.container} edges={edges}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.warmOatmeal,
  },
});
```

### Haptic Feedback Helper

```typescript
import * as Haptics from 'expo-haptics';

export const haptics = {
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
  medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium),
  heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error),
};
```

## Best Practices

1. **Always use theme tokens** - Never hardcode colors, spacing, or typography
2. **Animate with purpose** - Every animation should have a reason
3. **Provide haptic feedback** - Important interactions need tactile response
4. **Handle all states** - Loading, error, empty, success
5. **Test on real devices** - Simulators don't show true performance
6. **Accessibility first** - Screen readers, dynamic type, color contrast
7. **Performance matters** - Use native driver, avoid layout animations
8. **Consistent patterns** - Reuse these patterns across the app

## Testing Checklist

- [ ] Component uses theme tokens exclusively
- [ ] Touch targets are ≥ 44x44px
- [ ] Animations are smooth (60fps)
- [ ] Haptic feedback is appropriate
- [ ] Loading states are implemented
- [ ] Error states are handled
- [ ] Empty states are designed
- [ ] Accessibility labels are provided
- [ ] Color contrast meets WCAG AA
- [ ] Works on iOS and Android

---

Use these patterns as starting points and adapt them to your specific needs while maintaining the premium quality standards.
