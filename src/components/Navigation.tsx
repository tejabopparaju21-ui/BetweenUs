import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { EmergencyModal } from './EmergencyModal';
import { AndroidDownloadModal } from './AndroidDownloadModal';
import {
  Home,
  MessageCircleHeart,
  HeartHandshake,
  Image as ImageIcon,
  Settings,
  AlertOctagon,
} from 'lucide-react';

export const Navigation: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    currentUser,
    partnerUser,
    isDemoMode,
    firebaseUser,
  } = useApp();

  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  useEffect(() => {
    const handleOpenEmergency = () => setIsEmergencyOpen(true);
    window.addEventListener('open_emergency_modal', handleOpenEmergency);
    return () => window.removeEventListener('open_emergency_modal', handleOpenEmergency);
  }, []);

  useEffect(() => {
    const handleOpenDownload = () => setShowDownloadModal(true);
    window.addEventListener('open_download_modal', handleOpenDownload);
    return () => window.removeEventListener('open_download_modal', handleOpenDownload);
  }, []);

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'chat', label: 'Chat', icon: MessageCircleHeart, badge: 1 },
    { id: 'connect', label: 'Connect', icon: HeartHandshake },
    { id: 'memories', label: 'Memories', icon: ImageIcon },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Top Header Bar - Fixed 56-64px height, clean and uncluttered */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-rose-100/70 px-3.5 sm:px-6 h-14 sm:h-16 flex items-center transition-all">
        <div className="w-full max-w-5xl mx-auto flex items-center justify-between">
          {/* Logo & Brand: Pure, Elegant Typographic Wordmark with Dedication */}
          <button
            onClick={() => setActiveTab('home')}
            className="text-left group flex items-center gap-2 focus:outline-none cursor-pointer tap-bounce shrink-0"
            aria-label="BetweenUs Home"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center text-white shadow-sm shadow-rose-200 shrink-0">
              <span className="text-xs sm:text-sm">❤️</span>
            </div>
            <div className="flex flex-col justify-center min-w-0">
              <span className="font-black text-base sm:text-lg tracking-tight text-slate-900 group-hover:text-rose-600 transition-colors leading-none">
                Between<span className="text-rose-600">Us</span>
              </span>
              <span className="font-black text-xs sm:text-sm tracking-wide text-rose-600 uppercase leading-tight mt-0.5">
                TEJA and AKHILA
              </span>
            </div>
          </button>

          {/* Permanent Couple Header Center Capsule */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50/90 border border-rose-200/80 shadow-2xs">
            <span className="text-xs">💑</span>
            <span className="font-black text-xs tracking-wider text-rose-600 uppercase">
              TEJA and AKHILA
            </span>
          </div>

          {/* Emergency SOS Button */}
          <button
            onClick={() => setIsEmergencyOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs shadow-2xs hover:border-red-300 transition active:scale-95 cursor-pointer shrink-0"
            title="Emergency & Safety Center"
          >
            <AlertOctagon className="w-3.5 h-3.5 text-red-600 animate-pulse" />
            <span>SOS</span>
          </button>
        </div>
      </header>

      {/* Emergency Modal Instance */}
      <EmergencyModal isOpen={isEmergencyOpen} onClose={() => setIsEmergencyOpen(false)} />

      {/* Bottom Sticky Mobile Navigation - Native App Feel */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/92 backdrop-blur-xl border-t border-rose-100/80 pb-safe shadow-[0_-4px_25px_rgba(244,63,94,0.06)]">
        <div className="max-w-md md:max-w-2xl mx-auto grid grid-cols-5 py-1 px-1 sm:px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center py-1 rounded-2xl transition duration-150 relative min-h-[46px] tap-bounce cursor-pointer ${
                  isActive ? 'text-rose-600 font-extrabold' : 'text-slate-400 hover:text-slate-600 font-medium'
                }`}
                aria-label={item.label}
              >
                <div
                  className={`relative p-1.5 rounded-xl transition duration-150 ${
                    isActive ? 'bg-rose-100/80 text-rose-600 scale-105 shadow-2xs' : ''
                  }`}
                >
                  <Icon className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                  {item.id === 'chat' && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-rose-500" />
                  )}
                </div>
                <span className={`text-[10px] tracking-tight mt-0.5 ${isActive ? 'font-black text-rose-600' : 'text-slate-500'}`}>
                  {item.label}
                </span>
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-rose-500 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Android Download & Installation Modal */}
      <AndroidDownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
      />
    </>
  );
};
