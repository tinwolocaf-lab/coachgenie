import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { storeMemory, type MemoryType } from './memory.ts';
import {
  extractOpenRouterMessageContent,
  getDefaultOpenRouterChatModel,
  openRouterChat,
} from './openrouter.ts';

// ── Types ───────────────────────────────────────────────────────────────

export interface CompactionResult {
  userId: string;
  episodicProcessed: number;
  summariesCreated: number;
  memoriesPruned: number;
}

interface EpisodicRow {
  id: string;
  user_id: string;
  content: string;
  source_type: string;
  source_id: string | null;
  salience_score: number;
  created_at: string;
  metadata: Record<string, unknown>;
}

// ── Constants ───────────────────────────────────────────────────────────

const COMPACTION_BATCH_SIZE = 20;
const COMPACTION_AGE_HOURS = 24;
const MAX_SUMMARY_INPUT_CHARS = 6000;
const TTL_DAYS_EPISODIC = 30;
const TTL_DAYS_SUMMARY = 180;
const DEFAULT_CHAT_MODEL = getDefaultOpenRouterChatModel();

// ── Core compaction ─────────────────────────────────────────────────────

/**
 * Compact episodic memories older than COMPACTION_AGE_HOURS into semantic
 * summaries. This is designed to run as a scheduled job.
 *
 * Steps:
 *  1. Fetch uncompacted episodic memories for the user
 *  2. Group them into batches by time window
 *  3. Summarize each batch via LLM
 *  4. Store the summaries as 'summary' type memories
 *  5. Mark the originals with a TTL for later pruning
 */
export async function compactUserMemories(
  serviceClient: SupabaseClient,
  userId: string,
): Promise<CompactionResult> {
  const result: CompactionResult = {
    userId,
    episodicProcessed: 0,
    summariesCreated: 0,
    memoriesPruned: 0,
  };

  const cutoff = new Date(Date.now() - COMPACTION_AGE_HOURS * 60 * 60 * 1000).toISOString();

  const { data: episodics, error } = await serviceClient
    .from('user_memories')
    .select('id, user_id, content, source_type, source_id, salience_score, created_at, metadata')
    .eq('user_id', userId)
    .eq('memory_type', 'episodic')
    .is('ttl_expires_at', null)
    .lt('created_at', cutoff)
    .order('created_at', { ascending: true })
    .limit(100);

  if (error || !episodics?.length) {
    return result;
  }

  // Process in batches
  for (let i = 0; i < episodics.length; i += COMPACTION_BATCH_SIZE) {
    const batch = episodics.slice(i, i + COMPACTION_BATCH_SIZE) as EpisodicRow[];
    result.episodicProcessed += batch.length;

    const summaryText = await summarizeBatch(batch);
    if (!summaryText) continue;

    const stored = await storeMemory(serviceClient, {
      userId,
      memoryType: 'summary',
      sourceType: 'system',
      content: summaryText,
      salienceScore: computeAvgSalience(batch),
      metadata: {
        compacted_from: batch.map((b) => b.id),
        time_range_start: batch[0].created_at,
        time_range_end: batch[batch.length - 1].created_at,
        original_count: batch.length,
      },
    });

    if (stored) {
      result.summariesCreated++;
    }

    // Set TTL on compacted episodics so they get pruned later
    const ttlDate = new Date(Date.now() + TTL_DAYS_EPISODIC * 24 * 60 * 60 * 1000).toISOString();
    const batchIds = batch.map((b) => b.id);

    await serviceClient
      .from('user_memories')
      .update({ ttl_expires_at: ttlDate })
      .in('id', batchIds);
  }

  return result;
}

/**
 * Prune memories past their TTL expiration date.
 */
export async function pruneExpiredMemories(
  serviceClient: SupabaseClient,
  userId: string,
): Promise<number> {
  const now = new Date().toISOString();

  const { data, error } = await serviceClient
    .from('user_memories')
    .delete()
    .eq('user_id', userId)
    .lt('ttl_expires_at', now)
    .select('id');

  if (error) {
    console.error('[memory-compaction] Prune error:', error.message);
    return 0;
  }

  return data?.length ?? 0;
}

/**
 * Run full compaction + pruning for all active users.
 */
export async function compactAllUsers(
  serviceClient: SupabaseClient,
): Promise<CompactionResult[]> {
  // Get distinct user IDs with uncompacted episodic memories
  const cutoff = new Date(Date.now() - COMPACTION_AGE_HOURS * 60 * 60 * 1000).toISOString();

  const { data: users, error } = await serviceClient
    .from('user_memories')
    .select('user_id')
    .eq('memory_type', 'episodic')
    .is('ttl_expires_at', null)
    .lt('created_at', cutoff);

  if (error || !users?.length) {
    return [];
  }

  const uniqueUserIds = [...new Set(users.map((u) => u.user_id))];
  const results: CompactionResult[] = [];

  for (const uid of uniqueUserIds) {
    try {
      const compactResult = await compactUserMemories(serviceClient, uid);
      const pruned = await pruneExpiredMemories(serviceClient, uid);
      compactResult.memoriesPruned = pruned;
      results.push(compactResult);
    } catch (err) {
      console.error(`[memory-compaction] Error for user ${uid}:`, err);
    }
  }

  return results;
}

// ── Helpers ─────────────────────────────────────────────────────────────

async function summarizeBatch(batch: EpisodicRow[]): Promise<string | null> {
  const batchText = batch
    .map((b) => {
      const date = new Date(b.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
      return `[${date}] ${b.content}`;
    })
    .join('\n')
    .slice(0, MAX_SUMMARY_INPUT_CHARS);

  try {
    const response = await openRouterChat({
      model: DEFAULT_CHAT_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are a memory compaction system for a coaching app. ' +
            'Summarize the following episodic memories into a concise paragraph. ' +
            'Preserve key facts, emotional themes, commitments, and breakthroughs. ' +
            'Use third person ("The user..."). Keep it under 200 words.',
        },
        {
          role: 'user',
          content: `Summarize these memories:\n\n${batchText}`,
        },
      ],
      max_tokens: 400,
      temperature: 0.3,
    });

    if (!response.ok) {
      console.error('[memory-compaction] LLM error:', await response.text());
      return null;
    }

    const json = await response.json();
    return extractOpenRouterMessageContent(json).trim() || null;
  } catch (err) {
    console.error('[memory-compaction] Summarization failed:', err);
    return null;
  }
}

function computeAvgSalience(batch: EpisodicRow[]): number {
  if (!batch.length) return 0.5;
  const sum = batch.reduce((acc, b) => acc + (b.salience_score ?? 0.5), 0);
  return Math.round((sum / batch.length) * 1000) / 1000;
}
