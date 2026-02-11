-- Migration: 0008_session_messages_fk_alignment
-- Purpose: Align legacy session_messages FK with coaching_sessions.

-- Backfill canonical sessions from legacy sessions table (if present).
INSERT INTO public.coaching_sessions (
  id,
  user_id,
  coach_id,
  title,
  status,
  created_at,
  updated_at,
  completed_at
)
SELECT
  s.id,
  s.user_id,
  COALESCE(s.coach_id::text, 'legacy'),
  COALESCE(NULLIF(s.title, ''), 'Legacy Session'),
  CASE WHEN s.status IN ('active', 'completed') THEN s.status ELSE 'active' END,
  COALESCE(s.created_at, NOW()),
  NOW(),
  s.ended_at
FROM public.sessions AS s
ON CONFLICT (id) DO NOTHING;

-- Populate missing message user_id from canonical sessions.
UPDATE public.session_messages AS sm
SET user_id = cs.user_id
FROM public.coaching_sessions AS cs
WHERE sm.session_id = cs.id
  AND sm.user_id IS NULL;

-- Realign FK target to canonical coaching_sessions table.
ALTER TABLE public.session_messages
DROP CONSTRAINT IF EXISTS session_messages_session_id_fkey;

ALTER TABLE public.session_messages
ADD CONSTRAINT session_messages_session_id_fkey
FOREIGN KEY (session_id)
REFERENCES public.coaching_sessions(id)
ON DELETE CASCADE;
