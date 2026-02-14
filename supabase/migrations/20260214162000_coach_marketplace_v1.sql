-- Coach Marketplace V1 (additive, non-destructive)

-- Ensure updated_at trigger function exists.
CREATE OR REPLACE FUNCTION public.coachgenie_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Coaches table: additive columns required by app/runtime
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.coaches
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS method TEXT,
  ADD COLUMN IF NOT EXISTS system_prompt TEXT,
  ADD COLUMN IF NOT EXISTS icon_name TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT,
  ADD COLUMN IF NOT EXISTS image_path TEXT,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS version TEXT,
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN,
  ADD COLUMN IF NOT EXISTS marketplace_status TEXT,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE IF EXISTS public.coaches
  ALTER COLUMN color SET DEFAULT '#C5A059',
  ALTER COLUMN version SET DEFAULT '1.0.0',
  ALTER COLUMN is_public SET DEFAULT FALSE,
  ALTER COLUMN marketplace_status SET DEFAULT 'draft',
  ALTER COLUMN updated_at SET DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'coaches_marketplace_status_check'
      AND conrelid = 'public.coaches'::regclass
  ) THEN
    ALTER TABLE public.coaches
      ADD CONSTRAINT coaches_marketplace_status_check
      CHECK (marketplace_status IN ('draft', 'published', 'unpublished', 'removed'));
  END IF;
END
$$;

-- Backfill from legacy columns where present.
UPDATE public.coaches
SET
  user_id = COALESCE(user_id, created_by),
  tagline = COALESCE(tagline, CASE WHEN description IS NOT NULL THEN left(description, 80) ELSE NULL END),
  method = COALESCE(method, 'Supportive reflective coaching with concrete next steps.'),
  system_prompt = COALESCE(system_prompt, 'You are a helpful coaching assistant. Be concise and actionable.'),
  icon_name = COALESCE(icon_name, 'sparkles'),
  color = COALESCE(color, '#C5A059'),
  version = COALESCE(version, '1.0.0'),
  is_public = COALESCE(
    is_public,
    CASE
      WHEN visibility IS NOT NULL THEN visibility = 'public'
      ELSE FALSE
    END
  ),
  marketplace_status = COALESCE(
    marketplace_status,
    CASE
      WHEN visibility = 'public' THEN 'published'
      WHEN is_public IS TRUE THEN 'published'
      ELSE 'draft'
    END
  ),
  published_at = COALESCE(
    published_at,
    CASE
      WHEN visibility = 'public' OR is_public IS TRUE THEN COALESCE(created_at, NOW())
      ELSE NULL
    END
  ),
  image_path = COALESCE(image_path, icon_path)
WHERE TRUE;

UPDATE public.coaches
SET image_url = COALESCE(image_url, icon_path)
WHERE image_url IS NULL
  AND icon_path IS NOT NULL
  AND (icon_path ILIKE 'http://%' OR icon_path ILIKE 'https://%');

DROP TRIGGER IF EXISTS update_coaches_updated_at ON public.coaches;
CREATE TRIGGER update_coaches_updated_at
  BEFORE UPDATE ON public.coaches
  FOR EACH ROW
  EXECUTE FUNCTION public.coachgenie_set_updated_at();

-- ---------------------------------------------------------------------------
-- Installed coaches: snapshot fields + soft uninstall support
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.installed_coaches
  ADD COLUMN IF NOT EXISTS snapshot_name TEXT,
  ADD COLUMN IF NOT EXISTS snapshot_tagline TEXT,
  ADD COLUMN IF NOT EXISTS snapshot_description TEXT,
  ADD COLUMN IF NOT EXISTS snapshot_method TEXT,
  ADD COLUMN IF NOT EXISTS snapshot_system_prompt TEXT,
  ADD COLUMN IF NOT EXISTS snapshot_icon_name TEXT,
  ADD COLUMN IF NOT EXISTS snapshot_color TEXT,
  ADD COLUMN IF NOT EXISTS snapshot_image_url TEXT,
  ADD COLUMN IF NOT EXISTS snapshot_version TEXT,
  ADD COLUMN IF NOT EXISTS uninstalled_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS public.installed_coaches
  ALTER COLUMN snapshot_version SET DEFAULT '1.0.0';

-- Backfill existing installs with current coach values where available.
UPDATE public.installed_coaches AS ic
SET
  snapshot_name = COALESCE(ic.snapshot_name, c.name),
  snapshot_tagline = COALESCE(ic.snapshot_tagline, c.tagline),
  snapshot_description = COALESCE(ic.snapshot_description, c.description),
  snapshot_method = COALESCE(ic.snapshot_method, c.method),
  snapshot_system_prompt = COALESCE(ic.snapshot_system_prompt, c.system_prompt),
  snapshot_icon_name = COALESCE(ic.snapshot_icon_name, c.icon_name),
  snapshot_color = COALESCE(ic.snapshot_color, c.color),
  snapshot_image_url = COALESCE(ic.snapshot_image_url, c.image_url),
  snapshot_version = COALESCE(ic.snapshot_version, c.version, '1.0.0')
FROM public.coaches AS c
WHERE c.id = ic.coach_id;

-- ---------------------------------------------------------------------------
-- Session snapshot payload used by chat/voice runtime
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.coaching_sessions
  ADD COLUMN IF NOT EXISTS coach_snapshot JSONB;

-- ---------------------------------------------------------------------------
-- Deletion requests table for moderation workflow
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coach_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES public.coaches(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_reason TEXT,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_coach_deletion_requests_updated_at ON public.coach_deletion_requests;
CREATE TRIGGER update_coach_deletion_requests_updated_at
  BEFORE UPDATE ON public.coach_deletion_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.coachgenie_set_updated_at();

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_coaches_owner_user_id ON public.coaches(user_id);
CREATE INDEX IF NOT EXISTS idx_coaches_marketplace_listing ON public.coaches(marketplace_status, is_public, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_installed_coaches_active_lookup ON public.installed_coaches(coach_id, user_id, uninstalled_at);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON public.coach_deletion_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_coach ON public.coach_deletion_requests(coach_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_requester ON public.coach_deletion_requests(requester_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.coachgenie_can_manage_custom_coaches(p_user UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.credit_accounts ca
      WHERE ca.user_id = p_user
        AND ca.tier IN ('sovereign', 'oracle')
    )
    OR EXISTS (
      SELECT 1
      FROM public.billing_tier_cache bc
      WHERE bc.user_id = p_user
        AND bc.tier IN ('sovereign', 'oracle')
        AND bc.expires_at > NOW()
    );
$$;

-- ---------------------------------------------------------------------------
-- Coaches RLS
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.coaches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view public coaches" ON public.coaches;
DROP POLICY IF EXISTS coaches_select_policy ON public.coaches;
DROP POLICY IF EXISTS coaches_insert_policy ON public.coaches;
DROP POLICY IF EXISTS coaches_update_policy ON public.coaches;
DROP POLICY IF EXISTS coaches_delete_policy ON public.coaches;

CREATE POLICY coaches_select_policy
  ON public.coaches FOR SELECT
  USING (
    (is_public = TRUE AND marketplace_status = 'published')
    OR auth.uid() = user_id
    OR auth.uid() = created_by
  );

CREATE POLICY coaches_insert_policy
  ON public.coaches FOR INSERT
  WITH CHECK (
    (
      auth.uid() = COALESCE(user_id, auth.uid())
      AND (created_by IS NULL OR created_by = auth.uid())
    )
    AND public.coachgenie_can_manage_custom_coaches(auth.uid())
  );

CREATE POLICY coaches_update_policy
  ON public.coaches FOR UPDATE
  USING (
    (auth.uid() = user_id OR auth.uid() = created_by)
  )
  WITH CHECK (
    (auth.uid() = user_id OR auth.uid() = created_by)
    AND public.coachgenie_can_manage_custom_coaches(auth.uid())
  );

CREATE POLICY coaches_delete_policy
  ON public.coaches FOR DELETE
  USING (
    (auth.uid() = user_id OR auth.uid() = created_by)
    AND NOT EXISTS (
      SELECT 1
      FROM public.installed_coaches ic
      WHERE ic.coach_id = coaches.id
        AND ic.user_id <> auth.uid()
        AND ic.uninstalled_at IS NULL
    )
  );

-- ---------------------------------------------------------------------------
-- Installed coaches RLS
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.installed_coaches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own installed coaches" ON public.installed_coaches;
DROP POLICY IF EXISTS "Users can manage own installed coaches" ON public.installed_coaches;
DROP POLICY IF EXISTS installed_coaches_select_policy ON public.installed_coaches;
DROP POLICY IF EXISTS installed_coaches_insert_policy ON public.installed_coaches;
DROP POLICY IF EXISTS installed_coaches_update_policy ON public.installed_coaches;
DROP POLICY IF EXISTS installed_coaches_delete_policy ON public.installed_coaches;

CREATE POLICY installed_coaches_select_policy
  ON public.installed_coaches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY installed_coaches_insert_policy
  ON public.installed_coaches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY installed_coaches_update_policy
  ON public.installed_coaches FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY installed_coaches_delete_policy
  ON public.installed_coaches FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Deletion requests RLS
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.coach_deletion_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coach_deletion_requests_select_policy ON public.coach_deletion_requests;
DROP POLICY IF EXISTS coach_deletion_requests_insert_policy ON public.coach_deletion_requests;
DROP POLICY IF EXISTS coach_deletion_requests_update_policy ON public.coach_deletion_requests;
DROP POLICY IF EXISTS coach_deletion_requests_delete_policy ON public.coach_deletion_requests;

CREATE POLICY coach_deletion_requests_select_policy
  ON public.coach_deletion_requests FOR SELECT
  USING (
    requester_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.coaches c
      WHERE c.id = coach_deletion_requests.coach_id
        AND (c.user_id = auth.uid() OR c.created_by = auth.uid())
    )
  );

CREATE POLICY coach_deletion_requests_insert_policy
  ON public.coach_deletion_requests FOR INSERT
  WITH CHECK (
    requester_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.coaches c
      WHERE c.id = coach_deletion_requests.coach_id
        AND (c.user_id = auth.uid() OR c.created_by = auth.uid())
    )
  );

-- Block end-user updates/deletes; admin/service role bypasses RLS.
CREATE POLICY coach_deletion_requests_update_policy
  ON public.coach_deletion_requests FOR UPDATE
  USING (FALSE)
  WITH CHECK (FALSE);

CREATE POLICY coach_deletion_requests_delete_policy
  ON public.coach_deletion_requests FOR DELETE
  USING (FALSE);

-- ---------------------------------------------------------------------------
-- Storage bucket + policies for coach images
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'coach-images',
  'coach-images',
  TRUE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS coach_images_public_read ON storage.objects;
DROP POLICY IF EXISTS coach_images_owner_insert ON storage.objects;
DROP POLICY IF EXISTS coach_images_owner_update ON storage.objects;
DROP POLICY IF EXISTS coach_images_owner_delete ON storage.objects;

CREATE POLICY coach_images_public_read
  ON storage.objects FOR SELECT
  USING (bucket_id = 'coach-images');

CREATE POLICY coach_images_owner_insert
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'coach-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY coach_images_owner_update
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'coach-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'coach-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY coach_images_owner_delete
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'coach-images'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
