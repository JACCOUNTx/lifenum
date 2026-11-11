import { Capacitor, registerPlugin } from '@capacitor/core';

export const IAP_PRODUCT_ID = 'com.lifenum.wuxing.monthly';

export interface IapProduct {
  id: string;
  displayName: string;
  displayPrice: string;
}

export interface IapTransaction {
  transactionId: string;
  productId: string;
  jws: string;
}

export interface IapPurchaseResult {
  status: 'success' | 'pending' | 'cancelled';
  transactionId?: string;
  productId?: string;
  jws?: string;
}

interface LifenumIapPlugin {
  getProducts(options: { productIds: string[] }): Promise<{ products: IapProduct[] }>;
  purchase(options: { productId: string; appAccountToken?: string }): Promise<IapPurchaseResult>;
  restore(): Promise<{ transactions: IapTransaction[] }>;
  currentEntitlements(): Promise<{ transactions: IapTransaction[] }>;
  manageSubscriptions(): Promise<void>;
}

const nativeIap = registerPlugin<LifenumIapPlugin>('LifenumIap');

export const iapAvailable = Capacitor.getPlatform() === 'ios';

export async function iapGetProduct(): Promise<IapProduct | null> {
  if (!iapAvailable) return null;
  try {
    const { products } = await nativeIap.getProducts({ productIds: [IAP_PRODUCT_ID] });
    return products.find((product) => product.id === IAP_PRODUCT_ID) ?? null;
  } catch {
    return null;
  }
}

export async function iapPurchase(userId: string): Promise<IapPurchaseResult | null> {
  if (!iapAvailable) return null;
  return nativeIap.purchase({ productId: IAP_PRODUCT_ID, appAccountToken: userId });
}

export async function iapRestore(): Promise<IapTransaction[]> {
  if (!iapAvailable) return [];
  const { transactions } = await nativeIap.restore();
  return transactions;
}

export async function iapCurrentEntitlements(): Promise<IapTransaction[]> {
  if (!iapAvailable) return [];
  const { transactions } = await nativeIap.currentEntitlements();
  return transactions;
}

export async function iapManage(): Promise<boolean> {
  if (!iapAvailable) return false;
  try {
    await nativeIap.manageSubscriptions();
    return true;
  } catch {
    return false;
  }
}
