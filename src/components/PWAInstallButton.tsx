import React, { useState } from 'react';
import { usePWAInstall } from './usePWAInstall';
import { AndroidDownloadModal } from './AndroidDownloadModal';
import { Download, Smartphone } from 'lucide-react';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const res = await install();
      if (!res) {
        setShowGuideModal(true);
      }
    } else {
      setShowGuideModal(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        className={`flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 font-bold text-white shadow-sm hover:from-emerald-500 hover:to-teal-500 active:scale-95 transition cursor-pointer ${
          compact ? 'px-2.5 py-1.5 text-xs' : 'px-4 py-2 text-sm'
        }`}
        title="Download BetweenUs on your Android phone"
      >
        <Download className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        <span>{isInstallable ? 'Install App' : 'Download on Android 📱'}</span>
      </button>

      <AndroidDownloadModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
      />
    </>
  );
};
