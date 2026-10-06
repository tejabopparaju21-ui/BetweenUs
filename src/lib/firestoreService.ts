/**
 * Firestore Real-Time Cloud Synchronization Service for BetweenUs
 */
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  arrayUnion,
  writeBatch,
} from 'firebase/firestore';
import {
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  User as FirebaseUser,
} from 'firebase/auth';
import { db, auth, googleProvider } from './firebase';
import { ChatMessage, MoodEntry, MemoryItem, Couple, UserProfile, LocationData, EmergencyAlert, CallSession } from '../types';

let currentAuthUser: FirebaseUser | null = null;
let isAuthReady = false;
const authListeners: Array<(user: FirebaseUser | null) => void> = [];

// Initialize Auth State Listener
onAuthStateChanged(auth, (user) => {
  currentAuthUser = user;
  isAuthReady = true;
  authListeners.forEach((fn) => fn(user));
});

export function subscribeToAuth(callback: (user: FirebaseUser | null) => void) {
  authListeners.push(callback);
  if (isAuthReady) {
    callback(currentAuthUser);
  }
  return () => {
    const idx = authListeners.indexOf(callback);
    if (idx > -1) authListeners.splice(idx, 1);
  };
}

export function getCurrentAuthUser(): FirebaseUser | null {
  return currentAuthUser || auth.currentUser;
}

export async function loginWithGoogle() {
  try {
    const res = await signInWithPopup(auth, googleProvider);
    return { success: true, user: res.user };
  } catch (err: any) {
    console.warn('Google sign-in error:', err);
    return { success: false, error: err.message };
  }
}

export async function loginWithEmail(email: string, pass: string) {
  try {
    const res = await signInWithEmailAndPassword(auth, email, pass);
    return { success: true, user: res.user };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function registerWithEmail(email: string, pass: string) {
  try {
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    return { success: true, user: res.user };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function tryAnonymousAuth() {
  try {
    const res = await signInAnonymously(auth);
    return { success: true, user: res.user };
  } catch (err: any) {
    console.info('Anonymous auth notice:', err.code);
    return { success: false, error: err.message };
  }
}

export async function logOut() {
  try {
    await fbSignOut(auth);
  } catch (err) {
    console.error('Logout error:', err);
  }
}

// ----------------- FIRESTORE SYNC & SANITIZATION -----------------

/**
 * Deeply strips undefined values from objects so Firestore setDoc never throws
 */
export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        // preserve Firestore FieldValues (like serverTimestamp() or arrayUnion())
        if (typeof (value as any)._methodName === 'string') {
          result[key] = value;
        } else {
          result[key] = sanitizeForFirestore(value);
        }
      } else {
        result[key] = value;
      }
    }
  }
  return result;
}

/**
 * Sync Couple Data to Firestore
 */
export async function syncCoupleToFirestore(couple: Couple): Promise<void> {
  if (!auth.currentUser) {
    return;
  }
  try {
    const coupleRef = doc(db, 'couples', couple.id);
    const members = Array.from(new Set([couple.partnerAId, couple.partnerBId].filter(Boolean)));
    const sanitized = sanitizeForFirestore({
      ...couple,
      members,
      partnerUids: members,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(coupleRef, sanitized, { merge: true });
    console.debug('Firestore: couple synced successfully', couple.id);
  } catch (err) {
    console.warn('Firestore couple sync notice:', err);
  }
}

/**
 * Fast sync for live partner location updates on the couple document
 */
export async function syncPartnerLocationToFirestore(
  coupleId: string,
  partnerSlot: 'partnerA' | 'partnerB',
  location: LocationData | undefined,
  shareLocation: boolean,
  city?: string
): Promise<void> {
  if (!coupleId || !auth.currentUser) return;
  try {
    const coupleRef = doc(db, 'couples', coupleId);
    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };
    if (partnerSlot === 'partnerA') {
      updates.partnerAShareLocation = shareLocation;
      if (location) updates.partnerALocation = sanitizeForFirestore(location);
      if (city) updates.partnerACity = city;
    } else {
      updates.partnerBShareLocation = shareLocation;
      if (location) updates.partnerBLocation = sanitizeForFirestore(location);
      if (city) updates.partnerBCity = city;
    }
    await setDoc(coupleRef, updates, { merge: true });
    console.debug('Firestore: partner live location synced', partnerSlot, location);
  } catch (err) {
    console.warn('Firestore location sync notice:', err);
  }
}

/**
 * Fast sync for emergency SOS alerts on the couple document
 */
export async function syncEmergencyAlertToFirestore(
  coupleId: string,
  alert: EmergencyAlert | null
): Promise<void> {
  if (!coupleId || !auth.currentUser) return;
  try {
    const coupleRef = doc(db, 'couples', coupleId);
    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString(),
      activeEmergencyAlert: alert ? sanitizeForFirestore(alert) : null,
    };
    await setDoc(coupleRef, updates, { merge: true });
    console.debug('Firestore: emergency SOS alert synced to couple', alert);
  } catch (err) {
    console.warn('Firestore emergency sync notice:', err);
  }
}

/**
/**
 * Generate a unique 6-character clean couple pairing code
 */
export function generateCoupleCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `PAIR-${suffix}`;
}

/**
 * Get or create User Profile in Firestore
 */
export async function getOrCreateUserProfile(firebaseUser: FirebaseUser): Promise<UserProfile> {
  const userRef = doc(db, 'users', firebaseUser.uid);
  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      // Ensure coupleCode exists
      if (!data.coupleCode) {
        data.coupleCode = generateCoupleCode();
        await setDoc(userRef, { coupleCode: data.coupleCode }, { merge: true });
      }
      return data;
    }
  } catch (err) {
    console.warn('Error reading user profile:', err);
  }

  // Create new profile for newly authenticated user
  const newCode = generateCoupleCode();
  const newProfile: UserProfile = {
    id: firebaseUser.uid,
    uid: firebaseUser.uid,
    name: firebaseUser.displayName || 'You',
    email: firebaseUser.email || '',
    avatarUrl: firebaseUser.photoURL || '/app-logo.svg',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
    city: 'Hyderabad',
    country: 'IN',
    anniversaryDate: new Date().toISOString().split('T')[0],
    sleepStartHour: 23,
    sleepEndHour: 7,
    shareLocation: true,
    emergencyContacts: [],
    coupleCode: newCode,
  };

  try {
    await setDoc(userRef, sanitizeForFirestore(newProfile));
  } catch (err) {
    console.warn('Error creating user profile in Firestore:', err);
  }
  return newProfile;
}

/**
 * Get User Profile by ID
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (!userId) return null;
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (err) {
    console.warn('getUserProfile notice:', err);
    return null;
  }
}

/**
 * Listen to User Document
 */
export function listenToUserDoc(
  userId: string,
  callback: (user: UserProfile | null) => void
): () => void {
  if (!userId) return () => {};
  const userRef = doc(db, 'users', userId);
  return onSnapshot(
    userRef,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as UserProfile);
      } else {
        callback(null);
      }
    },
    (err) => {
      console.warn('listenToUserDoc notice:', err);
    }
  );
}

/**
 * Find couple in Firestore by couple code
 */
export async function findCoupleByCode(code: string): Promise<Couple | null> {
  try {
    const cleanCode = code.trim().toUpperCase();
    const q = query(collection(db, 'couples'), where('code', '==', cleanCode), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data() as Couple;
    }
    // Direct document ID fallback
    const directDoc = await getDoc(doc(db, 'couples', `couple_${cleanCode.replace(/[^A-Z0-9]/g, '')}`));
    if (directDoc.exists()) {
      return directDoc.data() as Couple;
    }
    return null;
  } catch (err) {
    console.warn('findCoupleByCode notice:', err);
    return null;
  }
}

/**
 * Find an existing couple for a user by their UID
 */
export async function findCoupleForUser(userId: string): Promise<Couple | null> {
  if (!userId) return null;
  try {
    // 1. Check if user document specifies coupleId
    const userSnap = await getDoc(doc(db, 'users', userId));
    if (userSnap.exists()) {
      const uData = userSnap.data() as UserProfile;
      if (uData.coupleId) {
        const cSnap = await getDoc(doc(db, 'couples', uData.coupleId));
        if (cSnap.exists()) {
          return cSnap.data() as Couple;
        }
      }
    }

    // 2. Query couples by members array
    const q1 = query(collection(db, 'couples'), where('members', 'array-contains', userId), limit(1));
    const s1 = await getDocs(q1);
    if (!s1.empty) {
      return s1.docs[0].data() as Couple;
    }

    // 3. Fallback check partnerAId / partnerBId
    const q2 = query(collection(db, 'couples'), where('partnerAId', '==', userId), limit(1));
    const s2 = await getDocs(q2);
    if (!s2.empty) {
      return s2.docs[0].data() as Couple;
    }

    const q3 = query(collection(db, 'couples'), where('partnerBId', '==', userId), limit(1));
    const s3 = await getDocs(q3);
    if (!s3.empty) {
      return s3.docs[0].data() as Couple;
    }

    return null;
  } catch (err) {
    console.warn('findCoupleForUser notice:', err);
    return null;
  }
}

/**
 * Ensure user has an initialized pending couple space with their personal code
 */
export async function ensureUserPendingCouple(user: UserProfile): Promise<Couple> {
  const code = user.coupleCode || generateCoupleCode();
  const coupleId = `couple_${code.replace(/[^A-Z0-9]/g, '')}`;
  const coupleRef = doc(db, 'couples', coupleId);

  try {
    const snap = await getDoc(coupleRef);
    if (snap.exists()) {
      return snap.data() as Couple;
    }
  } catch (err) {
    console.warn('ensureUserPendingCouple read notice:', err);
  }

  const pendingCouple: Couple = {
    id: coupleId,
    code,
    partnerAId: user.id,
    partnerAName: user.name || 'You',
    partnerBId: '',
    partnerBName: '',
    status: 'waiting_for_partner',
    members: [user.id],
    partnerUids: [user.id],
    relationshipName: user.name ? `${user.name}'s Haven` : 'Our Haven',
    anniversaryDate: user.anniversaryDate || new Date().toISOString().split('T')[0],
    nextMeetingDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    nextMeetingTitle: 'Our Next Reunion',
    meetingLocation: 'To be decided ❤️',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await setDoc(coupleRef, sanitizeForFirestore(pendingCouple));
    // Also save coupleId on user
    await setDoc(doc(db, 'users', user.id), { coupleId, coupleCode: code }, { merge: true });
  } catch (err) {
    console.warn('ensureUserPendingCouple set notice:', err);
  }

  return pendingCouple;
}

/**
 * Link two accounts together using a couple code
 * Person two can link with person one using the couple code of either person.
 */
export async function pairPartnersWithCode(
  inputCode: string,
  currentUser: UserProfile
): Promise<{ success: boolean; couple?: Couple; message: string }> {
  try {
    const cleanCode = inputCode.trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, message: 'Please enter a valid couple code.' };
    }

    if (currentUser.coupleCode && cleanCode === currentUser.coupleCode.toUpperCase()) {
      return {
        success: false,
        message: 'This is your own couple code! Please enter your partner\'s code to link with them.',
      };
    }

    // 1. Look for existing couple with this code
    let couple = await findCoupleByCode(cleanCode);

    // 2. If not found in couples, check if another user has this coupleCode
    if (!couple) {
      const userQ = query(collection(db, 'users'), where('coupleCode', '==', cleanCode), limit(1));
      const userSnap = await getDocs(userQ);
      if (!userSnap.empty) {
        const partnerUserData = userSnap.docs[0].data() as UserProfile;
        const coupleId = `couple_${cleanCode.replace(/[^A-Z0-9]/g, '')}`;
        couple = {
          id: coupleId,
          code: cleanCode,
          partnerAId: partnerUserData.id,
          partnerAName: partnerUserData.name,
          partnerBId: '',
          partnerBName: '',
          status: 'waiting_for_partner',
          members: [partnerUserData.id],
          partnerUids: [partnerUserData.id],
          relationshipName: `${partnerUserData.name}'s Haven`,
          anniversaryDate: partnerUserData.anniversaryDate || new Date().toISOString().split('T')[0],
          nextMeetingDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          nextMeetingTitle: 'Our Next Reunion',
          meetingLocation: 'To be decided ❤️',
          createdAt: new Date().toISOString(),
        };
      }
    }

    if (!couple) {
      return {
        success: false,
        message: `No couple space found for code "${cleanCode}". Make sure your partner has signed in and shared their exact code.`,
      };
    }

    // Check if the couple already has 2 different partners
    const isAlreadyMember = couple.partnerAId === currentUser.id || couple.partnerBId === currentUser.id;
    if (!isAlreadyMember && couple.partnerAId && couple.partnerBId && couple.partnerBId !== '') {
      return {
        success: false,
        message: 'This couple space is already paired with two partners.',
      };
    }

    if (!auth.currentUser) {
      return {
        success: false,
        message: 'Please sign in with Google or Email first so your account can be linked to your partner in the cloud.',
      };
    }

    // Connect this user as partnerB (or partnerA if empty)
    if (couple.partnerAId === currentUser.id) {
      // User is already partnerA in this couple
      return {
        success: true,
        couple,
        message: 'You are already in this couple space. Share this code with your partner to join you!',
      };
    }

    // Pair currentUser as partnerB
    couple.partnerBId = currentUser.id;
    couple.partnerBName = currentUser.name;
    couple.status = 'paired';
    const partnerName = couple.partnerAName || 'Partner';
    couple.relationshipName = `${partnerName} & ${currentUser.name}`;

    const members = Array.from(new Set([couple.partnerAId, currentUser.id].filter(Boolean)));
    couple.members = members;
    couple.partnerUids = members;
    couple.updatedAt = new Date().toISOString();

    // Commit couple update to Firestore
    await setDoc(doc(db, 'couples', couple.id), sanitizeForFirestore(couple), { merge: true });

    // Update currentUser's user profile with the active coupleId
    try {
      await setDoc(doc(db, 'users', currentUser.id), { coupleId: couple.id, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (uErr) {
      console.warn('Notice updating currentUser coupleId:', uErr);
    }

    // Attempt to update partner's user profile, but never let a permissions restriction on another user's doc block the pairing
    if (couple.partnerAId && couple.partnerAId !== currentUser.id) {
      try {
        await setDoc(doc(db, 'users', couple.partnerAId), { coupleId: couple.id, updatedAt: new Date().toISOString() }, { merge: true });
      } catch (pErr) {
        console.debug('Notice updating partner profile coupleId (partner automatically syncs via couple listener):', pErr);
      }
    }

    return {
      success: true,
      couple,
      message: `Successfully linked with ${partnerName}! Welcome to your private haven.`,
    };
  } catch (err: any) {
    console.error('pairPartnersWithCode error:', err);
    return { success: false, message: err?.message || 'Failed to connect couple.' };
  }
}

/**
 * Unlink / Leave Couple Space
 */
export async function unlinkCoupleInFirestore(
  coupleId: string,
  userId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const coupleRef = doc(db, 'couples', coupleId);
    const snap = await getDoc(coupleRef);
    if (snap.exists()) {
      const couple = snap.data() as Couple;
      if (couple.partnerBId === userId) {
        couple.partnerBId = '';
        couple.partnerBName = '';
        couple.status = 'waiting_for_partner';
        couple.members = [couple.partnerAId];
        couple.partnerUids = [couple.partnerAId];
      } else if (couple.partnerAId === userId && couple.partnerBId) {
        couple.partnerAId = couple.partnerBId;
        couple.partnerAName = couple.partnerBName;
        couple.partnerBId = '';
        couple.partnerBName = '';
        couple.status = 'waiting_for_partner';
        couple.members = [couple.partnerAId];
        couple.partnerUids = [couple.partnerAId];
      }
      couple.updatedAt = new Date().toISOString();
      await setDoc(coupleRef, sanitizeForFirestore(couple), { merge: true });
    }

    // Reset coupleId on user
    await setDoc(doc(db, 'users', userId), { coupleId: null }, { merge: true });
    return { success: true, message: 'Unlinked from couple space.' };
  } catch (err: any) {
    console.error('unlinkCoupleInFirestore error:', err);
    return { success: false, message: err?.message || 'Failed to unlink.' };
  }
}

/**
 * Join or connect to couple in Firestore using a partner code (legacy wrapper)
 */
export async function joinCoupleInFirestore(
  code: string,
  userId: string,
  userName?: string
): Promise<{ success: boolean; couple?: Couple; message: string }> {
  const dummyProfile: UserProfile = {
    id: userId,
    uid: userId,
    name: userName || 'Partner',
    email: '',
    avatarUrl: '/app-logo.svg',
    timeZone: 'Asia/Kolkata',
    anniversaryDate: '2024-02-14',
    sleepStartHour: 23,
    sleepEndHour: 7,
    shareLocation: true,
    emergencyContacts: [],
  };
  return pairPartnersWithCode(code, dummyProfile);
}

/**
 * Real-Time Listener for Couple Document (updates partner connection in real time)
 */
export function listenToCoupleDoc(
  coupleId: string,
  onUpdate: (couple: Couple) => void
) {
  if (!coupleId || !auth.currentUser) return () => {};

  try {
    const coupleRef = doc(db, 'couples', coupleId);
    return onSnapshot(
      coupleRef,
      (snapshot) => {
        if (snapshot.exists()) {
          onUpdate(snapshot.data() as Couple);
        }
      },
      (error) => {
        console.debug('Couple doc listener notice:', error.message);
      }
    );
  } catch (err) {
    console.debug('Failed to set up couple listener:', err);
    return () => {};
  }
}

/**
 * Sync User Profile to Firestore
 */
export async function syncUserToFirestore(user: UserProfile) {
  if (!auth.currentUser || auth.currentUser.uid !== user.id) {
    return;
  }
  try {
    const userRef = doc(db, 'users', user.id);
    await setDoc(userRef, sanitizeForFirestore({ ...user, uid: user.id }), { merge: true });
    console.debug('Firestore: user profile synced', user.id);
  } catch (err) {
    console.warn('Firestore user sync notice:', err);
  }
}

/**
 * Sync Message to Firestore Subcollection: couples/{coupleId}/messages/{messageId}
 * Enforces authenticated senderId and serverTimestamp()
 */
export async function syncMessageToFirestore(
  coupleId: string,
  message: ChatMessage
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      const errText = 'Authentication required. Please sign in to send messages.';
      console.warn('syncMessageToFirestore aborted:', errText);
      return { success: false, error: errText };
    }

    // Pre-check: Ensure the parent couple document exists in Firestore
    try {
      const coupleRef = doc(db, 'couples', coupleId);
      const coupleSnap = await getDoc(coupleRef);
      if (!coupleSnap.exists()) {
        const dynamicCode = coupleId.startsWith('couple_') ? coupleId.replace('couple_', '') : generateCoupleCode();
        await setDoc(coupleRef, {
          id: coupleId,
          code: dynamicCode,
          partnerAId: currentUser.uid,
          partnerAName: currentUser.displayName || 'Partner 1',
          partnerBId: '',
          members: [currentUser.uid],
          partnerUids: [currentUser.uid],
          relationshipName: 'Our Sanctuary',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else {
        const cData = coupleSnap.data();
        if (
          cData.partnerAId === 'user_teja_1' ||
          !cData.members ||
          !cData.members.includes(currentUser.uid)
        ) {
          const members = Array.from(new Set([...(cData.members || []), currentUser.uid].filter(Boolean)));
          await setDoc(
            coupleRef,
            {
              members,
              partnerUids: members,
              partnerAId: (cData.partnerAId === 'user_teja_1' || !cData.partnerAId) ? currentUser.uid : cData.partnerAId,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        }
      }
    } catch (coupleErr) {
      console.debug('Couple pre-sync check notice:', coupleErr);
    }

    const cleanMessage = sanitizeForFirestore({
      ...message,
      senderId: currentUser.uid, // Strictly use authenticated UID
      type: message.type || message.mediaType || 'text',
      status: message.status || 'sent',
      readBy: Array.from(new Set([...(message.readBy || []), currentUser.uid])),
      timestamp: serverTimestamp(),
      createdAt: message.createdAt || new Date().toISOString(),
    });

    const msgRef = doc(db, 'couples', coupleId, 'messages', message.id);
    await setDoc(msgRef, cleanMessage, { merge: true });
    return { success: true };
  } catch (err: any) {
    console.error('Firestore message sync error:', {
      errorCode: err?.code,
      errorMessage: err?.message,
      currentUserUid: auth.currentUser?.uid,
      coupleId,
      path: `couples/${coupleId}/messages/${message.id}`,
    });
    return {
      success: false,
      error: err?.message?.includes('permission')
        ? 'Missing or insufficient permissions. Please check that you are logged in and part of this couple.'
        : 'Message could not be sent. Please check your connection and couple connection.',
    };
  }
}

/**
 * Mark Message as Read by reader in Firestore
 */
export async function markMessageAsReadInFirestore(
  coupleId: string,
  messageId: string,
  readerUid: string
): Promise<void> {
  try {
    if (!auth.currentUser || !readerUid || !coupleId || !messageId) return;
    const msgRef = doc(db, 'couples', coupleId, 'messages', messageId);
    await setDoc(
      msgRef,
      {
        status: 'read',
        readBy: arrayUnion(readerUid),
      },
      { merge: true }
    );
  } catch (err) {
    console.debug('markMessageAsRead notice:', err);
  }
}

/**
 * Delete Message in Firestore
 */
export async function deleteMessageFromFirestore(coupleId: string, messageId: string) {
  if (!auth.currentUser) return;
  try {
    const msgRef = doc(db, 'couples', coupleId, 'messages', messageId);
    await deleteDoc(msgRef);
  } catch (err) {
    console.warn('Firestore message delete notice:', err);
  }
}

/**
 * Clear All Messages in Firestore for Couple
 */
export async function clearMessagesFromFirestore(coupleId: string) {
  if (!auth.currentUser) return;
  try {
    const q = query(collection(db, 'couples', coupleId, 'messages'));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return;
    const batch = writeBatch(db);
    snapshot.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  } catch (err) {
    console.warn('Firestore clear messages notice:', err);
  }
}

/**
 * Sync Mood to Firestore Subcollection: couples/{coupleId}/moods/{moodId}
 */
export async function syncMoodToFirestore(coupleId: string, mood: MoodEntry) {
  if (!auth.currentUser) return;
  try {
    const moodRef = doc(db, 'couples', coupleId, 'moods', mood.id);
    await setDoc(moodRef, sanitizeForFirestore(mood), { merge: true });
  } catch (err) {
    console.warn('Firestore mood sync notice:', err);
  }
}

/**
 * Sync Memory to Firestore Subcollection: couples/{coupleId}/memories/{memoryId}
 */
export async function syncMemoryToFirestore(coupleId: string, memory: MemoryItem) {
  if (!auth.currentUser) return;
  try {
    const memRef = doc(db, 'couples', coupleId, 'memories', memory.id);
    await setDoc(memRef, sanitizeForFirestore(memory), { merge: true });
  } catch (err) {
    console.warn('Firestore memory sync notice:', err);
  }
}

/**
 * Real-Time Listener for Couple Messages
 * Emits full array of messages in chronological order (oldest -> newest)
 */
export function listenToCoupleMessages(
  coupleId: string,
  onUpdate: (messages: ChatMessage[]) => void,
  onError?: (err: Error) => void
) {
  if (!coupleId || !auth.currentUser) {
    return () => {};
  }

  try {
    const msgsColl = collection(db, 'couples', coupleId, 'messages');
    let msgsQuery: any;
    try {
      msgsQuery = query(msgsColl, orderBy('createdAt', 'asc'), limit(250));
    } catch {
      msgsQuery = query(msgsColl, limit(250));
    }

    let isFallbackActive = false;
    let activeUnsub: (() => void) | null = null;

    const parseAndEmit = (snapshot: any) => {
      const list: ChatMessage[] = [];
      snapshot.forEach((docSnap: any) => {
        const data = docSnap.data() as any;
        let createdAtStr = data.createdAt;
        if (!createdAtStr && data.timestamp && typeof data.timestamp.toDate === 'function') {
          createdAtStr = data.timestamp.toDate().toISOString();
        }
        list.push({
          ...data,
          id: docSnap.id,
          status: data.status || 'sent',
          readBy: data.readBy || [data.senderId],
          createdAt: createdAtStr || new Date().toISOString(),
        } as ChatMessage);
      });
      // Sort in memory to guarantee perfect chronological order
      list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      onUpdate(list);
    };

    activeUnsub = onSnapshot(
      msgsQuery,
      parseAndEmit,
      (error) => {
        console.warn('Firestore messages snapshot listener notice:', error.message);
        // Fallback to unindexed query if index is missing or building
        if (!isFallbackActive && (error.code === 'failed-precondition' || error.message?.includes('index'))) {
          isFallbackActive = true;
          try {
            if (activeUnsub) activeUnsub();
            const fallbackQuery = query(msgsColl, limit(250));
            activeUnsub = onSnapshot(fallbackQuery, parseAndEmit, (fallbackErr) => {
              console.warn('Fallback messages listener notice:', fallbackErr.message);
              if (onError) onError(fallbackErr);
            });
            return;
          } catch (e) {
            console.warn('Error setting up fallback listener:', e);
          }
        }
        if (onError) onError(error);
      }
    );

    return () => {
      if (activeUnsub) activeUnsub();
    };
  } catch (err: any) {
    console.warn('Failed to set up messages listener:', err);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Real-Time Listener for Couple Moods
 */
export function listenToCoupleMoods(
  coupleId: string,
  onUpdate: (moods: MoodEntry[]) => void
) {
  if (!coupleId || !auth.currentUser) return () => {};
  try {
    const moodsQuery = query(
      collection(db, 'couples', coupleId, 'moods'),
      orderBy('timestamp', 'desc'),
      limit(30)
    );

    return onSnapshot(
      moodsQuery,
      (snapshot) => {
        const list: MoodEntry[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as MoodEntry);
        });
        onUpdate(list);
      },
      (error) => {
        console.debug('Firestore moods snapshot listener notice:', error.message);
      }
    );
  } catch (err) {
    console.debug('Failed to set up moods listener:', err);
    return () => {};
  }
}

/**
 * Real-Time Listener for Couple Memories
 */
export function listenToCoupleMemories(
  coupleId: string,
  onUpdate: (memories: MemoryItem[]) => void
) {
  if (!coupleId || !auth.currentUser) return () => {};
  try {
    const memQuery = query(
      collection(db, 'couples', coupleId, 'memories'),
      orderBy('date', 'desc'),
      limit(50)
    );

    return onSnapshot(
      memQuery,
      (snapshot) => {
        const list: MemoryItem[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as MemoryItem);
        });
        onUpdate(list);
      },
      (error) => {
        console.debug('Firestore memories snapshot listener notice:', error.message);
      }
    );
  } catch (err) {
    console.debug('Failed to set up memories listener:', err);
    return () => {};
  }
}


/**
 * Sync Active Call Session to Firestore Couple Document (Real-Time 2-Device Calling)
 */
export async function syncActiveCallToFirestore(
  coupleId: string,
  call: CallSession | null
): Promise<void> {
  if (!coupleId) return;
  try {
    const coupleRef = doc(db, 'couples', coupleId);
    await setDoc(
      coupleRef,
      {
        activeCall: call ? sanitizeForFirestore(call) : null,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn('syncActiveCallToFirestore notice:', err);
  }
}
