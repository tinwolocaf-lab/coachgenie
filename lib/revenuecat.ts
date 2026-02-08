import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  CustomerInfo,
  PurchasesOffering,
} from 'react-native-purchases';

const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || '';
const SOVEREIGN_ENTITLEMENT_ID = 'sovereign';

let isConfigured = false;

export async function initRevenueCat(): Promise<void> {
  if (isConfigured || !REVENUECAT_API_KEY) return;

  Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  Purchases.configure({ apiKey: REVENUECAT_API_KEY });
  isConfigured = true;
}

export async function identifyUser(userId: string): Promise<void> {
  if (!isConfigured) return;
  await Purchases.logIn(userId);
}

export async function logOutUser(): Promise<void> {
  if (!isConfigured) return;
  await Purchases.logOut();
}

export async function checkSovereignEntitlement(): Promise<boolean> {
  if (!isConfigured) return false;
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active[SOVEREIGN_ENTITLEMENT_ID] !== undefined;
  } catch (error) {
    console.warn('[RevenueCat] Could not check entitlement (expected in Expo Go):', (error as any)?.code);
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
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => {
    // RevenueCat SDK manages listener lifecycle internally
  };
}

export function hasSovereignEntitlement(customerInfo: CustomerInfo): boolean {
  return customerInfo.entitlements.active[SOVEREIGN_ENTITLEMENT_ID] !== undefined;
}
