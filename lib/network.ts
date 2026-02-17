const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_RETRYABLE_STATUSES = [408, 425, 429, 500, 502, 503, 504];

export interface FetchPolicy {
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
  retryBackoffMultiplier?: number;
  retryOnStatuses?: number[];
  idempotent?: boolean;
  signal?: AbortSignal;
}

class RequestTimeoutError extends Error {
  readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = 'RequestTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function combineAbortSignals(signals: Array<AbortSignal | undefined>): {
  signal?: AbortSignal;
  cleanup: () => void;
} {
  const activeSignals = signals.filter((signal): signal is AbortSignal => !!signal);
  if (activeSignals.length === 0) {
    return { cleanup: () => undefined };
  }
  if (activeSignals.length === 1) {
    return { signal: activeSignals[0], cleanup: () => undefined };
  }

  const controller = new AbortController();
  const onAbort = () => {
    if (!controller.signal.aborted) {
      controller.abort();
    }
  };

  for (const signal of activeSignals) {
    if (signal.aborted) {
      onAbort();
      break;
    }
    signal.addEventListener('abort', onAbort);
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      for (const signal of activeSignals) {
        signal.removeEventListener('abort', onAbort);
      }
    },
  };
}

function normalizeRetryStatuses(statuses?: number[]): number[] {
  if (!Array.isArray(statuses) || statuses.length === 0) {
    return DEFAULT_RETRYABLE_STATUSES;
  }

  return statuses.filter((status) => Number.isInteger(status) && status >= 100 && status <= 599);
}

async function fetchWithTimeoutOnce(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number,
  externalSignal?: AbortSignal
): Promise<Response> {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => {
    timeoutController.abort();
  }, timeoutMs);

  const { signal, cleanup } = combineAbortSignals([init.signal ?? undefined, externalSignal, timeoutController.signal]);

  try {
    const response = await fetch(input, {
      ...init,
      signal,
    });

    return response;
  } catch (error) {
    if (timeoutController.signal.aborted && isAbortError(error)) {
      throw new RequestTimeoutError(timeoutMs);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    cleanup();
  }
}

function shouldRetryError(error: unknown, externalSignal?: AbortSignal): boolean {
  if (externalSignal?.aborted) {
    return false;
  }
  if (error instanceof RequestTimeoutError) {
    return true;
  }
  if (isAbortError(error)) {
    return false;
  }
  return error instanceof TypeError || (error instanceof Error && error.name === 'NetworkError');
}

function shouldRetryResponse(response: Response, retryStatuses: number[]): boolean {
  return retryStatuses.includes(response.status);
}

export async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit = {},
  policy: FetchPolicy = {}
): Promise<Response> {
  const timeoutMs = policy.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = policy.idempotent ? Math.max(0, policy.retries ?? 0) : 0;
  const retryDelayMs = Math.max(0, policy.retryDelayMs ?? 300);
  const retryBackoffMultiplier = Math.max(1, policy.retryBackoffMultiplier ?? 2);
  const retryStatuses = normalizeRetryStatuses(policy.retryOnStatuses);

  let attempt = 0;
  let delayMs = retryDelayMs;
  let lastError: unknown = null;

  while (attempt <= retries) {
    try {
      const response = await fetchWithTimeoutOnce(input, init, timeoutMs, policy.signal);
      if (attempt < retries && shouldRetryResponse(response, retryStatuses)) {
        await sleep(delayMs);
        delayMs *= retryBackoffMultiplier;
        attempt += 1;
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt >= retries || !shouldRetryError(error, policy.signal)) {
        throw error;
      }
      await sleep(delayMs);
      delayMs *= retryBackoffMultiplier;
      attempt += 1;
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error('Request failed without a known error');
}
