/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExchangeRate } from './types';

export const DEFAULT_RATES: ExchangeRate[] = [
  {
    id: 'USDT',
    symbol: 'USDT',
    name: 'Tether USD',
    rateUsd: 1.00,
    buyRate: 1.00,
    sellRate: 1.00,
    buyCommissionValue: 0.00,
    sellCommissionValue: 0.00,
    buyCommissionPercent: 0.0,
    sellCommissionPercent: 0.0,
    minAmount: 10.0,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'USD',
    symbol: 'USD',
    name: 'US Dollar',
    rateUsd: 1.00,
    buyRate: 1.00,
    sellRate: 1.00,
    buyCommissionValue: 0.00,
    sellCommissionValue: 0.00,
    buyCommissionPercent: 0.0,
    sellCommissionPercent: 0.0,
    minAmount: 10.0,
    updatedAt: new Date().toISOString()
  }
];
