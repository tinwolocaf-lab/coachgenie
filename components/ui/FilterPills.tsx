import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { Colors, Typography, Spacing, Radius, Timing } from '@/constants/theme';

interface FilterCategory {
  id: string;
  label: string;
  count?: number;
}

interface FilterPillsProps {
  categories: FilterCategory[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  showAll?: boolean;
}

function FilterPill({
  category,
  isSelected,
  onPress,
  index,
}: {
  category: FilterCategory;
  isSelected: boolean;
  onPress: () => void;
  index: number;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(-20);

  useEffect(() => {
    const delay = index * 50;
    opacity.value = withDelay(delay, withTiming(1, { duration: 400 }));
    translateX.value = withDelay(delay, withSpring(0, Timing.springGentle));
  }, [index, opacity, translateX]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSpring(0.95, Timing.springBouncy);
    setTimeout(() => {
      scale.value = withSpring(1, Timing.springBouncy);
    }, 100);
    onPress();
  };

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: translateX.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={containerStyle}>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.8}
        style={[
          styles.pill,
          isSelected && styles.pillSelected,
        ]}
      >
        <Text
          style={[
            styles.pillText,
            isSelected && styles.pillTextSelected,
          ]}
        >
          {category.label}
        </Text>
        {category.count !== undefined && (
          <View
            style={[
              styles.countBadge,
              isSelected && styles.countBadgeSelected,
            ]}
          >
            <Text
              style={[
                styles.countText,
                isSelected && styles.countTextSelected,
              ]}
            >
              {category.count}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export function FilterPills({
  categories,
  selectedId,
  onSelect,
  showAll = true,
}: FilterPillsProps) {
  const scrollRef = useRef<ScrollView>(null);

  const allCategories: FilterCategory[] = showAll
    ? [{ id: 'all', label: 'All' }, ...categories]
    : categories;

  const handleSelect = (id: string) => {
    if (id === 'all') {
      onSelect(null);
    } else {
      onSelect(id === selectedId ? null : id);
    }
  };

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {allCategories.map((category, index) => (
        <FilterPill
          key={category.id}
          category={category}
          isSelected={
            category.id === 'all'
              ? selectedId === null
              : category.id === selectedId
          }
          onPress={() => handleSelect(category.id)}
          index={index}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    backgroundColor: Colors.cardBg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs,
  },
  pillSelected: {
    backgroundColor: Colors.midnightEmerald,
    borderColor: Colors.midnightEmerald,
  },
  pillText: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.medium,
    color: Colors.charcoal,
  },
  pillTextSelected: {
    color: Colors.white,
  },
  countBadge: {
    backgroundColor: Colors.warmOatmealDark,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.pill,
  },
  countBadgeSelected: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  countText: {
    fontSize: Typography.sizes.micro,
    fontWeight: Typography.weights.semibold,
    color: Colors.stoneGray,
  },
  countTextSelected: {
    color: Colors.goldLight,
  },
});
