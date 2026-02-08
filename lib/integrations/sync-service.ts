import { AppState, AppStateStatus } from 'react-native';
import { listIntegrations, syncIntegration } from './api';
import type { IntegrationProvider } from '@/types';

let lastSyncTimestamp = 0;
const MIN_SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

export async function syncAllIntegrations(): Promise<void> {
  const now = Date.now();
  if (now - lastSyncTimestamp < MIN_SYNC_INTERVAL_MS) {
    console.log('[SyncService] Skipping sync, too recent');
    return;
  }

  try {
    const integrations = await listIntegrations();
    const activeIntegrations = integrations.filter((i) => i.status === 'active');

    for (const integration of activeIntegrations) {
      try {
        await syncIntegration(integration.provider as IntegrationProvider);
      } catch (error) {
        console.error(`[SyncService] Error syncing ${integration.provider}:`, error);
      }
    }

    lastSyncTimestamp = now;
    console.log(`[SyncService] Synced ${activeIntegrations.length} integrations`);
  } catch (error) {
    console.error('[SyncService] Error listing integrations:', error);
  }
}

let appStateSubscription: { remove: () => void } | null = null;

export function startBackgroundSync(): void {
  if (appStateSubscription) return;

  appStateSubscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
    if (nextState === 'active') {
      syncAllIntegrations();
    }
  });

  // Initial sync
  syncAllIntegrations();
}

export function stopBackgroundSync(): void {
  appStateSubscription?.remove();
  appStateSubscription = null;
}
