import { createServiceClient } from './supabase.ts';

export type BillingTier = 'free' | 'sovereign' | 'oracle';

export interface TierModelOption {
  modelId: string;
  isDefault: boolean;
}

export interface TierModelCatalogItem {
  id: string;
  provider: string;
  default: boolean;
}

export const PACK_FREE = 50;
export const PACK_SOVEREIGN = 300;
export const PACK_ORACLE = 1000;

export const TIER_PACK_CREDITS: Record<BillingTier, number> = {
  free: PACK_FREE,
  sovereign: PACK_SOVEREIGN,
  oracle: PACK_ORACLE,
};

const FALLBACK_MODELS: Record<BillingTier, TierModelOption[]> = {
  free: [{ modelId: 'google/gemini-2.5-flash-lite', isDefault: true }],
  sovereign: [
    { modelId: 'google/gemini-2.5-flash', isDefault: true },
    { modelId: 'google/gemini-2.5-flash-lite', isDefault: false },
    { modelId: 'openai/gpt-4o-mini', isDefault: false },
    { modelId: 'openai/gpt-4.1-mini', isDefault: false },
    { modelId: 'openai/gpt-5-mini', isDefault: false },
    { modelId: 'meta-llama/llama-4-scout', isDefault: false },
    { modelId: 'meta-llama/llama-4-maverick', isDefault: false },
    { modelId: 'x-ai/grok-4-fast', isDefault: false },
  ],
  oracle: [
    { modelId: 'google/gemini-2.5-flash', isDefault: true },
    { modelId: 'google/gemini-2.5-flash-lite', isDefault: false },
    { modelId: 'google/gemini-2.5-pro', isDefault: false },
    { modelId: 'google/gemini-3-flash-preview', isDefault: false },
    { modelId: 'google/gemini-3-pro-preview', isDefault: false },
    { modelId: 'openai/gpt-4o-mini', isDefault: false },
    { modelId: 'openai/gpt-4.1-mini', isDefault: false },
    { modelId: 'openai/gpt-4.1', isDefault: false },
    { modelId: 'openai/gpt-5-mini', isDefault: false },
    { modelId: 'openai/gpt-5', isDefault: false },
    { modelId: 'openai/gpt-5.2', isDefault: false },
    { modelId: 'openai/gpt-5.2-pro', isDefault: false },
    { modelId: 'anthropic/claude-3.5-haiku', isDefault: false },
    { modelId: 'anthropic/claude-sonnet-4.5', isDefault: false },
    { modelId: 'anthropic/claude-opus-4.6', isDefault: false },
    { modelId: 'meta-llama/llama-4-scout', isDefault: false },
    { modelId: 'meta-llama/llama-4-maverick', isDefault: false },
    { modelId: 'x-ai/grok-4-fast', isDefault: false },
    { modelId: 'x-ai/grok-4', isDefault: false },
  ],
};

function isBillingTier(value: string): value is BillingTier {
  return value === 'free' || value === 'sovereign' || value === 'oracle';
}

export function getTierRank(tier: BillingTier): number {
  if (tier === 'oracle') return 3;
  if (tier === 'sovereign') return 2;
  return 1;
}

function inferProvider(modelId: string): string {
  const [provider] = modelId.split('/');
  return provider ?? 'unknown';
}

export function getTierPackCredits(tier: BillingTier): number {
  return TIER_PACK_CREDITS[tier];
}

export async function getTierModelAllowlist(
  serviceClient: ReturnType<typeof createServiceClient>,
  tier: BillingTier
): Promise<TierModelOption[]> {
  const { data, error } = await serviceClient
    .from('tier_model_allowlist')
    .select('model_id, is_default')
    .eq('tier', tier)
    .eq('enabled', true)
    .order('is_default', { ascending: false })
    .order('model_id', { ascending: true });

  if (error) {
    console.warn('[ModelCatalog] Falling back to static allowlist:', error.message);
    return FALLBACK_MODELS[tier];
  }

  const normalized =
    data
      ?.map((row) => ({
        modelId: row.model_id,
        isDefault: row.is_default ?? false,
      }))
      .filter((row) => typeof row.modelId === 'string' && row.modelId.length > 0) ?? [];

  if (normalized.length === 0) {
    return FALLBACK_MODELS[tier];
  }

  return normalized;
}

export async function getTierModelCatalog(
  serviceClient: ReturnType<typeof createServiceClient>,
  tier: BillingTier
): Promise<TierModelCatalogItem[]> {
  const allowlist = await getTierModelAllowlist(serviceClient, tier);
  return allowlist.map((item) => ({
    id: item.modelId,
    provider: inferProvider(item.modelId),
    default: item.isDefault,
  }));
}

export async function resolveChatModelForTier(
  serviceClient: ReturnType<typeof createServiceClient>,
  tier: BillingTier,
  requestedModelId?: string
): Promise<string> {
  const allowlist = await getTierModelAllowlist(serviceClient, tier);
  const defaults = allowlist.filter((item) => item.isDefault);
  const defaultModel = (defaults[0] ?? allowlist[0] ?? FALLBACK_MODELS[tier][0]).modelId;

  if (!requestedModelId) {
    return defaultModel;
  }

  const isAllowed = allowlist.some((item) => item.modelId === requestedModelId);
  if (!isAllowed) {
    throw new Error('MODEL_NOT_ALLOWED');
  }

  return requestedModelId;
}

export function normalizeTier(rawTier: string | null | undefined): BillingTier {
  if (rawTier && isBillingTier(rawTier)) {
    return rawTier;
  }
  return 'free';
}
