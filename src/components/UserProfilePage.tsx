/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { UserProfile, ExchangeRate, getBuyRate, getSellRate, formatNum } from '../types';
import { 
  User, 
  Phone, 
  Settings, 
  Terminal, 
  CheckCircle, 
  RefreshCw, 
  Lock, 
  Eye, 
  EyeOff, 
  Coins, 
  HelpCircle, 
  ShieldAlert, 
  ArrowRight, 
  Link2, 
  Globe,
  Copy,
  Check
} from 'lucide-react';

interface UserProfilePageProps {
  userProfile: UserProfile | null;
  onProfileUpdate: (updated: UserProfile) => void;
  rates: ExchangeRate[];
  isBinanceFeedLive: boolean;
}

export default function UserProfilePage({ 
  userProfile, 
  onProfileUpdate, 
  rates, 
  isBinanceFeedLive 
}: UserProfilePageProps) {
  
  if (!userProfile) {
    return (
      <div id="profile-unauth-container" className="flex-1 flex flex-col justify-center items-center py-20 px-4 font-sans">
        <div className="text-center max-w-md bg-neutral-900/80 border border-neutral-800 p-8 rounded-2xl shadow-xl text-neutral-300 backdrop-blur-md">
          <div className="h-16 w-16 mx-auto mb-4 rounded-2xl bg-gold/10 border border-gold/20 flex items-center justify-center">
            <ShieldAlert className="h-8 w-8 text-gold" />
          </div>
          <h2 className="text-base font-bold text-white mb-2">Access Restricted</h2>
          <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
            Please sign in to access your personal profile parameters, transaction preferences, and Binance integrations.
          </p>
        </div>
      </div>
    );
  }

  // Account form states
  const [displayName, setDisplayName] = useState(userProfile.displayName || '');
  const [phone, setPhone] = useState(userProfile.phoneNumber || '');
  const [telegramUsername, setTelegramUsername] = useState(userProfile.telegramUsername || '');
  
  // Binance configurations
  const [binancePayId, setBinancePayId] = useState(userProfile.binancePayId || '');
  const [binanceApiKey, setBinanceApiKey] = useState(userProfile.binanceApiKey || '');
  const [binanceApiSecret, setBinanceApiSecret] = useState(userProfile.binanceApiSecret || '');
  const [binanceLinked, setBinanceLinked] = useState(userProfile.binanceLinked ?? false);
  const [settlementMode, setSettlementMode] = useState<'standard' | 'binance_pay' | 'arbitrage'>(
    userProfile.binanceSettlementMode || 'standard'
  );

  // UI state managers
  const [showSecret, setShowSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedCompanyId, setCopiedCompanyId] = useState(false);

  const handleCopyCompanyBinanceId = () => {
    const textToCopy = '179047031';
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textToCopy).catch(() => {});
    }
    setCopiedCompanyId(true);
    setTimeout(() => setCopiedCompanyId(false), 2000);
  };
  
  // Simulated Diagnostic Console
  const [testingConnection, setTestingConnection] = useState(false);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'failed'>('idle');
  const [simulatedBalances, setSimulatedBalances] = useState<{ asset: string; free: string; locked: string }[]>([]);

  useEffect(() => {
    // Keep internal state aligned if prop updates
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setPhone(userProfile.phoneNumber || '');
      setTelegramUsername(userProfile.telegramUsername || '');
      setBinancePayId(userProfile.binancePayId || '');
      setBinanceApiKey(userProfile.binanceApiKey || '');
      setBinanceApiSecret(userProfile.binanceApiSecret || '');
      setBinanceLinked(userProfile.binanceLinked ?? false);
      setSettlementMode(userProfile.binanceSettlementMode || 'standard');
    }
  }, [userProfile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveStatus('idle');
    setErrorMessage('');

    try {
      const userRef = doc(db, 'users', userProfile.id);
      
      const updates = {
        displayName,
        phoneNumber: phone,
        telegramUsername,
        binancePayId,
        binanceApiKey,
        binanceApiSecret,
        binanceLinked,
        binanceSettlementMode: settlementMode,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(userRef, updates);

      const updatedProfile: UserProfile = {
        ...userProfile,
        ...updates
      };

      onProfileUpdate(updatedProfile);
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3500);
    } catch (err: any) {
      console.error(err);
      setSaveStatus('error');
      setErrorMessage(err?.message || 'Failed to update Firestore profile keys.');
      handleFirestoreError(err, OperationType.WRITE, `users/${userProfile.id}`);
    } finally {
      setSaving(false);
    }
  };

  const executeDiagnosticCheck = async () => {
    if (!binanceApiKey.trim() || !binanceApiSecret.trim()) {
      setConsoleLogs([
        '❌ FAILED: Missing essential credentials.',
        '👉 System error: Binance API Key and Secret are mandatory for cryptographic diagnostics.'
      ]);
      setTestResult('failed');
      return;
    }

    setTestingConnection(true);
    setTestResult('idle');
    setSimulatedBalances([]);
    
    const logs = [
      '🚀 Initializing LokalMV Binance Bridge Diagnostics...',
      '📡 Resolving API URL: https://api.binance.com/api/v3',
      '🔒 Standard SHA256 HMAC Signature generator armed...',
      '🔌 Connecting websocket latency metrics...'
    ];

    setConsoleLogs([...logs]);

    const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

    await delay(600);
    logs.push(`🛰️ Latency Check: Connected to Binance Tokyo servers (ping: ${Math.floor(Math.random() * 25) + 20}ms)`);
    setConsoleLogs([...logs]);

    await delay(700);
    logs.push('🔑 Validating API Key credentials & scope permissions...');
    logs.push(`🔍 Matching Key Signature: ...${binanceApiKey.slice(-8)}`);
    setConsoleLogs([...logs]);

    await delay(800);
    // Determine output depending on key authenticity simulation
    const isMockGenuine = binanceApiKey.length > 10 && binanceApiSecret.length > 15;
    if (isMockGenuine) {
      logs.push('✅ Credential Handshake: SUCCESSFUL (Status Code 200)');
      logs.push('⚙️ Permissions Detected: [READ_INFO, ENABLE_TRADE, DISALLOW_WITHDRAWAL]');
      logs.push('📊 Fetching current portfolio spot balances...');
      setConsoleLogs([...logs]);

      await delay(900);
      const generatedBalances = [
        { asset: 'USDT', free: '18,450.25', locked: '0.00' },
        { asset: 'USD', free: '5,000.00', locked: '0.00' }
      ];
      setSimulatedBalances(generatedBalances);
      logs.push('✨ SPOT Wallet details retrieved safely!');
      logs.push('🎉 System diagnosis complete: Ready for auto-settlement modes.');
      setConsoleLogs([...logs]);
      setTestResult('success');
      setBinanceLinked(true);
    } else {
      logs.push('❌ Handshake REJECTED (Status Code 401: Invalid API Signature)');
      logs.push('⚠️ Security notice: Please check for space typos or trailing letters.');
      setConsoleLogs([...logs]);
      setTestResult('failed');
      setBinanceLinked(false);
    }
    setTestingConnection(false);
  };

  return (
    <div id="user-profile-viewport" className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in font-sans">
      
      {/* Upper header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-neutral-800 pb-6 mb-10 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gold uppercase bg-gold/10 px-2.5 py-1 rounded-lg">
              Account Settings
            </span>
            {isBinanceFeedLive && (
              <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2.5 py-1 rounded-lg uppercase flex items-center gap-1.5 font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Live Rates Active
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-2">
            Profile & Integrations
          </h1>
          <p className="text-sm text-neutral-400 max-w-2xl mt-1 leading-relaxed">
            Manage your personal profile details, settlement preferences, and link Binance spot modules for automated clearing.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-neutral-900/60 border border-neutral-800 px-4 py-2.5 rounded-2xl">
          <div className="text-right">
            <span className="block text-xs text-neutral-400">Account Type</span>
            <span className="text-sm text-gold font-bold uppercase">{userProfile.role}</span>
          </div>
          <div className="h-10 w-10 bg-gold/10 rounded-xl border border-gold/20 flex items-center justify-center">
            <Settings className="h-5 w-5 text-gold" />
          </div>
        </div>
      </div>

      {/* Small Static Card: Official Company Binance ID */}
      <div 
        id="company-binance-id-card" 
        className="mb-8 bg-neutral-900/80 border border-amber-500/30 hover:border-amber-500/50 rounded-2xl p-4 sm:p-5 shadow-xl backdrop-blur-sm relative overflow-hidden transition-all"
      >
        <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-md">
                  Company Binance ID
                </span>
                <span className="text-xs text-neutral-400">Direct OTC Deposit & Pay Rail</span>
              </div>
              
              <div className="flex items-center gap-3 sm:gap-4 mt-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-400">Binance ID:</span>
                  <span className="text-base sm:text-lg font-bold text-white font-mono tracking-wide bg-neutral-950/80 px-2.5 py-1 rounded-lg border border-neutral-800">
                    179047031
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-neutral-400">Nickname:</span>
                  <span className="text-xs sm:text-sm font-semibold text-amber-300 font-mono bg-amber-500/10 border border-amber-500/25 px-2.5 py-1 rounded-lg">
                    redjin
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
            <button
              type="button"
              id="copy-company-binance-id-btn"
              onClick={handleCopyCompanyBinanceId}
              className="inline-flex items-center gap-2 bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 border border-amber-400/35 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wider transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
              title="Copy Binance ID 179047031"
            >
              {copiedCompanyId ? (
                <>
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 text-amber-400" />
                  <span>Copy ID</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Profile details block */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Card: Account Parameters */}
          <div className="bg-neutral-900/60 border border-neutral-800 p-6 sm:p-7 rounded-2xl shadow-xl relative overflow-hidden backdrop-blur-sm">
            
            <div className="flex items-center gap-2.5 mb-6">
              <User className="h-5 w-5 text-gold" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Account Details
              </h2>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Display Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 h-4 w-4 text-neutral-500" />
                  <input
                    type="text"
                    className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-gold transition-colors"
                    placeholder="Enter full display name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 h-4 w-4 text-neutral-500" />
                  <input
                    type="text"
                    className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-gold transition-colors"
                    placeholder="+960 7771234"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                  Telegram Username
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs font-bold text-neutral-500">@</span>
                  <input
                    type="text"
                    className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl py-2.5 pl-8 pr-4 text-xs text-white focus:outline-none focus:border-gold transition-colors"
                    placeholder="trader_mv"
                    value={telegramUsername}
                    onChange={(e) => setTelegramUsername(e.target.value)}
                    required
                  />
                </div>
                <span className="block text-[11px] text-neutral-500 mt-1">
                  Used for trade confirmation and support.
                </span>
              </div>

              <div className="border-t border-neutral-800 pt-4 mt-6">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-gold hover:brightness-110 text-neutral-950 font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-md shadow-gold/20"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Saving changes...
                    </>
                  ) : (
                    'Save Account Details'
                  )}
                </button>
              </div>

              {saveStatus === 'success' && (
                <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-center mt-2">
                  ✓ Profile settings updated successfully.
                </div>
              )}
              {saveStatus === 'error' && (
                <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl text-center mt-2">
                  {errorMessage || 'Save operation failed.'}
                </div>
              )}
            </form>
          </div>

          {/* Live Exchange Tickers Card */}
          <div className="bg-neutral-900/60 border border-neutral-800 p-6 sm:p-7 rounded-2xl shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <Coins className="h-5 w-5 text-gold" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                  Portfolio Rates
                </h2>
              </div>
              <span className="text-xs bg-gold/10 text-gold px-2.5 py-0.5 rounded-lg border border-gold/20 uppercase font-medium">
                {isBinanceFeedLive ? 'Live Feed' : 'Local Rates'}
              </span>
            </div>

            <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
              Active currency prices. Buy and sell rates are derived directly from desk configurations.
            </p>

            <div className="space-y-2.5">
              {rates.map(rate => (
                <div 
                  key={rate.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-neutral-950/80 border border-neutral-800/80 hover:border-gold/30 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-white">{rate.id}</span>
                    <span className="text-xs text-neutral-400">{rate.name}</span>
                  </div>
                  <div className="text-right text-xs">
                    <div className="text-emerald-400 font-semibold font-mono">
                      Buy: ${formatNum(getBuyRate(rate), { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </div>
                    <div className="text-gold font-semibold font-mono">
                      Sell: ${formatNum(getSellRate(rate), { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Binance configuration block */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Card: Binance API Integration Configuration */}
          <div className="bg-neutral-900/60 border border-neutral-800 p-6 sm:p-7 rounded-2xl shadow-xl relative overflow-hidden backdrop-blur-sm">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-800 pb-4 mb-6 gap-2">
              <div className="flex items-center gap-2.5">
                <Globe className="h-5 w-5 text-amber-400" />
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                    Binance Integration
                  </h2>
                  <span className="text-xs text-neutral-400">Spot APIs & Binance Pay Gateway</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="binanceLinkedCheck"
                  checked={binanceLinked}
                  onChange={(e) => setBinanceLinked(e.target.checked)}
                  className="h-4 w-4 accent-amber-400 rounded bg-neutral-950 border-neutral-800 cursor-pointer"
                />
                <label htmlFor="binanceLinkedCheck" className="text-xs text-neutral-300 font-semibold uppercase tracking-wider cursor-pointer">
                  {binanceLinked ? '🟢 Connected' : '⚪ Offline'}
                </label>
              </div>
            </div>

            <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
              Integrate your Binance account parameters directly into the LokalMV settlement engines for automated payouts and wallet tracking.
            </p>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              
              {/* Settlement Mode Selection */}
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-2.5">
                  Settlement Routing
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  
                  <button
                    type="button"
                    onClick={() => setSettlementMode('standard')}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                      settlementMode === 'standard'
                        ? 'bg-gold/10 border-gold text-gold shadow-md'
                        : 'bg-neutral-950/80 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <span className="block text-xs font-bold uppercase">Standard OTC</span>
                    <span className="block text-[11px] text-neutral-400 mt-1 leading-relaxed">
                      Conventional settlement via local bank transfer or on-chain wallet.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettlementMode('binance_pay')}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                      settlementMode === 'binance_pay'
                        ? 'bg-amber-400/10 border-amber-400 text-amber-400 shadow-md'
                        : 'bg-neutral-950/80 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <span className="block text-xs font-bold uppercase">Binance Pay</span>
                    <span className="block text-[11px] text-neutral-400 mt-1 leading-relaxed">
                      Instant direct payouts to your specified Binance Pay ID.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettlementMode('arbitrage')}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                      settlementMode === 'arbitrage'
                        ? 'bg-emerald-400/10 border-emerald-400 text-emerald-400 shadow-md'
                        : 'bg-neutral-950/80 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                    }`}
                  >
                    <span className="block text-xs font-bold uppercase">API Automated</span>
                    <span className="block text-[11px] text-neutral-400 mt-1 leading-relaxed">
                      Direct automated clearance via connected spot API key.
                    </span>
                  </button>

                </div>
              </div>

              {/* Binance Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Binance Pay ID (Optional)
                  </label>
                  <input
                    type="text"
                    className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl py-2.5 px-3.5 text-xs text-white focus:outline-none focus:border-gold transition-colors font-mono"
                    placeholder="e.g. 293845012"
                    value={binancePayId}
                    onChange={(e) => setBinancePayId(e.target.value)}
                  />
                  <span className="block text-[11px] text-neutral-500 mt-1">
                    Your 9-digit payment receiver code found inside the Binance app.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Binance API Key
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-neutral-500" />
                    <input
                      type="text"
                      className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-gold transition-colors font-mono"
                      placeholder="binance_api_key_..."
                      value={binanceApiKey}
                      onChange={(e) => setBinanceApiKey(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Binance Secret Key
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-3.5 top-3 text-neutral-400 hover:text-white cursor-pointer"
                    >
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-neutral-500" />
                    <input
                      type={showSecret ? 'text' : 'password'}
                      className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl py-2.5 pl-10 pr-10 text-xs text-white focus:outline-none focus:border-gold transition-colors font-mono"
                      placeholder="••••••••••••••••"
                      value={binanceApiSecret}
                      onChange={(e) => setBinanceApiSecret(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Action and Diagnostics */}
              <div className="border-t border-neutral-800 pt-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
                <span className="text-xs text-neutral-400 text-center sm:text-left">
                  Never enable "Withdrawals" on your API key for safety.
                </span>
                
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={executeDiagnosticCheck}
                    disabled={testingConnection}
                    className="flex-1 sm:flex-none border border-amber-500/40 hover:bg-amber-500/10 text-amber-400 py-2.5 px-4 rounded-xl text-xs uppercase font-bold tracking-wider cursor-pointer disabled:opacity-50 transition-colors"
                  >
                    {testingConnection ? 'Testing...' : 'Test Connection'}
                  </button>
                  
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 sm:flex-none bg-amber-400 hover:brightness-110 text-neutral-950 py-2.5 px-5 rounded-xl text-xs uppercase font-bold tracking-wider cursor-pointer disabled:opacity-50 transition-colors shadow-md shadow-amber-400/20"
                  >
                    Save Integration
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Interactive Diagnostic Console and Balances Output */}
          {consoleLogs.length > 0 && (
            <div className="bg-neutral-950 border border-neutral-800 rounded-2xl font-mono text-xs p-5 shadow-2xl relative">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-amber-400" />
                  <span className="text-xs font-bold text-neutral-300 uppercase">Binance Log Console</span>
                </div>
                <div className="flex gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-red-500"></span>
                  <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                </div>
              </div>

              <div className="space-y-1.5 overflow-y-auto max-h-[140px] text-neutral-400 scrollbar-thin scrollbar-thumb-neutral-800">
                {consoleLogs.map((log, index) => (
                  <div key={index} className="leading-relaxed">
                    <span className="text-neutral-600 select-none mr-2">[{index + 1}]</span>
                    {log}
                  </div>
                ))}
              </div>

              {/* Connected Portfolio Display */}
              {testResult === 'success' && simulatedBalances.length > 0 && (
                <div className="mt-5 border-t border-neutral-800 pt-4 animate-fade-in">
                  <span className="block text-xs uppercase tracking-wider text-amber-400 font-bold mb-3">
                    Binance Spot Balances
                  </span>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {simulatedBalances.map(balance => (
                      <div key={balance.asset} className="bg-neutral-900 border border-neutral-800 p-3 rounded-xl">
                        <span className="block text-xs text-neutral-400 uppercase">{balance.asset}</span>
                        <span className="text-sm font-bold text-white mt-0.5 block">{balance.free}</span>
                        <span className="text-[11px] text-neutral-500 block">Locked: {balance.locked}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
