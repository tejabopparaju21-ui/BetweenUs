/**
 * Emergency Button & Safety Modal Component
 * Strictly complies with life safety standards and non-replacement disclosures.
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
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
} from 'lucide-react';

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useApp();
  const [step, setStep] = useState<'confirm' | 'actions' | 'sending_loc'>('confirm');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const emergencyData = getEmergencyNumberForCountry(currentUser.country);
  const primaryContact = currentUser.emergencyContacts[0];

  const handleCallEmergencyServices = () => {
    // Open native tel link
    window.location.href = `tel:${emergencyData.general}`;
  };

  const handleCallContact = () => {
    if (primaryContact?.phone) {
      window.location.href = `tel:${primaryContact.phone}`;
    } else {
      setStatusMessage('No emergency contact configured yet. Please configure one in Safety Center.');
    }
  };

  const handleSendLocation = () => {
    setStep('sending_loc');
    setStatusMessage('Attempting to retrieve your current GPS coordinates...');

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
          `EMERGENCY ALERT: I may need help. My current GPS location is: ${mapUrl}. Please contact me or local emergency services.`
        );

        if (primaryContact?.phone) {
          window.location.href = `sms:${primaryContact.phone}?body=${alertBody}`;
          setStatusMessage('Location acquired. Opening SMS app with pre-filled alert message.');
        } else {
          setStatusMessage(`Location acquired (${lat.toFixed(4)}, ${lng.toFixed(4)}), but no trusted emergency contact phone number was found.`);
        }
      },
      (err) => {
        console.warn('Geolocation error during emergency:', err.message);
        setStatusMessage(
          'Location could not be retrieved because permission was denied or signal is unavailable. Please call emergency services directly.'
        );
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleSendTextMessage = () => {
    const locText = currentUser.location
      ? `Approximate location: ${currentUser.location.city || `${currentUser.location.latitude}, ${currentUser.location.longitude}`}`
      : 'Location could not be automatically retrieved';

    const alertBody = encodeURIComponent(
      `Emergency alert: I may need help. ${locText}. Please contact me or emergency services.`
    );

    if (primaryContact?.phone) {
      window.location.href = `sms:${primaryContact.phone}?body=${alertBody}`;
    } else {
      setStatusMessage('No emergency contact configured yet. Please add a contact in Safety Settings.');
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
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
            aria-label="Close emergency modal"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">Safety & Emergency Assistance</h2>
              <p className="text-xs text-red-100 font-medium mt-0.5">
                Official assistance & emergency contacts
              </p>
            </div>
          </div>
        </div>

        {/* Disclaimer per requirement */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-start gap-2.5 text-xs text-amber-900">
          <Info className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
          <span>
            <strong>Important Notice:</strong> This application does not replace professional emergency services. In severe danger, always call local emergency dispatch immediately.
          </span>
        </div>

        <div className="p-6">
          {step === 'confirm' ? (
            <div className="space-y-4">
              <div className="text-center py-2">
                <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center mb-3">
                  <AlertTriangle className="w-9 h-9" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Are you in immediate danger?</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Choose from direct access to verified emergency authorities or notifying your pre-configured trusted contact.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5 pt-2">
                <button
                  onClick={() => setStep('actions')}
                  className="w-full py-3.5 px-4 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-[0.98] font-bold text-white shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 transition"
                >
                  <AlertTriangle className="w-5 h-5" />
                  <span>Yes, I Need Emergency Help</span>
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition"
                >
                  No, I'm Safe / Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5">
              <div className="text-xs uppercase font-bold tracking-wider text-slate-400">
                Immediate Actions
              </div>

              {/* Action 1: Call Local Emergency Services */}
              <button
                onClick={handleCallEmergencyServices}
                className="w-full p-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-semibold flex items-center justify-between shadow-md transition active:scale-[0.98]"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <PhoneCall className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-base">Call Emergency Services ({emergencyData.general})</div>
                    <div className="text-xs text-red-100">
                      {emergencyData.country} National Emergency Line
                    </div>
                  </div>
                </div>
                <ExternalLink className="w-5 h-5 text-red-200" />
              </button>

              {/* Action 2: Call Emergency Contact */}
              <button
                onClick={handleCallContact}
                className="w-full p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-semibold flex items-center justify-between shadow-sm transition active:scale-[0.98]"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 text-slate-300">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm">
                      Call {primaryContact ? `${primaryContact.name} (${primaryContact.relationship})` : 'Emergency Contact'}
                    </div>
                    <div className="text-xs text-slate-400">
                      {primaryContact ? primaryContact.phone : 'Not yet configured in Safety Settings'}
                    </div>
                  </div>
                </div>
                <PhoneCall className="w-4 h-4 text-slate-400" />
              </button>

              {/* Action 3: Send GPS Location */}
              <button
                onClick={handleSendLocation}
                className="w-full p-3.5 rounded-2xl border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold flex items-center justify-between transition active:scale-[0.98]"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-sm">Send My Location to Contact</div>
                    <div className="text-xs text-slate-500">
                      Coordinates via SMS Google Maps link
                    </div>
                  </div>
                </div>
                <Send className="w-4 h-4 text-slate-400" />
              </button>

              {/* Action 4: Send Pre-formatted Emergency SMS */}
              <button
                onClick={handleSendTextMessage}
                className="w-full p-3.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium flex items-center justify-between transition"
              >
                <div className="flex items-center gap-3 text-left">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Send Emergency SOS Message</div>
                    <div className="text-xs text-slate-500">"I may need help..." pre-filled text</div>
                  </div>
                </div>
                <span className="text-xs text-slate-400">SMS</span>
              </button>

              {/* Status or error message */}
              {statusMessage && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 leading-relaxed">
                  {statusMessage}
                </div>
              )}

              {/* Action 5: Cancel */}
              <button
                onClick={() => {
                  setStep('confirm');
                  setStatusMessage(null);
                  onClose();
                }}
                className="w-full py-2.5 text-center text-sm font-semibold text-slate-500 hover:text-slate-700 transition"
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
