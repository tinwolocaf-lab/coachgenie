import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainService: 'coachgenie.supabase.auth',
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

let secureStoreAvailablePromise: Promise<boolean> | null = null;

async function isSecureStoreAvailable(): Promise<boolean> {
  if (!secureStoreAvailablePromise) {
    secureStoreAvailablePromise = SecureStore.isAvailableAsync().catch(() => false);
  }

  return secureStoreAvailablePromise;
}

async function readLegacyAuthValue(key: string): Promise<string | null> {
  return AsyncStorage.getItem(key);
}

async function removeLegacyAuthValue(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}

export const authSessionStorage = {
  async getItem(key: string): Promise<string | null> {
    const secureStoreAvailable = await isSecureStoreAvailable();
    if (!secureStoreAvailable) {
      return readLegacyAuthValue(key);
    }

    try {
      const secureValue = await SecureStore.getItemAsync(key, SECURE_STORE_OPTIONS);
      if (secureValue !== null) {
        return secureValue;
      }

      const legacyValue = await readLegacyAuthValue(key);
      if (legacyValue !== null) {
        await SecureStore.setItemAsync(key, legacyValue, SECURE_STORE_OPTIONS);
        await removeLegacyAuthValue(key);
      }

      return legacyValue;
    } catch {
      return readLegacyAuthValue(key);
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    const secureStoreAvailable = await isSecureStoreAvailable();
    if (!secureStoreAvailable) {
      await AsyncStorage.setItem(key, value);
      return;
    }

    try {
      await SecureStore.setItemAsync(key, value, SECURE_STORE_OPTIONS);
      await removeLegacyAuthValue(key);
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? `Failed to persist auth session securely: ${error.message}`
          : 'Failed to persist auth session securely'
      );
    }
  },

  async removeItem(key: string): Promise<void> {
    const secureStoreAvailable = await isSecureStoreAvailable();
    if (secureStoreAvailable) {
      try {
        await SecureStore.deleteItemAsync(key, SECURE_STORE_OPTIONS);
      } catch {
        // Continue to remove legacy storage even if secure delete fails.
      }
    }

    await removeLegacyAuthValue(key);
  },
};
