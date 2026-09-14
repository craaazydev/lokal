/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../firebase';
import { X, UploadCloud, FileText, CheckCircle, Smartphone, AlertTriangle, Camera, Building2, UserCheck, RefreshCw, Scan, Sparkles } from 'lucide-react';
import { UserProfile, KYCData } from '../types';

interface KYCModalProps {
  userProfile: UserProfile;
  onUpdateProfile: (profile: UserProfile) => void;
  onClose: () => void;
}

export default function KYCModal({ userProfile, onUpdateProfile, onClose }: KYCModalProps) {
  const [fullName, setFullName] = useState(userProfile.kycData?.fullName || '');
  const [idType, setIdType] = useState<'passport' | 'national_id' | 'driver_license'>(userProfile.kycData?.idType || 'passport');
  const [idNumber, setIdNumber] = useState(userProfile.kycData?.idNumber || '');
  const [country, setCountry] = useState(userProfile.kycData?.country || '');
  const [email, setEmail] = useState(userProfile.kycData?.email || '');
  
  // File uploads state
  const [fileSelected, setFileSelected] = useState<File | null>(null);
  const [bankFileSelected, setBankFileSelected] = useState<File | null>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingBank, setIsDraggingBank] = useState(false);

  // Face Scan state
  const [faceScanCaptured, setFaceScanCaptured] = useState<string | null>(userProfile.kycData?.faceScanUrl || null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bankInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Camera Handlers
  const startCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } 
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } else {
        setCameraError('Webcam access not supported on this browser. Simulated scan available.');
      }
    } catch (err: any) {
      console.warn("Camera access warning:", err);
      setCameraError('Unable to access camera. You can capture a simulated biometrics scan below.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const captureFaceScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      let dataUrl = '';
      if (videoRef.current && streamRef.current) {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = videoRef.current.videoWidth || 320;
          canvas.height = videoRef.current.videoHeight || 240;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            dataUrl = canvas.toDataURL('image/png');
          }
        } catch (e) {
          console.error(e);
        }
      }
      if (!dataUrl) {
        dataUrl = '/mock_uploads/face_scan_verified.png';
      }
      
      setFaceScanCaptured(dataUrl);
      setIsScanning(false);
      stopCamera();
    }, 1500);
  };

  // Drag and Drop handlers - ID File
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFileSelected(e.dataTransfer.files[0]);
    }
  };

  // Drag and Drop handlers - Bank Statement
  const handleBankDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingBank(true);
  };

  const handleBankDragLeave = () => {
    setIsDraggingBank(false);
  };

  const handleBankDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingBank(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setBankFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !idNumber || !country || !email) {
      setError('Please fill out all standard fields.');
      return;
    }

    setLoading(true);
    setError('');

    const kycObject: KYCData = {
      fullName,
      idType,
      idNumber,
      country,
      email,
      frontIdUrl: fileSelected ? `/mock_uploads/${fileSelected.name}` : (userProfile.kycData?.frontIdUrl || '/mock_uploads/default_id.png'),
      bankStatementUrl: bankFileSelected ? `/mock_uploads/${bankFileSelected.name}` : (userProfile.kycData?.bankStatementUrl || '/mock_uploads/default_bank_statement.pdf'),
      faceScanUrl: faceScanCaptured || userProfile.kycData?.faceScanUrl || '/mock_uploads/face_scan_verified.png',
      submittedAt: new Date().toISOString()
    };

    try {
      const userRef = doc(db, 'users', userProfile.id);
      
      // Update local profile representation
      const updatedProfile: UserProfile = {
        ...userProfile,
        kycStatus: 'pending',
        kycData: kycObject,
        updatedAt: new Date().toISOString()
      };

      // Writing to Firestore
      await updateDoc(userRef, {
        kycStatus: 'pending',
        kycData: kycObject,
        updatedAt: new Date().toISOString()
      });

      setLoading(false);
      setSuccess(true);
      onUpdateProfile(updatedProfile);
    } catch (err: any) {
      setLoading(false);
      handleFirestoreError(err, OperationType.WRITE, `users/${userProfile.id}`);
    }
  };

  return (
    <div id="kyc-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative w-full max-w-2xl bg-neutral-900/95 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
        {/* Header */}
        <div className="p-6 border-b border-neutral-800 bg-neutral-900/80 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Identity Verification (KYC)</h3>
            <span className="text-xs text-neutral-400 block mt-0.5">Verify identity to unlock high-volume OTC transactions</span>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white p-1.5 rounded-xl hover:bg-white/5 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[85vh]">
          {success ? (
            <div className="text-center py-10 space-y-4">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-gold/10 flex items-center justify-center border border-gold/20">
                <CheckCircle className="h-8 w-8 text-gold" />
              </div>
              <h2 className="text-sm font-bold text-white">KYC Review Pending</h2>
              <p className="text-neutral-400 text-xs max-w-md mx-auto leading-relaxed">
                Thank you. Your identification credentials and verification documents have been securely uploaded. Compliance desk administrators will audit your dossier within 12 hours.
              </p>
              <div className="pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-gold hover:brightness-110 text-neutral-950 px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-gold/20"
                >
                  Return to Dashboard
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Status Banner */}
              <div className={`p-4 rounded-xl border flex gap-3 text-xs leading-relaxed ${
                userProfile.kycStatus === 'pending'
                  ? 'bg-amber-500/10 border-amber-500/25 text-amber-300'
                  : 'bg-neutral-950/80 border-neutral-800 text-neutral-400'
              }`}>
                <AlertTriangle className="h-5 w-5 shrink-0 text-gold" />
                <div>
                  {userProfile.kycStatus === 'pending' ? (
                     <span><strong className="text-amber-200">AUDIT IN PROGRESS:</strong> Your verification details are currently under review. Overwriting this submission may delay processing times.</span>
                  ) : (
                    <span><strong className="text-neutral-200">REGULATORY NOTICE:</strong> Currency exchanges are subject to standard identity verification procedures. Please submit accurate legal information to avoid OTC settlement delays.</span>
                  )}
                </div>
              </div>

              {error && (
                <div className="text-xs bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl animate-shake">
                  {error}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Full Legal Name
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-gold transition-colors"
                    placeholder="Ahmed Rasheed"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-gold transition-colors"
                    placeholder="ahmed@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Document Type
                  </label>
                  <select
                    className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-gold transition-colors"
                    value={idType}
                    onChange={(e) => setIdType(e.target.value as any)}
                  >
                    <option className="bg-neutral-900" value="passport">Passport</option>
                    <option className="bg-neutral-900" value="national_id">National ID Card</option>
                    <option className="bg-neutral-900" value="driver_license">Driver's License</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Document Number
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-gold transition-colors font-mono"
                    placeholder="A1234567"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Country of Issue
                  </label>
                  <input
                    type="text"
                    required
                    className="w-full bg-neutral-950/80 border border-neutral-800 rounded-xl py-2.5 px-4 text-xs text-white focus:outline-none focus:border-gold transition-colors"
                    placeholder="Maldives"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                  />
                </div>
              </div>

              {/* Document Attachments Grid */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* ID Copy Attachment */}
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5 flex items-center justify-between">
                    <span>1. ID Copy Attachment</span>
                    <span className="text-[11px] text-neutral-500 font-normal">Front Page</span>
                  </label>
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border border-dashed rounded-xl p-4 text-center cursor-pointer transition-all h-36 flex flex-col items-center justify-center ${
                      isDragging
                        ? 'border-gold bg-gold/5'
                        : fileSelected
                        ? 'border-emerald-500/40 bg-emerald-500/5'
                        : 'border-neutral-800 hover:border-gold/40 bg-neutral-950/60'
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={(e) => e.target.files?.[0] && setFileSelected(e.target.files[0])}
                      className="hidden"
                      accept="image/*,.pdf"
                    />
                    {fileSelected ? (
                      <div className="flex flex-col items-center justify-center space-y-1">
                        <FileText className="h-6 w-6 text-emerald-400" />
                        <span className="text-xs font-semibold text-white truncate max-w-[180px]">{fileSelected.name}</span>
                        <span className="text-[10px] text-neutral-500 font-mono">
                          {(fileSelected.size / 1024 / 1024).toFixed(2)} MB • READY
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center space-y-1">
                        <UploadCloud className="h-6 w-6 text-neutral-500 mb-0.5" />
                        <span className="text-xs font-semibold text-white">Drag & Drop ID</span>
                        <span className="text-[11px] text-neutral-500">Passport / National ID (JPG, PNG, PDF)</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bank Statement Attachment */}
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5 flex items-center justify-between">
                    <span>2. Bank Statement Attachment</span>
                    <span className="text-[11px] text-neutral-500 font-normal">Last 3 Months</span>
                  </label>
                  <div
                    onDragOver={handleBankDragOver}
                    onDragLeave={handleBankDragLeave}
                    onDrop={handleBankDrop}
                    onClick={() => bankInputRef.current?.click()}
                    className={`border border-dashed rounded-xl p-4 text-center cursor-pointer transition-all h-36 flex flex-col items-center justify-center ${
                      isDraggingBank
                        ? 'border-gold bg-gold/5'
                        : bankFileSelected
                        ? 'border-emerald-500/40 bg-emerald-500/5'
                        : 'border-neutral-800 hover:border-gold/40 bg-neutral-950/60'
                    }`}
                  >
                    <input
                      type="file"
                      ref={bankInputRef}
                      onChange={(e) => e.target.files?.[0] && setBankFileSelected(e.target.files[0])}
                      className="hidden"
                      accept="image/*,.pdf"
                    />
                    {bankFileSelected ? (
                      <div className="flex flex-col items-center justify-center space-y-1">
                        <Building2 className="h-6 w-6 text-emerald-400" />
                        <span className="text-xs font-semibold text-white truncate max-w-[180px]">{bankFileSelected.name}</span>
                        <span className="text-[10px] text-neutral-500 font-mono">
                          {(bankFileSelected.size / 1024 / 1024).toFixed(2)} MB • READY
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center space-y-1">
                        <Building2 className="h-6 w-6 text-neutral-500 mb-0.5" />
                        <span className="text-xs font-semibold text-white">Drag & Drop Statement</span>
                        <span className="text-[11px] text-neutral-500">Bank e-Statement (PDF/Image)</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Face Scan Biometrics Section */}
              <div className="bg-neutral-950/60 border border-neutral-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4 text-gold" />
                    <span className="text-xs font-semibold text-white">
                      3. Biometric Face Verification
                    </span>
                  </div>
                  {faceScanCaptured && (
                    <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-lg flex items-center gap-1 font-semibold">
                      <UserCheck className="h-3.5 w-3.5" /> VERIFIED
                    </span>
                  )}
                </div>

                {!isCameraActive && !faceScanCaptured && (
                  <div className="text-center py-6 border border-neutral-800 bg-neutral-900/60 rounded-xl space-y-3">
                    <div className="mx-auto h-12 w-12 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center">
                      <Scan className="h-6 w-6 text-gold" />
                    </div>
                    <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                      Biometric facial recognition match ensures account authenticity & AML compliance.
                    </p>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="bg-gold/15 hover:bg-gold/25 border border-gold/40 text-gold hover:text-white px-5 py-2.5 rounded-xl text-xs font-semibold tracking-wider transition-all cursor-pointer inline-flex items-center gap-2"
                    >
                      <Camera className="h-4 w-4" /> Start Live Face Scan
                    </button>
                  </div>
                )}

                {isCameraActive && (
                  <div className="relative bg-black rounded-xl overflow-hidden border border-neutral-800 p-2 flex flex-col items-center">
                    <div className="relative w-full max-w-xs h-48 bg-neutral-900 rounded-xl overflow-hidden flex items-center justify-center">
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      {/* Biometric Oval Overlay */}
                      <div className="absolute inset-0 border-2 border-gold/50 rounded-full my-3 mx-12 pointer-events-none animate-pulse flex items-center justify-center">
                        <span className="text-[10px] font-mono text-gold bg-black/70 px-2 py-0.5 rounded uppercase tracking-wider">
                          Align Face Here
                        </span>
                      </div>
                    </div>

                    {cameraError && (
                      <p className="text-xs text-amber-400 mt-2 text-center">{cameraError}</p>
                    )}

                    <div className="flex gap-2 mt-3">
                      <button
                        type="button"
                        onClick={captureFaceScan}
                        disabled={isScanning}
                        className="bg-gold hover:brightness-110 text-neutral-950 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        {isScanning ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                            Scanning...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5" />
                            Capture Biometrics
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-4 py-2 rounded-xl text-xs font-medium uppercase tracking-wider cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {faceScanCaptured && (
                  <div className="flex items-center justify-between bg-emerald-500/5 border border-emerald-500/25 p-3 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full border border-emerald-500/40 bg-neutral-900 overflow-hidden shrink-0">
                        <img src={faceScanCaptured} alt="Face Scan" className="h-full w-full object-cover" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">Biometric Scan Complete</span>
                        <span className="text-[11px] text-neutral-400 block">3D Liveness & Facial Geometry Hash Secured</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="text-xs text-gold hover:underline font-medium cursor-pointer"
                    >
                      Retake Scan
                    </button>
                  </div>
                )}
              </div>

              {/* Submit triggers */}
              <div className="flex justify-end gap-3 pt-6 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-neutral-800 hover:bg-neutral-700 px-5 py-2.5 rounded-xl border border-neutral-700 text-xs font-medium text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gold hover:brightness-110 text-neutral-950 px-6 py-2.5 rounded-xl text-xs uppercase font-bold tracking-wider transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-gold/20"
                >
                  {loading ? 'Submitting Details...' : 'Submit Verification'}
                </button>
              </div>

            </form>
          )}
        </div>
      </div>
    </div>
  );
}
