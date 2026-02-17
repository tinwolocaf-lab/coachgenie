import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { fetchWithRetry } from '@/lib/network';
import { setRitualsSchemaUnavailable } from '@/lib/supabase-rituals';
import { setBreakthroughsSchemaUnavailable } from '@/lib/supabase-sanctuary';
import { logNonFatal } from '@/lib/telemetry';

export type SchemaResourceStatus = 'unknown' | 'ready' | 'migration_required' | 'unreachable';

export interface SchemaResourceReadiness {
  status: SchemaResourceStatus;
  message?: string;
}

export interface SchemaReadinessSnapshot {
  checking: boolean;
  checkedAt: string | null;
  migrationRequired: boolean;
  rituals: SchemaResourceReadiness;
  breakthroughs: SchemaResourceReadiness;
  functions: {
    chatStream: SchemaResourceReadiness;
    sanctuaryBreakthrough: SchemaResourceReadiness;
    ritualsClosingThought: SchemaResourceReadiness;
  };
}

type SchemaReadinessListener = (snapshot: SchemaReadinessSnapshot) => void;

const UNKNOWN_RESOURCE: SchemaResourceReadiness = { status: 'unknown' };

let snapshot: SchemaReadinessSnapshot = {
  checking: false,
  checkedAt: null,
  migrationRequired: false,
  rituals: UNKNOWN_RESOURCE,
  breakthroughs: UNKNOWN_RESOURCE,
  functions: {
    chatStream: UNKNOWN_RESOURCE,
    sanctuaryBreakthrough: UNKNOWN_RESOURCE,
    ritualsClosingThought: UNKNOWN_RESOURCE,
  },
};

let inFlightCheck: Promise<SchemaReadinessSnapshot> | null = null;
const listeners = new Set<SchemaReadinessListener>();

function getFunctionsBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_SUPABASE_FUNCTIONS_URL;
  if (explicit) {
    const normalized = explicit.replace(/\/$/, '');
    return normalized.includes('/functions/v1') ? normalized : `${normalized}/functions/v1`;
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL');
  }

  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1`;
}

function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const maybeError = error as { code?: unknown; message?: unknown };
  const code = typeof maybeError.code === 'string' ? maybeError.code : '';
  const message = typeof maybeError.message === 'string' ? maybeError.message.toLowerCase() : '';
  return code === 'PGRST205' || message.includes('could not find the table');
}

function buildMissingTableMessage(tableName: string): string {
  return `Supabase table "${tableName}" is missing. Run the latest migrations.`;
}

function buildMissingFunctionMessage(functionName: string): string {
  return `Edge function "${functionName}" is missing. Deploy functions after migrations.`;
}

function updateSnapshot(next: SchemaReadinessSnapshot): SchemaReadinessSnapshot {
  snapshot = next;
  listeners.forEach((listener) => listener(snapshot));
  return snapshot;
}

async function checkTableReadiness(tableName: 'rituals' | 'breakthroughs'): Promise<SchemaResourceReadiness> {
  try {
    const { error } = await supabase
      .from(tableName)
      .select('id', { count: 'exact', head: true })
      .limit(1);

    if (!error) {
      return { status: 'ready' };
    }

    if (isMissingRelationError(error)) {
      return {
        status: 'migration_required',
        message: buildMissingTableMessage(tableName),
      };
    }

    return {
      status: 'unreachable',
      message: error.message ?? `Could not verify table "${tableName}".`,
    };
  } catch (error) {
    return {
      status: 'unreachable',
      message: error instanceof Error ? error.message : `Could not verify table "${tableName}".`,
    };
  }
}

async function getOptionalAuthHeader(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return null;
    return `Bearer ${token}`;
  } catch {
    return null;
  }
}

async function checkFunctionReadiness(functionName: string): Promise<SchemaResourceReadiness> {
  const baseUrl = getFunctionsBaseUrl();
  const authHeader = await getOptionalAuthHeader();

  try {
    const response = await fetchWithRetry(
      `${baseUrl}/${functionName}`,
      {
        method: 'OPTIONS',
        headers: authHeader ? { Authorization: authHeader } : undefined,
      },
      {
        timeoutMs: 10_000,
        idempotent: true,
        retries: 1,
        retryDelayMs: 300,
      }
    );

    if (response.status === 404) {
      return {
        status: 'migration_required',
        message: buildMissingFunctionMessage(functionName),
      };
    }

    return { status: 'ready' };
  } catch (error) {
    return {
      status: 'unreachable',
      message: error instanceof Error ? error.message : `Could not verify function "${functionName}".`,
    };
  }
}

function hasMigrationRequiredResource(next: SchemaReadinessSnapshot): boolean {
  return (
    next.rituals.status === 'migration_required' ||
    next.breakthroughs.status === 'migration_required' ||
    next.functions.chatStream.status === 'migration_required' ||
    next.functions.sanctuaryBreakthrough.status === 'migration_required' ||
    next.functions.ritualsClosingThought.status === 'migration_required'
  );
}

export function getSchemaReadinessSnapshot(): SchemaReadinessSnapshot {
  return snapshot;
}

export function subscribeSchemaReadiness(listener: SchemaReadinessListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function ensureSchemaReadiness(force = false): Promise<SchemaReadinessSnapshot> {
  if (!isSupabaseConfigured) {
    const next = {
      checking: false,
      checkedAt: new Date().toISOString(),
      migrationRequired: false,
      rituals: { status: 'unknown' as const },
      breakthroughs: { status: 'unknown' as const },
      functions: {
        chatStream: { status: 'unknown' as const },
        sanctuaryBreakthrough: { status: 'unknown' as const },
        ritualsClosingThought: { status: 'unknown' as const },
      },
    };
    return updateSnapshot(next);
  }

  if (!force && snapshot.checkedAt && !snapshot.checking) {
    return snapshot;
  }

  if (!force && inFlightCheck) {
    return inFlightCheck;
  }

  updateSnapshot({
    ...snapshot,
    checking: true,
  });

  inFlightCheck = (async () => {
    const [rituals, breakthroughs, chatStream, sanctuaryBreakthrough, ritualsClosingThought] = await Promise.all([
      checkTableReadiness('rituals'),
      checkTableReadiness('breakthroughs'),
      checkFunctionReadiness('chat-stream'),
      checkFunctionReadiness('sanctuary-breakthrough'),
      checkFunctionReadiness('rituals-closing-thought'),
    ]);

    const next: SchemaReadinessSnapshot = {
      checking: false,
      checkedAt: new Date().toISOString(),
      migrationRequired: false,
      rituals,
      breakthroughs,
      functions: {
        chatStream,
        sanctuaryBreakthrough,
        ritualsClosingThought,
      },
    };

    next.migrationRequired = hasMigrationRequiredResource(next);

    setRitualsSchemaUnavailable(rituals.status === 'migration_required');
    setBreakthroughsSchemaUnavailable(breakthroughs.status === 'migration_required');

    return updateSnapshot(next);
  })();

  try {
    return await inFlightCheck;
  } catch (error) {
    logNonFatal(error, {
      scope: 'schema-readiness:check',
      message: 'Schema readiness check failed',
    });
    return updateSnapshot({
      ...snapshot,
      checking: false,
      checkedAt: new Date().toISOString(),
    });
  } finally {
    inFlightCheck = null;
  }
}

export function useSchemaReadiness(): SchemaReadinessSnapshot {
  const [state, setState] = useState<SchemaReadinessSnapshot>(getSchemaReadinessSnapshot());

  useEffect(() => {
    const unsubscribe = subscribeSchemaReadiness(setState);
    void ensureSchemaReadiness();
    return unsubscribe;
  }, []);

  return state;
}
