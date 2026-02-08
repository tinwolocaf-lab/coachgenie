import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import { Typography, Spacing, Radius, EditorialSpacing, Shadows } from '@/constants/theme';
import { useThemeSafe, type AtmospherePalette } from '@/contexts/ThemeContext';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

interface WeeklySession { week: string; count: number }
interface CategoryCount { category: string; count: number }
interface CoachUsage { id: string; name: string; sessionCount: number }
interface DashboardData {
  weeklySessions: WeeklySession[];
  categories: CategoryCount[];
  coaches: CoachUsage[];
  values: string[];
  totalSessions: number;
  totalInsights: number;
  longestStreak: number;
  activeDays: number;
}

const CATEGORIES = ['mindset', 'strategy', 'productivity', 'systems', 'general'];
const CAT_LABELS: Record<string, string> = {
  mindset: 'Mindset', strategy: 'Strategy', productivity: 'Productivity',
  systems: 'Systems', general: 'General',
};
const EMPTY: DashboardData = {
  weeklySessions: [], categories: [], coaches: [], values: [],
  totalSessions: 0, totalInsights: 0, longestStreak: 0, activeDays: 0,
};

// --- Growth Chart ---

function GrowthChart({ data, p }: { data: WeeklySession[]; p: AtmospherePalette }) {
  const W = 300, H = 160, pL = 32, pR = 12, pT = 16, pB = 28;
  const plotW = W - pL - pR, plotH = H - pT - pB;
  const maxVal = Math.max(...data.map((d) => d.count), 1);
  const pts = data.map((d, i) => ({
    x: pL + (i / Math.max(data.length - 1, 1)) * plotW,
    y: pT + plotH - (d.count / maxVal) * plotH,
  }));
  const yTicks = [0, Math.round(maxVal / 2), maxVal];
  return (
    <Svg width={W} height={H}>
      {yTicks.map((t) => {
        const y = pT + plotH - (t / maxVal) * plotH;
        return (
          <React.Fragment key={t}>
            <Line x1={pL} y1={y} x2={W - pR} y2={y} stroke={p.border} strokeWidth={1} />
            <SvgText x={pL - 6} y={y + 4} textAnchor="end" fontSize={10} fill={p.textTertiary}>{t}</SvgText>
          </React.Fragment>
        );
      })}
      {data.map((d, i) => (
        <SvgText key={i} x={pts[i].x} y={H - 4} textAnchor="middle" fontSize={9} fill={p.textTertiary}>{d.week}</SvgText>
      ))}
      {pts.length > 1 && (
        <Polyline points={pts.map((pt) => `${pt.x},${pt.y}`).join(' ')} fill="none"
          stroke={p.accent} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      )}
      {pts.map((pt, i) => (
        <Circle key={i} cx={pt.x} cy={pt.y} r={4} fill={p.cardBg} stroke={p.accent} strokeWidth={2} />
      ))}
    </Svg>
  );
}

// --- Data Fetching ---

async function fetchData(): Promise<DashboardData> {
  if (!isSupabaseConfigured) return EMPTY;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return EMPTY;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 60);

  const [sessionsRes, insightsRes, vaultRes, streaksRes] = await Promise.all([
    supabase.from('coaching_sessions' as any).select('id, coach_id, created_at')
      .eq('user_id', user.id).gte('created_at', cutoff.toISOString())
      .order('created_at', { ascending: true }),
    supabase.from('key_insights' as any).select('id, category, created_at').eq('user_id', user.id),
    supabase.from('context_vaults' as any).select('values').eq('user_id', user.id).limit(1).single(),
    supabase.from('ritual_streaks' as any).select('longest_streak').eq('user_id', user.id),
  ]);

  const sessions = (sessionsRes.data || []) as { id: string; coach_id: string | null; created_at: string }[];
  const insights = (insightsRes.data || []) as { id: string; category: string; created_at: string }[];
  const vaultValues: string[] = (vaultRes.data as any)?.values || [];

  // Weekly sessions (last 8 weeks)
  const now = new Date();
  const weekMap = new Map<string, number>();
  for (let i = 7; i >= 0; i--) weekMap.set(`W${8 - i}`, 0);
  sessions.forEach((s) => {
    const diff = Math.floor((now.getTime() - new Date(s.created_at).getTime()) / 864e5);
    const label = `W${8 - Math.min(7, Math.floor(diff / 7))}`;
    if (weekMap.has(label)) weekMap.set(label, (weekMap.get(label) || 0) + 1);
  });

  // Categories
  const catMap = new Map<string, number>();
  CATEGORIES.forEach((c) => catMap.set(c, 0));
  insights.forEach((ins) => {
    const c = ins.category || 'general';
    catMap.set(c, (catMap.get(c) || 0) + 1);
  });

  // Coaches
  const coachIds = [...new Set(sessions.map((s) => s.coach_id).filter(Boolean))] as string[];
  let coaches: CoachUsage[] = [];
  if (coachIds.length > 0) {
    const { data: rows } = await supabase.from('coaches' as any).select('id, name').in('id', coachIds);
    const nameMap = new Map(((rows || []) as { id: string; name: string }[]).map((r) => [r.id, r.name]));
    const countMap = new Map<string, number>();
    sessions.forEach((s) => { if (s.coach_id) countMap.set(s.coach_id, (countMap.get(s.coach_id) || 0) + 1); });
    coaches = Array.from(countMap.entries())
      .map(([id, n]) => ({ id, name: nameMap.get(id) || 'Unknown', sessionCount: n }))
      .sort((a, b) => b.sessionCount - a.sessionCount);
  }

  const streaks = ((streaksRes.data || []) as { longest_streak: number }[]).map((s) => s.longest_streak || 0);
  const uniqueDays = new Set(sessions.map((s) => s.created_at.split('T')[0]));

  return {
    weeklySessions: Array.from(weekMap.entries()).map(([week, count]) => ({ week, count })),
    categories: Array.from(catMap.entries()).map(([category, count]) => ({ category, count })),
    coaches, values: vaultValues,
    totalSessions: sessions.length,
    totalInsights: insights.length,
    longestStreak: streaks.length > 0 ? Math.max(...streaks) : 0,
    activeDays: uniqueDays.size,
  };
}

// --- Main Screen ---

export default function InsightsDashboardScreen() {
  const router = useRouter();
  const { palette, subscriptionTier } = useThemeSafe();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const s = useMemo(() => makeStyles(palette), [palette]);

  const loadData = useCallback(async () => {
    try { setData(await fetchData()); }
    catch (e) { console.error('Dashboard load failed:', e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  const onRefresh = useCallback(() => { setRefreshing(true); loadData(); }, [loadData]);
  const goBack = () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.back(); };

  // Oracle gate
  if (subscriptionTier !== 'oracle') {
    return (
      <SafeAreaView style={[s.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <Animated.View entering={FadeIn.duration(400)} style={s.gateCard}>
          <Ionicons name="lock-closed-outline" size={40} color={palette.accent} />
          <Text style={s.gateTitle}>Oracle Tier Required</Text>
          <Text style={s.gateBody}>
            The Growth Dashboard provides longitudinal insights into your coaching
            journey. Upgrade to Oracle to unlock this feature.
          </Text>
          <TouchableOpacity style={s.gateCta} activeOpacity={0.8}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push('/paywall'); }}>
            <Text style={s.gateCtaText}>View Plans</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={goBack} style={{ marginTop: Spacing.lg }}>
            <Text style={{ fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.body, color: palette.accent }}>Go Back</Text>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={[s.root, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={palette.accent} />
      </SafeAreaView>
    );
  }

  const maxCat = Math.max(...(data?.categories.map((c) => c.count) || [1]), 1);
  const maxCoach = Math.max(...(data?.coaches.map((c) => c.sessionCount) || [1]), 1);
  const trendIcons: Array<'trending-up' | 'remove-outline'> = ['trending-up', 'remove-outline', 'trending-up', 'trending-up', 'remove-outline'];

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <Animated.View entering={FadeIn.duration(300)} style={s.header}>
        <TouchableOpacity onPress={goBack} hitSlop={12} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color={palette.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Growth Dashboard</Text>
        <View style={{ width: 32 }} />
      </Animated.View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent} />}>

        {/* Stats Summary */}
        <Animated.View entering={FadeInUp.delay(100).duration(400)}>
          <Text style={s.label}>OVERVIEW</Text>
          <View style={s.statsRow}>
            {([
              ['Sessions', data?.totalSessions ?? 0, 'chatbubbles-outline'],
              ['Insights', data?.totalInsights ?? 0, 'bulb-outline'],
              ['Streak', data?.longestStreak ?? 0, 'flame-outline'],
              ['Active Days', data?.activeDays ?? 0, 'calendar-outline'],
            ] as [string, number, keyof typeof Ionicons.glyphMap][]).map(([lbl, val, ico]) => (
              <View key={lbl} style={s.stat}>
                <Ionicons name={ico} size={20} color={palette.accent} />
                <Text style={s.statVal}>{val}</Text>
                <Text style={s.statLbl}>{lbl}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Growth Trajectory */}
        <Animated.View entering={FadeInUp.delay(200).duration(400)} style={s.card}>
          <Text style={s.cardTitle}>Growth Trajectory</Text>
          <Text style={s.cardSub}>Sessions per week, last 8 weeks</Text>
          <View style={{ alignItems: 'center' }}>
            <GrowthChart data={data?.weeklySessions || []} p={palette} />
          </View>
        </Animated.View>

        {/* Insight Categories */}
        <Animated.View entering={FadeInUp.delay(300).duration(400)} style={s.card}>
          <Text style={s.cardTitle}>Insight Categories</Text>
          <Text style={s.cardSub}>Distribution across focus areas</Text>
          <View style={{ gap: Spacing.md }}>
            {(data?.categories || []).map((cat) => (
              <View key={cat.category} style={s.barRow}>
                <Text style={s.barLabel}>{CAT_LABELS[cat.category] || cat.category}</Text>
                <View style={s.barTrack}>
                  <View style={[s.barFill, { width: `${Math.max((cat.count / maxCat) * 100, 2)}%`, backgroundColor: palette.accent }]} />
                </View>
                <Text style={s.barVal}>{cat.count}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Coach Utilization */}
        <Animated.View entering={FadeInUp.delay(400).duration(400)} style={s.card}>
          <Text style={s.cardTitle}>Coach Utilization</Text>
          <Text style={s.cardSub}>Sessions by coach</Text>
          {(data?.coaches || []).length === 0 ? (
            <Text style={s.empty}>No coaching sessions yet</Text>
          ) : (
            <View style={{ gap: Spacing.md }}>
              {(data?.coaches || []).map((c) => (
                <View key={c.id} style={s.coachRow}>
                  <View style={s.coachIco}>
                    <Ionicons name="person-outline" size={16} color={palette.accent} />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={s.coachName}>{c.name}</Text>
                    <View style={s.coachTrack}>
                      <View style={[s.barFill, { width: `${(c.sessionCount / maxCoach) * 100}%`, backgroundColor: palette.accent, height: 6 }]} />
                    </View>
                  </View>
                  <Text style={s.coachCnt}>{c.sessionCount}</Text>
                </View>
              ))}
            </View>
          )}
        </Animated.View>

        {/* Value Alignment */}
        <Animated.View entering={FadeInUp.delay(500).duration(400)} style={s.card}>
          <Text style={s.cardTitle}>Value Alignment</Text>
          <Text style={s.cardSub}>Your core values from the Context Vault</Text>
          {(data?.values || []).length === 0 ? (
            <Text style={s.empty}>No values set in your Context Vault</Text>
          ) : (
            <View style={{ gap: Spacing.md }}>
              {(data?.values || []).map((v, i) => {
                const ico = trendIcons[i % trendIcons.length];
                return (
                  <View key={v} style={s.valRow}>
                    <View style={s.valBadge}><Text style={s.valBadgeTxt}>{i + 1}</Text></View>
                    <Text style={s.valTxt}>{v}</Text>
                    <Ionicons name={ico} size={18} color={ico === 'trending-up' ? palette.success : palette.textTertiary} />
                  </View>
                );
              })}
            </View>
          )}
        </Animated.View>

        <View style={{ height: EditorialSpacing.sectionGap }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Styles ---

const makeStyles = (p: AtmospherePalette) => StyleSheet.create({
  root: { flex: 1, backgroundColor: p.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: EditorialSpacing.breathingMargin, paddingVertical: Spacing.md },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: Typography.fonts.serif, fontSize: Typography.sizes.title, color: p.textPrimary, letterSpacing: Typography.letterSpacing.editorial },
  scroll: { paddingHorizontal: EditorialSpacing.breathingMargin, paddingTop: Spacing.lg },
  label: { fontFamily: Typography.fonts.sansSemibold, fontSize: Typography.sizes.caption, color: p.textTertiary, letterSpacing: Typography.letterSpacing.widest, marginBottom: Spacing.md },
  statsRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: EditorialSpacing.sectionGap },
  stat: { flex: 1, backgroundColor: p.cardBg, borderRadius: Radius.lg, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: p.borderLight, ...Shadows.subtle },
  statVal: { fontFamily: Typography.fonts.serif, fontSize: Typography.sizes.title, color: p.textPrimary, marginTop: Spacing.xs },
  statLbl: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.micro, color: p.textTertiary, marginTop: 2 },
  card: { backgroundColor: p.cardBg, borderRadius: Radius.xl, padding: EditorialSpacing.cardPadding, marginBottom: Spacing.xl, borderWidth: 1, borderColor: p.borderLight, ...Shadows.sm },
  cardTitle: { fontFamily: Typography.fonts.serif, fontSize: Typography.sizes.subtitle, color: p.textPrimary, marginBottom: 4 },
  cardSub: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.caption, color: p.textTertiary, marginBottom: Spacing.lg },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  barLabel: { fontFamily: Typography.fonts.sansMedium, fontSize: Typography.sizes.caption, color: p.textSecondary, width: 84 },
  barTrack: { flex: 1, height: 8, backgroundColor: p.backgroundSecondary, borderRadius: Radius.pill, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: Radius.pill },
  barVal: { fontFamily: Typography.fonts.sansSemibold, fontSize: Typography.sizes.caption, color: p.textPrimary, width: 28, textAlign: 'right' },
  coachRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  coachIco: { width: 32, height: 32, borderRadius: Radius.full, backgroundColor: p.accentMuted, alignItems: 'center', justifyContent: 'center' },
  coachName: { fontFamily: Typography.fonts.sansMedium, fontSize: Typography.sizes.body, color: p.textPrimary },
  coachTrack: { height: 6, backgroundColor: p.backgroundSecondary, borderRadius: Radius.pill, overflow: 'hidden' },
  coachCnt: { fontFamily: Typography.fonts.sansSemibold, fontSize: Typography.sizes.body, color: p.accent, minWidth: 24, textAlign: 'right' },
  valRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  valBadge: { width: 24, height: 24, borderRadius: Radius.full, backgroundColor: p.accentMuted, alignItems: 'center', justifyContent: 'center' },
  valBadgeTxt: { fontFamily: Typography.fonts.sansSemibold, fontSize: Typography.sizes.micro, color: p.accent },
  valTxt: { flex: 1, fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.body, color: p.textPrimary },
  empty: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.body, color: p.textTertiary, fontStyle: 'italic' },
  gateCard: { backgroundColor: p.cardBg, borderRadius: Radius.xl, padding: EditorialSpacing.cardPadding, marginHorizontal: EditorialSpacing.breathingMargin, alignItems: 'center', borderWidth: 1, borderColor: p.borderLight, ...Shadows.md },
  gateTitle: { fontFamily: Typography.fonts.serif, fontSize: Typography.sizes.headline, color: p.textPrimary, marginTop: Spacing.lg, marginBottom: Spacing.sm, textAlign: 'center' },
  gateBody: { fontFamily: Typography.fonts.sans, fontSize: Typography.sizes.body, color: p.textSecondary, textAlign: 'center', lineHeight: Typography.sizes.body * Typography.lineHeights.relaxed, marginBottom: Spacing.xxl },
  gateCta: { backgroundColor: p.accent, paddingVertical: Spacing.md, paddingHorizontal: Spacing.xxxl, borderRadius: Radius.pill, ...Shadows.sm },
  gateCtaText: { fontFamily: Typography.fonts.sansSemibold, fontSize: Typography.sizes.body, color: p.textInverse },
});
