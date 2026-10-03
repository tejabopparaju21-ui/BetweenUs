import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  AlertTriangle,
  PhoneCall,
  MessageCircle,
  MapPin,
  ExternalLink,
  ShieldAlert,
  Volume2,
  VolumeX,
  CheckCircle2,
  X,
  Compass,
  Navigation,
} from 'lucide-react';
import {
  startEmergencySiren,
  stopEmergencySiren,
  isEmergencySirenRunning,
} from '../utils/emergencySiren';

export const EmergencyAlertModal: React.FC = () => {
  const {
    activeEmergencyAlert,
    currentUser,
    partnerUser,
    acknowledgeEmergencyAlert,
    cancelEmergencyAlert,
  } = useApp();

  const [isMutedManually, setIsMutedManually] = useState(false);

  const isSender = activeEmergencyAlert?.senderId === currentUser.id;
  const isActive = activeEmergencyAlert?.status === 'active';
  const isAcknowledged = activeEmergencyAlert?.status === 'acknowledged';

  // Automatically start loud siren & vibration if this user is the RECIPIENT
  useEffect(() => {
    if (activeEmergencyAlert && isActive && !isSender && !isMutedManually) {
      startEmergencySiren();
    } else {
      stopEmergencySiren();
    }

    return () => {
      stopEmergencySiren();
    };
  }, [activeEmergencyAlert, isActive, isSender, isMutedManually]);

  if (!activeEmergencyAlert) return null;

  const handleAcknowledge = async () => {
    stopEmergencySiren();
    await acknowledgeEmergencyAlert(activeEmergencyAlert.id);
  };

  const handleCancel = async () => {
    stopEmergencySiren();
    await cancelEmergencyAlert(activeEmergencyAlert.id);
  };

  const toggleMute = () => {
    if (isEmergencySirenRunning()) {
      stopEmergencySiren();
      setIsMutedManually(true);
    } else {
      startEmergencySiren();
      setIsMutedManually(false);
    }
  };

  // Maps link if location exists
  const mapsUrl = activeEmergencyAlert.location
    ? `https://www.google.com/maps?q=${activeEmergencyAlert.location.latitude},${activeEmergencyAlert.location.longitude}`
    : null;

  // Caller phone number
  const callerPhone = isSender
    ? (partnerUser.phoneNumber || partnerUser.emergencyContacts?.[0]?.phone || '')
    : (activeEmergencyAlert.senderPhone || partnerUser.phoneNumber || partnerUser.emergencyContacts?.[0]?.phone || '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      {/* Flashing Ambient Glow for High Urgency */}
      {isActive && !isSender && (
        <div className="absolute inset-0 bg-red-600/20 animate-pulse pointer-events-none" />
      )}

      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border-2 border-red-500 text-white p-6 shadow-[0_0_50px_rgba(239,68,68,0.5)] overflow-hidden">
        {/* Top Flashing Strobe Header */}
        <div className="flex items-center justify-between pb-4 border-b border-red-500/30">
          <div className="flex items-center gap-3">
            <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-red-600 text-white shadow-lg shadow-red-600/50">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-2xl bg-red-400 opacity-75"></span>
              <ShieldAlert className="relative w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black uppercase tracking-wider animate-pulse">
                  {isSender ? '🚨 Ringing Partner' : '🚨 URGENT SOS ALERT'}
                </span>
                <span className="text-[11px] text-red-300 font-mono">
                  {new Date(activeEmergencyAlert.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </div>
              <h2 className="text-xl font-black tracking-tight text-white mt-0.5">
                {isSender
                  ? `Ringing ${partnerUser.name}'s Phone!`
                  : `EMERGENCY ALERT FROM ${activeEmergencyAlert.senderName.toUpperCase()}!`}
              </h2>
            </div>
          </div>

          {!isSender && isActive && (
            <button
              onClick={toggleMute}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title={isMutedManually ? 'Turn siren on' : 'Silence siren'}
            >
              {isMutedManually ? (
                <VolumeX className="w-5 h-5 text-red-400" />
              ) : (
                <Volume2 className="w-5 h-5 text-emerald-400 animate-bounce" />
              )}
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="py-6 space-y-5">
          {/* Status Banner */}
          {isActive ? (
            <div className="p-4 rounded-2xl bg-red-950/80 border border-red-500/50 space-y-2">
              <p className="text-sm font-semibold text-red-100 leading-relaxed">
                {activeEmergencyAlert.message ||
                  (isSender
                    ? `Continuous siren and SOS vibration sent to ${partnerUser.name}'s phone at full volume.`
                    : `${activeEmergencyAlert.senderName} needs you urgently! Your phone is ringing and vibrating.`)}
              </p>
              {!isSender && (
                <p className="text-xs text-red-300 flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
                  <span>Siren rings continuously even on Silent / Do Not Disturb mode.</span>
                </p>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <div className="text-xs">
                <span className="font-bold text-emerald-200 block text-sm">Emergency Alert Acknowledged</span>
                <p className="text-emerald-300 mt-0.5">
                  {isSender
                    ? `${partnerUser.name} received your SOS and confirmed they are responding!`
                    : `You acknowledged ${activeEmergencyAlert.senderName}'s emergency alert.`}
                </p>
              </div>
            </div>
          )}

          {/* Location Details (if available) */}
          {activeEmergencyAlert.location && (
            <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                  <MapPin className="w-3.5 h-3.5 text-red-400" />
                  <span>Live GPS Location at Alert Time</span>
                </span>
                {activeEmergencyAlert.location.city && (
                  <span className="font-bold text-white bg-slate-700 px-2 py-0.5 rounded-md">
                    {activeEmergencyAlert.location.city}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-mono text-[11px]">
                  {activeEmergencyAlert.location.latitude.toFixed(5)}°, {activeEmergencyAlert.location.longitude.toFixed(5)}°
                </span>
                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 hover:underline ml-2"
                  >
                    <span>Open in Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Connected Phone Info Card */}
          {callerPhone && (
            <div className="p-3.5 rounded-2xl bg-slate-800/90 border border-slate-700 flex items-center justify-between text-xs gap-2">
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div className="truncate">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">
                    {isSender ? `${partnerUser.name}'s Connected Phone` : `${activeEmergencyAlert.senderName}'s Phone`}
                  </span>
                  <span className="font-mono font-bold text-white text-xs">{callerPhone}</span>
                </div>
              </div>
              <a
                href={`tel:${callerPhone}`}
                onClick={() => stopEmergencySiren()}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md transition active:scale-95 flex items-center gap-1.5 shrink-0"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Call Direct</span>
              </a>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="pt-4 border-t border-slate-800 space-y-3">
          {/* Primary Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {!isSender ? (
              <>
                <button
                  type="button"
                  onClick={handleAcknowledge}
                  className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/30 transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>I'M HERE / STOP ALARM</span>
                </button>
                <a
                  href={`tel:${callerPhone}`}
                  onClick={() => stopEmergencySiren()}
                  className="w-full py-3.5 px-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-sm shadow-lg shadow-red-600/30 transition active:scale-95 flex items-center justify-center gap-2 text-center"
                >
                  <PhoneCall className="w-5 h-5" />
                  <span>CALL {activeEmergencyAlert.senderName.toUpperCase()} NOW</span>
                </a>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="w-full py-3.5 px-4 rounded-2xl bg-slate-700 hover:bg-slate-600 text-white font-bold text-sm transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>I Am Safe Now / Cancel Alert</span>
                </button>
                <a
                  href={`tel:${callerPhone}`}
                  className="w-full py-3.5 px-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-sm shadow-lg shadow-red-600/30 transition active:scale-95 flex items-center justify-center gap-2 text-center"
                >
                  <PhoneCall className="w-5 h-5" />
                  <span>Call {partnerUser.name} Direct</span>
                </a>
              </>
            )}
          </div>

          {/* Dismiss button when acknowledged */}
          {isAcknowledged && (
            <button
              type="button"
              onClick={handleCancel}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Close Alert
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
