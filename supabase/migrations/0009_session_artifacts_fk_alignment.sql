-- Migration: 0009_session_artifacts_fk_alignment
-- Purpose: Align legacy session_artifacts FK with coaching_sessions.

ALTER TABLE IF EXISTS public.session_artifacts
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

UPDATE public.session_artifacts AS sa
SET user_id = cs.user_id
FROM public.coaching_sessions AS cs
WHERE sa.session_id = cs.id
  AND sa.user_id IS NULL;

ALTER TABLE IF EXISTS public.session_artifacts
DROP CONSTRAINT IF EXISTS session_artifacts_session_id_fkey;

ALTER TABLE IF EXISTS public.session_artifacts
ADD CONSTRAINT session_artifacts_session_id_fkey
FOREIGN KEY (session_id)
REFERENCES public.coaching_sessions(id)
ON DELETE CASCADE;
