import { supabase } from '@/lib/supabase';
import type { IntegrationProvider, UserIntegration, IntegrationData, IntegrationDataType } from '@/types';

function getFunctionsBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_SUPABASE_FUNCTIONS_URL;
  if (explicit) {
    const normalized = explicit.replace(/\/$/, '');
    return normalized.includes('/functions/v1') ? normalized : `${normalized}/functions/v1`;
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL');
  return `${supabaseUrl.replace(/\/$/, '')}/functions/v1`;
}

async function getAuthHeader(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Missing Supabase access token');
  return `Bearer ${token}`;
}

export async function listIntegrations(): Promise<UserIntegration[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('user_integrations')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    // Table may not exist yet — return empty instead of crashing
    if (error.code === 'PGRST205') return [];
    throw error;
  }
  return (data ?? []) as UserIntegration[];
}

export async function exchangeToken(
  provider: IntegrationProvider,
  code: string,
  redirectUri: string
): Promise<void> {
  const baseUrl = getFunctionsBaseUrl();
  const authHeader = await getAuthHeader();

  const response = await fetch(`${baseUrl}/integrations-exchange-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify({ provider, code, redirect_uri: redirectUri }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to exchange token');
  }
}

export async function syncIntegration(provider: IntegrationProvider): Promise<void> {
  const baseUrl = getFunctionsBaseUrl();
  const authHeader = await getAuthHeader();

  const functionName = `integrations-${provider.replace('_', '-')}-sync`;

  const response = await fetch(`${baseUrl}/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify({ provider }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Failed to sync ${provider}`);
  }
}

export async function disconnectIntegration(provider: IntegrationProvider): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('user_integrations')
    .delete()
    .eq('user_id', user.id)
    .eq('provider', provider);

  if (error) throw error;
}

export async function getIntegrationData(
  provider: IntegrationProvider,
  dataType?: IntegrationDataType
): Promise<IntegrationData[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: integrations, error: integrationsError } = await supabase
    .from('user_integrations')
    .select('id')
    .eq('user_id', user.id)
    .eq('provider', provider);

  if (integrationsError) {
    if (integrationsError.code === 'PGRST205') return [];
    throw integrationsError;
  }

  const integrationIds = (integrations ?? []).map((integration) => integration.id);
  if (integrationIds.length === 0) return [];

  let query = supabase
    .from('integration_data')
    .select('*')
    .eq('user_id', user.id)
    .in('integration_id', integrationIds);

  if (dataType) {
    query = query.eq('data_type', dataType);
  }

  const { data, error } = await query.order('starts_at', { ascending: true });
  if (error) {
    if (error.code === 'PGRST205') return [];
    throw error;
  }
  return (data ?? []) as IntegrationData[];
}

export async function getUpcomingEvents(hoursAhead = 24): Promise<IntegrationData[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const now = new Date().toISOString();
  const future = new Date(Date.now() + hoursAhead * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('integration_data')
    .select('*')
    .eq('user_id', user.id)
    .eq('data_type', 'calendar_event')
    .gte('starts_at', now)
    .lte('starts_at', future)
    .order('starts_at', { ascending: true });

  if (error) {
    if (error.code === 'PGRST205') return [];
    throw error;
  }
  return (data ?? []) as IntegrationData[];
}
