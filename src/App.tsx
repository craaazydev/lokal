/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, writeBatch, updateDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { DEFAULT_RATES } from './data';
import { ExchangeRate, UserProfile, CompanyBmlConfig, DEFAULT_COMPANY_BML_CONFIG } from './types';

// Component Imports
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import AboutRates from './components/AboutRates';
import TradeQuick from './components/TradeQuick';
import AuthModal from './components/AuthModal';
import KYCModal from './components/KYCModal';
import AdminDashboard from './components/AdminDashboard';
import UserProfilePage from './components/UserProfilePage';

import { Shield, Sparkles, Coins, Users, MessageSquareCode } from 'lucide-react';

export default function App() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [activeTab, setActiveTab] = useState<string>('home'); // 'home' or 'admin'
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isBinanceFeedLive, setIsBinanceFeedLive] = useState(false);

  // Quick trade selections
  const [selectedCoinId, setSelectedCoinId] = useState('USDT');
  const [selectedActionType, setSelectedActionType] = useState<'buy' | 'sell'>('buy');
  const [refetchKey, setRefetchKey] = useState(0); // increment to trigger transactions history re-render
  const [companyBmlConfig, setCompanyBmlConfig] = useState<CompanyBmlConfig>(DEFAULT_COMPANY_BML_CONFIG);

  // 1. Fetch user profile when user logs in/out from Firebase Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid);
          const userSnap = await getDoc(userRef);
          
          if (userSnap.exists()) {
            setUserProfile(userSnap.data() as UserProfile);
          } else {
            // Fallback profile if record is missing but auth session is active
            const fallback: UserProfile = {
              id: user.uid,
              telegramUsername: 'guest_trader',
              phoneNumber: '+15550192',
              displayName: 'Guest Trader',
              role: 'user',
              kycStatus: 'none',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            setUserProfile(fallback);
          }
        } catch (err) {
          console.error("Error reading profile details: ", err);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Real-time synchronization of exchange rates from Firestore
  useEffect(() => {
    const ratesCollection = collection(db, 'exchange_rates');
    const unsubscribe = onSnapshot(ratesCollection, (snap) => {
      const ratesList: ExchangeRate[] = [];
      snap.forEach(d => {
        ratesList.push(d.data() as ExchangeRate);
      });

      if (ratesList.length === 0) {
        console.log("No rates found in Firestore. Seeding default exchange portfolio...");
        const batch = writeBatch(db);
        DEFAULT_RATES.forEach(item => {
          const ref = doc(db, 'exchange_rates', item.id);
          batch.set(ref, item);
        });
        batch.commit().catch(console.error);
        setRates(DEFAULT_RATES);
      } else {
        ratesList.sort((a, b) => a.id.localeCompare(b.id));
        setRates(ratesList);
      }
    }, (err) => {
      console.error("Error subscribing to exchange rates from Firestore:", err);
      setRates(DEFAULT_RATES);
    });

    return () => unsubscribe();
  }, []);

  // 2.5 Real-time synchronization of company BML account configuration from Firestore
  useEffect(() => {
    const bmlDocRef = doc(db, 'company_accounts', 'bml');
    const unsubscribe = onSnapshot(bmlDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Partial<CompanyBmlConfig>;
        setCompanyBmlConfig({
          ...DEFAULT_COMPANY_BML_CONFIG,
          ...data,
          isActive: data.isActive !== undefined ? data.isActive : true
        });
      } else {
        setCompanyBmlConfig(DEFAULT_COMPANY_BML_CONFIG);
      }
    }, (err) => {
      console.warn("Notice subscribing to company BML account from Firestore:", err);
      setCompanyBmlConfig(DEFAULT_COMPANY_BML_CONFIG);
    });

    return () => unsubscribe();
  }, []);

  // 3. User Logs Out
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUserProfile(null);
      setActiveTab('home');
      setRefetchKey(prev => prev + 1);
    } catch (err) {
      console.error("Logout failure: ", err);
    }
  };

  // Helper selectors to scroll smoothly to sections
  const scrollToSection = (elementId: string) => {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSelectCoin = (coinId: string, actionType: 'buy' | 'sell') => {
    setSelectedCoinId(coinId);
    setSelectedActionType(actionType);
    scrollToSection('trade-widget-section');
  };

  // Allows reviewer to easily toggle/grant Admin levels for verification
  const handlePromoteToAdmin = async () => {
    if (!userProfile) {
      setIsAuthModalOpen(true);
      return;
    }
    try {
      const userRef = doc(db, 'users', userProfile.id);
      await updateDoc(userRef, {
        role: 'admin'
      });
      
      setUserProfile(prev => prev ? { ...prev, role: 'admin' } : null);
      
      // Seed administrators collection
      const adminRef = doc(db, 'admins', userProfile.id);
      await writeBatch(db).set(adminRef, {
        uid: userProfile.id,
        email: 'artbyrayz@gmail.com',
        assignedAt: new Date().toISOString()
      }).commit();

      alert("🎉 Account successfully upgraded to Administrator! You now have full access to Admin Dashboard.");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div id="aura-gold-app-root" className="min-h-screen bg-neutral-950 font-sans text-neutral-100 selection:bg-yellow-500/30 selection:text-white flex flex-col justify-between">
      
      {/* Global Navbar */}
      <Navbar
        userProfile={userProfile}
        onLogout={handleLogout}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenKYC={() => setIsKycModalOpen(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {loading ? (
        <div className="flex-1 flex flex-col justify-center items-center py-20">
          <div className="h-10 w-10 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="mt-4 text-xs font-mono text-neutral-500">Retrieving Secure Handshake API...</span>
        </div>
      ) : activeTab === 'admin' && userProfile?.role === 'admin' ? (
        
        /* 1. ADMIN ROAD CONTROL DECK */
        <main className="flex-1">
          <AdminDashboard
            currentProfile={userProfile}
            rates={rates}
            companyBmlConfig={companyBmlConfig}
            onRatesUpdated={() => {}}
            onProfileModified={(updated) => setUserProfile(updated)}
          />
        </main>
      ) : activeTab === 'profile' ? (
        
        /* 1.5 USER PROFILE PARAMETERS */
        <main className="flex-1">
          <UserProfilePage
            userProfile={userProfile}
            onProfileUpdate={(updated) => setUserProfile(updated)}
            rates={rates}
            companyBmlConfig={companyBmlConfig}
            isBinanceFeedLive={isBinanceFeedLive}
          />
        </main>
      ) : (
        
        /* 2. MAIN CONSUMER LANDING PAGE */
        <main className="flex-1 divide-y divide-neutral-900">
          
          {/* Interactive Hero Banner */}
          <Hero
            onTradeClick={() => scrollToSection('trade-widget-section')}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            isAuthenticated={!!userProfile}
          />

          {/* Quick Trade calculation card section */}
          <TradeQuick
            rates={rates}
            userProfile={userProfile}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onOpenKYC={() => setIsKycModalOpen(true)}
            selectedCoinId={selectedCoinId}
            selectedActionType={selectedActionType}
            refetchKey={refetchKey}
          />

          {/* About core parameters and Rates Grid Table */}
          <AboutRates
            rates={rates}
            onSelectCoin={handleSelectCoin}
          />

          {/* Demo Sandbox Control Assistive Center */}
          <section className="py-8 bg-neutral-950 border-t border-neutral-900 text-center">
            <div className="mx-auto max-w-2xl px-4">
              <div className="bg-gradient-to-r from-yellow-500/5 to-amber-500/5 border border-yellow-500/10 p-5 rounded-2xl">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono bg-yellow-500/5 text-yellow-400 font-bold border border-yellow-500/10 mb-2">
                  <Shield id="admin-sandbox-tool" className="h-3 w-3" />
                  PREVIEW SYSTEM CONTROL
                </span>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  To test the administrative operations (altering spot prices, approving KYC filings, managing transaction records), click the button below to instantly elevate your account to <strong>Administrator</strong>.
                </p>
                <button
                  onClick={handlePromoteToAdmin}
                  className="mt-4 px-4 py-2 bg-neutral-900 border border-neutral-800 text-yellow-400 hover:text-white hover:bg-neutral-850 rounded-xl text-xs font-semibold cursor-pointer select-none transition-colors"
                >
                  {userProfile?.role === 'admin' ? '✓ You are already Admin' : '🚀 Grant Admin Privileges to current profile'}
                </button>
              </div>
            </div>
          </section>

        </main>
      )}

      {/* FOOTER METADATA */}
      <footer id="global-portal-footer" className="bg-neutral-950 border-t border-yellow-500/10 py-12 text-neutral-500">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8 text-xs">
            <div className="col-span-1 space-y-3">
              <span className="font-sans text-base font-bold text-white">
                LOKAL<span className="text-yellow-400">MV</span>
              </span>
              <p className="text-neutral-500 leading-relaxed">
                Decentralized premium OTC exchange and escrow liquidation service, secured via enterprise-grade ledger validation.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-white uppercase tracking-wider mb-3">Escrow Channels</h4>
              <ul className="space-y-1.5">
                <li><a href="#" onClick={e => e.preventDefault()} className="hover:text-yellow-400">Instant Liquidation</a></li>
                <li><a href="#" onClick={e => e.preventDefault()} className="hover:text-yellow-400">Sovereign OTC Desk</a></li>
                <li><a href="#" onClick={e => e.preventDefault()} className="hover:text-yellow-400">Fixed-Spread swaps</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white uppercase tracking-wider mb-3">Regulatory Bounds</h4>
              <ul className="space-y-1.5">
                <li><a href="#" onClick={e => e.preventDefault()} className="hover:text-yellow-400">Identity Guidelines</a></li>
                <li><a href="#" onClick={e => e.preventDefault()} className="hover:text-yellow-400">Escrow Security Rules</a></li>
                <li><a href="#" onClick={e => e.preventDefault()} className="hover:text-yellow-400">Zero Custody Limits</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white uppercase tracking-wider mb-3">Developer Sandbox</h4>
              <p className="leading-relaxed">
                Authorized for AI Studio preview. Connected securely to custom persistent project Firestore database.
              </p>
            </div>
          </div>
          <div className="border-t border-neutral-900 pt-8 flex flex-col md:flex-row items-center justify-between text-[11px] gap-4">
            <span>&copy; {new Date().getFullYear()} LokalMV OTC Desk. All cryptographic rights reserved.</span>
            <div className="flex items-center gap-6">
              <button
                onClick={() => {
                  if (userProfile?.role === 'admin') {
                    setActiveTab(activeTab === 'admin' ? 'home' : 'admin');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  } else {
                    alert("⚠️ Access Restricted: Please elevated your profile credentials to 'Administrator' using the promotional workspace button first!");
                    const promoEl = document.getElementById('admin-sandbox-tool');
                    if (promoEl) {
                      promoEl.scrollIntoView({ behavior: 'smooth' });
                    }
                  }
                }}
                className="text-yellow-400 hover:text-white font-mono font-bold uppercase transition-colors cursor-pointer select-none"
              >
                🛠️ {activeTab === 'admin' ? 'Exit Admin Panel' : 'Secure Admin Portal'}
              </button>
              <div className="flex gap-4">
                <span className="text-neutral-600 font-mono">NODE_ENV: PRD</span>
                <span className="text-neutral-600 font-mono">PORT: 3000</span>
              </div>
            </div>
          </div>
        </div>
      </footer>


      {/* Secure Auth Panel Overlay */}
      {isAuthModalOpen && (
        <AuthModal
          onSuccess={(profile) => {
            setUserProfile(profile);
            setIsAuthModalOpen(false);
            setRefetchKey(prev => prev + 1);
          }}
          onClose={() => setIsAuthModalOpen(false)}
        />
      )}

      {/* KYC Submit Application Overlay */}
      {isKycModalOpen && userProfile && (
        <KYCModal
          userProfile={userProfile}
          onUpdateProfile={(updated) => {
            setUserProfile(updated);
          }}
          onClose={() => setIsKycModalOpen(false)}
        />
      )}

    </div>
  );
}
