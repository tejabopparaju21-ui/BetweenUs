/**
 * BetweenUs - Long-Distance Relationship Companion
 * Complete mobile-first PWA for couples across the miles.
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navigation } from './components/Navigation';
import { HomeDashboard } from './components/HomeDashboard';
import { CoupleChat } from './components/CoupleChat';
import { ConnectSection } from './components/ConnectSection';
import { MemoriesSection } from './components/MemoriesSection';
import { SettingsSection } from './components/SettingsSection';
import { OfflineIndicator } from './components/OfflineIndicator';
import { EmergencyAlertModal } from './components/EmergencyAlertModal';
import { CallModal } from './components/CallModal';

import { AuthScreen } from './components/AuthScreen';
import { CouplePairingView } from './components/CouplePairingView';
import { ErrorBoundary } from './components/ErrorBoundary';

function MainAppContent() {
  const { activeTab, firebaseUser, isAuthLoading, isDemoMode, exitDemoMode } = useApp();
  const [showPairingModal, setShowPairingModal] = React.useState(false);

  React.useEffect(() => {
    const handleOpenPairing = () => setShowPairingModal(true);
    window.addEventListener('open_pairing_modal', handleOpenPairing);
    return () => window.removeEventListener('open_pairing_modal', handleOpenPairing);
  }, []);

  // 0. While Firebase auth state is initializing (on refresh / initial load)
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-pink-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="relative mb-6">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-rose-500 to-pink-500 shadow-xl shadow-rose-500/25 flex items-center justify-center animate-pulse">
            <span className="text-3xl">💑</span>
          </div>
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center text-xs">
            ✨
          </div>
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-0.5">Between<span className="text-rose-600">Us</span></h2>
        <p className="text-sm font-black text-rose-600 uppercase tracking-wider mb-2">TEJA and AKHILA</p>
        <p className="text-xs text-gray-500 font-medium">Connecting hearts across the distance...</p>
        <p className="text-[11px] font-bold text-rose-400 mt-6">starts with TEJA and AKHILA</p>
      </div>
    );
  }

  // 1. Unauthenticated and not in Demo Mode -> Display AuthScreen
  if (!firebaseUser && !isDemoMode) {
    return <AuthScreen />;
  }

  // 2. If user explicitly opens pairing view -> Display CouplePairingView with back/close option
  if (showPairingModal) {
    return <CouplePairingView onClose={() => setShowPairingModal(false)} />;
  }

  // 3. Once authenticated (or in Demo Mode) -> Directly allow entry to the website!
  return (
    <div
      className={`min-h-screen flex flex-col relative transition-colors duration-500 ${
        activeTab === 'home'
          ? 'bg-slate-900/10'
          : 'bg-gradient-to-b from-rose-50/50 via-white to-pink-50/30'
      }`}
    >
      {/* Home Page Romantic Holding Hands Background Art */}
      {activeTab === 'home' && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
          <img
            src="/home-bg.jpg"
            alt="BetweenUs Home Background"
            className="w-full h-full object-cover object-center scale-100 filter contrast-[1.02] brightness-[0.98] transition-opacity duration-700"
          />
          {/* Subtle soft gradient & atmospheric tint so text and cards remain 100% crisp and readable */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-rose-950/20 to-slate-950/50" />
          <div className="absolute inset-0 bg-white/15 backdrop-blur-[1px]" />
        </div>
      )}

      {/* Demo Mode Notice Banner */}
      {isDemoMode && (
        <div className="bg-gradient-to-r from-amber-500 via-rose-500 to-pink-500 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-xs sticky top-0 z-40">
          <div className="flex items-center gap-1.5 truncate mr-2">
            <span>👀</span>
            <span className="truncate">Previewing Demo Couple (Teja & Akhila)</span>
          </div>
          <button
            type="button"
            onClick={exitDemoMode}
            className="shrink-0 bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-full text-[11px] font-extrabold transition cursor-pointer"
          >
            Sign in with Google
          </button>
        </div>
      )}
      <OfflineIndicator />
      <EmergencyAlertModal />
      <CallModal />
      <Navigation />

      <main className="flex-1 w-full max-w-md sm:max-w-2xl md:max-w-4xl lg:max-w-5xl mx-auto relative z-10 transition-all">
        {activeTab === 'home' && <HomeDashboard />}
        {activeTab === 'chat' && <CoupleChat />}
        {activeTab === 'connect' && <ConnectSection />}
        {activeTab === 'memories' && <MemoriesSection />}
        {activeTab === 'settings' && <SettingsSection />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <MainAppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}
