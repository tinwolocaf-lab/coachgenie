import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ViewStyle,
  StyleProp,
  ScrollViewProps,
} from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { Spacing } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';

export type ScreenPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';

export interface ScreenContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scroll?: boolean;
  padding?: ScreenPadding;
  edges?: Edge[];
  scrollProps?: Omit<ScrollViewProps, 'contentContainerStyle'>;
}

function horizontalPadding(padding: ScreenPadding): number {
  if (padding === 'none') return 0;
  if (padding === 'sm') return Spacing.md;
  if (padding === 'md') return Spacing.lg;
  if (padding === 'xl') return Spacing.xxxl;
  return Spacing.xl;
}

export function ScreenContainer({
  children,
  style,
  contentContainerStyle,
  scroll = false,
  padding = 'lg',
  edges = ['top', 'right', 'left'],
  scrollProps,
}: ScreenContainerProps) {
  const { palette } = useThemeSafe();
  const paddingHorizontal = horizontalPadding(padding);

  return (
    <SafeAreaView
      edges={edges}
      style={[styles.safeArea, { backgroundColor: palette.background }, style]}
    >
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scrollContent,
            { paddingHorizontal },
            contentContainerStyle,
          ]}
          {...scrollProps}
        >
          {children}
        </ScrollView>
      ) : (
        <View
          style={[
            styles.staticContent,
            { paddingHorizontal },
            contentContainerStyle,
          ]}
        >
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Spacing.xxxl,
  },
  staticContent: {
    flex: 1,
  },
});

export default ScreenContainer;
