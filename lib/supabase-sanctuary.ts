// Supabase Sanctuary Service - Session Persistence
import { createClient } from '@supabase/supabase-js';
import {
  EnhancedSession,
  EnhancedMessage,
  KeyInsight,
  Breakthrough,
  Coach,
} from '@/types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Sessions
export async function createSession(
  userId: string,
  coachId: string,
  title?: string
): Promise<EnhancedSession | null> {
  try {
    const { data, error } = await supabase
      .from('coaching_sessions')
      .insert({
        user_id: userId,
        coach_id: coachId,
        title: title || 'New Session',
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;
    return data as EnhancedSession;
  } catch (error) {
    console.error('Error creating session:', error);
    return null;
  }
}

export async function getSessionById(sessionId: string): Promise<EnhancedSession | null> {
  try {
    const { data, error } = await supabase
      .from('coaching_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) throw error;
    return data as EnhancedSession;
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
  try {
    let query = supabase
      .from('coaching_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (coachId) {
      query = query.eq('coach_id', coachId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as EnhancedSession[];
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return [];
  }
}

export async function updateSessionById(
  sessionId: string,
  updates: Partial<EnhancedSession>
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('coaching_sessions')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
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
  try {
    // First get the current breakthrough
    const { data: breakthrough, error: fetchError } = await supabase
      .from('breakthroughs')
      .select('action_items')
      .eq('id', breakthroughId)
      .single();

    if (fetchError) throw fetchError;

    // Update the action
    const actionItems = (breakthrough.action_items || []).map(
      (item: { id: string; title: string; completed: boolean }) =>
        item.id === actionId ? { ...item, completed } : item
    );

    const { error } = await supabase
      .from('breakthroughs')
      .update({ action_items: actionItems })
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
  try {
    // Find most recent active or recent session with this coach
    const { data: session, error: sessionError } = await supabase
      .from('coaching_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('coach_id', coachId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (sessionError && sessionError.code !== 'PGRST116') throw sessionError;
    if (!session) return null;

    // Get messages for this session
    const messages = await getSessionMessages(session.id);

    return {
      session: session as EnhancedSession,
      messages,
    };
  } catch (error) {
    console.error('Error fetching active session:', error);
    return null;
  }
}
