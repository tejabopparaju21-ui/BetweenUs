import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { INDIAN_CITIES, formatISTDateTime } from '../utils/indianCities';
import { calculateDistanceKm, getIndianTravelComparison } from '../utils/distance';
import {
  MapPin,
  Navigation2,
  ShieldCheck,
  Eye,
  EyeOff,
  RefreshCw,
  X,
  Check,
  AlertTriangle,
  ArrowRight,
  Smartphone,
  Sparkles,
  Compass,
} from 'lucide-react';
import { LiveLocationMap } from './LiveLocationMap';

interface LiveLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LiveLocationModal: React.FC<LiveLocationModalProps> = ({ isOpen, onClose }) => {
  const {
    currentUser,
    partnerUser,
    isLocating,
    locationError,
    clearLocationError,
    requestLocationPermission,
    setPartnerLocationManually,
    stopSharingLocation,
    switchActiveUser,
  } = useApp();

  const [selectedCityUserA, setSelectedCityUserA] = useState<string>(currentUser.city || 'Hyderabad');
  const [selectedCityUserB, setSelectedCityUserB] = useState<string>(partnerUser.city || 'Bengaluru');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const triggerSuccess = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  const handleDetectGPS = async (targetSlot: 'current' | 'userA' | 'userB') => {
    clearLocationError();
    const success = await requestLocationPermission(targetSlot);
    if (success) {
      triggerSuccess(`Live GPS location updated successfully for ${targetSlot === 'userB' ? partnerUser.name : currentUser.name}!`);
    }
  };

  const handleApplyCity = (targetSlot: 'current' | 'userA' | 'userB', cityName: string) => {
    setPartnerLocationManually(targetSlot, cityName);
    triggerSuccess(`Location set to ${cityName} for ${targetSlot === 'userB' ? partnerUser.name : currentUser.name}`);
  };

  // Distance calculation
  const hasUserCoords = currentUser.location && currentUser.location.latitude;
  const hasPartnerCoords = partnerUser.location && partnerUser.location.latitude;
  const bothSharing = currentUser.shareLocation && partnerUser.shareLocation;

  let distanceKm = 0;
  if (hasUserCoords && hasPartnerCoords) {
    distanceKm = calculateDistanceKm(
      currentUser.location!.latitude,
      currentUser.location!.longitude,
      partnerUser.location!.latitude,
      partnerUser.location!.longitude
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl border border-rose-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-rose-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
              <Compass className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-slate-800 flex items-center gap-1.5">
                <span>Live Location for Both Partners</span>
                <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold">
                  Real-Time
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Synchronized GPS coordinates, distance, and city presence across India.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success toast notification */}
        {actionSuccessMsg && (
          <div className="mt-3 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {/* Location Error alert with clear helpful guidance */}
        {locationError && (
          <div className="mt-3 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1 animate-in fade-in">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Location Access Notice</span>
            </div>
            <p className="text-slate-600">{locationError}</p>
            <p className="text-[11px] text-amber-800 font-medium">
              💡 You can choose any Indian city below to immediately lock in precise coordinates and calculate distance without needing device GPS.
            </p>
          </div>
        )}

        {/* Live Distance Summary Banner */}
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-rose-500 via-rose-600 to-pink-600 text-white shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-rose-100 mb-1">
            <span className="uppercase tracking-wider">Live Distance Between You</span>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">
              {bothSharing ? 'Both Active' : 'Partial Sharing'}
            </span>
          </div>

          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-3xl font-black tracking-tight">
              {distanceKm > 0 ? distanceKm.toLocaleString() : '---'}
            </span>
            <span className="text-sm font-bold text-rose-100">kilometers</span>
          </div>

          {distanceKm > 0 && (
            <div className="mt-1.5 text-xs text-rose-100 font-medium flex items-center gap-1.5">
              <Navigation2 className="w-3.5 h-3.5 rotate-45 shrink-0" />
              <span>{getIndianTravelComparison(distanceKm)}</span>
            </div>
          )}

          {/* Route avatars */}
          <div className="mt-3 pt-3 border-t border-white/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-7 h-7 rounded-full border border-white object-cover"
              />
              <div className="leading-tight">
                <span className="font-bold block">{currentUser.name}</span>
                <span className="text-[10px] text-rose-200">{currentUser.city || 'Hyderabad'}</span>
              </div>
            </div>

            <div className="flex items-center gap-1 text-rose-200 text-xs font-bold">
              <span>✈️</span>
              <span className="border-b border-dashed border-rose-300 w-12 text-center" />
              <ArrowRight className="w-3.5 h-3.5" />
            </div>

            <div className="flex items-center gap-2 text-right">
              <div className="leading-tight">
                <span className="font-bold block">{partnerUser.name}</span>
                <span className="text-[10px] text-rose-200">{partnerUser.city || 'Bengaluru'}</span>
              </div>
              <img
                src={partnerUser.avatarUrl}
                alt={partnerUser.name}
                className="w-7 h-7 rounded-full border border-white object-cover"
              />
            </div>
          </div>
        </div>

        {/* Live Interactive Geoapify Map */}
        <div className="mt-4">
          <LiveLocationMap />
        </div>

        {/* PARTNER 1: You */}
        <div className="mt-4 p-4 rounded-2xl bg-rose-50/50 border border-rose-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-9 h-9 rounded-full object-cover border border-rose-200"
              />
              <div>
                <span className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                  <span>{currentUser.name}</span>
                  <span className="text-[10px] bg-rose-600 text-white px-2 py-0.2 rounded-full font-bold">
                    You
                  </span>
                </span>
                <span className="text-[11px] text-slate-500 block">
                  {currentUser.shareLocation ? '🟢 Live Sharing Active' : '🔴 Location Paused'}
                </span>
              </div>
            </div>

            {currentUser.shareLocation ? (
              <button
                onClick={() => stopSharingLocation('current')}
                className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold flex items-center gap-1 transition shadow-2xs"
              >
                <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                <span>Pause</span>
              </button>
            ) : (
              <button
                onClick={() => handleDetectGPS('current')}
                className="px-2.5 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1 transition shadow-2xs"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Enable</span>
              </button>
            )}
          </div>

          {/* Current coordinates & City details */}
          <div className="grid grid-cols-2 gap-2 text-xs bg-white p-3 rounded-xl border border-rose-100/80">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Active City</span>
              <span className="font-bold text-slate-800 truncate block">
                {currentUser.city || 'Hyderabad, Telangana'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">GPS Coordinates</span>
              <span className="font-mono text-[11px] text-slate-700 block truncate">
                {currentUser.location?.latitude
                  ? `${currentUser.location.latitude.toFixed(4)}°, ${currentUser.location.longitude.toFixed(4)}°`
                  : 'No coordinates'}
              </span>
            </div>
          </div>

          {/* Controls: Detect GPS & Select City */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDetectGPS('current')}
                disabled={isLocating}
                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-1.5 disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                <span>{isLocating ? 'Acquiring GPS...' : 'Detect My Live GPS'}</span>
              </button>
            </div>

            {/* Indian City Quick Selector */}
            <div className="flex items-center gap-2">
              <select
                value={selectedCityUserA}
                onChange={(e) => {
                  setSelectedCityUserA(e.target.value);
                  handleApplyCity('current', e.target.value);
                }}
                className="flex-1 text-xs py-1.5 px-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:ring-2 focus:ring-rose-500 outline-hidden"
              >
                <option value="">Select Indian City...</option>
                {INDIAN_CITIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.displayName}
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleApplyCity('current', selectedCityUserA)}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
              >
                Set City
              </button>
            </div>
          </div>
        </div>

        {/* PARTNER 2: Partner */}
        <div className="mt-4 p-4 rounded-2xl bg-pink-50/40 border border-pink-100 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img
                src={partnerUser.avatarUrl}
                alt={partnerUser.name}
                className="w-9 h-9 rounded-full object-cover border border-pink-200"
              />
              <div>
                <span className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                  <span>{partnerUser.name}</span>
                  <span className="text-[10px] bg-pink-100 text-pink-700 px-2 py-0.2 rounded-full font-bold">
                    Partner
                  </span>
                </span>
                <span className="text-[11px] text-slate-500 block">
                  {partnerUser.shareLocation ? '🟢 Live Sharing Active' : '🔴 Location Paused'}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                switchActiveUser(partnerUser.id);
                triggerSuccess(`Switched active view to ${partnerUser.name}!`);
              }}
              className="px-2.5 py-1 rounded-xl bg-white border border-pink-200 text-pink-700 hover:bg-pink-50 text-xs font-bold transition flex items-center gap-1 shadow-2xs"
              title="Switch to partner view"
            >
              <span>Switch to {partnerUser.name}</span>
            </button>
          </div>

          {/* Partner coordinates & City details */}
          <div className="grid grid-cols-2 gap-2 text-xs bg-white p-3 rounded-xl border border-pink-100">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Active City</span>
              <span className="font-bold text-slate-800 truncate block">
                {partnerUser.city || 'Bengaluru, Karnataka'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">GPS Coordinates</span>
              <span className="font-mono text-[11px] text-slate-700 block truncate">
                {partnerUser.location?.latitude
                  ? `${partnerUser.location.latitude.toFixed(4)}°, ${partnerUser.location.longitude.toFixed(4)}°`
                  : 'No coordinates'}
              </span>
            </div>
          </div>

          {/* Quick city selector for testing partner side */}
          <div className="pt-1 space-y-1.5">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
              Set {partnerUser.name}'s Location (for dual device testing):
            </span>
            <div className="flex items-center gap-2">
              <select
                value={selectedCityUserB}
                onChange={(e) => {
                  setSelectedCityUserB(e.target.value);
                  handleApplyCity('userB', e.target.value);
                }}
                className="flex-1 text-xs py-1.5 px-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium focus:ring-2 focus:ring-pink-500 outline-hidden"
              >
                <option value="">Select Indian City for {partnerUser.name}...</option>
                {INDIAN_CITIES.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.displayName}
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleApplyCity('userB', selectedCityUserB)}
                className="px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white text-xs font-bold transition shadow-2xs"
              >
                Set
              </button>
            </div>
          </div>
        </div>

        {/* Privacy Note */}
        <div className="mt-4 p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-2.5 text-xs text-slate-600">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <strong>End-to-End Privacy:</strong> Your live coordinates are encrypted and accessible exclusively by your connected partner. No location histories are shared with third parties.
          </p>
        </div>

        {/* Footer Done button */}
        <button
          onClick={onClose}
          className="mt-4 w-full rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 text-xs shadow-md transition"
        >
          Done & Close
        </button>
      </div>
    </div>
  );
};
