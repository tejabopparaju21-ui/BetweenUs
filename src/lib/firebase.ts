import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, getFirestore, doc, getDocFromServer, Firestore } from 'firebase/firestore';
import { getDatabase, Database } from 'firebase/database';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Named database support for AI Studio provisioned Firestore with ignoreUndefinedProperties
let firestoreDb: Firestore;
try {
  firestoreDb = initializeFirestore(
    app,
    { ignoreUndefinedProperties: true },
    firebaseConfig.firestoreDatabaseId || '(default)'
  );
} catch (e) {
  // If already initialized, fallback to getFirestore
  firestoreDb = firebaseConfig.firestoreDatabaseId
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);
}

// Validate Connection to Firestore per Firebase Skill
async function testConnection() {
  try {
    await getDocFromServer(doc(firestoreDb, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

/**
 * Validates candidate Realtime Database URLs.
 * Guards against fatal errors when an environment variable is unassigned, malformed, or injected with an API key.
 */
function parseValidRtdbUrl(url: unknown): string | null {
  if (typeof url !== 'string' || !url.trim()) return null;
  const trimmed = url.trim();
  // Valid Firebase RTDB URLs must start with https:// and point to .firebaseio.com or .firebasedatabase.app
  if (/^https?:\/\/[a-z0-9][a-z0-9-]*\.(firebaseio\.com|[a-z0-9-]+\.firebasedatabase\.app)(\/.*)?$/i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

// Firebase Realtime Database (optional for live GPS updates; only enabled if an instance is explicitly configured)
let realtimeDb: Database | null = null;
try {
  const envUrl = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_FIREBASE_DATABASE_URL : null;
  const candidateUrl =
    parseValidRtdbUrl((firebaseConfig as any).databaseURL) ||
    parseValidRtdbUrl(envUrl);

  if (candidateUrl) {
    realtimeDb = getDatabase(app, candidateUrl);
  }
} catch (err) {
  console.debug('Firebase Realtime Database optional init notice:', err);
  realtimeDb = null;
}

export const db = firestoreDb;
export const rtdb = realtimeDb;
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
