import React, { useState } from 'react';
import { Heart, Sparkles, Mail, Lock, AlertCircle, ArrowRight, ShieldCheck, MapPin, MessageCircleHeart, ExternalLink, Copy, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import firebaseConfig from '../../firebase-applet-config.json';

export const AuthScreen: React.FC = () => {
  const { loginWithGoogle, loginWithEmail, registerWithEmail, enterDemoMode, pendingInviteCode } = useApp();
  const [isEmailMode, setIsEmailMode] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedDomain, setCopiedDomain] = useState(false);

  const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'between-us-seven-kappa.vercel.app';
  const prodHost = 'between-us-seven-kappa.vercel.app';

  const [copiedProd, setCopiedProd] = useState(false);
  const [copiedCurrent, setCopiedCurrent] = useState(false);

  const handleCopyProd = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(prodHost);
      setCopiedProd(true);
      setTimeout(() => setCopiedProd(false), 2500);
    }
  };

  const handleCopyCurrent = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentHost);
      setCopiedCurrent(true);
      setTimeout(() => setCopiedCurrent(false), 2500);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await loginWithGoogle();
      if (!res.success && res.error) {
        setError(res.error);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to sign in with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        const res = await registerWithEmail(email, password, name);
        if (!res.success && res.error) {
          setError(res.error);
        }
      } else {
        const res = await loginWithEmail(email, password);
        if (!res.success && res.error) {
          setError(res.error);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillQuickTestCredentials = () => {
    setEmail('teja@betweenus.love');
    setPassword('betweenus2026');
    setName('Teja');
    setIsEmailMode(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-pink-50 flex flex-col justify-between p-4 sm:p-6">
      {/* Brand Hero */}
      <div className="w-full max-w-md mx-auto pt-6 sm:pt-10 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-tr from-rose-500 via-pink-500 to-rose-400 text-white shadow-xl shadow-rose-200/80 mb-5 relative group">
          <Heart className="w-10 h-10 fill-white animate-pulse" />
          <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-400 text-slate-900 text-xs font-black flex items-center justify-center shadow-xs">
            ✨
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Between<span className="text-rose-600">Us</span>
        </h1>
        <p className="text-sm sm:text-base font-black text-rose-600 uppercase tracking-wider mt-1">
          TEJA and AKHILA
        </p>
        <p className="text-xs sm:text-sm font-semibold text-rose-600 mt-1">
          Your Private Long-Distance Haven
        </p>
        <p className="text-xs text-slate-500 mt-2 max-w-xs mx-auto leading-relaxed">
          Sign in to connect exclusively with your partner across Indian cities with live chat, distance radar, and shared memories.
        </p>

        {/* Feature Highlights */}
        <div className="grid grid-cols-3 gap-2 mt-6 max-w-sm mx-auto text-left">
          <div className="p-2.5 rounded-2xl bg-white border border-rose-100 shadow-2xs">
            <MessageCircleHeart className="w-4 h-4 text-rose-500 mb-1" />
            <div className="text-[11px] font-bold text-slate-800">Private Chat</div>
            <div className="text-[9px] text-slate-500">Encrypted space</div>
          </div>
          <div className="p-2.5 rounded-2xl bg-white border border-rose-100 shadow-2xs">
            <MapPin className="w-4 h-4 text-rose-500 mb-1" />
            <div className="text-[11px] font-bold text-slate-800">Live Distance</div>
            <div className="text-[9px] text-slate-500">KM & Timezones</div>
          </div>
          <div className="p-2.5 rounded-2xl bg-white border border-rose-100 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-rose-500 mb-1" />
            <div className="text-[11px] font-bold text-slate-800">Couple Code</div>
            <div className="text-[9px] text-slate-500">2-Partner Link</div>
          </div>
        </div>
      </div>

      {/* Main Auth Actions Container */}
      <div className="w-full max-w-md mx-auto my-6 bg-white/90 backdrop-blur-md rounded-3xl p-6 sm:p-7 border border-rose-100 shadow-xl shadow-rose-100/50">
        {pendingInviteCode && (
          <div className="mb-5 p-3.5 rounded-2xl bg-gradient-to-r from-rose-500/10 via-pink-500/10 to-rose-500/10 border border-rose-300 text-slate-800 text-xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
              💌
            </div>
            <div className="flex-1">
              <p className="font-bold text-rose-900">Partner Invitation Detected</p>
              <p className="text-[11px] text-slate-600">
                You've been invited with code <span className="font-mono font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-md">{pendingInviteCode}</span>! Sign in below to automatically connect.
              </p>
            </div>
          </div>
        )}
        {error && (
          error.includes('unauthorized-domain') ? (
            <div className="mb-5 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs space-y-3.5 animate-in fade-in shadow-xs">
              <div className="flex items-center gap-2 font-bold text-amber-900 text-sm">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Domain Not Authorized in Firebase</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Google Sign-In is blocked until this domain is added to <strong>Authorized Domains</strong> in your Firebase Console:
              </p>
              
              {/* Production Domain chip with 1-click copy */}
              <div className="p-2.5 bg-amber-100/90 border border-amber-300/80 rounded-xl space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-semibold text-amber-900">
                  <span>Production Domain (Recommended):</span>
                  {currentHost === prodHost && (
                    <span className="text-[9px] bg-amber-200/90 text-amber-900 font-bold px-1.5 py-0.5 rounded">Active</span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <code className="text-[11px] font-mono font-bold text-amber-950 break-all select-all">
                    {prodHost}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyProd}
                    className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-bold text-[10px] shadow-2xs transition active:scale-95 cursor-pointer"
                  >
                    {copiedProd ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-300" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Domain</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Current preview host chip if different */}
              {currentHost !== prodHost && (
                <div className="p-2 bg-white/80 border border-amber-200 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-[9px] text-amber-900 font-medium">
                    <span>Current Deployment URL:</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-[10px] font-mono text-slate-700 break-all select-all">
                      {currentHost}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyCurrent}
                      className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[9px] transition cursor-pointer"
                    >
                      {copiedCurrent ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}

              {/* 30-second fix steps */}
              <div className="text-[10px] text-amber-900/90 space-y-1 bg-white/70 p-2.5 rounded-xl border border-amber-200">
                <p className="font-bold text-amber-950">How to authorize in 30 seconds:</p>
                <ol className="list-decimal list-inside space-y-0.5 text-amber-900">
                  <li>Click <strong>Copy Domain</strong> above.</li>
                  <li>Click <strong>Open Firebase Settings</strong> below.</li>
                  <li>Scroll to <strong>Authorized domains</strong> → <strong>Add domain</strong> → Paste & Save.</li>
                </ol>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <a
                  href={`https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition"
                >
                  <span>Open Firebase Settings</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                {/* Instant Bypass Options */}
                <div className="pt-2 border-t border-amber-200/80">
                  <p className="text-[10px] font-bold text-amber-950 mb-1.5 text-center">
                    Or sign in immediately without waiting:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEmailMode(true);
                        setError(null);
                      }}
                      className="inline-flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 font-bold text-[11px] shadow-2xs transition cursor-pointer"
                    >
                      <Mail className="w-3 h-3" />
                      <span>Use Email Sign-In</span>
                    </button>
                    <button
                      type="button"
                      onClick={enterDemoMode}
                      className="inline-flex items-center justify-center gap-1 py-2 px-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] shadow-2xs transition cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>1-Click Demo Mode</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{error}</div>
            </div>
          )
        )}

        {/* Google Primary Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 active:scale-[0.98] border-2 border-slate-200 hover:border-rose-400 py-3.5 px-4 rounded-2xl font-bold text-slate-800 text-sm shadow-sm hover:shadow transition disabled:opacity-60 cursor-pointer"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{loading ? 'Connecting with Google...' : 'Continue with Google'}</span>
        </button>

        {/* Divider */}
        <div className="relative my-4 flex items-center justify-center">
          <div className="border-t border-slate-200 w-full" />
          <span className="bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            or email
          </span>
        </div>

        {/* Toggle Email Mode & Quick Access */}
        {!isEmailMode ? (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setIsEmailMode(true)}
              className="w-full py-2.5 px-3 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50/50 hover:border-rose-200 transition text-center cursor-pointer"
            >
              Sign in with email and password
            </button>
            <button
              type="button"
              onClick={enterDemoMode}
              className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-rose-50 to-pink-50 hover:from-rose-100 hover:to-pink-100 border border-rose-200 text-xs font-bold text-rose-700 transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-rose-500" />
              <span>Instant Demo Sanctuary (Teja & Akhila)</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleEmailAuth} className="space-y-3">
            {isRegister && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Your Name</label>
                <input
                  type="text"
                  placeholder="e.g. Rahul or Sneha"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-rose-500 text-xs font-medium"
                />
              </div>
            )}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-rose-500 text-xs font-medium"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-rose-500 text-xs font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-2xl font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Please wait...' : isRegister ? 'Create Your Account' : 'Sign In'}
            </button>

            <div className="flex items-center justify-between text-[11px] pt-1">
              <button
                type="button"
                onClick={() => setIsRegister(!isRegister)}
                className="text-rose-600 hover:underline font-semibold cursor-pointer"
              >
                {isRegister ? 'Already have an account? Sign In' : 'Need an account? Register'}
              </button>
              <button
                type="button"
                onClick={() => setIsEmailMode(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                Hide
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setEmail('teja@betweenus.love');
                  setPassword('betweenus2026');
                  setName('Teja');
                  setIsEmailMode(true);
                }}
                className="py-1.5 px-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-[10px] font-bold transition text-center cursor-pointer shadow-2xs"
              >
                👦 Test as TEJA
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('akhila@betweenus.love');
                  setPassword('betweenus2026');
                  setName('Akhila');
                  setIsEmailMode(true);
                }}
                className="py-1.5 px-2 rounded-xl bg-pink-50 hover:bg-pink-100 border border-pink-200 text-pink-700 text-[10px] font-bold transition text-center cursor-pointer shadow-2xs"
              >
                👧 Test as AKHILA
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Footer / Demo Mode Access */}
      <div className="w-full max-w-md mx-auto text-center pb-4">
        <button
          type="button"
          onClick={enterDemoMode}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600 bg-white/80 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 px-4 py-2 rounded-full shadow-2xs transition cursor-pointer"
        >
          <span>Just exploring? Try Demo Mode</span>
          <ArrowRight className="w-3 h-3" />
        </button>
        <p className="text-[10px] text-slate-400 mt-3">
          Protected by Google Firebase Authentication & Cloud Firestore.
        </p>
        <p className="text-[10px] font-bold text-rose-500 mt-1">
          BetweenUs • starts with TEJA and AKHILA
        </p>
      </div>
    </div>
  );
};
