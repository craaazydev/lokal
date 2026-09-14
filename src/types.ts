/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserProfile {
  id: string; // Firebase auth UID
  telegramUsername: string; // Telegram @handle
  phoneNumber: string; // Phone number
  displayName: string; // Full display name
  role: 'user' | 'admin';
  kycStatus: 'none' | 'pending' | 'approved' | 'rejected';
  kycData?: KYCData;
  createdAt: string;
  updatedAt: string;
  binancePayId?: string;
  binanceApiKey?: string;
  binanceApiSecret?: string;
  binanceLinked?: boolean;
  binanceSettlementMode?: 'standard' | 'binance_pay' | 'arbitrage';
}

export interface KYCData {
  fullName: string;
  idType: 'passport' | 'national_id' | 'driver_license';
  idNumber: string;
  country: string;
  email: string;
  frontIdUrl?: string; // Mock or uploaded image reference
  bankStatementUrl?: string; // Bank statement document
  faceScanUrl?: string; // Face scan image / biometrics reference
  submittedAt: string;
}

export interface ExchangeRate {
  id: string; // BTC, ETH, SOL, USDT, etc.
  symbol: string;
  name: string;
  rateUsd: number; // Reference/Spot value of 1 coin in USD
  buyRate?: number; // Direct buying rate in USD (what user pays per coin)
  sellRate?: number; // Direct selling rate in USD (what user gets per coin)
  buyCommissionValue?: number; // e.g. $1000.00 USD value markup per coin
  sellCommissionValue?: number; // e.g. $800.00 USD value margin per coin
  buyCommissionPercent?: number; // legacy percentage fallback
  sellCommissionPercent?: number; // legacy percentage fallback
  minAmount: number; // Minimum transaction quantity in this coin
  updatedAt: string;
}

export function getBuyCommissionValue(rate?: ExchangeRate | null): number {
  if (!rate) return 0;
  if (typeof rate.buyCommissionValue === 'number') return rate.buyCommissionValue;
  if (typeof rate.buyCommissionPercent === 'number') return rate.rateUsd * (rate.buyCommissionPercent / 100);
  return 0;
}

export function getSellCommissionValue(rate?: ExchangeRate | null): number {
  if (!rate) return 0;
  if (typeof rate.sellCommissionValue === 'number') return rate.sellCommissionValue;
  if (typeof rate.sellCommissionPercent === 'number') return rate.rateUsd * (rate.sellCommissionPercent / 100);
  return 0;
}

export function getBuyRate(rate?: ExchangeRate | null): number {
  if (!rate) return 0;
  if (typeof rate.buyRate === 'number' && rate.buyRate > 0) return rate.buyRate;
  const base = rate.rateUsd || 0;
  const markup = getBuyCommissionValue(rate);
  return base + markup;
}

export function getSellRate(rate?: ExchangeRate | null): number {
  if (!rate) return 0;
  if (typeof rate.sellRate === 'number' && rate.sellRate > 0) return rate.sellRate;
  const base = rate.rateUsd || 0;
  const margin = getSellCommissionValue(rate);
  return Math.max(0, base - margin);
}

export function getEffectiveRate(rate: ExchangeRate | null | undefined, action: 'buy' | 'sell' | 'withdraw'): number {
  if (!rate) return 0;
  if (action === 'buy') return getBuyRate(rate);
  if (action === 'sell') return getSellRate(rate);
  return rate.rateUsd || getSellRate(rate) || 0;
}

export function formatNum(val: any, options?: Intl.NumberFormatOptions): string {
  if (val === null || val === undefined) return '0';
  if (typeof val === 'number') {
    return isNaN(val) ? '0' : val.toLocaleString(undefined, options);
  }
  if (typeof val === 'string') {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? '0' : parsed.toLocaleString(undefined, options);
  }
  return '0';
}

export function formatDate(val: any): string {
  if (!val) return 'N/A';
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? 'N/A' : d.toLocaleString();
  } catch {
    return 'N/A';
  }
}

export interface Transaction {
  id: string;
  userId: string;
  telegramUsername: string;
  type: 'buy' | 'sell';
  fromCurrency: string; // e.g. "USDT" (or "USD" under buys)
  toCurrency: string; // e.g. "BTC"
  amountFrom: number;
  amountTo: number;
  rate: number;
  cryptoAddress: string; // User wallet address (if buying) or our receiving address (if selling)
  paymentDetails: string; // Address hash, transaction hash / hash notes
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt?: string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  telegramUsername: string;
  coinId: string; // e.g. "BTC", "ETH", "SOL"
  amount: number;
  amountUsd: number;
  cryptoAddress: string;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt?: string;
  notes?: string;
}

export interface TelegramAuthData {
  username: string;
  phone: string;
  displayName: string;
}
