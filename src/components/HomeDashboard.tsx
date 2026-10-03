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
  EyeOff,
  Flame,
  Award,
  Navigation2,
  Compass,
  RefreshCw,
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
    stopSharingLocation,
  } = useApp();

  const [currentTimeTick, setCurrentTimeTick] = useState(Date.now());
  const [showMoodSelector, setShowMoodSelector] = useState(false);
  const [selectedMoodNote, setSelectedMoodNote] = useState('');
  const [selectedMoodType, setSelectedMoodType] = useState<MoodType>('loved');
  const [showLocationDialog, setShowLocationDialog] = useState(false);

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

      {/* Hero Couple Avatars & Distance Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-rose-500 via-rose-600 to-pink-600 p-6 text-white shadow-xl shadow-rose-500/20">
        {/* Soft background glow circles */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full bg-pink-400/20 blur-xl" />

        <div className="relative z-10 text-center">
          <div className="text-xs font-semibold tracking-wider uppercase text-rose-100 flex items-center justify-center gap-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-rose-200" />
            <span>{couple?.relationshipName || `${currentUser.name} & ${partnerUser.name}`}</span>
          </div>

          {/* Intertwined Avatars with connecting heart */}
          <div className="flex items-center justify-center gap-4 my-3">
            {/* User Avatar */}
            <div className="relative">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name}
                className="w-18 h-18 rounded-full object-cover border-3 border-white/90 shadow-md ring-4 ring-rose-400/30"
              />
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-white text-rose-700 text-[10px] font-bold shadow-xs whitespace-nowrap">
                You
              </span>
            </div>

            {/* Connecting heart & days together */}
            <div className="flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner border border-white/30">
                <Heart className="w-5 h-5 text-white fill-white/80 animate-pulse" />
              </div>
              <span className="text-[10px] text-rose-100 font-semibold mt-1">
                {daysTogether} days
              </span>
            </div>

            {/* Partner Avatar */}
            <div className="relative">
              <img
                src={partnerUser.avatarUrl}
                alt={partnerUser.name}
                className="w-18 h-18 rounded-full object-cover border-3 border-white/90 shadow-md ring-4 ring-rose-400/30"
              />
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-white text-rose-700 text-[10px] font-bold shadow-xs whitespace-nowrap">
                {partnerUser.name}
              </span>
            </div>
          </div>

          {/* Distance Indicator & Live Location Access */}
          <div className="mt-4 pt-3 border-t border-white/20 flex flex-col items-center">
            {bothShareLocation ? (
              <>
                <button
                  onClick={() => setShowLocationDialog(true)}
                  className="flex items-center gap-1.5 text-sm font-bold bg-white/20 hover:bg-white/30 text-white px-4 py-1.5 rounded-full backdrop-blur-xs transition shadow-xs group"
                  title="Click to view live coordinates, GPS status, and map details"
                >
                  <MapPin className="w-4 h-4 text-rose-200 group-hover:scale-110 transition" />
                  <span>
                    {distanceKm.toLocaleString()} km across India ❤️
                  </span>
                  <span className="text-[10px] bg-white/25 px-1.5 py-0.2 rounded-full font-bold ml-1">
                    Live
                  </span>
                </button>
                <div className="text-[11px] text-rose-100 font-medium mt-1">
                  {getIndianTravelComparison(distanceKm)}
                </div>
              </>
            ) : (
              <button
                onClick={() => setShowLocationDialog(true)}
                className="flex items-center gap-1.5 text-xs text-rose-100 bg-white/15 hover:bg-white/25 px-3.5 py-1.5 rounded-full transition"
              >
                <MapPin className="w-3.5 h-3.5 opacity-90" />
                <span>
                  {!currentUser.shareLocation
                    ? 'Your live location paused — Click to enable'
                    : `Waiting for ${partnerUser.name} to share location`}
                </span>
              </button>
            )}

            {/* Cities / Locations & Manage Trigger */}
            <div className="text-[11px] text-rose-200 mt-1 font-semibold flex items-center gap-1.5">
              <span>{currentUser.city || 'Hyderabad'}</span>
              <span>⇄</span>
              <span>{partnerUser.city || 'Bengaluru'}</span>
              <button
                onClick={() => setShowLocationDialog(true)}
                className="ml-1 text-[10px] bg-white/20 hover:bg-white/30 text-white px-2 py-0.5 rounded-full font-bold transition flex items-center gap-1"
              >
                <Compass className="w-3 h-3" />
                <span>Manage GPS</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Two-Person Live Location Geoapify Map */}
      <LiveLocationMap />

      {/* Android Easy Download / Install Banner */}
      <AndroidDownloadBanner />

      {/* Indian Standard Time (IST) & Dual City Timing Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-rose-500 animate-spin" style={{ animationDuration: '60s' }} />
            <span>Timings for Both • Indian Standard Time (IST)</span>
          </span>
          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
            UTC +05:30 (IST)
          </span>
        </div>

        {/* Live Synchronized Dual Clocks */}
        <div className="grid grid-cols-2 gap-3">
          {/* Your Live Time Card */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-rose-100/80 relative overflow-hidden group hover:border-rose-300 transition">
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
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-rose-100/80 relative overflow-hidden group hover:border-rose-300 transition">
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
        <div className={`p-2.5 rounded-2xl text-xs font-semibold flex items-center justify-between gap-2 border ${
          !userSleeping && !partnerSleeping
            ? 'bg-emerald-50/90 border-emerald-200 text-emerald-800'
            : 'bg-indigo-50/90 border-indigo-200 text-indigo-800'
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
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 border shrink-0">
            IST • India
          </span>
        </div>


        {/* Indian Daily Rhythm & Shared Connection Card */}
        {(() => {
          const indianRhythm = getIndianDailyRhythm(new Date());
          return (
            <div className="bg-gradient-to-r from-amber-50/80 via-rose-50/80 to-pink-50/80 rounded-2xl p-3.5 border border-rose-200/70 shadow-xs text-xs">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-base">{indianRhythm.emoji}</span>
                  <span className="font-extrabold text-slate-800 text-xs">{indianRhythm.phase}</span>
                </div>
                <span className="text-[10px] font-bold text-rose-600 bg-white/80 px-2 py-0.5 rounded-full border border-rose-200">
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
      <div className="bg-white rounded-3xl p-4 shadow-sm border border-rose-100">
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
      <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-rose-600 rounded-3xl p-5 text-white shadow-lg shadow-rose-500/15 relative overflow-hidden">
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
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-rose-100">
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
          className="bg-white rounded-3xl p-4 shadow-sm border border-rose-100 flex items-center justify-between gap-3 cursor-pointer hover:border-rose-200 transition"
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
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/70 rounded-3xl p-4">
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
              onClick={() => setActiveTab('ai')}
              className="mt-2 text-xs font-bold text-amber-800 hover:text-amber-900 inline-flex items-center gap-1"
            >
              <span>Explore AI Love Companion</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Memory Snapshot */}
      {recentMemory && (
        <div
          onClick={() => setActiveTab('memories')}
          className="bg-white rounded-3xl overflow-hidden shadow-sm border border-rose-100 cursor-pointer hover:border-rose-200 transition"
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
      <div className="p-4 rounded-3xl bg-white border border-rose-100 shadow-sm space-y-3">
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
              <span className="text-[10px] text-slate-500 block truncate">
                {currentUser.shareLocation ? '🟢 Sharing GPS' : '🔴 Location Paused'}
              </span>
            </div>
            <button
              onClick={() => {
                if (currentUser.shareLocation) {
                  stopSharingLocation('current');
                } else {
                  requestLocationPermission('current');
                }
              }}
              className="p-1.5 rounded-xl bg-white text-slate-600 hover:text-rose-600 border border-rose-200 shrink-0 shadow-2xs"
              title={currentUser.shareLocation ? 'Pause your location' : 'Enable your location'}
            >
              {currentUser.shareLocation ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
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
      </div>

      {/* Live Location Access Modal Instance */}
      <LiveLocationModal
        isOpen={showLocationDialog}
        onClose={() => setShowLocationDialog(false)}
      />
    </div>
  );
};
