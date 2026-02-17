import Constants from 'expo-constants';
import Purchases, {
  LOG_LEVEL,
  CustomerInfo,
  PurchasesOffering,
} from 'react-native-purchases';

import type { SubscriptionTier } from '@/lib/feature-gates';

const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || '';
const REVENUECAT_ALLOW_EXPO_GO = process.env.EXPO_PUBLIC_REVENUECAT_ALLOW_EXPO_GO === 'true';
const SOVEREIGN_ENTITLEMENT_ID = 'sovereign';
const ORACLE_ENTITLEMENT_ID = 'oracle';

let isConfigured = false;
let hasAttemptedConfiguration = false;
let lastInitError: string | null = null;

function getErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const maybeCode = (error as Record<string, unknown>).code;
  return typeof maybeCode === 'string' ? maybeCode : undefined;
}

export async function initRevenueCat(): Promise<void> {
  if (isConfigured || hasAttemptedConfiguration) return;
  hasAttemptedConfiguration = true;

  if (!REVENUECAT_API_KEY) {
    lastInitError = 'missing_api_key';
    return;
  }

  if (isExpoGo() && !REVENUECAT_ALLOW_EXPO_GO) {
    lastInitError = 'expo_go_not_supported';
    console.info('[RevenueCat] Skipping native purchases in Expo Go. Use a dev build or Test Store key.');
    return;
  }

  try {
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);
    Purchases.configure({ apiKey: REVENUECAT_API_KEY });
    isConfigured = true;
    lastInitError = null;
  } catch (error) {
    const message = getErrorMessage(error).toLowerCase();
    if (message.includes('native store is not available') && isExpoGo()) {
      lastInitError = 'expo_go_not_supported';
    } else {
      lastInitError = 'configure_failed';
    }
    console.warn('[RevenueCat] Failed to configure (expected in Expo Go or dev builds):', error);
  }
}

function isExpoGo(): boolean {
  const maybeConstants = Constants as unknown as {
    executionEnvironment?: string;
    appOwnership?: string;
  };
  return (
    maybeConstants.executionEnvironment === 'storeClient' ||
    maybeConstants.appOwnership === 'expo'
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (!error || typeof error !== 'object') return '';
  try {
    return JSON.stringify(error);
  } catch {
    return '';
  }
}

export function isRevenueCatReady(): boolean {
  return isConfigured;
}

export function getRevenueCatInitError(): string | null {
  return lastInitError;
}

export async function identifyUser(userId: string): Promise<void> {
  if (!isConfigured) return;
  try {
    await Purchases.logIn(userId);
  } catch (error) {
    console.warn('[RevenueCat] Failed to identify user:', getErrorCode(error) ?? error);
  }
}

export async function logOutUser(): Promise<void> {
  if (!isConfigured) return;
  try {
    await Purchases.logOut();
  } catch (error) {
    console.warn('[RevenueCat] Failed to log out user:', getErrorCode(error) ?? error);
  }
}

export async function checkSovereignEntitlement(): Promise<boolean> {
  if (!isConfigured) return false;
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active[SOVEREIGN_ENTITLEMENT_ID] !== undefined;
  } catch (error) {
    console.warn('[RevenueCat] Could not check entitlement (expected in Expo Go):', getErrorCode(error));
    return false;
  }
}

export async function getOfferings(): Promise<PurchasesOffering | null> {
  if (!isConfigured) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (error) {
    console.error('[RevenueCat] Error getting offerings:', error);
    return null;
  }
}

export async function restorePurchases(): Promise<boolean> {
  if (!isConfigured) return false;
  try {
    const customerInfo = await Purchases.restorePurchases();
    return customerInfo.entitlements.active[SOVEREIGN_ENTITLEMENT_ID] !== undefined;
  } catch (error) {
    console.error('[RevenueCat] Error restoring purchases:', error);
    return false;
  }
}

export function addCustomerInfoUpdateListener(
  listener: (info: CustomerInfo) => void
): () => void {
  if (!isConfigured) return () => {};
  try {
    Purchases.addCustomerInfoUpdateListener(listener);
  } catch (error) {
    console.warn('[RevenueCat] Failed to add customer info listener:', error);
  }
  return () => {
    try {
      Purchases.removeCustomerInfoUpdateListener(listener);
    } catch (error) {
      // Non-fatal: avoid noisy listener cleanup failures.
      if (__DEV__) {
        console.warn('[RevenueCat] Failed to remove customer info listener:', error);
      }
    }
  };
}

export function hasSovereignEntitlement(customerInfo: CustomerInfo): boolean {
  return customerInfo.entitlements.active[SOVEREIGN_ENTITLEMENT_ID] !== undefined;
}

export function hasOracleEntitlement(customerInfo: CustomerInfo): boolean {
  return customerInfo.entitlements.active[ORACLE_ENTITLEMENT_ID] !== undefined;
}

export async function checkOracleEntitlement(): Promise<boolean> {
  if (!isConfigured) return false;
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active[ORACLE_ENTITLEMENT_ID] !== undefined;
  } catch (error) {
    console.warn('[RevenueCat] Could not check oracle entitlement:', getErrorCode(error));
    return false;
  }
}

export async function getUserSubscriptionTier(): Promise<SubscriptionTier> {
  if (!isConfigured) return 'free';
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    if (customerInfo.entitlements.active[ORACLE_ENTITLEMENT_ID] !== undefined) {
      return 'oracle';
    }
    if (customerInfo.entitlements.active[SOVEREIGN_ENTITLEMENT_ID] !== undefined) {
      return 'sovereign';
    }
    return 'free';
  } catch {
    return 'free';
  }
}

export function getTierFromCustomerInfo(customerInfo: CustomerInfo): SubscriptionTier {
  if (customerInfo.entitlements.active[ORACLE_ENTITLEMENT_ID] !== undefined) {
    return 'oracle';
  }
  if (customerInfo.entitlements.active[SOVEREIGN_ENTITLEMENT_ID] !== undefined) {
    return 'sovereign';
  }
  return 'free';
}
