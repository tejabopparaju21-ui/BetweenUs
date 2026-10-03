/**
 * Realtime Location Synchronization Service for BetweenUs
 * 
 * Supports:
 * - Firebase Realtime Database (RTDB) sync at `locations/{userId}`
 * - High-accuracy GPS watchPosition() with distance/time throttling
 * - Partner live location listeners (onValue)
 * - Geoapify Map Tiles configuration and optional Reverse Geocoding
 */

import { rtdb, auth } from './firebase';
import { ref, set, onValue, off, get } from 'firebase/database';
import { calculateDistanceKm } from '../utils/distance';

export interface LiveLocationRecord {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  sharing: boolean;
  userId: string;
  displayName: string;
  address?: string;
  updatedAt?: string;
}

// Configurable update throttling defaults
export const LOCATION_CONFIG = {
  MIN_DISTANCE_METERS: 5,     // Only write if moved >= 5 meters
  MIN_TIME_INTERVAL_MS: 5000, // Or if >= 5 seconds have passed
  GEOAPIFY_MIN_MOVE_METERS: 100, // Reverse geocode only after 100m movement
};

// Internal throttling state tracking
let lastSavedLocation: { latitude: number; longitude: number } | null = null;
let lastSavedTime = 0;
let lastGeocodedLocation: { latitude: number; longitude: number } | null = null;
let cachedAddress: string | null = null;

/**
 * Checks whether an update satisfies the distance or time throttling criteria
 */
export function shouldUpdateLocation(
  newLat: number,
  newLng: number,
  force = false,
  minDistMeters = LOCATION_CONFIG.MIN_DISTANCE_METERS,
  minTimeMs = LOCATION_CONFIG.MIN_TIME_INTERVAL_MS
): boolean {
  if (force || !lastSavedLocation) return true;

  const now = Date.now();
  const timeDiff = now - lastSavedTime;
  if (timeDiff >= minTimeMs) return true;

  const distKm = calculateDistanceKm(
    lastSavedLocation.latitude,
    lastSavedLocation.longitude,
    newLat,
    newLng
  );
  const distMeters = distKm * 1000;

  return distMeters >= minDistMeters;
}

/**
 * Saves current user's live location to Firebase Realtime Database at locations/{userId}
 */
export async function saveLiveLocationToRTDB(
  userId: string,
  data: Omit<LiveLocationRecord, 'userId'>,
  force = false
): Promise<boolean> {
  if (!userId) return false;

  // Check throttling unless stopping or forced
  if (data.sharing && !shouldUpdateLocation(data.latitude, data.longitude, force)) {
    return false;
  }

  const payload: LiveLocationRecord = {
    ...data,
    userId,
    timestamp: data.timestamp || Date.now(),
    updatedAt: new Date().toISOString(),
  };

  try {
    if (rtdb) {
      const locationRef = ref(rtdb, `locations/${userId}`);
      await set(locationRef, payload);
    }

    if (data.sharing) {
      lastSavedLocation = { latitude: data.latitude, longitude: data.longitude };
      lastSavedTime = Date.now();
    } else {
      lastSavedLocation = null;
      lastSavedTime = 0;
    }

    return true;
  } catch (err: any) {
    console.warn('Realtime Database save notice (permission or connection):', err?.message);
    return false;
  }
}

/**
 * Listens to a partner's live location from Firebase Realtime Database
 */
export function subscribeToPartnerLocationRTDB(
  partnerUserId: string,
  onLocationUpdate: (location: LiveLocationRecord | null) => void,
  onError?: (err: Error) => void
): () => void {
  if (!partnerUserId || !rtdb) {
    return () => {};
  }

  const locationRef = ref(rtdb, `locations/${partnerUserId}`);

  const unsubscribe = onValue(
    locationRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val() as LiveLocationRecord;
        onLocationUpdate(val);
      } else {
        onLocationUpdate(null);
      }
    },
    (err) => {
      console.warn('Partner RTDB location listener notice:', err);
      if (onError) onError(err);
    }
  );

  return () => {
    try {
      off(locationRef);
    } catch (_) {}
  };
}

/**
 * Geoapify Reverse Geocoding Helper
 * Converts latitude/longitude to a human-readable address
 */
export async function reverseGeocodeWithGeoapify(
  latitude: number,
  longitude: number,
  apiKey?: string
): Promise<string | null> {
  const key = apiKey || import.meta.env.VITE_GEOAPIFY_API_KEY;
  if (!key || key === 'YOUR_GEOAPIFY_API_KEY') {
    return null;
  }

  // Check cache if moved less than 100 meters
  if (lastGeocodedLocation && cachedAddress) {
    const distKm = calculateDistanceKm(
      lastGeocodedLocation.latitude,
      lastGeocodedLocation.longitude,
      latitude,
      longitude
    );
    if (distKm * 1000 < LOCATION_CONFIG.GEOAPIFY_MIN_MOVE_METERS) {
      return cachedAddress;
    }
  }

  try {
    const url = `https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&apiKey=${key}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    if (data && data.features && data.features.length > 0) {
      const props = data.features[0].properties;
      const formatted = props.formatted || `${props.city || props.county || ''}, ${props.state || ''}, ${props.country || ''}`;
      cachedAddress = formatted;
      lastGeocodedLocation = { latitude, longitude };
      return formatted;
    }
    return null;
  } catch (err) {
    console.debug('Geoapify reverse geocoding notice:', err);
    return null;
  }
}
