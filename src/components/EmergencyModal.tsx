/**
 * Emergency Button & Safety Modal Component
 * Prioritizes instant 1-tap direct phone call to partner through their given phone number,
 * emergency SMS with live GPS coordinates, and in-app partner siren alert.
 */

import React, { useState } from 'react';
import { useApp, getCoupleSlot } from '../context/AppContext';
import { getEmergencyNumberForCountry } from '../utils/emergencyNumbers';
import {
  AlertTriangle,
  PhoneCall,
  UserCheck,
  Send,
  MapPin,
  X,
  ShieldAlert,
  Info,
  ExternalLink,
  Volume2,
  Phone,
} from 'lucide-react';

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, partnerUser, couple, triggerEmergencyAlert } = useApp();
  const [step, setStep] = useState<'confirm' | 'actions' | 'sending_loc'>('confirm');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isTriggeringSiren, setIsTriggeringSiren] = useState(false);

  if (!isOpen) return null;

  const emergencyData = getEmergencyNumberForCountry(currentUser.country);
  const primaryContact = currentUser.emergencyContacts?.[0];

  const partnerPhone =
    partnerUser.phoneNumber ||
    (getCoupleSlot(currentUser.id, couple) === 'partnerA' ? couple?.partnerBPhoneNumber : couple?.partnerAPhoneNumber) ||
    partnerUser.emergencyContacts?.[0]?.phone ||
    '';

  const handleCallPartner = () => {
    if (partnerPhone) {
      window.location.href = `tel:${partnerPhone}`;
    } else {
      setStatusMessage(`No phone number configured for ${partnerUser.name}. Please set it in Safety / Profile settings.`);
    }
  };

  const handleCallEmergencyServices = () => {
    window.location.href = `tel:${emergencyData.general}`;
  };

  const handleCallFamilyContact = () => {
    if (primaryContact?.phone) {
      window.location.href = `tel:${primaryContact.phone}`;
    } else {
      setStatusMessage('No additional family emergency contact configured yet.');
    }
  };

  const handleSendLocationToPartner = () => {
    setStep('sending_loc');
    setStatusMessage(`Attempting to acquire GPS coordinates to send to ${partnerUser.name}...`);

    // Fast path: if live location is already available from context, send immediately without waking hardware
    if (currentUser.location?.latitude && currentUser.location?.longitude) {
      const lat = currentUser.location.latitude;
      const lng = currentUser.location.longitude;
      const mapUrl = `https://maps.google.com/?q=${lat},${lng}`;
      const alertBody = encodeURIComponent(
        `🚨 URGENT SOS from ${currentUser.name}: I need immediate help! My current GPS location is: ${mapUrl}. Please call me immediately!`
      );

      if (partnerPhone) {
        window.location.href = `sms:${partnerPhone}?body=${alertBody}`;
        setStatusMessage(`Live location ready. Opening SMS app with pre-filled SOS text to ${partnerUser.name}.`);
      } else {
        setStatusMessage(`Live location ready (${lat.toFixed(4)}, ${lng.toFixed(4)}), but ${partnerUser.name}'s phone number was not found.`);
      }
      return;
    }

    if (!('geolocation' in navigator)) {
      setStatusMessage('Location is not supported or accessible on this device.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const mapUrl = `https://maps.google.com/?q=${lat},${lng}`;
        const alertBody = encodeURIComponent(
          `🚨 URGENT SOS from ${currentUser.name}: I need immediate help! My current GPS location is: ${mapUrl}. Please call me immediately!`
        );

        if (partnerPhone) {
          window.location.href = `sms:${partnerPhone}?body=${alertBody}`;
          setStatusMessage(`Location acquired. Opening SMS app with pre-filled SOS text to ${partnerUser.name}.`);
        } else {
          setStatusMessage(`Location acquired (${lat.toFixed(4)}, ${lng.toFixed(4)}), but ${partnerUser.name}'s phone number was not found.`);
        }
      },
      (err) => {
        console.warn('Geolocation error during emergency:', err.message);
        setStatusMessage(
          `Location could not be retrieved. Please call ${partnerUser.name} directly.`
        );
      },
      { timeout: 8000, enableHighAccuracy: true, maximumAge: 30000 }
    );
  };

  const handleTriggerInAppSiren = async () => {
    setIsTriggeringSiren(true);
    try {
      await triggerEmergencyAlert(`🚨 URGENT SOS from ${currentUser.name}! Please call or check on me immediately!`);
      setStatusMessage(`🚨 High-priority emergency siren dispatched to ${partnerUser.name}'s phone!`);
    } catch (err: any) {
      setStatusMessage('Failed to trigger in-app siren: ' + err?.message);
    } finally {
      setIsTriggeringSiren(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-red-100 overflow-hidden my-auto">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 px-6 py-5 text-white relative">
          <button
            onClick={() => {
              setStep('confirm');
              setStatusMessage(null);
              onClose();
            }}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition cursor-pointer"
            aria-label="Close emergency modal"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">Emergency Assistance</h2>
              <p className="text-xs text-red-100 font-medium mt-0.5">
                Instant partner phone dialing &amp; emergency alerts
              </p>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-start gap-2.5 text-xs text-amber-900">
          <Info className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
          <span>
            <strong>Emergency Hotline:</strong> In severe physical danger, call <strong>{emergencyData.general}</strong> immediately.
          </span>
        </div>

        <div className="p-6">
          {step === 'confirm' ? (
            <div className="space-y-4">
              <div className="text-center py-2">
                <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center mb-3">
                  <AlertTriangle className="w-9 h-9" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Are you in an emergency?</h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Call {partnerUser.name} directly on mobile or broadcast a high-priority siren to their device.
                </p>
              </div>

              {/* Instant 1-tap Direct Call to Partner */}
              {partnerPhone ? (
                <a
                  href={`tel:${partnerPhone}`}
                  className="w-full py-4 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] font-black text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2.5 transition text-center"
                >
                  <PhoneCall className="w-5 h-5 animate-bounce" />
                  <span>CALL {partnerUser.name.toUpperCase()} NOW ({partnerPhone})</span>
                </a>
              ) : (
                <button
                  type="button"
                  onClick={handleCallPartner}
                  className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 font-bold text-white shadow-md flex items-center justify-center gap-2 transition"
                >
                  <PhoneCall className="w-5 h-5" />
                  <span>Call {partnerUser.name} on Phone</span>
                </button>
              )}

              <div className="grid grid-cols-1 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setStep('actions')}
                  className="w-full py-3 px-4 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-[0.98] font-bold text-white shadow-md flex items-center justify-center gap-2 transition cursor-pointer text-xs"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>More Emergency Options (Siren, GPS, Police)</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer"
                >
                  No, I'm Safe / Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs uppercase font-bold tracking-wider text-slate-400">
                Choose Emergency Action
              </div>

              {/* Action 1: Call Partner Immediately */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 border-2 border-emerald-500/80 text-emerald-950 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <PhoneCall className="w-5 h-5 animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-extrabold text-sm text-slate-900 truncate">
                      Call {partnerUser.name} on Mobile
                    </div>
                    <div className="font-mono text-emerald-700 text-xs font-bold truncate">
                      {partnerPhone || 'No phone configured in profile'}
                    </div>
                  </div>
                </div>
                {partnerPhone ? (
                  <a
                    href={`tel:${partnerPhone}`}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-sm flex items-center gap-1.5 shrink-0 active:scale-95"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Call Now</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={handleCallPartner}
                    className="px-3 py-1.5 rounded-xl bg-slate-200 text-slate-700 text-xs font-bold shrink-0"
                  >
                    Set Phone
                  </button>
                )}
              </div>

              {/* Action 2: Trigger In-App Siren Alarm on Partner's Device */}
              <button
                type="button"
                onClick={handleTriggerInAppSiren}
                disabled={isTriggeringSiren}
                className="w-full p-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center justify-between shadow-md transition active:scale-[0.98] cursor-pointer disabled:opacity-50"
              >
                <div className="flex items-center gap-3 text-left min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <Volume2 className="w-5 h-5 animate-bounce" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm">Sound Siren on {partnerUser.name}'s Device</div>
                    <div className="text-[11px] text-red-100 truncate">
                      Loud piercing alarm + vibration (bypasses silent mode)
                    </div>
                  </div>
                </div>
                <ShieldAlert className="w-4 h-4 text-red-200 shrink-0" />
              </button>

              {/* Action 3: Send Live GPS Coordinates via SMS */}
              <button
                type="button"
                onClick={handleSendLocationToPartner}
                className="w-full p-3 rounded-2xl border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold flex items-center justify-between transition active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center gap-3 text-left min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs sm:text-sm">SMS Live Location to {partnerUser.name}</div>
                    <div className="text-[11px] text-slate-500 truncate">
                      Pre-filled SMS with exact Google Maps coordinates
                    </div>
                  </div>
                </div>
                <Send className="w-4 h-4 text-slate-400 shrink-0" />
              </button>

              {/* Action 4: Call Local Emergency Dispatch (112) */}
              <button
                type="button"
                onClick={handleCallEmergencyServices}
                className="w-full p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-semibold flex items-center justify-between shadow-xs transition active:scale-[0.98] cursor-pointer"
              >
                <div className="flex items-center gap-3 text-left min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 text-slate-300">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-xs sm:text-sm">Call Emergency Dispatch ({emergencyData.general})</div>
                    <div className="text-[11px] text-slate-400">
                      National Helpline ({emergencyData.country})
                    </div>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-400 shrink-0" />
              </button>

              {/* Action 5: Call Family Contact */}
              {primaryContact && (
                <button
                  type="button"
                  onClick={handleCallFamilyContact}
                  className="w-full p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center justify-between transition cursor-pointer"
                >
                  <div className="flex items-center gap-2 truncate">
                    <UserCheck className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="truncate">Call Family: {primaryContact.name} ({primaryContact.phone})</span>
                  </div>
                  <PhoneCall className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>
              )}

              {/* Status or error message */}
              {statusMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 leading-relaxed font-medium">
                  {statusMessage}
                </div>
              )}

              {/* Return to App */}
              <button
                type="button"
                onClick={() => {
                  setStep('confirm');
                  setStatusMessage(null);
                  onClose();
                }}
                className="w-full py-2.5 text-center text-xs font-semibold text-slate-500 hover:text-slate-700 transition cursor-pointer"
              >
                Cancel / Return to App
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

