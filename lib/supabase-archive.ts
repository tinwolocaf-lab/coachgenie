// Supabase Archive Service - The Archive Data Layer
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  EnhancedSession,
  EnhancedMessage,
  KeyInsight,
  Breakthrough,
} from '@/types';
import type { Database } from '@/types/database';

// Monthly Synthesis Types
export interface MonthlySynthesis {
  id: string;
  user_id: string;
  month_year: string;
  title: string;
  executive_summary: string;
  key_themes: ThemeItem[];
  growth_areas: string[];
  patterns_identified: PatternItem[];
  coach_contributions: Record<string, CoachContribution>;
  breakthrough_count: number;
  insight_count: number;
  session_count: number;
  created_at: string;
}

export interface ThemeItem {
  name: string;
  frequency: number;
  relatedInsights: string[];
}

export interface PatternItem {
  pattern: string;
  observation: string;
  recommendation: string;
}

export interface CoachContribution {
  coachId: string;
  coachName: string;
  sessionCount: number;
  insightCount: number;
}

// Insight Collection Types
export interface InsightCollection {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  theme_keywords: string[];
  color: string;
  icon: string;
  insight_count: number;
  is_auto_generated: boolean;
  created_at: string;
  updated_at: string;
}

// History Query Types
export interface HistoryQuery {
  id: string;
  user_id: string;
  query: string;
  response: string;
  sources: QuerySource[];
  created_at: string;
}

export interface QuerySource {
  type: 'session' | 'insight' | 'breakthrough';
  id: string;
  title: string;
  date: string;
}

// Archive Stats
export interface ArchiveStats {
  totalSessions: number;
  totalInsights: number;
  totalBreakthroughs: number;
  currentStreak: number;
  longestStreak: number;
  topCoach: { id: string; name: string; sessions: number } | null;
}

type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[];

type BreakthroughRow = Database['public']['Tables']['breakthroughs']['Row'];
type MonthlySynthesisRow = Database['public']['Tables']['monthly_synthesis']['Row'];
type MonthlySynthesisInsert = Database['public']['Tables']['monthly_synthesis']['Insert'];
type HistoryQueryRow = Database['public']['Tables']['history_queries']['Row'];

interface BreakthroughActionItem {
  id: string;
  title: string;
  completed: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string');
}

function isBreakthroughActionItem(value: unknown): value is BreakthroughActionItem {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.completed === 'boolean'
  );
}

function parseBreakthroughActions(value: unknown): BreakthroughActionItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isBreakthroughActionItem);
}

function mapBreakthroughRow(row: BreakthroughRow): Breakthrough {
  return {
    ...row,
    created_at: row.created_at ?? new Date().toISOString(),
    session_id: row.session_id ?? undefined,
    coach_id: row.coach_id ?? '',
    action_items: parseBreakthroughActions(row.action_items),
  };
}

function isThemeItem(value: unknown): value is ThemeItem {
  if (!isRecord(value)) return false;
  return (
    typeof value.name === 'string' &&
    typeof value.frequency === 'number' &&
    Array.isArray(value.relatedInsights) &&
    value.relatedInsights.every((item) => typeof item === 'string')
  );
}

function parseThemeItems(value: unknown): ThemeItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isThemeItem);
}

function isPatternItem(value: unknown): value is PatternItem {
  if (!isRecord(value)) return false;
  return (
    typeof value.pattern === 'string' &&
    typeof value.observation === 'string' &&
    typeof value.recommendation === 'string'
  );
}

function parsePatternItems(value: unknown): PatternItem[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isPatternItem);
}

function isCoachContribution(value: unknown): value is CoachContribution {
  if (!isRecord(value)) return false;
  return (
    typeof value.coachId === 'string' &&
    typeof value.coachName === 'string' &&
    typeof value.sessionCount === 'number' &&
    typeof value.insightCount === 'number'
  );
}

function parseCoachContributions(value: unknown): Record<string, CoachContribution> {
  if (!isRecord(value)) return {};

  const parsed: Record<string, CoachContribution> = {};
  for (const [coachId, contribution] of Object.entries(value)) {
    if (isCoachContribution(contribution)) {
      parsed[coachId] = contribution;
    }
  }
  return parsed;
}

function mapMonthlySynthesisRow(row: MonthlySynthesisRow): MonthlySynthesis {
  return {
    ...row,
    created_at: row.created_at ?? new Date().toISOString(),
    key_themes: parseThemeItems(row.key_themes),
    growth_areas: toStringArray(row.growth_areas),
    patterns_identified: parsePatternItems(row.patterns_identified),
    coach_contributions: parseCoachContributions(row.coach_contributions),
  };
}

function toMonthlySynthesisInsert(
  synthesis: Omit<MonthlySynthesis, 'id' | 'created_at'>
): MonthlySynthesisInsert {
  const keyThemesPayload: JsonValue[] = synthesis.key_themes.map((theme) => ({
    name: theme.name,
    frequency: theme.frequency,
    relatedInsights: [...theme.relatedInsights],
  }));

  const patternsPayload: JsonValue[] = synthesis.patterns_identified.map((pattern) => ({
    pattern: pattern.pattern,
    observation: pattern.observation,
    recommendation: pattern.recommendation,
  }));

  const coachContributionsPayload: Record<string, JsonValue> = {};
  for (const [coachId, contribution] of Object.entries(synthesis.coach_contributions)) {
    coachContributionsPayload[coachId] = {
      coachId: contribution.coachId,
      coachName: contribution.coachName,
      sessionCount: contribution.sessionCount,
      insightCount: contribution.insightCount,
    };
  }

  return {
    user_id: synthesis.user_id,
    month_year: synthesis.month_year,
    title: synthesis.title,
    executive_summary: synthesis.executive_summary,
    key_themes: keyThemesPayload,
    growth_areas: synthesis.growth_areas,
    patterns_identified: patternsPayload,
    coach_contributions: coachContributionsPayload,
    breakthrough_count: synthesis.breakthrough_count,
    insight_count: synthesis.insight_count,
    session_count: synthesis.session_count,
  };
}

function isQuerySource(value: unknown): value is QuerySource {
  if (!isRecord(value)) return false;
  return (
    (value.type === 'session' || value.type === 'insight' || value.type === 'breakthrough') &&
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    typeof value.date === 'string'
  );
}

function parseQuerySources(value: unknown): QuerySource[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isQuerySource);
}

function mapHistoryQueryRow(row: HistoryQueryRow): HistoryQuery {
  return {
    ...row,
    created_at: row.created_at ?? new Date().toISOString(),
    sources: parseQuerySources(row.sources),
  };
}

// ============ SESSIONS ============

export async function getArchivedSessions(
  userId: string,
  limit = 50,
  offset = 0
): Promise<EnhancedSession[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase
      .from('coaching_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return (data || []) as EnhancedSession[];
  } catch (error) {
    console.error('Error fetching archived sessions:', error);
    return [];
  }
}

export async function getSessionWithMessages(
  sessionId: string
): Promise<{ session: EnhancedSession; messages: EnhancedMessage[] } | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const { data: session, error: sessionError } = await supabase
      .from('coaching_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError) throw sessionError;

    const { data: messages, error: messagesError } = await supabase
      .from('session_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (messagesError) throw messagesError;

    return {
      session: session as EnhancedSession,
      messages: (messages || []) as EnhancedMessage[],
    };
  } catch (error) {
    console.error('Error fetching session with messages:', error);
    return null;
  }
}

export async function getSessionsByDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<EnhancedSession[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase
      .from('coaching_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate)
      .lte('created_at', endDate)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as EnhancedSession[];
  } catch (error) {
    console.error('Error fetching sessions by date range:', error);
    return [];
  }
}

// ============ INSIGHTS ============

export async function getInsightsWithDetails(
  userId: string,
  limit = 100,
  category?: KeyInsight['category'] | 'all'
): Promise<KeyInsight[]> {
  if (!isSupabaseConfigured) return [];

  try {
    let query = supabase
      .from('key_insights')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as KeyInsight[];
  } catch (error) {
    console.error('Error fetching insights:', error);
    return [];
  }
}

export async function searchInsights(
  userId: string,
  searchTerm: string,
  limit = 50
): Promise<KeyInsight[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase
      .from('key_insights')
      .select('*')
      .eq('user_id', userId)
      .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as KeyInsight[];
  } catch (error) {
    console.error('Error searching insights:', error);
    return [];
  }
}

export async function getInsightsByCategory(
  userId: string
): Promise<Record<string, KeyInsight[]>> {
  if (!isSupabaseConfigured) return {};

  try {
    const { data, error } = await supabase
      .from('key_insights')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const grouped: Record<string, KeyInsight[]> = {};
    const insights = (data || []) as unknown as KeyInsight[];
    insights.forEach((insight) => {
      const cat = insight.category || 'general';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(insight);
    });

    return grouped;
  } catch (error) {
    console.error('Error grouping insights:', error);
    return {};
  }
}

// ============ BREAKTHROUGHS ============

export async function getAllBreakthroughs(
  userId: string,
  limit = 100
): Promise<Breakthrough[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase
      .from('breakthroughs')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map(mapBreakthroughRow);
  } catch (error) {
    console.error('Error fetching breakthroughs:', error);
    return [];
  }
}

export async function getBreakthroughById(
  breakthroughId: string
): Promise<Breakthrough | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const { data, error } = await supabase
      .from('breakthroughs')
      .select('*')
      .eq('id', breakthroughId)
      .single();

    if (error) throw error;
    return data ? mapBreakthroughRow(data) : null;
  } catch (error) {
    console.error('Error fetching breakthrough:', error);
    return null;
  }
}

// ============ FLASHBACK (Time-Based Retrieval) ============

export async function getFlashbackInsights(
  userId: string
): Promise<{ monthAgo: KeyInsight | null; yearAgo: KeyInsight | null }> {
  if (!isSupabaseConfigured) return { monthAgo: null, yearAgo: null };

  try {
    const now = new Date();

    // One month ago (within 2-day window)
    const monthAgoStart = new Date(now);
    monthAgoStart.setMonth(monthAgoStart.getMonth() - 1);
    monthAgoStart.setDate(monthAgoStart.getDate() - 1);

    const monthAgoEnd = new Date(now);
    monthAgoEnd.setMonth(monthAgoEnd.getMonth() - 1);
    monthAgoEnd.setDate(monthAgoEnd.getDate() + 1);

    // One year ago (within 3-day window)
    const yearAgoStart = new Date(now);
    yearAgoStart.setFullYear(yearAgoStart.getFullYear() - 1);
    yearAgoStart.setDate(yearAgoStart.getDate() - 1);

    const yearAgoEnd = new Date(now);
    yearAgoEnd.setFullYear(yearAgoEnd.getFullYear() - 1);
    yearAgoEnd.setDate(yearAgoEnd.getDate() + 2);

    const { data: monthData } = await supabase
      .from('key_insights')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', monthAgoStart.toISOString())
      .lte('created_at', monthAgoEnd.toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    const { data: yearData } = await supabase
      .from('key_insights')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', yearAgoStart.toISOString())
      .lte('created_at', yearAgoEnd.toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    return {
      monthAgo: monthData && monthData.length > 0 ? monthData[0] as KeyInsight : null,
      yearAgo: yearData && yearData.length > 0 ? yearData[0] as KeyInsight : null,
    };
  } catch (error) {
    console.error('Error fetching flashback insights:', error);
    return { monthAgo: null, yearAgo: null };
  }
}

// ============ MONTHLY SYNTHESIS ============

export async function getMonthlySynthesis(
  userId: string,
  monthYear: string
): Promise<MonthlySynthesis | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const { data, error } = await supabase
      .from('monthly_synthesis')
      .select('*')
      .eq('user_id', userId)
      .eq('month_year', monthYear)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data ? mapMonthlySynthesisRow(data) : null;
  } catch (error) {
    console.error('Error fetching monthly synthesis:', error);
    return null;
  }
}

export async function saveMonthlySynthesis(
  synthesis: Omit<MonthlySynthesis, 'id' | 'created_at'>
): Promise<MonthlySynthesis | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const payload = toMonthlySynthesisInsert(synthesis);
    const { data, error } = await supabase
      .from('monthly_synthesis')
      .upsert(payload, { onConflict: 'user_id,month_year' })
      .select()
      .single();

    if (error) throw error;
    return data ? mapMonthlySynthesisRow(data) : null;
  } catch (error) {
    console.error('Error saving monthly synthesis:', error);
    return null;
  }
}

export async function getAllMonthlySyntheses(
  userId: string
): Promise<MonthlySynthesis[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase
      .from('monthly_synthesis')
      .select('*')
      .eq('user_id', userId)
      .order('month_year', { ascending: false });

    if (error) throw error;
    return (data || []).map(mapMonthlySynthesisRow);
  } catch (error) {
    console.error('Error fetching all syntheses:', error);
    return [];
  }
}

// ============ INSIGHT COLLECTIONS ============

export async function getInsightCollections(
  userId: string
): Promise<InsightCollection[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase
      .from('insight_collections')
      .select('*')
      .eq('user_id', userId)
      .order('insight_count', { ascending: false });

    if (error) throw error;
    return (data || []) as InsightCollection[];
  } catch (error) {
    console.error('Error fetching collections:', error);
    return [];
  }
}

export async function createCollection(
  userId: string,
  name: string,
  description?: string,
  keywords: string[] = []
): Promise<InsightCollection | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const { data, error } = await supabase
      .from('insight_collections')
      .insert({
        user_id: userId,
        name,
        description,
        theme_keywords: keywords,
        is_auto_generated: false,
      })
      .select()
      .single();

    if (error) throw error;
    return data as InsightCollection;
  } catch (error) {
    console.error('Error creating collection:', error);
    return null;
  }
}

export async function addInsightToCollection(
  collectionId: string,
  insightId: string
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  try {
    const { error } = await supabase
      .from('insight_collection_items')
      .insert({ collection_id: collectionId, insight_id: insightId });

    if (error) throw error;

    // Update collection count
    await supabase.rpc('increment_collection_count', {
      collection_id: collectionId,
    });

    return true;
  } catch (error) {
    console.error('Error adding insight to collection:', error);
    return false;
  }
}

export async function getCollectionInsights(
  collectionId: string
): Promise<KeyInsight[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const { data: collectionItems, error: collectionItemsError } = await supabase
      .from('insight_collection_items')
      .select('insight_id')
      .eq('collection_id', collectionId);

    if (collectionItemsError) throw collectionItemsError;

    const insightIds = (collectionItems || []).map((item) => item.insight_id);
    if (insightIds.length === 0) return [];

    const { data: insights, error: insightsError } = await supabase
      .from('key_insights')
      .select('*')
      .in('id', insightIds);

    if (insightsError) throw insightsError;

    const insightMap = new Map((insights || []).map((insight) => [insight.id, insight as KeyInsight]));
    return insightIds
      .map((insightId) => insightMap.get(insightId))
      .filter((insight): insight is KeyInsight => Boolean(insight));
  } catch (error) {
    console.error('Error fetching collection insights:', error);
    return [];
  }
}

// ============ HISTORY QUERIES ============

export async function saveHistoryQuery(
  userId: string,
  query: string,
  response: string,
  sources: QuerySource[]
): Promise<HistoryQuery | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const sourcesPayload: JsonValue[] = sources.map((source) => ({
      type: source.type,
      id: source.id,
      title: source.title,
      date: source.date,
    }));

    const { data, error } = await supabase
      .from('history_queries')
      .insert({
        user_id: userId,
        query,
        response,
        sources: sourcesPayload,
      })
      .select()
      .single();

    if (error) throw error;
    return data ? mapHistoryQueryRow(data) : null;
  } catch (error) {
    console.error('Error saving history query:', error);
    return null;
  }
}

export async function getRecentHistoryQueries(
  userId: string,
  limit = 10
): Promise<HistoryQuery[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase
      .from('history_queries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map(mapHistoryQueryRow);
  } catch (error) {
    console.error('Error fetching history queries:', error);
    return [];
  }
}

// ============ ARCHIVE STATS ============

export async function getArchiveStats(userId: string): Promise<ArchiveStats> {
  if (!isSupabaseConfigured) {
    return {
      totalSessions: 0,
      totalInsights: 0,
      totalBreakthroughs: 0,
      currentStreak: 0,
      longestStreak: 0,
      topCoach: null,
    };
  }

  try {
    // Get counts
    const [sessionsRes, insightsRes, breakthroughsRes] = await Promise.all([
      supabase
        .from('coaching_sessions')
        .select('id, coach_id', { count: 'exact' })
        .eq('user_id', userId),
      supabase
        .from('key_insights')
        .select('id', { count: 'exact' })
        .eq('user_id', userId),
      supabase
        .from('breakthroughs')
        .select('id, date', { count: 'exact' })
        .eq('user_id', userId)
        .order('date', { ascending: false }),
    ]);

    // Calculate streaks from breakthroughs
    const breakthroughs = (breakthroughsRes.data || []) as { id: string; date: string }[];
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    if (breakthroughs.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const dates = breakthroughs.map(b => b.date);

      // Check if today or yesterday has a breakthrough for current streak
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (dates.includes(today) || dates.includes(yesterdayStr)) {
        let checkDate = new Date();
        if (!dates.includes(today)) {
          checkDate = yesterday;
        }

        while (dates.includes(checkDate.toISOString().split('T')[0])) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        }
      }

      // Calculate longest streak
      const sortedDates = [...new Set(dates)].sort();
      tempStreak = 1;
      longestStreak = 1;

      for (let i = 1; i < sortedDates.length; i++) {
        const prev = new Date(sortedDates[i - 1]);
        const curr = new Date(sortedDates[i]);
        const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          tempStreak++;
          longestStreak = Math.max(longestStreak, tempStreak);
        } else {
          tempStreak = 1;
        }
      }
    }

    // Find top coach
    const sessions = (sessionsRes.data || []) as { id: string; coach_id: string }[];
    const coachCounts: Record<string, number> = {};
    sessions.forEach(s => {
      coachCounts[s.coach_id] = (coachCounts[s.coach_id] || 0) + 1;
    });

    let topCoach: { id: string; name: string; sessions: number } | null = null;
    let maxSessions = 0;

    for (const [coachId, count] of Object.entries(coachCounts)) {
      if (count > maxSessions) {
        maxSessions = count;
        topCoach = { id: coachId, name: coachId, sessions: count };
      }
    }

    return {
      totalSessions: sessionsRes.count || 0,
      totalInsights: insightsRes.count || 0,
      totalBreakthroughs: breakthroughsRes.count || 0,
      currentStreak,
      longestStreak,
      topCoach,
    };
  } catch (error) {
    console.error('Error fetching archive stats:', error);
    return {
      totalSessions: 0,
      totalInsights: 0,
      totalBreakthroughs: 0,
      currentStreak: 0,
      longestStreak: 0,
      topCoach: null,
    };
  }
}

// ============ DATA FOR SYNTHESIS ============

export async function getMonthlyData(
  userId: string,
  monthYear: string
): Promise<{
  sessions: EnhancedSession[];
  insights: KeyInsight[];
  breakthroughs: Breakthrough[];
}> {
  if (!isSupabaseConfigured) {
    return { sessions: [], insights: [], breakthroughs: [] };
  }

  try {
    const [year, month] = monthYear.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const [sessionsRes, insightsRes, breakthroughsRes] = await Promise.all([
      supabase
        .from('coaching_sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),
      supabase
        .from('key_insights')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString()),
      supabase
        .from('breakthroughs')
        .select('*')
        .eq('user_id', userId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]),
    ]);

    return {
      sessions: (sessionsRes.data || []) as EnhancedSession[],
      insights: (insightsRes.data || []) as KeyInsight[],
      breakthroughs: (breakthroughsRes.data || []).map(mapBreakthroughRow),
    };
  } catch (error) {
    console.error('Error fetching monthly data:', error);
    return { sessions: [], insights: [], breakthroughs: [] };
  }
}

// ============ FULL TEXT SEARCH FOR ASK HISTORY ============

export async function searchAllContent(
  userId: string,
  searchTerm: string
): Promise<{
  sessions: EnhancedSession[];
  insights: KeyInsight[];
  breakthroughs: Breakthrough[];
}> {
  if (!isSupabaseConfigured) {
    return { sessions: [], insights: [], breakthroughs: [] };
  }

  try {
    const term = `%${searchTerm}%`;

    const [sessionsRes, insightsRes, breakthroughsRes] = await Promise.all([
      supabase
        .from('coaching_sessions')
        .select('*')
        .eq('user_id', userId)
        .or(`title.ilike.${term},summary.ilike.${term},breakthrough_summary.ilike.${term}`)
        .limit(20),
      supabase
        .from('key_insights')
        .select('*')
        .eq('user_id', userId)
        .or(`title.ilike.${term},content.ilike.${term}`)
        .limit(30),
      supabase
        .from('breakthroughs')
        .select('*')
        .eq('user_id', userId)
        .or(`title.ilike.${term},summary.ilike.${term}`)
        .limit(20),
    ]);

    return {
      sessions: (sessionsRes.data || []) as EnhancedSession[],
      insights: (insightsRes.data || []) as KeyInsight[],
      breakthroughs: (breakthroughsRes.data || []).map(mapBreakthroughRow),
    };
  } catch (error) {
    console.error('Error searching content:', error);
    return { sessions: [], insights: [], breakthroughs: [] };
  }
}
