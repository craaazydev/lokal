/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ArrowRight, Sparkles, Shield, Coins, Users, Landmark, Zap, Lock } from 'lucide-react';

interface HeroProps {
  onTradeClick: () => void;
  onOpenAuth: () => void;
  isAuthenticated: boolean;
}

export default function Hero({ onTradeClick, onOpenAuth, isAuthenticated }: HeroProps) {
  return (
    <div id="home-hero-section" className="relative overflow-hidden bg-neutral-950 py-20 sm:py-24 px-4 sm:px-6 lg:px-8 font-sans">
      {/* Subtle ambient luxury glow */}
      <div className="absolute inset-x-0 -top-24 -z-10 flex transform-gpu justify-center overflow-hidden blur-3xl pointer-events-none" aria-hidden="true">
        <div className="aspect-[1155/678] w-[68rem] flex-none bg-gradient-to-tr from-gold/15 via-amber-600/10 to-transparent opacity-50" />
      </div>

      <div className="mx-auto max-w-7xl">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Headline and Copy */}
          <div className="lg:col-span-7 space-y-7 text-left">
            <div className="inline-flex items-center gap-2 bg-gold/10 border border-gold/25 px-3.5 py-1.5 rounded-full">
              <Sparkles className="h-3.5 w-3.5 text-gold" />
              <span className="text-xs font-semibold tracking-wide text-gold">
                Institutional OTC Liquidity
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15]">
              Cryptocurrency OTC Trades with{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E5C158] via-gold to-[#F5D77F]">
                Absolute Speed
              </span>{' '}
              & Precision.
            </h1>

            <p className="text-neutral-400 text-base sm:text-lg leading-relaxed max-w-xl font-normal">
              Direct peer-to-desk liquidity bridging USDT, USD, and MVR with guaranteed zero-slippage execution and sovereign escrow settlements.
            </p>

            {/* CTA controls */}
            <div className="flex flex-col sm:flex-row gap-3.5 pt-2">
              <button
                id="hero-btn-trade"
                onClick={onTradeClick}
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-gold to-[#C5A028] text-neutral-950 font-bold text-sm px-7 py-3.5 rounded-xl shadow-lg shadow-gold/20 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>Instant Trade Desk</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              {!isAuthenticated && (
                <button
                  id="hero-btn-auth"
                  onClick={onOpenAuth}
                  className="inline-flex items-center justify-center gap-2 bg-neutral-900/90 border border-neutral-800 text-neutral-200 hover:text-white hover:border-gold/30 text-sm font-semibold px-7 py-3.5 rounded-xl hover:bg-neutral-850 active:scale-[0.98] transition-all cursor-pointer"
                >
                  Access Client Portal
                </button>
              )}
            </div>

            {/* Security banner summary */}
            <div className="flex items-center gap-3 bg-neutral-900/60 p-3.5 rounded-xl border border-neutral-800/80 w-fit text-xs text-neutral-400">
              <Shield className="h-4 w-4 text-gold shrink-0" />
              <span>Verified escrow channels with transparent spreads and instant local banking clearance.</span>
            </div>
          </div>

          {/* Graphical/Statistical Bento Grid */}
          <div id="hero-stats-bento" className="lg:col-span-5 grid grid-cols-2 gap-3.5 sm:gap-4">
            
            {/* Bento Block 1: Daily volume with asset distribution mini-bar (Spans 2 cols) */}
            <div id="bento-volume-card" className="col-span-2 bg-neutral-900/70 border border-neutral-800/90 rounded-2xl p-5 hover:border-gold/30 hover:bg-neutral-900/90 transition-all duration-300 relative overflow-hidden backdrop-blur-sm group shadow-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs font-medium text-neutral-400">24h Swaps Cleared</span>
                  </div>
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight font-mono">$4.84M</span>
                    <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                      +18.4%
                    </span>
                  </div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold group-hover:scale-105 transition-transform shrink-0">
                  <Coins className="h-5 w-5" />
                </div>
              </div>

              {/* Asset Distribution Breakdown Bar */}
              <div className="mt-4 pt-3.5 border-t border-neutral-800/80">
                <div className="flex justify-between items-center text-[11px] mb-2">
                  <span className="font-medium text-neutral-300">Volume by Asset</span>
                  <span className="font-mono text-neutral-400">72% USDT • 20% MVR • 8% USD</span>
                </div>
                <div className="h-2 w-full bg-neutral-950 rounded-full overflow-hidden flex gap-0.5 p-0.5 border border-neutral-800">
                  <div className="h-full bg-gold rounded-l-full" style={{ width: '72%' }} title="USDT (72%)" />
                  <div className="h-full bg-emerald-400" style={{ width: '20%' }} title="MVR (20%)" />
                  <div className="h-full bg-sky-400 rounded-r-full" style={{ width: '8%' }} title="USD (8%)" />
                </div>
              </div>
            </div>

            {/* Bento Block 2: Settlement speed (Col 1) */}
            <div id="bento-speed-card" className="col-span-1 bg-neutral-900/70 border border-neutral-800/90 rounded-2xl p-4 sm:p-5 hover:border-emerald-500/30 hover:bg-neutral-900/90 transition-all duration-300 backdrop-blur-sm group shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                    <Zap className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    Fast Rail
                  </span>
                </div>
                <span className="block text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-mono">&lt;10 min</span>
                <span className="text-xs font-semibold text-neutral-300 block mt-1">Settlement Speed</span>
              </div>
              <div className="mt-3 pt-2.5 border-t border-neutral-800/80 text-[11px] text-neutral-400 leading-snug">
                Avg <span className="text-emerald-400 font-semibold font-mono">4.2 min</span> today via BML & MIB
              </div>
            </div>

            {/* Bento Block 3: Zero price slippage (Col 1) */}
            <div id="bento-slippage-card" className="col-span-1 bg-neutral-900/70 border border-neutral-800/90 rounded-2xl p-4 sm:p-5 hover:border-gold/30 hover:bg-neutral-900/90 transition-all duration-300 backdrop-blur-sm group shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="h-9 w-9 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold group-hover:scale-105 transition-transform">
                    <Lock className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-gold bg-gold/10 border border-gold/20 px-2 py-0.5 rounded-full">
                    Guaranteed
                  </span>
                </div>
                <span className="block text-2xl sm:text-3xl font-extrabold text-gold tracking-tight font-mono">0.00%</span>
                <span className="text-xs font-semibold text-neutral-300 block mt-1">Price Slippage</span>
              </div>
              <div className="mt-3 pt-2.5 border-t border-neutral-800/80 text-[11px] text-neutral-400 leading-snug">
                Exact quote locked at escrow initiation
              </div>
            </div>

            {/* Bento Block 4: Liquidity Pool & Verified Clients (Spans 2 cols) */}
            <div id="bento-liquidity-card" className="col-span-2 bg-neutral-900/70 border border-neutral-800/90 rounded-2xl p-5 hover:border-gold/30 hover:bg-neutral-900/90 transition-all duration-300 backdrop-blur-sm group shadow-xl">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Landmark className="h-4 w-4 text-gold" />
                    <span className="text-xs text-neutral-400 font-medium">Reserve Depth</span>
                  </div>
                  <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono block">$14.5M</span>
                  <span className="text-[11px] text-neutral-400 mt-0.5 block">Instant cold & hot vaults</span>
                </div>

                <div className="border-l border-neutral-800/80 pl-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-4 w-4 text-sky-400" />
                    <span className="text-xs text-neutral-400 font-medium">Verified Traders</span>
                  </div>
                  <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono block">14,200+</span>
                  <span className="text-[11px] text-neutral-400 mt-0.5 block">Maldives & Global Desk</span>
                </div>
              </div>

              {/* Supported payment rails */}
              <div className="mt-4 pt-3 border-t border-neutral-800/80 flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="text-[10px] text-neutral-400 font-medium mr-1">Direct Clearance:</span>
                <span className="text-[11px] font-semibold text-neutral-300 bg-neutral-950 px-2.5 py-1 rounded-lg border border-neutral-800">
                  Bank of Maldives (BML)
                </span>
                <span className="text-[11px] font-semibold text-neutral-300 bg-neutral-950 px-2.5 py-1 rounded-lg border border-neutral-800">
                  Maldives Islamic Bank (MIB)
                </span>
                <span className="text-[11px] font-semibold text-gold bg-gold/10 px-2.5 py-1 rounded-lg border border-gold/20">
                  USDT (TRC-20 / ERC-20)
                </span>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
