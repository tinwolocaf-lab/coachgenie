import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { generateGeminiEmbedding } from './gemini.ts';

// ── Types ───────────────────────────────────────────────────────────────

export type MemoryType = 'episodic' | 'semantic' | 'profile' | 'summary';
export type SourceType = 'session_message' | 'journal' | 'ritual' | 'calendar' | 'health' | 'system';

export interface MemoryRecord {
  id: string;
  memoryType: MemoryType;
  sourceType: SourceType;
  content: string;
  salienceScore: number;
  confidenceScore: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  similarity?: number;
}

export interface MemorySearchResult {
  memories: MemoryRecord[];
  totalFound: number;
}

// ── Constants ───────────────────────────────────────────────────────────

const EMBEDDING_MODEL = (Deno.env.get('GEMINI_EMBEDDING_MODEL') ?? 'gemini-embedding-001').trim();
const EMBEDDING_DIMENSIONS = 1536;
const MAX_TEXT_LENGTH = 8000;
const DEFAULT_SIMILARITY_THRESHOLD = 0.3;
const DEFAULT_SEARCH_LIMIT = 5;

// ── Embedding (via Gemini SDK) ───────────────────────────────────────────

export async function generateEmbedding(text: string): Promise<number[]> {
  const truncated = text.length > MAX_TEXT_LENGTH ? text.slice(0, MAX_TEXT_LENGTH) : text;

  try {
    const embedding = await generateGeminiEmbedding(truncated, {
      model: EMBEDDING_MODEL,
      outputDimensionality: EMBEDDING_DIMENSIONS,
    });

    if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSIONS) {
      console.error('[memory] Unexpected embedding shape:', embedding?.length);
      return new Array(EMBEDDING_DIMENSIONS).fill(0);
    }

    return embedding;
  } catch (err) {
    console.error('[memory] Failed to generate embedding:', err);
    return new Array(EMBEDDING_DIMENSIONS).fill(0);
  }
}

// ── Store ───────────────────────────────────────────────────────────────

export async function storeMemory(
  serviceClient: SupabaseClient,
  opts: {
    userId: string;
    memoryType: MemoryType;
    sourceType: SourceType;
    sourceId?: string;
    content: string;
    salienceScore?: number;
    metadata?: Record<string, unknown>;
  }
): Promise<string> {
  const embedding = await generateEmbedding(opts.content);

  const row = {
    user_id: opts.userId,
    memory_type: opts.memoryType,
    source_type: opts.sourceType,
    source_id: opts.sourceId ?? null,
    content: opts.content,
    salience_score: opts.salienceScore ?? 0.5,
    embedding,
    metadata: opts.metadata ?? {},
  };

  try {
    const { data, error } = await serviceClient
      .from('user_memories')
      .insert(row)
      .select('id')
      .single();

    if (error) {
      console.error('[memory] Insert error:', error.message);
      return '';
    }

    return data?.id ?? '';
  } catch (err) {
    console.error('[memory] Failed to store memory:', err);
    return '';
  }
}

// ── Search ──────────────────────────────────────────────────────────────

export async function searchMemories(
  serviceClient: SupabaseClient,
  opts: {
    userId: string;
    query: string;
    limit?: number;
    memoryTypes?: MemoryType[];
    minSimilarity?: number;
  }
): Promise<MemorySearchResult> {
  const empty: MemorySearchResult = { memories: [], totalFound: 0 };

  const queryEmbedding = await generateEmbedding(opts.query);
  const limit = opts.limit ?? DEFAULT_SEARCH_LIMIT;
  const minSimilarity = opts.minSimilarity ?? DEFAULT_SIMILARITY_THRESHOLD;

  try {
    let query = serviceClient
      .rpc('match_user_memories', {
        query_embedding: queryEmbedding,
        match_user_id: opts.userId,
        match_threshold: minSimilarity,
        match_count: limit,
      });

    if (opts.memoryTypes?.length) {
      query = query.in('memory_type', opts.memoryTypes);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[memory] Search RPC error:', error.message);

      // Fallback: raw SQL-style query via .from() with ordering
      return await searchMemoriesFallback(serviceClient, opts, queryEmbedding, limit, minSimilarity);
    }

    if (!data || !Array.isArray(data)) {
      return empty;
    }

    const memories: MemoryRecord[] = data.map(mapRowToMemoryRecord);

    return {
      memories,
      totalFound: memories.length,
    };
  } catch (err) {
    console.error('[memory] Search failed:', err);
    return empty;
  }
}

async function searchMemoriesFallback(
  serviceClient: SupabaseClient,
  opts: {
    userId: string;
    memoryTypes?: MemoryType[];
  },
  _queryEmbedding: number[],
  limit: number,
  _minSimilarity: number
): Promise<MemorySearchResult> {
  try {
    let query = serviceClient
      .from('user_memories')
      .select('*')
      .eq('user_id', opts.userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (opts.memoryTypes?.length) {
      query = query.in('memory_type', opts.memoryTypes);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[memory] Fallback query error:', error.message);
      return { memories: [], totalFound: 0 };
    }

    const memories: MemoryRecord[] = (data ?? []).map(mapRowToMemoryRecord);

    return {
      memories,
      totalFound: memories.length,
    };
  } catch (err) {
    console.error('[memory] Fallback search failed:', err);
    return { memories: [], totalFound: 0 };
  }
}

// ── Format for Prompt ───────────────────────────────────────────────────

export function formatMemoriesForPrompt(memories: MemoryRecord[]): string {
  if (!memories.length) {
    return '';
  }

  const grouped: Record<string, MemoryRecord[]> = {};
  for (const mem of memories) {
    const key = mem.memoryType;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(mem);
  }

  const typeLabels: Record<MemoryType, string> = {
    episodic: 'Past Experiences',
    semantic: 'Learned Knowledge',
    profile: 'User Profile',
    summary: 'Session Summaries',
  };

  const sections: string[] = [];

  for (const [type, records] of Object.entries(grouped)) {
    const label = typeLabels[type as MemoryType] ?? type;
    const items = records
      .map((r) => {
        const date = new Date(r.createdAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        return `- [${date}] ${r.content}`;
      })
      .join('\n');
    sections.push(`=== ${label} ===\n${items}`);
  }

  return sections.join('\n\n');
}

// ── Helpers ─────────────────────────────────────────────────────────────

function mapRowToMemoryRecord(row: Record<string, unknown>): MemoryRecord {
  return {
    id: (row.id as string) ?? '',
    memoryType: (row.memory_type as MemoryType) ?? 'episodic',
    sourceType: (row.source_type as SourceType) ?? 'system',
    content: (row.content as string) ?? '',
    salienceScore: (row.salience_score as number) ?? 0,
    confidenceScore: (row.confidence_score as number) ?? 0,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: (row.created_at as string) ?? '',
    similarity: (row.similarity as number) ?? undefined,
  };
}
