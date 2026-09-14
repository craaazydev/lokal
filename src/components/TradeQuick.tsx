/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import { collection, addDoc, doc, getDocs, query, where, orderBy, deleteDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../firebase';
import { ExchangeRate, UserProfile, Transaction, WithdrawalRequest, getBuyRate, getSellRate, getEffectiveRate, getBuyCommissionValue, getSellCommissionValue, formatNum, formatDate } from '../types';
import { RefreshCw, ArrowRightLeft, ShieldAlert, CheckCircle, Clock, Trash2, Shield, AlertCircle } from 'lucide-react';

interface TradeQuickProps {
  rates: ExchangeRate[];
  userProfile: UserProfile | null;
  onOpenAuth: () => void;
  onOpenKYC: () => void;
  selectedCoinId: string;
  selectedActionType: 'buy' | 'sell';
  refetchKey: number; // to reload transaction history
}

export default function TradeQuick({
  rates,
  userProfile,
  onOpenAuth,
  onOpenKYC,
  selectedCoinId,
  selectedActionType,
  refetchKey,
}: TradeQuickProps) {
  const [activeTab, setActiveTab] = useState<'buy' | 'sell' | 'withdraw'>(selectedActionType);
  const [selectedCoin, setSelectedCoin] = useState<string>(selectedCoinId);
  const [cryptoAmount, setCryptoAmount] = useState<string>('0.1');
  const [usdAmount, setUsdAmount] = useState<string>('');
  const [walletAddress, setWalletAddress] = useState('');
  const [paymentDetails, setPaymentDetails] = useState('');
  
  // Transaction submissions state
  const [loading, setLoading] = useState(false);
  const [successTx, setSuccessTx] = useState<Transaction | null>(null);
  const [successWithdrawal, setSuccessWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [errorText, setErrorText] = useState('');
  
  // User's transactions history
  const [userTransactions, setUserTransactions] = useState<Transaction[]>([]);
  const [userWithdrawals, setUserWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [ratesRecast, setRatesRecast] = useState<Record<string, ExchangeRate>>({});
  const [historyTab, setHistoryTab] = useState<'exchanges' | 'withdrawals'>('exchanges');

  // Sync with prop selections if any
  useEffect(() => {
    setActiveTab(selectedActionType);
  }, [selectedActionType]);

  useEffect(() => {
    if (selectedCoinId) {
      setSelectedCoin(selectedCoinId);
    }
  }, [selectedCoinId]);

  // Index rates by symbol for ultra-fast lookup
  const ratesMap = useMemo(() => {
    const map: Record<string, ExchangeRate> = {};
    rates.forEach(r => { map[r.id] = r; });
    return map;
  }, [rates]);

  const activeCoinData = useMemo(() => {
    return ratesMap[selectedCoin] || rates[0] || null;
  }, [selectedCoin, rates, ratesMap]);

  // Current rate based on active buy/sell/withdraw tab
  const effectiveRate = useMemo(() => {
    if (!activeCoinData) return 1.0;
    return getEffectiveRate(activeCoinData, activeTab);
  }, [activeCoinData, activeTab]);

  // Conversions math
  const conversions = useMemo(() => {
    if (!activeCoinData) return { spotRate: 0, clientRate: 0, totalUsd: 0, totalMvr: 0 };
    const spot = activeCoinData.rateUsd;
    const clientRate = effectiveRate;
    const amountVal = parseFloat(cryptoAmount) || 0;
    const totalUsd = amountVal * clientRate;
    const totalMvr = totalUsd * 15.42;

    return {
      spotRate: spot,
      clientRate,
      totalUsd,
      totalMvr
    };
  }, [activeCoinData, effectiveRate, cryptoAmount]);

  // Dual fields linking - calculate USD on Crypto Change
  const handleCryptoChange = (val: string) => {
    setCryptoAmount(val);
    const amountVal = parseFloat(val) || 0;
    if (!activeCoinData) return;
    setUsdAmount((amountVal * effectiveRate).toFixed(2));
  };

  // Dual fields linking - calculate Crypto on USD Change
  const handleUsdChange = (val: string) => {
    setUsdAmount(val);
    const usdVal = parseFloat(val) || 0;
    if (!activeCoinData) return;
    setCryptoAmount(effectiveRate > 0 ? (usdVal / effectiveRate).toFixed(6) : '0');
  };

  // Keep USD amount in sync with active coin data, effectiveRate, and crypto amount
  useEffect(() => {
    if (activeCoinData) {
      const amountVal = parseFloat(cryptoAmount) || 0;
      setUsdAmount((amountVal * effectiveRate).toFixed(2));
    }
  }, [selectedCoin, activeCoinData, effectiveRate, activeTab]);

  // Pull history from Firestore
  useEffect(() => {
    async function loadHistory() {
      if (!userProfile) {
        setUserTransactions([]);
        return;
      }
      try {
        const txsRef = collection(db, 'transactions');
        const q = query(
          txsRef,
          where('userId', '==', userProfile.id)
        );
        const docsSnap = await getDocs(q);
        const txs: Transaction[] = [];
        docsSnap.forEach(d => {
          txs.push({ id: d.id, ...d.data() } as Transaction);
        });

        // Simple sorting locally since indexing on compound clauses requires manual setup
        txs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setUserTransactions(txs);
      } catch (err) {
        console.error('Error load user history: ', err);
      }
    }
    loadHistory();
  }, [userProfile, successTx, refetchKey]);

  // Pull withdrawals from Firestore
  useEffect(() => {
    async function loadWithdrawals() {
      if (!userProfile) {
        setUserWithdrawals([]);
        return;
      }
      try {
        const withsRef = collection(db, 'withdrawals');
        const q = query(
          withsRef,
          where('userId', '==', userProfile.id)
        );
        const docsSnap = await getDocs(q);
        const list: WithdrawalRequest[] = [];
        docsSnap.forEach(d => {
          list.push({ id: d.id, ...d.data() } as WithdrawalRequest);
        });
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setUserWithdrawals(list);
      } catch (err) {
        console.error('Error loading user withdrawals: ', err);
      }
    }
    loadWithdrawals();
  }, [userProfile, successWithdrawal, refetchKey]);

  // Execute Withdrawal request
  const handleConfirmWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) {
      onOpenAuth();
      return;
    }

    if (!activeCoinData) {
      setErrorText('Coin reference invalid.');
      return;
    }

    const amountVal = parseFloat(cryptoAmount) || 0;
    if (amountVal <= 0) {
      setErrorText('Withdrawal amount must be greater than zero.');
      return;
    }

    if (amountVal < activeCoinData.minAmount) {
      setErrorText(`Min volume limit: must withdraw at least ${activeCoinData.minAmount} ${activeCoinData.symbol}`);
      return;
    }

    if (!walletAddress.trim()) {
      setErrorText('Please enter your destination cryptocurrency wallet address.');
      return;
    }

    setErrorText('');
    setLoading(true);

    try {
      const withdrawalData = {
        userId: userProfile.id,
        telegramUsername: userProfile.telegramUsername,
        coinId: selectedCoin,
        amount: amountVal,
        amountUsd: amountVal * activeCoinData.rateUsd,
        cryptoAddress: walletAddress.trim(),
        status: 'pending',
        notes: paymentDetails.trim(),
        createdAt: new Date().toISOString()
      };

      const withRef = await addDoc(collection(db, 'withdrawals'), withdrawalData);
      
      const completeWith: WithdrawalRequest = {
        id: withRef.id,
        ...withdrawalData
      } as WithdrawalRequest;

      setSuccessWithdrawal(completeWith);
      setHistoryTab('withdrawals'); // auto focus the history too
      setLoading(false);
      
      // Clear inputs
      setWalletAddress('');
      setPaymentDetails('');
    } catch (err: any) {
      setLoading(false);
      handleFirestoreError(err, OperationType.WRITE, 'withdrawals');
    }
  };

  const cancelWithdrawal = async (withId: string) => {
    try {
      const withRef = doc(db, 'withdrawals', withId);
      await deleteDoc(withRef);
      setUserWithdrawals(prev => prev.filter(w => w.id !== withId));
      if (successWithdrawal?.id === withId) setSuccessWithdrawal(null);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `withdrawals/${withId}`);
    }
  };

  // Execute OTC contract
  const handleConfirmTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) {
      onOpenAuth();
      return;
    }

    if (!activeCoinData) {
      setErrorText('Coin reference invalid.');
      return;
    }

    const amountVal = parseFloat(cryptoAmount) || 0;
    if (amountVal < activeCoinData.minAmount) {
      setErrorText(`Min volume limit: must trade at least ${activeCoinData.minAmount} ${activeCoinData.symbol}`);
      return;
    }

    if (activeTab === 'buy' && !walletAddress.trim()) {
      setErrorText('Please enter your receiving cryptocurrency wallet address.');
      return;
    }

    if (activeTab === 'sell' && !paymentDetails.trim()) {
      setErrorText('Please specify payment hash notes or target fiat info.');
      return;
    }

    setErrorText('');
    setLoading(true);

    try {
      const txData = {
        userId: userProfile.id,
        telegramUsername: userProfile.telegramUsername,
        type: activeTab,
        fromCurrency: activeTab === 'buy' ? 'USD' : selectedCoin,
        toCurrency: activeTab === 'buy' ? selectedCoin : 'USD',
        amountFrom: activeTab === 'buy' ? conversions.totalUsd : amountVal,
        amountTo: activeTab === 'buy' ? amountVal : conversions.totalUsd,
        rate: conversions.clientRate,
        cryptoAddress: activeTab === 'buy' ? walletAddress.trim() : 'AURAGOLD_ESCROW_VAULT_ADDRESS',
        paymentDetails: activeTab === 'buy' ? 'Processing direct deposit checkout' : paymentDetails.trim(),
        status: 'pending',
        createdAt: new Date().toISOString()
      };

      const txRef = await addDoc(collection(db, 'transactions'), txData);
      
      const completeTx: Transaction = {
        id: txRef.id,
        ...txData
      } as Transaction;

      setSuccessTx(completeTx);
      setLoading(false);
      
      // Clear inputs
      setWalletAddress('');
      setPaymentDetails('');
    } catch (err: any) {
      setLoading(false);
      handleFirestoreError(err, OperationType.WRITE, 'transactions');
    }
  };

  const cancelTransaction = async (txId: string) => {
    try {
      // For standard users, they delete or update status based on rules. 
      // In the mockup to make it dynamic we deletes if pending, or sets cancelled in firestore.
      const txRef = doc(db, 'transactions', txId);
      await deleteDoc(txRef);
      setUserTransactions(prev => prev.filter(t => t.id !== txId));
      if (successTx?.id === txId) setSuccessTx(null);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.DELETE, `transactions/${txId}`);
    }
  };

  // Mock payout address generation for sells
  const simulatedEscrowAddress = useMemo(() => {
    if (selectedCoin === 'USD') return 'WIRE-BANK-ESCROW-0091823';
    return '0x9db65f9a6568db30f3f3c3a9d9e6040ce9f67a2d';
  }, [selectedCoin]);

  return (
    <section id="trade-widget-section" className="py-20 bg-neutral-950 border-t border-neutral-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        <div className="grid lg:grid-cols-12 gap-8 items-start">
          
          {/* Conversions form */}
          <div className="lg:col-span-12 xl:col-span-7 bg-neutral-900/70 border border-neutral-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md">
            
            {/* Tab Switches */}
            <div className="flex bg-neutral-950/80 p-1.5 rounded-xl mb-8 border border-neutral-800/80 gap-1">
              <button
                id="trade-tab-buy"
                onClick={() => {
                  setActiveTab('buy');
                  setErrorText('');
                  setSuccessTx(null);
                  setSuccessWithdrawal(null);
                }}
                className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'buy'
                    ? 'text-neutral-950 bg-gradient-to-r from-gold to-[#B8942A] shadow-md font-bold'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Instant Buy
              </button>
              <button
                id="trade-tab-sell"
                onClick={() => {
                  setActiveTab('sell');
                  setErrorText('');
                  setSuccessTx(null);
                  setSuccessWithdrawal(null);
                }}
                className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'sell'
                    ? 'text-neutral-950 bg-gradient-to-r from-gold to-[#B8942A] shadow-md font-bold'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Instant Sell
              </button>
              <button
                id="trade-tab-withdraw"
                onClick={() => {
                  setActiveTab('withdraw');
                  setErrorText('');
                  setSuccessTx(null);
                  setSuccessWithdrawal(null);
                }}
                className={`flex-1 py-2.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'withdraw'
                    ? 'text-neutral-950 bg-gradient-to-r from-gold to-[#B8942A] shadow-md font-bold'
                    : 'text-neutral-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Request Withdrawal
              </button>
            </div>

            {activeTab === 'withdraw' && successWithdrawal ? (
              <div id="withdrawal-success-feedback" className="py-8 text-center space-y-4 animate-fade-in font-sans">
                <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30">
                  <CheckCircle className="h-6 w-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Withdrawal Request Registered!</h3>
                <div className="max-w-md mx-auto text-xs text-neutral-400 space-y-2.5 bg-neutral-950/80 p-5 rounded-xl border border-neutral-800 text-left">
                  <div className="flex justify-between font-mono">
                    <span>Asset Symbol:</span>
                    <span className="text-white font-bold">{successWithdrawal.coinId}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span>Request Volume:</span>
                    <span className="text-gold font-bold">{successWithdrawal.amount} {successWithdrawal.coinId}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span>USD Valuation:</span>
                    <span className="text-neutral-300 font-bold">${formatNum(successWithdrawal?.amountUsd, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span>Destination Wallet:</span>
                    <span className="text-white select-all break-all">{successWithdrawal.cryptoAddress}</span>
                  </div>
                  <div className="flex justify-between font-mono border-t border-neutral-800 pt-2 text-[11px]">
                    <span>Request Token ID:</span>
                    <span className="text-neutral-400 select-all truncate max-w-[200px]">{successWithdrawal.id}</span>
                  </div>
                </div>

                <div className="bg-gold/5 border border-gold/25 p-4 rounded-xl text-left max-w-lg mx-auto">
                  <p className="text-xs text-gold font-semibold mb-1">🔒 Outgoing Escrow Queue</p>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    Your request has been placed in the secure withdrawal queue. Administrators will verify the balance and authorize transaction dispatch.
                  </p>
                </div>

                <div className="flex justify-center gap-3 pt-4">
                  <button
                    onClick={() => setSuccessWithdrawal(null)}
                    className="bg-neutral-800 hover:bg-neutral-700 text-white px-5 py-2.5 rounded-lg text-xs cursor-pointer font-semibold transition-colors"
                  >
                    New Request Form
                  </button>
                  <button
                    onClick={() => cancelWithdrawal(successWithdrawal.id)}
                    className="bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-neutral-950 px-5 py-2.5 rounded-lg text-xs cursor-pointer font-semibold transition-all"
                  >
                    Cancel Request
                  </button>
                </div>
              </div>
            ) : successTx ? (
              <div id="tx-success-feedback" className="py-8 text-center space-y-4 animate-fade-in">
                <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30">
                  <CheckCircle className="h-6 w-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Escrow Registered Successfully!</h3>
                <div className="max-w-md mx-auto text-xs text-neutral-400 space-y-2.5 bg-neutral-950/80 p-5 rounded-xl border border-neutral-800">
                  <div className="flex justify-between font-mono">
                    <span>Order Type:</span>
                    <span className="text-white font-bold">{successTx.type.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span>Rate Locked:</span>
                    <span className="text-gold font-bold">${formatNum(successTx?.rate)}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span>Sending:</span>
                    <span className="text-white">
                      {successTx?.type === 'buy' ? `$${formatNum(successTx?.amountFrom)}` : `${successTx?.amountFrom} ${selectedCoin}`}
                    </span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span>Receiving:</span>
                    <span className="text-emerald-400 font-bold">
                      {successTx?.type === 'buy' ? `${successTx?.amountTo} ${selectedCoin}` : `$${formatNum(successTx?.amountTo)}`}
                    </span>
                  </div>
                  <div className="flex justify-between font-mono border-t border-neutral-800 pt-2 text-[11px]">
                    <span>Transaction ID:</span>
                    <span className="text-neutral-400 select-all truncate max-w-[200px]">{successTx.id}</span>
                  </div>
                </div>

                {successTx.type === 'sell' && (
                  <div className="bg-gold/5 border border-gold/25 p-4 rounded-xl text-left max-w-lg mx-auto">
                    <p className="text-xs text-gold font-semibold mb-1">📬 Escrow Address instructions:</p>
                    <p className="text-xs text-neutral-300 leading-relaxed">
                      Please deposit exactly <strong className="text-white">{successTx.amountFrom} {selectedCoin}</strong> from your profile wallet to our central liquidation address below:
                    </p>
                    <div className="my-2.5 bg-neutral-950 p-3 border border-neutral-800 rounded-lg select-all text-xs font-mono text-gold text-center truncate font-bold">
                      {simulatedEscrowAddress}
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      Liquidated funds are disbursed to your specified payment notes target instantly once the deposit secures 1 confirmation on-chain.
                    </p>
                  </div>
                )}

                {userProfile?.kycStatus !== 'approved' && (
                  <div className="bg-rose-500/5 border border-rose-500/20 p-4 rounded-xl text-left max-w-lg mx-auto flex gap-3">
                    <ShieldAlert className="h-5 w-5 text-rose-400 animate-pulse shrink-0" />
                    <div>
                      <p className="text-xs text-rose-400 font-bold mb-1">Handshake Held in Escrow (KYC Required)</p>
                      <p className="text-xs text-neutral-400 leading-relaxed">
                        Your transaction is registered but held pending Identity clearance. Please submit your Passport/National ID details to release the swap.
                      </p>
                      <button
                        onClick={onOpenKYC}
                        className="mt-2 text-xs text-gold font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        Complete KYC Now &rarr;
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex justify-center gap-3 pt-4">
                  <button
                    onClick={() => setSuccessTx(null)}
                    className="bg-neutral-800 hover:bg-neutral-700 text-white px-5 py-2.5 rounded-lg text-xs cursor-pointer font-semibold transition-colors"
                  >
                    New Order Form
                  </button>
                  <button
                    onClick={() => cancelTransaction(successTx.id)}
                    className="bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-neutral-950 px-5 py-2.5 rounded-lg text-xs cursor-pointer font-semibold transition-all"
                  >
                    Cancel Order
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleConfirmTrade} className="space-y-5">
                
                {/* Error Box */}
                {errorText && (
                  <div className="text-xs bg-rose-500/10 border border-rose-500/25 text-rose-400 p-3.5 rounded-xl flex gap-2.5 items-start">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{errorText}</span>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Select Coin */}
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                      Asset to Exchange
                    </label>
                    <select
                      id="trade-select-coin"
                      className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl py-2.5 px-3.5 text-sm text-white focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/30 cursor-pointer transition-all"
                      value={selectedCoin}
                      onChange={(e) => setSelectedCoin(e.target.value)}
                    >
                      {rates.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.symbol})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Spot / dynamic rate display */}
                  <div className="bg-neutral-950/80 p-3.5 border border-neutral-800 rounded-xl flex flex-col justify-center">
                    <span className="text-[11px] text-gold font-semibold">
                      {activeTab === 'buy' ? 'Current Buy Rate' : activeTab === 'sell' ? 'Current Sell Rate' : 'Exchange Rate'}
                    </span>
                    <span className="text-sm font-bold text-white font-mono mt-0.5">
                      1 {selectedCoin} = ${formatNum(effectiveRate, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} USD
                    </span>
                    <span className="text-[11px] text-neutral-400 font-mono mt-0.5">
                      ≈ {formatNum(effectiveRate * 15.42, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MVR / {selectedCoin}
                    </span>
                  </div>
                </div>

                {/* Input block */}
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Crypto amount */}
                  <div className="relative">
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                      Amount ({selectedCoin})
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl py-2.5 pl-3.5 pr-16 text-sm text-white focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/30 font-mono transition-all"
                        value={cryptoAmount}
                        onChange={(e) => handleCryptoChange(e.target.value)}
                        required
                        min="0"
                      />
                      <span className="absolute right-3.5 top-2.5 text-xs font-bold text-gold">
                        {selectedCoin}
                      </span>
                    </div>
                  </div>

                  {/* USD Payout */}
                  <div>
                    <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                      Value MVR
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="any"
                        className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl py-2.5 pl-7 pr-3.5 text-sm text-white focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/30 font-mono transition-all"
                        value={usdAmount}
                        onChange={(e) => handleUsdChange(e.target.value)}
                        required
                        min="0"
                      />
                      <span className="absolute left-3 top-2.5 text-xs text-neutral-500 font-semibold"></span>
                    </div>
                  </div>
                </div>

                {/* Dynamic Calculation Summary Box */}
                {activeTab === 'withdraw' ? (
                  <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl px-4 py-3.5 space-y-2 text-xs">
                    <div className="flex justify-between text-neutral-400">
                      <span>Withdrawal Value:</span>
                      <span className="font-mono text-neutral-200">
                        ${formatNum((parseFloat(cryptoAmount) || 0) * (activeCoinData?.rateUsd || 0), { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                      </span>
                    </div>
                    <div className="flex justify-between text-neutral-400">
                      <span>Network Transfer Fee:</span>
                      <span className="text-emerald-400 font-semibold">Zero / Complimentary</span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-neutral-800 pt-2 text-white">
                      <span>Net Debit from Account:</span>
                      <span className="font-mono text-gold text-sm">
                        {cryptoAmount || '0'} {selectedCoin}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-neutral-950/70 border border-neutral-800 rounded-xl px-4 py-3.5 space-y-2 text-xs">
                    <div className="flex justify-between text-neutral-400">
                      <span>{activeTab === 'buy' ? 'Buy Rate:' : activeTab === 'sell' ? 'Sell Rate:' : 'Exchange Rate:'}</span>
                      <span className="font-mono text-neutral-200">
                        1 {selectedCoin} = ${formatNum(effectiveRate, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} USD ({formatNum(effectiveRate * 15.42, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MVR)
                      </span>
                    </div>
                    <div className="flex justify-between text-neutral-400">
                      <span>Crypto Quantity:</span>
                      <span className="font-mono text-neutral-200">{cryptoAmount || '0'} {selectedCoin}</span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-neutral-800 pt-2 text-white items-center">
                      <span>{activeTab === 'buy' ? 'Total Amount to Pay:' : 'Total Payout Received:'}</span>
                      <div className="text-right">
                        <span className="font-mono text-[11px] text-neutral-400 font-normal block">
                          ({formatNum(conversions?.totalUsd, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MVR)
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Conditional Fields based on Buy vs Sell vs Withdraw */}
                {activeTab === 'withdraw' ? (
                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-medium text-gold mb-1.5">
                        Destination {selectedCoin} Wallet Address
                      </label>
                      <input
                        type="text"
                        className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl py-2.5 px-3.5 text-sm text-gold font-mono placeholder:text-neutral-600 focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/30 transition-all"
                        placeholder={`Enter target ${selectedCoin} wallet address`}
                        value={walletAddress}
                        onChange={(e) => setWalletAddress(e.target.value)}
                        required={activeTab === 'withdraw'}
                      />
                      <p className="text-[11px] text-neutral-400 mt-1">
                        Verify this address carefully. Outgoing transactions to incorrect addresses are irreversible.
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                        Withdrawal Memo / Custom Notes (Optional)
                      </label>
                      <textarea
                        rows={2}
                        className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl py-2.5 px-3.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/30 transition-all"
                        placeholder="Add secondary routing parameters or remarks..."
                        value={paymentDetails}
                        onChange={(e) => setPaymentDetails(e.target.value)}
                      />
                    </div>
                  </div>
                ) : activeTab === 'buy' ? (
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                      Receiving {selectedCoin} Wallet Address
                    </label>
                    <input
                      type="text"
                      className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl py-2.5 px-3.5 text-sm text-gold font-mono placeholder:text-neutral-600 focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/30 transition-all"
                      placeholder={`Enter your ${selectedCoin} wallet address`}
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      required={activeTab === 'buy'}
                    />
                    <p className="text-[11px] text-neutral-400 mt-1">
                      Double check your wallet address. Assets broadcast to incorrect addresses cannot be recovered.
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                      Disbursal / Cashout Account (Bank Account Details or MVR Cashout Account)
                    </label>
                    <textarea
                      rows={2}
                      className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl py-2.5 px-3.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-gold/60 focus:ring-1 focus:ring-gold/30 transition-all"
                      placeholder="e.g. Bank of Maldives: Acct 7701..., Account Name: ..."
                      value={paymentDetails}
                      onChange={(e) => setPaymentDetails(e.target.value)}
                      required={activeTab === 'sell'}
                    />
                    <p className="text-[11px] text-neutral-400 mt-1">
                      Once on-chain escrow settles, funds will disburse automatically via the specified cashout channel.
                    </p>
                  </div>
                )}

                {/* Verification/Verification prompts */}
                {!userProfile ? (
                  <button
                    type="button"
                    onClick={onOpenAuth}
                    className="w-full bg-gradient-to-r from-gold to-[#B8942A] hover:brightness-110 text-neutral-950 font-bold py-3.5 rounded-xl text-xs sm:text-sm text-center cursor-pointer shadow-lg shadow-gold/15 transition-all active:scale-[0.99]"
                  >
                    Connect Account to Transact
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-gold to-[#B8942A] hover:brightness-110 text-neutral-950 font-bold py-3.5 rounded-xl text-xs sm:text-sm cursor-pointer shadow-lg shadow-gold/15 transition-all disabled:opacity-50 active:scale-[0.99]"
                  >
                    {loading ? 'Securing Outgoing Connection...' : activeTab === 'withdraw' ? 'Submit Withdrawal Request' : 'Confirm Escrow Execution & Lock Rate'}
                  </button>
                )}

              </form>
            )}

          </div>

          {/* Right Section: Pending logs if authenticated */}
          <div className="lg:col-span-12 xl:col-span-5 bg-neutral-900/70 border border-neutral-800/90 rounded-2xl p-6 sm:p-8 flex flex-col justify-between h-full min-h-[400px] shadow-2xl backdrop-blur-md">
            <div>
              {userProfile ? (
                /* History Sub-tabs */
                <div className="flex bg-neutral-950/80 border border-neutral-800 p-1 rounded-xl mb-6 gap-1">
                  <button
                    onClick={() => setHistoryTab('exchanges')}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      historyTab === 'exchanges' ? 'text-neutral-950 bg-gold shadow-sm font-bold' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Exchanges ({userTransactions.length})
                  </button>
                  <button
                    onClick={() => setHistoryTab('withdrawals')}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      historyTab === 'withdrawals' ? 'text-neutral-950 bg-gold shadow-sm font-bold' : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    Withdrawals ({userWithdrawals.length})
                  </button>
                </div>
              ) : (
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-6">
                  <Clock className="h-4 w-4 text-gold" />
                  Escrow Records
                </h3>
              )}
              
              {!userProfile ? (
                <div className="text-center py-12 text-neutral-500 text-xs border border-dashed border-neutral-800 rounded-xl p-6 h-full flex flex-col justify-center items-center">
                  <Shield className="h-10 w-10 text-gold/30 mb-3" />
                  <p className="font-semibold text-neutral-300 text-xs">Records Protected</p>
                  <p className="text-xs text-neutral-400 max-w-[220px] mt-1.5 mx-auto leading-relaxed">
                    Please sign in to view your live escrow status and trade records.
                  </p>
                </div>
              ) : historyTab === 'exchanges' ? (
                userTransactions.length === 0 ? (
                  <div className="text-center py-12 text-neutral-500 text-xs border border-dashed border-neutral-800 rounded-xl p-6 flex flex-col justify-center items-center h-[280px]">
                    <Clock className="h-8 w-8 text-gold/30 mb-2" />
                    <p className="font-semibold text-neutral-300 text-xs">No active exchanges</p>
                    <p className="text-xs text-neutral-400 mt-1">Initiate a buy or sell order above to track settlement.</p>
                  </div>
                ) : (
                  <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-1">
                    {userTransactions.map((tx) => (
                      <div key={tx.id} className="border border-neutral-800 bg-neutral-950/60 rounded-xl p-4 space-y-3 relative overflow-hidden group hover:border-neutral-700 transition-colors">
                        
                        {/* Left vertical border depending on status */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                          tx.status === 'completed'
                            ? 'bg-emerald-500'
                            : tx.status === 'cancelled'
                            ? 'bg-neutral-600'
                            : 'bg-gold animate-pulse'
                        }`} />

                        <div className="flex items-center justify-between pl-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              tx.type === 'buy' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-gold/15 text-gold'
                            }`}>
                              {tx.type.toUpperCase()}
                            </span>
                            <span className="text-xs font-semibold text-neutral-300">
                              {tx.type === 'buy' ? tx.toCurrency : tx.fromCurrency}
                            </span>
                          </div>
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                            tx.status === 'completed'
                              ? 'text-emerald-400 bg-emerald-500/10'
                              : tx.status === 'cancelled'
                              ? 'text-neutral-500 bg-neutral-800'
                              : 'text-gold bg-gold/10 animate-pulse'
                          }`}>
                            {tx.status.toUpperCase()}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs font-mono border-t border-b border-neutral-850 py-2.5 pl-2">
                          <div>
                            <span className="block text-[10px] font-sans text-neutral-400">Exchanged</span>
                            <span className="text-neutral-200 font-medium">
                              {tx.type === 'buy' ? `$${formatNum(tx.amountFrom)}` : `${tx.amountFrom} ${tx.fromCurrency}`}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="block text-[10px] font-sans text-neutral-400">Receiving</span>
                            <span className="text-emerald-400 font-bold">
                              {tx.type === 'buy' ? `${tx.amountTo} ${tx.toCurrency}` : `$${formatNum(tx.amountTo)}`}
                            </span>
                          </div>
                        </div>

                        <div className="text-[11px] font-mono text-neutral-400 flex justify-between items-center pl-2">
                          <span>ID: {tx.id.slice(0, 10)}...</span>
                          <span>{new Date(tx.createdAt).toLocaleDateString()}</span>
                        </div>

                        {/* Cancel pending transaction capability */}
                        {tx.status === 'pending' && (
                          <div className="flex justify-end pt-1 gap-2">
                            <button
                              onClick={() => cancelTransaction(tx.id)}
                              className="text-xs font-medium flex items-center gap-1 px-2.5 py-1 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg cursor-pointer transition-colors"
                            >
                              <Trash2 className="h-3 w-3" />
                              Cancel Order
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              ) : (
                /* Withdrawal requests tab content */
                userWithdrawals.length === 0 ? (
                  <div className="text-center py-12 text-neutral-500 text-xs border border-dashed border-neutral-800 rounded-xl p-6 flex flex-col justify-center items-center h-[280px]">
                    <Clock className="h-8 w-8 text-gold/30 mb-2" />
                    <p className="font-semibold text-neutral-300 text-xs">No withdrawals recorded</p>
                    <p className="text-xs text-neutral-400 mt-1">Submit a withdrawal request to monitor settlement.</p>
                  </div>
                ) : (
                  <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-1">
                    {userWithdrawals.map((w) => (
                      <div key={w.id} className="border border-neutral-800 bg-neutral-950/60 rounded-xl p-4 space-y-3 relative overflow-hidden group hover:border-neutral-700 transition-colors">
                        
                        {/* Left vertical border depending on status */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                          w.status === 'completed'
                            ? 'bg-emerald-500'
                            : w.status === 'cancelled'
                            ? 'bg-neutral-600'
                            : 'bg-gold animate-pulse'
                        }`} />

                        <div className="flex items-center justify-between pl-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-400">
                              WITHDRAWAL
                            </span>
                            <span className="text-xs font-semibold text-neutral-200">
                              {w.coinId}
                            </span>
                          </div>
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                            w.status === 'completed'
                              ? 'text-emerald-400 bg-emerald-500/10'
                              : w.status === 'cancelled'
                              ? 'text-neutral-500 bg-neutral-800'
                              : 'text-gold bg-gold/10 animate-pulse'
                          }`}>
                            {w.status.toUpperCase()}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs font-mono border-t border-b border-neutral-850 py-2.5 pl-2">
                          <div>
                            <span className="block text-[10px] font-sans text-neutral-400">Destination Wallet</span>
                            <span className="text-neutral-300 select-all font-mono truncate max-w-[150px] block" title={w.cryptoAddress}>
                              {w.cryptoAddress}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="block text-[10px] font-sans text-neutral-400">Amount</span>
                            <span className="text-gold font-bold">
                              {w.amount} {w.coinId}
                            </span>
                            <span className="block text-[10px] text-neutral-400 font-mono">
                              (${formatNum(w.amountUsd, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                            </span>
                          </div>
                        </div>

                        {w.notes && (
                          <div className="text-xs text-neutral-400 bg-neutral-900/80 px-3 py-2 border border-neutral-800 rounded-lg">
                            <span className="text-[10px] font-medium uppercase block text-neutral-500">Notes:</span>
                            {w.notes}
                          </div>
                        )}

                        <div className="text-[11px] font-mono text-neutral-400 flex justify-between items-center pl-2">
                          <span>ID: {w.id.slice(0, 10)}...</span>
                          <span>{new Date(w.createdAt).toLocaleDateString()}</span>
                        </div>

                        {/* Cancel pending withdrawal capability */}
                        {w.status === 'pending' && (
                          <div className="flex justify-end pt-1 gap-2">
                            <button
                              onClick={() => cancelWithdrawal(w.id)}
                              className="text-xs font-medium flex items-center gap-1 px-2.5 py-1 text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-lg cursor-pointer transition-colors"
                            >
                              <Trash2 className="h-3 w-3" />
                              Cancel Request
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

            {userProfile && (
              <div className="mt-6 p-3.5 rounded-xl bg-neutral-950/60 border border-neutral-800 text-xs text-neutral-400 space-y-1 leading-relaxed">
                <span className="block font-semibold text-gold text-xs">Escrow Verification:</span>
                <p className="text-neutral-400 text-xs">
                  Pending payouts and withdrawals are authenticated via multi-sig admin escrow before block confirmation.
                </p>
              </div>
            )}

          </div>

        </div>

      </div>
    </section>
  );
}
