import { GoogleGenAI } from 'https://esm.sh/@google/genai@1.41.0';

export interface GeminiUsage {
  inputTokens?: number;
  outputTokens?: number;
  audioInputTokens?: number;
  audioOutputTokens?: number;
  reasoningTokens?: number;
}

let geminiClient: GoogleGenAI | null = null;

function toNumber(value: unknown): number {
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

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  return value as Record<string, unknown>;
}

function getModalityTokens(details: unknown, modality: 'audio' | 'text'): number {
  if (!Array.isArray(details)) return 0;
  for (const item of details) {
    const record = asRecord(item);
    if (!record) continue;
    const rawModality = record.modality;
    if (typeof rawModality !== 'string') continue;
    if (rawModality.toLowerCase() !== modality) continue;
    return Math.max(0, toNumber(record.tokenCount));
  }
  return 0;
}

export function isGeminiModelId(modelId: string): boolean {
  const normalized = toRawGeminiModelId(modelId).toLowerCase();
  return normalized.startsWith('gemini-');
}

export function toRawGeminiModelId(modelId: string): string {
  let normalized = modelId.trim();

  // Accept either provider-prefixed (`google/...`) or API-scoped (`models/...`)
  // forms and normalize to raw Gemini IDs for SDK calls.
  let changed = true;
  while (changed) {
    changed = false;
    if (normalized.startsWith('models/')) {
      normalized = normalized.slice('models/'.length);
      changed = true;
    }
    if (normalized.startsWith('google/')) {
      normalized = normalized.slice('google/'.length);
      changed = true;
    }
  }

  return normalized;
}

export function getGeminiClient(): GoogleGenAI {
  const apiKey = Deno.env.get('GEMINI_API_KEY') ?? '';
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY');
  }

  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey });
  }

  return geminiClient;
}

export function extractGeminiText(response: unknown): string {
  const responseRecord = asRecord(response);
  if (!responseRecord) return '';

  const directText = responseRecord.text;
  if (typeof directText === 'string' && directText.length > 0) {
    return directText;
  }

  const candidates = responseRecord.candidates;
  if (!Array.isArray(candidates)) return '';

  const first = asRecord(candidates[0]);
  const content = first ? asRecord(first.content) : null;
  const parts = content?.parts;
  if (!Array.isArray(parts)) return '';

  return parts
    .map((part) => {
      const record = asRecord(part);
      return typeof record?.text === 'string' ? record.text : '';
    })
    .join('');
}

export function extractGeminiUsage(usageMetadata: unknown): GeminiUsage | null {
  const usage = asRecord(usageMetadata);
  if (!usage) return null;

  const promptTokensDetails = usage.promptTokensDetails;
  const candidatesTokensDetails = usage.candidatesTokensDetails;

  const normalized: GeminiUsage = {
    inputTokens: Math.max(0, toNumber(usage.promptTokenCount)),
    outputTokens: Math.max(0, toNumber(usage.candidatesTokenCount)),
    reasoningTokens: Math.max(0, toNumber(usage.thoughtsTokenCount)),
    audioInputTokens: getModalityTokens(promptTokensDetails, 'audio'),
    audioOutputTokens: getModalityTokens(candidatesTokensDetails, 'audio'),
  };

  if (
    (normalized.inputTokens ?? 0) === 0 &&
    (normalized.outputTokens ?? 0) === 0 &&
    (normalized.reasoningTokens ?? 0) === 0 &&
    (normalized.audioInputTokens ?? 0) === 0 &&
    (normalized.audioOutputTokens ?? 0) === 0
  ) {
    return null;
  }

  return normalized;
}

export async function generateGeminiEmbedding(
  text: string,
  opts?: {
    model?: string;
    outputDimensionality?: number;
  },
): Promise<number[] | null> {
  const client = getGeminiClient();
  const model = toRawGeminiModelId(opts?.model ?? 'gemini-embedding-001');

  const response = await client.models.embedContent({
    model,
    contents: text,
    config: {
      outputDimensionality: opts?.outputDimensionality,
    },
  });

  const embeddings = (response as unknown as Record<string, unknown>).embeddings;
  if (!Array.isArray(embeddings) || embeddings.length === 0) {
    return null;
  }

  const firstEmbedding = asRecord(embeddings[0]);
  const values = firstEmbedding?.values;
  if (!Array.isArray(values)) {
    return null;
  }

  return values.map((value) => toNumber(value));
}
