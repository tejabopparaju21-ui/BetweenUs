import React, { useState } from 'react';
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
} from 'lucide-react';

export const Navigation: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    currentUser,
    partnerUser,
    couple,
    isDemoMode,
    switchActiveUser,
    notifications,
    markNotificationRead,
    clearAllNotifications,
    firebaseUser,
    loginWithGoogle,
    logOutFirebase,
  } = useApp();

  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserSwitcher, setShowUserSwitcher] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const { isInstalled } = usePWAInstall();

  const unreadNotifsCount = notifications.filter((n) => !n.isRead).length;

  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'chat', label: 'Chat', icon: MessageCircleHeart, badge: 1 },
    { id: 'connect', label: 'Connect', icon: HeartHandshake },
    { id: 'memories', label: 'Memories', icon: ImageIcon },
    { id: 'ai', label: 'AI Love', icon: Sparkles },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-rose-100/70 px-4 py-3 transition-all">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          {/* Logo & Brand: Pure, Elegant Typographic Wordmark without photo/image alignment */}
          <button
            onClick={() => setActiveTab('home')}
            className="text-left group flex items-center gap-1.5 focus:outline-none"
            aria-label="BetweenUs Home"
          >
            <span className="font-extrabold text-xl tracking-tight text-slate-900 group-hover:text-rose-600 transition-colors">
              Between<span className="text-rose-600">Us</span>
            </span>
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
          </button>

          {/* Right Header Actions: Clean, Minimal, Uncluttered */}
          <div className="flex items-center gap-2">
            {/* Quick Multi-Partner Switcher pill */}
            <button
              onClick={() => setShowUserSwitcher(!showUserSwitcher)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200/80 text-xs font-semibold text-rose-700 transition active:scale-95"
              title="Click to toggle between Partner views"
            >
              <Users className="w-3.5 h-3.5 text-rose-500" />
              <span className="font-bold">{currentUser.name}</span>
            </button>

            {/* Easy Android Download / Install Button */}
            {!isInstalled && (
              <button
                onClick={() => setShowDownloadModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/90 text-xs font-bold text-emerald-800 transition active:scale-95 shadow-2xs cursor-pointer"
                title="Download BetweenUs on Android Phone"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">Download App</span>
                <span className="sm:hidden">Install</span>
              </button>
            )}

            {/* Notifications Button */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition relative"
                aria-label="Notifications"
              >
                <Bell className="w-4.5 h-4.5" />
                {unreadNotifsCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white rounded-2xl shadow-xl border border-slate-100 p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Love Alerts ({notifications.length})
                    </span>
                    <button
                      onClick={clearAllNotifications}
                      className="text-[11px] text-rose-500 hover:underline"
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs shadow-xs hover:border-red-300 transition active:scale-95"
              title="Emergency & Safety Center"
            >
              <AlertOctagon className="w-4 h-4 text-red-600 animate-pulse" />
              <span>SOS</span>
            </button>
          </div>
        </div>

        {/* User Switcher / Account Card Modal/Dropdown if activated */}
        {showUserSwitcher && (
          <div className="mt-2.5 p-3.5 rounded-2xl bg-white border border-rose-200/80 shadow-lg max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-2">
            {!isDemoMode && firebaseUser ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-rose-500 text-white font-bold flex items-center justify-center shrink-0 overflow-hidden">
                    {currentUser.avatarUrl && currentUser.avatarUrl !== '/app-logo.svg' ? (
                      <img src={currentUser.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      currentUser.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="font-black text-slate-800 flex items-center gap-2">
                      <span>{currentUser.name}</span>
                      <span className="text-[10px] font-mono bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold">
                        Code: {currentUser.coupleCode || couple?.code || 'PAIR-LOVE'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {currentUser.email} {partnerUser.name && partnerUser.id ? `· Paired with ${partnerUser.name}` : '· Waiting for partner'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
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
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">Demo Couple Simulator:</span>
                  <span className="text-slate-600">
                    Switch perspective between Teja & Akhila in demo preview.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      switchActiveUser('user_teja_1');
                      setShowUserSwitcher(false);
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition ${
                      currentUser.id === 'user_teja_1'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-slate-50 text-slate-700 hover:bg-rose-50'
                    }`}
                  >
                    <span>Teja</span>
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      switchActiveUser(partnerUser.id);
                      setShowUserSwitcher(false);
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition ${
                      currentUser.id === partnerUser.id
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-slate-50 text-slate-700 hover:bg-rose-50'
                    }`}
                  >
                    <span>{partnerUser.name}</span>
                    {currentUser.id === partnerUser.id && <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => setShowUserSwitcher(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </header>

      {/* Emergency Modal Instance */}
      <EmergencyModal isOpen={isEmergencyOpen} onClose={() => setIsEmergencyOpen(false)} />

      {/* Bottom Sticky Mobile Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-rose-100 pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.04)]">
        <div className="max-w-md mx-auto grid grid-cols-6 py-1.5 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center py-1 rounded-xl transition duration-150 relative ${
                  isActive ? 'text-rose-600 font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'
                }`}
              >
                <div
                  className={`relative p-1 rounded-xl transition ${
                    isActive ? 'bg-rose-100/70 scale-110' : ''
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.id === 'ai' && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400" />
                  )}
                </div>
                <span className="text-[10px] tracking-tight mt-0.5">{item.label}</span>
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
