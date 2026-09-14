/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Mail, Lock, ShieldCheck, X, User, Phone, Terminal, ChevronRight, ArrowLeft, CheckCircle, KeyRound } from 'lucide-react';
import { UserProfile } from '../types';

interface AuthModalProps {
  onSuccess: (profile: UserProfile) => void;
  onClose: () => void;
}

export default function AuthModal({ onSuccess, onClose }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [resetSuccessMessage, setResetSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Ready-to-use testing accounts for standard preview validation
  const testPresets = [
    { email: 'admin@auragold.com', pass: 'admin123', label: 'Admin Desk Portal', icon: '🛠️' },
    { email: 'trader@auragold.com', pass: 'trader123', label: 'Pro Trader Account', icon: '📈' }
  ];

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address to receive a password reset link.');
      return;
    }

    setError('');
    setResetSuccessMessage('');
    setResetLoading(true);

    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSuccessMessage(`Password reset link sent to ${email.trim()}. Please check your inbox (and spam folder).`);
      setResetLoading(false);
    } catch (err: any) {
      console.error(err);
      let errMsg = err?.message || 'Failed to send password reset email.';
      if (err?.code === 'auth/user-not-found') {
        errMsg = 'No account was found registered with this email address.';
      } else if (err?.code === 'auth/invalid-email') {
        errMsg = 'Please enter a valid email address.';
      } else if (err?.code === 'auth/missing-email') {
        errMsg = 'Please enter your email address.';
      }
      setError(errMsg);
      setResetLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please provide email and password.');
      return;
    }

    if (isSignUp && (!username.trim() || !displayName.trim() || !phone.trim())) {
      setError('Please provide username, display name, and phone number for sign up.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      let userCredential;
      if (isSignUp) {
        // Create User Session
        userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        // Sign In Session
        userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      }

      const uid = userCredential.user.uid;
      const userRef = doc(db, 'users', uid);
      
      let userSnap;
      try {
        userSnap = await getDoc(userRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${uid}`);
      }

      let profileData: UserProfile;

      if (isSignUp) {
        // Clean username representation 
        const cleanUsername = username.replace('@', '').trim();
        
        let assignedRole: 'user' | 'admin' = 'user';
        if (cleanUsername.toLowerCase().includes('admin') || email.toLowerCase().includes('admin')) {
          assignedRole = 'admin';
        }

        profileData = {
          id: uid,
          telegramUsername: cleanUsername, // fallback username compatibility
          phoneNumber: phone,
          displayName: displayName,
          role: assignedRole,
          kycStatus: 'none',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Save profile to Firestore
        try {
          await setDoc(userRef, profileData);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
        }

        // Configure admins document if this user is admin
        if (profileData.role === 'admin') {
          try {
            await setDoc(doc(db, 'admins', uid), {
              uid: uid,
              email: email.trim(),
              assignedAt: new Date().toISOString()
            });
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `admins/${uid}`);
          }
        }
      } else {
        // If signing in, ensure profile exists in Firestore
        if (userSnap.exists()) {
          profileData = userSnap.data() as UserProfile;
        } else {
          // Generate fallback profile if missing from Firestore keys
          let assignedRole: 'user' | 'admin' = 'user';
          if (email.toLowerCase().includes('admin')) {
            assignedRole = 'admin';
          }

          profileData = {
            id: uid,
            telegramUsername: email.split('@')[0],
            phoneNumber: '+15550192',
            displayName: email.split('@')[0],
            role: assignedRole,
            kycStatus: 'none',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          try {
            await setDoc(userRef, profileData);
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
          }

          if (profileData.role === 'admin') {
            try {
              await setDoc(doc(db, 'admins', uid), {
                uid: uid,
                email: email.trim(),
                assignedAt: new Date().toISOString()
              });
            } catch (err) {
              handleFirestoreError(err, OperationType.WRITE, `admins/${uid}`);
            }
          }
        }
      }

      setLoading(false);
      onSuccess(profileData);
    } catch (err: any) {
      console.error(err);
      let errMsg = err?.message || 'Authentication failed.';
      if (err?.code === 'auth/user-not-found' || err?.code === 'auth/wrong-password') {
        errMsg = 'Invalid email or password combination.';
      } else if (err?.code === 'auth/email-already-in-use') {
        errMsg = 'This email address is already in use.';
      } else if (err?.code === 'auth/weak-password') {
        errMsg = 'Password must be at least 6 characters.';
      } else if (err?.code === 'auth/operation-not-allowed') {
        errMsg = '🔒 Email/Password Sign-In has not been enabled in the Firebase Console yet. Please navigate to Firebase Console > Authentication > Sign-in method and enable the "Email/Password" provider. In the meantime, use the "PREVIEW SYSTEM CONTROL" boost element below to instantly grant your current login admin privileges.';
      }
      setError(errMsg);
      setLoading(false);
    }
  };

  const applyPreset = (presetEmail: string, presetPass: string) => {
    setEmail(presetEmail);
    setPassword(presetPass);
    setIsSignUp(false);
    setIsResetMode(false);
    setError('');
    setResetSuccessMessage('');
  };

  return (
    <div id="auth-modal-root" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative w-full max-w-4xl grid md:grid-cols-2 bg-neutral-900/95 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
        
        {/* Left Side: Auth Forms */}
        <div className="p-6 sm:p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                {isResetMode ? (
                  <KeyRound className="h-5 w-5 text-gold" />
                ) : (
                  <ShieldCheck className="h-5 w-5 text-gold" />
                )}
                <h3 className="text-sm font-bold text-white">
                  {isResetMode ? 'Reset Password' : isSignUp ? 'Create Account' : 'Welcome Back'}
                </h3>
              </div>
              <button onClick={onClose} className="text-neutral-400 hover:text-white p-1.5 rounded-xl hover:bg-white/5 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed mb-6">
              {isResetMode
                ? 'Enter your registered email address and we will send you a secure link to reset your account password.'
                : isSignUp 
                ? 'Register your account for instant cryptocurrency exchange, portfolio tracking, and OTC orders.'
                : 'Sign in to access your transaction history, account details, and live OTC orders.'}
            </p>

            {resetSuccessMessage && (
              <div className="mb-5 text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-xl leading-relaxed flex items-start gap-2.5">
                <CheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
                <div>{resetSuccessMessage}</div>
              </div>
            )}

            {error && (
              <div className="mb-5 text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl leading-relaxed whitespace-pre-line">
                {error}
              </div>
            )}

            {isResetMode ? (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Account Email Address
                  </label>
                  <div id="auth-input-email-reset-wrapper" className="relative">
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-neutral-500" />
                    <input
                      type="email"
                      className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-gold transition-colors"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-1.5">
                    We will send an authorized password reset link to this inbox.
                  </p>
                </div>

                <button
                  type="submit"
                  id="btn-submit-reset-password"
                  disabled={resetLoading}
                  className="w-full flex items-center justify-center gap-2 bg-gold hover:brightness-110 text-neutral-950 font-bold py-3 rounded-xl text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50 transition-all shadow-md shadow-gold/20"
                >
                  {resetLoading ? 'Sending Reset Email...' : 'Send Password Reset Link'}
                  <ChevronRight className="h-4 w-4" />
                </button>

                <div className="mt-4 flex justify-center text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetMode(false);
                      setError('');
                      setResetSuccessMessage('');
                    }}
                    className="inline-flex items-center gap-1.5 text-neutral-400 hover:text-gold transition-colors cursor-pointer select-none"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back to Sign In</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAuth} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Email Address
                  </label>
                  <div id="auth-input-email-wrapper" className="relative">
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-neutral-500" />
                    <input
                      type="email"
                      className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-gold transition-colors"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-neutral-300">
                      Password
                    </label>
                    {!isSignUp && (
                      <button
                        type="button"
                        id="btn-toggle-reset-password"
                        onClick={() => {
                          setIsResetMode(true);
                          setError('');
                          setResetSuccessMessage('');
                        }}
                        className="text-[11px] text-neutral-400 hover:text-gold transition-colors cursor-pointer select-none"
                      >
                        Reset Password?
                      </button>
                    )}
                  </div>
                  <div id="auth-input-password-wrapper" className="relative">
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-neutral-500" />
                    <input
                      type="password"
                      className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-gold transition-colors font-mono"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {isSignUp && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                        Username / Telegram
                      </label>
                      <div id="auth-input-username-wrapper" className="relative">
                        <User className="absolute left-3.5 top-3 h-4 w-4 text-neutral-500" />
                        <input
                          type="text"
                          className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-gold transition-colors"
                          placeholder="trader99"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                        Full Name
                      </label>
                      <div id="auth-input-display-wrapper" className="relative">
                        <User className="absolute left-3.5 top-3 h-4 w-4 text-neutral-500" />
                        <input
                          type="text"
                          className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-gold transition-colors"
                          placeholder="Ahmed Rasheed"
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
                      <div id="auth-input-phone-wrapper" className="relative">
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
                  </>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-gold hover:brightness-110 text-neutral-950 font-bold py-3 rounded-xl text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50 transition-all shadow-md shadow-gold/20"
                >
                  {loading ? 'Authenticating...' : isSignUp ? 'Create Account' : 'Sign In'}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </form>
            )}

            {!isResetMode && (
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError('');
                    setResetSuccessMessage('');
                  }}
                  className="text-neutral-400 hover:text-gold transition-colors cursor-pointer select-none"
                >
                  {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Register"}
                </button>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsResetMode(true);
                      setError('');
                      setResetSuccessMessage('');
                    }}
                    className="text-neutral-400 hover:text-gold transition-colors cursor-pointer select-none"
                  >
                    Reset Password
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 border-t border-neutral-800 pt-4 text-[11px] text-neutral-400 leading-relaxed">
            Note: Registering or signing in with an email containing "<span className="text-gold font-semibold">admin</span>" automatically grants Administrator access.
          </div>
        </div>

        {/* Right Side: Preview Assist Presets */}
        <div className="bg-neutral-950/80 border-t md:border-t-0 md:border-l border-neutral-800 flex flex-col justify-between font-sans p-6 sm:p-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gold/10 flex items-center justify-center border border-gold/20 shrink-0">
                <Terminal className="h-4.5 w-4.5 text-gold" />
              </div>
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-white">Quick Test Accounts</span>
                <span className="block text-[10px] text-gold font-medium">Instant Pre-Configured Logins</span>
              </div>
            </div>

            <p className="text-xs text-neutral-400 leading-relaxed pt-1">
              Select one of the pre-configured accounts to instantly populate credentials and connect without going through registration:
            </p>

            <div className="space-y-2.5 pt-2">
              {testPresets.map(preset => (
                <button
                  key={preset.email}
                  onClick={() => applyPreset(preset.email, preset.pass)}
                  className="w-full flex items-center justify-between text-left p-3 rounded-xl bg-neutral-900/80 border border-neutral-800 hover:border-gold/40 hover:bg-neutral-900 transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{preset.icon}</span>
                    <div>
                      <span className="block text-xs font-bold text-white group-hover:text-gold transition-colors">{preset.label}</span>
                      <span className="block text-[11px] text-neutral-400 font-mono">{preset.email}</span>
                    </div>
                  </div>
                  <span className="text-xs bg-gold/10 text-gold border border-gold/20 px-2.5 py-1 rounded-lg uppercase font-semibold group-hover:bg-gold/20 transition-all">
                    Load
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div id="auth-sandboxed-notes" className="border-t border-neutral-800/80 pt-4 text-xs text-neutral-400 leading-relaxed mt-6">
            <span className="text-gold font-semibold block mb-1">Testing Environment:</span>
            No email verification needed. Accounts sign in directly to verify rates and test transactions.
          </div>
        </div>

      </div>
    </div>
  );
}
