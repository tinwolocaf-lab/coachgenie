const OPENROUTER_BASE_URL = Deno.env.get('OPENROUTER_BASE_URL') ?? 'https://openrouter.ai/api/v1';
const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY') ?? '';
const OPENROUTER_APP_URL = Deno.env.get('OPENROUTER_APP_URL');
const OPENROUTER_APP_NAME = Deno.env.get('OPENROUTER_APP_NAME');

export interface OpenRouterUsage {
  inputTokens?: number;
  outputTokens?: number;
  audioInputTokens?: number;
  audioOutputTokens?: number;
  reasoningTokens?: number;
}

export function getOpenRouterHeaders(): Record<string, string> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('Missing OPENROUTER_API_KEY');
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
  };

  if (OPENROUTER_APP_URL) {
    headers['HTTP-Referer'] = OPENROUTER_APP_URL;
  }
  if (OPENROUTER_APP_NAME) {
    headers['X-Title'] = OPENROUTER_APP_NAME;
  }

  return headers;
}

export function getOpenRouterUrl(path: string): string {
  return `${OPENROUTER_BASE_URL.replace(/\/$/, '')}${path}`;
}

export async function openRouterChat(payload: Record<string, unknown>) {
  const response = await fetch(getOpenRouterUrl('/chat/completions'), {
    method: 'POST',
    headers: getOpenRouterHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'OpenRouter request failed');
  }

  return response;
}

function collectTextFromContent(content: unknown): string[] {
  if (typeof content === 'string') {
    return content.length > 0 ? [content] : [];
  }

  if (Array.isArray(content)) {
    return content.flatMap((item) => collectTextFromContent(item));
  }

  if (!content || typeof content !== 'object') {
    return [];
  }

  const record = content as Record<string, unknown>;
  const segments: string[] = [];

  if (typeof record.text === 'string' && record.text.length > 0) {
    segments.push(record.text);
  }

  if (typeof record.output_text === 'string' && record.output_text.length > 0) {
    segments.push(record.output_text);
  }

  if ('content' in record) {
    segments.push(...collectTextFromContent(record.content));
  }

  if (Array.isArray(record.parts)) {
    segments.push(...record.parts.flatMap((part) => collectTextFromContent(part)));
  }

  return segments;
}

export function extractOpenRouterMessageContent(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return '';
  }

  const top = payload as Record<string, unknown>;
  const choices = Array.isArray(top.choices) ? top.choices : [];
  const firstChoice = choices[0];
  if (!firstChoice || typeof firstChoice !== 'object') {
    return '';
  }

  const choiceRecord = firstChoice as Record<string, unknown>;
  const message = choiceRecord.message;
  if (!message || typeof message !== 'object') {
    return '';
  }

  const messageRecord = message as Record<string, unknown>;
  return collectTextFromContent(messageRecord.content).join('');
}

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

function readObjectField(record: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const value = record[key];
  if (value && typeof value === 'object') {
    return value as Record<string, unknown>;
  }
  return null;
}

export function extractOpenRouterUsage(payload: unknown): OpenRouterUsage | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const top = payload as Record<string, unknown>;
  const usage = readObjectField(top, 'usage');
  if (!usage) {
    return null;
  }

  const promptDetails = readObjectField(usage, 'prompt_tokens_details');
  const completionDetails = readObjectField(usage, 'completion_tokens_details');

  const normalized: OpenRouterUsage = {
    inputTokens: toNumber(usage.input_tokens ?? usage.prompt_tokens),
    outputTokens: toNumber(usage.output_tokens ?? usage.completion_tokens),
    audioInputTokens: toNumber(usage.audio_input_tokens ?? promptDetails?.audio_tokens),
    audioOutputTokens: toNumber(usage.audio_output_tokens ?? completionDetails?.audio_tokens),
    reasoningTokens: toNumber(usage.reasoning_tokens ?? completionDetails?.reasoning_tokens),
  };

  if (
    (normalized.inputTokens ?? 0) === 0 &&
    (normalized.outputTokens ?? 0) === 0 &&
    (normalized.audioInputTokens ?? 0) === 0 &&
    (normalized.audioOutputTokens ?? 0) === 0 &&
    (normalized.reasoningTokens ?? 0) === 0
  ) {
    return null;
  }

  return normalized;
}

export function parseOpenRouterSseChunkWithUsage(chunk: string): {
  tokens: string[];
  usage: OpenRouterUsage | null;
} {
  const tokens: string[] = [];
  let usage: OpenRouterUsage | null = null;
  const blocks = chunk.split('\n\n').filter(Boolean);

  for (const block of blocks) {
    const lines = block.split('\n');
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const data = line.replace('data:', '').trim();
      if (!data || data === '[DONE]') continue;

      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta;
        const contents = collectTextFromContent(delta?.content ?? delta?.text);
        if (contents.length > 0) {
          tokens.push(...contents);
        }

        const parsedUsage = extractOpenRouterUsage(json);
        if (parsedUsage) {
          usage = parsedUsage;
        }
      } catch {
        // Ignore malformed chunks
      }
    }
  }

  return { tokens, usage };
}

export function parseOpenRouterSseChunk(chunk: string): string[] {
  return parseOpenRouterSseChunkWithUsage(chunk).tokens;
}
