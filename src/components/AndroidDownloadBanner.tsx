import React, { useState, useEffect } from 'react';
import { usePWAInstall } from './usePWAInstall';
import { AndroidDownloadModal } from './AndroidDownloadModal';
import { Download, Smartphone, X, Zap } from 'lucide-react';

export const AndroidDownloadBanner: React.FC = () => {
  const { isInstalled, isInstallable, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem('betweenus_android_banner_dismissed');
    if (dismissed) {
      setIsDismissed(true);
    }
  }, []);

  // Do not display if already running as an installed PWA or user dismissed for this session
  if (isInstalled || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('betweenus_android_banner_dismissed', 'true');
  };

  const handleClickDownload = async () => {
    if (isInstallable) {
      const res = await install();
      if (!res) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-4 text-white shadow-lg shadow-emerald-900/15 border border-emerald-400/30">
        {/* Soft background glow */}
        <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white text-emerald-700 flex items-center justify-center shrink-0 shadow-md">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-100 bg-emerald-800/60 px-2 py-0.2 rounded-full border border-emerald-300/30 flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5 fill-emerald-300 text-emerald-300" />
                  <span>Android App</span>
                </span>
              </div>
              <h4 className="text-sm font-extrabold text-white mt-0.5 leading-tight">
                Install on Your Android Phone
              </h4>
              <p className="text-[11px] text-emerald-100/90 leading-tight">
                One-tap install for full-screen view & faster alerts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleClickDownload}
              className="px-3.5 py-2 rounded-xl bg-white text-emerald-800 font-extrabold text-xs shadow-md hover:bg-emerald-50 active:scale-95 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-700/50 transition"
              title="Dismiss"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <AndroidDownloadModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
};
