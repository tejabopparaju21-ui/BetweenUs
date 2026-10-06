import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShieldAlert,
  Phone,
  PhoneCall,
  Volume2,
  Navigation,
  AlertTriangle,
  X,
  Radio,
  Flame,
  CheckCircle2,
} from 'lucide-react';

export const HomeEmergencyButton: React.FC = () => {
  const {
    currentUser,
    partnerUser,
    couple,
    triggerEmergencyAlert,
    activeEmergencyAlert,
  } = useApp();

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState('🚨 URGENT SOS! Please call or check on me immediately!');
  const [isTriggering, setIsTriggering] = useState(false);

  const partnerPhone =
    partnerUser.phoneNumber ||
    (currentUser.id === couple?.partnerAId ? couple?.partnerBPhoneNumber : couple?.partnerAPhoneNumber) ||
    partnerUser.emergencyContacts?.[0]?.phone ||
    '';

  const presetMessages = [
    '🚨 URGENT SOS! Please call or check on me immediately!',
    '📍 Need you urgently! Sending you my live GPS coordinates.',
    '⚠️ Feeling unsafe / emergency situation, please respond now!',
    '🏥 Medical urgency / need immediate help from you.',
  ];

  const handleRingPartner = async () => {
    setIsTriggering(true);
    try {
      await triggerEmergencyAlert(selectedMessage);
      setShowConfirmModal(false);
    } catch (err) {
      console.error('Trigger emergency error:', err);
    } finally {
      setIsTriggering(false);
    }
  };

  const isAlertActive = activeEmergencyAlert && activeEmergencyAlert.status === 'active';

  return (
    <>
      {/* Home Dashboard Emergency Widget Tile */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-600 via-rose-600 to-pink-700 p-4 sm:p-5 text-white shadow-xl shadow-rose-900/20 border border-red-400/40">
        {/* Subtle background radar circles */}
        <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full border-4 border-white/10 animate-ping pointer-events-none" />
        <div className="absolute right-4 top-4 w-24 h-24 rounded-full bg-white/5 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-red-600 shadow-md">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-red-900/60 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-red-100 border border-red-300/30">
                  <Radio className="w-3 h-3 text-red-300 animate-pulse" />
                  <span>Silent Mode Bypass</span>
                </span>
                {isAlertActive && (
                  <span className="rounded-full bg-white text-red-700 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider animate-bounce">
                    Active Siren
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white mt-0.5">
                Emergency SOS: {partnerUser.name}
              </h3>
              <p className="text-xs text-rose-100/90 max-w-sm leading-relaxed mt-0.5">
                Call {partnerUser.name} directly on mobile or sound a loud piercing siren on their phone.
              </p>
              {/* Connected Phone Indicator */}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-950/70 border border-red-300/30 text-[11px] font-mono font-bold text-rose-100">
                  <Phone className="w-3 h-3 text-emerald-400" />
                  <span>{partnerPhone || 'Phone not set'}</span>
                </span>
                <span className="text-[10px] text-rose-200 font-semibold">
                  {partnerPhone ? '• Emergency Phone Connected' : '• Set in Profile'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto shrink-0">
            {partnerPhone && (
              <a
                href={`tel:${partnerPhone}`}
                className="px-4 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs sm:text-sm shadow-lg shadow-black/20 hover:shadow-xl transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 text-center"
              >
                <PhoneCall className="w-4 h-4 animate-bounce" />
                <span>CALL {partnerUser.name.toUpperCase()}</span>
              </a>
            )}
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              className="px-4 py-3 rounded-2xl bg-white text-red-700 hover:bg-rose-50 font-black text-xs sm:text-sm shadow-lg shadow-black/20 hover:shadow-xl transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Volume2 className="w-4 h-4 text-red-600" />
              <span>SIREN &amp; SOS</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation & Customization Dialog */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-red-200 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-red-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-red-600 flex items-center justify-center text-white shadow-md shadow-red-600/30">
                  <ShieldAlert className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-800">
                    Ring {partnerUser.name}'s Phone
                  </h3>
                  <p className="text-xs text-slate-500">Emergency Siren &amp; High-Priority Alarm</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Warning description */}
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>Will sound alarm on {partnerUser.name}'s device</span>
              </div>
              <p className="text-[11px] text-red-700 leading-relaxed">
                This triggers a dual-tone emergency siren at full volume and continuous SOS morse vibration on {partnerUser.name}'s phone along with your live location.
              </p>
            </div>

            {/* Emergency message selector */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Select Alert Reason:
              </label>
              <div className="space-y-1.5">
                {presetMessages.map((msg, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedMessage(msg)}
                    className={`w-full p-2.5 rounded-xl text-left text-xs font-medium border transition flex items-center justify-between ${
                      selectedMessage === msg
                        ? 'border-red-500 bg-red-50 text-red-900 font-bold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <span className="truncate pr-2">{msg}</span>
                    {selectedMessage === msg && (
                      <CheckCircle2 className="w-4 h-4 text-red-600 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Connected Partner Phone Card */}
            <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Phone className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <span className="font-bold text-slate-800 block text-xs truncate">
                    {partnerUser.name}'s Connected Phone
                  </span>
                  <span className="font-mono text-indigo-700 text-xs font-semibold">
                    {partnerUser.phoneNumber || partnerUser.emergencyContacts?.[0]?.phone || 'Not configured in profile'}
                  </span>
                </div>
              </div>
              {(partnerUser.phoneNumber || partnerUser.emergencyContacts?.[0]?.phone) && (
                <a
                  href={`tel:${partnerUser.phoneNumber || partnerUser.emergencyContacts?.[0]?.phone}`}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-xs flex items-center gap-1 shrink-0 active:scale-95"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Call Direct</span>
                </a>
              )}
            </div>

            {/* Location notice */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
              <span>📍 Sharing your current city &amp; GPS coordinates:</span>
              <span className="font-bold text-slate-800">{currentUser.city || 'Hyderabad'}</span>
            </div>

            {/* Actions */}
            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRingPartner}
                disabled={isTriggering}
                className="flex-2 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs shadow-lg shadow-red-600/30 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isTriggering ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Volume2 className="w-4 h-4" />
                    <span>RING PHONE NOW</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
