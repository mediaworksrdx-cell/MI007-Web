'use client';

import React, { useState, useEffect } from 'react';
import { Falcon3DLogo } from '@/components/3d/logos/Falcon3DLogo';
import { saveUserAccount, UserAccount } from '@/lib/auth/userAccount';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: (user: UserAccount) => void;
  initialMode?: 'signin' | 'signup';
}

const COUNTRY_CODES = [
  { code: '+91', label: '🇮🇳 India (+91)' },
  { code: '+1',  label: '🇺🇸 USA / Canada (+1)' },
  { code: '+44', label: '🇬🇧 UK (+44)' },
  { code: '+971', label: '🇦🇪 UAE (+971)' },
  { code: '+65', label: '🇸🇬 Singapore (+65)' },
  { code: '+49', label: '🇩🇪 Germany (+49)' },
  { code: '+81', label: '🇯🇵 Japan (+81)' },
  { code: '+61', label: '🇦🇺 Australia (+61)' },
];

export function LoginModal({
  isOpen,
  onClose,
  onLoginSuccess,
  initialMode = 'signup',
}: LoginModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [signInMethod, setSignInMethod] = useState<'otp' | 'password'>('otp');

  // Registration Fields
  const [name, setName] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // WhatsApp OTP Verification state inside modal
  const [otpChallengeId, setOtpChallengeId] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // General Status
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successUser, setSuccessUser] = useState<UserAccount | null>(null);

  const fullPhone = `${countryCode}${phoneDigits.trim().replace(/^0+/, '')}`;

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setSuccessUser(null);
      // Pre-fill phone if saved in localStorage
      if (typeof window !== 'undefined') {
        const savedPhone = localStorage.getItem('mi007_whatsapp_phone_v1');
        if (savedPhone) {
          const matchedCountry = COUNTRY_CODES.find((c) => savedPhone.startsWith(c.code));
          if (matchedCountry) {
            setCountryCode(matchedCountry.code);
            setPhoneDigits(savedPhone.slice(matchedCountry.code.length));
          } else {
            setPhoneDigits(savedPhone.replace(/[^0-9]/g, ''));
          }
        }
        if (localStorage.getItem('mi007_whatsapp_verified_v1') === 'true') {
          setOtpVerified(true);
        }
      }
    }
  }, [isOpen]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // 1. Dispatch WhatsApp OTP
  const handleSendWhatsAppOtp = async () => {
    setErrorMessage(null);
    const cleanNumber = fullPhone.replace(/[\s+()\-]/g, '');
    if (cleanNumber.length < 9) {
      setErrorMessage('Please enter a valid mobile number.');
      return;
    }

    setOtpLoading(true);
    try {
      const res = await fetch('/api/v1/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination: fullPhone,
          channel: 'whatsapp',
          purpose: mode === 'signup' ? 'registration' : 'login',
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setOtpChallengeId(data.challenge_id);
        setOtpSent(true);
        setCooldown(data.cooldown || 60);
      } else {
        setErrorMessage(data.error || 'Failed to send WhatsApp verification code. Please check your number.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Network error sending WhatsApp OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  // 2. Verify WhatsApp OTP
  const handleVerifyOtp = async () => {
    setErrorMessage(null);
    const code = otpInput.trim().replace(/[^0-9]/g, '');
    if (code.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit code.');
      return;
    }

    setOtpLoading(true);
    try {
      const res = await fetch('/api/v1/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challenge_id: otpChallengeId || '',
          otp: code,
          destination: fullPhone,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok && data.verified) {
        setOtpVerified(true);
        setOtpSent(false);
        setOtpInput('');

        // If signing in via OTP, finish login immediately!
        if (mode === 'signin' && signInMethod === 'otp') {
          handleFinishLogin({
            id: `ACC-${Date.now().toString(36).toUpperCase()}`,
            name: name || 'MI-007 Trader',
            email: email || `${fullPhone.replace(/[^0-9]/g, '')}@mi007.terminal`,
            phone: fullPhone,
            phoneVerified: true,
            role: 'Pro Trader',
            deskId: `DESK-${Math.floor(100 + Math.random() * 900)}`,
            createdAt: new Date().toISOString(),
          });
        }
      } else {
        setErrorMessage(data.error || 'Invalid OTP code. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to verify OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  // 3. Handle Registration Submission
  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: fullPhone,
          email: email.trim().toLowerCase(),
          password,
          phoneVerified: otpVerified,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok && data.user) {
        handleFinishLogin(data.user);
      } else {
        setErrorMessage(data.error || 'Failed to register account.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Registration request failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Handle Sign In Submission (Email/Password)
  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'email_password',
          email: email.trim().toLowerCase(),
          password,
          phone: fullPhone,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok && data.user) {
        handleFinishLogin(data.user);
      } else {
        setErrorMessage(data.error || 'Invalid email or password.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Login request failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Complete Login & Sync
  const handleFinishLogin = (user: UserAccount) => {
    saveUserAccount(user);
    setSuccessUser(user);
    setTimeout(() => {
      onLoginSuccess?.(user);
      onClose();
    }, 1200);
  };

  // 6. One-Click Demo Login
  const handleDemoLogin = () => {
    const demoUser: UserAccount = {
      id: 'ACC-DEMO-007',
      name: 'Alpha Quant Desk',
      email: 'trader@synthetixanalytics.com',
      phone: '+15550100200',
      phoneVerified: true,
      role: 'Tier-1 Institutional',
      deskId: 'HQ-DESK-007',
      createdAt: new Date().toISOString(),
    };
    handleFinishLogin(demoUser);
  };

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-[460px] rounded-2xl border border-gray-200 bg-white text-gray-900 p-6 sm:p-7 shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          type="button"
          aria-label="Close"
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className="relative mb-2 flex items-center justify-center h-12 w-12">
            <Falcon3DLogo
              src="/images/logo-falcon-transparent.png"
              alt="MI-007 Falcon"
              width={46}
              height={46}
              priority
              className="object-contain"
              popoutScale={1.08}
            />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-gray-900 font-sans">
            Market Intelligence MI-007
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Institutional Smart Money Concepts &amp; Real-Time Trade Alerts
          </p>
        </div>

        {/* Clean Mode Switcher: Sign In vs Create Account */}
        <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-lg mb-5 text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMessage(null);
            }}
            className={`py-2 rounded-md transition-all cursor-pointer ${
              mode === 'signup'
                ? 'bg-white text-gray-900 font-semibold shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMessage(null);
            }}
            className={`py-2 rounded-md transition-all cursor-pointer ${
              mode === 'signin'
                ? 'bg-white text-gray-900 font-semibold shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Sign In
          </button>
        </div>

        {/* Continue with Google OAuth */}
        {!successUser && (
          <div className="mb-4">
            <a
              href="/api/v1/auth/google"
              className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 text-xs font-semibold shadow-xs transition-colors"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z" />
                <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z" />
              </svg>
              <span>Continue with Google</span>
            </a>
            <div className="relative flex items-center justify-center my-3">
              <div className="border-t border-gray-200 w-full" />
              <span className="bg-white px-2.5 text-[10px] uppercase tracking-wider text-gray-400 font-medium">
                or
              </span>
              <div className="border-t border-gray-200 w-full" />
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
            <span className="shrink-0 mt-0.5">⚠️</span>
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        {/* Success Screen */}
        {successUser ? (
          <div className="py-6 flex flex-col items-center text-center animate-in fade-in">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-2xl font-bold mb-3">
              ✓
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">
              Welcome, {successUser.name}!
            </h3>
            <p className="text-xs text-gray-500">
              Account connected. Launching terminal alerts...
            </p>
          </div>
        ) : mode === 'signup' ? (
          /* ───────── CREATE ACCOUNT FORM ───────── */
          <form onSubmit={handleSignUpSubmit} className="space-y-3.5">
            {/* Full Name */}
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Darshan"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-xs focus:outline-none focus:border-gray-500"
              />
            </div>

            {/* Mobile Number with WhatsApp Verification */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium text-gray-700">
                  Mobile Number (WhatsApp)
                </label>
                {otpVerified && (
                  <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                    <span>✓</span> Verified on WhatsApp
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-32 px-2 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-xs focus:outline-none focus:border-gray-500"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  required
                  value={phoneDigits}
                  onChange={(e) => {
                    setPhoneDigits(e.target.value);
                    if (otpVerified) setOtpVerified(false);
                  }}
                  placeholder="9876543210"
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-xs font-mono focus:outline-none focus:border-gray-500"
                />
              </div>

              {/* Inline OTP Verification Area */}
              {!otpVerified && (
                <div className="mt-2">
                  {otpSent ? (
                    <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 space-y-2">
                      <div className="text-[11px] text-gray-600 flex items-center justify-between">
                        <span>Enter 6-digit WhatsApp code:</span>
                        <button
                          type="button"
                          onClick={handleSendWhatsAppOtp}
                          disabled={otpLoading || cooldown > 0}
                          className="text-gray-500 hover:text-gray-800 underline disabled:opacity-50 text-[10px] cursor-pointer"
                        >
                          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend'}
                        </button>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="● ● ● ● ● ●"
                          value={otpInput}
                          onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                          className="w-32 text-center px-2 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-900 text-base font-mono font-bold tracking-wider"
                        />
                        <button
                          type="button"
                          onClick={handleVerifyOtp}
                          disabled={otpLoading || otpInput.trim().length !== 6}
                          className="px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-black text-white text-xs font-medium disabled:opacity-40 cursor-pointer"
                        >
                          {otpLoading ? 'Verifying...' : 'Verify Code'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendWhatsAppOtp}
                      disabled={otpLoading}
                      className="text-[11px] text-gray-600 hover:text-black font-medium underline cursor-pointer"
                    >
                      {otpLoading ? 'Sending Code...' : '📲 Verify Mobile with WhatsApp OTP'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-xs focus:outline-none focus:border-gray-500"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-medium text-gray-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[10px] text-gray-500 hover:text-gray-800"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-xs focus:outline-none focus:border-gray-500"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-lg bg-gray-900 hover:bg-black text-white text-xs font-medium transition-all cursor-pointer disabled:opacity-50 shadow-xs"
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>
          </form>
        ) : (
          /* ───────── SIGN IN FORM ───────── */
          <div className="space-y-4">
            {/* Method Toggle: WhatsApp OTP vs Email/Password */}
            <div className="flex items-center justify-center gap-4 text-xs border-b border-gray-100 pb-2">
              <button
                type="button"
                onClick={() => setSignInMethod('otp')}
                className={`pb-1 cursor-pointer transition-colors ${
                  signInMethod === 'otp'
                    ? 'font-bold text-gray-900 border-b-2 border-gray-900'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                WhatsApp Mobile OTP
              </button>
              <button
                type="button"
                onClick={() => setSignInMethod('password')}
                className={`pb-1 cursor-pointer transition-colors ${
                  signInMethod === 'password'
                    ? 'font-bold text-gray-900 border-b-2 border-gray-900'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Email &amp; Password
              </button>
            </div>

            {signInMethod === 'otp' ? (
              /* Sign In via WhatsApp OTP */
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">
                    Registered Mobile Number
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={countryCode}
                      onChange={(e) => setCountryCode(e.target.value)}
                      className="w-32 px-2 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-xs focus:outline-none"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      value={phoneDigits}
                      onChange={(e) => setPhoneDigits(e.target.value)}
                      placeholder="9876543210"
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-xs font-mono"
                    />
                  </div>
                </div>

                {otpSent ? (
                  <div className="p-3.5 rounded-lg bg-gray-50 border border-gray-200 space-y-2.5 text-center">
                    <div className="text-xs font-medium text-gray-800">
                      Enter 6-Digit WhatsApp Code
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Sent to <strong>{fullPhone}</strong>
                    </p>
                    <div className="flex justify-center gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="● ● ● ● ● ●"
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                        className="w-36 text-center px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-900 text-base font-mono font-bold tracking-widest"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={otpLoading || otpInput.trim().length !== 6}
                        className="px-3.5 py-1.5 rounded-lg bg-gray-900 hover:bg-black text-white text-xs font-medium cursor-pointer disabled:opacity-40"
                      >
                        {otpLoading ? 'Verifying...' : 'Sign In'}
                      </button>
                    </div>
                    <div className="text-[11px] pt-1 border-t border-gray-200 flex justify-between">
                      <button
                        type="button"
                        onClick={handleSendWhatsAppOtp}
                        disabled={otpLoading || cooldown > 0}
                        className="text-gray-500 hover:text-gray-800 underline text-[10px]"
                      >
                        {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setOtpSent(false)}
                        className="text-gray-400 hover:text-red-600 text-[10px]"
                      >
                        Change Number
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendWhatsAppOtp}
                    disabled={otpLoading}
                    className="w-full py-2.5 rounded-lg bg-gray-900 hover:bg-black text-white text-xs font-medium transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    {otpLoading ? 'Sending WhatsApp Code...' : 'Send WhatsApp Login Code'}
                  </button>
                )}
              </div>
            ) : (
              /* Sign In via Email & Password */
              <form onSubmit={handleSignInSubmit} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-xs focus:outline-none focus:border-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-xs focus:outline-none focus:border-gray-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-lg bg-gray-900 hover:bg-black text-white text-xs font-medium transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </button>
              </form>
            )}

            {/* Instant Demo Access Button */}
            <div className="pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={handleDemoLogin}
                className="w-full py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 text-xs font-medium transition-all cursor-pointer"
              >
                Instant Demo Access (One-Click)
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
          <span>Synthetix Analytics</span>
          <span>End-to-End Encrypted</span>
        </div>
      </div>
    </div>
  );
}
