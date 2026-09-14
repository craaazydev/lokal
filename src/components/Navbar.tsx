/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UserProfile } from '../types';
import { LogOut, Shield, Award, Sparkles, User, Coins, LogIn } from 'lucide-react';

interface NavbarProps {
  userProfile: UserProfile | null;
  onLogout: () => void;
  onOpenAuth: () => void;
  onOpenKYC: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Navbar({
  userProfile,
  onLogout,
  onOpenAuth,
  onOpenKYC,
  activeTab,
  setActiveTab,
}: NavbarProps) {
  return (
    <nav id="app-navbar" className="sticky top-0 z-40 w-full border-b border-neutral-800/70 bg-neutral-950/80 backdrop-blur-xl transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer select-none group" onClick={() => setActiveTab('home')}>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#E5C158] to-[#B38F24] shadow-sm shadow-gold/20 transition-transform group-hover:scale-105">
              <span className="text-neutral-950 font-extrabold text-lg tracking-tight">L</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5 leading-none">
                <span className="font-sans text-xl font-bold tracking-tight text-white">
                  LOKAL<span className="text-gold font-bold">MV</span>
                </span>
                <span className="text-[9px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full">
                  OTC
                </span>
              </div>
              <span className="block text-[9px] text-neutral-400 font-normal mt-0.5 tracking-normal">
                Cryptocurrency & Escrow Desk
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1.5 bg-neutral-900/60 p-1 rounded-xl border border-neutral-800/80">
            <button
              id="nav-btn-home"
              onClick={() => setActiveTab('home')}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                activeTab === 'home' || activeTab === 'rates' || activeTab === 'trade'
                  ? 'text-white bg-neutral-800 shadow-sm border border-neutral-700/50'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Exchange Desk
            </button>
            {userProfile && (
              <button
                id="nav-btn-profile"
                onClick={() => setActiveTab('profile')}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  activeTab === 'profile'
                    ? 'text-white bg-neutral-800 shadow-sm border border-neutral-700/50'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
              >
                My Portfolio
              </button>
            )}
            {userProfile?.role === 'admin' && (
              <button
                id="nav-btn-admin"
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  activeTab === 'admin'
                    ? 'text-rose-300 bg-rose-950/40 border border-rose-800/50 shadow-sm'
                    : 'text-rose-400/90 hover:text-rose-300 hover:bg-rose-950/20'
                }`}
              >
                <Shield className="h-3.5 w-3.5 text-rose-400" />
                Admin Room
              </button>
            )}
          </div>

          {/* Authentication & User Status */}
          <div className="flex items-center gap-2.5">
            {userProfile ? (
              <div className="flex items-center gap-2.5">
                {/* KYC Badge */}
                <button
                  id="kyc-badge-btn"
                  onClick={onOpenKYC}
                  className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-lg cursor-pointer transition-all hover:brightness-110 border ${
                    userProfile.kycStatus === 'approved'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                      : userProfile.kycStatus === 'pending'
                      ? 'border-gold/30 bg-gold/10 text-gold animate-pulse'
                      : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                  }`}
                >
                  <Award className="h-3 w-3" />
                  KYC: {userProfile.kycStatus === 'approved' ? 'Verified' : userProfile.kycStatus === 'pending' ? 'Reviewing' : 'Unverified'}
                </button>

                {/* User Info Capsule */}
                <div className="flex items-center gap-2 border border-neutral-800 bg-neutral-900/90 px-2.5 py-1.5 rounded-lg font-sans">
                  <div className="h-5 w-5 rounded-full bg-gold/15 flex items-center justify-center">
                    <User className="h-3 w-3 text-gold" />
                  </div>
                  <div className="hidden sm:block text-left leading-tight">
                    <span className="block text-xs font-semibold text-neutral-200">
                      {userProfile.displayName || `@${userProfile.telegramUsername}`}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-normal capitalize">
                      {userProfile.role}
                    </span>
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  id="navbar-btn-logout"
                  onClick={onLogout}
                  className="p-2 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-neutral-900 transition-colors cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                id="navbar-btn-auth"
                onClick={onOpenAuth}
                className="flex items-center gap-2 bg-gradient-to-r from-gold to-[#B8942A] hover:brightness-110 text-neutral-950 px-4 py-2 rounded-lg text-xs font-semibold shadow-sm shadow-gold/20 transition-all cursor-pointer active:scale-98"
              >
                <LogIn className="w-3.5 h-3.5 shrink-0" />
                <span>Sign In with Account</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
