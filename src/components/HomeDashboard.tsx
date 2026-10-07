import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  calculateDistanceKm,
  kmToMiles,
  getTimeDifferenceDescription,
  getLocalTimeFormatted,
  isPartnerSleeping,
  getDaysTogether,
  getCountdownBreakdown,
  getIndianDailyRhythm,
  getIndianTravelComparison,
} from '../utils/distance';
import { formatISTTime } from '../utils/indianCities';
import { QuickLoveType, MoodType } from '../types';
import {
  Heart,
  Clock,
  MapPin,
  Moon,
  Sun,
  Calendar,
  Sparkles,
  MessageCircle,
  ChevronRight,
  ShieldCheck,
  Send,
  Eye,
  Flame,
  Award,
  Navigation2,
  Compass,
  RefreshCw,
  Phone,
  Video,
  Bell,
} from 'lucide-react';
import { LiveLocationModal } from './LiveLocationModal';
import { LiveLocationMap } from './LiveLocationMap';
import { AndroidDownloadBanner } from './AndroidDownloadBanner';

export const HomeDashboard: React.FC = () => {
  const {
    currentUser,
    partnerUser,
    couple,
    messages,
    moods,
    memories,
    sendQuickLove,
    logMood,
    setActiveTab,
    quickLoveBurst,
    requestLocationPermission,
    startCall,
    isPartnerPaired,
    pairWithPartnerCode,
    firebaseUser,
    notifications,
    markNotificationRead,
    clearAllNotifications,
  } = useApp();

  const [currentTimeTick, setCurrentTimeTick] = useState(Date.now());
  const [showMoodSelector, setShowMoodSelector] = useState(false);
  const [selectedMoodNote, setSelectedMoodNote] = useState('');
  const [selectedMoodType, setSelectedMoodType] = useState<MoodType>('loved');
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [peekWallpaper, setPeekWallpaper] = useState(false);
  const [dismissPairingCard, setDismissPairingCard] = useState(false);
  const [copiedMyCode, setCopiedMyCode] = useState(false);
  const [partnerCodeInput, setPartnerCodeInput] = useState('');
  const [isLinkingCode, setIsLinkingCode] = useState(false);
  const [linkCodeMessage, setLinkCodeMessage] = useState<string | null>(null);
  const [linkCodeSuccess, setLinkCodeSuccess] = useState(false);
  const [manualShowPairing, setManualShowPairing] = useState(false);

  const [copiedInviteLink, setCopiedInviteLink] = useState(false);
  const [showLoveAlerts, setShowLoveAlerts] = useState(false);
  const unreadNotifsCount = notifications.filter((n) => !n.isRead).length;

  const handleCopyCode = async () => {
    const code = couple?.code || currentUser.coupleCode || 'PAIR-CODE';
    try {
      await navigator.clipboard.writeText(code);
      setCopiedMyCode(true);
      setTimeout(() => setCopiedMyCode(false), 2500);
    } catch (e) {}
  };

  const handleCopyInviteLink = async () => {
    const code = couple?.code || currentUser.coupleCode || 'PAIR-CODE';
    const inviteUrl = `${window.location.origin}/?code=${encodeURIComponent(code)}`;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedInviteLink(true);
      setTimeout(() => setCopiedInviteLink(false), 2500);
    } catch (e) {}
  };

  const handleShareWhatsApp = () => {
    const code = couple?.code || currentUser.coupleCode || 'PAIR-CODE';
    const inviteUrl = `${window.location.origin}/?code=${encodeURIComponent(code)}`;
    const message = `Hey my love! ❤️ Join me on BetweenUs so we can chat and track our space.\n\nOur private couple code: ${code}\n\nTap here to connect directly: ${inviteUrl}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: 'BetweenUs Couple Invitation',
        text: message,
        url: inviteUrl,
      }).catch(() => {
        window.open(whatsappUrl, '_blank');
      });
    } else {
      window.open(whatsappUrl, '_blank');
    }
  };

  const handleDirectLinkCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = partnerCodeInput.trim().toUpperCase();
    if (!clean) {
      setLinkCodeMessage('Please enter your partner\'s couple code.');
      setLinkCodeSuccess(false);
      return;
    }
    const myCode = (couple?.code || currentUser.coupleCode || '').toUpperCase();
    if (clean === myCode) {
      setLinkCodeMessage('That is your own code! Enter your partner\'s code to link with them.');
      setLinkCodeSuccess(false);
      return;
    }

    setIsLinkingCode(true);
    setLinkCodeMessage('Connecting with your partner in cloud...');
    try {
      const res = await pairWithPartnerCode(clean);
      setLinkCodeMessage(res.message);
      setLinkCodeSuccess(res.success);
      if (res.success) {
        setPartnerCodeInput('');
      }
    } catch (err: any) {
      setLinkCodeMessage(err?.message || 'Failed to connect. Please verify the code.');
      setLinkCodeSuccess(false);
    } finally {
      setIsLinkingCode(false);
    }
  };

  // Update clock every second for live IST timing
  useEffect(() => {
    const interval = setInterval(() => setCurrentTimeTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const bothShareLocation = currentUser.shareLocation && partnerUser.shareLocation;
  const hasCoordinates =
    currentUser.location &&
    partnerUser.location &&
    currentUser.location.latitude &&
    partnerUser.location.latitude;

  let distanceKm = 0;
  let distanceMiles = 0;
  if (bothShareLocation && hasCoordinates) {
    distanceKm = calculateDistanceKm(
      currentUser.location!.latitude,
      currentUser.location!.longitude,
      partnerUser.location!.latitude,
      partnerUser.location!.longitude
    );
    distanceMiles = kmToMiles(distanceKm);
  }

  const timeDiff = getTimeDifferenceDescription(currentUser.timeZone, partnerUser.timeZone);
  const liveIstTime = formatISTTime(new Date(currentTimeTick), { withSeconds: true });
  const userSleeping = isPartnerSleeping(
    currentUser.timeZone || 'Asia/Kolkata',
    currentUser.sleepStartHour,
    currentUser.sleepEndHour
  );
  const partnerSleeping = isPartnerSleeping(
    partnerUser.timeZone || 'Asia/Kolkata',
    partnerUser.sleepStartHour,
    partnerUser.sleepEndHour
  );

  const daysTogether = getDaysTogether(couple?.anniversaryDate || currentUser.anniversaryDate);
  const countdown = getCountdownBreakdown(
    couple?.nextMeetingDate || new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString()
  );

  const partnerLatestMood = moods.find((m) => m.userId === partnerUser.id);
  const userLatestMood = moods.find((m) => m.userId === currentUser.id);
  const lastMessage = messages[messages.length - 1];
  const recentMemory = memories[0];

  const moodEmojis: Record<MoodType, { emoji: string; label: string }> = {
    happy: { emoji: '😊', label: 'Happy' },
    loved: { emoji: '🥰', label: 'Deeply Loved' },
    peaceful: { emoji: '😌', label: 'Peaceful' },
    normal: { emoji: '😐', label: 'Normal' },
    sad: { emoji: '😔', label: 'Sad' },
    lonely: { emoji: '😞', label: 'Lonely' },
    angry: { emoji: '😡', label: 'Frustrated' },
    stressed: { emoji: '😰', label: 'Stressed' },
    missing_partner: { emoji: '❤️', label: 'Missing You' },
  };

  const handleSendMood = () => {
    logMood(selectedMoodType, selectedMoodNote.trim() || undefined);
    setShowMoodSelector(false);
    setSelectedMoodNote('');
  };

  return (
    <div className="max-w-md mx-auto px-4 py-5 space-y-5 pb-24 relative">
      {/* Quick Love Float Animation Banner */}
      {quickLoveBurst && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-heart-float flex flex-col items-center">
          <span className="text-5xl">{quickLoveBurst.emoji}</span>
          <span className="px-3 py-1 rounded-full bg-rose-600 text-white font-bold text-xs shadow-lg mt-1">
            {quickLoveBurst.senderName} sent {quickLoveBurst.type.replace('_', ' ')}!
          </span>
        </div>
      )}

      {/* Floating Wallpaper Peek Overlay & Tap to Return Indicator */}
      {peekWallpaper && (
        <div
          onClick={() => setPeekWallpaper(false)}
          className="fixed inset-0 z-30 cursor-pointer flex flex-col justify-between items-center py-12 px-4 animate-in fade-in duration-300"
        >
          <div className="bg-black/60 hover:bg-black/75 backdrop-blur-md text-white text-xs font-bold px-4 py-2 rounded-full border border-white/30 shadow-xl flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-300 animate-spin" style={{ animationDuration: '6s' }} />
            <span>Viewing Full Wallpaper • Tap anywhere to restore dashboard</span>
          </div>
          <div className="bg-black/55 backdrop-blur-md text-rose-100 text-xs font-semibold px-4 py-1.5 rounded-full border border-white/20 shadow-md">
            Holding hands across the distance ❤️
          </div>
        </div>
      )}

      {/* Top Mobile Couple Greeting & Actions */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-1.5">
            <span>
              {(() => {
                const hour = new Date(currentTimeTick).getHours();
                if (hour >= 5 && hour < 12) return 'Good morning';
                if (hour >= 12 && hour < 17) return 'Good afternoon';
                if (hour >= 17 && hour < 21) return 'Good evening';
                return 'Good night';
              })()}
              , {currentUser.name}
            </span>
            <span className="text-rose-500">❤️</span>
          </h2>
          <p className="text-[11px] sm:text-xs text-slate-600 font-bold">
            {bothShareLocation
              ? `${distanceKm.toLocaleString()} km apart • TEJA & AKHILA ❤️`
              : `TEJA & AKHILA • Connected heart to heart ❤️`}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Notifications / Love Alerts */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowLoveAlerts(!showLoveAlerts)}
              className="w-8 h-8 rounded-full bg-white/85 hover:bg-white backdrop-blur-md border border-rose-100 shadow-2xs flex items-center justify-center text-slate-600 hover:text-rose-600 transition active:scale-95 cursor-pointer relative"
              title="Love Alerts & Notifications"
              aria-label="Love Alerts"
            >
              <Bell className="w-3.5 h-3.5" />
              {unreadNotifsCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
              )}
            </button>

            {/* Notification Dropdown */}
            {showLoveAlerts && (
              <div className="absolute right-0 top-full mt-2 w-80 max-w-[88vw] bg-white rounded-2xl shadow-xl border border-rose-100 p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-rose-500" />
                    <span>Love Alerts ({notifications.length})</span>
                  </span>
                  {notifications.length > 0 && (
                    <button
                      onClick={clearAllNotifications}
                      className="text-[11px] text-rose-500 hover:underline cursor-pointer"
                    >
                      Clear all
                    </button>
                  )}
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

          {/* Wallpaper Peek Button */}
          <button
            type="button"
            onClick={() => setPeekWallpaper(!peekWallpaper)}
            className="text-xs font-bold text-slate-700 bg-white/85 hover:bg-white backdrop-blur-md px-3 py-1.5 rounded-full border border-rose-100 shadow-2xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shrink-0"
            title="Toggle wallpaper view"
          >
            <Eye className="w-3.5 h-3.5 text-rose-500" />
            <span className="hidden xs:inline">{peekWallpaper ? 'Dashboard' : 'Wallpaper'}</span>
          </button>
        </div>
      </div>

      {/* Main Home Dashboard Cards with Smooth Peek Transition */}
      <div className={`space-y-4 sm:space-y-5 transition-all duration-300 ${peekWallpaper ? 'opacity-0 pointer-events-none scale-95' : 'opacity-100 scale-100'}`}>
        {/* Android Download & Installation Banner */}
        <AndroidDownloadBanner />

        {/* Waiting for partner pairing card - WITH DIRECT CODE INPUT FIELD */}
        {((!isPartnerPaired || couple?.status === 'waiting_for_partner' || manualShowPairing) && !dismissPairingCard) ? (
          <div className="bg-gradient-to-br from-rose-500 via-pink-500 to-rose-600 rounded-[24px] p-4 sm:p-5 text-white shadow-xl shadow-rose-950/20 border border-white/30 relative overflow-hidden animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-white/20 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-300 animate-ping" />
                <span className="text-xs font-black uppercase tracking-wider text-rose-100">
                  {isPartnerPaired ? 'Couple Link Space' : 'Waiting for Partner to Connect'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDismissPairingCard(true)}
                className="text-white/80 hover:text-white text-xs px-2 py-0.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
                title="Minimize banner"
              >
                ✕ Minimize
              </button>
            </div>

            <p className="text-xs text-rose-100 mb-3 leading-relaxed">
              BetweenUs is an exclusive private sanctuary for just the two of you. Use either person&apos;s code to connect!
            </p>

            {/* Option 1: Your Code */}
            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 border border-white/25 mb-3.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-rose-100 uppercase tracking-wider mb-1.5">
                <span>Option 1: Share Your Code</span>
                <span className="text-[10px] text-white/80 lowercase">your code</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-base sm:text-lg font-mono font-black tracking-widest pl-1 select-all text-white drop-shadow-xs">
                  {couple?.code || currentUser.coupleCode || 'PAIR-CODE'}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="px-3 py-1.5 bg-white text-rose-600 rounded-xl text-xs font-bold shadow-xs hover:bg-rose-50 transition active:scale-95 cursor-pointer"
                  >
                    {copiedMyCode ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-emerald-700 transition active:scale-95 cursor-pointer"
                  >
                    WhatsApp
                  </button>
                </div>
              </div>
            </div>

            {/* Option 2: Enter Partner's Code (DIRECT TEXT INPUT FIELD) */}
            <div className="bg-white/15 backdrop-blur-md rounded-2xl p-3 border border-white/25">
              <div className="flex items-center justify-between text-[11px] font-bold text-rose-100 uppercase tracking-wider mb-2">
                <span>Option 2: Enter Partner&apos;s Code</span>
                <span className="text-[10px] text-emerald-200 font-bold">link instantly</span>
              </div>
              <form onSubmit={handleDirectLinkCode} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={partnerCodeInput}
                    onChange={(e) => setPartnerCodeInput(e.target.value.toUpperCase())}
                    placeholder="E.G. PAIR-7K9A"
                    className="flex-1 min-w-0 bg-white text-slate-900 placeholder-slate-400 font-mono font-black text-xs uppercase px-3 py-2.5 rounded-xl border border-white/40 focus:outline-none focus:ring-2 focus:ring-rose-300 tracking-wider shadow-inner"
                  />
                  <button
                    type="submit"
                    disabled={isLinkingCode || !partnerCodeInput.trim()}
                    className="px-4 py-2.5 bg-slate-950 hover:bg-black active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md transition disabled:opacity-50 shrink-0 cursor-pointer flex items-center gap-1"
                  >
                    <span>{isLinkingCode ? 'Linking...' : 'Link & Begin ❤️'}</span>
                  </button>
                </div>
              </form>

              {linkCodeMessage && (
                <div
                  className={`mt-2.5 p-2.5 rounded-xl text-xs font-bold text-center animate-in fade-in ${
                    linkCodeSuccess
                      ? 'bg-emerald-500/40 text-emerald-100 border border-emerald-300/40'
                      : 'bg-rose-950/60 text-rose-200 border border-rose-400/30'
                  }`}
                >
                  {linkCodeMessage}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Minimized pill if dismissed or already paired so user can always access it with 1 click */
          <div className="flex items-center justify-between bg-white/80 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-rose-200/60 shadow-2xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-800 truncate">
                Couple Code: <span className="font-mono text-rose-600 font-black">{couple?.code || currentUser.coupleCode || 'PAIR-CODE'}</span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setDismissPairingCard(false);
                setManualShowPairing(true);
              }}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1 rounded-xl transition cursor-pointer shrink-0 active:scale-95"
            >
              Enter Code ➔
            </button>
          </div>
        )}

        {/* Couple Connection Centerpiece Card - Sleek, Romantic, Mobile-Optimized */}
        <div className="relative overflow-hidden rounded-[24px] p-4 sm:p-5 text-white shadow-xl shadow-rose-950/20 border border-white/30 backdrop-blur-xl">
          {/* Holding hands backdrop image with romantic rose tint */}
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
            <img
              src="/home-bg.jpg"
              alt=""
              className="w-full h-full object-cover object-[center_35%] filter brightness-90 saturate-110"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-rose-950/85 via-rose-900/80 to-pink-950/85 backdrop-blur-[1px]" />
          </div>

          <div className="relative z-10">
            {/* Top status bar inside card */}
            <div className="flex items-center justify-between text-[11px] text-rose-100 mb-2.5 pb-2 border-b border-white/15">
              <span className="inline-flex items-center gap-1 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Connected</span>
              </span>
              <span className="text-[10px] font-semibold bg-white/20 px-2 py-0.5 rounded-full">
                {daysTogether} days together
              </span>
            </div>

            {/* Profile circles with heart connection */}
            <div className="flex items-center justify-center gap-4 sm:gap-6 my-2">
              {/* Your photo */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-white shadow-md ring-2 ring-rose-400/40"
                  />
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full bg-white text-rose-700 text-[9px] font-black shadow-2xs whitespace-nowrap">
                    You
                  </span>
                </div>
                <span className="text-xs font-extrabold text-white mt-2 truncate max-w-[70px]">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-rose-200">
                  {currentUser.city || 'Hyderabad'}
                </span>
              </div>

              {/* Heart Pulse Connection */}
              <div className="flex flex-col items-center justify-center -mt-2">
                <div className="w-10 h-10 rounded-full bg-white/25 backdrop-blur-md flex items-center justify-center shadow-inner border border-white/40 ring-4 ring-white/10">
                  <Heart className="w-5 h-5 text-white fill-rose-500 animate-pulse" />
                </div>
                <span className="text-[9px] text-rose-200 uppercase font-black tracking-wider mt-1.5">
                  Forever
                </span>
              </div>

              {/* Partner photo */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <img
                    src={partnerUser.avatarUrl}
                    alt={partnerUser.name}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-white shadow-md ring-2 ring-rose-400/40"
                  />
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full bg-white text-rose-700 text-[9px] font-black shadow-2xs whitespace-nowrap">
                    Partner
                  </span>
                </div>
                <span className="text-xs font-extrabold text-white mt-2 truncate max-w-[70px]">
                  {partnerUser.name}
                </span>
                <span className="text-[10px] text-rose-200">
                  {partnerUser.city || 'Bengaluru'}
                </span>
              </div>
            </div>

            {/* Direct 1-Tap Voice & Video Call on Phones & Laptops */}
            <div className="mt-3.5 pt-3 border-t border-white/20 flex items-center justify-center gap-2.5">
              <button
                type="button"
                onClick={() => startCall('voice')}
                className="flex-1 py-2 px-3 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer backdrop-blur-md shadow-xs border border-white/25"
                title={`Voice Call with ${partnerUser.name}`}
              >
                <Phone className="w-3.5 h-3.5 text-rose-300" />
                <span>Voice Call</span>
              </button>
              <button
                type="button"
                onClick={() => startCall('video')}
                className="flex-1 py-2 px-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-md shadow-rose-950/40 border border-white/30"
                title={`Video Call with ${partnerUser.name}`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Video Call</span>
              </button>
            </div>

            {/* Bottom Distance & GPS Pill */}
            <div className="mt-3 pt-2.5 border-t border-white/15 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setShowLocationDialog(true)}
                className="inline-flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-full text-[11px] font-bold transition active:scale-95 cursor-pointer truncate mr-2"
              >
                <MapPin className="w-3.5 h-3.5 text-rose-300 shrink-0" />
                <span className="truncate">
                  {bothShareLocation
                    ? `${distanceKm.toLocaleString()} km apart`
                    : 'Location radar'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setShowLocationDialog(true)}
                className="text-[10px] font-bold text-rose-100 hover:text-white bg-white/15 px-2 py-0.5 rounded-full transition cursor-pointer shrink-0"
              >
                View Map ↗
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions 2-Column Mobile Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
              <span>⚡</span>
              <span>Quick Actions</span>
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* 1. Send Message */}
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className="p-3.5 rounded-2xl bg-white hover:bg-rose-50/50 border border-rose-100 shadow-2xs text-left transition tap-bounce group cursor-pointer flex flex-col justify-between min-h-[74px]"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md">Chat</span>
              </div>
              <div>
                <div className="font-extrabold text-xs text-slate-800">Send Message</div>
                <div className="text-[10px] text-slate-400 truncate">Private messenger</div>
              </div>
            </button>

            {/* 2. Video Call */}
            <button
              type="button"
              onClick={() => startCall('video')}
              className="p-3.5 rounded-2xl bg-gradient-to-br from-rose-50/90 via-pink-50/60 to-white hover:from-rose-100/90 border border-rose-200/90 shadow-2xs text-left transition tap-bounce group cursor-pointer flex flex-col justify-between min-h-[74px]"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white flex items-center justify-center group-hover:scale-110 transition shadow-xs shadow-rose-500/30">
                  <Video className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-rose-700 bg-rose-100/80 px-1.5 py-0.5 rounded-md">Live HD</span>
              </div>
              <div>
                <div className="font-extrabold text-xs text-slate-800">Video Call</div>
                <div className="text-[10px] text-rose-600 font-semibold truncate">Phone & Laptop</div>
              </div>
            </button>

            {/* 3. Voice Call */}
            <button
              type="button"
              onClick={() => startCall('voice')}
              className="p-3.5 rounded-2xl bg-white hover:bg-rose-50/50 border border-rose-100 shadow-2xs text-left transition tap-bounce group cursor-pointer flex flex-col justify-between min-h-[74px]"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition border border-rose-200/60">
                  <Phone className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded-md">Voice</span>
              </div>
              <div>
                <div className="font-extrabold text-xs text-slate-800">Voice Call</div>
                <div className="text-[10px] text-slate-400 truncate">Clear audio stream</div>
              </div>
            </button>

            {/* 4. Live Location */}
            <button
              type="button"
              onClick={() => setShowLocationDialog(true)}
              className="p-3.5 rounded-2xl bg-white hover:bg-rose-50/50 border border-rose-100 shadow-2xs text-left transition tap-bounce group cursor-pointer flex flex-col justify-between min-h-[74px]"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition">
                  <MapPin className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md">GPS</span>
              </div>
              <div>
                <div className="font-extrabold text-xs text-slate-800">Live Location</div>
                <div className="text-[10px] text-slate-400 truncate">{bothShareLocation ? `${distanceKm} km radar` : 'Manage sharing'}</div>
              </div>
            </button>

            {/* 3. Couple Games */}
            <button
              type="button"
              onClick={() => setActiveTab('connect')}
              className="p-3.5 rounded-2xl bg-white hover:bg-rose-50/50 border border-rose-100 shadow-2xs text-left transition tap-bounce group cursor-pointer flex flex-col justify-between min-h-[74px]"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition">
                  <Heart className="w-4 h-4 fill-purple-600" />
                </div>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-md">Fun</span>
              </div>
              <div>
                <div className="font-extrabold text-xs text-slate-800">Couple Games</div>
                <div className="text-[10px] text-slate-400 truncate">Quizzes & Truth/Dare</div>
              </div>
            </button>

            {/* 4. Add Memory */}
            <button
              type="button"
              onClick={() => setActiveTab('memories')}
              className="p-3.5 rounded-2xl bg-white hover:bg-rose-50/50 border border-rose-100 shadow-2xs text-left transition tap-bounce group cursor-pointer flex flex-col justify-between min-h-[74px]"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-pink-50 text-pink-600 flex items-center justify-center group-hover:scale-110 transition">
                  <Calendar className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-pink-700 bg-pink-50 px-1.5 py-0.5 rounded-md">Story</span>
              </div>
              <div>
                <div className="font-extrabold text-xs text-slate-800">Add Memory</div>
                <div className="text-[10px] text-slate-400 truncate">Photos & milestones</div>
              </div>
            </button>

            {/* 5. Couple Games & Quiz */}
            <button
              type="button"
              onClick={() => setActiveTab('connect')}
              className="p-3.5 rounded-2xl bg-white hover:bg-rose-50/50 border border-rose-100 shadow-2xs text-left transition tap-bounce group cursor-pointer flex flex-col justify-between min-h-[74px]"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md">Quiz</span>
              </div>
              <div>
                <div className="font-extrabold text-xs text-slate-800">Couple Quiz</div>
                <div className="text-[10px] text-slate-400 truncate">Fun questions & prompts</div>
              </div>
            </button>

            {/* 6. Emergency SOS */}
            <button
              type="button"
              onClick={() => setShowLocationDialog(true)}
              className="p-3.5 rounded-2xl bg-red-50/60 hover:bg-red-50 border border-red-200/80 shadow-2xs text-left transition tap-bounce group cursor-pointer flex flex-col justify-between min-h-[74px]"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center group-hover:scale-110 transition">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded-md">Safety</span>
              </div>
              <div>
                <div className="font-extrabold text-xs text-red-900">Safety & SOS</div>
                <div className="text-[10px] text-red-600 truncate">Emergency center</div>
              </div>
            </button>
          </div>
        </div>

      {/* Two-Person Live Location Geoapify Map */}
      <LiveLocationMap />

      {/* Android Easy Download / Install Banner */}
      <AndroidDownloadBanner />

      {/* Indian Standard Time (IST) & Dual City Timing Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 bg-white/70 backdrop-blur-md px-3 py-1 rounded-full border border-white/80 shadow-2xs flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-rose-500 animate-spin" style={{ animationDuration: '60s' }} />
            <span>Timings for Both • Indian Standard Time (IST)</span>
          </span>
          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50/90 backdrop-blur-xs px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
            UTC +05:30 (IST)
          </span>
        </div>

        {/* Live Synchronized Dual Clocks */}
        <div className="grid grid-cols-2 gap-3">
          {/* Your Live Time Card */}
          <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white/80 relative overflow-hidden group hover:border-rose-300 transition">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
              <span className="text-slate-800 font-extrabold flex items-center gap-1 truncate">
                <span>{currentUser.name}</span>
                <span className="text-[10px] text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded-full font-bold">You</span>
              </span>
              {userSleeping ? (
                <Moon className="w-4 h-4 text-indigo-500 shrink-0" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500 shrink-0" />
              )}
            </div>
            {/* Live Ticking IST Clock with seconds */}
            <div className="text-xl font-black text-slate-900 tracking-tight font-mono">
              {liveIstTime}
            </div>
            <div className="text-[11px] text-slate-600 font-medium mt-1 truncate flex items-center gap-1">
              <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
              <span className="truncate">{currentUser.city || 'Hyderabad'}</span>
            </div>
            <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-slate-100">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  userSleeping ? 'bg-indigo-400' : 'bg-emerald-500 animate-pulse'
                }`}
              />
              <span className="text-[10px] font-semibold text-slate-600 truncate">
                {userSleeping ? 'Sleeping 🌙' : 'Awake & Active ☀️'}
              </span>
            </div>
          </div>

          {/* Partner Live Time Card */}
          <div className="bg-white/90 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-white/80 relative overflow-hidden group hover:border-rose-300 transition">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-1">
              <span className="text-slate-800 font-extrabold flex items-center gap-1 truncate">
                <span>{partnerUser.name}</span>
                <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded-full font-bold">Partner</span>
              </span>
              {partnerSleeping ? (
                <Moon className="w-4 h-4 text-indigo-500 shrink-0" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500 shrink-0" />
              )}
            </div>
            {/* Live Ticking IST Clock with seconds */}
            <div className="text-xl font-black text-slate-900 tracking-tight font-mono">
              {liveIstTime}
            </div>
            <div className="text-[11px] text-slate-600 font-medium mt-1 truncate flex items-center gap-1">
              <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
              <span className="truncate">{partnerUser.city || 'Bengaluru'}</span>
            </div>
            <div className="flex items-center gap-1 mt-1.5 pt-1.5 border-t border-slate-100">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  partnerSleeping ? 'bg-indigo-400' : 'bg-emerald-500 animate-pulse'
                }`}
              />
              <span className="text-[10px] font-semibold text-slate-600 truncate">
                {partnerSleeping ? 'Sleeping 🌙' : 'Awake & Active ☀️'}
              </span>
            </div>
          </div>
        </div>

        {/* Both Status Overview Banner */}
        <div className={`p-2.5 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2 border backdrop-blur-xs ${
          !userSleeping && !partnerSleeping
            ? 'bg-emerald-50/90 border-emerald-200/80 text-emerald-800'
            : 'bg-indigo-50/90 border-indigo-200/80 text-indigo-800'
        }`}>
          <div className="flex items-center gap-1.5 truncate">
            <span>{!userSleeping && !partnerSleeping ? '✨' : '🌙'}</span>
            <span className="truncate">
              {!userSleeping && !partnerSleeping
                ? `Both awake across India (${currentUser.city || 'Hyderabad'} & ${partnerUser.city || 'Bengaluru'})`
                : partnerSleeping
                ? `${partnerUser.name} is resting peacefully in ${partnerUser.city || 'Bengaluru'} 🌙`
                : `${currentUser.name} is in sleep hours 🌙`}
            </span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 border shrink-0">
            IST • India
          </span>
        </div>


        {/* Indian Daily Rhythm & Shared Connection Card */}
        {(() => {
          const indianRhythm = getIndianDailyRhythm(new Date());
          return (
            <div className="bg-gradient-to-r from-amber-50/90 via-rose-50/90 to-pink-50/90 backdrop-blur-md rounded-2xl p-3.5 border border-white/80 shadow-xs text-xs">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{indianRhythm.emoji}</span>
                  <span className="font-extrabold text-slate-800 text-xs">{indianRhythm.phase}</span>
                </div>
                <span className="text-[10px] font-bold text-rose-600 bg-white/90 px-2 py-0.5 rounded-full border border-rose-200">
                  {indianRhythm.timeRange}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed mb-2">
                {indianRhythm.tagline}
              </p>
              <div className="bg-white/90 p-2 rounded-xl border border-rose-100/90 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-700 font-medium truncate">
                  💡 {indianRhythm.suggestedAction}
                </span>
                {indianRhythm.callRecommended && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 shrink-0">
                    Call Time 📞
                  </span>
                )}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Send Love Quick Interaction Bar */}
      <div className="bg-white/90 backdrop-blur-md rounded-3xl p-4 shadow-sm border border-white/80">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-rose-500" />
            <span>Send Love to {partnerUser.name}</span>
          </span>
          <span className="text-[11px] text-rose-500 font-medium">Instant heart ping</span>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {(
            [
              { type: 'love_you', label: 'Love you', emoji: '❤️' },
              { type: 'hug', label: 'Hug', emoji: '🤗' },
              { type: 'kiss', label: 'Kiss', emoji: '😘' },
              { type: 'miss_you', label: 'Miss you', emoji: '🥰' },
              { type: 'thinking_of_you', label: 'Thinking', emoji: '🌹' },
            ] as const
          ).map((item) => (
            <button
              key={item.type}
              onClick={() => sendQuickLove(item.type)}
              className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-rose-50/70 hover:bg-rose-100 text-slate-700 active:scale-95 transition group"
            >
              <span className="text-2xl group-hover:scale-125 transition transform duration-150">
                {item.emoji}
              </span>
              <span className="text-[10px] font-semibold text-rose-900 mt-1 truncate max-w-full">
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Countdown to Next Meeting */}
      <div className="bg-gradient-to-r from-pink-600/95 via-rose-600/90 to-rose-700/95 backdrop-blur-md rounded-3xl p-5 text-white shadow-xl shadow-rose-950/20 border border-white/20 relative overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-rose-100 font-bold block">
                Next Reunion
              </span>
              <h3 className="font-extrabold text-base leading-tight">
                {couple?.nextMeetingTitle || 'Our Next Flight'}
              </h3>
            </div>
          </div>
          <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-medium">
            {couple?.meetingLocation || 'Together'}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4 text-center">
          <div className="bg-white/15 rounded-2xl p-2.5 backdrop-blur-xs">
            <span className="text-2xl font-black block leading-none">{countdown.days}</span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-rose-100 mt-1 block">
              Days
            </span>
          </div>
          <div className="bg-white/15 rounded-2xl p-2.5 backdrop-blur-xs">
            <span className="text-2xl font-black block leading-none">{countdown.hours}</span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-rose-100 mt-1 block">
              Hours
            </span>
          </div>
          <div className="bg-white/15 rounded-2xl p-2.5 backdrop-blur-xs">
            <span className="text-2xl font-black block leading-none">{countdown.minutes}</span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-rose-100 mt-1 block">
              Minutes
            </span>
          </div>
        </div>
      </div>

      {/* Today's Mood & Emotional Connection Card */}
      <div className="bg-white/90 backdrop-blur-md rounded-3xl p-5 shadow-sm border border-white/80">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <span>💭</span>
            <span>Emotional Connection & Mood</span>
          </h3>
          <button
            onClick={() => setShowMoodSelector(!showMoodSelector)}
            className="text-xs text-rose-600 font-semibold hover:underline"
          >
            {showMoodSelector ? 'Cancel' : 'Update Mood'}
          </button>
        </div>

        {/* Mood Update Drawer/Form */}
        {showMoodSelector && (
          <div className="mb-4 p-4 rounded-2xl bg-rose-50/60 border border-rose-100 space-y-3 animate-in fade-in">
            <div className="text-xs font-semibold text-slate-700">How are you feeling right now?</div>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(moodEmojis) as MoodType[]).map((key) => {
                const isSelected = selectedMoodType === key;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedMoodType(key)}
                    className={`p-2 rounded-xl text-left flex items-center gap-2 text-xs font-medium transition ${
                      isSelected
                        ? 'bg-rose-500 text-white shadow-xs font-bold'
                        : 'bg-white text-slate-700 hover:bg-rose-100'
                    }`}
                  >
                    <span>{moodEmojis[key].emoji}</span>
                    <span className="truncate">{moodEmojis[key].label}</span>
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              value={selectedMoodNote}
              onChange={(e) => setSelectedMoodNote(e.target.value)}
              placeholder="Add an optional note (e.g., 'Missing your voice tonight')"
              className="w-full text-xs px-3 py-2 bg-white rounded-xl border border-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
            <button
              onClick={handleSendMood}
              className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-xs transition"
            >
              Share Mood with {partnerUser.name}
            </button>
          </div>
        )}

        {/* Current Mood Display for both */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Partner Mood */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold">{partnerUser.name}'s Mood</span>
              {partnerLatestMood && (
                <span className="text-base">{moodEmojis[partnerLatestMood.moodType]?.emoji}</span>
              )}
            </div>
            {partnerLatestMood ? (
              <div>
                <span className="text-sm font-bold text-slate-800">
                  {moodEmojis[partnerLatestMood.moodType]?.label}
                </span>
                {partnerLatestMood.note && (
                  <p className="text-xs text-slate-600 italic mt-0.5">
                    "{partnerLatestMood.note}"
                  </p>
                )}
                {partnerLatestMood.moodType === 'missing_partner' && (
                  <div className="mt-2 text-[11px] text-rose-600 bg-rose-50 px-2 py-1 rounded-lg font-medium flex items-center gap-1">
                    <span>💡 Suggestion:</span>
                    <span>Send them a sweet voice note!</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400">No mood shared today yet</p>
            )}
          </div>

          {/* Your Mood */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold">Your Mood</span>
              {userLatestMood && (
                <span className="text-base">{moodEmojis[userLatestMood.moodType]?.emoji}</span>
              )}
            </div>
            {userLatestMood ? (
              <div>
                <span className="text-sm font-bold text-slate-800">
                  {moodEmojis[userLatestMood.moodType]?.label}
                </span>
                {userLatestMood.note && (
                  <p className="text-xs text-slate-600 italic mt-0.5">"{userLatestMood.note}"</p>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400">Tap 'Update Mood' to share</p>
            )}
          </div>
        </div>
      </div>

      {/* Last Message Preview & Chat Shortcut */}
      {lastMessage && (
        <div
          onClick={() => setActiveTab('chat')}
          className="bg-white/90 backdrop-blur-md rounded-3xl p-4 shadow-sm border border-white/80 flex items-center justify-between gap-3 cursor-pointer hover:border-rose-200 transition"
        >
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">{lastMessage.senderName}</span>
                <span className="text-[10px] text-slate-400">
                  {new Date(lastMessage.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="text-xs text-slate-600 truncate mt-0.5">{lastMessage.text}</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
        </div>
      )}

      {/* Today's Connection Prompt / AI Spotlight */}
      <div className="bg-gradient-to-r from-amber-50/90 to-orange-50/90 backdrop-blur-md border border-amber-200/70 rounded-3xl p-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
              Today's Connection Spark
            </span>
            <p className="text-xs text-slate-700 font-medium mt-1 leading-relaxed">
              "Send each other a photo of what the sky looks like right now outside your window, and share one small win from your day."
            </p>
            <button
              onClick={() => setActiveTab('chat')}
              className="mt-2 text-xs font-bold text-amber-800 hover:text-amber-900 inline-flex items-center gap-1"
            >
              <span>Share in Couple Chat</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Memory Snapshot */}
      {recentMemory && (
        <div
          onClick={() => setActiveTab('memories')}
          className="bg-white/90 backdrop-blur-md rounded-3xl overflow-hidden shadow-sm border border-white/80 cursor-pointer hover:border-rose-200 transition"
        >
          <div className="p-4 flex items-center justify-between border-b border-slate-50">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
              <span>📸</span>
              <span>Recent Memory: {recentMemory.title}</span>
            </div>
            <span className="text-[10px] text-slate-400">{recentMemory.date}</span>
          </div>
          <div className="relative h-44 overflow-hidden bg-black">
            {recentMemory.mediaType === 'video' || recentMemory.mediaUrl.startsWith('data:video') || recentMemory.mediaUrl.endsWith('.mp4') ? (
              <video
                src={recentMemory.mediaUrl}
                muted
                loop
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={recentMemory.mediaUrl}
                alt={recentMemory.title}
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-4 text-white">
              <p className="text-xs text-slate-100 line-clamp-2">{recentMemory.description}</p>
            </div>
          </div>
        </div>
      )}

      {/* Live Location Access for Both Partners Card */}
      <div className="p-4 rounded-3xl bg-white/90 backdrop-blur-md border border-white/80 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-rose-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white shadow-xs">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-sm text-slate-800 block">
                Live Location for Both Partners
              </span>
              <span className="text-[11px] text-slate-500">
                Continuous distance sync & city presence across India
              </span>
            </div>
          </div>

          <button
            onClick={() => setShowLocationDialog(true)}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1 active:scale-95"
          >
            <span>Live Map & GPS</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Dual Partner Status Tiles */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* You Tile */}
          <div className="p-2.5 rounded-2xl bg-rose-50/60 border border-rose-100 flex items-center justify-between">
            <div className="min-w-0 pr-1">
              <span className="text-[10px] font-bold text-rose-700 uppercase block truncate">
                {currentUser.name} (You)
              </span>
              <span className="font-bold text-slate-800 text-xs truncate block">
                {currentUser.city || 'Hyderabad'}
              </span>
              <span className="text-[10px] text-emerald-600 font-bold block truncate">
                🟢 GPS Always ON
              </span>
            </div>
            <div
              className="p-1.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0 shadow-2xs"
              title="Continuous Live GPS Active"
            >
              <Navigation2 className="w-3.5 h-3.5 rotate-45 animate-pulse" />
            </div>
          </div>

          {/* Partner Tile */}
          <div className="p-2.5 rounded-2xl bg-pink-50/60 border border-pink-100 flex items-center justify-between">
            <div className="min-w-0 pr-1">
              <span className="text-[10px] font-bold text-pink-700 uppercase block truncate">
                {partnerUser.name} (Partner)
              </span>
              <span className="font-bold text-slate-800 text-xs truncate block">
                {partnerUser.city || 'Bengaluru'}
              </span>
              <span className="text-[10px] text-slate-500 block truncate">
                {partnerUser.shareLocation ? '🟢 Sharing GPS' : '🔴 Location Paused'}
              </span>
            </div>
            <button
              onClick={() => setShowLocationDialog(true)}
              className="p-1.5 rounded-xl bg-white text-slate-600 hover:text-pink-600 border border-pink-200 shrink-0 shadow-2xs"
              title="View or update partner location"
            >
              <Navigation2 className="w-3.5 h-3.5 rotate-45" />
            </button>
          </div>
        </div>

        {/* Bottom Dedication Section */}
        <div className="text-center pt-6 pb-20">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50/80 border border-rose-200/60 shadow-2xs mb-2">
            <span className="text-rose-500 text-xs">❤️</span>
            <span className="text-[11px] font-bold text-slate-700">Between<span className="text-rose-600">Us</span></span>
          </div>
          <p className="text-xs font-black text-rose-600 tracking-wide">
            starts with TEJA and AKHILA
          </p>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">
            Hyderabad ❤️ Bengaluru • Connected heart to heart across the miles
          </p>
        </div>
      </div>
      </div>

      {/* Live Location Access Modal Instance */}
      <LiveLocationModal
        isOpen={showLocationDialog}
        onClose={() => setShowLocationDialog(false)}
      />
    </div>
  );
};
