import React, { useState } from 'react';
import { Heart, Copy, Check, Share2, Sparkles, LogOut, ArrowRight, AlertCircle, Link2, Loader2, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const CouplePairingView: React.FC = () => {
  const { currentUser, couple, pairWithPartnerCode, logOutFirebase, enterDemoMode } = useApp();
  const [partnerCodeInput, setPartnerCodeInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState<string | null>(null);

  const myCode = currentUser.coupleCode || couple?.code || 'PAIR-LOVE';

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(myCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Copy failed:', err);
    }
  };

  const handleShareWhatsApp = () => {
    const appUrl = window.location.origin;
    const message = `Hey my love! ❤️ Join me on BetweenUs so we can chat, share moods, and track distance in our private space.\n\nUse our private couple code: ${myCode}\n\nOpen BetweenUs here: ${appUrl}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: 'BetweenUs Couple Space',
        text: message,
        url: appUrl,
      }).catch(() => {
        const opened = window.open(whatsappUrl, '_blank');
        if (!opened) window.location.href = whatsappUrl;
      });
    } else {
      const opened = window.open(whatsappUrl, '_blank');
      if (!opened) window.location.href = whatsappUrl;
    }
  };

  const handlePairSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkError(null);
    setLinkSuccess(null);

    const clean = partnerCodeInput.trim().toUpperCase();
    if (!clean) {
      setLinkError('Please enter a couple code.');
      return;
    }

    if (clean === myCode.toUpperCase()) {
      setLinkError("That's your own code! Please enter your partner's code to link with them.");
      return;
    }

    setIsLinking(true);
    try {
      const res = await pairWithPartnerCode(clean);
      if (!res.success) {
        setLinkError(res.message || 'Could not link with this code. Please verify and try again.');
      } else {
        setLinkSuccess(res.message);
      }
    } catch (err: any) {
      setLinkError(err?.message || 'Error linking accounts. Please try again.');
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-pink-50 flex flex-col justify-between p-4 sm:p-6">
      {/* Top Header & Account Identity */}
      <header className="w-full max-w-md mx-auto pt-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center font-black shadow-md shadow-rose-200">
            {currentUser.avatarUrl && currentUser.avatarUrl !== '/app-logo.svg' ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-full h-full rounded-2xl object-cover"
              />
            ) : (
              <span>{currentUser.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div>
            <div className="text-xs font-black text-slate-800 flex items-center gap-1">
              <span>{currentUser.name}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-[10px] text-slate-500 truncate max-w-[160px]">
              {currentUser.email}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={logOutFirebase}
          className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-red-600 bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 px-3 py-1.5 rounded-xl transition cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </button>
      </header>

      {/* Main Pairing Workspace */}
      <main className="w-full max-w-md mx-auto my-6 space-y-5">
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-[11px] font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Connect Accounts</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Link with Your Partner
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
            BetweenUs is an exclusive private space for just the two of you. Use either person&apos;s code to connect!
          </p>
        </div>

        {linkError && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{linkError}</div>
          </div>
        )}

        {linkSuccess && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 animate-in fade-in">
            <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
            <div className="flex-1 font-semibold">{linkSuccess}</div>
          </div>
        )}

        {/* Option 1: Your Specific Couple Code */}
        <div className="bg-white rounded-3xl p-5 border border-rose-100 shadow-md shadow-rose-100/40 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
              Option 1: Share Your Code
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Your personal code</span>
          </div>

          <div className="bg-gradient-to-r from-rose-50 via-pink-50 to-amber-50 rounded-2xl p-4 border border-rose-200/60 text-center my-3">
            <div className="text-[11px] text-slate-600 font-semibold mb-1">Your Couple Code</div>
            <div className="text-2xl sm:text-3xl font-black tracking-widest text-slate-900 font-mono select-all">
              {myCode}
            </div>
            <div className="text-[10px] text-rose-600 font-medium mt-1 flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
              <span>Waiting for partner to enter this code</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3">
            <button
              type="button"
              onClick={handleCopyCode}
              className="py-2.5 px-3 rounded-xl border border-slate-200 hover:border-rose-400 bg-white hover:bg-rose-50/50 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy Code</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Send on WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-slate-200 w-full" />
          <span className="bg-gradient-to-b from-rose-50 to-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            or
          </span>
        </div>

        {/* Option 2: Enter Partner's Code */}
        <div className="bg-white rounded-3xl p-5 border border-rose-100 shadow-md shadow-rose-100/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
              Option 2: Enter Partner&apos;s Code
            </span>
            <span className="text-[10px] text-slate-400 font-medium">Link instantly</span>
          </div>

          <p className="text-xs text-slate-600 mb-3 leading-relaxed">
            If your partner sent you their code, enter it below to join their space:
          </p>

          <form onSubmit={handlePairSubmit} className="space-y-3">
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. PAIR-7K9A"
                value={partnerCodeInput}
                onChange={(e) => setPartnerCodeInput(e.target.value.toUpperCase())}
                maxLength={15}
                className="w-full uppercase text-center font-mono tracking-widest font-black text-lg py-3 px-4 rounded-2xl border-2 border-slate-200 focus:outline-hidden focus:border-rose-500 bg-slate-50/50"
              />
            </div>

            <button
              type="submit"
              disabled={isLinking || !partnerCodeInput.trim()}
              className="w-full py-3.5 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:to-pink-600 active:scale-[0.98] text-white rounded-2xl font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLinking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting with your partner...</span>
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4" />
                  <span>Link Our Accounts & Begin ❤️</span>
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="w-full max-w-md mx-auto text-center pb-2">
        <button
          type="button"
          onClick={enterDemoMode}
          className="text-xs text-slate-400 hover:text-rose-600 underline cursor-pointer"
        >
          View Demo Space while waiting
        </button>
      </footer>
    </div>
  );
};
