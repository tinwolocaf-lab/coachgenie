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
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { isSupabaseConfigured } from '@/lib/supabase';
import { SynthesisReport } from '@/components/archive/SynthesisReport';
import { getMonthlySynthesis, getAllMonthlySyntheses } from '@/lib/supabase-archive';
import { generateMonthlySynthesis } from '@/lib/ai-archive';
import { MonthlySynthesis, ContextVault } from '@/types';
import { getContextVault } from '@/store/app';

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
  const [userContext, setUserContext] = useState<ContextVault | null>(null);

  const loadData = useCallback(async () => {
    if (!auth?.user?.id) return;

    setIsLoading(true);
    try {
      const [synthData, allData, contextData] = await Promise.all([
        getMonthlySynthesis(auth.user.id, currentMonth),
        getAllMonthlySyntheses(auth.user.id),
        getContextVault(),
      ]);

      setSynthesis(synthData);
      setAllSyntheses(allData);
      setUserContext(contextData);
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
      const result = await generateMonthlySynthesis(auth.user.id, currentMonth, userContext);
      if (result) {
        setSynthesis(result);
        setAllSyntheses(prev => [result, ...prev.filter(s => s.month_year !== currentMonth)]);
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
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Ionicons name="close" size={24} color={Colors.midnightEmerald} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Ionicons name="document-text" size={18} color={Colors.burnishedGold} />
          <Text style={styles.headerTitle}>Synthesis Report</Text>
        </View>
        <View style={styles.headerRight} />
      </Animated.View>

      {/* Month Navigator */}
      <View style={styles.monthNavigator}>
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
                currentMonth === month && styles.monthPillActive,
              ]}
              onPress={() => handleMonthChange(month)}
            >
              <Text
                style={[
                  styles.monthPillText,
                  currentMonth === month && styles.monthPillTextActive,
                ]}
              >
                {getMonthName(month)}
              </Text>
              {allSyntheses.some(s => s.month_year === month) && (
                <View style={styles.hasSynthesisDot} />
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
    backgroundColor: Colors.warmOatmeal,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
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
    color: Colors.midnightEmerald,
  },
  headerRight: {
    width: 40,
  },
  monthNavigator: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
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
    backgroundColor: Colors.cream,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: Spacing.xs,
  },
  monthPillActive: {
    backgroundColor: Colors.midnightEmerald,
    borderColor: Colors.midnightEmerald,
  },
  monthPillText: {
    fontSize: Typography.sizes.caption,
    fontWeight: Typography.weights.medium,
    color: Colors.charcoal,
  },
  monthPillTextActive: {
    color: Colors.white,
  },
  hasSynthesisDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.burnishedGold,
  },
  content: {
    flex: 1,
  },
});
