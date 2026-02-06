const OPENROUTER_BASE_URL = Deno.env.get('OPENROUTER_BASE_URL') ?? 'https://openrouter.ai/api/v1';
const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY') ?? '';
const OPENROUTER_APP_URL = Deno.env.get('OPENROUTER_APP_URL');
const OPENROUTER_APP_NAME = Deno.env.get('OPENROUTER_APP_NAME');

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

export function parseOpenRouterSseChunk(chunk: string): string[] {
  const tokens: string[] = [];
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
        const content = delta?.content || delta?.text;
        if (content) {
          tokens.push(content);
        }
      } catch {
        // Ignore malformed chunks
      }
    }
  }

  return tokens;
}
