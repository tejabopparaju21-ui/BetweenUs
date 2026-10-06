import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { EmergencyModal } from './EmergencyModal';
import { PWAInstallButton } from './PWAInstallButton';
import { usePWAInstall } from './usePWAInstall';
import { AndroidDownloadModal } from './AndroidDownloadModal';
import {
  Home,
  MessageCircleHeart,
  HeartHandshake,
  Image as ImageIcon,
  Sparkles,
  Settings,
  AlertOctagon,
  Bell,
  Users,
  X,
  Check,
  Download,
  Phone,
  Video,
} from 'lucide-react';

export const Navigation: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    currentUser,
    partnerUser,
    couple,
    isDemoMode,
    notifications,
    markNotificationRead,
    clearAllNotifications,
    firebaseUser,
    loginWithGoogle,
    logOutFirebase,
    startCall,
  } = useApp();

  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserSwitcher, setShowUserSwitcher] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const { isInstalled } = usePWAInstall();

  useEffect(() => {
    const handleOpenEmergency = () => setIsEmergencyOpen(true);
    window.addEventListener('open_emergency_modal', handleOpenEmergency);
    return () => window.removeEventListener('open_emergency_modal', handleOpenEmergency);
  }, []);

  const unreadNotifsCount = notifications.filter((n) => !n.isRead).length;

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
              <span className="text-[9px] sm:text-[10px] font-semibold text-rose-500/90 tracking-tight leading-tight mt-0.5 truncate">
                starts with TEJA and AKHILA
              </span>
            </div>
          </button>

          {/* Right Header Actions: Direct Call access + Essential controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Quick 1-Tap Voice & Video Call Buttons for Phones & Laptops */}
            <div className="flex items-center gap-1 bg-rose-50/80 p-0.5 rounded-full border border-rose-200/60 shadow-2xs">
              <button
                type="button"
                onClick={() => startCall('voice')}
                className="w-8 h-8 rounded-full bg-white hover:bg-rose-100 text-rose-600 flex items-center justify-center transition active:scale-90 shadow-2xs cursor-pointer"
                title={`Voice Call with ${partnerUser.name}`}
                aria-label="Voice Call"
              >
                <Phone className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => startCall('video')}
                className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white flex items-center justify-center transition active:scale-90 shadow-2xs shadow-rose-500/25 cursor-pointer"
                title={`Video Call with ${partnerUser.name}`}
                aria-label="Video Call"
              >
                <Video className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Couple Code Button / Link Partner Modal Trigger */}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open_pairing_modal'))}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-gradient-to-r from-rose-50 to-pink-50 hover:from-rose-100 hover:to-pink-100 border border-rose-200 text-xs font-bold text-rose-700 transition active:scale-95 shadow-2xs cursor-pointer"
              title="View your Couple Code or Link Partner"
            >
              <HeartHandshake className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span className="font-mono text-[11px] font-black">{couple?.code || currentUser.coupleCode || 'PAIR CODE'}</span>
            </button>
            {/* Quick Multi-Partner Switcher pill/avatar */}
            <button
              onClick={() => setShowUserSwitcher(!showUserSwitcher)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200/70 text-xs font-semibold text-rose-700 transition active:scale-95 cursor-pointer"
              title="Click to toggle between Partner views"
            >
              <div className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center overflow-hidden shrink-0">
                {currentUser.avatarUrl && currentUser.avatarUrl !== '/app-logo.svg' ? (
                  <img src={currentUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  currentUser.name.charAt(0).toUpperCase()
                )}
              </div>
              <span className="font-bold text-[11px] sm:text-xs max-w-[70px] sm:max-w-[100px] truncate">{currentUser.name}</span>
            </button>

            {/* Easy Android Download / Install Button - shown on sm: screens */}
            {!isInstalled && (
              <button
                onClick={() => setShowDownloadModal(true)}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/90 text-xs font-bold text-emerald-800 transition active:scale-95 shadow-2xs cursor-pointer"
                title="Download BetweenUs on Android Phone"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>Download App</span>
              </button>
            )}

            {/* Notifications Button */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition relative tap-bounce cursor-pointer"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                {unreadNotifsCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 max-w-[88vw] bg-white rounded-2xl shadow-xl border border-rose-100 p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Love Alerts ({notifications.length})
                    </span>
                    <button
                      onClick={clearAllNotifications}
                      className="text-[11px] text-rose-500 hover:underline cursor-pointer"
                    >
                      Clear all
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-4">No new notifications</p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markNotificationRead(n.id)}
                          className={`p-2.5 rounded-xl text-left transition cursor-pointer text-xs ${
                            n.isRead ? 'bg-slate-50 text-slate-500' : 'bg-rose-50/70 text-slate-800 font-medium'
                          }`}
                        >
                          <div className="font-semibold text-rose-950 flex items-center justify-between">
                            <span>{n.title}</span>
                            {!n.isRead && (
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            )}
                          </div>
                          <div className="text-slate-600 mt-0.5 line-clamp-2">{n.body}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Emergency SOS Button */}
            <button
              onClick={() => setIsEmergencyOpen(true)}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-[11px] sm:text-xs shadow-2xs hover:border-red-300 transition active:scale-95 cursor-pointer shrink-0"
              title="Emergency & Safety Center"
            >
              <AlertOctagon className="w-3.5 h-3.5 text-red-600 animate-pulse" />
              <span>SOS</span>
            </button>
          </div>
        </div>

        {/* User Switcher / Account Card Modal/Dropdown if activated */}
        {showUserSwitcher && (
          <div className="absolute top-full left-2 right-2 sm:left-auto sm:right-6 mt-1 p-3.5 rounded-2xl bg-white border border-rose-200/90 shadow-xl sm:w-96 z-50 text-xs animate-in fade-in slide-in-from-top-2">
            {!isDemoMode && firebaseUser ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-500 text-white font-bold flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-rose-200">
                    {currentUser.avatarUrl && currentUser.avatarUrl !== '/app-logo.svg' ? (
                      <img src={currentUser.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      currentUser.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-black text-slate-800 flex items-center gap-2 truncate">
                      <span className="truncate">{currentUser.name}</span>
                      <span className="text-[10px] font-mono bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold shrink-0">
                        {currentUser.coupleCode || couple?.code || 'PAIR-LOVE'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {currentUser.email} {partnerUser.name && partnerUser.id ? `· Paired with ${partnerUser.name}` : '· Waiting for partner'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      logOutFirebase();
                      setShowUserSwitcher(false);
                    }}
                    className="px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-bold transition cursor-pointer"
                  >
                    Sign Out
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUserSwitcher(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-extrabold text-slate-800 text-xs">Your Profile</span>
                  <button
                    onClick={() => setShowUserSwitcher(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2.5 p-2 rounded-2xl bg-rose-50/70 border border-rose-100">
                  <div className="w-8 h-8 rounded-full bg-rose-500 text-white font-bold flex items-center justify-center text-xs shrink-0">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 text-xs truncate">{currentUser.name}</div>
                    <div className="text-[10px] text-slate-500">Connected with {partnerUser.name}</div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
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
