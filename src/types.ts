/**
 * Types & Interfaces for BetweenUs Long-Distance Couple Companion
 */

export interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  accuracyMeters?: number;
  source?: 'gps' | 'city' | 'manual';
  updatedAt: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
  email?: string;
}

export interface UserProfile {
  id: string;
  uid?: string;
  name: string;
  email: string;
  phoneNumber?: string;
  avatarUrl: string;
  birthDate?: string;
  timeZone: string;
  city?: string;
  country?: string;
  anniversaryDate: string;
  sleepStartHour: number; // e.g., 23 (11 PM)
  sleepEndHour: number;   // e.g., 7 (7 AM)
  shareLocation: boolean;
  location?: LocationData;
  emergencyContacts: EmergencyContact[];
  currentMoodId?: string;
  coupleCode?: string;
  coupleId?: string;
}

export interface Couple {
  id: string;
  code: string; // e.g. "PAIR-4821"
  partnerAId: string;
  partnerBId: string;
  partnerAName?: string;
  partnerBName?: string;
  status?: 'paired' | 'waiting_for_partner';
  members?: string[];
  partnerUids?: string[];
  relationshipName: string;
  anniversaryDate: string;
  nextMeetingDate: string;
  nextMeetingTitle: string;
  meetingLocation: string;
  createdAt: string;
  updatedAt?: string;
  // Live partner locations synchronized across devices in real time
  partnerALocation?: LocationData;
  partnerBLocation?: LocationData;
  partnerAShareLocation?: boolean;
  partnerBShareLocation?: boolean;
  partnerACity?: string;
  partnerBCity?: string;
  // Real-time active call session between the couple
  activeCall?: CallSession | null;
}

export interface CallSession {
  id: string;
  coupleId: string;
  callerDeviceId?: string;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  callerCity?: string;
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string;
  recipientCity?: string;
  mode: 'voice' | 'video';
  status: 'ringing' | 'connected' | 'declined' | 'ended' | 'missed';
  startedAt: string;
  connectedAt?: string;
  endedAt?: string;
  endedBy?: string;
  durationSec?: number;
  sdpOffer?: string;
  sdpAnswer?: string;
  iceCandidatesCaller?: string[];
  iceCandidatesRecipient?: string[];
  reaction?: { emoji: string; timestamp: number };
}

export type QuickLoveType = 'love_you' | 'hug' | 'kiss' | 'miss_you' | 'thinking_of_you';

export interface LoveTap {
  id: string;
  senderId: string;
  type: QuickLoveType;
  label: string;
  emoji: string;
  timestamp: string;
}

export interface MessageReaction {
  userId: string;
  emoji: string;
}

export interface ChatMessage {
  id: string;
  coupleId: string;
  senderId: string;
  senderName: string;
  text: string;
  type?: 'text' | 'image' | 'video' | 'voice' | 'love_tap' | 'call';
  status?: 'sent' | 'delivered' | 'read';
  timestamp?: any;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'voice' | 'love_tap' | 'call';
  voiceDurationSec?: number;
  callData?: {
    mode: 'voice' | 'video';
    durationSec: number;
    status: 'completed' | 'missed';
  };
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  };
  reactions: MessageReaction[];
  readBy: string[];
  createdAt: string;
}

export type MoodType =
  | 'happy'
  | 'loved'
  | 'peaceful'
  | 'normal'
  | 'sad'
  | 'lonely'
  | 'angry'
  | 'stressed'
  | 'missing_partner';

export interface MoodEntry {
  id: string;
  coupleId: string;
  userId: string;
  userName: string;
  moodType: MoodType;
  note?: string;
  timestamp: string;
}

export interface MemoryItem {
  id: string;
  coupleId: string;
  title: string;
  description: string;
  date: string;
  mediaUrl: string;
  mediaType?: 'image' | 'video';
  category: 'first_message' | 'first_call' | 'first_meeting' | 'first_trip' | 'anniversary' | 'special_moment';
  locationName?: string;
  addedById: string;
  addedByName: string;
  likesCount: number;
}

export interface EventItem {
  id: string;
  coupleId: string;
  title: string;
  category: 'birthday' | 'anniversary' | 'first_meeting' | 'next_meeting' | 'exam' | 'work' | 'holiday' | 'custom';
  date: string;
  reminderDaysBefore: number;
  notes?: string;
  icon?: string;
}

export interface VirtualDateIdea {
  id: string;
  title: string;
  description: string;
  category: string;
  durationMinutes: number;
  prepItems: string[];
  connectionPrompt: string;
  iconEmoji: string;
  completed?: boolean;
  completedAt?: string;
}

export interface GameAnswer {
  userId: string;
  answer: string;
}

export interface GameSession {
  id: string;
  coupleId: string;
  gameType: 'would_you_rather' | 'truth_or_dare' | 'couple_quiz' | 'this_or_that';
  title: string;
  questions: string[];
  currentIndex: number;
  answers: Record<number, Record<string, string>>; // questionIndex -> userId -> answer
  isFinished: boolean;
}

export interface SharedSong {
  id: string;
  coupleId: string;
  addedById: string;
  addedByName: string;
  title: string;
  artist: string;
  dedicationNote: string;
  audioSampleUrl: string;
  coverUrl: string;
  likes: string[];
  createdAt: string;
}

export interface SharedNote {
  id: string;
  coupleId: string;
  title: string;
  content: string;
  category: 'bucket_list' | 'future_travel' | 'love_list' | 'date_ideas' | 'general';
  lastEditedById: string;
  lastEditedByName: string;
  updatedAt: string;
}

export interface SurpriseMessage {
  id: string;
  coupleId: string;
  creatorId: string;
  creatorName: string;
  recipientId: string;
  title: string;
  message: string;
  mediaUrl?: string;
  unlockType: 'date' | 'condition';
  unlockDate?: string;
  conditionText?: string;
  isUnlocked: boolean;
  unlockedAt?: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  type: 'love_tap' | 'message' | 'mood' | 'date' | 'surprise' | 'emergency';
  isRead: boolean;
}

export interface EmergencyAlert {
  id: string;
  coupleId: string;
  senderId: string;
  senderName: string;
  senderPhone?: string;
  timestamp: string;
  message?: string;
  status: 'active' | 'acknowledged' | 'cancelled';
  location?: {
    latitude: number;
    longitude: number;
    city?: string;
    accuracy?: number;
    timestamp?: string;
  };
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  phoneBattery?: number;
}

