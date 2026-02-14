import { createServiceClient } from './supabase.ts';
import { BillingTier, getTierPackCredits, getTierRank } from './modelCatalog.ts';

export const USD_PER_CREDIT = 0.033;
export const MCREDITS_PER_CREDIT = 1000;

const CREDIT_PERIOD_DAYS = 30;

export interface UsageUnits {
  inputTokens?: number;
  outputTokens?: number;
  audioInputTokens?: number;
  audioOutputTokens?: number;
  characterInput?: number;
  reasoningTokens?: number;
  durationSeconds?: number;
}

interface CreditAccountRow {
  tier: BillingTier;
  balance_mcredits: number;
  period_start: string | null;
  period_end: string | null;
}

interface RateCardRow {
  modality: string;
  unit_price_usd_per_million: number;
}

interface LedgerEventRow {
  delta_mcredits: number;
  balance_after_mcredits: number;
  usd_cost: number;
}

type RateModality =
  | 'text_input'
  | 'text_output'
  | 'audio_input'
  | 'audio_output'
  | 'character_input'
  | 'reasoning';

type BillingEventType = 'grant' | 'debit' | 'refund' | 'hold' | 'release';

export interface DebitResult {
  usdCost: number;
  debitedMcredits: number;
  remainingMcredits: number;
}

export interface CreditStatus {
  tier: BillingTier;
  balanceMcredits: number;
  periodStart: string;
  periodEnd: string;
  packCredits: number;
}

export type BillingErrorKind = 'insufficient_credits' | 'not_found' | 'invalid' | 'unknown';

export class BillingError extends Error {
  readonly kind: BillingErrorKind;
  readonly status: number;
  readonly code: string;

  constructor(kind: BillingErrorKind, message: string) {
    super(message);
    this.name = 'BillingError';
    this.kind = kind;
    this.status = kind === 'insufficient_credits' ? 402 : 500;
    this.code = kind === 'insufficient_credits' ? 'INSUFFICIENT_CREDITS' : 'BILLING_ERROR';
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

function addDaysIso(isoDate: string, days: number): string {
  const base = new Date(isoDate);
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function toNumeric(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
}

function isRateModality(value: string): value is RateModality {
  return (
    value === 'text_input' ||
    value === 'text_output' ||
    value === 'audio_input' ||
    value === 'audio_output' ||
    value === 'character_input' ||
    value === 'reasoning'
  );
}

function getTierPackMcredits(tier: BillingTier): number {
  return getTierPackCredits(tier) * MCREDITS_PER_CREDIT;
}

function mcreditsToCredits(mcredits: number): number {
  return Math.max(0, mcredits) / MCREDITS_PER_CREDIT;
}

export function mcreditsFromUsd(usdCost: number): number {
  if (!Number.isFinite(usdCost) || usdCost <= 0) {
    return 0;
  }
  const mcredits = Math.ceil((usdCost / USD_PER_CREDIT) * MCREDITS_PER_CREDIT);
  return Math.max(1, mcredits);
}

function normalizeUsage(units: UsageUnits): UsageUnits {
  return {
    inputTokens: Math.max(0, Math.round(toNumeric(units.inputTokens))),
    outputTokens: Math.max(0, Math.round(toNumeric(units.outputTokens))),
    audioInputTokens: Math.max(0, Math.round(toNumeric(units.audioInputTokens))),
    audioOutputTokens: Math.max(0, Math.round(toNumeric(units.audioOutputTokens))),
    characterInput: Math.max(0, Math.round(toNumeric(units.characterInput))),
    reasoningTokens: Math.max(0, Math.round(toNumeric(units.reasoningTokens))),
    durationSeconds: Math.max(0, Math.round(toNumeric(units.durationSeconds))),
  };
}

function hasUsage(usage: UsageUnits): boolean {
  return (
    (usage.inputTokens ?? 0) > 0 ||
    (usage.outputTokens ?? 0) > 0 ||
    (usage.audioInputTokens ?? 0) > 0 ||
    (usage.audioOutputTokens ?? 0) > 0 ||
    (usage.characterInput ?? 0) > 0 ||
    (usage.reasoningTokens ?? 0) > 0
  );
}

function estimateTokensFromText(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function estimateChatUsageFromText(promptText: string, completionText: string): UsageUnits {
  return normalizeUsage({
    inputTokens: estimateTokensFromText(promptText),
    outputTokens: estimateTokensFromText(completionText),
  });
}

export function estimateLiveUsageFromDuration(durationSeconds: number): UsageUnits {
  const boundedSeconds = Math.max(1, Math.round(durationSeconds));
  const audioTokensPerSecond = 40;
  return normalizeUsage({
    durationSeconds: boundedSeconds,
    audioInputTokens: boundedSeconds * audioTokensPerSecond,
    audioOutputTokens: boundedSeconds * audioTokensPerSecond,
    inputTokens: Math.ceil(boundedSeconds / 4),
    outputTokens: Math.ceil(boundedSeconds / 4),
  });
}

async function getRateCardMap(
  serviceClient: ReturnType<typeof createServiceClient>,
  modelId: string
): Promise<Partial<Record<RateModality, number>>> {
  const { data, error } = await serviceClient
    .from('model_rate_cards')
    .select('modality, unit_price_usd_per_million, effective_date')
    .eq('model_id', modelId)
    .eq('is_active', true)
    .order('effective_date', { ascending: false });

  if (error) {
    throw new BillingError('unknown', `Failed to load rate card: ${error.message}`);
  }

  const rows = (data ?? []) as RateCardRow[];
  const rates: Partial<Record<RateModality, number>> = {};

  for (const row of rows) {
    if (!isRateModality(row.modality)) {
      continue;
    }
    if (rates[row.modality] === undefined) {
      rates[row.modality] = toNumeric(row.unit_price_usd_per_million);
    }
  }

  return rates;
}

export async function calculateUsdCost(
  serviceClient: ReturnType<typeof createServiceClient>,
  modelId: string,
  usage: UsageUnits
): Promise<number> {
  const normalized = normalizeUsage(usage);
  const rates = await getRateCardMap(serviceClient, modelId);
  const allModalities: Array<{ modality: RateModality; units: number }> = [
    { modality: 'text_input', units: normalized.inputTokens ?? 0 },
    { modality: 'text_output', units: normalized.outputTokens ?? 0 },
    { modality: 'audio_input', units: normalized.audioInputTokens ?? 0 },
    { modality: 'audio_output', units: normalized.audioOutputTokens ?? 0 },
    { modality: 'character_input', units: normalized.characterInput ?? 0 },
    { modality: 'reasoning', units: normalized.reasoningTokens ?? 0 },
  ];

  const nonZeroModalities = allModalities.filter((item) => item.units > 0);

  const missingModalities = nonZeroModalities
    .filter((item) => rates[item.modality] === undefined)
    .map((item) => item.modality);

  if (missingModalities.length > 0) {
    throw new BillingError(
      'invalid',
      `Missing active rate card for model ${modelId}: ${missingModalities.join(', ')}`
    );
  }

  const usd =
    ((normalized.inputTokens ?? 0) / 1_000_000) * (rates.text_input ?? 0) +
    ((normalized.outputTokens ?? 0) / 1_000_000) * (rates.text_output ?? 0) +
    ((normalized.audioInputTokens ?? 0) / 1_000_000) * (rates.audio_input ?? 0) +
    ((normalized.audioOutputTokens ?? 0) / 1_000_000) * (rates.audio_output ?? 0) +
    ((normalized.characterInput ?? 0) / 1_000_000) * (rates.character_input ?? 0) +
    ((normalized.reasoningTokens ?? 0) / 1_000_000) * (rates.reasoning ?? 0);

  return Math.max(0, Number(usd.toFixed(8)));
}

async function getExistingLedgerEvent(
  serviceClient: ReturnType<typeof createServiceClient>,
  userId: string,
  eventType: BillingEventType,
  requestId?: string
): Promise<LedgerEventRow | null> {
  if (!requestId) {
    return null;
  }

  const { data, error } = await serviceClient
    .from('credit_ledger')
    .select('delta_mcredits, balance_after_mcredits, usd_cost')
    .eq('user_id', userId)
    .eq('event_type', eventType)
    .eq('request_id', requestId)
    .maybeSingle();

  if (error) {
    console.warn('[Billing] Failed to read ledger event for idempotency:', error.message);
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    delta_mcredits: toNumeric((data as Record<string, unknown>).delta_mcredits),
    balance_after_mcredits: toNumeric((data as Record<string, unknown>).balance_after_mcredits),
    usd_cost: toNumeric((data as Record<string, unknown>).usd_cost),
  };
}

async function applyDelta(
  serviceClient: ReturnType<typeof createServiceClient>,
  userId: string,
  deltaMcredits: number
): Promise<number> {
  const { data, error } = await serviceClient.rpc('credit_apply_delta', {
    p_user_id: userId,
    p_delta: deltaMcredits,
  });

  if (error) {
    const message = error.message.toUpperCase();
    if (message.includes('INSUFFICIENT_CREDITS')) {
      throw new BillingError('insufficient_credits', 'Not enough credits to complete this request.');
    }
    if (message.includes('CREDIT_ACCOUNT_NOT_FOUND')) {
      throw new BillingError('not_found', 'Credit account not found.');
    }
    throw new BillingError('unknown', error.message);
  }

  return toNumeric(data);
}

async function insertLedgerEvent(
  serviceClient: ReturnType<typeof createServiceClient>,
  args: {
    userId: string;
    eventType: BillingEventType;
    endpoint: string;
    modelId?: string;
    usageUnits?: UsageUnits;
    usdCost?: number;
    deltaMcredits: number;
    balanceAfterMcredits: number;
    requestId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const { error } = await serviceClient.from('credit_ledger').insert({
    user_id: args.userId,
    event_type: args.eventType,
    endpoint: args.endpoint,
    model_id: args.modelId ?? null,
    usage_units: args.usageUnits ?? {},
    usd_cost: args.usdCost ?? 0,
    delta_mcredits: args.deltaMcredits,
    balance_after_mcredits: args.balanceAfterMcredits,
    request_id: args.requestId ?? null,
    metadata: args.metadata ?? {},
  });

  if (error) {
    console.warn('[Billing] Failed to insert ledger event:', error.message);
  }
}

function creditAccountFromUnknown(raw: unknown): CreditAccountRow | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const tierRaw = record.tier;
  if (typeof tierRaw !== 'string') {
    return null;
  }

  const tier = tierRaw === 'free' || tierRaw === 'sovereign' || tierRaw === 'oracle' ? tierRaw : 'free';
  return {
    tier,
    balance_mcredits: toNumeric(record.balance_mcredits),
    period_start: typeof record.period_start === 'string' ? record.period_start : null,
    period_end: typeof record.period_end === 'string' ? record.period_end : null,
  };
}

async function writeGrantEvent(
  serviceClient: ReturnType<typeof createServiceClient>,
  userId: string,
  tier: BillingTier,
  endpoint: string,
  deltaMcredits: number,
  balanceAfterMcredits: number
): Promise<void> {
  if (deltaMcredits <= 0) {
    return;
  }

  await insertLedgerEvent(serviceClient, {
    userId,
    eventType: 'grant',
    endpoint,
    modelId: undefined,
    usageUnits: {},
    usdCost: 0,
    deltaMcredits,
    balanceAfterMcredits,
    requestId: `${endpoint}:${userId}:${Date.now()}`,
    metadata: {
      tier,
      grant_credits: mcreditsToCredits(deltaMcredits),
    },
  });
}

export async function ensureActiveCreditAccount(
  serviceClient: ReturnType<typeof createServiceClient>,
  userId: string,
  resolvedTier: BillingTier,
  options?: {
    tierSource?: 'cache' | 'revenuecat' | 'fallback' | 'trial_coupon';
    trialTier?: Exclude<BillingTier, 'free'> | null;
    trialEndsAt?: string | null;
  }
): Promise<CreditStatus> {
  const now = nowIso();
  const targetPackMcredits = getTierPackMcredits(resolvedTier);
  let periodStart = now;
  let periodEnd = addDaysIso(now, CREDIT_PERIOD_DAYS);
  const isTrialBackedTier =
    options?.tierSource === 'trial_coupon' &&
    options.trialTier === resolvedTier &&
    typeof options.trialEndsAt === 'string' &&
    new Date(options.trialEndsAt).getTime() > Date.now();

  if (isTrialBackedTier) {
    periodEnd = options.trialEndsAt as string;
  }

  const { data, error } = await serviceClient
    .from('credit_accounts')
    .select('tier, balance_mcredits, period_start, period_end')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new BillingError('unknown', `Failed to load credit account: ${error.message}`);
  }

  const current = creditAccountFromUnknown(data);
  if (!current) {
    const { error: insertError } = await serviceClient.from('credit_accounts').insert({
      user_id: userId,
      tier: resolvedTier,
      balance_mcredits: targetPackMcredits,
      period_start: periodStart,
      period_end: periodEnd,
    });

    if (insertError) {
      throw new BillingError('unknown', `Failed to create credit account: ${insertError.message}`);
    }

    await writeGrantEvent(serviceClient, userId, resolvedTier, 'monthly_refill_initial', targetPackMcredits, targetPackMcredits);

    return {
      tier: resolvedTier,
      balanceMcredits: targetPackMcredits,
      periodStart,
      periodEnd,
      packCredits: getTierPackCredits(resolvedTier),
    };
  }

  const accountTier = current.tier;
  const isPeriodExpired = !current.period_end || new Date(current.period_end).getTime() <= Date.now();
  const isUpgrade = getTierRank(resolvedTier) > getTierRank(accountTier);
  const isDowngrade = getTierRank(resolvedTier) < getTierRank(accountTier);

  if (isPeriodExpired || isUpgrade) {
    const nextBalance = targetPackMcredits;
    const delta = nextBalance - current.balance_mcredits;

    const { error: updateError } = await serviceClient
      .from('credit_accounts')
      .update({
        tier: resolvedTier,
        balance_mcredits: nextBalance,
        period_start: periodStart,
        period_end: periodEnd,
      })
      .eq('user_id', userId);

    if (updateError) {
      throw new BillingError('unknown', `Failed to reset credit account: ${updateError.message}`);
    }

    await writeGrantEvent(
      serviceClient,
      userId,
      resolvedTier,
      isUpgrade ? 'tier_upgrade_refill' : 'monthly_refill',
      delta,
      nextBalance
    );

    return {
      tier: resolvedTier,
      balanceMcredits: nextBalance,
      periodStart,
      periodEnd,
      packCredits: getTierPackCredits(resolvedTier),
    };
  }

  if (isDowngrade && accountTier !== resolvedTier) {
    const { error: updateError } = await serviceClient
      .from('credit_accounts')
      .update({ tier: resolvedTier })
      .eq('user_id', userId);

    if (updateError) {
      throw new BillingError('unknown', `Failed to apply tier downgrade: ${updateError.message}`);
    }
  }

  return {
    tier: resolvedTier,
    balanceMcredits: current.balance_mcredits,
    periodStart: current.period_start ?? periodStart,
    periodEnd: current.period_end ?? periodEnd,
    packCredits: getTierPackCredits(resolvedTier),
  };
}

export function assertSufficientBalance(status: CreditStatus, requiredMcredits: number): void {
  if (status.balanceMcredits < requiredMcredits) {
    throw new BillingError('insufficient_credits', 'You do not have enough credits to run this request.');
  }
}

export async function debitForUsage(
  serviceClient: ReturnType<typeof createServiceClient>,
  params: {
    userId: string;
    endpoint: string;
    modelId: string;
    usage: UsageUnits;
    requestId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<DebitResult> {
  const existing = await getExistingLedgerEvent(
    serviceClient,
    params.userId,
    'debit',
    params.requestId
  );
  if (existing) {
    return {
      usdCost: existing.usd_cost,
      debitedMcredits: Math.max(0, -existing.delta_mcredits),
      remainingMcredits: existing.balance_after_mcredits,
    };
  }

  const usage = normalizeUsage(params.usage);
  const usdCost = await calculateUsdCost(serviceClient, params.modelId, usage);
  const debitedMcredits = mcreditsFromUsd(usdCost);

  if (hasUsage(usage) && debitedMcredits <= 0) {
    throw new BillingError('invalid', `Unable to debit usage for model ${params.modelId}.`);
  }

  if (debitedMcredits <= 0) {
    return {
      usdCost,
      debitedMcredits: 0,
      remainingMcredits: Number.NaN,
    };
  }

  const remainingMcredits = await applyDelta(serviceClient, params.userId, -debitedMcredits);

  await insertLedgerEvent(serviceClient, {
    userId: params.userId,
    eventType: 'debit',
    endpoint: params.endpoint,
    modelId: params.modelId,
    usageUnits: usage,
    usdCost,
    deltaMcredits: -debitedMcredits,
    balanceAfterMcredits: remainingMcredits,
    requestId: params.requestId,
    metadata: params.metadata,
  });

  return {
    usdCost,
    debitedMcredits,
    remainingMcredits,
  };
}

export async function holdCredits(
  serviceClient: ReturnType<typeof createServiceClient>,
  params: {
    userId: string;
    endpoint: string;
    holdMcredits: number;
    modelId?: string;
    requestId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<number> {
  const existing = await getExistingLedgerEvent(
    serviceClient,
    params.userId,
    'hold',
    params.requestId
  );
  if (existing) {
    return existing.balance_after_mcredits;
  }

  const holdAmount = Math.max(0, Math.round(params.holdMcredits));
  if (holdAmount <= 0) {
    return Number.NaN;
  }

  const remaining = await applyDelta(serviceClient, params.userId, -holdAmount);
  await insertLedgerEvent(serviceClient, {
    userId: params.userId,
    eventType: 'hold',
    endpoint: params.endpoint,
    modelId: params.modelId,
    usageUnits: {},
    usdCost: 0,
    deltaMcredits: -holdAmount,
    balanceAfterMcredits: remaining,
    requestId: params.requestId,
    metadata: params.metadata,
  });
  return remaining;
}

export async function releaseCredits(
  serviceClient: ReturnType<typeof createServiceClient>,
  params: {
    userId: string;
    endpoint: string;
    releaseMcredits: number;
    modelId?: string;
    requestId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<number> {
  const existing = await getExistingLedgerEvent(
    serviceClient,
    params.userId,
    'release',
    params.requestId
  );
  if (existing) {
    return existing.balance_after_mcredits;
  }

  const releaseAmount = Math.max(0, Math.round(params.releaseMcredits));
  if (releaseAmount <= 0) {
    return Number.NaN;
  }

  const remaining = await applyDelta(serviceClient, params.userId, releaseAmount);
  await insertLedgerEvent(serviceClient, {
    userId: params.userId,
    eventType: 'release',
    endpoint: params.endpoint,
    modelId: params.modelId,
    usageUnits: {},
    usdCost: 0,
    deltaMcredits: releaseAmount,
    balanceAfterMcredits: remaining,
    requestId: params.requestId,
    metadata: params.metadata,
  });
  return remaining;
}

export async function debitFixedCredits(
  serviceClient: ReturnType<typeof createServiceClient>,
  params: {
    userId: string;
    endpoint: string;
    debitMcredits: number;
    modelId?: string;
    requestId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<number> {
  const existing = await getExistingLedgerEvent(
    serviceClient,
    params.userId,
    'debit',
    params.requestId
  );
  if (existing) {
    return existing.balance_after_mcredits;
  }

  const debitAmount = Math.max(0, Math.round(params.debitMcredits));
  if (debitAmount <= 0) {
    return Number.NaN;
  }

  const remaining = await applyDelta(serviceClient, params.userId, -debitAmount);
  await insertLedgerEvent(serviceClient, {
    userId: params.userId,
    eventType: 'debit',
    endpoint: params.endpoint,
    modelId: params.modelId,
    usageUnits: {},
    usdCost: Number(((debitAmount / MCREDITS_PER_CREDIT) * USD_PER_CREDIT).toFixed(6)),
    deltaMcredits: -debitAmount,
    balanceAfterMcredits: remaining,
    requestId: params.requestId,
    metadata: params.metadata,
  });
  return remaining;
}

export function buildInsufficientCreditsBody(message = 'Insufficient credits for this request.'): string {
  return JSON.stringify({
    code: 'INSUFFICIENT_CREDITS',
    message,
  });
}

export function creditStatusResponsePayload(status: CreditStatus): Record<string, unknown> {
  return {
    tier: status.tier,
    balance_mcredits: status.balanceMcredits,
    balance_credits: Number(mcreditsToCredits(status.balanceMcredits).toFixed(3)),
    period_start: status.periodStart,
    period_end: status.periodEnd,
    pack_credits: status.packCredits,
    usd_per_credit: USD_PER_CREDIT,
  };
}
