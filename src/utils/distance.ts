/**
 * Utilities for calculating geographic distance, time differences, and sleep/awake status
 */

/**
 * Calculates Great-Circle distance between two coordinates using the Haversine formula
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function kmToMiles(km: number): number {
  return Math.round(km * 0.621371);
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Returns formatted time difference string between user and partner timezones
 */
export function getTimeDifferenceDescription(userTz: string, partnerTz: string): {
  diffHours: number;
  description: string;
} {
  try {
    const now = new Date();
    const userDateStr = now.toLocaleString('en-US', { timeZone: userTz });
    const partnerDateStr = now.toLocaleString('en-US', { timeZone: partnerTz });

    const userDate = new Date(userDateStr);
    const partnerDate = new Date(partnerDateStr);

    const diffMs = partnerDate.getTime() - userDate.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));

    if (diffHours === 0) {
      return { diffHours: 0, description: 'Same Time Zone (IST • Indian Standard Time)' };
    } else if (diffHours > 0) {
      return {
        diffHours,
        description: `${diffHours} hr${diffHours > 1 ? 's' : ''} ahead of you`,
      };
    } else {
      const abs = Math.abs(diffHours);
      return {
        diffHours,
        description: `${abs} hr${abs > 1 ? 's' : ''} behind you`,
      };
    }
  } catch {
    return { diffHours: 0, description: 'Indian Standard Time (IST)' };
  }
}

export interface IndianDailyRhythm {
  phase: string;
  emoji: string;
  tagline: string;
  suggestedAction: string;
  callRecommended: boolean;
  timeRange: string;
}

/**
 * Returns current Indian daily phase and optimal couple connection timing
 */
export function getIndianDailyRhythm(date: Date = new Date()): IndianDailyRhythm {
  const istString = date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const istDate = new Date(istString);
  const hour = istDate.getHours();
  const minute = istDate.getMinutes();
  const timeVal = hour + minute / 60;

  if (timeVal >= 6.5 && timeVal < 9.5) {
    return {
      phase: 'Morning Chai & Warm Texts ☕',
      emoji: '☕',
      tagline: 'Morning across India. Start the day with a loving message.',
      suggestedAction: 'Send a quick selfie with your morning chai or a 10s voice note!',
      callRecommended: false,
      timeRange: '6:30 AM - 9:30 AM IST',
    };
  } else if (timeVal >= 9.5 && timeVal < 13.5) {
    return {
      phase: 'Work & College Hours 💼',
      emoji: '💻',
      tagline: 'Deep focus hours in the city. Subtle love pings keep each other energized.',
      suggestedAction: 'Send a gentle "Thinking of you" ping before lunchtime meetings.',
      callRecommended: false,
      timeRange: '9:30 AM - 1:30 PM IST',
    };
  } else if (timeVal >= 13.5 && timeVal < 15.0) {
    return {
      phase: 'Lunch Dabba & Quick Check-in 🍱',
      emoji: '🍱',
      tagline: 'Lunch break across Indian offices. Time to share what you are having!',
      suggestedAction: 'Hop on a 5-minute lunch audio call or share your food pic.',
      callRecommended: true,
      timeRange: '1:30 PM - 3:00 PM IST',
    };
  } else if (timeVal >= 15.0 && timeVal < 18.0) {
    return {
      phase: 'Afternoon Sprint ⚡',
      emoji: '⏳',
      tagline: 'Wrapping up workday tasks before the evening talk.',
      suggestedAction: 'Send a motivational hug or heart burst for the afternoon stretch.',
      callRecommended: false,
      timeRange: '3:00 PM - 6:00 PM IST',
    };
  } else if (timeVal >= 18.0 && timeVal < 20.5) {
    return {
      phase: 'Evening Chai, Samosas & Commute 🌆',
      emoji: '🌆',
      tagline: 'Metro/traffic commute or evening cutting chai break.',
      suggestedAction: 'Send voice notes sharing highlights and venting about traffic.',
      callRecommended: true,
      timeRange: '6:00 PM - 8:30 PM IST',
    };
  } else if (timeVal >= 20.5 && timeVal < 22.0) {
    return {
      phase: 'Dinner & Family Time 🍛',
      emoji: '🍛',
      tagline: 'Hot dinner with family or roommates.',
      suggestedAction: 'Text when you are wrapping up dinner so you can jump on a call.',
      callRecommended: false,
      timeRange: '8:30 PM - 10:00 PM IST',
    };
  } else if (timeVal >= 22.0 || timeVal < 1.0) {
    return {
      phase: 'Prime Couple Call Time & Night Talks 🌙',
      emoji: '❤️',
      tagline: 'The most special hour. Uninterrupted deep talks across the miles.',
      suggestedAction: 'Start a long video call, play couple games, or fall asleep together.',
      callRecommended: true,
      timeRange: '10:00 PM - 1:00 AM IST',
    };
  } else {
    return {
      phase: 'Peaceful Sleep Under the Indian Sky 💤',
      emoji: '🌙',
      tagline: 'Resting safely. Tomorrow brings you one day closer.',
      suggestedAction: 'Leave a sweet surprise message for them to wake up to in the morning.',
      callRecommended: false,
      timeRange: '1:00 AM - 6:30 AM IST',
    };
  }
}

/**
 * Gets formatted local time in a specified timezone (e.g., "10:45 PM")
 */
export function getLocalTimeFormatted(timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date());
  } catch {
    return '--:--';
  }
}

/**
 * Determines whether partner is likely awake or asleep based on configured schedule
 */
export function isPartnerSleeping(
  partnerTz: string,
  sleepStartHour: number = 23,
  sleepEndHour: number = 7
): boolean {
  try {
    const now = new Date();
    const partnerDateStr = now.toLocaleString('en-US', { timeZone: partnerTz });
    const partnerDate = new Date(partnerDateStr);
    const hour = partnerDate.getHours();

    if (sleepStartHour > sleepEndHour) {
      // Over midnight, e.g. 23:00 to 07:00
      return hour >= sleepStartHour || hour < sleepEndHour;
    } else {
      // e.g. 01:00 to 09:00
      return hour >= sleepStartHour && hour < sleepEndHour;
    }
  } catch {
    return false;
  }
}

/**
 * Calculates days together from anniversary date
 */
export function getDaysTogether(anniversaryDateString: string): number {
  try {
    const start = new Date(anniversaryDateString).getTime();
    const now = new Date().getTime();
    const diffTime = Math.max(0, now - start);
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
  }
}

/**
 * Calculates countdown breakdown { days, hours, minutes, seconds, isPast } to target date
 */
export function getCountdownBreakdown(targetDateString: string): {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
  totalHours: number;
} {
  try {
    const target = new Date(targetDateString).getTime();
    const now = new Date().getTime();
    const diff = target - now;

    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true, totalHours: 0 };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    const totalHours = Math.floor(diff / (1000 * 60 * 60));

    return { days, hours, minutes, seconds, isPast: false, totalHours };
  } catch {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true, totalHours: 0 };
  }
}

/**
 * Returns Indian travel estimates between two cities
 */
export function getIndianTravelComparison(km: number): string {
  if (km <= 0) return 'Together in the same city ❤️';
  if (km < 100) return `~${km} km • A quick drive or local train ride away`;
  if (km < 350) return `~${km} km • ~4-5 hrs via Vande Bharat Express or road trip`;
  if (km < 800) return `~${km} km • ~1 hr 15m domestic flight or overnight train`;
  if (km < 1500) return `~${km} km • ~2 hrs non-stop flight or scenic railway journey`;
  return `~${km} km • ~2.5 hrs flight across India`;
}

