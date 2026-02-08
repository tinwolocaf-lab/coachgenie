// Monthly Synthesis Screen - AI-generated summary of user's journey
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Typography, Spacing, Radius } from '@/constants/theme';
import { useThemeSafe } from '@/contexts/ThemeContext';
import { isSupabaseConfigured } from '@/lib/supabase';
import { SynthesisReport } from '@/components/archive/SynthesisReport';
import { getMonthlySynthesis, getAllMonthlySyntheses } from '@/lib/supabase-archive';
import { generateMonthlySynthesis } from '@/lib/apiClient';
import { MonthlySynthesis } from '@/types';

// Dynamic auth hook
const getAuthHook = () => {
  if (isSupabaseConfigured) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require('@fastshot/auth').useAuth;
    } catch {
      return null;
    }
  }
  return null;
};

export default function SynthesisScreen() {
  const router = useRouter();
  const { palette } = useThemeSafe();
  const useAuth = getAuthHook();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const auth = useAuth && isSupabaseConfigured ? useAuth() : null;

  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [synthesis, setSynthesis] = useState<MonthlySynthesis | null>(null);
  const [allSyntheses, setAllSyntheses] = useState<MonthlySynthesis[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const loadData = useCallback(async () => {
    if (!auth?.user?.id) return;

    setIsLoading(true);
    try {
      const [synthData, allData] = await Promise.all([
        getMonthlySynthesis(auth.user.id, currentMonth),
        getAllMonthlySyntheses(auth.user.id),
      ]);

      setSynthesis(synthData);
      setAllSyntheses(allData);
    } catch (error) {
      console.error('Error loading synthesis:', error);
    } finally {
      setIsLoading(false);
    }
  }, [auth?.user?.id, currentMonth]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerateSynthesis = async () => {
    if (!auth?.user?.id) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsGenerating(true);

    try {
      const result = await generateMonthlySynthesis(currentMonth);
      const synthesisPayload = (result as { synthesis?: MonthlySynthesis | null })?.synthesis ?? null;
      if (synthesisPayload) {
        setSynthesis(synthesisPayload);
        setAllSyntheses(prev => [synthesisPayload, ...prev.filter(s => s.month_year !== currentMonth)]);
      }
    } catch (error) {
      console.error('Error generating synthesis:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMonthChange = (monthYear: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentMonth(monthYear);
  };

  const handleBackPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const getMonthName = (monthYear: string) => {
    const [year, month] = monthYear.split('-');
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleString('default', {
      month: 'long',
      year: 'numeric',
    });
  };

  // Get available months for navigation
  const availableMonths = getAvailableMonths(allSyntheses);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: palette.background }]} edges={['top']}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={[styles.header, { borderBottomColor: palette.borderLight }]}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Ionicons name="close" size={24} color={palette.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="document-text" size={18} color={palette.accent} />
          <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>Synthesis Report</Text>
        </View>
        <View style={styles.headerRight} />
      </Animated.View>

      {/* Month Navigator */}
      <View style={[styles.monthNavigator, { borderBottomColor: palette.borderLight }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.monthsContainer}
        >
          {availableMonths.map(month => (
            <TouchableOpacity
              key={month}
              style={[
                styles.monthPill,
                { backgroundColor: palette.cardBg, borderColor: palette.borderLight },
                currentMonth === month && { backgroundColor: palette.textPrimary, borderColor: palette.textPrimary },
              ]}
              onPress={() => handleMonthChange(month)}
            >
              <Text
                style={[
                  styles.monthPillText,
                  { color: palette.textSecondary },
                  currentMonth === month && { color: palette.textInverse },
                ]}
              >
                {getMonthName(month)}
              </Text>
              {allSyntheses.some(s => s.month_year === month) && (
                <View style={[styles.hasSynthesisDot, { backgroundColor: palette.accent }]} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Synthesis Report */}
      <View style={styles.content}>
        <SynthesisReport
          synthesis={synthesis}
          isLoading={isLoading || isGenerating}
          onGenerate={handleGenerateSynthesis}
        />
      </View>
    </SafeAreaView>
  );
}

// Helper to get available months (current + past 12 months)
function getAvailableMonths(syntheses: MonthlySynthesis[]): string[] {
  const months: string[] = [];
  const now = new Date();

  // Add current month and past 12 months
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    months.push(monthYear);
  }

  // Add any synthesis months not already included
  syntheses.forEach(s => {
    if (!months.includes(s.month_year)) {
      months.push(s.month_year);
    }
  });

  // Sort descending
  return months.sort((a, b) => b.localeCompare(a));
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  headerTitle: {
    fontSize: Typography.sizes.body,
    fontWeight: Typography.weights.semibold,
  },
  headerRight: {
    width: 40,
  },
  monthNavigator: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  monthsContainer: {
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.sm,
  },
  monthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.pill,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  monthPillText: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.medium,
  },
  hasSynthesisDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  content: {
    flex: 1,
  },
});
