// Supabase Sanctuary Service - Session Persistence
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  EnhancedSession,
  EnhancedMessage,
  KeyInsight,
  Breakthrough,
  BreakthroughAction,
} from '@/types';

type SessionTableName = 'coaching_sessions' | 'sessions';

let cachedSessionTableName: SessionTableName | null = null;

interface PostgrestLikeError {
  code?: string;
  message?: string;
}

function isMissingTableError(error: unknown, table: string): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const record = error as PostgrestLikeError;
  return record.code === 'PGRST205'
    && typeof record.message === 'string'
    && record.message.includes(`'public.${table}'`);
}

function normalizeSessionRow(
  row: Record<string, unknown>,
  table: SessionTableName
): EnhancedSession {
  const status = row.status === 'completed' ? 'completed' : 'active';
  const title = typeof row.title === 'string' && row.title.length > 0 ? row.title : 'New Session';
  const createdAt = typeof row.created_at === 'string' ? row.created_at : new Date().toISOString();
  const completedAt = table === 'coaching_sessions'
    ? (typeof row.completed_at === 'string' ? row.completed_at : undefined)
    : (typeof row.ended_at === 'string' ? row.ended_at : undefined);
  const summary = typeof row.summary === 'string' ? row.summary : undefined;
  const breakthroughSummary = typeof row.breakthrough_summary === 'string'
    ? row.breakthrough_summary
    : undefined;

  return {
    id: String(row.id ?? ''),
    user_id: String(row.user_id ?? ''),
    coach_id: row.coach_id ? String(row.coach_id) : '',
    title,
    status,
    summary,
    breakthrough_summary: breakthroughSummary,
    created_at: createdAt,
    completed_at: completedAt,
  };
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function getSessionTableName(): Promise<SessionTableName> {
  if (cachedSessionTableName) return cachedSessionTableName;

  const { error } = await supabase
    .from('coaching_sessions')
    .select('id')
    .limit(1);

  if (!error) {
    cachedSessionTableName = 'coaching_sessions';
    return cachedSessionTableName;
  }

  if (isMissingTableError(error, 'coaching_sessions')) {
    cachedSessionTableName = 'sessions';
    return cachedSessionTableName;
  }

  cachedSessionTableName = 'coaching_sessions';
  return cachedSessionTableName;
}

// Sessions
export async function createSession(
  userId: string,
  coachId: string,
  title?: string
): Promise<EnhancedSession | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const sessionTable = await getSessionTableName();
    const coachIdForDb = isUuid(coachId) ? coachId : null;
    const insertPayload = sessionTable === 'coaching_sessions'
      ? {
          user_id: userId,
          coach_id: coachIdForDb,
          title: title || 'New Session',
          status: 'active' as const,
        }
      : {
          user_id: userId,
          coach_id: coachIdForDb,
          title: title || 'New Session',
          status: 'active' as const,
        };

    const { data, error } = await supabase
      .from(sessionTable)
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) throw error;
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    return normalizeSessionRow(data as Record<string, unknown>, sessionTable);
  } catch (error) {
    console.error('Error creating session:', error);
    return null;
  }
}

export async function getSessionById(sessionId: string): Promise<EnhancedSession | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const sessionTable = await getSessionTableName();
    const { data, error } = await supabase
      .from(sessionTable)
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) throw error;
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    return normalizeSessionRow(data as Record<string, unknown>, sessionTable);
  } catch (error) {
    console.error('Error fetching session:', error);
    return null;
  }
}

export async function getUserSessions(
  userId: string,
  coachId?: string,
  limit = 20
): Promise<EnhancedSession[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const sessionTable = await getSessionTableName();
    let query = supabase
      .from(sessionTable)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (coachId && isUuid(coachId)) {
      query = query.eq('coach_id', coachId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || [])
      .filter((row): row is Record<string, unknown> => typeof row === 'object' && row !== null && !Array.isArray(row))
      .map((row) => normalizeSessionRow(row, sessionTable));
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return [];
  }
}

export async function updateSessionById(
  sessionId: string,
  updates: Partial<EnhancedSession>
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const sessionTable = await getSessionTableName();
    const mappedUpdates = sessionTable === 'coaching_sessions'
      ? {
          ...updates,
          updated_at: new Date().toISOString(),
        }
      : {
          ...(typeof updates.title === 'string' ? { title: updates.title } : {}),
          ...(typeof updates.status === 'string' ? { status: updates.status } : {}),
          ...(typeof updates.coach_id === 'string' ? { coach_id: updates.coach_id } : {}),
          ...(typeof updates.completed_at === 'string' ? { ended_at: updates.completed_at } : {}),
        };

    if (sessionTable === 'sessions' && Object.keys(mappedUpdates).length === 0) {
      return true;
    }

    const { error } = await supabase
      .from(sessionTable)
      .update(mappedUpdates)
      .eq('id', sessionId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating session:', error);
    return false;
  }
}

export async function completeSession(
  sessionId: string,
  summary: string,
  breakthroughSummary?: string
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  return updateSessionById(sessionId, {
    status: 'completed',
    summary,
    breakthrough_summary: breakthroughSummary,
    completed_at: new Date().toISOString(),
  });
}

// Messages
export async function addMessage(
  sessionId: string,
  role: 'user' | 'assistant',
  content: string,
  isInsight = false,
  insightTitle?: string
): Promise<EnhancedMessage | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('session_messages')
      .insert({
        session_id: sessionId,
        role,
        content,
        is_insight: isInsight,
        insight_title: insightTitle,
      })
      .select()
      .single();

    if (error) throw error;
    return data as EnhancedMessage;
  } catch (error) {
    console.error('Error adding message:', error);
    return null;
  }
}

export async function getSessionMessages(
  sessionId: string
): Promise<EnhancedMessage[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('session_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return (data || []) as EnhancedMessage[];
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
}

export async function markMessageAsInsight(
  messageId: string,
  insightTitle: string
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase
      .from('session_messages')
      .update({
        is_insight: true,
        insight_title: insightTitle,
      })
      .eq('id', messageId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error marking message as insight:', error);
    return false;
  }
}

// Key Insights (Journal)
export async function saveInsight(
  userId: string,
  sessionId: string | undefined,
  coachId: string,
  title: string,
  content: string,
  category: KeyInsight['category'] = 'general'
): Promise<KeyInsight | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('key_insights')
      .insert({
        user_id: userId,
        session_id: sessionId,
        coach_id: coachId,
        title,
        content,
        category,
        is_highlighted: false,
      })
      .select()
      .single();

    if (error) throw error;
    return data as KeyInsight;
  } catch (error) {
    console.error('Error saving insight:', error);
    return null;
  }
}

export async function getUserInsights(
  userId: string,
  limit = 50
): Promise<KeyInsight[]> {
  if (!isSupabaseConfigured) return [];
  try {
    const { data, error } = await supabase
      .from('key_insights')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []) as KeyInsight[];
  } catch (error) {
    console.error('Error fetching insights:', error);
    return [];
  }
}

export async function toggleInsightHighlight(
  insightId: string,
  highlighted: boolean
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase
      .from('key_insights')
      .update({ is_highlighted: highlighted })
      .eq('id', insightId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating insight:', error);
    return false;
  }
}

export async function deleteInsight(insightId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase
      .from('key_insights')
      .delete()
      .eq('id', insightId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting insight:', error);
    return false;
  }
}

// Breakthroughs
export async function saveBreakthrough(
  userId: string,
  sessionId: string | undefined,
  coachId: string,
  title: string,
  summary: string,
  keyTakeaways: string[],
  actionItems: { id: string; title: string; completed: boolean }[]
): Promise<Breakthrough | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('breakthroughs')
      .insert({
        user_id: userId,
        session_id: sessionId,
        coach_id: coachId,
        title,
        summary,
        key_takeaways: keyTakeaways,
        action_items: actionItems,
        date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single();

    if (error) throw error;
    return data as Breakthrough;
  } catch (error) {
    console.error('Error saving breakthrough:', error);
    return null;
  }
}

export async function getTodaysBreakthrough(
  userId: string
): Promise<Breakthrough | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('breakthroughs')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data as Breakthrough | null;
  } catch (error) {
    console.error('Error fetching today\'s breakthrough:', error);
    return null;
  }
}

export async function getUserBreakthroughs(
  userId: string,
  limit = 30
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
    return (data || []) as Breakthrough[];
  } catch (error) {
    console.error('Error fetching breakthroughs:', error);
    return [];
  }
}

export async function updateBreakthroughAction(
  breakthroughId: string,
  actionId: string,
  completed: boolean
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    // First get the current breakthrough
    const { data: breakthrough, error: fetchError } = await supabase
      .from('breakthroughs')
      .select('action_items')
      .eq('id', breakthroughId)
      .single();

    if (fetchError) throw fetchError;

    // Update the action
    const rawActionItems = breakthrough?.action_items;
    const existingActionItems: BreakthroughAction[] = Array.isArray(rawActionItems)
      ? (rawActionItems as unknown[]).flatMap((item) => {
          if (typeof item !== 'object' || item === null || Array.isArray(item)) {
            return [];
          }
          const record = item as Record<string, unknown>;
          if (typeof record.id !== 'string' || record.id.length === 0) {
            return [];
          }
          return [{
            id: record.id,
            title: typeof record.title === 'string' ? record.title : '',
            completed: typeof record.completed === 'boolean' ? record.completed : false,
          }];
        })
      : [];
    const actionItems = existingActionItems.map((item) =>
      item.id === actionId ? { ...item, completed } : item
    );
    const actionItemsForDb: Record<string, string | boolean>[] = actionItems.map((item) => ({
      id: item.id,
      title: item.title,
      completed: item.completed,
    }));

    const { error } = await supabase
      .from('breakthroughs')
      .update({ action_items: actionItemsForDb })
      .eq('id', breakthroughId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating breakthrough action:', error);
    return false;
  }
}

// Resume Session
export async function getActiveSession(
  userId: string,
  coachId: string
): Promise<{ session: EnhancedSession; messages: EnhancedMessage[] } | null> {
  if (!isSupabaseConfigured) return null;
  try {
    if (!isUuid(coachId)) return null;
    const sessionTable = await getSessionTableName();
    // Find most recent active or recent session with this coach
    const { data: session, error: sessionError } = await supabase
      .from(sessionTable)
      .select('*')
      .eq('user_id', userId)
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (sessionError && sessionError.code !== 'PGRST116') throw sessionError;
    if (!session) return null;
    if (typeof session !== 'object' || Array.isArray(session)) return null;
    const typedSession = normalizeSessionRow(session as Record<string, unknown>, sessionTable);

    // Get messages for this session
    const messages = await getSessionMessages(typedSession.id);

    return {
      session: typedSession,
      messages,
    };
  } catch (error) {
    console.error('Error fetching active session:', error);
    return null;
  }
}
