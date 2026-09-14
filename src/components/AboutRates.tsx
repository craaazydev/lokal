/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { ExchangeRate, getBuyRate, getSellRate, getBuyCommissionValue, getSellCommissionValue, formatNum } from '../types';
import { TrendingUp, Zap, ShieldCheck, HeartHandshake, CircleDollarSign } from 'lucide-react';

interface AboutRatesProps {
  rates: ExchangeRate[];
  onSelectCoin: (coinId: string, actionType: 'buy' | 'sell') => void;
}

export default function AboutRates({ rates, onSelectCoin }: AboutRatesProps) {
  // Calculated buy and sell values configured directly by admin or derived with margins
  const formattedRates = useMemo(() => {
    return rates.map((coin, index) => {
      const buyRate = getBuyRate(coin);
      const sellRate = getSellRate(coin);
      const buyCommVal = getBuyCommissionValue(coin);
      const sellCommVal = getSellCommissionValue(coin);
      
      // Realistic 24h shifts
      const shiftPercent = index % 3 === 0 ? 3.42 : index % 3 === 1 ? -1.15 : 0.82;
      const isPositive = shiftPercent > 0;

      return {
        ...coin,
        buyRate,
        sellRate,
        buyCommVal,
        sellCommVal,
        shiftPercent,
        isPositive,
      };
    });
  }, [rates]);

  return (
    <section id="about-and-rates-section" className="py-20 sm:py-24 bg-neutral-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* About Info Container */}
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 mb-16 items-start">
          <div className="lg:col-span-5 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/25 px-3 py-1.5 rounded-full">
              <span className="text-xs font-semibold text-gold tracking-wide">
                Institutional Escrow Protocol
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Why Trade with <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E5C158] to-gold">
                LokalMV Desk
              </span>?
            </h2>
            <p className="text-neutral-400 text-sm sm:text-base leading-relaxed">
              We provide sovereign peer-to-desk liquidity without custodian lockups. Every transaction is settled through cryptographic escrow directly to your local bank account or wallet.
            </p>
            <div className="flex flex-col gap-4 pt-2">
              <div className="flex gap-3.5 items-start">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-gold/10 flex items-center justify-center border border-gold/20 text-gold">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Direct Escrow Handshake</h4>
                  <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">Trades are locked and verified individually through audited escrow gates.</p>
                </div>
              </div>
              <div className="flex gap-3.5 items-start">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Sub-10-Minute Local Settlement</h4>
                  <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">Swift local MVR and USD wire transfers clear quickly upon ledger verification.</p>
                </div>
              </div>
              <div className="flex gap-3.5 items-start">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-sky-500/10 flex items-center justify-center border border-sky-500/20 text-sky-400">
                  <HeartHandshake className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Transparent Fixed Spreads</h4>
                  <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">Clear pricing with zero hidden fees or variable slip deductions.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Rates Table Grid */}
          <div className="lg:col-span-7 bg-neutral-900/70 border border-neutral-800/90 rounded-2xl p-5 sm:p-7 flex flex-col justify-between shadow-2xl overflow-hidden backdrop-blur-md">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-gold" />
                    Live OTC Exchange Rates
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">Real-time market rates and OTC liquidity spreads.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Live Feed Active
                  </span>
                </div>
              </div>

              {/* Responsive Table wrapper */}
              <div className="overflow-x-auto -mx-2 px-2">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-800 text-xs font-semibold text-neutral-400">
                      <th className="py-3 px-3">Asset</th>
                      <th className="py-3 px-3 text-right text-emerald-400">Buy Price</th>
                      <th className="py-3 px-3 text-right text-gold">Sell Price</th>
                      <th className="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-850 text-sm">
                    {formattedRates.map((coin) => (
                      <tr key={coin.id} className="hover:bg-neutral-800/40 transition-colors group">
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-neutral-800 border border-neutral-700/60 flex items-center justify-center font-bold text-xs text-gold shadow-sm shrink-0">
                              {coin.symbol.slice(0, 3)}
                            </div>
                            <div>
                              <span className="block font-semibold text-white text-sm leading-none">{coin.name}</span>
                              <span className="block text-[11px] text-neutral-400 font-mono mt-1">Min: {coin.minAmount} {coin.symbol}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-sm">
                          <span className="block font-bold text-emerald-400">${formatNum(coin.buyRate, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
                          <span className="block text-[10px] text-neutral-400 font-normal mt-0.5">Pay in MVR or USD</span>
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-sm">
                          <span className="block font-bold text-gold">${formatNum(coin.sellRate, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
                          <span className="block text-[10px] text-neutral-400 font-normal mt-0.5">Receive MVR or USD</span>
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              id={`rates-buy-btn-${coin.id}`}
                              onClick={() => onSelectCoin(coin.id, 'buy')}
                              className="text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-neutral-950 px-3 py-1.5 rounded-lg border border-emerald-500/25 transition-all cursor-pointer shadow-sm active:scale-95"
                            >
                              Buy
                            </button>
                            <button
                              id={`rates-sell-btn-${coin.id}`}
                              onClick={() => onSelectCoin(coin.id, 'sell')}
                              className="text-xs font-semibold bg-gold/15 hover:bg-gold text-gold hover:text-neutral-950 px-3 py-1.5 rounded-lg border border-gold/30 transition-all cursor-pointer shadow-sm active:scale-95"
                            >
                              Sell
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>

            <div className="mt-6 pt-4 border-t border-neutral-800 flex items-center gap-3 text-xs text-neutral-400 bg-neutral-950/60 p-3.5 rounded-xl border border-neutral-800/80 leading-relaxed">
              <CircleDollarSign className="h-4 w-4 text-gold shrink-0" />
              <span>
                Rates are updated continuously from global liquidity indices. Locked rates remain valid for 10 minutes upon trade creation.
              </span>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
