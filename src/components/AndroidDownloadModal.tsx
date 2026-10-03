import React, { useState } from 'react';
import { usePWAInstall } from './usePWAInstall';
import {
  Download,
  Smartphone,
  Check,
  Copy,
  ExternalLink,
  Sparkles,
  X,
  Share2,
  ShieldCheck,
  Zap,
  BellRing,
} from 'lucide-react';

interface AndroidDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidDownloadModal: React.FC<AndroidDownloadModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [copiedLink, setCopiedLink] = useState(false);
  const [installing, setInstalling] = useState(false);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : 'https://betweenus.app';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleDirectInstall = async () => {
    setInstalling(true);
    try {
      if (isInstallable) {
        const success = await install();
        if (success) {
          onClose();
        }
      }
    } finally {
      setInstalling(false);
    }
  };

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(
      `❤️ Hey love! Download our private BetweenUs couple app on your Android phone here: ${currentUrl}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const openInChromeIntent = () => {
    if (typeof window !== 'undefined') {
      const hostPath = `${window.location.host}${window.location.pathname}`;
      const intentUrl = `intent://${hostPath}#Intent;scheme=https;package=com.android.chrome;end`;
      window.location.href = intentUrl;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-rose-100 max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Android Header Badge */}
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white mb-3 shadow-lg shadow-emerald-500/25 ring-4 ring-emerald-50">
            <Smartphone className="w-8 h-8" />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-extrabold uppercase tracking-wider border border-emerald-200 mb-1">
            <Zap className="w-3 h-3 text-emerald-600 fill-emerald-600" />
            <span>Fast Android Install</span>
          </span>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">
            Download on Android
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
            Install <strong className="text-slate-700">BetweenUs</strong> directly onto your Android home screen as a standalone application.
          </p>
        </div>

        {/* Primary 1-Tap Download Button */}
        <div className="mt-5 space-y-2.5">
          {isInstallable ? (
            <button
              onClick={handleDirectInstall}
              disabled={installing}
              className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/30 hover:from-emerald-500 hover:to-teal-500 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-5 h-5 animate-bounce" />
              <span>{installing ? 'Opening Android Prompt...' : '1-TAP DOWNLOAD & INSTALL'}</span>
            </button>
          ) : (
            <button
              onClick={openInChromeIntent}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold text-xs shadow-md hover:from-emerald-500 hover:to-teal-500 active:scale-95 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open in Android Chrome to Install</span>
            </button>
          )}

          {/* Quick Share to Partner via WhatsApp */}
          <button
            onClick={shareViaWhatsApp}
            className="w-full py-2.5 px-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs border border-emerald-200 transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-emerald-600" />
            <span>Send Download Link on WhatsApp</span>
          </button>
        </div>

        {/* 3 Simple Steps for Android Chrome */}
        <div className="mt-5 pt-4 border-t border-slate-100 space-y-2.5">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block px-1">
            Manual 3-Step Guide (Chrome / Samsung)
          </span>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-start gap-3 text-xs">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-black flex items-center justify-center text-[11px] shrink-0">
              1
            </span>
            <div>
              <strong className="text-slate-800 block">Open in Chrome Browser</strong>
              <span className="text-[11px] text-slate-500">
                Ensure BetweenUs is open in Google Chrome on your Android device.
              </span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-start gap-3 text-xs">
            <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-black flex items-center justify-center text-[11px] shrink-0">
              2
            </span>
            <div>
              <strong className="text-slate-800 block">Tap Menu (⋮ 3 Dots)</strong>
              <span className="text-[11px] text-slate-500">
                Tap the three dots in the top-right corner of Google Chrome.
              </span>
            </div>
          </div>

          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200/80 flex items-start gap-3 text-xs">
            <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-black flex items-center justify-center text-[11px] shrink-0">
              3
            </span>
            <div>
              <strong className="text-emerald-950 block">Tap "Install app" or "Add to Home screen"</strong>
              <span className="text-[11px] text-emerald-700">
                The BetweenUs app icon will appear instantly on your Android phone's home screen!
              </span>
            </div>
          </div>
        </div>

        {/* Why Install Highlights */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] text-slate-600">
          <div className="p-2 rounded-xl bg-rose-50/60 border border-rose-100 flex items-center gap-1.5">
            <BellRing className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <span className="font-semibold">Instant Alert Sirens</span>
          </div>
          <div className="p-2 rounded-xl bg-teal-50/60 border border-teal-100 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600 shrink-0" />
            <span className="font-semibold">Full Offline Mode</span>
          </div>
        </div>

        {/* Copy Link Row */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
            <input
              type="text"
              readOnly
              value={currentUrl}
              className="bg-transparent text-[11px] text-slate-600 px-2 flex-1 outline-hidden select-all font-mono"
            />
            <button
              onClick={handleCopyLink}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 ${
                copiedLink
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={onClose}
          className="mt-4 w-full py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition"
        >
          Close
        </button>
      </div>
    </div>
  );
};
