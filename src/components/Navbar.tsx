/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { LogOut, Shield, Award, Sparkles, User, Coins, LogIn, Menu, X, ChevronRight, Wallet } from 'lucide-react';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on tab switch
  const handleNavClick = (tab: string) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  // Close mobile menu when screen resizes to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    if (mobileMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  return (
    <nav id="app-navbar" className="sticky top-0 z-40 w-full border-b border-neutral-800/70 bg-neutral-950/90 backdrop-blur-xl transition-colors">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div
            id="navbar-logo-btn"
            className="flex items-center gap-3 cursor-pointer select-none group"
            onClick={() => handleNavClick('home')}
          >
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

          {/* Desktop Navigation Links */}
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

          {/* Desktop Right Side (Auth & Status) */}
          <div className="hidden md:flex items-center gap-2.5">
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
                  <div className="text-left leading-tight">
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

          {/* Mobile Right Controls: Compact status & Hamburger Button */}
          <div className="flex md:hidden items-center gap-2">
            {userProfile && (
              <button
                id="mobile-nav-kyc-indicator"
                onClick={onOpenKYC}
                className={`flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-lg border transition-all cursor-pointer ${
                  userProfile.kycStatus === 'approved'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : userProfile.kycStatus === 'pending'
                    ? 'border-gold/30 bg-gold/10 text-gold animate-pulse'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                }`}
                title="KYC Status"
              >
                <Award className="h-3 w-3" />
                <span>{userProfile.kycStatus === 'approved' ? 'KYC' : userProfile.kycStatus === 'pending' ? 'Pending' : 'No KYC'}</span>
              </button>
            )}

            {!userProfile && (
              <button
                id="mobile-quick-auth-btn"
                onClick={onOpenAuth}
                className="flex items-center gap-1 bg-gold text-neutral-950 px-2.5 py-1.5 rounded-lg text-[11px] font-bold shadow-sm cursor-pointer"
              >
                <LogIn className="h-3 w-3" />
                <span>Sign In</span>
              </button>
            )}

            {/* Hamburger Toggle Button */}
            <button
              id="navbar-hamburger-btn"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-200 hover:text-white hover:bg-neutral-800/80 transition-colors cursor-pointer"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5 text-gold transition-transform duration-200" />
              ) : (
                <Menu className="h-5 w-5 transition-transform duration-200" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown Panel */}
      {mobileMenuOpen && (
        <div
          id="navbar-mobile-drawer"
          className="md:hidden border-t border-neutral-800/80 bg-neutral-950/98 backdrop-blur-2xl px-4 pt-3 pb-6 shadow-2xl transition-all animate-in fade-in slide-in-from-top-3 duration-200"
        >
          {/* Navigation Links */}
          <div className="space-y-1.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 px-3 py-1">
              Navigation
            </span>

            {/* Exchange Desk */}
            <button
              id="mobile-nav-home-btn"
              onClick={() => handleNavClick('home')}
              className={`w-full flex items-center justify-between min-h-[44px] px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'home' || activeTab === 'rates' || activeTab === 'trade'
                  ? 'bg-gold/15 text-gold border border-gold/30 shadow-sm'
                  : 'bg-neutral-900/50 text-neutral-300 hover:bg-neutral-800/60 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Coins className={`h-4 w-4 ${activeTab === 'home' ? 'text-gold' : 'text-neutral-400'}`} />
                <span>Exchange Desk</span>
              </div>
              <ChevronRight className="h-4 w-4 opacity-40" />
            </button>

            {/* My Portfolio (if logged in) */}
            {userProfile && (
              <button
                id="mobile-nav-profile-btn"
                onClick={() => handleNavClick('profile')}
                className={`w-full flex items-center justify-between min-h-[44px] px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'profile'
                    ? 'bg-gold/15 text-gold border border-gold/30 shadow-sm'
                    : 'bg-neutral-900/50 text-neutral-300 hover:bg-neutral-800/60 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Wallet className={`h-4 w-4 ${activeTab === 'profile' ? 'text-gold' : 'text-neutral-400'}`} />
                  <span>My Portfolio & Orders</span>
                </div>
                <ChevronRight className="h-4 w-4 opacity-40" />
              </button>
            )}

            {/* Admin Room (if admin) */}
            {userProfile?.role === 'admin' && (
              <button
                id="mobile-nav-admin-btn"
                onClick={() => handleNavClick('admin')}
                className={`w-full flex items-center justify-between min-h-[44px] px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-rose-950/50 text-rose-300 border border-rose-800/60 shadow-sm'
                    : 'bg-rose-950/20 text-rose-400 hover:bg-rose-950/30 border border-rose-900/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-rose-400" />
                  <span>Admin Room</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Control
                </span>
              </button>
            )}
          </div>

          {/* User Account Section */}
          <div className="mt-4 pt-4 border-t border-neutral-800/80 space-y-2.5">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-neutral-500 px-3">
              Account & Security
            </span>

            {userProfile ? (
              <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-gold/15 border border-gold/20 flex items-center justify-center text-gold">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-white">
                        {userProfile.displayName || `@${userProfile.telegramUsername}`}
                      </span>
                      <span className="text-[10px] text-neutral-400 block capitalize">
                        Role: <strong className="text-neutral-200">{userProfile.role}</strong>
                      </span>
                    </div>
                  </div>

                  <button
                    id="mobile-drawer-kyc-btn"
                    onClick={() => {
                      onOpenKYC();
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold rounded-lg border transition-all cursor-pointer ${
                      userProfile.kycStatus === 'approved'
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        : userProfile.kycStatus === 'pending'
                        ? 'border-gold/30 bg-gold/10 text-gold'
                        : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                    }`}
                  >
                    <Award className="h-3 w-3" />
                    <span>{userProfile.kycStatus === 'approved' ? 'Verified' : userProfile.kycStatus === 'pending' ? 'Reviewing' : 'Verify KYC'}</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between gap-2">
                  <button
                    id="mobile-drawer-profile-shortcut"
                    onClick={() => handleNavClick('profile')}
                    className="flex-1 min-h-[44px] flex items-center justify-center gap-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold px-3 py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    <User className="h-3.5 w-3.5" />
                    <span>View Profile</span>
                  </button>

                  <button
                    id="mobile-drawer-logout-btn"
                    onClick={() => {
                      onLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="min-h-[44px] flex items-center justify-center gap-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/25 text-xs font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                id="mobile-drawer-signin-btn"
                onClick={() => {
                  onOpenAuth();
                  setMobileMenuOpen(false);
                }}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 bg-gradient-to-r from-gold to-[#B8942A] hover:brightness-110 text-neutral-950 font-bold px-4 py-2.5 rounded-xl text-xs shadow-md shadow-gold/15 cursor-pointer active:scale-98 transition-all"
              >
                <LogIn className="h-4 w-4 shrink-0" />
                <span>Sign In or Create Account</span>
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

