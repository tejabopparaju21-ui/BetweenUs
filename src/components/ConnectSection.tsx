import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Gamepad2,
  Gift,
  FileText,
  Music,
  CalendarHeart,
  Plus,
  Heart,
  Lock,
  Unlock,
  Play,
  Pause,
  ExternalLink,
  Trash2,
  CheckCircle2,
  X,
  Sparkles,
} from 'lucide-react';
import { QuickLoveType, MoodType } from '../types';
import { playSongMelody } from '../utils/audioNotes';

export const ConnectSection: React.FC = () => {
  const {
    currentUser,
    partnerUser,
    couple,
    sharedNotes,
    saveSharedNote,
    deleteSharedNote,
    sharedSongs,
    addSharedSong,
    likeSong,
    surprises,
    createSurprise,
    unlockSurprise,
    virtualDates,
    toggleDateCompleted,
    gameSession,
    startNewGame,
    submitGameAnswer,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'games' | 'surprises' | 'dates' | 'notes' | 'music'>('games');

  // Modals state
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState<'bucket_list' | 'future_travel' | 'love_list' | 'date_ideas' | 'general'>('bucket_list');

  const [showSurpriseModal, setShowSurpriseModal] = useState(false);
  const [surpriseTitle, setSurpriseTitle] = useState('');
  const [surpriseMessage, setSurpriseMessage] = useState('');
  const [surpriseCondition, setSurpriseCondition] = useState('Open when you miss me late at night');

  const [showSongModal, setShowSongModal] = useState(false);
  const [songTitle, setSongTitle] = useState('');
  const [songArtist, setSongArtist] = useState('');
  const [songNote, setSongNote] = useState('');

  // Audio player state
  const [playingSongId, setPlayingSongId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [synthStopFn, setSynthStopFn] = useState<(() => void) | null>(null);

  const togglePlaySong = (song: any) => {
    if (synthStopFn) {
      synthStopFn();
      setSynthStopFn(null);
    }
    if (audioElement) {
      audioElement.pause();
      setAudioElement(null);
    }

    if (playingSongId === song.id) {
      setPlayingSongId(null);
    } else {
      setPlayingSongId(song.id);

      const triggerSynthFallback = () => {
        const stop = playSongMelody(12, () => {
          setPlayingSongId(null);
          setSynthStopFn(null);
        });
        setSynthStopFn(() => stop);
      };

      if (song.audioSampleUrl && (song.audioSampleUrl.startsWith('data:') || song.audioSampleUrl.startsWith('http') || song.audioSampleUrl.startsWith('blob:'))) {
        try {
          const newAudio = new Audio(song.audioSampleUrl);
          newAudio.onended = () => {
            setPlayingSongId(null);
            setAudioElement(null);
          };
          newAudio.onerror = () => {
            triggerSynthFallback();
          };
          const playPromise = newAudio.play();
          if (playPromise !== undefined) {
            playPromise.catch(() => {
              triggerSynthFallback();
            });
          }
          setAudioElement(newAudio);
        } catch (_) {
          triggerSynthFallback();
        }
      } else {
        triggerSynthFallback();
      }
    }
  };

  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteContent.trim()) return;
    saveSharedNote({
      title: noteTitle.trim(),
      content: noteContent.trim(),
      category: noteCategory,
    });
    setNoteTitle('');
    setNoteContent('');
    setShowNoteModal(false);
  };

  const handleCreateSurprise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!surpriseTitle.trim() || !surpriseMessage.trim()) return;
    createSurprise({
      coupleId: couple?.id || 'couple_8829',
      creatorId: currentUser.id,
      creatorName: currentUser.name,
      recipientId: partnerUser.id,
      title: surpriseTitle.trim(),
      message: surpriseMessage.trim(),
      unlockType: 'condition',
      conditionText: surpriseCondition.trim(),
    });
    setSurpriseTitle('');
    setSurpriseMessage('');
    setShowSurpriseModal(false);
  };

  const handleAddSong = (e: React.FormEvent) => {
    e.preventDefault();
    if (!songTitle.trim() || !songArtist.trim()) return;
    addSharedSong({
      coupleId: couple?.id || 'couple_8829',
      addedById: currentUser.id,
      addedByName: currentUser.name,
      title: songTitle.trim(),
      artist: songArtist.trim(),
      dedicationNote: songNote.trim() || `Dedicated with love to ${partnerUser.name}`,
      audioSampleUrl: 'https://cdn.freesound.org/previews/530/530415_11861866-lq.mp3',
      coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80',
    });
    setSongTitle('');
    setSongArtist('');
    setSongNote('');
    setShowSongModal(false);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-5 space-y-5 pb-24">
      {/* Top Category Segment Controls */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl overflow-x-auto text-xs font-semibold no-scrollbar">
        <button
          onClick={() => setActiveSubTab('games')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap transition ${
            activeSubTab === 'games'
              ? 'bg-white text-rose-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Gamepad2 className="w-3.5 h-3.5" />
          <span>Games</span>
        </button>
        <button
          onClick={() => setActiveSubTab('surprises')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap transition ${
            activeSubTab === 'surprises'
              ? 'bg-white text-rose-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Gift className="w-3.5 h-3.5" />
          <span>Surprises</span>
        </button>
        <button
          onClick={() => setActiveSubTab('dates')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap transition ${
            activeSubTab === 'dates'
              ? 'bg-white text-rose-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <CalendarHeart className="w-3.5 h-3.5" />
          <span>Virtual Dates</span>
        </button>
        <button
          onClick={() => setActiveSubTab('notes')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap transition ${
            activeSubTab === 'notes'
              ? 'bg-white text-rose-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Shared Notes</span>
        </button>
        <button
          onClick={() => setActiveSubTab('music')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl whitespace-nowrap transition ${
            activeSubTab === 'music'
              ? 'bg-white text-rose-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Music className="w-3.5 h-3.5" />
          <span>Music</span>
        </button>
      </div>

      {/* 1. COUPLE GAMES */}
      {activeSubTab === 'games' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-purple-500 via-rose-500 to-pink-500 p-5 rounded-3xl text-white shadow-md">
            <h3 className="font-extrabold text-base flex items-center gap-2">
              <Gamepad2 className="w-5 h-5" />
              <span>Multiplayer Couple Games</span>
            </h3>
            <p className="text-xs text-rose-100 mt-1">
              Play together across timezones. Submit your answers and reveal how synced you are!
            </p>
          </div>

          {/* Game Selectors */}
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { id: 'would_you_rather', title: 'Would You Rather', icon: '🤔', color: 'bg-indigo-50 border-indigo-200' },
              { id: 'truth_or_dare', title: 'Truth or Dare', icon: '💖', color: 'bg-rose-50 border-rose-200' },
              { id: 'couple_quiz', title: 'Couple Quiz', icon: '🎯', color: 'bg-amber-50 border-amber-200' },
              { id: 'this_or_that', title: 'This or That', icon: '⚡', color: 'bg-emerald-50 border-emerald-200' },
            ].map((g) => (
              <button
                key={g.id}
                onClick={() => startNewGame(g.id as any)}
                className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between hover:shadow-sm transition active:scale-98 ${g.color}`}
              >
                <span className="text-2xl">{g.icon}</span>
                <div className="mt-2">
                  <span className="text-xs font-bold text-slate-800 block">{g.title}</span>
                  <span className="text-[10px] text-slate-500">Start new round</span>
                </div>
              </button>
            ))}
          </div>

          {/* Active Game Session Card */}
          {gameSession && (
            <div className="bg-white p-5 rounded-3xl border border-rose-200 shadow-sm space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-600">
                  {gameSession.title}
                </span>
                <span className="text-xs text-slate-400 font-semibold">
                  Question {gameSession.currentIndex + 1} of {gameSession.questions.length}
                </span>
              </div>

              <div className="text-sm font-extrabold text-slate-900 leading-snug">
                "{gameSession.questions[gameSession.currentIndex]}"
              </div>

              {/* Answers submitted so far */}
              <div className="space-y-2 pt-1">
                {/* Your answer status */}
                <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-100 text-xs">
                  <div className="font-bold text-rose-900 flex items-center justify-between">
                    <span>Your Answer ({currentUser.name}):</span>
                    {gameSession.answers[gameSession.currentIndex]?.[currentUser.id] ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Answered
                      </span>
                    ) : (
                      <span className="text-amber-600">Waiting for you</span>
                    )}
                  </div>
                  {gameSession.answers[gameSession.currentIndex]?.[currentUser.id] ? (
                    <p className="mt-1 text-slate-700 italic">
                      "{gameSession.answers[gameSession.currentIndex][currentUser.id]}"
                    </p>
                  ) : (
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        placeholder="Type your answer or choice..."
                        id="game-input"
                        className="flex-1 bg-white text-xs px-3 py-1.5 rounded-xl border border-rose-200 focus:outline-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = (e.target as HTMLInputElement).value;
                            if (val.trim()) {
                              submitGameAnswer(gameSession.currentIndex, val.trim());
                              (e.target as HTMLInputElement).value = '';
                            }
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          const input = document.getElementById('game-input') as HTMLInputElement;
                          if (input?.value.trim()) {
                            submitGameAnswer(gameSession.currentIndex, input.value.trim());
                            input.value = '';
                          }
                        }}
                        className="px-3 py-1.5 bg-rose-600 text-white rounded-xl text-xs font-bold shadow-xs"
                      >
                        Submit
                      </button>
                    </div>
                  )}
                </div>

                {/* Partner answer status */}
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                  <div className="font-bold text-slate-800 flex items-center justify-between">
                    <span>{partnerUser.name}'s Answer:</span>
                    {gameSession.answers[gameSession.currentIndex]?.[partnerUser.id] ? (
                      <span className="text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Revealed
                      </span>
                    ) : (
                      <span className="text-slate-400">Not submitted yet</span>
                    )}
                  </div>
                  {gameSession.answers[gameSession.currentIndex]?.[partnerUser.id] ? (
                    <p className="mt-1 text-slate-700 italic">
                      "{gameSession.answers[gameSession.currentIndex][partnerUser.id]}"
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400 mt-1">
                      (Switch to {partnerUser.name} via top bar to simulate their turn)
                    </p>
                  )}
                </div>
              </div>

              {/* Next Question Navigation */}
              {gameSession.currentIndex < gameSession.questions.length - 1 && (
                <button
                  onClick={() =>
                    startNewGame(gameSession.gameType) // or next index
                  }
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Next Question →
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 2. SURPRISES ("OPEN WHEN...") */}
      {activeSubTab === 'surprises' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">"Open When..." Surprises 💌</h3>
              <p className="text-xs text-slate-500">Love notes that stay locked until their special moment</p>
            </div>
            <button
              onClick={() => setShowSurpriseModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Surprise</span>
            </button>
          </div>

          <div className="space-y-3">
            {surprises.map((s) => {
              const isMine = s.creatorId === currentUser.id;

              return (
                <div
                  key={s.id}
                  className={`p-4 rounded-3xl border transition shadow-xs ${
                    s.isUnlocked
                      ? 'bg-white border-rose-200'
                      : 'bg-gradient-to-br from-rose-50/70 to-pink-50/70 border-rose-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                          s.isUnlocked
                            ? 'bg-rose-100 text-rose-600'
                            : 'bg-slate-200/80 text-slate-500'
                        }`}
                      >
                        {s.isUnlocked ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-800">{s.title}</h4>
                        <span className="text-[11px] text-rose-600 font-semibold block">
                          Condition: {s.conditionText || 'Special moment'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    {s.isUnlocked ? (
                      <div className="bg-rose-50/50 p-3.5 rounded-2xl border border-rose-100 text-xs text-slate-700 leading-relaxed italic">
                        "{s.message}"
                        <div className="text-[10px] text-slate-400 mt-2 not-italic text-right">
                          Written by {s.creatorName}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-slate-500">
                          {isMine
                            ? `Waiting for ${partnerUser.name} to unlock this`
                            : 'Locked until you need it!'}
                        </span>
                        {!isMine && (
                          <button
                            onClick={() => unlockSurprise(s.id)}
                            className="px-3.5 py-1.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl text-xs font-bold shadow-xs hover:from-rose-600 hover:to-pink-600 transition"
                          >
                            Unlock Now 🎁
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. VIRTUAL DATES PLANNER */}
      {activeSubTab === 'dates' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Virtual Dates Planner 🎬</h3>
            <p className="text-xs text-slate-500">Meaningful activities to experience simultaneously</p>
          </div>

          <div className="space-y-3">
            {virtualDates.map((date) => (
              <div
                key={date.id}
                className={`p-4 rounded-3xl border transition shadow-xs ${
                  date.completed
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : 'bg-white border-rose-100'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="text-3xl p-1 bg-slate-50 rounded-2xl shrink-0">
                      {date.iconEmoji || '🌹'}
                    </span>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">{date.title}</h4>
                      <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                        {date.description}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold shrink-0">
                    {date.durationMinutes} min
                  </span>
                </div>

                {/* Prep Items */}
                {date.prepItems && date.prepItems.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {date.prepItems.map((item, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2.5 py-0.5 rounded-lg bg-rose-50 text-rose-800 font-medium"
                      >
                        ✓ {item}
                      </span>
                    ))}
                  </div>
                )}

                {/* Completion Status */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  {date.completed ? (
                    <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Completed & Saved to Memories!</span>
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">Ready to plan</span>
                  )}

                  <button
                    onClick={() => toggleDateCompleted(date.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      date.completed
                        ? 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                        : 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                    }`}
                  >
                    {date.completed ? 'Mark Incomplete' : 'Mark as Completed ✨'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. SHARED NOTES */}
      {activeSubTab === 'notes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Shared Notebook 📝</h3>
              <p className="text-xs text-slate-500">Collaborative lists and future dreams</p>
            </div>
            <button
              onClick={() => setShowNoteModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Note</span>
            </button>
          </div>

          <div className="space-y-3">
            {sharedNotes.map((note) => (
              <div
                key={note.id}
                className="p-4 rounded-3xl bg-white border border-rose-100 shadow-sm space-y-2 relative"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-slate-800">{note.title}</h4>
                  <button
                    onClick={() => deleteSharedNote(note.id)}
                    className="text-slate-300 hover:text-red-500 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                  {note.content}
                </p>
                <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-50">
                  Last edited by {note.lastEditedByName}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. SHARED MUSIC */}
      {activeSubTab === 'music' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Shared Melodies 🎵</h3>
              <p className="text-xs text-slate-500">Songs dedicated with personal notes</p>
            </div>
            <button
              onClick={() => setShowSongModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Dedicate Song</span>
            </button>
          </div>

          <div className="space-y-3">
            {sharedSongs.map((song) => {
              const isPlaying = playingSongId === song.id;

              return (
                <div
                  key={song.id}
                  className="p-3.5 rounded-3xl bg-white border border-rose-100 shadow-sm flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 shrink-0">
                      <img src={song.coverUrl} alt={song.title} className="w-full h-full object-cover" />
                      <button
                        onClick={() => togglePlaySong(song)}
                        className="absolute inset-0 bg-black/40 flex items-center justify-center text-white"
                      >
                        {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
                      </button>
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-slate-800">{song.title}</h4>
                      <p className="text-[11px] text-slate-500">{song.artist}</p>
                      <p className="text-[11px] text-rose-600 italic mt-0.5 truncate max-w-[200px]">
                        "{song.dedicationNote}"
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => likeSong(song.id)}
                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-50"
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        song.likes.includes(currentUser.id) ? 'fill-rose-500 text-rose-500' : ''
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* New Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <form
            onSubmit={handleSaveNote}
            className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-bold text-sm text-slate-800">Add Shared Note</h4>
              <button
                type="button"
                onClick={() => setShowNoteModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Title</label>
              <input
                type="text"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder="e.g. Next Summer Roadtrip"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-400"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Content</label>
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={4}
                placeholder="Write your dreams, list items, or thoughts..."
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-400"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs"
            >
              Save Note
            </button>
          </form>
        </div>
      )}

      {/* New Surprise Modal */}
      {showSurpriseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <form
            onSubmit={handleCreateSurprise}
            className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-bold text-sm text-slate-800">Create "Open When..." Surprise 💌</h4>
              <button
                type="button"
                onClick={() => setShowSurpriseModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Envelope Label</label>
              <input
                type="text"
                value={surpriseTitle}
                onChange={(e) => setSurpriseTitle(e.target.value)}
                placeholder="e.g. Open when you had a stressful day at work"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-400"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Secret Message</label>
              <textarea
                value={surpriseMessage}
                onChange={(e) => setSurpriseMessage(e.target.value)}
                rows={4}
                placeholder="Write the comforting, loving words they will see when unlocked..."
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-400"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs"
            >
              Seal Secret Envelope 🔒
            </button>
          </form>
        </div>
      )}

      {/* New Song Modal */}
      {showSongModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <form
            onSubmit={handleAddSong}
            className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-bold text-sm text-slate-800">Dedicate a Song 🎵</h4>
              <button
                type="button"
                onClick={() => setShowSongModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Song Title</label>
              <input
                type="text"
                value={songTitle}
                onChange={(e) => setSongTitle(e.target.value)}
                placeholder="e.g. Sparks Across the Atlantic"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-400"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Artist</label>
              <input
                type="text"
                value={songArtist}
                onChange={(e) => setSongArtist(e.target.value)}
                placeholder="e.g. Coldplay / Acoustic Duet"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-400"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Dedication Note</label>
              <input
                type="text"
                value={songNote}
                onChange={(e) => setSongNote(e.target.value)}
                placeholder="e.g. Playing this every time I board my flight to you"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs"
            >
              Add to Shared Playlist
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
