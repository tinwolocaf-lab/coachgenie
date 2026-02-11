// Supabase Rituals Service - Phase 5: The Rituals Data Layer
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  Ritual,
  RitualCompletion,
  RitualWithStatus,
  DailyReflection,
  GrowthChapter,
  GrowthChapterWithMilestones,
  ChapterMilestone,
  RitualStreak,
  EditorialNudge,
  TodayPractice,
  TimeOfDay,
  MORNING_PROMPTS,
} from '@/types';

// ============ HELPER FUNCTIONS ============

export function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

export function getRandomPrompt(type: 'morning' | 'evening'): string {
  const prompts = type === 'morning' ? MORNING_PROMPTS : [
    "What went well today that you want to remember?",
    "What did you learn about yourself today?",
    "What moment are you most grateful for?",
  ];
  return prompts[Math.floor(Math.random() * prompts.length)];
}

interface PostgrestErrorLike {
  code?: string;
  details?: string | null;
  hint?: string | null;
  message?: string;
}

const MISSING_RELATION_CODE = 'PGRST205';
let isRitualsSchemaUnavailable = false;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function toPostgrestError(error: unknown): PostgrestErrorLike | null {
  if (!isRecord(error)) return null;

  const code = typeof error.code === 'string' ? error.code : undefined;
  const details = typeof error.details === 'string' || error.details === null
    ? error.details
    : undefined;
  const hint = typeof error.hint === 'string' || error.hint === null
    ? error.hint
    : undefined;
  const message = typeof error.message === 'string' ? error.message : undefined;

  return { code, details, hint, message };
}

function isMissingRelationError(error: unknown): boolean {
  const parsed = toPostgrestError(error);
  if (!parsed) return false;

  if (parsed.code === MISSING_RELATION_CODE) {
    return true;
  }

  const message = parsed.message?.toLowerCase() ?? '';
  return message.includes('could not find the table');
}

function markSchemaUnavailable(error: unknown): boolean {
  if (!isMissingRelationError(error)) return false;
  isRitualsSchemaUnavailable = true;
  return true;
}

function shouldSkipRitualsSchema(): boolean {
  return !isSupabaseConfigured || isRitualsSchemaUnavailable;
}

function logRitualsDataError(operation: string, error: unknown): void {
  if (markSchemaUnavailable(error)) {
    const parsed = toPostgrestError(error);
    const message = parsed?.message ?? 'Missing relation in public schema cache';
    console.warn(`[Rituals] ${operation} unavailable: ${message}`);
    return;
  }

  console.error(`[Rituals] Error ${operation}:`, error);
}

// ============ RITUALS ============

export async function getRituals(userId: string): Promise<Ritual[]> {
  if (shouldSkipRitualsSchema()) return [];

  try {
    const { data, error } = await supabase
      .from('rituals')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('order_index', { ascending: true });

    if (error) throw error;
    return (data || []) as Ritual[];
  } catch (error) {
    logRitualsDataError('fetching rituals', error);
    return [];
  }
}

export async function getRitualsWithStatus(userId: string, date?: string): Promise<RitualWithStatus[]> {
  if (shouldSkipRitualsSchema()) return [];

  const targetDate = date || getTodayDate();

  try {
    // Get rituals
    const { data: rituals, error: ritualsError } = await supabase
      .from('rituals')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('order_index', { ascending: true });

    if (ritualsError) throw ritualsError;

    // Get today's completions
    const { data: completions, error: completionsError } = await supabase
      .from('ritual_completions')
      .select('*')
      .eq('user_id', userId)
      .eq('completed_date', targetDate);

    if (completionsError) throw completionsError;

    // Get streaks
    const { data: streaks, error: streaksError } = await supabase
      .from('ritual_streaks')
      .select('*')
      .eq('user_id', userId);

    if (streaksError) throw streaksError;

    // Merge data
    type CompletionRecord = RitualCompletion & { ritual_id: string };
    type StreakRecord = RitualStreak & { ritual_id: string };
    const completionRows = (completions || []) as unknown as CompletionRecord[];
    const streakRows = (streaks || []) as unknown as StreakRecord[];
    const ritualRows = (rituals || []) as unknown as Ritual[];
    const completionMap = new Map(completionRows.map((completion) => [completion.ritual_id, completion]));
    const streakMap = new Map(streakRows.map((streak) => [streak.ritual_id, streak]));

    return ritualRows.map((ritual) => {
      const completion = completionMap.get(ritual.id) as RitualCompletion | undefined;
      const streak = streakMap.get(ritual.id) as RitualStreak | undefined;

      return {
        ...ritual,
        is_completed_today: !!completion,
        completion_note: completion?.note,
        streak_count: streak?.current_streak || 0,
      };
    });
  } catch (error) {
    logRitualsDataError('fetching rituals with status', error);
    return [];
  }
}

export async function createRitual(
  userId: string,
  ritual: Omit<Ritual, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<Ritual | null> {
  if (shouldSkipRitualsSchema()) return null;

  try {
    const { data, error } = await supabase.from('rituals')
      .insert({
        user_id: userId,
        ...ritual,
      })
      .select()
      .single();

    if (error) throw error;

    // Initialize streak tracking
    await supabase.from('ritual_streaks')
      .insert({
        user_id: userId,
        ritual_id: data.id,
      });

    return data as Ritual;
  } catch (error) {
    logRitualsDataError('creating ritual', error);
    return null;
  }
}

export async function createRitualFromInsight(
  userId: string,
  insightId: string,
  title: string,
  description?: string
): Promise<Ritual | null> {
  return createRitual(userId, {
    title,
    description,
    icon: 'bulb',
    color: '#C5A059',
    frequency: 'daily',
    linked_insight_id: insightId,
    is_active: true,
    order_index: 0,
  });
}

export async function updateRitual(
  ritualId: string,
  updates: Partial<Ritual>
): Promise<Ritual | null> {
  if (shouldSkipRitualsSchema()) return null;

  try {
    const { data, error } = await supabase.from('rituals')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', ritualId)
      .select()
      .single();

    if (error) throw error;
    return data as Ritual;
  } catch (error) {
    logRitualsDataError('updating ritual', error);
    return null;
  }
}

export async function deleteRitual(ritualId: string): Promise<boolean> {
  if (shouldSkipRitualsSchema()) return false;

  try {
    const { error } = await supabase
      .from('rituals')
      .delete()
      .eq('id', ritualId);

    if (error) throw error;
    return true;
  } catch (error) {
    logRitualsDataError('deleting ritual', error);
    return false;
  }
}

// ============ RITUAL COMPLETIONS ============

export async function completeRitual(
  userId: string,
  ritualId: string,
  note?: string
): Promise<RitualCompletion | null> {
  if (shouldSkipRitualsSchema()) return null;

  const today = getTodayDate();

  try {
    // Insert completion
    const { data: completion, error: completionError } = await supabase.from('ritual_completions')
      .upsert({
        ritual_id: ritualId,
        user_id: userId,
        completed_date: today,
        note,
      }, { onConflict: 'ritual_id,completed_date' })
      .select()
      .single();

    if (completionError) throw completionError;

    // Update streak
    await updateRitualStreak(userId, ritualId);

    return completion as RitualCompletion;
  } catch (error) {
    logRitualsDataError('completing ritual', error);
    return null;
  }
}

export async function uncompleteRitual(
  userId: string,
  ritualId: string
): Promise<boolean> {
  if (shouldSkipRitualsSchema()) return false;

  const today = getTodayDate();

  try {
    const { error } = await supabase
      .from('ritual_completions')
      .delete()
      .eq('ritual_id', ritualId)
      .eq('user_id', userId)
      .eq('completed_date', today);

    if (error) throw error;

    // Recalculate streak
    await updateRitualStreak(userId, ritualId);

    return true;
  } catch (error) {
    logRitualsDataError('uncompleting ritual', error);
    return false;
  }
}

async function updateRitualStreak(userId: string, ritualId: string): Promise<void> {
  if (shouldSkipRitualsSchema()) return;

  try {
    // Get all completions for this ritual
    const { data: completions } = await supabase
      .from('ritual_completions')
      .select('completed_date')
      .eq('ritual_id', ritualId)
      .eq('user_id', userId)
      .order('completed_date', { ascending: false });

    if (!completions || completions.length === 0) {
      await supabase.from('ritual_streaks')
        .upsert({
          user_id: userId,
          ritual_id: ritualId,
          current_streak: 0,
          total_completions: 0,
          last_completed_date: null,
          streak_started_date: null,
        }, { onConflict: 'user_id,ritual_id' });
      return;
    }

    // Calculate streak
    type CompletionDate = { completed_date: string };
    const dates = (completions as CompletionDate[]).map(c => c.completed_date).sort().reverse();
    const today = getTodayDate();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let currentStreak = 0;
    let streakStartDate = null;

    // Check if streak is active (completed today or yesterday)
    if (dates[0] === today || dates[0] === yesterdayStr) {
      currentStreak = 1;
      streakStartDate = dates[0];
      let prevDate = new Date(dates[0]);

      for (let i = 1; i < dates.length; i++) {
        const currentDate = new Date(dates[i]);
        const diffDays = Math.round((prevDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          currentStreak++;
          streakStartDate = dates[i];
          prevDate = currentDate;
        } else {
          break;
        }
      }
    }

    // Calculate longest streak
    let longestStreak = currentStreak;
    let tempStreak = 1;
    const sortedDates = [...dates].sort();

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

    // Calculate consistency score (% of days completed in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentCompletions = dates.filter(d => new Date(d) >= thirtyDaysAgo).length;
    const consistencyScore = Math.round((recentCompletions / 30) * 100);

    await supabase.from('ritual_streaks')
      .upsert({
        user_id: userId,
        ritual_id: ritualId,
        current_streak: currentStreak,
        longest_streak: longestStreak,
        total_completions: dates.length,
        last_completed_date: dates[0],
        streak_started_date: streakStartDate,
        consistency_score: consistencyScore,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,ritual_id' });
  } catch (error) {
    logRitualsDataError('updating ritual streak', error);
  }
}

// ============ DAILY REFLECTIONS ============

export async function getDailyReflection(
  userId: string,
  date: string,
  type: 'morning' | 'evening'
): Promise<DailyReflection | null> {
  if (shouldSkipRitualsSchema()) return null;

  try {
    const { data, error } = await supabase
      .from('daily_reflections')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .eq('reflection_type', type)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as DailyReflection | null;
  } catch (error) {
    logRitualsDataError('fetching daily reflection', error);
    return null;
  }
}

export async function saveDailyReflection(
  userId: string,
  reflection: Omit<DailyReflection, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<DailyReflection | null> {
  if (shouldSkipRitualsSchema()) return null;

  try {
    const { data, error } = await supabase.from('daily_reflections')
      .upsert({
        user_id: userId,
        ...reflection,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,date,reflection_type' })
      .select()
      .single();

    if (error) throw error;
    return data as DailyReflection;
  } catch (error) {
    logRitualsDataError('saving daily reflection', error);
    return null;
  }
}

export async function getRecentReflections(
  userId: string,
  limit = 7
): Promise<DailyReflection[]> {
  if (shouldSkipRitualsSchema()) return [];

  try {
    const { data, error } = await supabase
      .from('daily_reflections')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as DailyReflection[];
  } catch (error) {
    logRitualsDataError('fetching recent reflections', error);
    return [];
  }
}

// ============ GROWTH CHAPTERS ============

export async function getGrowthChapters(
  userId: string,
  status?: GrowthChapter['status']
): Promise<GrowthChapter[]> {
  if (shouldSkipRitualsSchema()) return [];

  try {
    let query = supabase
      .from('growth_chapters')
      .select('*')
      .eq('user_id', userId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as GrowthChapter[];
  } catch (error) {
    logRitualsDataError('fetching growth chapters', error);
    return [];
  }
}

export async function getChapterWithMilestones(
  chapterId: string
): Promise<GrowthChapterWithMilestones | null> {
  if (shouldSkipRitualsSchema()) return null;

  try {
    const { data: chapter, error: chapterError } = await supabase
      .from('growth_chapters')
      .select('*')
      .eq('id', chapterId)
      .single();

    if (chapterError) throw chapterError;

    const { data: milestones, error: milestonesError } = await supabase
      .from('chapter_milestones')
      .select('*')
      .eq('chapter_id', chapterId)
      .order('order_index', { ascending: true });

    if (milestonesError) throw milestonesError;

    // Get linked rituals
    const { data: rituals, error: ritualsError } = await supabase
      .from('rituals')
      .select('*')
      .eq('linked_chapter_id', chapterId)
      .eq('is_active', true);

    if (ritualsError) throw ritualsError;

    return {
      ...(chapter as GrowthChapter),
      milestones: (milestones || []) as ChapterMilestone[],
      linked_rituals: (rituals || []) as Ritual[],
    };
  } catch (error) {
    logRitualsDataError('fetching chapter with milestones', error);
    return null;
  }
}

export async function createGrowthChapter(
  userId: string,
  chapter: Omit<GrowthChapter, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'progress_percentage'>
): Promise<GrowthChapter | null> {
  if (shouldSkipRitualsSchema()) return null;

  try {
    // If this is primary, unset other primaries
    if (chapter.is_primary) {
      await supabase.from('growth_chapters')
        .update({ is_primary: false })
        .eq('user_id', userId)
        .eq('is_primary', true);
    }

    const { data, error } = await supabase.from('growth_chapters')
      .insert({
        user_id: userId,
        ...chapter,
        progress_percentage: 0,
      })
      .select()
      .single();

    if (error) throw error;
    return data as GrowthChapter;
  } catch (error) {
    logRitualsDataError('creating growth chapter', error);
    return null;
  }
}

export async function updateGrowthChapter(
  chapterId: string,
  updates: Partial<GrowthChapter>
): Promise<GrowthChapter | null> {
  if (shouldSkipRitualsSchema()) return null;

  try {
    const { data, error } = await supabase.from('growth_chapters')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', chapterId)
      .select()
      .single();

    if (error) throw error;
    return data as GrowthChapter;
  } catch (error) {
    logRitualsDataError('updating growth chapter', error);
    return null;
  }
}

// ============ CHAPTER MILESTONES ============

export async function createMilestone(
  userId: string,
  chapterId: string,
  milestone: Omit<ChapterMilestone, 'id' | 'chapter_id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<ChapterMilestone | null> {
  if (shouldSkipRitualsSchema()) return null;

  try {
    const { data, error } = await supabase.from('chapter_milestones')
      .insert({
        chapter_id: chapterId,
        user_id: userId,
        ...milestone,
      })
      .select()
      .single();

    if (error) throw error;

    // Update chapter progress
    await updateChapterProgress(chapterId);

    return data as ChapterMilestone;
  } catch (error) {
    logRitualsDataError('creating milestone', error);
    return null;
  }
}

export async function completeMilestone(milestoneId: string): Promise<ChapterMilestone | null> {
  if (shouldSkipRitualsSchema()) return null;

  try {
    const { data, error } = await supabase.from('chapter_milestones')
      .update({
        is_completed: true,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', milestoneId)
      .select()
      .single();

    if (error) throw error;

    // Update chapter progress
    if (data?.chapter_id) {
      await updateChapterProgress(data.chapter_id);
    }

    return data as ChapterMilestone;
  } catch (error) {
    logRitualsDataError('completing milestone', error);
    return null;
  }
}

async function updateChapterProgress(chapterId: string): Promise<void> {
  if (shouldSkipRitualsSchema()) return;

  try {
    const { data: milestones } = await supabase
      .from('chapter_milestones')
      .select('is_completed')
      .eq('chapter_id', chapterId);

    if (!milestones || milestones.length === 0) return;

    type MilestoneRecord = { is_completed: boolean };
    const completedCount = (milestones as MilestoneRecord[]).filter(m => m.is_completed).length;
    const progress = Math.round((completedCount / milestones.length) * 100);

    await supabase.from('growth_chapters')
      .update({ progress_percentage: progress, updated_at: new Date().toISOString() })
      .eq('id', chapterId);
  } catch (error) {
    logRitualsDataError('updating chapter progress', error);
  }
}

// ============ EDITORIAL NUDGES ============

export async function getUnreadNudges(userId: string, limit = 5): Promise<EditorialNudge[]> {
  if (shouldSkipRitualsSchema()) return [];

  try {
    const { data, error } = await supabase
      .from('editorial_nudges')
      .select('*')
      .eq('user_id', userId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as EditorialNudge[];
  } catch (error) {
    logRitualsDataError('fetching unread nudges', error);
    return [];
  }
}

export async function createNudge(
  userId: string,
  nudge: Omit<EditorialNudge, 'id' | 'user_id' | 'is_read' | 'created_at'>
): Promise<EditorialNudge | null> {
  if (shouldSkipRitualsSchema()) return null;

  try {
    const { data, error } = await supabase.from('editorial_nudges')
      .insert({
        user_id: userId,
        ...nudge,
        is_read: false,
      })
      .select()
      .single();

    if (error) throw error;
    return data as EditorialNudge;
  } catch (error) {
    logRitualsDataError('creating nudge', error);
    return null;
  }
}

export async function markNudgeAsRead(nudgeId: string): Promise<boolean> {
  if (shouldSkipRitualsSchema()) return false;

  try {
    const { error } = await supabase.from('editorial_nudges')
      .update({ is_read: true })
      .eq('id', nudgeId);

    if (error) throw error;
    return true;
  } catch (error) {
    logRitualsDataError('marking nudge as read', error);
    return false;
  }
}

// ============ TODAY'S PRACTICE SUMMARY ============

export async function getTodayPractice(userId: string): Promise<TodayPractice> {
  if (shouldSkipRitualsSchema()) {
    return {
      rituals: [],
      overallProgress: 0,
      streakDays: 0,
      unreadNudges: [],
    };
  }

  const today = getTodayDate();

  try {
    const [rituals, morningReflection, eveningReflection, chapters, nudges, streaks] = await Promise.all([
      getRitualsWithStatus(userId, today),
      getDailyReflection(userId, today, 'morning'),
      getDailyReflection(userId, today, 'evening'),
      getGrowthChapters(userId, 'active'),
      getUnreadNudges(userId),
      supabase
        .from('ritual_streaks')
        .select('current_streak')
        .eq('user_id', userId)
        .order('current_streak', { ascending: false })
        .limit(1),
    ]);

    const completedRituals = rituals.filter(r => r.is_completed_today).length;
    const totalRituals = rituals.length;
    const overallProgress = totalRituals > 0 ? Math.round((completedRituals / totalRituals) * 100) : 0;

    const primaryChapter = chapters.find(c => c.is_primary) || chapters[0] || undefined;
    type StreakData = { current_streak: number };
    const streakData = streaks.data as StreakData[] | null;
    const maxStreak = (streakData && streakData.length > 0) ? streakData[0].current_streak : 0;

    return {
      rituals,
      morningReflection: morningReflection || undefined,
      eveningReflection: eveningReflection || undefined,
      activeChapter: primaryChapter,
      overallProgress,
      streakDays: maxStreak,
      unreadNudges: nudges,
    };
  } catch (error) {
    logRitualsDataError('fetching today practice', error);
    return {
      rituals: [],
      overallProgress: 0,
      streakDays: 0,
      unreadNudges: [],
    };
  }
}

// ============ OVERALL STREAK (Consistency Metric) ============

export async function getOverallConsistency(userId: string): Promise<{
  currentStreak: number;
  longestStreak: number;
  weeklyAverage: number;
  monthlyTrend: 'up' | 'down' | 'stable';
}> {
  if (shouldSkipRitualsSchema()) {
    return { currentStreak: 0, longestStreak: 0, weeklyAverage: 0, monthlyTrend: 'stable' };
  }

  try {
    // Get all completions from last 60 days
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const { data: completions } = await supabase
      .from('ritual_completions')
      .select('completed_date')
      .eq('user_id', userId)
      .gte('completed_date', sixtyDaysAgo.toISOString().split('T')[0]);

    // Get unique dates
    type DateRecord = { completed_date: string };
    const uniqueDates = [...new Set((completions || []).map((c: DateRecord) => c.completed_date))].sort().reverse();

    // Calculate current streak (days with at least one completion)
    const today = getTodayDate();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    let currentStreak = 0;
    if (uniqueDates[0] === today || uniqueDates[0] === yesterdayStr) {
      currentStreak = 1;
      let prevDate = new Date(uniqueDates[0]);

      for (let i = 1; i < uniqueDates.length; i++) {
        const currentDate = new Date(uniqueDates[i]);
        const diffDays = Math.round((prevDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
          currentStreak++;
          prevDate = currentDate;
        } else {
          break;
        }
      }
    }

    // Calculate longest streak
    let longestStreak = currentStreak;
    let tempStreak = 1;
    const sortedDates = [...uniqueDates].sort();

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

    // Weekly average (days per week with completions, last 4 weeks)
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const recentDates = uniqueDates.filter(d => new Date(d) >= fourWeeksAgo);
    const weeklyAverage = Math.round((recentDates.length / 4) * 10) / 10;

    // Monthly trend (compare last 2 weeks vs 2 weeks before)
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const recentTwoWeeks = uniqueDates.filter(d => new Date(d) >= twoWeeksAgo).length;
    const previousTwoWeeks = uniqueDates.filter(d => new Date(d) >= fourWeeksAgo && new Date(d) < twoWeeksAgo).length;

    let monthlyTrend: 'up' | 'down' | 'stable' = 'stable';
    if (recentTwoWeeks > previousTwoWeeks + 1) monthlyTrend = 'up';
    else if (recentTwoWeeks < previousTwoWeeks - 1) monthlyTrend = 'down';

    return { currentStreak, longestStreak, weeklyAverage, monthlyTrend };
  } catch (error) {
    logRitualsDataError('fetching overall consistency', error);
    return { currentStreak: 0, longestStreak: 0, weeklyAverage: 0, monthlyTrend: 'stable' };
  }
}
