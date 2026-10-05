import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { getCountdownBreakdown } from '../utils/distance';
import {
  Image as ImageIcon,
  Calendar,
  Clock,
  Plus,
  Heart,
  MapPin,
  Sparkles,
  Trash2,
  X,
  Compass,
  Tag,
  Upload,
  Video,
  Camera,
  Film,
} from 'lucide-react';
import { MemoryItem, EventItem } from '../types';
import { readFileAsDataUrl } from '../utils/fileUtils';

export const MemoriesSection: React.FC = () => {
  const {
    currentUser,
    partnerUser,
    couple,
    memories,
    addMemory,
    likeMemory,
    events,
    addEvent,
    deleteEvent,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'timeline' | 'events' | 'countdowns'>('timeline');

  // New Memory Modal State
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [memTitle, setMemTitle] = useState('');
  const [memDesc, setMemDesc] = useState('');
  const [memDate, setMemDate] = useState(new Date().toISOString().split('T')[0]);
  const [memUrl, setMemUrl] = useState('');
  const [memType, setMemType] = useState<'image' | 'video'>('image');
  const [memFileName, setMemFileName] = useState('');
  const [memLocation, setMemLocation] = useState('');
  const [memCategory, setMemCategory] = useState<MemoryItem['category']>('special_moment');

  // New Event Modal State
  const [showEventModal, setShowEventModal] = useState(false);
  const [evTitle, setEvTitle] = useState('');
  const [evCategory, setEvCategory] = useState<EventItem['category']>('next_meeting');
  const [evDate, setEvDate] = useState('');
  const [evNotes, setEvNotes] = useState('');

  const handleSaveMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!memTitle.trim()) return;

    addMemory({
      coupleId: couple?.id || 'couple_8829',
      title: memTitle.trim(),
      description: memDesc.trim(),
      date: memDate,
      mediaUrl:
        memUrl.trim() ||
        'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=600&q=80',
      mediaType: memType,
      category: memCategory,
      locationName: memLocation.trim() || undefined,
      addedById: currentUser.id,
      addedByName: currentUser.name,
    });

    setMemTitle('');
    setMemDesc('');
    setMemUrl('');
    setMemFileName('');
    setMemType('image');
    setMemLocation('');
    setShowMemoryModal(false);
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evTitle.trim() || !evDate) return;

    addEvent({
      coupleId: couple?.id || 'couple_8829',
      title: evTitle.trim(),
      category: evCategory,
      date: evDate,
      reminderDaysBefore: 3,
      notes: evNotes.trim() || undefined,
    });

    setEvTitle('');
    setEvDate('');
    setEvNotes('');
    setShowEventModal(false);
  };

  // Check if today matches any anniversary/month-versary
  const todayMemory = memories[0];

  return (
    <div className="w-full max-w-md md:max-w-3xl lg:max-w-4xl mx-auto px-3.5 sm:px-5 py-4 sm:py-6 space-y-4 sm:space-y-5 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-1.5">
            <span>Our Story</span>
            <span className="text-rose-500">❤️</span>
          </h2>
          <p className="text-[11px] text-slate-500 font-medium">
            Every flight, call, and milestone captured across the miles
          </p>
        </div>
        <button
          onClick={() => setShowMemoryModal(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer tap-bounce shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Memory</span>
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-2xl overflow-x-auto text-xs font-semibold no-scrollbar">
        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex-1 min-w-[90px] py-2 rounded-xl transition cursor-pointer tap-bounce text-center ${
            activeTab === 'timeline'
              ? 'bg-white text-rose-600 shadow-xs font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Timeline
        </button>
        <button
          onClick={() => setActiveTab('countdowns')}
          className={`flex-1 min-w-[90px] py-2 rounded-xl transition cursor-pointer tap-bounce text-center ${
            activeTab === 'countdowns'
              ? 'bg-white text-rose-600 shadow-xs font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Countdowns
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`flex-1 min-w-[90px] py-2 rounded-xl transition cursor-pointer tap-bounce text-center ${
            activeTab === 'events'
              ? 'bg-white text-rose-600 shadow-xs font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Events
        </button>
      </div>

      {/* 1. MEMORIES TIMELINE */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          {/* "On This Day" Spotlight */}
          {todayMemory && (
            <div className="p-4 rounded-[22px] bg-gradient-to-r from-pink-50/90 via-rose-50/90 to-purple-50/80 border border-rose-200/70 space-y-1.5 shadow-2xs">
              <span className="text-[10px] uppercase font-bold tracking-wider text-rose-600 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>On This Day Spotlight</span>
              </span>
              <h4 className="font-extrabold text-sm text-slate-800">{todayMemory.title}</h4>
              <p className="text-xs text-slate-600 italic">"{todayMemory.description}"</p>
            </div>
          )}

          {/* Full-width Memory Cards (1 per row on mobile) */}
          <div className="space-y-4">
            {memories.map((mem) => (
              <div
                key={mem.id}
                className="bg-white rounded-[24px] overflow-hidden border border-rose-100 shadow-sm hover:shadow-md transition duration-200"
              >
                {/* 16 / 10 Aspect Ratio Image */}
                <div className="w-full aspect-[16/10] overflow-hidden relative bg-slate-900">
                  {mem.mediaType === 'video' || mem.mediaUrl.startsWith('data:video') || mem.mediaUrl.endsWith('.mp4') ? (
                    <video
                      src={mem.mediaUrl}
                      controls
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <img
                      src={mem.mediaUrl}
                      alt={mem.title}
                      className="w-full h-full object-cover hover:scale-102 transition duration-300"
                      loading="lazy"
                    />
                  )}
                  <div className="absolute bottom-2.5 left-2.5 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
                    <Calendar className="w-3 h-3 text-rose-300" />
                    <span>{mem.date}</span>
                  </div>
                  {mem.addedByName && (
                    <div className="absolute top-2.5 right-2.5 bg-black/50 backdrop-blur-md text-white text-[9px] font-semibold px-2 py-0.5 rounded-full">
                      By {mem.addedByName}
                    </div>
                  )}
                </div>

                {/* Details Container */}
                <div className="p-4 sm:p-5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-extrabold text-sm sm:text-base text-slate-900 leading-snug">
                      {mem.title}
                    </h4>
                    <button
                      type="button"
                      onClick={() => likeMemory(mem.id)}
                      className="flex items-center gap-1.5 text-xs text-rose-600 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-xl transition cursor-pointer tap-bounce shrink-0"
                      title="Heart this memory"
                    >
                      <Heart className="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
                      <span className="font-black">{mem.likesCount}</span>
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">{mem.description}</p>

                  {mem.locationName && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1 border-t border-slate-50">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span className="font-medium truncate">{mem.locationName}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. LIVE COUNTDOWNS */}
      {activeTab === 'countdowns' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Heart Countdowns ⏳</h3>
              <p className="text-xs text-slate-500">Every second brings us closer together</p>
            </div>
            <button
              onClick={() => setShowEventModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Countdown</span>
            </button>
          </div>

          <div className="space-y-3">
            {events.map((ev) => {
              const breakdown = getCountdownBreakdown(ev.date);

              return (
                <div
                  key={ev.id}
                  className="bg-gradient-to-r from-rose-500 via-rose-600 to-pink-600 rounded-3xl p-5 text-white shadow-md relative overflow-hidden"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-rose-100 block">
                        {ev.category.replace('_', ' ')}
                      </span>
                      <h4 className="font-black text-base">{ev.title}</h4>
                    </div>
                    <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-medium">
                      {new Date(ev.date).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-white/15 rounded-2xl p-2 backdrop-blur-xs">
                      <span className="text-xl font-black block leading-none">{breakdown.days}</span>
                      <span className="text-[9px] uppercase font-bold tracking-wider text-rose-100 mt-1 block">
                        Days
                      </span>
                    </div>
                    <div className="bg-white/15 rounded-2xl p-2 backdrop-blur-xs">
                      <span className="text-xl font-black block leading-none">{breakdown.hours}</span>
                      <span className="text-[9px] uppercase font-bold tracking-wider text-rose-100 mt-1 block">
                        Hours
                      </span>
                    </div>
                    <div className="bg-white/15 rounded-2xl p-2 backdrop-blur-xs">
                      <span className="text-xl font-black block leading-none">{breakdown.minutes}</span>
                      <span className="text-[9px] uppercase font-bold tracking-wider text-rose-100 mt-1 block">
                        Mins
                      </span>
                    </div>
                    <div className="bg-white/15 rounded-2xl p-2 backdrop-blur-xs">
                      <span className="text-xl font-black block leading-none">{breakdown.seconds}</span>
                      <span className="text-[9px] uppercase font-bold tracking-wider text-rose-100 mt-1 block">
                        Secs
                      </span>
                    </div>
                  </div>

                  {ev.notes && (
                    <div className="mt-3 text-xs text-rose-100 bg-white/10 px-3 py-1.5 rounded-xl">
                      "{ev.notes}"
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. IMPORTANT DATES LIST */}
      {activeTab === 'events' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Important Dates 📅</h3>
              <p className="text-xs text-slate-500">Exams, anniversaries, and visits with reminders</p>
            </div>
            <button
              onClick={() => setShowEventModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Event</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="p-4 rounded-3xl bg-white border border-rose-100 shadow-sm flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold text-sm shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-800">{ev.title}</h4>
                    <p className="text-xs text-slate-500">
                      {new Date(ev.date).toLocaleDateString([], {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                    {ev.notes && <p className="text-[11px] text-slate-400 mt-0.5">{ev.notes}</p>}
                  </div>
                </div>

                <button
                  onClick={() => deleteEvent(ev.id)}
                  className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Memory Modal */}
      {showMemoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <form
            onSubmit={handleSaveMemory}
            className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-bold text-sm text-slate-800">Add Memory & Milestone 📸</h4>
              <button
                type="button"
                onClick={() => setShowMemoryModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Title</label>
              <input
                type="text"
                value={memTitle}
                onChange={(e) => setMemTitle(e.target.value)}
                placeholder="e.g. Our First Train Journey"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-400"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Description</label>
              <textarea
                value={memDesc}
                onChange={(e) => setMemDesc(e.target.value)}
                rows={3}
                placeholder="What happened? What did you feel?"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Date</label>
                <input
                  type="date"
                  value={memDate}
                  onChange={(e) => setMemDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Category</label>
                <select
                  value={memCategory}
                  onChange={(e) => setMemCategory(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="first_meeting">First Meeting ✈️</option>
                  <option value="first_call">First Call 📞</option>
                  <option value="first_trip">Trip Together 🌎</option>
                  <option value="anniversary">Anniversary 💕</option>
                  <option value="special_moment">Special Moment ✨</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Location (optional)</label>
              <input
                type="text"
                value={memLocation}
                onChange={(e) => setMemLocation(e.target.value)}
                placeholder="e.g. Heathrow Terminal 5, London"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>
            {/* Photo & Video File Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Choose Photo or Video
              </label>

              {memUrl ? (
                <div className="relative rounded-2xl overflow-hidden border border-rose-200 bg-black/5 p-2">
                  <div className="max-h-48 overflow-hidden rounded-xl bg-black flex items-center justify-center">
                    {memType === 'video' ? (
                      <video
                        src={memUrl}
                        controls
                        playsInline
                        className="max-h-48 w-full object-contain"
                      />
                    ) : (
                      <img
                        src={memUrl}
                        alt="Preview"
                        className="max-h-48 w-full object-contain"
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2 px-1">
                    <span className="text-[11px] font-medium text-slate-700 truncate max-w-[200px]">
                      {memFileName || (memType === 'video' ? 'Selected video' : 'Selected photo')}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setMemUrl('');
                        setMemFileName('');
                        setMemType('image');
                      }}
                      className="text-xs text-rose-600 hover:text-rose-700 font-semibold"
                    >
                      Change File
                    </button>
                  </div>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center justify-center p-4 border-2 border-dashed border-rose-200 hover:border-rose-400 rounded-2xl bg-rose-50/40 hover:bg-rose-50/70 transition group">
                  <div className="flex items-center gap-2 text-rose-500 mb-1 group-hover:scale-105 transition">
                    <Camera className="w-5 h-5" />
                    <Video className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">
                    Click to browse Photos & Videos
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    Supports JPG, PNG, WEBP, MP4, MOV from your device
                  </span>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const res = await readFileAsDataUrl(file);
                          setMemUrl(res.url);
                          setMemType(res.type);
                          setMemFileName(res.fileName);
                        } catch (err) {
                          console.error(err);
                        }
                      }
                    }}
                  />
                </label>
              )}
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs"
            >
              Save Memory Forever
            </button>
          </form>
        </div>
      )}

      {/* New Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <form
            onSubmit={handleSaveEvent}
            className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-bold text-sm text-slate-800">Add Important Date 📅</h4>
              <button
                type="button"
                onClick={() => setShowEventModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Event Title</label>
              <input
                type="text"
                value={evTitle}
                onChange={(e) => setEvTitle(e.target.value)}
                placeholder="e.g. Flight to Rome / Medical Exam"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-400"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Category</label>
                <select
                  value={evCategory}
                  onChange={(e) => setEvCategory(e.target.value as any)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="next_meeting">Next Meeting ✈️</option>
                  <option value="birthday">Birthday 🎂</option>
                  <option value="anniversary">Anniversary 💕</option>
                  <option value="exam">Important Exam 📚</option>
                  <option value="holiday">Holiday 🏖️</option>
                  <option value="custom">Custom Event 🌟</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Date & Time</label>
                <input
                  type="datetime-local"
                  value={evDate}
                  onChange={(e) => setEvDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-400"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Notes / Reminders</label>
              <input
                type="text"
                value={evNotes}
                onChange={(e) => setEvNotes(e.target.value)}
                placeholder="e.g. Flight arrives at terminal 3"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs"
            >
              Add to Calendar & Countdown
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
