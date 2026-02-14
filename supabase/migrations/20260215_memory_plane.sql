-- Migration: 20260215_memory_plane
-- Description: Vector memory storage and periodic user state snapshots for the Memory Plane

-- ============================================
-- PGVECTOR EXTENSION
-- ============================================
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- USER MEMORIES (VECTOR MEMORY STORAGE)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL,          -- episodic|semantic|profile|summary
  source_type TEXT NOT NULL,          -- session_message|journal|ritual|calendar|health|system
  source_id UUID,
  content TEXT NOT NULL,
  embedding vector(1536),
  salience_score NUMERIC(4,3) DEFAULT 0.5,
  confidence_score NUMERIC(4,3) DEFAULT 0.7,
  ttl_expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USER STATE SNAPSHOTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_state_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  state JSONB NOT NULL,               -- mood trend, active commitments, confidence, risk flags
  summary TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- user_memories indexes
CREATE INDEX IF NOT EXISTS idx_user_memories_user_id
  ON public.user_memories(user_id);

CREATE INDEX IF NOT EXISTS idx_user_memories_user_type
  ON public.user_memories(user_id, memory_type);

CREATE INDEX IF NOT EXISTS idx_user_memories_embedding_hnsw
  ON public.user_memories
  USING hnsw (embedding vector_cosine_ops);

-- user_state_snapshots indexes
CREATE INDEX IF NOT EXISTS idx_user_state_snapshots_user_id
  ON public.user_state_snapshots(user_id);

CREATE INDEX IF NOT EXISTS idx_user_state_snapshots_user_created
  ON public.user_state_snapshots(user_id, created_at DESC);

-- ============================================
-- RLS: USER MEMORIES
-- ============================================
ALTER TABLE public.user_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_memories_select_own
  ON public.user_memories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY user_memories_insert_own
  ON public.user_memories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- RLS: USER STATE SNAPSHOTS
-- ============================================
ALTER TABLE public.user_state_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_state_snapshots_select_own
  ON public.user_state_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY user_state_snapshots_insert_own
  ON public.user_state_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);
