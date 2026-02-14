import * as FileSystem from 'expo-file-system';
import { SAMPLE_COACHES, getCoachById as getBuiltInCoachById } from '@/data/coaches';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type {
  Coach,
  CoachDeletionRequest,
  CoachInstallSnapshot,
  CoachMarketplaceStatus,
  CoachSource,
  InstalledCoach,
} from '@/types';
import {
  getInstalledCoaches as getLocalInstalledCoaches,
  hasInstalledCoachMigrationRun,
  installCoach as installLocalCoach,
  markInstalledCoachMigrationRun,
  saveInstalledCoaches,
  uninstallCoach as uninstallLocalCoach,
} from '@/store/app';

const COACH_IMAGES_BUCKET = 'coach-images';
const DEFAULT_COACH_COLOR = '#C5A059';
const DEFAULT_COACH_ICON = 'sparkles';
const DEFAULT_COACH_METHOD = 'Supportive reflective coaching with concrete next steps.';
const DEFAULT_COACH_PROMPT = 'You are a helpful coaching assistant. Be concise and actionable.';
const NORMALIZED_DEFAULT_COACH_METHOD = DEFAULT_COACH_METHOD.trim().toLowerCase();

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isBuiltinCoachId(coachId: string): boolean {
  return !!getBuiltInCoachById(coachId);
}

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const clean = base64.replace(/\s/g, '');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup: Record<string, number> = {};
  for (let i = 0; i < chars.length; i++) {
    lookup[chars[i]] = i;
  }

  const len = clean.length;
  const bufferLength = Math.floor((len * 3) / 4) - (clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0);
  const bytes = new Uint8Array(bufferLength);

  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const encoded1 = lookup[clean[i]];
    const encoded2 = lookup[clean[i + 1]];
    const encoded3 = clean[i + 2] === '=' ? 64 : lookup[clean[i + 2]];
    const encoded4 = clean[i + 3] === '=' ? 64 : lookup[clean[i + 3]];

    const chunk = (encoded1 << 18) | (encoded2 << 12) | ((encoded3 & 63) << 6) | (encoded4 & 63);

    if (p < bufferLength) bytes[p++] = (chunk >> 16) & 255;
    if (encoded3 !== 64 && p < bufferLength) bytes[p++] = (chunk >> 8) & 255;
    if (encoded4 !== 64 && p < bufferLength) bytes[p++] = chunk & 255;
  }

  return bytes.buffer;
}

function normalizeMarketplaceStatus(value: unknown): CoachMarketplaceStatus {
  if (
    value === 'draft' ||
    value === 'published' ||
    value === 'unpublished' ||
    value === 'removed'
  ) {
    return value;
  }
  return 'draft';
}

function normalizeCoachName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function hasCoachImage(coach: Coach): boolean {
  return !!coach.image || (typeof coach.image_url === 'string' && coach.image_url.trim().length > 0);
}

function isLegacyGenericCoach(coach: Coach): boolean {
  const normalizedMethod = coach.method.trim().toLowerCase();
  return (
    coach.icon_name === DEFAULT_COACH_ICON &&
    normalizedMethod === NORMALIZED_DEFAULT_COACH_METHOD &&
    !hasCoachImage(coach)
  );
}

function coachPreferenceScore(coach: Coach): number {
  let score = 0;

  if (coach.source === 'builtin') score += 40;
  if (coach.source === 'owned_custom') score += 30;
  if (coach.source === 'marketplace') score += 20;
  if (coach.source === 'installed_snapshot') score += 10;

  if (hasCoachImage(coach)) score += 35;
  if (coach.icon_name !== DEFAULT_COACH_ICON) score += 10;
  if (coach.color !== DEFAULT_COACH_COLOR) score += 5;
  if (coach.tagline.trim().length > 0) score += 5;
  if (coach.description.trim().length > 0) score += 5;
  if (coach.method.trim().toLowerCase() !== NORMALIZED_DEFAULT_COACH_METHOD) score += 20;

  return score;
}

function pickPreferredCoach(candidates: Coach[]): Coach {
  return candidates.reduce((best, current) => {
    const bestScore = coachPreferenceScore(best);
    const currentScore = coachPreferenceScore(current);

    if (currentScore !== bestScore) {
      return currentScore > bestScore ? current : best;
    }

    return current.created_at > best.created_at ? current : best;
  });
}

function mergeCoachImage(primary: Coach, candidates: Coach[]): Coach {
  if (hasCoachImage(primary)) {
    return primary;
  }

  const sourceWithImage = candidates.find(hasCoachImage);
  if (!sourceWithImage) {
    return primary;
  }

  const merged: Coach = { ...primary };

  if (sourceWithImage.image) {
    merged.image = sourceWithImage.image;
  }

  if (sourceWithImage.image_url) {
    merged.image_url = sourceWithImage.image_url;
    if (!merged.image) {
      merged.image = { uri: sourceWithImage.image_url };
    }
  }

  return merged;
}

function dedupeMarketplaceCatalog(coaches: Coach[]): Coach[] {
  const groupedByName = new Map<string, Coach[]>();

  for (const coach of coaches) {
    const key = normalizeCoachName(coach.name);
    const existing = groupedByName.get(key);
    if (existing) {
      existing.push(coach);
    } else {
      groupedByName.set(key, [coach]);
    }
  }

  const deduped: Coach[] = [];

  for (const group of groupedByName.values()) {
    if (group.length === 1) {
      deduped.push(group[0]);
      continue;
    }

    const containsBuiltin = group.some((coach) => coach.source === 'builtin');
    const containsLegacyGeneric = group.some(isLegacyGenericCoach);

    if (!containsBuiltin && !containsLegacyGeneric) {
      deduped.push(...group);
      continue;
    }

    const preferred = pickPreferredCoach(group);
    deduped.push(mergeCoachImage(preferred, group));
  }

  return deduped;
}

function mapCoachRowToCoach(row: Record<string, unknown>, source: CoachSource = 'marketplace'): Coach {
  const imageUrl = typeof row.image_url === 'string'
    ? row.image_url
    : typeof row.icon_path === 'string' && (row.icon_path.startsWith('http://') || row.icon_path.startsWith('https://'))
      ? row.icon_path
      : null;

  const coach: Coach = {
    id: String(row.id ?? ''),
    name: String(row.name ?? 'Coach'),
    tagline: String(row.tagline ?? ''),
    description: String(row.description ?? ''),
    icon_name: String(row.icon_name ?? DEFAULT_COACH_ICON),
    color: String(row.color ?? DEFAULT_COACH_COLOR),
    method: String(row.method ?? DEFAULT_COACH_METHOD),
    version: String(row.version ?? '1.0.0'),
    is_public:
      row.is_public === true ||
      (typeof row.visibility === 'string' && row.visibility.toLowerCase() === 'public'),
    system_prompt: String(row.system_prompt ?? DEFAULT_COACH_PROMPT),
    marketplace_status: normalizeMarketplaceStatus(row.marketplace_status),
    source,
    image_url: imageUrl,
    owner_user_id:
      typeof row.user_id === 'string'
        ? row.user_id
        : typeof row.created_by === 'string'
          ? row.created_by
          : null,
    created_at: String(row.created_at ?? new Date().toISOString()),
  };

  if (imageUrl) {
    coach.image = { uri: imageUrl };
  }

  return coach;
}

function snapshotToCoach(coachId: string, snapshot: Partial<CoachInstallSnapshot>): Coach {
  const imageUrl = snapshot.snapshot_image_url ?? null;
  const coach: Coach = {
    id: coachId,
    name: snapshot.snapshot_name || 'Coach',
    tagline: snapshot.snapshot_tagline || '',
    description: snapshot.snapshot_description || '',
    icon_name: snapshot.snapshot_icon_name || DEFAULT_COACH_ICON,
    color: snapshot.snapshot_color || DEFAULT_COACH_COLOR,
    method: snapshot.snapshot_method || DEFAULT_COACH_METHOD,
    version: snapshot.snapshot_version || '1.0.0',
    is_public: false,
    system_prompt: snapshot.snapshot_system_prompt || DEFAULT_COACH_PROMPT,
    source: 'installed_snapshot',
    image_url: imageUrl,
    created_at: new Date().toISOString(),
  };

  if (imageUrl) {
    coach.image = { uri: imageUrl };
  }

  return coach;
}

function coachToSnapshot(coach: Coach): CoachInstallSnapshot {
  return {
    snapshot_name: coach.name,
    snapshot_tagline: coach.tagline,
    snapshot_description: coach.description,
    snapshot_method: coach.method,
    snapshot_system_prompt: coach.system_prompt,
    snapshot_icon_name: coach.icon_name,
    snapshot_color: coach.color,
    snapshot_image_url: coach.image_url ?? null,
    snapshot_version: coach.version,
  };
}

async function getCurrentUserId(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

function normalizeInstalledRow(row: Record<string, unknown>): InstalledCoach {
  const coachId = String(row.coach_id ?? '');
  const snapshot: CoachInstallSnapshot = {
    snapshot_name: String(row.snapshot_name ?? ''),
    snapshot_tagline: typeof row.snapshot_tagline === 'string' ? row.snapshot_tagline : null,
    snapshot_description: typeof row.snapshot_description === 'string' ? row.snapshot_description : null,
    snapshot_method: typeof row.snapshot_method === 'string' ? row.snapshot_method : null,
    snapshot_system_prompt: typeof row.snapshot_system_prompt === 'string' ? row.snapshot_system_prompt : null,
    snapshot_icon_name: typeof row.snapshot_icon_name === 'string' ? row.snapshot_icon_name : null,
    snapshot_color: typeof row.snapshot_color === 'string' ? row.snapshot_color : null,
    snapshot_image_url: typeof row.snapshot_image_url === 'string' ? row.snapshot_image_url : null,
    snapshot_version: typeof row.snapshot_version === 'string' ? row.snapshot_version : null,
  };

  const installed: InstalledCoach = {
    id: typeof row.id === 'string' ? row.id : `${String(row.user_id ?? '')}:${coachId}`,
    user_id: String(row.user_id ?? ''),
    coach_id: coachId,
    is_active: row.is_active === true,
    installed_at: String(row.installed_at ?? new Date().toISOString()),
    uninstalled_at: typeof row.uninstalled_at === 'string' ? row.uninstalled_at : null,
    snapshot,
  };

  if (snapshot.snapshot_name) {
    installed.coach = snapshotToCoach(coachId, snapshot);
  }

  return installed;
}

function mergeInstalled(local: InstalledCoach[], remote: InstalledCoach[]): InstalledCoach[] {
  const map = new Map<string, InstalledCoach>();

  for (const entry of local) {
    map.set(entry.coach_id, entry);
  }

  for (const entry of remote) {
    map.set(entry.coach_id, entry);
  }

  return Array.from(map.values()).filter((entry) => entry.uninstalled_at == null);
}

async function syncLegacyLocalInstallsToSupabase(userId: string, localInstalled: InstalledCoach[]): Promise<void> {
  const alreadyMigrated = await hasInstalledCoachMigrationRun(userId);
  if (alreadyMigrated || localInstalled.length === 0) {
    return;
  }

  const legacyUuidInstalls = localInstalled.filter(
    (entry) => entry.uninstalled_at == null && isUuid(entry.coach_id),
  );
  if (legacyUuidInstalls.length === 0) {
    await markInstalledCoachMigrationRun(userId);
    return;
  }

  for (const entry of legacyUuidInstalls) {
    const snapshot = entry.snapshot ?? (entry.coach ? coachToSnapshot(entry.coach) : undefined);
    await supabase.from('installed_coaches').upsert(
      {
        user_id: userId,
        coach_id: entry.coach_id,
        is_active: entry.is_active ?? false,
        installed_at: entry.installed_at || new Date().toISOString(),
        uninstalled_at: entry.uninstalled_at ?? null,
        snapshot_name: snapshot?.snapshot_name ?? entry.coach?.name ?? 'Coach',
        snapshot_tagline: snapshot?.snapshot_tagline ?? entry.coach?.tagline ?? null,
        snapshot_description: snapshot?.snapshot_description ?? entry.coach?.description ?? null,
        snapshot_method: snapshot?.snapshot_method ?? entry.coach?.method ?? null,
        snapshot_system_prompt: snapshot?.snapshot_system_prompt ?? entry.coach?.system_prompt ?? null,
        snapshot_icon_name: snapshot?.snapshot_icon_name ?? entry.coach?.icon_name ?? null,
        snapshot_color: snapshot?.snapshot_color ?? entry.coach?.color ?? null,
        snapshot_image_url: snapshot?.snapshot_image_url ?? entry.coach?.image_url ?? null,
        snapshot_version: snapshot?.snapshot_version ?? entry.coach?.version ?? '1.0.0',
      },
      { onConflict: 'user_id,coach_id' },
    );
  }

  await markInstalledCoachMigrationRun(userId);
}

export async function listMarketplaceCoaches(): Promise<Coach[]> {
  const builtins = SAMPLE_COACHES.map((coach) => ({
    ...coach,
    source: 'builtin' as CoachSource,
    marketplace_status: 'published' as CoachMarketplaceStatus,
  }));

  if (!isSupabaseConfigured) {
    return builtins;
  }

  try {
    const { data, error } = await supabase
      .from('coaches')
      .select('*')
      .eq('is_public', true)
      .eq('marketplace_status', 'published')
      .order('published_at', { ascending: false });

    if (error || !data) {
      if (error) console.warn('Failed to load marketplace coaches:', error.message);
      return builtins;
    }

    const marketplace = (data as Record<string, unknown>[])
      .map((row) => mapCoachRowToCoach(row, 'marketplace'))
      .filter((coach) => !builtins.some((builtin) => builtin.id === coach.id));

    return dedupeMarketplaceCatalog([...builtins, ...marketplace]);
  } catch (error) {
    console.warn('Failed to load marketplace coaches:', error);
    return builtins;
  }
}

export async function listInstalledCoaches(): Promise<InstalledCoach[]> {
  const localInstalled = await getLocalInstalledCoaches();

  if (!isSupabaseConfigured) {
    return localInstalled.map((entry) => {
      const builtin = getBuiltInCoachById(entry.coach_id);
      return {
        ...entry,
        coach: builtin ?? entry.coach,
      };
    });
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return localInstalled;
  }

  try {
    await syncLegacyLocalInstallsToSupabase(userId, localInstalled);
  } catch (error) {
    console.warn('Legacy installed coach migration skipped:', error);
  }

  let remoteInstalled: InstalledCoach[] = [];
  try {
    const { data, error } = await supabase
      .from('installed_coaches')
      .select('*')
      .eq('user_id', userId)
      .is('uninstalled_at', null)
      .order('installed_at', { ascending: false });

    if (error) {
      console.warn('Failed to load installed coaches from Supabase:', error.message);
    } else {
      remoteInstalled = (data as Record<string, unknown>[]).map(normalizeInstalledRow);
    }
  } catch (error) {
    console.warn('Failed to load installed coaches from Supabase:', error);
  }

  const merged = mergeInstalled(localInstalled, remoteInstalled);

  const unresolvedCoachIds = merged
    .filter((entry) => !entry.coach)
    .map((entry) => entry.coach_id)
    .filter((id, index, arr) => arr.indexOf(id) === index);

  if (unresolvedCoachIds.length > 0) {
    try {
      const { data } = await supabase
        .from('coaches')
        .select('*')
        .in('id', unresolvedCoachIds);

      const byId = new Map(
        ((data || []) as Record<string, unknown>[]).map((row) => [String(row.id), mapCoachRowToCoach(row, 'marketplace')]),
      );

      for (const entry of merged) {
        if (!entry.coach) {
          entry.coach = byId.get(entry.coach_id) ?? getBuiltInCoachById(entry.coach_id);
        }
      }
    } catch (error) {
      console.warn('Failed to hydrate installed coach metadata:', error);
    }
  } else {
    for (const entry of merged) {
      if (!entry.coach) {
        entry.coach = getBuiltInCoachById(entry.coach_id);
      }
    }
  }

  await saveInstalledCoaches(merged);
  return merged;
}

export async function getCoachByIdResolved(coachId: string): Promise<Coach | null> {
  const builtin = getBuiltInCoachById(coachId);
  if (builtin) {
    return {
      ...builtin,
      source: 'builtin',
      marketplace_status: 'published',
    };
  }

  if (!isSupabaseConfigured) {
    return null;
  }

  const userId = await getCurrentUserId();

  if (userId) {
    try {
      const { data } = await supabase
        .from('installed_coaches')
        .select('*')
        .eq('user_id', userId)
        .eq('coach_id', coachId)
        .is('uninstalled_at', null)
        .maybeSingle();

      if (data) {
        const normalized = normalizeInstalledRow(data as Record<string, unknown>);
        if (normalized.coach) return normalized.coach;
      }
    } catch {
      // continue with marketplace lookup
    }
  }

  try {
    const { data, error } = await supabase
      .from('coaches')
      .select('*')
      .eq('id', coachId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const coach = mapCoachRowToCoach(data as Record<string, unknown>, 'marketplace');
    if (userId && (coach.owner_user_id === userId)) {
      coach.source = 'owned_custom';
    }
    return coach;
  } catch {
    return null;
  }
}

export async function getCoachesByIdsResolved(coachIds: string[]): Promise<Map<string, Coach>> {
  const uniqueCoachIds = [...new Set((coachIds || []).filter(Boolean))];
  const result = new Map<string, Coach>();
  if (uniqueCoachIds.length === 0) return result;

  const resolved = await Promise.all(
    uniqueCoachIds.map(async (coachId) => [coachId, await getCoachByIdResolved(coachId)] as const),
  );

  for (const [coachId, coach] of resolved) {
    if (coach) {
      result.set(coachId, coach);
    }
  }

  return result;
}

export interface CreateCoachDraftInput {
  name: string;
  tagline?: string;
  description?: string;
  method: string;
  systemPrompt: string;
  iconName: string;
  color: string;
  imagePath?: string | null;
  imageUrl?: string | null;
}

export async function createCoachDraft(input: CreateCoachDraftInput): Promise<Coach> {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error('Sign in required');
  }

  const slug = `${slugifyName(input.name)}-${Date.now().toString(36)}`;

  const payload = {
    user_id: userId,
    created_by: userId,
    is_custom: true,
    slug,
    name: input.name.trim(),
    tagline: input.tagline?.trim() || '',
    description: input.description?.trim() || '',
    method: input.method.trim(),
    system_prompt: input.systemPrompt.trim(),
    icon_name: input.iconName,
    color: input.color,
    image_path: input.imagePath ?? null,
    image_url: input.imageUrl ?? null,
    version: '1.0.0',
    is_public: false,
    marketplace_status: 'draft' as CoachMarketplaceStatus,
    published_at: null,
  };

  const { data, error } = await supabase.from('coaches').insert(payload).select('*').single();
  if (error || !data) {
    throw new Error(error?.message || 'Failed to create coach draft');
  }

  return mapCoachRowToCoach(data as Record<string, unknown>, 'owned_custom');
}

export interface UpdateCoachPatch {
  name?: string;
  tagline?: string;
  description?: string;
  method?: string;
  systemPrompt?: string;
  iconName?: string;
  color?: string;
  imagePath?: string | null;
  imageUrl?: string | null;
}

export async function updateCoach(coachId: string, patch: UpdateCoachPatch): Promise<Coach> {
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (patch.name !== undefined) updates.name = patch.name.trim();
  if (patch.tagline !== undefined) updates.tagline = patch.tagline.trim();
  if (patch.description !== undefined) updates.description = patch.description.trim();
  if (patch.method !== undefined) updates.method = patch.method.trim();
  if (patch.systemPrompt !== undefined) updates.system_prompt = patch.systemPrompt.trim();
  if (patch.iconName !== undefined) updates.icon_name = patch.iconName;
  if (patch.color !== undefined) updates.color = patch.color;
  if (patch.imagePath !== undefined) updates.image_path = patch.imagePath;
  if (patch.imageUrl !== undefined) updates.image_url = patch.imageUrl;

  const { data, error } = await supabase
    .from('coaches')
    .update(updates)
    .eq('id', coachId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to update coach');
  }

  return mapCoachRowToCoach(data as Record<string, unknown>, 'owned_custom');
}

export async function publishCoach(coachId: string): Promise<Coach> {
  const { data, error } = await supabase
    .from('coaches')
    .update({
      is_public: true,
      marketplace_status: 'published',
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', coachId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to publish coach');
  }

  return mapCoachRowToCoach(data as Record<string, unknown>, 'owned_custom');
}

export async function unpublishCoach(coachId: string): Promise<Coach> {
  const { data, error } = await supabase
    .from('coaches')
    .update({
      is_public: false,
      marketplace_status: 'unpublished',
      updated_at: new Date().toISOString(),
    })
    .eq('id', coachId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to unpublish coach');
  }

  return mapCoachRowToCoach(data as Record<string, unknown>, 'owned_custom');
}

export async function installCoachFromMarketplace(coachId: string): Promise<InstalledCoach> {
  const builtin = isBuiltinCoachId(coachId) ? getBuiltInCoachById(coachId) : undefined;

  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error('Sign in required to install coaches');
  }

  if (builtin) {
    const localInstall: InstalledCoach = {
      id: `${userId}:${coachId}`,
      user_id: userId,
      coach_id: coachId,
      is_active: false,
      installed_at: new Date().toISOString(),
      coach: builtin ?? undefined,
      snapshot: builtin ? coachToSnapshot(builtin) : undefined,
    };
    await installLocalCoach(localInstall);
    return localInstall;
  }

  const coach = await getCoachByIdResolved(coachId);
  if (!coach) {
    throw new Error('Coach not found');
  }

  const snapshot = coachToSnapshot(coach);

  const upsertPayload = {
    user_id: userId,
    coach_id: coachId,
    is_active: false,
    installed_at: new Date().toISOString(),
    uninstalled_at: null,
    snapshot_name: snapshot.snapshot_name,
    snapshot_tagline: snapshot.snapshot_tagline,
    snapshot_description: snapshot.snapshot_description,
    snapshot_method: snapshot.snapshot_method,
    snapshot_system_prompt: snapshot.snapshot_system_prompt,
    snapshot_icon_name: snapshot.snapshot_icon_name,
    snapshot_color: snapshot.snapshot_color,
    snapshot_image_url: snapshot.snapshot_image_url,
    snapshot_version: snapshot.snapshot_version,
  };

  const { data, error } = await supabase
    .from('installed_coaches')
    .upsert(upsertPayload, { onConflict: 'user_id,coach_id' })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message || 'Failed to install coach');
  }

  const installed = normalizeInstalledRow(data as Record<string, unknown>);
  installed.coach = coach;

  await installLocalCoach(installed);
  return installed;
}

export async function uninstallCoach(coachId: string): Promise<void> {
  await uninstallLocalCoach(coachId);

  if (!isSupabaseConfigured) {
    return;
  }

  const userId = await getCurrentUserId();
  if (!userId) return;

  const { error } = await supabase
    .from('installed_coaches')
    .update({
      is_active: false,
      uninstalled_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('coach_id', coachId);

  if (error) {
    throw new Error(error.message);
  }
}

export interface DeleteCoachResult {
  action: 'deleted' | 'requested';
  request?: CoachDeletionRequest;
}

export async function deleteCoachOrRequestReview(coachId: string, reason?: string): Promise<DeleteCoachResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error('Sign in required');
  }

  const { count, error: countError } = await supabase
    .from('installed_coaches')
    .select('coach_id', { count: 'exact', head: true })
    .eq('coach_id', coachId)
    .neq('user_id', userId)
    .is('uninstalled_at', null);

  if (countError) {
    throw new Error(countError.message);
  }

  if ((count || 0) > 0) {
    if (!reason || reason.trim().length < 8) {
      throw new Error('A detailed reason is required when other users have this coach installed.');
    }

    const { data, error } = await supabase
      .from('coach_deletion_requests')
      .insert({
        coach_id: coachId,
        requester_id: userId,
        reason: reason.trim(),
        status: 'pending',
      })
      .select('*')
      .single();

    if (error || !data) {
      throw new Error(error?.message || 'Failed to create deletion request');
    }

    return {
      action: 'requested',
      request: data as CoachDeletionRequest,
    };
  }

  const { error } = await supabase
    .from('coaches')
    .delete()
    .eq('id', coachId)
    .or(`user_id.eq.${userId},created_by.eq.${userId}`);

  if (error) {
    throw new Error(error.message);
  }

  return { action: 'deleted' };
}

export async function listMyCoaches(): Promise<Coach[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('coaches')
    .select('*')
    .or(`user_id.eq.${userId},created_by.eq.${userId}`)
    .order('updated_at', { ascending: false });

  if (error || !data) {
    if (error) console.warn('Failed to load my coaches:', error.message);
    return [];
  }

  return (data as Record<string, unknown>[]).map((row) => mapCoachRowToCoach(row, 'owned_custom'));
}

export async function listMyDeletionRequests(): Promise<CoachDeletionRequest[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('coach_deletion_requests')
    .select('*')
    .eq('requester_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    if (error) console.warn('Failed to load coach deletion requests:', error.message);
    return [];
  }

  return data as CoachDeletionRequest[];
}

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

function getFileExt(uri: string): string {
  const clean = uri.split('?')[0];
  const parts = clean.split('.');
  const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'jpg';
  return CONTENT_TYPE_BY_EXT[ext] ? ext : 'jpg';
}

export async function uploadCoachImage(uri: string): Promise<{ path: string; url: string }> {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error('Sign in required');
  }

  const ext = getFileExt(uri);
  const contentType = CONTENT_TYPE_BY_EXT[ext] || 'image/jpeg';
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
  const fileBuffer = base64ToArrayBuffer(base64);

  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

  const { error } = await supabase.storage
    .from(COACH_IMAGES_BUCKET)
    .upload(path, fileBuffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(COACH_IMAGES_BUCKET).getPublicUrl(path);
  return {
    path,
    url: data.publicUrl,
  };
}
