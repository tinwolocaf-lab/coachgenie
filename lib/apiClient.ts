import { supabase } from '@/lib/supabase';

export interface StreamCallbacks {
  onToken?: (chunk: string) => void;
  onDone?: (payload: {
    messageId?: string | null;
    artifacts?: unknown[];
    creditsDebited?: number;
    creditsRemaining?: number | null;
  }) => void;
  onError?: (message: string) => void;
}

export interface StreamChatOptions {
  modelId?: string;
}

export type ApiFunctionErrorKind =
  | 'function_unavailable'
  | 'insufficient_credits'
  | 'unauthorized'
  | 'forbidden'
  | 'bad_request'
  | 'rate_limited'
  | 'server'
  | 'unknown';

export class ApiFunctionError extends Error {
  readonly kind: ApiFunctionErrorKind;
  readonly status?: number;
  readonly code?: string;
  readonly endpoint?: string;

  constructor({
    kind,
    message,
    status,
    code,
    endpoint,
  }: {
    kind: ApiFunctionErrorKind;
    message: string;
    status?: number;
    code?: string;
    endpoint?: string;
  }) {
    super(message);
    this.name = 'ApiFunctionError';
    this.kind = kind;
    this.status = status;
    this.code = code;
    this.endpoint = endpoint;
  }
}

interface JsonRecord {
  [key: string]: unknown;
}

interface ParsedFunctionErrorPayload {
  code?: string;
  message?: string;
  error?: string;
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null;
}

function getStringValue(record: JsonRecord, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function parseFunctionErrorPayload(raw: string): ParsedFunctionErrorPayload | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isJsonRecord(parsed)) return null;

    return {
      code: getStringValue(parsed, 'code'),
      message: getStringValue(parsed, 'message'),
      error: getStringValue(parsed, 'error'),
    };
  } catch {
    return null;
  }
}

function resolveFunctionErrorKind(
  status: number,
  payloadCode: string | undefined,
  payloadMessage: string
): ApiFunctionErrorKind {
  const normalizedCode = payloadCode?.toUpperCase();
  const normalizedMessage = payloadMessage.toLowerCase();

  if (status === 402 || normalizedCode === 'INSUFFICIENT_CREDITS') {
    return 'insufficient_credits';
  }
  if (
    status === 404 ||
    normalizedCode === 'NOT_FOUND' ||
    normalizedMessage.includes('requested function was not found')
  ) {
    return 'function_unavailable';
  }
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 400) return 'bad_request';
  if (status === 429) return 'rate_limited';
  if (status >= 500) return 'server';
  return 'unknown';
}

async function throwFunctionError(
  response: Response,
  fallbackMessage: string,
  endpoint: string
): Promise<never> {
  const text = await response.text();
  const payload = parseFunctionErrorPayload(text);
  const message = payload?.message || payload?.error || text || fallbackMessage;

  throw new ApiFunctionError({
    kind: resolveFunctionErrorKind(response.status, payload?.code, message),
    status: response.status,
    code: payload?.code,
    endpoint,
    message,
  });
}

export function isFunctionUnavailableError(error: unknown): error is ApiFunctionError {
  return error instanceof ApiFunctionError && error.kind === 'function_unavailable';
}

export function isInsufficientCreditsError(error: unknown): error is ApiFunctionError {
  return error instanceof ApiFunctionError && error.kind === 'insufficient_credits';
}

export function isUnauthorizedError(error: unknown): error is ApiFunctionError {
  return error instanceof ApiFunctionError && error.kind === 'unauthorized';
}

export function isVoiceTierRequiredError(error: unknown): error is ApiFunctionError {
  return (
    error instanceof ApiFunctionError &&
    typeof error.code === 'string' &&
    error.code.toUpperCase() === 'VOICE_TIER_REQUIRED'
  );
}

export interface CreditStatusResponse {
  tier: 'free' | 'sovereign' | 'oracle';
  balance_mcredits: number;
  balance_credits: number;
  period_start: string;
  period_end: string;
  pack_credits: number;
  usd_per_credit: number;
  preferred_chat_model: string | null;
  tier_source?: 'cache' | 'revenuecat' | 'fallback';
}

export interface AvailableModel {
  id: string;
  provider: string;
  default: boolean;
}

export interface ModelCatalogResponse {
  tier: 'free' | 'sovereign' | 'oracle';
  preferred_model_id: string | null;
  models: AvailableModel[];
}

function getFunctionsBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_SUPABASE_FUNCTIONS_URL;
  if (explicit) {
    const normalized = explicit.replace(/\/$/, '');
    if (normalized.includes('/functions/v1')) {
      return normalized;
    }
    return `${normalized}/functions/v1`;
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL');
  }

  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1`;
}

async function getAuthHeader(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error('Missing Supabase access token');
  }

  return `Bearer ${token}`;
}

function parseSseEvent(block: string): { event: string; data: string } | null {
  const lines = block.split('\n');
  let event = 'message';
  let data = '';

  for (const line of lines) {
    if (line.startsWith('event:')) {
      event = line.replace('event:', '').trim();
    } else if (line.startsWith('data:')) {
      data += line.replace('data:', '').trim();
    }
  }

  if (!data) return null;
  return { event, data };
}

function handleSsePayload(payload: string, callbacks: StreamCallbacks) {
  const blocks = payload.split('\n\n').filter(Boolean);
  for (const block of blocks) {
    const parsed = parseSseEvent(block);
    if (!parsed) continue;

    if (parsed.event === 'token') {
      try {
        const json = JSON.parse(parsed.data);
        callbacks.onToken?.(json.t || '');
      } catch {
        callbacks.onToken?.('');
      }
    } else if (parsed.event === 'done') {
      try {
        const json = JSON.parse(parsed.data);
        callbacks.onDone?.({
          messageId: json.message_id,
          artifacts: json.artifacts,
          creditsDebited:
            typeof json.credits_debited === 'number' ? json.credits_debited : undefined,
          creditsRemaining:
            typeof json.credits_remaining === 'number' ? json.credits_remaining : null,
        });
      } catch {
        callbacks.onDone?.({});
      }
    } else if (parsed.event === 'error') {
      try {
        const json = JSON.parse(parsed.data);
        callbacks.onError?.(json.message || 'Stream error');
      } catch {
        callbacks.onError?.('Stream error');
      }
    }
  }
}

export async function streamChat(
  sessionId: string,
  userMessage: string,
  callbacks: StreamCallbacks = {},
  options: StreamChatOptions = {}
): Promise<{ text: string; messageId: string | null }> {
  const baseUrl = getFunctionsBaseUrl();
  const authHeader = await getAuthHeader();

  const response = await fetch(`${baseUrl}/chat-stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify({
      session_id: sessionId,
      user_message: userMessage,
      client_context: { screen: 'chat' },
      model_id: options.modelId,
    }),
  });

  if (!response.ok) {
    await throwFunctionError(response, 'Failed to stream chat', 'chat-stream');
  }

  let fullText = '';
  let messageId: string | null = null;

  const applyCallbacks: StreamCallbacks = {
    onToken: (chunk) => {
      fullText += chunk;
      callbacks.onToken?.(chunk);
    },
    onDone: (payload) => {
      messageId = payload.messageId ?? null;
      callbacks.onDone?.(payload);
    },
    onError: (message) => {
      callbacks.onError?.(message);
    },
  };

  const reader = response.body?.getReader?.();
  if (!reader) {
    const text = await response.text();
    handleSsePayload(text, applyCallbacks);
    return { text: fullText, messageId };
  }

  const decoder: { decode: (value: Uint8Array, options?: { stream?: boolean }) => string } =
    typeof TextDecoder !== 'undefined'
      ? new TextDecoder()
      : {
          decode: (value: Uint8Array) => String.fromCharCode(...value),
        };
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';

    for (const part of parts) {
      handleSsePayload(part + '\n\n', applyCallbacks);
    }
  }

  if (buffer) {
    handleSsePayload(buffer, applyCallbacks);
  }

  return { text: fullText, messageId };
}

export async function generateArtifacts(sessionId: string): Promise<{
  summary: string;
  next_actions: { id: string; title: string; completed: boolean }[];
  plan_updates: {
    date: string;
    priorities: { id: string; title: string; completed: boolean; order: number }[];
    time_blocks: { id: string; start_time: string; end_time: string; title: string; category?: string }[];
  }[];
}> {
  const baseUrl = getFunctionsBaseUrl();
  const authHeader = await getAuthHeader();

  const response = await fetch(`${baseUrl}/artifacts-generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify({ session_id: sessionId }),
  });

  if (!response.ok) {
    await throwFunctionError(response, 'Failed to generate artifacts', 'artifacts-generate');
  }

  const payload = await response.json();
  const summary = payload?.summary?.text || 'Session summary not available.';
  const nextActions = payload?.next_actions?.items || [];
  const days = payload?.seven_day_plan?.days || [];

  const planUpdates = days.map((day: {
    day: string;
    top_3?: string[];
    time_blocks?: {
      id?: string;
      start_time?: string;
      end_time?: string;
      title?: string;
      category?: string;
    }[];
  }, index: number) => ({
    date: day.day,
    priorities: (day.top_3 || []).map((title: string, idx: number) => ({
      id: `${index + 1}-${idx + 1}`,
      title,
      completed: false,
      order: idx + 1,
    })),
    time_blocks: (day.time_blocks || []).map((block, idx: number) => ({
      id: block.id || `${index + 1}-${idx + 1}`,
      start_time: block.start_time || '09:00',
      end_time: block.end_time || '10:00',
      title: block.title || 'Focus block',
      category: block.category,
    })),
  }));

  return { summary, next_actions: nextActions, plan_updates: planUpdates };
}

export async function generatePlan(sessionId: string, horizonDays = 7): Promise<{
  artifact_id: string;
  days: {
    day: string;
    top_3: string[];
    time_blocks: {
      id?: string;
      start_time?: string;
      end_time?: string;
      title?: string;
      category?: string;
    }[];
    notes?: string;
  }[];
}> {
  const baseUrl = getFunctionsBaseUrl();
  const authHeader = await getAuthHeader();

  const response = await fetch(`${baseUrl}/plans-generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify({ session_id: sessionId, horizon_days: horizonDays }),
  });

  if (!response.ok) {
    await throwFunctionError(response, 'Failed to generate plan', 'plans-generate');
  }

  return response.json();
}

export async function generateBreakthrough(sessionId: string): Promise<{
  title: string;
  summary: string;
  keyTakeaways: string[];
  actionItems: { id: string; title: string; completed: boolean }[];
}> {
  const baseUrl = getFunctionsBaseUrl();
  const authHeader = await getAuthHeader();

  const response = await fetch(`${baseUrl}/sanctuary-breakthrough`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify({ session_id: sessionId }),
  });

  if (!response.ok) {
    await throwFunctionError(response, 'Failed to generate breakthrough', 'sanctuary-breakthrough');
  }

  return response.json();
}

export async function generateClosingThought(params: {
  wins: string[];
  lessons: string[];
  morningIntention?: string | null;
  ritualProgress: number;
  values?: string[];
  goals?: string[];
}): Promise<string> {
  const baseUrl = getFunctionsBaseUrl();
  const authHeader = await getAuthHeader();

  const response = await fetch(`${baseUrl}/rituals-closing-thought`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify({
      wins: params.wins,
      lessons: params.lessons,
      morning_intention: params.morningIntention,
      ritual_progress: params.ritualProgress,
      values: params.values,
      goals: params.goals,
    }),
  });

  if (!response.ok) {
    await throwFunctionError(response, 'Failed to generate closing thought', 'rituals-closing-thought');
  }

  const payload = await response.json();
  return payload.thought || 'Rest well—every effort today was a step forward.';
}

export async function suggestRitualFromInsight(params: {
  insightTitle: string;
  insightContent: string;
  existingRituals: string[];
}): Promise<{ title: string; description: string }> {
  const baseUrl = getFunctionsBaseUrl();
  const authHeader = await getAuthHeader();

  const response = await fetch(`${baseUrl}/rituals-suggest-ritual`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify({
      insight_title: params.insightTitle,
      insight_content: params.insightContent,
      existing_rituals: params.existingRituals,
    }),
  });

  if (!response.ok) {
    await throwFunctionError(response, 'Failed to suggest ritual', 'rituals-suggest-ritual');
  }

  const payload = await response.json();
  return {
    title: payload.title || 'Daily Ritual',
    description: payload.description || 'A daily ritual inspired by this insight.',
  };
}

export async function generateInsightTitle(content: string): Promise<string> {
  const baseUrl = getFunctionsBaseUrl();
  const authHeader = await getAuthHeader();

  const response = await fetch(`${baseUrl}/sanctuary-insight-title`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    await throwFunctionError(response, 'Failed to generate insight title', 'sanctuary-insight-title');
  }

  const payload = await response.json();
  return payload.title || 'Key Insight';
}

export async function expandOnPoint(point: string): Promise<string> {
  const baseUrl = getFunctionsBaseUrl();
  const authHeader = await getAuthHeader();

  const response = await fetch(`${baseUrl}/sanctuary-expand`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify({ point }),
  });

  if (!response.ok) {
    await throwFunctionError(response, 'Failed to expand on point', 'sanctuary-expand');
  }

  const payload = await response.json();
  return payload.expanded || 'Let\'s explore that further.';
}

export async function askHistory(query: string): Promise<{ answer: string; sources: unknown[] }> {
  const baseUrl = getFunctionsBaseUrl();
  const authHeader = await getAuthHeader();

  const response = await fetch(`${baseUrl}/archive-ask-history`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    await throwFunctionError(response, 'Failed to ask history', 'archive-ask-history');
  }

  return response.json();
}

export async function generateMonthlySynthesis(monthYear: string): Promise<unknown> {
  const baseUrl = getFunctionsBaseUrl();
  const authHeader = await getAuthHeader();

  const response = await fetch(`${baseUrl}/archive-monthly-synthesis`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify({ month_year: monthYear }),
  });

  if (!response.ok) {
    await throwFunctionError(response, 'Failed to generate monthly synthesis', 'archive-monthly-synthesis');
  }

  return response.json();
}

export async function transcribeVoiceNote(params: {
  audioBase64: string;
  fileName?: string;
  mimeType?: string;
  onToken?: (chunk: string) => void;
}): Promise<string> {
  const baseUrl = getFunctionsBaseUrl();
  const authHeader = await getAuthHeader();

  const response = await fetch(`${baseUrl}/voice-transcribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify({
      audio_base64: params.audioBase64,
      file_name: params.fileName,
      mime_type: params.mimeType,
    }),
  });

  if (!response.ok) {
    await throwFunctionError(response, 'Failed to transcribe voice note', 'voice-transcribe');
  }

  const reader = response.body?.getReader?.();
  if (!reader) {
    const payload = await response.json();
    return payload.text || '';
  }

  const decoder: { decode: (value: Uint8Array, options?: { stream?: boolean }) => string } =
    typeof TextDecoder !== 'undefined'
      ? new TextDecoder()
      : {
          decode: (value: Uint8Array) => String.fromCharCode(...value),
        };

  let buffer = '';
  let fullText = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() || '';

    for (const part of parts) {
      const parsed = parseSseEvent(part);
      if (!parsed) continue;

      if (parsed.event === 'token') {
        try {
          const json = JSON.parse(parsed.data);
          const chunk = json.t || '';
          if (chunk) {
            fullText += chunk;
            params.onToken?.(chunk);
          }
        } catch {
          // ignore
        }
      } else if (parsed.event === 'done') {
        try {
          const json = JSON.parse(parsed.data);
          fullText = json.text || fullText;
        } catch {
          // ignore
        }
      }
    }
  }

  if (buffer) {
    const parsed = parseSseEvent(buffer);
    if (parsed && parsed.event === 'done') {
      try {
        const json = JSON.parse(parsed.data);
        fullText = json.text || fullText;
      } catch {
        // ignore
      }
    }
  }

  return fullText;
}

export async function getCreditStatus(): Promise<CreditStatusResponse> {
  const baseUrl = getFunctionsBaseUrl();
  const authHeader = await getAuthHeader();

  const response = await fetch(`${baseUrl}/billing-credit-status`, {
    method: 'GET',
    headers: {
      Authorization: authHeader,
    },
  });

  if (!response.ok) {
    await throwFunctionError(response, 'Failed to load credit status', 'billing-credit-status');
  }

  return (await response.json()) as CreditStatusResponse;
}

export async function getAvailableModels(): Promise<ModelCatalogResponse> {
  const baseUrl = getFunctionsBaseUrl();
  const authHeader = await getAuthHeader();

  const response = await fetch(`${baseUrl}/billing-model-catalog`, {
    method: 'GET',
    headers: {
      Authorization: authHeader,
    },
  });

  if (!response.ok) {
    await throwFunctionError(response, 'Failed to load model catalog', 'billing-model-catalog');
  }

  return (await response.json()) as ModelCatalogResponse;
}

export async function setPreferredModel(modelId: string): Promise<{ preferred_model_id: string }> {
  const baseUrl = getFunctionsBaseUrl();
  const authHeader = await getAuthHeader();

  const response = await fetch(`${baseUrl}/billing-set-model-preference`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify({
      model_id: modelId,
    }),
  });

  if (!response.ok) {
    await throwFunctionError(
      response,
      'Failed to save preferred model',
      'billing-set-model-preference'
    );
  }

  return (await response.json()) as { preferred_model_id: string };
}
