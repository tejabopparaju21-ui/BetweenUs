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
import { AICompanion } from './components/AICompanion';
import { SettingsSection } from './components/SettingsSection';
import { OfflineIndicator } from './components/OfflineIndicator';
import { EmergencyAlertModal } from './components/EmergencyAlertModal';

import { AuthScreen } from './components/AuthScreen';
import { CouplePairingView } from './components/CouplePairingView';

function MainAppContent() {
  const { activeTab, firebaseUser, isDemoMode, isPartnerPaired, exitDemoMode } = useApp();

  // 1. Unauthenticated and not in Demo Mode -> Display AuthScreen
  if (!firebaseUser && !isDemoMode) {
    return <AuthScreen />;
  }

  // 2. Authenticated with Google/Email, but haven't linked with partner yet -> Display CouplePairingView
  if (firebaseUser && !isDemoMode && !isPartnerPaired) {
    return <CouplePairingView />;
  }

  // 3. Either paired with partner or exploring in Demo Mode -> Display Main App
  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/50 via-white to-pink-50/30 flex flex-col">
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
      <Navigation />

      <main className="flex-1 w-full max-w-lg mx-auto">
        {activeTab === 'home' && <HomeDashboard />}
        {activeTab === 'chat' && <CoupleChat />}
        {activeTab === 'connect' && <ConnectSection />}
        {activeTab === 'memories' && <MemoriesSection />}
        {activeTab === 'ai' && <AICompanion />}
        {activeTab === 'settings' && <SettingsSection />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
