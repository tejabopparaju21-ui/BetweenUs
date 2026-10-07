/**
 * AppContext: Reactive State & Cross-Tab Multi-User Synchronizer for BetweenUs
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  UserProfile,
  Couple,
  ChatMessage,
  MoodEntry,
  MemoryItem,
  EventItem,
  VirtualDateIdea,
  GameSession,
  SharedSong,
  SharedNote,
  SurpriseMessage,
  AppNotification,
  QuickLoveType,
  MoodType,
  EmergencyContact,
  LocationData,
  EmergencyAlert,
  CallSession,
} from '../types';
import {
  syncCoupleToFirestore,
  syncUserToFirestore,
  syncMessageToFirestore,
  deleteMessageFromFirestore,
  clearMessagesFromFirestore,
  syncMoodToFirestore,
  syncMemoryToFirestore,
  listenToCoupleMessages,
  listenToCoupleMoods,
  listenToCoupleMemories,
  listenToCoupleDoc,
  listenToUserDoc,
  joinCoupleInFirestore,
  pairPartnersWithCode,
  unlinkCoupleInFirestore,
  getOrCreateUserProfile,
  getUserProfile,
  getNameFromEmail,
  findCoupleForUser,
  ensureUserPendingCouple,
  markMessageAsReadInFirestore,
  subscribeToAuth,
  syncPartnerLocationToFirestore,
  syncEmergencyAlertToFirestore,
  syncActiveCallToFirestore,
  syncCallUpdatesToFirestore,
  loginWithGoogle as fbLoginWithGoogle,
  loginWithEmail as fbLoginWithEmail,
  registerWithEmail as fbRegisterWithEmail,
  logOut as fbLogOut,
} from '../lib/firestoreService';
import {
  saveLiveLocationToRTDB,
  subscribeToPartnerLocationRTDB,
  reverseGeocodeWithGeoapify,
  LiveLocationRecord,
} from '../lib/realtimeLocationService';
import { findClosestIndianCity, findIndianCity, INDIAN_CITIES } from '../utils/indianCities';
import { getCallDeviceSessionId, isCallStale } from '../utils/callSessionHelper';
import type { User as FirebaseUser } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

interface AppContextType {
  currentUser: UserProfile;
  partnerUser: UserProfile;
  couple: Couple | null;
  messages: ChatMessage[];
  moods: MoodEntry[];
  memories: MemoryItem[];
  events: EventItem[];
  virtualDates: VirtualDateIdea[];
  gameSession: GameSession | null;
  sharedSongs: SharedSong[];
  sharedNotes: SharedNote[];
  surprises: SurpriseMessage[];
  notifications: AppNotification[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  quickLoveBurst: { type: QuickLoveType; emoji: string; senderName: string; id: number } | null;
  
  // Real-Time Network & Cloud Sync
  isOnline: boolean;
  isChatSyncing: boolean;
  chatError: string | null;

  // Actions
  switchActiveUser: (userId: string) => void;
  sendMessage: (
    text: string,
    mediaUrl?: string,
    mediaType?: 'image' | 'video' | 'voice' | 'love_tap' | 'call',
    voiceDurationSec?: number,
    replyTo?: { id: string; senderName: string; text: string },
    callData?: { mode: 'voice' | 'video'; durationSec: number; status: 'completed' | 'missed' }
  ) => Promise<void> | void;
  deleteMessage: (id: string) => void;
  clearChatMessages: () => Promise<void>;
  toggleMessageReaction: (messageId: string, emoji: string) => void;
  sendQuickLove: (type: QuickLoveType) => void;
  logMood: (moodType: MoodType, note?: string) => void;
  addMemory: (memory: Omit<MemoryItem, 'id' | 'likesCount'>) => void;
  likeMemory: (memoryId: string) => void;
  addEvent: (event: Omit<EventItem, 'id'>) => void;
  deleteEvent: (id: string) => void;
  toggleDateCompleted: (id: string, notes?: string) => void;
  addVirtualDate: (date: Omit<VirtualDateIdea, 'id'>) => void;
  saveSharedNote: (note: Partial<SharedNote> & { title: string; content: string; category: any }) => void;
  deleteSharedNote: (id: string) => void;
  addSharedSong: (song: Omit<SharedSong, 'id' | 'createdAt' | 'likes'>) => void;
  likeSong: (songId: string) => void;
  createSurprise: (surprise: Omit<SurpriseMessage, 'id' | 'isUnlocked' | 'createdAt'>) => void;
  unlockSurprise: (id: string) => void;
  submitGameAnswer: (questionIndex: number, answer: string) => void;
  startNewGame: (gameType: 'would_you_rather' | 'truth_or_dare' | 'couple_quiz' | 'this_or_that') => void;
  updateUserProfile: (updates: Partial<UserProfile>) => void;
  updateCouple: (updates: Partial<Couple>) => void;
  
  // Live Location for Both Partners
  isLocating: boolean;
  rtdbPartnerLocation: LiveLocationRecord | null;
  locationError: string | null;
  clearLocationError: () => void;
  requestLocationPermission: (targetSlot?: 'current' | 'userA' | 'userB') => Promise<boolean>;
  setPartnerLocationManually: (
    targetSlot: 'current' | 'userA' | 'userB',
    cityName: string,
    coords?: { latitude: number; longitude: number }
  ) => void;
  stopSharingLocation: (targetSlot?: 'current' | 'userA' | 'userB') => void;
  stopSharingEverything: () => void;
  addEmergencyContact: (contact: Omit<EmergencyContact, 'id'>) => void;
  deleteEmergencyContact: (id: string) => void;
  connectCoupleWithCode: (code: string) => Promise<{ success: boolean; message: string }>;
  disconnectCouple: () => void;
  markNotificationRead: (id: string) => void;
  clearAllNotifications: () => void;
  resetAllDemoData: () => void;

  // Emergency SOS & Partner Phone Siren
  activeEmergencyAlert: EmergencyAlert | null;
  triggerEmergencyAlert: (customMessage?: string) => Promise<void>;
  acknowledgeEmergencyAlert: (alertId: string) => Promise<void>;
  cancelEmergencyAlert: (alertId: string) => Promise<void>;

  // Real-Time 2-Device Video & Voice Calling
  activeCall: CallSession | null;
  startCall: (mode: 'voice' | 'video') => Promise<void>;
  acceptIncomingCall: () => Promise<void>;
  declineIncomingCall: () => Promise<void>;
  endActiveCall: () => Promise<void>;
  updateCallSession: (updates: Partial<CallSession>) => Promise<void>;
  sendCallReaction: (emoji: string) => Promise<void>;

  // Firebase Real-Time Cloud Integration & Multi-Tenant Pairing
  firebaseUser: FirebaseUser | null;
  isAuthLoading: boolean;
  pendingInviteCode: string | null;
  isFirebaseConnected: boolean;
  firebaseProjectId: string;
  isDemoMode: boolean;
  isPartnerPaired: boolean;
  enterDemoMode: () => void;
  exitDemoMode: () => void;
  pairWithPartnerCode: (code: string) => Promise<{ success: boolean; message: string }>;
  unlinkCurrentCouple: () => Promise<void>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  loginWithEmail: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  registerWithEmail: (email: string, pass: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  logOutFirebase: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

/**
 * Resolves whether a given userId is partnerA or partnerB in the couple document.
 */
export const getCoupleSlot = (
  userId: string | undefined,
  coupleDoc: Couple | null | undefined
): 'partnerA' | 'partnerB' => {
  if (!coupleDoc || !userId) return 'partnerA';
  if (coupleDoc.partnerBId && coupleDoc.partnerBId === userId) {
    return 'partnerB';
  }
  return 'partnerA';
};

const STORAGE_KEY = 'betweenus_app_data_india_v3';
const BROADCAST_KEY = 'betweenus_broadcast_channel';

// Default Indian Long-Distance Couple: User A (Teja in Hyderabad) & User B (Akhila in Bengaluru)
const DEFAULT_USER_A: UserProfile = {
  id: 'user_teja_1',
  name: 'Teja',
  email: 'teja@betweenus.love',
  phoneNumber: '+91 98490 54321',
  avatarUrl: '/app-logo.svg',
  birthDate: '1998-06-15',
  timeZone: 'Asia/Kolkata', // Indian Standard Time (IST)
  city: 'Hyderabad',
  country: 'IN',
  anniversaryDate: '2024-02-14',
  sleepStartHour: 23, // 11:30 PM
  sleepEndHour: 7,   // 7:00 AM
  shareLocation: true,
  location: {
    latitude: 17.3850,
    longitude: 78.4867,
    city: 'Hyderabad, Telangana',
    country: 'India',
    updatedAt: new Date().toISOString(),
  },
  emergencyContacts: [
    {
      id: 'emg_1',
      name: 'Suresh (Father)',
      phone: '+91 98490 12345',
      relationship: 'Father',
      email: 'suresh@example.com',
    },
    {
      id: 'emg_national',
      name: 'National Emergency ERSS',
      phone: '112',
      relationship: 'Emergency Response',
    },
  ],
  currentMoodId: 'mood_1',
};

const DEFAULT_USER_B: UserProfile = {
  id: 'user_akhila_2',
  name: 'Akhila',
  email: 'akhila@betweenus.love',
  phoneNumber: '+91 98450 12345',
  avatarUrl: '/app-logo.svg',
  birthDate: '1999-10-24',
  timeZone: 'Asia/Kolkata', // Indian Standard Time (IST)
  city: 'Bengaluru',
  country: 'IN',
  anniversaryDate: '2024-02-14',
  sleepStartHour: 23, // 11:00 PM
  sleepEndHour: 7,   // 7:00 AM
  shareLocation: true,
  location: {
    latitude: 12.9716,
    longitude: 77.5946,
    city: 'Bengaluru, Karnataka',
    country: 'India',
    updatedAt: new Date().toISOString(),
  },
  emergencyContacts: [
    {
      id: 'emg_2',
      name: 'Priya (Sister)',
      phone: '+91 98450 67890',
      relationship: 'Sister',
      email: 'priya@example.com',
    },
    {
      id: 'emg_women',
      name: 'Women Helpline India',
      phone: '1091',
      relationship: 'Women Helpline',
    },
  ],
  currentMoodId: 'mood_2',
};

const DEFAULT_COUPLE: Couple = {
  id: 'couple_8829',
  code: 'LOVE-4821',
  partnerAId: 'user_teja_1',
  partnerBId: 'user_akhila_2',
  partnerAName: 'Teja',
  partnerBName: 'Akhila',
  partnerUids: ['user_teja_1', 'user_akhila_2'],
  members: ['user_teja_1', 'user_akhila_2'],
  relationshipName: 'Teja & Akhila',
  anniversaryDate: '2024-02-14',
  nextMeetingDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(), // 18 days from now
  nextMeetingTitle: 'Reunion Beach Trip to Goa 🌴',
  meetingLocation: 'Goa, India 🏖️',
  createdAt: '2024-02-14T00:00:00.000Z',
};

// Firestore is the sole database source of truth; no hardcoded messages
const DEFAULT_MESSAGES: ChatMessage[] = [];

const DEFAULT_MOODS: MoodEntry[] = [
  {
    id: 'mood_1',
    coupleId: 'couple_8829',
    userId: 'user_teja_1',
    userName: 'Teja',
    moodType: 'loved',
    note: 'Hyderabad evening drizzle! Sipping Irani chai and wishing you were next to me.',
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'mood_2',
    coupleId: 'couple_8829',
    userId: 'user_akhila_2',
    userName: 'Akhila',
    moodType: 'missing_partner',
    note: 'Bengaluru weather is gorgeous today! Wish we were walking through Cubbon Park hand-in-hand.',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
];

const DEFAULT_MEMORIES: MemoryItem[] = [
  {
    id: 'mem_1',
    coupleId: 'couple_8829',
    title: 'Our First 5-Hour Video Call 📱',
    description: 'We said we would only talk for 15 minutes after work and ended up talking until 3:00 AM with our earphones plugged in.',
    date: '2024-02-14',
    mediaUrl: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=600&q=80',
    category: 'first_call',
    locationName: 'Hyderabad ⇄ Bengaluru',
    addedById: 'user_teja_1',
    addedByName: 'Teja',
    likesCount: 2,
  },
  {
    id: 'mem_2',
    coupleId: 'couple_8829',
    title: 'The Kempegowda Airport Sprint ✈️',
    description: 'Dropping my bag and running straight into your arms at the Bengaluru arrivals gate! Best feeling in the universe.',
    date: '2024-07-10',
    mediaUrl: 'https://images.unsplash.com/photo-1517400508447-f8dd518b86db?auto=format&fit=crop&w=600&q=80',
    category: 'first_meeting',
    locationName: 'Bengaluru Airport (BLR)',
    addedById: 'user_akhila_2',
    addedByName: 'Akhila',
    likesCount: 2,
  },
  {
    id: 'mem_3',
    coupleId: 'couple_8829',
    title: 'Monsoon Marine Drive Sunset 🌅',
    description: 'Eating hot roasted bhutta in the Mumbai sea breeze with our fingers intertwined.',
    date: '2024-07-14',
    mediaUrl: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=600&q=80',
    category: 'first_trip',
    locationName: 'Marine Drive, Mumbai',
    addedById: 'user_teja_1',
    addedByName: 'Teja',
    likesCount: 2,
  },
];

const DEFAULT_EVENTS: EventItem[] = [
  {
    id: 'ev_1',
    coupleId: 'couple_8829',
    title: 'Reunion Beach Trip in Goa 🌴',
    category: 'next_meeting',
    date: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(),
    reminderDaysBefore: 3,
    notes: 'Flights land at Goa airport at 11:30 AM! Beach cottage in North Goa.',
  },
  {
    id: 'ev_2',
    coupleId: 'couple_8829',
    title: "Akhila's Birthday in Bengaluru 🎂",
    category: 'birthday',
    date: '2026-10-24',
    reminderDaysBefore: 7,
    notes: 'Surprise midnight cake & flowers delivery + customized letter!',
  },
  {
    id: 'ev_3',
    coupleId: 'couple_8829',
    title: 'Diwali Festival of Lights Together 🪔',
    category: 'anniversary',
    date: '2026-11-01',
    reminderDaysBefore: 7,
    notes: 'Dress up in traditional ethnic wear, light diyas live on video call & exchange festive sweets.',
  },
];

const DEFAULT_VIRTUAL_DATES: VirtualDateIdea[] = [
  {
    id: 'vd_1',
    title: 'Synchronized Zomato / Swiggy Dinner Date 🍛',
    description: 'Order each other your favorite comfort biryani or dosa, unbox live on video call, and enjoy dinner together.',
    category: 'Culinary',
    durationMinutes: 60,
    prepItems: ['Swiggy / Zomato order', 'Candles / warm fairy lights', 'Tripod for video call'],
    connectionPrompt: 'What is your all-time favorite Indian street food memory?',
    iconEmoji: '🍛',
    completed: true,
    completedAt: '2026-09-18T20:30:00.000Z',
  },
  {
    id: 'vd_2',
    title: 'Evening Cutting Chai & Rain Watchparty ☕🌧️',
    description: 'Brew hot adrak elaichi chai, sit near your window, and share audio stories while listening to the evening rain.',
    category: 'Romance',
    durationMinutes: 45,
    prepItems: ['Hot Ginger Cardamom Chai', 'Osmania / Parle-G biscuits', 'Earphones'],
    connectionPrompt: 'What is one childhood monsoon memory that makes you smile every time?',
    iconEmoji: '☕',
    completed: false,
  },
  {
    id: 'vd_3',
    title: 'Bollywood & Indie Rom-Com Night 🎬',
    description: 'Pick an all-time comfort movie (Yeh Jawaani Hai Deewani or Jab We Met), pop identical popcorn, and watch in sync.',
    category: 'Entertainment',
    durationMinutes: 120,
    prepItems: ['Watchparty stream', 'Popcorn / chips', 'Cozy blankets'],
    connectionPrompt: 'Which movie couple dynamic reminds you most of how we tease each other?',
    iconEmoji: '🍿',
    completed: false,
  },
  {
    id: 'vd_4',
    title: 'Plan Our Dream Trip to Udaipur or Himachal 🏔️',
    description: 'Browse lakeview heritage palaces in Udaipur or cozy wooden cottages in Manali for our next long vacation.',
    category: 'Dreaming',
    durationMinutes: 45,
    prepItems: ['Travel bookmarks', 'Pinterest board'],
    connectionPrompt: 'If we could escape tomorrow to a cozy mountain cafe with zero work emails, where are we going?',
    iconEmoji: '🏔️',
    completed: false,
  },
];

const DEFAULT_SONGS: SharedSong[] = [
  {
    id: 'song_1',
    coupleId: 'couple_8829',
    addedById: 'user_teja_1',
    addedByName: 'Teja',
    title: 'Apna Bana Le (Acoustic Lo-Fi)',
    artist: 'BetweenUs Indian Sessions',
    dedicationNote: 'This plays on repeat whenever I am working late in Hyderabad and thinking of you.',
    audioSampleUrl: 'https://cdn.freesound.org/previews/530/530415_11861866-lq.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80',
    likes: ['user_teja_1', 'user_akhila_2'],
    createdAt: '2026-09-20T10:00:00.000Z',
  },
  {
    id: 'song_2',
    coupleId: 'couple_8829',
    addedById: 'user_akhila_2',
    addedByName: 'Akhila',
    title: 'Kesariya (Monsoon Flute & Piano)',
    artist: 'Acoustic Reverie India',
    dedicationNote: 'Dedicated to you, my favorite human in the entire universe. Stay close in heart!',
    audioSampleUrl: 'https://cdn.freesound.org/previews/612/612089_11861866-lq.mp3',
    coverUrl: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=400&q=80',
    likes: ['user_akhila_2'],
    createdAt: '2026-09-22T14:30:00.000Z',
  },
];

const DEFAULT_NOTES: SharedNote[] = [
  {
    id: 'note_1',
    coupleId: 'couple_8829',
    title: '5 Things I Love About You ❤️',
    content: `1. How you always remind me to eat dinner even when office deadlines are crazy.\n2. The cute voice notes you send while stuck in Silk Board / Hitec City traffic.\n3. How you remember my exact favorite chai and snacks without asking.\n4. Our late-night 1:00 AM deep talks when both our cities are fast asleep.\n5. The way your eyes light up the second we spot each other at the airport arrivals gate.`,
    category: 'love_list',
    lastEditedById: 'user_teja_1',
    lastEditedByName: 'Teja',
    updatedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'note_2',
    coupleId: 'couple_8829',
    title: 'Our Next Goa Reunion Checklist 🌴',
    content: `• Rent a vintage scooter and ride through coconut palm avenues\n• Catch sunset at Vagator beach with tender coconut water\n• Long late-night beach strolls with sand in our toes and no alarms\n• Morning breakfast with fresh hot poee bread and iced coffee\n• At least 10 unbroken minutes of hugging at the airport arrivals!`,
    category: 'future_travel',
    lastEditedById: 'user_akhila_2',
    lastEditedByName: 'Akhila',
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
];

const DEFAULT_SURPRISES: SurpriseMessage[] = [
  {
    id: 'surp_1',
    coupleId: 'couple_8829',
    creatorId: 'user_teja_1',
    creatorName: 'Teja',
    recipientId: 'user_akhila_2',
    title: 'Open when you feel exhausted from work in Bengaluru...',
    message: "Hey love. If today felt tiring with crazy office deadlines or city traffic, take a deep breath. Distance across Indian cities is just a temporary chapter before we build our lifelong home together. You are brilliant, loved, and never alone. Drink some water and know that my heart is holding yours right this second.",
    unlockType: 'condition',
    conditionText: 'Open when having a hard or lonely day',
    isUnlocked: false,
    createdAt: '2026-09-15T00:00:00.000Z',
  },
  {
    id: 'surp_2',
    coupleId: 'couple_8829',
    creatorId: 'user_akhila_2',
    creatorName: 'Akhila',
    recipientId: 'user_teja_1',
    title: 'Open 30 minutes before your flight lands! ✈️',
    message: "By the time you read this, our distance is down to minutes! I am already standing outside the arrivals gate with your favorite sweets. Hurry to me! ❤️",
    unlockType: 'date',
    unlockDate: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(),
    isUnlocked: false,
    createdAt: '2026-09-21T00:00:00.000Z',
  },
];

const DEFAULT_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif_1',
    title: 'Akhila sent you a Hug 🤗',
    body: 'Thinking of you across Hyderabad & Bengaluru!',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    type: 'love_tap',
    isRead: false,
  },
  {
    id: 'notif_2',
    title: 'Countdown Milestone',
    body: 'Only 18 days until your reunion trip in Goa!',
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    type: 'date',
    isRead: true,
  },
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Active User State (Teja or Akhila) - scoped per device/browser session
  const [activeUserId, setActiveUserId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlUser = params.get('user')?.toLowerCase();
      if (urlUser === 'akhila' || urlUser === 'aanya' || urlUser === 'user_akhila_2' || urlUser === 'user_aanya_2') return 'user_akhila_2';
      if (urlUser === 'teja' || urlUser === 'user_teja_1') return 'user_teja_1';

      const savedUser = localStorage.getItem('betweenus_device_user_id');
      if (savedUser === 'user_teja_1' || savedUser === 'user_akhila_2') {
        return savedUser;
      }
      if (savedUser === 'user_aanya_2') {
        return 'user_akhila_2';
      }
    }
    return 'user_teja_1';
  });
  const [userA, setUserA] = useState<UserProfile>(DEFAULT_USER_A);
  const [userB, setUserB] = useState<UserProfile>(DEFAULT_USER_B);
  const [couple, setCouple] = useState<Couple | null>(DEFAULT_COUPLE);
  const [messages, setMessages] = useState<ChatMessage[]>(DEFAULT_MESSAGES);
  const [moods, setMoods] = useState<MoodEntry[]>(DEFAULT_MOODS);
  const [memories, setMemories] = useState<MemoryItem[]>(DEFAULT_MEMORIES);
  const [events, setEvents] = useState<EventItem[]>(DEFAULT_EVENTS);
  const [virtualDates, setVirtualDates] = useState<VirtualDateIdea[]>(DEFAULT_VIRTUAL_DATES);
  const [sharedSongs, setSharedSongs] = useState<SharedSong[]>(DEFAULT_SONGS);
  const [sharedNotes, setSharedNotes] = useState<SharedNote[]>(DEFAULT_NOTES);
  const [surprises, setSurprises] = useState<SurpriseMessage[]>(DEFAULT_SURPRISES);
  const [notifications, setNotifications] = useState<AppNotification[]>(DEFAULT_NOTIFICATIONS);
  const [gameSession, setGameSession] = useState<GameSession | null>(null);

  const [activeTab, setActiveTab] = useState<string>('home');
  const [quickLoveBurst, setQuickLoveBurst] = useState<{
    type: QuickLoveType;
    emoji: string;
    senderName: string;
    id: number;
  } | null>(null);

  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('betweenus_demo_mode') === 'true';
    }
    return false;
  });

  const enterDemoMode = useCallback(() => {
    setIsDemoMode(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('betweenus_demo_mode', 'true');
    }
  }, []);

  const exitDemoMode = useCallback(() => {
    setIsDemoMode(false);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('betweenus_demo_mode');
    }
  }, []);

  const isPartnerPaired = useMemo(() => {
    if (isDemoMode) return true;
    if (!couple) return false;
    const hasPartnerB = !!couple.partnerBId && couple.partnerBId !== '';
    return hasPartnerB && couple.status !== 'waiting_for_partner';
  }, [isDemoMode, couple]);

  // Broadcast channel for instantaneous cross-tab multi-window simulation
  const broadcastChannel = useMemo(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      return new BroadcastChannel(BROADCAST_KEY);
    }
    return null;
  }, []);

  // Real-time Network & Cloud Sync status
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isChatSyncing, setIsChatSyncing] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Live Location tracking state
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [rtdbPartnerLocation, setRtdbPartnerLocation] = useState<LiveLocationRecord | null>(null);
  const locationWatchIdRef = useRef<number | null>(null);
  const clearLocationError = useCallback(() => setLocationError(null), []);

  // Emergency SOS & Partner Phone Siren state
  const [activeEmergencyAlert, setActiveEmergencyAlert] = useState<EmergencyAlert | null>(null);

  // Real-Time Active Call Session (between both partners' devices)
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const recordedCallLogsRef = useRef<Set<string>>(new Set());
  const activeCallRef = useRef<CallSession | null>(null);
  activeCallRef.current = activeCall;

  const userARef = useRef(userA);
  userARef.current = userA;
  const userBRef = useRef(userB);
  userBRef.current = userB;
  const coupleRef = useRef(couple);
  coupleRef.current = couple;
  const activeUserIdRef = useRef(activeUserId);
  activeUserIdRef.current = activeUserId;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const lastLocationUpdateRef = useRef<{ lat: number; lng: number; time: number }>({ lat: 0, lng: 0, time: 0 });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (locationWatchIdRef.current !== null && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(locationWatchIdRef.current);
        locationWatchIdRef.current = null;
      }
    };
  }, []);

  // Load from localStorage on mount (preserving preferences, but Firestore is sole source for messages)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.userA) {
          if (!parsed.userA.avatarUrl || parsed.userA.avatarUrl.includes('photo-1534528741775-53994a69daeb')) {
            parsed.userA.avatarUrl = '/app-logo.svg';
          }
          setUserA(parsed.userA);
        }
        if (parsed.userB) {
          if (!parsed.userB.avatarUrl || parsed.userB.avatarUrl.includes('photo-1517841905240-472988babdf9')) {
            parsed.userB.avatarUrl = '/app-logo.svg';
          }
          if (parsed.userB.name === 'Aanya' || !parsed.userB.name) {
            parsed.userB.name = 'Akhila';
          }
          if (parsed.userB.email === 'aanya@example.com') {
            parsed.userB.email = 'akhila@example.com';
          }
          if (parsed.userB.id === 'user_aanya_2') {
            parsed.userB.id = 'user_akhila_2';
          }
          setUserB(parsed.userB);
        }
        if (parsed.couple !== undefined && parsed.couple) {
          if (parsed.couple.partnerBName === 'Aanya') {
            parsed.couple.partnerBName = 'Akhila';
          }
          if (parsed.couple.relationshipName?.includes('Aanya')) {
            parsed.couple.relationshipName = parsed.couple.relationshipName.replace('Aanya', 'Akhila');
          }
          if (parsed.couple.partnerBId === 'user_aanya_2') {
            parsed.couple.partnerBId = 'user_akhila_2';
          }
          setCouple(parsed.couple);
        }
        if (parsed.messages && Array.isArray(parsed.messages) && parsed.messages.length > 0) {
          setMessages(parsed.messages);
        }
        if (parsed.moods) setMoods(parsed.moods);
        if (parsed.memories) setMemories(parsed.memories);
        if (parsed.events) setEvents(parsed.events);
        if (parsed.virtualDates) setVirtualDates(parsed.virtualDates);
        if (parsed.sharedSongs) setSharedSongs(parsed.sharedSongs);
        if (parsed.sharedNotes) setSharedNotes(parsed.sharedNotes);
        if (parsed.surprises) setSurprises(parsed.surprises);
        if (parsed.notifications) setNotifications(parsed.notifications);
        if (parsed.gameSession) setGameSession(parsed.gameSession);
      }
    } catch (e) {
      console.error('Failed to load local state:', e);
    }
  }, []);

  // Firebase Auth State
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [pendingInviteCode, setPendingInviteCode] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlCode = params.get('code') || params.get('invite') || params.get('pair') || params.get('join');
      if (urlCode && urlCode.trim()) {
        const cleanCode = urlCode.trim().toUpperCase();
        try {
          sessionStorage.setItem('betweenus_pending_invite_code', cleanCode);
          localStorage.setItem('betweenus_pending_invite_code', cleanCode);
        } catch (_) {}
        return cleanCode;
      }
      try {
        return sessionStorage.getItem('betweenus_pending_invite_code') || localStorage.getItem('betweenus_pending_invite_code') || null;
      } catch (_) {}
    }
    return null;
  });

  const isFirebaseConnected = !!firebaseConfig.projectId;
  const firebaseProjectId = firebaseConfig.projectId;

  // Clean URL search parameters once captured
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlCode = params.get('code') || params.get('invite') || params.get('pair') || params.get('join');
      if (urlCode) {
        params.delete('code');
        params.delete('invite');
        params.delete('pair');
        params.delete('join');
        const newSearch = params.toString();
        const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '');
        window.history.replaceState({}, document.title, newUrl);
      }
    }
  }, []);

  useEffect(() => {
    const unsub = subscribeToAuth(async (u) => {
      setFirebaseUser(u);
      try {
        if (u) {
          setIsDemoMode(false);
          if (typeof window !== 'undefined') {
            localStorage.removeItem('betweenus_demo_mode');
          }

          // 1. Get or create personalized user profile from Firestore
          const profile = await getOrCreateUserProfile(u);

          // Self-heal stale test name if email belongs to someone else
          const isEmailTeja = (u.email || '').toLowerCase().startsWith('teja');
          if ((!profile.name || profile.name === 'You' || (profile.name.toLowerCase() === 'teja' && !isEmailTeja)) && u.email) {
            const derived = getNameFromEmail(u.email, u.displayName);
            if (derived && derived !== 'You') {
              profile.name = derived;
              syncUserToFirestore(profile);
            }
          }

          setActiveUserId(u.uid);
          setUserA(profile);

          // 2. Query Firestore for this user's couple space
          let userCouple = await findCoupleForUser(u.uid);

          // 3. Auto-link pending invite code if waiting for partner or newly signed in
          const storedInvite =
            sessionStorage.getItem('betweenus_pending_invite_code') ||
            localStorage.getItem('betweenus_pending_invite_code');

          if (
            storedInvite &&
            (!userCouple || userCouple.status === 'waiting_for_partner') &&
            storedInvite !== profile.coupleCode?.toUpperCase()
          ) {
            try {
              const pairRes = await pairPartnersWithCode(storedInvite, profile);
              if (pairRes.success && pairRes.couple) {
                userCouple = pairRes.couple;
                sessionStorage.removeItem('betweenus_pending_invite_code');
                localStorage.removeItem('betweenus_pending_invite_code');
                setPendingInviteCode(null);
              }
            } catch (e) {
              console.debug('Pending invite code auto-pair notice:', e);
            }
          }

          if (!userCouple) {
            // If no couple exists, ensure a pending couple space with their own personal code
            userCouple = await ensureUserPendingCouple(profile);
          } else {
            // Keep couple partner name in sync with user's genuine profile name
            let coupleNeedsSync = false;
            if (userCouple.partnerAId === u.uid && userCouple.partnerAName !== profile.name) {
              userCouple.partnerAName = profile.name;
              coupleNeedsSync = true;
            } else if (userCouple.partnerBId === u.uid && userCouple.partnerBName !== profile.name) {
              userCouple.partnerBName = profile.name;
              coupleNeedsSync = true;
            }
            if (coupleNeedsSync) {
              syncCoupleToFirestore(userCouple);
            }
          }
          setCouple(userCouple);

          // 4. Resolve partner profile if paired
          const partnerUid = userCouple.partnerAId === u.uid ? userCouple.partnerBId : userCouple.partnerAId;
          const isCurrentTeja = (profile.name || '').toLowerCase() === 'teja';
          const expectedPartnerName = isCurrentTeja ? 'Akhila' : 'Teja';
          const expectedPartnerCity = isCurrentTeja ? 'Bengaluru' : 'Hyderabad';

          if (partnerUid && partnerUid !== u.uid) {
            const partnerProfile = await getUserProfile(partnerUid);
            if (partnerProfile) {
              // Self-heal duplicate names
              if (partnerProfile.name.toLowerCase() === profile.name.toLowerCase()) {
                partnerProfile.name = expectedPartnerName;
                partnerProfile.city = expectedPartnerCity;
              }
              setUserB(partnerProfile);
            } else {
              let fallbackName = (userCouple.partnerAId === u.uid ? userCouple.partnerBName : userCouple.partnerAName);
              if (!fallbackName || fallbackName.toLowerCase() === profile.name.toLowerCase() || fallbackName === 'Partner') {
                fallbackName = expectedPartnerName;
              }
              setUserB((prev) => ({
                ...prev,
                id: partnerUid,
                uid: partnerUid,
                name: fallbackName,
                city: fallbackName === 'Akhila' ? 'Bengaluru' : 'Hyderabad',
              }));
            }
          } else {
            // Partner slot waiting to be linked - initialize with distinct partner (Akhila or Teja)
            setUserB({
              id: isCurrentTeja ? 'user_akhila_2' : 'user_teja_1',
              uid: isCurrentTeja ? 'user_akhila_2' : 'user_teja_1',
              name: expectedPartnerName,
              email: isCurrentTeja ? 'akhila@betweenus.love' : 'teja@betweenus.love',
              city: expectedPartnerCity,
              country: 'IN',
              avatarUrl: '/app-logo.svg',
              timeZone: 'Asia/Kolkata',
              anniversaryDate: userCouple.anniversaryDate || new Date().toISOString().split('T')[0],
              sleepStartHour: 23,
              sleepEndHour: 7,
              shareLocation: true,
              emergencyContacts: [],
            });
          }
        } else {
          if (isDemoMode) {
            setCouple((prev) => prev || DEFAULT_COUPLE);
          }
        }
      } catch (authErr) {
        console.warn('Auth user initialization notice:', authErr);
      } finally {
        setIsAuthLoading(false);
      }
    });
    return () => unsub();
  }, [isDemoMode]);

  // Lock device identity: prevent account switching from partner's phone
  useEffect(() => {
    if (firebaseUser?.uid && activeUserId !== firebaseUser.uid) {
      setActiveUserId(firebaseUser.uid);
      try {
        localStorage.setItem('betweenus_device_user_id', firebaseUser.uid);
      } catch (e) {}
    }
  }, [firebaseUser, activeUserId]);

  const readReceiptsSentRef = useRef<Set<string>>(new Set());

  // Listen to Firestore real-time updates for the couple document and messages ONLY when authenticated & connected
  useEffect(() => {
    if (!couple?.id || !firebaseUser) {
      setIsChatSyncing(false);
      return;
    }

    setIsChatSyncing(true);

    // 1. Listen to Real-Time Cloud Messages: couples/{coupleId}/messages
    const unsubMsgs = listenToCoupleMessages(
      couple.id,
      (cloudMsgs) => {
        setMessages((prevLocal) => {
          const cloudIds = new Set((cloudMsgs || []).map((m) => m.id));
          // Keep recent local optimistic messages sent within last 15 seconds that might still be syncing
          const pendingRecent = prevLocal.filter(
            (m) => !cloudIds.has(m.id) && m.senderId === firebaseUser.uid && Date.now() - new Date(m.createdAt).getTime() < 15000
          );
          const merged = [...(cloudMsgs || []), ...pendingRecent];
          merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          return merged;
        });
        setIsChatSyncing(false);
        setChatError(null);

        // Functional Read Receipts: ONLY mark unread messages as read if user is viewing chat tab
        if (activeTab === 'chat' && cloudMsgs && cloudMsgs.length > 0) {
          cloudMsgs.forEach((msg) => {
            if (
              msg.senderId !== firebaseUser.uid &&
              (!msg.readBy || !msg.readBy.includes(firebaseUser.uid) || msg.status !== 'read') &&
              !readReceiptsSentRef.current.has(msg.id)
            ) {
              readReceiptsSentRef.current.add(msg.id);
              markMessageAsReadInFirestore(couple.id, msg.id, firebaseUser.uid);
            }
          });
        }
      },
      (error) => {
        setIsChatSyncing(false);
        setChatError('Connection interrupted. Reconnecting chat...');
        console.warn('Real-time chat listener notice:', error);
      }
    );

    // 2. Listen to Couple document updates (partner joining or profile updates & live location)
    const unsubCouple = listenToCoupleDoc(couple.id, async (cloudCouple) => {
      if (cloudCouple) {
        // Self-heal duplicate or missing partner names in cloud couple doc
        if (
          cloudCouple.partnerAName &&
          cloudCouple.partnerBName &&
          cloudCouple.partnerAName.toLowerCase() === cloudCouple.partnerBName.toLowerCase()
        ) {
          cloudCouple.partnerAName = 'Teja';
          cloudCouple.partnerBName = 'Akhila';
          cloudCouple.relationshipName = 'Teja & Akhila';
          syncCoupleToFirestore(cloudCouple);
        }

        setCouple((prev) => (prev ? { ...prev, ...cloudCouple } : cloudCouple));
        const partnerUid = cloudCouple.partnerAId === firebaseUser.uid ? cloudCouple.partnerBId : cloudCouple.partnerAId;
        const isCurrentTeja = (userARef.current.name || '').toLowerCase() === 'teja';
        const expectedPartnerName = isCurrentTeja ? 'Akhila' : 'Teja';
        const expectedPartnerCity = isCurrentTeja ? 'Bengaluru' : 'Hyderabad';

        if (partnerUid && partnerUid !== firebaseUser.uid) {
          const partnerProfile = await getUserProfile(partnerUid);
          if (partnerProfile) {
            if (partnerProfile.name.toLowerCase() === userARef.current.name.toLowerCase()) {
              partnerProfile.name = expectedPartnerName;
              partnerProfile.city = expectedPartnerCity;
            }
            setUserB(partnerProfile);
          } else {
            let fallbackName = (cloudCouple.partnerAId === firebaseUser.uid ? cloudCouple.partnerBName : cloudCouple.partnerAName);
            if (!fallbackName || fallbackName.toLowerCase() === userARef.current.name.toLowerCase() || fallbackName === 'Partner') {
              fallbackName = expectedPartnerName;
            }
            setUserB((prev) => ({
              ...prev,
              id: partnerUid,
              uid: partnerUid,
              name: fallbackName,
              city: fallbackName === 'Akhila' ? 'Bengaluru' : 'Hyderabad',
            }));
          }
        } else {
          // Unpaired / waiting: keep expected partner distinct from user
          setUserB((prev) => ({
            ...prev,
            name: prev.name === 'Partner' || prev.name.toLowerCase() === userARef.current.name.toLowerCase() ? expectedPartnerName : prev.name,
            city: prev.city || expectedPartnerCity,
          }));
        }

        // Determine which slot current user occupies in cloud couple
        const mySlot = getCoupleSlot(firebaseUser.uid, cloudCouple);
        const isMySlotA = mySlot === 'partnerA';

        // Extract cloud fields accurately for current user vs partner
        const myCloudPhone = isMySlotA
          ? (cloudCouple as any).partnerAPhoneNumber
          : (cloudCouple as any).partnerBPhoneNumber;
        const partnerCloudPhone = isMySlotA
          ? (cloudCouple as any).partnerBPhoneNumber
          : (cloudCouple as any).partnerAPhoneNumber;

        const myCloudLoc = isMySlotA ? cloudCouple.partnerALocation : cloudCouple.partnerBLocation;
        const partnerCloudLoc = isMySlotA ? cloudCouple.partnerBLocation : cloudCouple.partnerALocation;

        const myCloudShareLoc = isMySlotA ? cloudCouple.partnerAShareLocation : cloudCouple.partnerBShareLocation;
        const partnerCloudShareLoc = isMySlotA ? cloudCouple.partnerBShareLocation : cloudCouple.partnerAShareLocation;

        const myCloudCity = isMySlotA ? cloudCouple.partnerACity : cloudCouple.partnerBCity;
        const partnerCloudCity = isMySlotA ? cloudCouple.partnerBCity : cloudCouple.partnerACity;

        // Current user (userA) updates
        setUserA((prev) => ({
          ...prev,
          phoneNumber: myCloudPhone !== undefined && myCloudPhone !== '' ? myCloudPhone : prev.phoneNumber,
          location: myCloudLoc !== undefined ? myCloudLoc : prev.location,
          shareLocation: myCloudShareLoc !== undefined ? myCloudShareLoc : prev.shareLocation,
          city: myCloudCity || prev.city,
        }));

        // Partner (userB) updates
        setUserB((prev) => ({
          ...prev,
          phoneNumber: partnerCloudPhone !== undefined && partnerCloudPhone !== '' ? partnerCloudPhone : prev.phoneNumber,
          location: partnerCloudLoc !== undefined ? partnerCloudLoc : prev.location,
          shareLocation: partnerCloudShareLoc !== undefined ? partnerCloudShareLoc : prev.shareLocation,
          city: partnerCloudCity || prev.city,
        }));

        // Emergency SOS Alert synchronization from cloud couple doc
        if ((cloudCouple as any).activeEmergencyAlert !== undefined) {
          const cloudAlert = (cloudCouple as any).activeEmergencyAlert as EmergencyAlert | null;
          setActiveEmergencyAlert(cloudAlert);
        }

        // Active Call Session synchronization from cloud couple doc
        if ((cloudCouple as any).activeCall !== undefined) {
          const cloudCall = (cloudCouple as any).activeCall as CallSession | null;
          if (cloudCall && isCallStale(cloudCall)) {
            // Clean up stale or expired call in Firestore so it doesn't linger
            syncActiveCallToFirestore(couple.id, null);
            setActiveCall(null);
          } else {
            setActiveCall(cloudCall);
          }
        }
      }
    });

    // 3. Listen to Partner's User Document in real-time
    const partnerUid = couple.partnerAId === firebaseUser.uid ? couple.partnerBId : couple.partnerAId;
    let unsubPartnerDoc = () => {};
    if (partnerUid && partnerUid !== firebaseUser.uid) {
      unsubPartnerDoc = listenToUserDoc(partnerUid, (partnerProfile) => {
        if (partnerProfile) {
          setUserB((prev) => ({
            ...prev,
            ...partnerProfile,
          }));
        }
      });
    }

    // 4. Listen to Current User's Document in real-time
    const unsubMyDoc = listenToUserDoc(firebaseUser.uid, (myCloudProfile) => {
      if (myCloudProfile) {
        setUserA((prev) => ({
          ...prev,
          ...myCloudProfile,
        }));
      }
    });

    const unsubMoods = listenToCoupleMoods(couple.id, (cloudMoods) => {
      if (cloudMoods && cloudMoods.length > 0) {
        setMoods((prev) => {
          const map = new Map<string, MoodEntry>();
          prev.forEach((m) => map.set(m.id, m));
          cloudMoods.forEach((m) => map.set(m.id, m));
          return Array.from(map.values()).sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
        });
      }
    });

    const unsubMemories = listenToCoupleMemories(couple.id, (cloudMems) => {
      if (cloudMems && cloudMems.length > 0) {
        setMemories((prev) => {
          const map = new Map<string, MemoryItem>();
          prev.forEach((m) => map.set(m.id, m));
          cloudMems.forEach((m) => map.set(m.id, m));
          return Array.from(map.values()).sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );
        });
      }
    });

    return () => {
      unsubMsgs();
      unsubCouple();
      unsubPartnerDoc();
      unsubMyDoc();
      unsubMoods();
      unsubMemories();
    };
  }, [couple?.id, firebaseUser?.uid]);

  // Synchronize state across browser tabs via storage events
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.notifications) setNotifications(parsed.notifications);
          if (parsed.moods) setMoods(parsed.moods);
          if (parsed.memories) setMemories(parsed.memories);
          if (parsed.events) setEvents(parsed.events);
          if (parsed.virtualDates) setVirtualDates(parsed.virtualDates);
          if (parsed.sharedSongs) setSharedSongs(parsed.sharedSongs);
          if (parsed.sharedNotes) setSharedNotes(parsed.sharedNotes);
          if (parsed.surprises) setSurprises(parsed.surprises);
          if (parsed.gameSession !== undefined) setGameSession(parsed.gameSession);
          if (parsed.activeCall !== undefined) {
            if (parsed.activeCall && isCallStale(parsed.activeCall)) {
              setActiveCall(null);
            } else {
              setActiveCall(parsed.activeCall);
            }
          }
        } catch (err) {
          console.debug('Storage sync notice:', err);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Synchronize state across browser tabs/windows
  useEffect(() => {
    if (!broadcastChannel) return;

    const handleMessage = (event: MessageEvent) => {
      const { type, payload } = event.data || {};
      if (type === 'STATE_UPDATE') {
        if (payload.messages) setMessages(payload.messages);
        if (payload.moods) setMoods(payload.moods);
        if (payload.memories) setMemories(payload.memories);
        if (payload.events) setEvents(payload.events);
        if (payload.virtualDates) setVirtualDates(payload.virtualDates);
        if (payload.sharedSongs) setSharedSongs(payload.sharedSongs);
        if (payload.sharedNotes) setSharedNotes(payload.sharedNotes);
        if (payload.surprises) setSurprises(payload.surprises);
        if (payload.notifications) setNotifications(payload.notifications);
        if (payload.userA) setUserA(payload.userA);
        if (payload.userB) setUserB(payload.userB);
        if (payload.couple !== undefined) setCouple(payload.couple);
        if (payload.gameSession !== undefined) setGameSession(payload.gameSession);
      } else if (type === 'LOVE_BURST') {
        setQuickLoveBurst({
          type: payload.type,
          emoji: payload.emoji,
          senderName: payload.senderName,
          id: Date.now(),
        });
      } else if (type === 'EMERGENCY_SOS_TRIGGERED' || type === 'EMERGENCY_SOS_ACKNOWLEDGED' || type === 'EMERGENCY_SOS_CANCELLED') {
        setActiveEmergencyAlert(payload);
      } else if (type === 'CALL_UPDATE') {
        if (payload && isCallStale(payload)) {
          setActiveCall(null);
        } else {
          setActiveCall(payload);
        }
      }
    };

    broadcastChannel.addEventListener('message', handleMessage);
    return () => {
      broadcastChannel.removeEventListener('message', handleMessage);
    };
  }, [broadcastChannel]);

  // Persist current state to localStorage and broadcast
  const saveAndBroadcast = useCallback(
    (overrides?: Record<string, any>) => {
      const stateToSave = {
        activeUserId,
        userA,
        userB,
        couple,
        messages,
        moods,
        memories,
        events,
        virtualDates,
        sharedSongs,
        sharedNotes,
        surprises,
        notifications,
        gameSession,
        activeCall,
        ...overrides,
      };

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      } catch (err) {
        console.error('Failed to save to localStorage:', err);
      }

      if (broadcastChannel) {
        broadcastChannel.postMessage({
          type: 'STATE_UPDATE',
          payload: stateToSave,
        });
      }
    },
    [
      activeUserId,
      userA,
      userB,
      couple,
      messages,
      moods,
      memories,
      events,
      virtualDates,
      sharedSongs,
      sharedNotes,
      surprises,
      notifications,
      gameSession,
      broadcastChannel,
    ]
  );

  // Compute Current & Partner User objects
  const rawCurrentUser = activeUserId === userA.id ? userA : userB;
  const rawPartnerUser = activeUserId === userA.id ? userB : userA;

  const currentUser = rawCurrentUser;
  const partnerUser = useMemo(() => {
    const isMeTeja = (currentUser.name || '').toLowerCase() === 'teja';
    const isPartnerSame = (rawPartnerUser.name || '').toLowerCase() === (currentUser.name || '').toLowerCase();
    const isPartnerGeneric = !rawPartnerUser.name || rawPartnerUser.name === 'Partner';

    if (isPartnerSame || isPartnerGeneric) {
      return {
        ...rawPartnerUser,
        name: isMeTeja ? 'Akhila' : 'Teja',
        city: isMeTeja
          ? (rawPartnerUser.city === 'Hyderabad' ? 'Bengaluru' : rawPartnerUser.city || 'Bengaluru')
          : (rawPartnerUser.city === 'Bengaluru' ? 'Hyderabad' : rawPartnerUser.city || 'Hyderabad'),
      };
    }
    return rawPartnerUser;
  }, [currentUser.name, rawPartnerUser]);

  // Listen to Partner Live Location in Firebase Realtime Database
  useEffect(() => {
    const partnerId = partnerUser.uid || partnerUser.id;
    if (!partnerId) return;

    const unsubRtdbLocation = subscribeToPartnerLocationRTDB(partnerId, (liveRecord) => {
      if (liveRecord) {
        setRtdbPartnerLocation(liveRecord);
        if (liveRecord.sharing) {
          const isPartnerA = partnerUser.id === userA.id;
          const newLocation: LocationData = {
            latitude: liveRecord.latitude,
            longitude: liveRecord.longitude,
            city: liveRecord.address || partnerUser.city,
            country: 'India',
            accuracyMeters: liveRecord.accuracy,
            source: 'gps',
            updatedAt: new Date(liveRecord.timestamp).toISOString(),
          };
          if (isPartnerA) {
            setUserA((prev) => ({
              ...prev,
              shareLocation: true,
              location: newLocation,
              city: liveRecord.address || prev.city,
            }));
          } else {
            setUserB((prev) => ({
              ...prev,
              shareLocation: true,
              location: newLocation,
              city: liveRecord.address || prev.city,
            }));
          }
        } else {
          const isPartnerA = partnerUser.id === userA.id;
          if (isPartnerA) {
            setUserA((prev) => ({ ...prev, shareLocation: false }));
          } else {
            setUserB((prev) => ({ ...prev, shareLocation: false }));
          }
        }
      }
    });

    return () => {
      unsubRtdbLocation();
    };
  }, [partnerUser.id, partnerUser.uid, userA.id]);

  const switchActiveUser = useCallback((userId: string) => {
    // Strictly prevent switching accounts from partner's phone if authenticated
    if (firebaseUser?.uid) {
      setActiveUserId(firebaseUser.uid);
      try {
        localStorage.setItem('betweenus_device_user_id', firebaseUser.uid);
      } catch (e) {}
      return;
    }
    setActiveUserId(userId);
    try {
      localStorage.setItem('betweenus_device_user_id', userId);
    } catch (e) {}
  }, [firebaseUser]);

  // 1. Chat Message Actions
  const sendMessage = useCallback(
    async (
      text: string,
      mediaUrl?: string,
      mediaType?: 'image' | 'video' | 'voice' | 'love_tap' | 'call',
      voiceDurationSec?: number,
      replyTo?: { id: string; senderName: string; text: string },
      callData?: { mode: 'voice' | 'video'; durationSec: number; status: 'completed' | 'missed' }
    ) => {
      const cleanText = text.trim();
      if (!cleanText && !mediaUrl && !callData) {
        throw new Error('Message cannot be empty');
      }

      // Safeguard: Deduplicate call cards sent within 15 seconds
      if (mediaType === 'call') {
        const isDuplicateCallMsg = messagesRef.current.some((m) => {
          if (m.type !== 'call' && m.mediaType !== 'call') return false;
          const timeDiff = Math.abs(Date.now() - new Date(m.createdAt).getTime());
          return (
            timeDiff < 15000 &&
            (m.text === cleanText ||
              (m.callData?.durationSec === callData?.durationSec &&
                m.callData?.mode === callData?.mode))
          );
        });
        if (isDuplicateCallMsg) {
          console.debug('Prevented duplicate call message logging:', cleanText);
          return;
        }
      }

      const activeCoupleId = couple?.id || 'couple_teja_akhila';
      const senderUid = firebaseUser?.uid || currentUser.id || activeUserId;
      const senderDisplayName = currentUser.name || firebaseUser?.displayName || 'Partner';

      const newMsgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newMsg: ChatMessage = {
        id: newMsgId,
        coupleId: activeCoupleId,
        senderId: senderUid,
        senderName: senderDisplayName,
        text: cleanText,
        type: mediaType || 'text',
        status: 'sent',
        mediaUrl: mediaUrl || undefined,
        mediaType: mediaType || undefined,
        voiceDurationSec: voiceDurationSec || undefined,
        callData: callData || undefined,
        replyTo: replyTo || undefined,
        reactions: [],
        readBy: [senderUid],
        createdAt: new Date().toISOString(),
      };

      // 1. INSTANT OPTIMISTIC UI UPDATE (Works offline, demo, and live without delay)
      setMessages((prev) => {
        const exists = prev.some((m) => m.id === newMsg.id);
        if (exists) return prev;
        const updated = [...prev, newMsg];
        saveAndBroadcast({ messages: updated });
        return updated;
      });
      setChatError(null);

      // Create notification for partner locally
      const newNotif: AppNotification = {
        id: `notif_${Date.now()}`,
        title: `Message sent to ${partnerUser.name}`,
        body:
          cleanText ||
          (mediaType === 'image'
            ? 'Sent a photo 📷'
            : mediaType === 'video'
            ? 'Sent a video 🎬'
            : mediaType === 'voice'
            ? 'Sent a voice note 🎙️'
            : mediaType === 'call'
            ? 'Call logged 📞'
            : 'Sent a quick love tap ❤️'),
        timestamp: new Date().toISOString(),
        type: 'message',
        isRead: false,
      };
      setNotifications((prev) => [newNotif, ...prev].slice(0, 30));

      // 2. BACKGROUND CLOUD SYNC (Non-blocking, resilient failover)
      if (couple?.id && firebaseUser) {
        setIsChatSyncing(true);
        try {
          const res = await syncMessageToFirestore(couple.id, newMsg);
          setIsChatSyncing(false);
          if (!res.success) {
            console.warn('Background message sync notice:', res.error);
          }
        } catch (syncErr: any) {
          setIsChatSyncing(false);
          console.warn('Background message sync error:', syncErr);
        }
      }
    },
    [activeUserId, couple, currentUser.id, currentUser.name, firebaseUser, partnerUser.name, saveAndBroadcast]
  );

  const deleteMessage = useCallback(
    (id: string) => {
      setMessages((prev) => {
        const updated = prev.filter((m) => m.id !== id);
        saveAndBroadcast({ messages: updated });
        return updated;
      });
      if (coupleRef.current) {
        deleteMessageFromFirestore(coupleRef.current.id, id);
      }
    },
    [saveAndBroadcast]
  );

  const clearChatMessages = useCallback(
    async () => {
      setMessages([]);
      saveAndBroadcast({ messages: [] });
      if (coupleRef.current) {
        await clearMessagesFromFirestore(coupleRef.current.id);
      }
    },
    [saveAndBroadcast]
  );

  const toggleMessageReaction = useCallback(
    (messageId: string, emoji: string) => {
      let targetMsg: ChatMessage | null = null;
      setMessages((prev) => {
        const updated = prev.map((m) => {
          if (m.id !== messageId) return m;
          const existingIdx = m.reactions.findIndex((r) => r.userId === currentUser.id);
          let newReactions = [...m.reactions];
          if (existingIdx >= 0) {
            if (newReactions[existingIdx].emoji === emoji) {
              newReactions.splice(existingIdx, 1);
            } else {
              newReactions[existingIdx] = { userId: currentUser.id, emoji };
            }
          } else {
            newReactions.push({ userId: currentUser.id, emoji });
          }
          targetMsg = { ...m, reactions: newReactions };
          return targetMsg;
        });
        saveAndBroadcast({ messages: updated });
        return updated;
      });
      if (coupleRef.current && targetMsg) {
        syncMessageToFirestore(coupleRef.current.id, targetMsg);
      }
    },
    [currentUser.id, saveAndBroadcast]
  );

  // 2. Quick Love Actions (Love you, Hug, Kiss, Miss you, Thinking of you)
  const sendQuickLove = useCallback(
    (type: QuickLoveType) => {
      const emojiMap: Record<QuickLoveType, { emoji: string; label: string }> = {
        love_you: { emoji: '❤️', label: 'Love you' },
        hug: { emoji: '🤗', label: 'Warm Hug' },
        kiss: { emoji: '😘', label: 'Sweet Kiss' },
        miss_you: { emoji: '🥰', label: 'Miss you so much' },
        thinking_of_you: { emoji: '🌹', label: 'Thinking of you' },
      };

      const meta = emojiMap[type];

      setQuickLoveBurst({
        type,
        emoji: meta.emoji,
        senderName: currentUser.name,
        id: Date.now(),
      });

      if (broadcastChannel) {
        broadcastChannel.postMessage({
          type: 'LOVE_BURST',
          payload: {
            type,
            emoji: meta.emoji,
            senderName: currentUser.name,
          },
        });
      }

      sendMessage(`${meta.emoji} ${meta.label}!`, undefined, 'love_tap');
    },
    [broadcastChannel, currentUser.name, sendMessage]
  );

  // 3. Mood Actions
  const logMood = useCallback(
    (moodType: MoodType, note?: string) => {
      if (!couple) return;
      const newMood: MoodEntry = {
        id: `mood_${Date.now()}`,
        coupleId: couple.id,
        userId: currentUser.id,
        userName: currentUser.name,
        moodType,
        note,
        timestamp: new Date().toISOString(),
      };

      const updatedMoods = [newMood, ...moods];
      setMoods(updatedMoods);

      // Update user currentMoodId
      let updatedUserA = userA;
      let updatedUserB = userB;
      if (currentUser.id === userA.id) {
        updatedUserA = { ...userA, currentMoodId: newMood.id };
        setUserA(updatedUserA);
      } else {
        updatedUserB = { ...userB, currentMoodId: newMood.id };
        setUserB(updatedUserB);
      }

      // Partner notification
      const newNotif: AppNotification = {
        id: `notif_${Date.now()}`,
        title: `${currentUser.name} shared their mood`,
        body: `${currentUser.name} is feeling ${moodType.replace('_', ' ')}: "${note || 'No note added'}"`,
        timestamp: new Date().toISOString(),
        type: 'mood',
        isRead: false,
      };
      const updatedNotifs = [newNotif, ...notifications];
      setNotifications(updatedNotifs);

      saveAndBroadcast({
        moods: updatedMoods,
        userA: updatedUserA,
        userB: updatedUserB,
        notifications: updatedNotifs,
      });

      if (couple) {
        syncMoodToFirestore(couple.id, newMood);
      }
    },
    [couple, currentUser, moods, notifications, saveAndBroadcast, userA, userB]
  );

  // 4. Memory Actions
  const addMemory = useCallback(
    (mem: Omit<MemoryItem, 'id' | 'likesCount'>) => {
      if (!couple) return;
      const newMem: MemoryItem = {
        ...mem,
        id: `mem_${Date.now()}`,
        likesCount: 1,
      };
      const updated = [newMem, ...memories];
      setMemories(updated);
      saveAndBroadcast({ memories: updated });

      syncMemoryToFirestore(couple.id, newMem);
    },
    [couple, memories, saveAndBroadcast]
  );

  const likeMemory = useCallback(
    (memoryId: string) => {
      const updated = memories.map((m) =>
        m.id === memoryId ? { ...m, likesCount: m.likesCount + 1 } : m
      );
      setMemories(updated);
      saveAndBroadcast({ memories: updated });
    },
    [memories, saveAndBroadcast]
  );

  // 5. Events / Important Dates Actions
  const addEvent = useCallback(
    (ev: Omit<EventItem, 'id'>) => {
      if (!couple) return;
      const newEv: EventItem = {
        ...ev,
        id: `ev_${Date.now()}`,
      };
      const updated = [...events, newEv].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      setEvents(updated);
      saveAndBroadcast({ events: updated });
    },
    [couple, events, saveAndBroadcast]
  );

  const deleteEvent = useCallback(
    (id: string) => {
      const updated = events.filter((e) => e.id !== id);
      setEvents(updated);
      saveAndBroadcast({ events: updated });
    },
    [events, saveAndBroadcast]
  );

  // 6. Virtual Dates
  const toggleDateCompleted = useCallback(
    (id: string, notes?: string) => {
      const targetDate = virtualDates.find((d) => d.id === id);
      const isNowCompleted = !targetDate?.completed;

      const updated = virtualDates.map((d) =>
        d.id === id
          ? {
              ...d,
              completed: isNowCompleted,
              completedAt: isNowCompleted ? new Date().toISOString() : undefined,
            }
          : d
      );
      setVirtualDates(updated);

      // If marked completed, automatically create a sweet Memory!
      let updatedMemories = memories;
      if (isNowCompleted && targetDate) {
        const autoMemory: MemoryItem = {
          id: `mem_vd_${Date.now()}`,
          coupleId: couple?.id || 'couple_8829',
          title: `Virtual Date: ${targetDate.title}`,
          description: notes || `We completed this date together! ${targetDate.description}`,
          date: new Date().toISOString().split('T')[0],
          mediaUrl: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?auto=format&fit=crop&w=600&q=80',
          category: 'special_moment',
          locationName: 'Virtual Date Night',
          addedById: currentUser.id,
          addedByName: currentUser.name,
          likesCount: 2,
        };
        updatedMemories = [autoMemory, ...memories];
        setMemories(updatedMemories);
      }

      saveAndBroadcast({ virtualDates: updated, memories: updatedMemories });
    },
    [couple?.id, currentUser, memories, saveAndBroadcast, virtualDates]
  );

  const addVirtualDate = useCallback(
    (date: Omit<VirtualDateIdea, 'id'>) => {
      const newDate: VirtualDateIdea = {
        ...date,
        id: `vd_${Date.now()}`,
        completed: false,
      };
      const updated = [newDate, ...virtualDates];
      setVirtualDates(updated);
      saveAndBroadcast({ virtualDates: updated });
    },
    [saveAndBroadcast, virtualDates]
  );

  // 7. Shared Notes
  const saveSharedNote = useCallback(
    (note: Partial<SharedNote> & { title: string; content: string; category: any }) => {
      if (!couple) return;
      let updated: SharedNote[];
      if (note.id) {
        updated = sharedNotes.map((n) =>
          n.id === note.id
            ? {
                ...n,
                ...note,
                lastEditedById: currentUser.id,
                lastEditedByName: currentUser.name,
                updatedAt: new Date().toISOString(),
              }
            : n
        );
      } else {
        const newNote: SharedNote = {
          id: `note_${Date.now()}`,
          coupleId: couple.id,
          title: note.title,
          content: note.content,
          category: note.category,
          lastEditedById: currentUser.id,
          lastEditedByName: currentUser.name,
          updatedAt: new Date().toISOString(),
        };
        updated = [newNote, ...sharedNotes];
      }
      setSharedNotes(updated);
      saveAndBroadcast({ sharedNotes: updated });
    },
    [couple, currentUser, saveAndBroadcast, sharedNotes]
  );

  const deleteSharedNote = useCallback(
    (id: string) => {
      const updated = sharedNotes.filter((n) => n.id !== id);
      setSharedNotes(updated);
      saveAndBroadcast({ sharedNotes: updated });
    },
    [saveAndBroadcast, sharedNotes]
  );

  // 8. Shared Songs
  const addSharedSong = useCallback(
    (song: Omit<SharedSong, 'id' | 'createdAt' | 'likes'>) => {
      if (!couple) return;
      const newSong: SharedSong = {
        ...song,
        id: `song_${Date.now()}`,
        likes: [currentUser.id],
        createdAt: new Date().toISOString(),
      };
      const updated = [newSong, ...sharedSongs];
      setSharedSongs(updated);
      saveAndBroadcast({ sharedSongs: updated });
    },
    [couple, currentUser.id, saveAndBroadcast, sharedSongs]
  );

  const likeSong = useCallback(
    (songId: string) => {
      const updated = sharedSongs.map((s) => {
        if (s.id !== songId) return s;
        const exists = s.likes.includes(currentUser.id);
        const likes = exists ? s.likes.filter((id) => id !== currentUser.id) : [...s.likes, currentUser.id];
        return { ...s, likes };
      });
      setSharedSongs(updated);
      saveAndBroadcast({ sharedSongs: updated });
    },
    [currentUser.id, saveAndBroadcast, sharedSongs]
  );

  // 9. Surprises
  const createSurprise = useCallback(
    (surprise: Omit<SurpriseMessage, 'id' | 'isUnlocked' | 'createdAt'>) => {
      if (!couple) return;
      const newSurprise: SurpriseMessage = {
        ...surprise,
        id: `surp_${Date.now()}`,
        isUnlocked: false,
        createdAt: new Date().toISOString(),
      };
      const updated = [newSurprise, ...surprises];
      setSurprises(updated);
      saveAndBroadcast({ surprises: updated });
    },
    [couple, saveAndBroadcast, surprises]
  );

  const unlockSurprise = useCallback(
    (id: string) => {
      const updated = surprises.map((s) =>
        s.id === id ? { ...s, isUnlocked: true, unlockedAt: new Date().toISOString() } : s
      );
      setSurprises(updated);
      saveAndBroadcast({ surprises: updated });
    },
    [saveAndBroadcast, surprises]
  );

  // 10. Games
  const startNewGame = useCallback(
    (gameType: 'would_you_rather' | 'truth_or_dare' | 'couple_quiz' | 'this_or_that') => {
      if (!couple) return;
      const sampleQuestionBank: Record<string, string[]> = {
        would_you_rather: [
          'Would you rather receive 5 handwritten letters or 1 surprise visit next week?',
          'Would you rather be in a video call 24/7 for 3 days or no communication for 24 hours followed by a full weekend date?',
          'Would you rather cook our next dinner in Paris or order room service in bed?',
          'Would you rather have our future home by a quiet misty beach or in a bustling historic downtown?',
          'Would you rather binge our favorite show together across timezones or fall asleep on an open voice call?',
        ],
        truth_or_dare: [
          'Truth: What was the exact second you realized you were falling in love with me?',
          'Truth: What is your favorite thing I do that always makes you smile when you are stressed?',
          'Dare: Send me a 15-second voice note singing the chorus of our song!',
          'Truth: What is one secret future dream you have for us that you haven not told anyone else?',
          'Dare: Change your phone wallpaper to your favorite photo of us for the next 24 hours!',
        ],
        couple_quiz: [
          'What is my go-to comfort order when I am feeling down?',
          'Which airport gate or city represents our most emotional memory?',
          'What was the first gift or handwritten item I ever gave you?',
          'What is my favorite nickname you call me?',
          'If we could instantly teleport somewhere right now for 1 hour, where are we?',
        ],
        this_or_that: [
          'Late Night Deep Talks vs Early Morning Coffee Calls',
          'Spontaneous Weekend Roadtrip vs Planned Luxury Resort',
          'Handwritten Snail Mail vs Surprise Food Delivery Order',
          'Movie Marathon in Pajamas vs Dressed-up Candlelit Dinner',
          'Matching Hoodies vs Sharing Spotify Blend Playlists',
        ],
      };

      const questions = sampleQuestionBank[gameType] || sampleQuestionBank.would_you_rather;

      const newSession: GameSession = {
        id: `game_${Date.now()}`,
        coupleId: couple.id,
        gameType,
        title: gameType.replace(/_/g, ' ').toUpperCase(),
        questions,
        currentIndex: 0,
        answers: {},
        isFinished: false,
      };

      setGameSession(newSession);
      saveAndBroadcast({ gameSession: newSession });
    },
    [couple, saveAndBroadcast]
  );

  const submitGameAnswer = useCallback(
    (questionIndex: number, answer: string) => {
      if (!gameSession) return;
      const updatedAnswers = {
        ...gameSession.answers,
        [questionIndex]: {
          ...(gameSession.answers[questionIndex] || {}),
          [currentUser.id]: answer,
        },
      };

      const isLastQuestion = questionIndex >= gameSession.questions.length - 1;
      const updatedSession: GameSession = {
        ...gameSession,
        answers: updatedAnswers,
        currentIndex: isLastQuestion ? questionIndex : questionIndex + 1,
        isFinished: isLastQuestion,
      };

      setGameSession(updatedSession);
      saveAndBroadcast({ gameSession: updatedSession });
    },
    [currentUser.id, gameSession, saveAndBroadcast]
  );

  // 11. Profile & Settings Updates
  const updateUserProfile = useCallback(
    (updates: Partial<UserProfile>) => {
      const isTargetA = currentUser.id === userA.id;
      const targetUser = isTargetA ? userA : userB;
      const updatedUser: UserProfile = { ...targetUser, ...updates };

      if (isTargetA) {
        setUserA(updatedUser);
      } else {
        setUserB(updatedUser);
      }

      saveAndBroadcast(isTargetA ? { userA: updatedUser } : { userB: updatedUser });
      syncUserToFirestore(updatedUser);

      if (couple) {
        const slot = getCoupleSlot(targetUser.id || firebaseUser?.uid, couple);
        const coupleUpdates: Record<string, any> = {
          updatedAt: new Date().toISOString(),
        };

        if (updates.phoneNumber !== undefined) {
          if (slot === 'partnerA') {
            coupleUpdates.partnerAPhoneNumber = updates.phoneNumber;
          } else {
            coupleUpdates.partnerBPhoneNumber = updates.phoneNumber;
          }
        }

        if (updates.name !== undefined && updates.name.trim()) {
          if (slot === 'partnerA') {
            coupleUpdates.partnerAName = updates.name.trim();
          } else {
            coupleUpdates.partnerBName = updates.name.trim();
          }
        }

        if (updates.avatarUrl !== undefined) {
          if (slot === 'partnerA') {
            coupleUpdates.partnerAAvatar = updates.avatarUrl;
          } else {
            coupleUpdates.partnerBAvatar = updates.avatarUrl;
          }
        }

        if (updates.city !== undefined) {
          if (slot === 'partnerA') {
            coupleUpdates.partnerACity = updates.city;
          } else {
            coupleUpdates.partnerBCity = updates.city;
          }
        }

        if (updates.location !== undefined) {
          if (slot === 'partnerA') {
            coupleUpdates.partnerALocation = updates.location;
          } else {
            coupleUpdates.partnerBLocation = updates.location;
          }
        }

        if (updates.shareLocation !== undefined) {
          if (slot === 'partnerA') {
            coupleUpdates.partnerAShareLocation = updates.shareLocation;
          } else {
            coupleUpdates.partnerBShareLocation = updates.shareLocation;
          }
        }

        if (Object.keys(coupleUpdates).length > 1) {
          const updatedCouple = { ...couple, ...coupleUpdates };
          setCouple(updatedCouple);
          saveAndBroadcast({ couple: updatedCouple });
          syncCoupleToFirestore(updatedCouple);
        }
      }
    },
    [currentUser.id, userA, userB, couple, firebaseUser, saveAndBroadcast]
  );

  const updateCouple = useCallback(
    (updates: Partial<Couple>) => {
      if (!couple) return;
      const updated = { ...couple, ...updates };
      setCouple(updated);
      saveAndBroadcast({ couple: updated });
      syncCoupleToFirestore(updated);
    },
    [couple, saveAndBroadcast]
  );

  // 12. Location Sharing & Privacy for Both Partners (Battery-optimized, hardware-safe GPS watcher)
  const requestLocationPermission = useCallback(
    async (targetSlot: 'current' | 'userA' | 'userB' = 'current'): Promise<boolean> => {
      // Determine target user from stable refs
      const curUserA = userARef.current;
      const curUserB = userBRef.current;
      const curActiveId = activeUserIdRef.current;

      let isTargetA = true;
      if (targetSlot === 'current') {
        isTargetA = curActiveId === curUserA.id;
      } else {
        isTargetA = targetSlot === 'userA';
      }

      const targetUser = isTargetA ? curUserA : curUserB;
      const targetUserId = targetUser.uid || targetUser.id;

      if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
        setLocationError('Geolocation is not supported by your browser.');
        setIsLocating(false);
        return false;
      }

      // CRITICAL: If GPS watcher is ALREADY active, do not tear down and restart!
      // This prevents the GPS location symbol from flashing/thrashing on phone status bars.
      if (locationWatchIdRef.current !== null) {
        setIsLocating(false);
        return true;
      }

      setIsLocating(true);
      setLocationError(null);

      return new Promise<boolean>((resolve) => {
        let hasResolved = false;

        const handleSuccess = async (pos: GeolocationPosition) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const accuracy = pos.coords.accuracy;
          const timestamp = pos.timestamp || Date.now();

          // Distance and time throttling check: only update if moved >= 25m or >= 30s elapsed
          const now = Date.now();
          const last = lastLocationUpdateRef.current;
          const latDiff = Math.abs(lat - last.lat) * 111320;
          const lngDiff = Math.abs(lng - last.lng) * 111320 * Math.cos((lat * Math.PI) / 180);
          const distMeters = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
          const shouldSyncCloud = now - last.time >= 30000 || distMeters >= 25 || last.time === 0;

          // If stationary and within 30 seconds, discard redundant hardware callback to protect battery & avoid state re-render loops
          if (!shouldSyncCloud && last.time !== 0) {
            setIsLocating(false);
            if (!hasResolved) {
              hasResolved = true;
              resolve(true);
            }
            return;
          }

          lastLocationUpdateRef.current = { lat, lng, time: now };

          // Optional Geoapify reverse geocoding only when significant movement or initial
          let addressName: string | null = null;
          if (shouldSyncCloud) {
            try {
              addressName = await reverseGeocodeWithGeoapify(lat, lng);
            } catch (_) {}
          }

          const closestCity = findClosestIndianCity(lat, lng);
          const cityDisplayName =
            addressName || (closestCity ? closestCity.displayName : `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`);
          const cleanCityName = closestCity ? closestCity.name : (addressName || targetUser.city);

          const newLocation: LocationData = {
            latitude: lat,
            longitude: lng,
            city: cityDisplayName,
            country: 'India',
            accuracyMeters: accuracy ? Math.round(accuracy) : undefined,
            source: 'gps',
            updatedAt: new Date(timestamp).toISOString(),
          };

          if (isTargetA) {
            setUserA((prevA) => ({
              ...prevA,
              shareLocation: true,
              city: cleanCityName,
              location: newLocation,
            }));
            syncUserToFirestore({
              ...curUserA,
              shareLocation: true,
              city: cleanCityName,
              location: newLocation,
            });
            if (coupleRef.current) {
              const slot = getCoupleSlot(targetUserId, coupleRef.current);
              syncPartnerLocationToFirestore(
                coupleRef.current.id,
                slot,
                newLocation,
                true,
                cleanCityName
              );
            }
          } else {
            setUserB((prevB) => ({
              ...prevB,
              shareLocation: true,
              city: cleanCityName,
              location: newLocation,
            }));
            syncUserToFirestore({
              ...curUserB,
              shareLocation: true,
              city: cleanCityName,
              location: newLocation,
            });
            if (coupleRef.current) {
              const slot = getCoupleSlot(targetUserId, coupleRef.current);
              syncPartnerLocationToFirestore(
                coupleRef.current.id,
                slot,
                newLocation,
                true,
                cleanCityName
              );
            }
          }

          // Save to Firebase Realtime Database at locations/{userId}
          await saveLiveLocationToRTDB(targetUserId, {
            latitude: lat,
            longitude: lng,
            accuracy: accuracy ? Math.round(accuracy) : 0,
            timestamp,
            sharing: true,
            displayName: targetUser.name,
            address: cityDisplayName,
          });

          setIsLocating(false);
          setLocationError(null);

          if (!hasResolved) {
            hasResolved = true;
            resolve(true);
          }
        };

        const handleError = (err: GeolocationPositionError) => {
          console.warn('Geolocation watchPosition error:', err.message);
          let friendlyMsg = 'Location access was unavailable on this device.';
          if (err.code === 1) {
            friendlyMsg = 'Location permission was denied. Please allow location access in your browser site settings.';
          } else if (err.code === 2) {
            friendlyMsg = 'GPS signal unavailable. Please ensure your device location/GPS is switched on.';
          } else if (err.code === 3) {
            friendlyMsg = 'GPS request timed out. Retrying with device sensors...';
          }
          setLocationError(friendlyMsg);
          setIsLocating(false);

          if (!hasResolved) {
            hasResolved = true;
            resolve(false);
          }
        };

        try {
          locationWatchIdRef.current = navigator.geolocation.watchPosition(
            handleSuccess,
            handleError,
            {
              enableHighAccuracy: true,
              maximumAge: 30000, // 30-second cache prevents GPS chip from turning on and off constantly
              timeout: 20000,
            }
          );
        } catch (watchErr: any) {
          setLocationError('Failed to start GPS tracking: ' + watchErr?.message);
          setIsLocating(false);
          if (!hasResolved) {
            hasResolved = true;
            resolve(false);
          }
        }
      });
    },
    []
  );

  // Activate live continuous GPS tracking safely once on mount if user has location sharing enabled
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      const activeUser = activeUserIdRef.current === userARef.current.id ? userARef.current : userBRef.current;
      if (activeUser?.shareLocation && locationWatchIdRef.current === null) {
        requestLocationPermission('current').catch((err) => {
          console.warn('Auto GPS continuous tracking notice:', err);
        });
      }
    }
  }, [requestLocationPermission]);

  const setPartnerLocationManually = useCallback(
    (
      targetSlot: 'current' | 'userA' | 'userB',
      cityName: string,
      coords?: { latitude: number; longitude: number }
    ) => {
      let isTargetA = true;
      if (targetSlot === 'current') {
        isTargetA = activeUserId === userA.id;
      } else {
        isTargetA = targetSlot === 'userA';
      }

      const matched = findIndianCity(cityName);
      const lat = coords?.latitude ?? matched?.latitude ?? (isTargetA ? 17.3850 : 12.9716);
      const lng = coords?.longitude ?? matched?.longitude ?? (isTargetA ? 78.4867 : 77.5946);
      const displayName = matched?.displayName ?? cityName;
      const cleanCity = matched?.name ?? cityName;

      const newLocation: LocationData = {
        latitude: lat,
        longitude: lng,
        city: displayName,
        country: 'India',
        source: 'city',
        updatedAt: new Date().toISOString(),
      };

      if (isTargetA) {
        const updated = {
          ...userA,
          city: cleanCity,
          shareLocation: true,
          location: newLocation,
        };
        setUserA(updated);
        saveAndBroadcast({ userA: updated });
        syncUserToFirestore(updated);
        if (couple) {
          const slot = getCoupleSlot(userA.id || firebaseUser?.uid, couple);
          syncPartnerLocationToFirestore(couple.id, slot, newLocation, true, cleanCity);
        }
      } else {
        const updated = {
          ...userB,
          city: cleanCity,
          shareLocation: true,
          location: newLocation,
        };
        setUserB(updated);
        saveAndBroadcast({ userB: updated });
        syncUserToFirestore(updated);
        if (couple) {
          const slot = getCoupleSlot(userB.id || firebaseUser?.uid, couple);
          syncPartnerLocationToFirestore(couple.id, slot, newLocation, true, cleanCity);
        }
      }
      setLocationError(null);
    },
    [activeUserId, couple, firebaseUser?.uid, saveAndBroadcast, userA, userB]
  );

  const stopSharingLocation = useCallback(
    (targetSlot: 'current' | 'userA' | 'userB' = 'current') => {
      let isTargetA = true;
      if (targetSlot === 'current') {
        isTargetA = activeUserId === userA.id;
      } else {
        isTargetA = targetSlot === 'userA';
      }

      // Stop continuous GPS watcher
      if (locationWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(locationWatchIdRef.current);
        locationWatchIdRef.current = null;
      }

      const targetUser = isTargetA ? userA : userB;
      const targetUserId = targetUser.uid || targetUser.id;

      // Update Firebase Realtime Database: sharing = false
      saveLiveLocationToRTDB(
        targetUserId,
        {
          latitude: targetUser.location?.latitude || 0,
          longitude: targetUser.location?.longitude || 0,
          accuracy: targetUser.location?.accuracyMeters || 0,
          timestamp: Date.now(),
          sharing: false,
          displayName: targetUser.name,
        },
        true // force update
      );

      if (isTargetA) {
        const updated = { ...userA, shareLocation: false };
        setUserA(updated);
        saveAndBroadcast({ userA: updated });
        syncUserToFirestore(updated);
        if (couple) {
          const slot = getCoupleSlot(userA.id || firebaseUser?.uid, couple);
          syncPartnerLocationToFirestore(couple.id, slot, userA.location, false, userA.city);
        }
      } else {
        const updated = { ...userB, shareLocation: false };
        setUserB(updated);
        saveAndBroadcast({ userB: updated });
        syncUserToFirestore(updated);
        if (couple) {
          const slot = getCoupleSlot(userB.id || firebaseUser?.uid, couple);
          syncPartnerLocationToFirestore(couple.id, slot, userB.location, false, userB.city);
        }
      }
    },
    [activeUserId, couple, firebaseUser?.uid, saveAndBroadcast, userA, userB]
  );

  const stopSharingEverything = useCallback(() => {
    updateUserProfile({
      shareLocation: false,
      location: undefined,
    });
    if (couple) {
      const slot = getCoupleSlot(currentUser.id || firebaseUser?.uid, couple);
      syncPartnerLocationToFirestore(couple.id, slot, undefined, false);
    }
  }, [couple, currentUser.id, firebaseUser?.uid, updateUserProfile]);

  // 13. Emergency Contacts
  const addEmergencyContact = useCallback(
    (contact: Omit<EmergencyContact, 'id'>) => {
      const newContact: EmergencyContact = {
        ...contact,
        id: `emg_${Date.now()}`,
      };
      const updated = [...currentUser.emergencyContacts, newContact];
      updateUserProfile({ emergencyContacts: updated });
    },
    [currentUser.emergencyContacts, updateUserProfile]
  );

  const deleteEmergencyContact = useCallback(
    (id: string) => {
      const updated = currentUser.emergencyContacts.filter((c) => c.id !== id);
      updateUserProfile({ emergencyContacts: updated });
    },
    [currentUser.emergencyContacts, updateUserProfile]
  );

  // 14. Couple Connection by Code (Firestore Cloud-backed)
  const connectCoupleWithCode = useCallback(
    async (code: string): Promise<{ success: boolean; message: string }> => {
      const clean = code.trim().toUpperCase();
      if (!clean || clean.length < 4) {
        return { success: false, message: 'Invalid couple code format. Example: PAIR-4821' };
      }
      if (!firebaseUser) {
        return { success: false, message: 'Please sign in with Google or Email first to link your account with your partner in the cloud.' };
      }
      setIsChatSyncing(true);
      try {
        const res = await pairPartnersWithCode(clean, currentUser);
        setIsChatSyncing(false);
        if (res.success && res.couple) {
          setCouple(res.couple);
          // Start chat fresh for new couple connection
          setMessages([]);
          saveAndBroadcast({ couple: res.couple, messages: [] });
          const partnerUid = res.couple.partnerAId === currentUser.id ? res.couple.partnerBId : res.couple.partnerAId;
          if (partnerUid) {
            const pProfile = await getUserProfile(partnerUid);
            if (pProfile) {
              setUserB(pProfile);
            }
          }
          return { success: true, message: res.message };
        } else {
          return { success: false, message: res.message || 'Could not find that couple code in cloud.' };
        }
      } catch (err: any) {
        setIsChatSyncing(false);
        return { success: false, message: err?.message || 'Connection failed. Please check internet.' };
      }
    },
    [currentUser, firebaseUser, saveAndBroadcast]
  );

  const unlinkCurrentCouple = useCallback(async () => {
    if (couple && currentUser.id) {
      await unlinkCoupleInFirestore(couple.id, currentUser.id);
      const pending = await ensureUserPendingCouple(currentUser);
      setCouple(pending);
      setMessages([]);
      setUserB({
        id: '',
        uid: '',
        name: 'Partner',
        email: '',
        avatarUrl: '/app-logo.svg',
        timeZone: 'Asia/Kolkata',
        anniversaryDate: new Date().toISOString().split('T')[0],
        sleepStartHour: 23,
        sleepEndHour: 7,
        shareLocation: true,
        emergencyContacts: [],
      });
      saveAndBroadcast({ couple: pending, messages: [] });
    }
  }, [couple, currentUser, saveAndBroadcast]);

  const disconnectCouple = useCallback(() => {
    setCouple(null);
    saveAndBroadcast({ couple: null });
  }, [saveAndBroadcast]);

  // 15. Notifications
  const markNotificationRead = useCallback(
    (id: string) => {
      const updated = notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n));
      setNotifications(updated);
      saveAndBroadcast({ notifications: updated });
    },
    [notifications, saveAndBroadcast]
  );

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    saveAndBroadcast({ notifications: [] });
  }, [saveAndBroadcast]);

  // 16. Emergency SOS & Partner Phone Siren
  const triggerEmergencyAlert = useCallback(
    async (customMessage?: string) => {
      const alert: EmergencyAlert = {
        id: `sos_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        coupleId: couple?.id || 'demo_couple',
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderPhone: currentUser.phoneNumber || currentUser.emergencyContacts?.[0]?.phone,
        timestamp: new Date().toISOString(),
        message: customMessage || '🚨 URGENT SOS! Please call or check on me immediately!',
        status: 'active',
        location: currentUser.location
          ? {
              latitude: currentUser.location.latitude,
              longitude: currentUser.location.longitude,
              city: currentUser.city,
              accuracy: currentUser.location.accuracyMeters,
              timestamp: currentUser.location.updatedAt,
            }
          : undefined,
      };

      setActiveEmergencyAlert(alert);
      saveAndBroadcast({ activeEmergencyAlert: alert });

      if (broadcastChannel) {
        broadcastChannel.postMessage({
          type: 'EMERGENCY_SOS_TRIGGERED',
          payload: alert,
        });
      }

      if (couple?.id) {
        await syncEmergencyAlertToFirestore(couple.id, alert);
      }

      // Add emergency notification to log
      const newNotif: AppNotification = {
        id: `notif_${Date.now()}`,
        title: '🚨 Emergency SOS Triggered',
        body: `Ringing ${partnerUser.name}'s phone at full volume with your emergency alert.`,
        timestamp: new Date().toISOString(),
        type: 'emergency',
        isRead: false,
      };
      setNotifications((prev) => [newNotif, ...prev]);
    },
    [currentUser, partnerUser.name, couple?.id, broadcastChannel, saveAndBroadcast]
  );

  const acknowledgeEmergencyAlert = useCallback(
    async (_alertId: string) => {
      const updated: EmergencyAlert | null = activeEmergencyAlert
        ? {
            ...activeEmergencyAlert,
            status: 'acknowledged',
            acknowledgedBy: currentUser.name,
            acknowledgedAt: new Date().toISOString(),
          }
        : null;

      setActiveEmergencyAlert(updated);
      saveAndBroadcast({ activeEmergencyAlert: updated });

      if (broadcastChannel) {
        broadcastChannel.postMessage({
          type: 'EMERGENCY_SOS_ACKNOWLEDGED',
          payload: updated,
        });
      }

      if (couple?.id) {
        await syncEmergencyAlertToFirestore(couple.id, updated);
      }
    },
    [activeEmergencyAlert, currentUser.name, couple?.id, broadcastChannel, saveAndBroadcast]
  );

  const cancelEmergencyAlert = useCallback(
    async (_alertId: string) => {
      setActiveEmergencyAlert(null);
      saveAndBroadcast({ activeEmergencyAlert: null });

      if (broadcastChannel) {
        broadcastChannel.postMessage({
          type: 'EMERGENCY_SOS_CANCELLED',
          payload: null,
        });
      }

      if (couple?.id) {
        await syncEmergencyAlertToFirestore(couple.id, null);
      }
    },
    [couple?.id, broadcastChannel, saveAndBroadcast]
  );

  // 17. Real-Time 2-Device Calling (Voice & Video Calls across partner phones)
  const startCall = useCallback(
    async (mode: 'voice' | 'video') => {
      const callId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const mySessionId = getCallDeviceSessionId();
      const newCall: CallSession = {
        id: callId,
        coupleId: couple?.id || 'demo_couple',
        callerDeviceId: mySessionId,
        callerId: currentUser.id,
        callerName: currentUser.name,
        callerAvatar: currentUser.avatarUrl,
        callerCity: currentUser.city,
        recipientId: partnerUser.id,
        recipientName: partnerUser.name,
        recipientAvatar: partnerUser.avatarUrl,
        recipientCity: partnerUser.city,
        mode,
        status: 'ringing',
        startedAt: new Date().toISOString(),
      };

      setActiveCall(newCall);
      saveAndBroadcast({ activeCall: newCall });

      if (broadcastChannel) {
        broadcastChannel.postMessage({
          type: 'CALL_UPDATE',
          payload: newCall,
        });
      }

      if (couple?.id) {
        await syncActiveCallToFirestore(couple.id, newCall);
      }
    },
    [couple?.id, currentUser, partnerUser, broadcastChannel, saveAndBroadcast]
  );

  const acceptIncomingCall = useCallback(async () => {
    // Only permit explicit answering when status is actively ringing
    if (!activeCall || activeCall.status !== 'ringing') return;
    const updated: CallSession = {
      ...activeCall,
      status: 'connected',
      connectedAt: new Date().toISOString(),
    };

    setActiveCall(updated);
    saveAndBroadcast({ activeCall: updated });

    if (broadcastChannel) {
      broadcastChannel.postMessage({
        type: 'CALL_UPDATE',
        payload: updated,
      });
    }

    if (couple?.id) {
      await syncActiveCallToFirestore(couple.id, updated);
    }
  }, [activeCall, couple?.id, broadcastChannel, saveAndBroadcast]);

  const declineIncomingCall = useCallback(async () => {
    if (!activeCall) return;
    const updated: CallSession = {
      ...activeCall,
      status: 'declined',
      endedAt: new Date().toISOString(),
      endedBy: currentUser.id,
    };

    setActiveCall(updated);
    saveAndBroadcast({ activeCall: updated });

    if (broadcastChannel) {
      broadcastChannel.postMessage({
        type: 'CALL_UPDATE',
        payload: updated,
      });
    }

    if (couple?.id) {
      await syncActiveCallToFirestore(couple.id, updated);
    }

    // Automatically clear call session after 2 seconds
    setTimeout(async () => {
      setActiveCall(null);
      saveAndBroadcast({ activeCall: null });
      if (couple?.id) {
        await syncActiveCallToFirestore(couple.id, null);
      }
    }, 2000);
  }, [activeCall, couple?.id, currentUser.id, broadcastChannel, saveAndBroadcast]);

  const endActiveCall = useCallback(async () => {
    const current = activeCallRef.current;
    if (!current) return;
    // Guard: Prevent double-ending or loop when call is already ended/declined
    if (current.status === 'ended' || current.status === 'declined') return;

    const durationSec = current.connectedAt
      ? Math.max(0, Math.floor((Date.now() - new Date(current.connectedAt).getTime()) / 1000))
      : 0;

    const updated: CallSession = {
      ...current,
      status: 'ended',
      endedAt: new Date().toISOString(),
      endedBy: currentUser.id,
      durationSec,
    };

    activeCallRef.current = updated;
    setActiveCall(updated);
    saveAndBroadcast({ activeCall: updated });

    if (broadcastChannel) {
      broadcastChannel.postMessage({
        type: 'CALL_UPDATE',
        payload: updated,
      });
    }

    if (couple?.id) {
      await syncActiveCallToFirestore(couple.id, updated);
    }

    // Automatically record sweet call log in chat - EXACTLY ONCE per call ID
    const callLogKey = `logged_call_${current.id}`;
    const alreadyLoggedSession =
      typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(callLogKey) : null;
    const alreadyLoggedMemory = recordedCallLogsRef.current.has(current.id);

    if (!alreadyLoggedSession && !alreadyLoggedMemory) {
      recordedCallLogsRef.current.add(current.id);
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(callLogKey, 'true');
      }

      try {
        const durationStr =
          durationSec > 0
            ? `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`
            : current.status === 'connected' ? '0m 1s' : 'Missed Call';
        const callTitle = current.mode === 'video' ? '📹 Video Call' : '📞 Voice Call';
        await sendMessage(
          `${callTitle} · ${durationStr}`,
          undefined,
          'call',
          undefined,
          undefined,
          {
            mode: current.mode,
            durationSec,
            status: durationSec > 0 ? 'completed' : 'missed',
          }
        );
      } catch (logErr) {
        console.debug('Call log auto-save notice:', logErr);
      }
    }

    // Clean up call session from Firestore after 2.5 seconds
    setTimeout(async () => {
      setActiveCall(null);
      activeCallRef.current = null;
      saveAndBroadcast({ activeCall: null });
      if (couple?.id) {
        await syncActiveCallToFirestore(couple.id, null);
      }
    }, 2500);
  }, [couple?.id, currentUser.id, broadcastChannel, saveAndBroadcast, sendMessage]);

  const updateCallSession = useCallback(
    async (updates: Partial<CallSession>) => {
      const current = activeCallRef.current;
      if (!current) return;
      const updated: CallSession = {
        ...current,
        ...updates,
      };
      if (updates.iceCandidatesCaller && current.iceCandidatesCaller) {
        updated.iceCandidatesCaller = Array.from(new Set([...current.iceCandidatesCaller, ...updates.iceCandidatesCaller]));
      }
      if (updates.iceCandidatesRecipient && current.iceCandidatesRecipient) {
        updated.iceCandidatesRecipient = Array.from(new Set([...current.iceCandidatesRecipient, ...updates.iceCandidatesRecipient]));
      }
      activeCallRef.current = updated;
      setActiveCall(updated);
      saveAndBroadcast({ activeCall: updated });
      if (broadcastChannel) {
        broadcastChannel.postMessage({
          type: 'CALL_UPDATE',
          payload: updated,
        });
      }
      if (couple?.id) {
        await syncCallUpdatesToFirestore(couple.id, updates);
      }
    },
    [couple?.id, broadcastChannel, saveAndBroadcast]
  );

  const sendCallReaction = useCallback(
    async (emoji: string) => {
      if (!activeCall) return;
      await updateCallSession({
        reaction: { emoji, timestamp: Date.now() },
      });
    },
    [activeCall, updateCallSession]
  );

  // Auto-timeout unanswered calls after 45 seconds (prevents indefinite ringing)
  useEffect(() => {
    if (!activeCall || activeCall.status !== 'ringing') return;
    const timeout = window.setTimeout(() => {
      endActiveCall();
    }, 45000);
    return () => clearTimeout(timeout);
  }, [activeCall?.id, activeCall?.status, endActiveCall]);

  // Clean up active call on window/tab close so it never lingers in Firestore
  useEffect(() => {
    const handleClose = () => {
      if (activeCall && couple?.id) {
        syncActiveCallToFirestore(couple.id, null);
      }
    };
    window.addEventListener('beforeunload', handleClose);
    window.addEventListener('pagehide', handleClose);
    return () => {
      window.removeEventListener('beforeunload', handleClose);
      window.removeEventListener('pagehide', handleClose);
    };
  }, [activeCall, couple?.id]);

  // Reset to default sample data
  const resetAllDemoData = useCallback(() => {
    setUserA(DEFAULT_USER_A);
    setUserB(DEFAULT_USER_B);
    setCouple(DEFAULT_COUPLE);
    setMessages(DEFAULT_MESSAGES);
    setMoods(DEFAULT_MOODS);
    setMemories(DEFAULT_MEMORIES);
    setEvents(DEFAULT_EVENTS);
    setVirtualDates(DEFAULT_VIRTUAL_DATES);
    setSharedSongs(DEFAULT_SONGS);
    setSharedNotes(DEFAULT_NOTES);
    setSurprises(DEFAULT_SURPRISES);
    setNotifications(DEFAULT_NOTIFICATIONS);
    setGameSession(null);
    setActiveUserId('user_teja_1');
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const loginWithGoogle = useCallback(async () => {
    return await fbLoginWithGoogle();
  }, []);

  const loginWithEmail = useCallback(async (email: string, pass: string) => {
    return await fbLoginWithEmail(email, pass);
  }, []);

  const registerWithEmail = useCallback(async (email: string, pass: string, name?: string) => {
    return await fbRegisterWithEmail(email, pass, name);
  }, []);

  const logOutFirebase = useCallback(async () => {
    try {
      await fbLogOut();
      setFirebaseUser(null);
      setIsDemoMode(false);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('betweenus_demo_mode');
      }
      setCouple(null);
      setMessages([]);
    } catch (err) {
      console.warn('Logout notice:', err);
    }
  }, []);

  return (
    <AppContext.Provider
      value={{
        firebaseUser,
        isAuthLoading,
        pendingInviteCode,
        isFirebaseConnected,
        firebaseProjectId,
        isDemoMode,
        isPartnerPaired,
        enterDemoMode,
        exitDemoMode,
        pairWithPartnerCode: connectCoupleWithCode,
        unlinkCurrentCouple,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        logOutFirebase,
        currentUser,
        partnerUser,
        couple,
        messages,
        moods,
        memories,
        events,
        virtualDates,
        gameSession,
        sharedSongs,
        sharedNotes,
        surprises,
        notifications,
        activeTab,
        setActiveTab,
        quickLoveBurst,
        isOnline,
        isChatSyncing,
        chatError,
        switchActiveUser,
        sendMessage,
        deleteMessage,
        clearChatMessages,
        toggleMessageReaction,
        sendQuickLove,
        logMood,
        addMemory,
        likeMemory,
        addEvent,
        deleteEvent,
        toggleDateCompleted,
        addVirtualDate,
        saveSharedNote,
        deleteSharedNote,
        addSharedSong,
        likeSong,
        createSurprise,
        unlockSurprise,
        submitGameAnswer,
        startNewGame,
        updateUserProfile,
        updateCouple,
        isLocating,
        rtdbPartnerLocation,
        locationError,
        clearLocationError,
        requestLocationPermission,
        setPartnerLocationManually,
        stopSharingLocation,
        stopSharingEverything,
        addEmergencyContact,
        deleteEmergencyContact,
        connectCoupleWithCode,
        disconnectCouple,
        markNotificationRead,
        clearAllNotifications,
        resetAllDemoData,
        activeEmergencyAlert,
        triggerEmergencyAlert,
        acknowledgeEmergencyAlert,
        cancelEmergencyAlert,
        activeCall,
        startCall,
        acceptIncomingCall,
        declineIncomingCall,
        endActiveCall,
        updateCallSession,
        sendCallReaction,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
