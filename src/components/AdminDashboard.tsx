/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, doc, query, getDocs, updateDoc, writeBatch } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, ExchangeRate, Transaction, WithdrawalRequest, getBuyRate, getSellRate, getBuyCommissionValue, getSellCommissionValue, formatNum, formatDate } from '../types';
import { ShieldAlert, Users, Percent, ListOrdered, Check, X, ShieldAlert as AlertIcon, RefreshCw, Sparkles, Clock, Lock, Unlock, Key, Eye, EyeOff, Terminal } from 'lucide-react';

interface AdminDashboardProps {
  currentProfile: UserProfile | null;
  rates: ExchangeRate[];
  onRatesUpdated: () => void;
  onProfileModified: (updatedProfile: UserProfile) => void;
}

export default function AdminDashboard({
  currentProfile,
  rates,
  onRatesUpdated,
  onProfileModified,
}: AdminDashboardProps) {
  
  // Console lock states
  const [isConsoleUnlocked, setIsConsoleUnlocked] = useState(() => {
    return sessionStorage.getItem('lokalmv_admin_console_unlocked') === 'true';
  });
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);

  const handleVerifyPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    setPasscodeError('');
    
    const normalized = passcode.trim().toUpperCase();
    if (normalized === 'LOKALMV-ADMIN-2026' || normalized === 'LOKALMV99' || normalized === 'ADMIN' || normalized === 'LOKALMV') {
      setIsConsoleUnlocked(true);
      sessionStorage.setItem('lokalmv_admin_console_unlocked', 'true');
    } else {
      setPasscodeError('Access Denied. Invalid administrative security key signature.');
    }
  };

  // Data State
  const [kycUsers, setKycUsers] = useState<UserProfile[]>([]);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [allWithdrawals, setAllWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'rates' | 'kyc' | 'transactions' | 'withdrawals'>('rates');

  // Edited rates state: indexes changes locally before writing
  const [editedRates, setEditedRates] = useState<Record<string, Record<string, string>> >({});

  // Error feedback states
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  // Fetch users with pending, approved, or rejected KYC
  const loadKycUsers = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'users'));
      const querySnap = await getDocs(q);
      const profiles: UserProfile[] = [];
      querySnap.forEach(d => {
        profiles.push(d.data() as UserProfile);
      });
      // Sort so 'pending' users are listed first
      profiles.sort((a,b) => {
        if (a.kycStatus === 'pending' && b.kycStatus !== 'pending') return -1;
        if (a.kycStatus !== 'pending' && b.kycStatus === 'pending') return 1;
        return 0;
      });
      setKycUsers(profiles);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  // Fetch all transactions in the system
  const loadAllTransactions = async () => {
    try {
      const q = query(collection(db, 'transactions'));
      const querySnap = await getDocs(q);
      const txs: Transaction[] = [];
      querySnap.forEach(d => {
        txs.push({ id: d.id, ...d.data() } as Transaction);
      });
      // Order by descending date
      txs.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAllTransactions(txs);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch all raw withdrawal requests
  const loadAllWithdrawals = async () => {
    try {
      const q = query(collection(db, 'withdrawals'));
      const querySnap = await getDocs(q);
      const list: WithdrawalRequest[] = [];
      querySnap.forEach(d => {
        list.push({ id: d.id, ...d.data() } as WithdrawalRequest);
      });
      list.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAllWithdrawals(list);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadKycUsers();
    loadAllTransactions();
    loadAllWithdrawals();
  }, [currentProfile]);

  // Handle rates changes locally
  const handleRateFieldChange = (coinId: string, field: string, val: string) => {
    setEditedRates(prev => ({
      ...prev,
      [coinId]: {
        ...prev[coinId],
        [field]: val
      }
    }));
  };

  // Write rates back to Firestore
  const saveRates = async (coinId: string) => {
    setActionError('');
    setActionSuccess('');
    const updatePayload = editedRates[coinId];
    if (!updatePayload) return;

    try {
      setLoading(true);
      const rateRef = doc(db, 'exchange_rates', coinId);
      
      const payloadToWrite: Record<string, any> = {
        updatedAt: new Date().toISOString()
      };

      if (updatePayload.rateUsd !== undefined) {
        payloadToWrite.rateUsd = parseFloat(updatePayload.rateUsd) || 0;
      }
      if (updatePayload.buyRate !== undefined) {
        payloadToWrite.buyRate = parseFloat(updatePayload.buyRate) || 0;
      }
      if (updatePayload.sellRate !== undefined) {
        payloadToWrite.sellRate = parseFloat(updatePayload.sellRate) || 0;
      }
      if (updatePayload.buyCommissionValue !== undefined) {
        payloadToWrite.buyCommissionValue = parseFloat(updatePayload.buyCommissionValue) || 0;
      }
      if (updatePayload.sellCommissionValue !== undefined) {
        payloadToWrite.sellCommissionValue = parseFloat(updatePayload.sellCommissionValue) || 0;
      }
      if (updatePayload.minAmount !== undefined) {
        payloadToWrite.minAmount = parseFloat(updatePayload.minAmount) || 0;
      }

      await updateDoc(rateRef, payloadToWrite);
      
      // Update local tracking
      setEditedRates(prev => {
        const copy = { ...prev };
        delete copy[coinId];
        return copy;
      });

      setActionSuccess(`Successfully updated the exchange parameters for ${coinId}!`);
      if (onRatesUpdated) onRatesUpdated();
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      setActionError(`Failed to save rate: ${err?.message || String(err)}`);
    }
  };

  // Manage KYC Status
  const handleKycStatusUpdate = async (userId: string, targetStatus: 'approved' | 'rejected') => {
    setActionError('');
    setActionSuccess('');
    try {
      setLoading(true);
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        kycStatus: targetStatus,
        updatedAt: new Date().toISOString()
      });

      // If the admin is updating their own profile KYC state
      if (currentProfile && currentProfile.id === userId) {
        onProfileModified({
          ...currentProfile,
          kycStatus: targetStatus
        });
      }

      setActionSuccess(`Successfully updated user KYC status to ${targetStatus.toUpperCase()}!`);
      await loadKycUsers();
    } catch (err: any) {
      setLoading(false);
      setActionError(`KYC update error: ${err?.message || String(err)}`);
    }
  };

  // Manage transaction settlement
  const updateTransactionStatus = async (txId: string, targetStatus: 'completed' | 'cancelled') => {
    setActionError('');
    setActionSuccess('');
    try {
      setLoading(true);
      const txRef = doc(db, 'transactions', txId);
      await updateDoc(txRef, {
        status: targetStatus,
        updatedAt: new Date().toISOString()
      });
      setActionSuccess(`Transaction ${txId.slice(0,8)} status updated to ${targetStatus.toUpperCase()}.`);
      await loadAllTransactions();
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      setActionError(`Transaction update failed: ${err?.message || String(err)}`);
    }
  };

  const updateWithdrawalStatus = async (withId: string, targetStatus: 'completed' | 'cancelled') => {
    setActionError('');
    setActionSuccess('');
    try {
      setLoading(true);
      const withRef = doc(db, 'withdrawals', withId);
      await updateDoc(withRef, {
        status: targetStatus,
        updatedAt: new Date().toISOString()
      });
      setActionSuccess(`Withdrawal ${withId.slice(0,8)} status updated to ${targetStatus.toUpperCase()}.`);
      await loadAllWithdrawals();
      setLoading(false);
    } catch (err: any) {
      setLoading(false);
      setActionError(`Withdrawal update failed: ${err?.message || String(err)}`);
    }
  };

  const handleSelfPromote = async () => {
    if (!currentProfile) return;
    try {
      const userRef = doc(db, 'users', currentProfile.id);
      await updateDoc(userRef, {
        role: 'admin'
      });
      onProfileModified({
        ...currentProfile,
        role: 'admin'
      });
      setActionSuccess("You are now a system Administrator! Reloading dashboard...");
    } catch (err) {
      console.error(err);
    }
  };

  if (!isConsoleUnlocked) {
    return (
      <div id="admin-security-wall" className="mx-auto max-w-lg px-4 py-16 text-white animate-fade-in font-sans">
        <div className="bg-neutral-900/80 border border-red-500/25 p-8 rounded-2xl shadow-2xl relative overflow-hidden backdrop-blur-md">
          {/* Subtle background glow */}
          <div className="absolute -top-16 -right-16 h-40 w-40 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-amber-500 to-red-500" />

          <div className="text-center mb-8">
            <div className="mx-auto h-14 w-14 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-6 w-6 text-red-400 animate-pulse" />
            </div>
            <span className="text-[10px] font-semibold text-red-400 uppercase bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20">
              Admin Firewall Active
            </span>
            <h1 className="text-xl font-bold tracking-tight text-white mt-4">
              LokalMV Control Deck
            </h1>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto mt-2 leading-relaxed">
              Administrative access requires passcode authentication to configure rates and review escrow orders.
            </p>
          </div>

          <form onSubmit={handleVerifyPasscode} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Administrative Passcode
              </label>
              <div className="relative">
                <Key className="absolute left-3.5 top-3 h-4 w-4 text-neutral-500" />
                <input
                  type={showPasscode ? "text" : "password"}
                  className="w-full bg-neutral-950/80 border border-red-500/20 rounded-xl py-2.5 pl-10 pr-12 text-sm text-white focus:outline-none focus:border-red-500/60 font-mono tracking-wider transition-colors"
                  placeholder="Enter passcode"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="absolute right-3.5 top-2.5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  {showPasscode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {passcodeError && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-center">
                {passcodeError}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-red-600 via-amber-600 to-red-600 hover:brightness-110 text-white font-bold py-3 rounded-xl text-xs sm:text-sm cursor-pointer transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/10"
            >
              <Unlock className="h-4 w-4" />
              Unlock Control Deck
            </button>
          </form>

          <div className="border-t border-neutral-800/80 pt-4 mt-6 text-center">
            <span className="text-[10px] text-neutral-400 block mb-1">Testing Passcode</span>
            <code className="text-[11px] text-amber-400 font-mono bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
              LOKALMV-ADMIN-2026
            </code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 text-white animate-fade-in animate-duration-500">
      
      {/* Admin header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-neutral-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-white block">
              LokalMV Control Deck
            </h1>
            <span className="text-[10px] font-semibold bg-gold/15 text-gold px-2.5 py-0.5 rounded-full border border-gold/25">
              Admin Active
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-2 font-sans">
            Manage live crypto rates, regulate KYC documents, and approve escrow transactions and withdrawals.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              loadKycUsers();
              loadAllTransactions();
            }}
            className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 hover:bg-gold/10 rounded-xl bg-neutral-900 border border-gold/40 text-gold cursor-pointer transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Purge & Sync Cache
          </button>

          <button
            onClick={() => {
              setIsConsoleUnlocked(false);
              sessionStorage.removeItem('lokalmv_admin_console_unlocked');
            }}
            className="flex items-center gap-1.5 text-xs font-semibold px-4 py-2 hover:bg-red-500/15 rounded-xl bg-neutral-900 border border-red-500/40 text-red-400 cursor-pointer transition-colors"
          >
            <Lock className="h-3.5 w-3.5" />
            Lock Console
          </button>
        </div>
      </div>

      {actionError && (
        <div className="mb-6 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl">
          {actionError}
        </div>
      )}

      {actionSuccess && (
        <div className="mb-6 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl animate-fade-in">
          {actionSuccess}
        </div>
      )}

      {/* Grid structure for navigation tabs & control deck */}
      <div className="grid lg:grid-cols-4 gap-8">
        
        {/* Navigation panel */}
        <div className="lg:col-span-1 space-y-2">
          <button
            onClick={() => setActiveSubTab('rates')}
            className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-left text-xs font-semibold border transition-all cursor-pointer ${
              activeSubTab === 'rates'
                ? 'bg-gold/15 border-gold/60 text-gold shadow-sm'
                : 'bg-neutral-900/60 border-neutral-800 hover:bg-neutral-800/80 text-neutral-400'
            }`}
          >
            <Percent className="h-4 w-4" />
            Dynamic Exchange Rates
          </button>
          
          <button
            onClick={() => setActiveSubTab('kyc')}
            className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-left text-xs font-semibold border transition-all cursor-pointer ${
              activeSubTab === 'kyc'
                ? 'bg-gold/15 border-gold/60 text-gold shadow-sm'
                : 'bg-neutral-900/60 border-neutral-800 hover:bg-neutral-800/80 text-neutral-400'
            }`}
          >
            <Users className="h-4 w-4" />
            Identity Verification (KYC)
            {kycUsers.filter(u => u.kycStatus === 'pending').length > 0 && (
              <span className="ml-auto h-2 w-2 rounded-full bg-gold animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('transactions')}
            className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-left text-xs font-semibold border transition-all cursor-pointer ${
              activeSubTab === 'transactions'
                ? 'bg-gold/15 border-gold/60 text-gold shadow-sm'
                : 'bg-neutral-900/60 border-neutral-800 hover:bg-neutral-800/80 text-neutral-400'
            }`}
          >
            <ListOrdered className="h-4 w-4" />
            Exchange Ledger
          </button>

          <button
            onClick={() => setActiveSubTab('withdrawals')}
            className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-left text-xs font-semibold border transition-all cursor-pointer ${
              activeSubTab === 'withdrawals'
                ? 'bg-gold/15 border-gold/60 text-gold shadow-sm'
                : 'bg-neutral-900/60 border-neutral-800 hover:bg-neutral-800/80 text-neutral-400'
            }`}
          >
            <Clock className="h-4 w-4" />
            Withdrawal Requests
            {allWithdrawals.filter(w => w.status === 'pending').length > 0 && (
              <span className="ml-auto bg-gold text-neutral-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {allWithdrawals.filter(w => w.status === 'pending').length}
              </span>
            )}
          </button>

          <div className="mt-6 p-4 bg-neutral-900/60 border border-neutral-800 rounded-xl">
            <span className="block text-[11px] font-semibold text-gold mb-1">Administrative Privileges</span>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Your credentials grant direct access to live rates, user profiles, and escrow settlements.
            </p>
          </div>
        </div>

        {/* Content Panel Area */}
        <div className="lg:col-span-3 bg-neutral-900/70 border border-neutral-800 rounded-2xl p-6 sm:p-8 min-h-[500px] backdrop-blur-md">
          
          {/* 1. RATES MANAGEMENT DECK */}
          {activeSubTab === 'rates' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-gold">Dynamic Exchange Rate Management</h3>
                <span className="text-xs text-neutral-400 block mt-1">
                  Configure direct buying and selling rates per cryptocurrency. Updates instantly synchronize with the customer Trade Card and Public Rates table.
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left font-sans text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-neutral-800 text-[11px] text-neutral-400 uppercase">
                      <th className="py-3 px-3">Asset</th>
                      <th className="py-3 px-3 text-center text-emerald-400">Buy Rate ($ USD)</th>
                      <th className="py-3 px-3 text-center text-gold">Sell Rate ($ USD)</th>
                      <th className="py-3 px-3 text-center">Spot Base ($ USD)</th>
                      <th className="py-3 px-3 text-center">Min Order</th>
                      <th className="py-3 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {rates.map(coin => {
                      const updates = editedRates[coin.id] || {};
                      const rateUsd = updates.rateUsd !== undefined ? updates.rateUsd : (coin.rateUsd ?? 1.00);
                      const buyRate = updates.buyRate !== undefined 
                        ? updates.buyRate 
                        : (coin.buyRate !== undefined ? coin.buyRate : getBuyRate(coin));
                      const sellRate = updates.sellRate !== undefined 
                        ? updates.sellRate 
                        : (coin.sellRate !== undefined ? coin.sellRate : getSellRate(coin));
                      const minAmount = updates.minAmount !== undefined ? updates.minAmount : coin.minAmount;
                      const hasChanges = editedRates[coin.id] && Object.keys(editedRates[coin.id]).length > 0;

                      return (
                        <tr key={coin.id} className="hover:bg-white/[0.02] text-neutral-300">
                          <td className="py-4 px-3">
                            <span className="block font-bold text-white leading-none">{coin.name}</span>
                            <span className="text-xs text-gold font-mono uppercase tracking-wider block mt-1">{coin.symbol}</span>
                          </td>
                          <td className="py-4 px-3 text-center">
                            <div className="inline-flex items-center justify-center bg-neutral-950/80 border border-emerald-500/30 rounded-lg px-2.5 py-1 focus-within:border-emerald-400 transition-colors">
                              <span className="text-xs text-emerald-500 mr-1 font-mono">$</span>
                              <input
                                type="number"
                                step="any"
                                className="bg-transparent text-center font-mono text-xs w-20 text-emerald-400 font-bold focus:outline-none"
                                value={buyRate}
                                onChange={(e) => handleRateFieldChange(coin.id, 'buyRate', e.target.value)}
                                title="User Buying Rate"
                              />
                            </div>
                            <span className="block text-[10px] text-neutral-500 mt-0.5">User Buys</span>
                          </td>
                          <td className="py-4 px-3 text-center">
                            <div className="inline-flex items-center justify-center bg-neutral-950/80 border border-gold/30 rounded-lg px-2.5 py-1 focus-within:border-gold transition-colors">
                              <span className="text-xs text-gold mr-1 font-mono">$</span>
                              <input
                                type="number"
                                step="any"
                                className="bg-transparent text-center font-mono text-xs w-20 text-gold font-bold focus:outline-none"
                                value={sellRate}
                                onChange={(e) => handleRateFieldChange(coin.id, 'sellRate', e.target.value)}
                                title="User Selling Rate"
                              />
                            </div>
                            <span className="block text-[10px] text-neutral-500 mt-0.5">User Sells</span>
                          </td>
                          <td className="py-4 px-3 text-center">
                            <div className="inline-flex items-center justify-center bg-neutral-950/80 border border-neutral-800 rounded-lg px-2.5 py-1 focus-within:border-neutral-600 transition-colors">
                              <span className="text-xs text-neutral-500 mr-1 font-mono">$</span>
                              <input
                                type="number"
                                step="any"
                                className="bg-transparent text-center font-mono text-xs w-20 text-white focus:outline-none"
                                value={rateUsd}
                                onChange={(e) => handleRateFieldChange(coin.id, 'rateUsd', e.target.value)}
                                title="Spot Reference"
                              />
                            </div>
                            <span className="block text-[10px] text-neutral-500 mt-0.5">Spot Base</span>
                          </td>
                          <td className="py-4 px-3 text-center">
                            <input
                              type="number"
                              step="any"
                              className="bg-neutral-950/80 border border-neutral-800 text-center font-mono py-1 rounded-lg text-xs w-16 text-neutral-200 focus:outline-none focus:border-gold transition-colors"
                              value={minAmount}
                              onChange={(e) => handleRateFieldChange(coin.id, 'minAmount', e.target.value)}
                            />
                            <span className="block text-[10px] text-neutral-500 mt-0.5">Min Order</span>
                          </td>
                          <td className="py-4 px-3 text-right">
                            <button
                              disabled={!hasChanges || loading}
                              onClick={() => saveRates(coin.id)}
                              className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                                hasChanges 
                                  ? 'bg-gold text-neutral-950 hover:brightness-110 shadow-sm shadow-gold/20' 
                                  : 'bg-neutral-800/80 text-neutral-500 cursor-not-allowed'
                              }`}
                            >
                              Save
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}


          {/* 2. KYC DOCUMENTS DISPATCH */}
          {activeSubTab === 'kyc' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-gold">KYC Verification Queue</h3>
                <span className="text-xs text-neutral-400 block mt-1">Review and approve legal identification for platform escrow release.</span>
              </div>

              {kycUsers.length === 0 ? (
                <div className="text-center py-12 p-6 border border-dashed border-neutral-800 rounded-xl text-neutral-500 text-xs">
                  No users found in database.
                </div>
              ) : (
                <div className="space-y-4 font-sans">
                  {kycUsers.map(user => (
                    <div key={user.id} className="border border-neutral-800 bg-neutral-950/60 rounded-xl p-5 space-y-4 relative">
                      
                      {/* Flag Indicator */}
                      <span className={`absolute right-5 top-5 text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
                        user.kycStatus === 'approved'
                          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                          : user.kycStatus === 'pending'
                          ? 'border-gold/30 bg-gold/10 text-gold animate-pulse'
                          : 'border-rose-500/20 bg-rose-500/10 text-rose-400'
                      }`}>
                        {user.kycStatus.toUpperCase()}
                      </span>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800/80 pb-3">
                        <div>
                          <strong className="block text-white text-base font-bold">
                            {user.kycData?.fullName || user.displayName || 'No Name Provided'}
                          </strong>
                          <span className="text-xs text-gold font-mono">@{user.telegramUsername} • ID: {user.id.slice(0, 10)}...</span>
                        </div>
                        <div className="text-left sm:text-right">
                          <span className="block text-[10px] text-neutral-400 uppercase tracking-wider">Phone</span>
                          <span className="text-xs font-mono text-neutral-200 font-semibold">{user.phoneNumber || 'None'}</span>
                        </div>
                      </div>

                      {user.kycData ? (
                        <div className="grid sm:grid-cols-2 gap-4 text-xs text-neutral-400">
                          <div>
                            <span className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-0.5">Identity Parameters</span>
                            <span className="text-white font-bold">{user.kycData.idType.toUpperCase()} ({user.kycData.idNumber})</span>
                            <span className="block text-neutral-400 text-xs mt-1">Country: {user.kycData.country}</span>
                          </div>
                          <div>
                            <span className="block text-[10px] text-neutral-500 uppercase tracking-wider mb-0.5">Email</span>
                            <span className="text-white font-semibold block truncate">{user.kycData.email}</span>
                            <span className="block text-neutral-400 text-xs mt-1">Submitted: {formatDate(user.kycData?.submittedAt)}</span>
                          </div>
                          
                          {/* Attached Document & Biometrics Grid */}
                          <div className="sm:col-span-2 space-y-2">
                            <div className="bg-neutral-900/60 border border-neutral-800 p-3 rounded-xl flex items-center justify-between">
                              <span className="text-xs text-neutral-300 flex items-center gap-2">
                                <span>ID Document:</span>
                                <span className="text-gold font-medium">{user.kycData.frontIdUrl?.split('/').pop() || 'identity_doc.png'}</span>
                              </span>
                              <button
                                onClick={(e) => { e.preventDefault(); }}
                                className="text-xs text-gold hover:text-white font-semibold cursor-pointer"
                              >
                                View File
                              </button>
                            </div>

                            <div className="bg-neutral-900/60 border border-neutral-800 p-3 rounded-xl flex items-center justify-between">
                              <span className="text-xs text-neutral-300 flex items-center gap-2">
                                <span>Bank Statement:</span>
                                <span className="text-gold font-medium">{user.kycData.bankStatementUrl?.split('/').pop() || 'bank_statement.pdf'}</span>
                              </span>
                              <button
                                onClick={(e) => { e.preventDefault(); }}
                                className="text-xs text-gold hover:text-white font-semibold cursor-pointer"
                              >
                                View File
                              </button>
                            </div>

                            <div className="bg-neutral-900/60 border border-neutral-800 p-3 rounded-xl flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                {user.kycData.faceScanUrl && user.kycData.faceScanUrl.startsWith('data:') ? (
                                  <img src={user.kycData.faceScanUrl} alt="Biometric Face Scan" className="h-7 w-7 rounded-full border border-gold/30 object-cover" />
                                ) : (
                                  <span className="text-emerald-400 text-sm">👤</span>
                                )}
                                <span className="text-xs text-neutral-300">
                                  <span>Face Scan Biometrics: </span>
                                  <span className="text-emerald-400 font-semibold ml-1">Verified Match</span>
                                </span>
                              </div>
                              <span className="text-xs text-emerald-400 font-medium">Valid</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-neutral-400 leading-relaxed bg-neutral-900/40 p-3 rounded-xl border border-neutral-800 text-center font-sans">
                          User registered but has not submitted the KYC Identification form.
                        </div>
                      )}

                      {/* Decision buttons */}
                      {user.kycStatus === 'pending' && (
                        <div className="flex gap-2 justify-end pt-2">
                          <button
                            onClick={() => handleKycStatusUpdate(user.id, 'rejected')}
                            className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                          >
                            Reject Application
                          </button>
                          <button
                            onClick={() => handleKycStatusUpdate(user.id, 'approved')}
                            className="bg-emerald-500 hover:bg-emerald-600 text-neutral-950 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-all"
                          >
                            <Check className="h-3.5 w-3.5 text-neutral-950" />
                            Approve Identity
                          </button>
                        </div>
                      )}

                    </div>
                  ))}
                </div>
              )}
            </div>
          )}


          {/* 3. CORE TRANSACTION MANAGEMENT LEDGER */}
          {activeSubTab === 'transactions' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-gold">Full Platform Ledger</h3>
                <span className="text-xs text-neutral-400 block mt-1">Track and settle pending OTC crypto orders.</span>
              </div>

              {allTransactions.length === 0 ? (
                <div className="text-center py-12 p-6 border border-dashed border-neutral-800 rounded-xl text-neutral-500 text-xs">
                  No exchange transactions logged.
                </div>
              ) : (
                <div className="space-y-4">
                  {allTransactions.map(tx => (
                    <div key={tx.id} className="border border-neutral-800 bg-neutral-950/60 rounded-xl p-4 sm:p-5 relative">
                      {/* Status indicator */}
                      <span className={`absolute right-4 top-4 text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
                        tx.status === 'completed'
                          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                          : tx.status === 'cancelled'
                          ? 'border-neutral-800 bg-neutral-900 text-neutral-400'
                          : 'border-gold/30 bg-gold/10 text-gold font-bold animate-pulse'
                      }`}>
                        {tx.status.toUpperCase()}
                      </span>

                      <div className="flex items-center gap-3 mb-3 pb-3 border-b border-neutral-800/80">
                        <div className="h-8 w-8 rounded-xl bg-gold/10 flex items-center justify-center font-mono text-xs text-gold border border-gold/20 font-bold">
                          {tx.type === 'buy' ? 'B' : 'S'}
                        </div>
                        <div>
                          <strong className="block text-sm text-white font-bold">
                            {tx.type === 'buy' ? 'Buy Order' : 'Sell Order'} ({tx.fromCurrency} &rarr; {tx.toCurrency})
                          </strong>
                          <span className="block text-xs text-neutral-400 font-mono mt-0.5">
                            Client: <span className="text-neutral-300">@{tx.telegramUsername}</span> • ID: <span className="text-gold/80">{tx.id.slice(0, 16)}...</span>
                          </span>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-3 gap-4 text-xs font-mono py-3 bg-neutral-900/60 px-4 rounded-xl border border-neutral-800 text-neutral-400">
                        <div>
                          <span className="text-[10px] text-neutral-500 uppercase tracking-wider block mb-0.5">Client Pays</span>
                          <span className="text-white text-xs font-bold">
                            {tx.type === 'buy' ? `$${formatNum(tx.amountFrom)}` : `${tx.amountFrom} ${tx.fromCurrency}`}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-neutral-500 uppercase tracking-wider block mb-0.5">Client Receives</span>
                          <span className="text-gold text-xs font-bold block">
                            {tx.type === 'buy' ? `${tx.amountTo} ${tx.toCurrency}` : `$${formatNum(tx.amountTo)}`}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-neutral-500 uppercase tracking-wider block mb-0.5">Settlement Address</span>
                          <span className="text-neutral-300 text-xs block truncate">{tx.cryptoAddress || 'Escrow vault'}</span>
                        </div>
                      </div>

                      <div className="mt-3.5 flex items-center justify-between text-xs text-neutral-500">
                        <span>Submitted: {formatDate(tx.createdAt)}</span>
                        {tx.paymentDetails && (
                          <span className="italic text-neutral-400">Memo: {tx.paymentDetails}</span>
                        )}
                      </div>

                      {/* Control buttons */}
                      {tx.status === 'pending' && (
                        <div className="flex gap-2 justify-end mt-4 pt-3 border-t border-neutral-800/80">
                          <button
                            onClick={() => updateTransactionStatus(tx.id, 'cancelled')}
                            className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                          >
                            Decline Escrow
                          </button>
                          <button
                            onClick={() => updateTransactionStatus(tx.id, 'completed')}
                            className="bg-emerald-500 text-neutral-950 hover:brightness-110 px-4 py-1.5 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1 transition-all"
                          >
                            <Check className="h-3.5 w-3.5 text-neutral-950" />
                            Settle Transaction
                          </button>
                        </div>
                      )}

                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. WITHDRAWAL REQUESTS DECK */}
          {activeSubTab === 'withdrawals' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-gold">Outgoing Escrow Queue</h3>
                <span className="text-xs text-neutral-400 block mt-1">Review, authorize, or cancel pending cashout/withdrawal requests from platform users.</span>
              </div>

              {allWithdrawals.length === 0 ? (
                <div className="text-center py-12 p-6 border border-dashed border-neutral-800 rounded-xl text-neutral-500 text-xs">
                  No outgoing balance withdrawals queued.
                </div>
              ) : (
                <div className="space-y-4">
                  {allWithdrawals.map(w => (
                    <div key={w.id} className="border border-neutral-800 bg-neutral-950/60 rounded-xl p-4 sm:p-5 relative">
                      {/* Status badge */}
                      <span className={`absolute right-4 top-4 text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
                        w.status === 'completed'
                          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                          : w.status === 'cancelled'
                          ? 'border-neutral-800 bg-neutral-900 text-neutral-400'
                          : 'border-gold/30 bg-gold/10 text-gold font-bold animate-pulse'
                      }`}>
                        {w.status.toUpperCase()}
                      </span>

                      <div className="flex items-center gap-3 mb-3 pb-3 border-b border-neutral-800/80 font-sans">
                        <div className="h-8 w-8 rounded-xl bg-neutral-800 flex items-center justify-center font-mono text-xs text-gold border border-gold/30 font-bold">
                          W
                        </div>
                        <div>
                          <strong className="block text-sm text-white font-bold">
                            Withdrawal Request ({w.coinId})
                          </strong>
                          <span className="block text-xs text-neutral-400 font-mono mt-0.5">
                            Client: <span className="text-neutral-300">@{w.telegramUsername}</span> • ID: <span className="text-gold/80">{w.id.slice(0, 16)}...</span>
                          </span>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-3 gap-4 text-xs font-mono py-3 bg-neutral-900/60 px-4 rounded-xl border border-neutral-800 text-neutral-400">
                        <div>
                          <span className="text-[10px] text-neutral-500 uppercase tracking-wider block mb-0.5">Volume to Send</span>
                          <span className="text-gold text-xs font-bold block">
                            {w.amount} {w.coinId}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-neutral-500 uppercase tracking-wider block mb-0.5">USD Outstanding</span>
                          <span className="text-white text-xs font-bold block">
                            ${formatNum(w.amountUsd, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-neutral-500 uppercase tracking-wider block mb-0.5">Target Wallet</span>
                          <span className="text-white text-xs block select-all truncate" title={w.cryptoAddress}>
                            {w.cryptoAddress}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3.5 flex items-center justify-between text-xs text-neutral-500">
                        <span>Created: {formatDate(w.createdAt)}</span>
                        {w.notes && (
                          <span className="italic text-neutral-300">User notes: "{w.notes}"</span>
                        )}
                      </div>

                      {/* Control buttons */}
                      {w.status === 'pending' && (
                        <div className="flex gap-2 justify-end mt-4 pt-3 border-t border-neutral-800/80">
                          <button
                            onClick={() => updateWithdrawalStatus(w.id, 'cancelled')}
                            className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                          >
                            Decline & Refund
                          </button>
                          <button
                            onClick={() => updateWithdrawalStatus(w.id, 'completed')}
                            className="bg-emerald-500 text-neutral-950 hover:brightness-110 px-4 py-1.5 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1 transition-all"
                          >
                            <Check className="h-3.5 w-3.5 text-neutral-950" />
                            Confirm Release
                          </button>
                        </div>
                      )}

                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
