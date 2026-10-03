/**
 * Curated Indian Cities and Indian Standard Time (IST) Utilities
 * Exclusively designed for couples across India.
 */

export interface IndianCity {
  name: string;
  state: string;
  displayName: string;
  latitude: number;
  longitude: number;
}

export const INDIAN_CITIES: IndianCity[] = [
  { name: 'Hyderabad', state: 'Telangana', displayName: 'Hyderabad, Telangana', latitude: 17.3850, longitude: 78.4867 },
  { name: 'Bengaluru', state: 'Karnataka', displayName: 'Bengaluru, Karnataka', latitude: 12.9716, longitude: 77.5946 },
  { name: 'Mumbai', state: 'Maharashtra', displayName: 'Mumbai, Maharashtra', latitude: 19.0760, longitude: 72.8777 },
  { name: 'Delhi', state: 'Delhi NCR', displayName: 'Delhi / NCR, Delhi', latitude: 28.6139, longitude: 77.2090 },
  { name: 'Pune', state: 'Maharashtra', displayName: 'Pune, Maharashtra', latitude: 18.5204, longitude: 73.8567 },
  { name: 'Chennai', state: 'Tamil Nadu', displayName: 'Chennai, Tamil Nadu', latitude: 13.0827, longitude: 80.2707 },
  { name: 'Kolkata', state: 'West Bengal', displayName: 'Kolkata, West Bengal', latitude: 22.5726, longitude: 88.3639 },
  { name: 'Ahmedabad', state: 'Gujarat', displayName: 'Ahmedabad, Gujarat', latitude: 23.0225, longitude: 72.5714 },
  { name: 'Jaipur', state: 'Rajasthan', displayName: 'Jaipur, Rajasthan', latitude: 26.9124, longitude: 75.7873 },
  { name: 'Chandigarh', state: 'Punjab/Haryana', displayName: 'Chandigarh (Tricity)', latitude: 30.7333, longitude: 76.7794 },
  { name: 'Lucknow', state: 'Uttar Pradesh', displayName: 'Lucknow, Uttar Pradesh', latitude: 26.8467, longitude: 80.9462 },
  { name: 'Kochi', state: 'Kerala', displayName: 'Kochi, Kerala', latitude: 9.9312, longitude: 76.2673 },
  { name: 'Indore', state: 'Madhya Pradesh', displayName: 'Indore, Madhya Pradesh', latitude: 22.7196, longitude: 75.8577 },
  { name: 'Bhopal', state: 'Madhya Pradesh', displayName: 'Bhopal, Madhya Pradesh', latitude: 23.2599, longitude: 77.4126 },
  { name: 'Visakhapatnam', state: 'Andhra Pradesh', displayName: 'Visakhapatnam, Andhra Pradesh', latitude: 17.6868, longitude: 83.2185 },
  { name: 'Coimbatore', state: 'Tamil Nadu', displayName: 'Coimbatore, Tamil Nadu', latitude: 11.0168, longitude: 76.9558 },
  { name: 'Surat', state: 'Gujarat', displayName: 'Surat, Gujarat', latitude: 21.1702, longitude: 72.8311 },
  { name: 'Bhubaneswar', state: 'Odisha', displayName: 'Bhubaneswar, Odisha', latitude: 20.2961, longitude: 85.8245 },
  { name: 'Patna', state: 'Bihar', displayName: 'Patna, Bihar', latitude: 25.5941, longitude: 85.1376 },
  { name: 'Guwahati', state: 'Assam', displayName: 'Guwahati, Assam', latitude: 26.1445, longitude: 91.7362 },
  { name: 'Goa', state: 'Goa', displayName: 'Goa (Panaji / Candolim)', latitude: 15.4909, longitude: 73.8278 },
  { name: 'Nagpur', state: 'Maharashtra', displayName: 'Nagpur, Maharashtra', latitude: 21.1458, longitude: 79.0882 },
  { name: 'Vadodara', state: 'Gujarat', displayName: 'Vadodara, Gujarat', latitude: 22.3072, longitude: 73.1812 },
  { name: 'Thiruvananthapuram', state: 'Kerala', displayName: 'Thiruvananthapuram, Kerala', latitude: 8.5241, longitude: 76.9366 },
  { name: 'Dehradun', state: 'Uttarakhand', displayName: 'Dehradun, Uttarakhand', latitude: 30.3165, longitude: 78.0322 },
];

/**
 * Finds Indian City by name or approximate match
 */
export function findIndianCity(query: string): IndianCity | undefined {
  if (!query) return undefined;
  const q = query.toLowerCase().trim();
  return INDIAN_CITIES.find(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.displayName.toLowerCase().includes(q) ||
      q.includes(c.name.toLowerCase())
  );
}

/**
 * Finds the closest Indian city from raw GPS coordinates
 */
export function findClosestIndianCity(lat: number, lng: number): IndianCity {
  const toRad = (v: number) => (v * Math.PI) / 180;
  let closest = INDIAN_CITIES[0];
  let minDistance = Infinity;

  for (const city of INDIAN_CITIES) {
    const dLat = toRad(city.latitude - lat);
    const dLng = toRad(city.longitude - lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat)) * Math.cos(toRad(city.latitude)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = 6371 * c;
    if (dist < minDistance) {
      minDistance = dist;
      closest = city;
    }
  }
  return closest;
}

/**
 * Always formats date in Indian Standard Time (IST, UTC +05:30)
 */
export function formatISTTime(date: Date = new Date(), options?: { withSeconds?: boolean }): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      minute: '2-digit',
      second: options?.withSeconds ? '2-digit' : undefined,
      hour12: true,
    }).format(date);
  } catch {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

/**
 * Formats full Indian date & time (e.g., "02 Oct, 10:45 PM IST")
 */
export function formatISTDateTime(date: Date | string | number): string {
  try {
    const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(d) + ' IST';
  } catch {
    return String(date);
  }
}

/**
 * Indian Hours list for Sleep/Awake schedule selection (12-hour AM/PM format)
 */
export const INDIAN_HOURS_12H = [
  { hour: 0, label: '12:00 AM (Midnight)' },
  { hour: 1, label: '1:00 AM (Late night)' },
  { hour: 2, label: '2:00 AM' },
  { hour: 3, label: '3:00 AM' },
  { hour: 4, label: '4:00 AM (Early dawn)' },
  { hour: 5, label: '5:00 AM (Dawn)' },
  { hour: 6, label: '6:00 AM (Sunrise)' },
  { hour: 7, label: '7:00 AM (Morning chai)' },
  { hour: 8, label: '8:00 AM' },
  { hour: 9, label: '9:00 AM (Work starts)' },
  { hour: 10, label: '10:00 AM' },
  { hour: 11, label: '11:00 AM' },
  { hour: 12, label: '12:00 PM (Noon)' },
  { hour: 13, label: '1:00 PM (Lunch time)' },
  { hour: 14, label: '2:00 PM' },
  { hour: 15, label: '3:00 PM' },
  { hour: 16, label: '4:00 PM (Afternoon tea)' },
  { hour: 17, label: '5:00 PM (Wrap-up)' },
  { hour: 18, label: '6:00 PM (Evening commute)' },
  { hour: 19, label: '7:00 PM' },
  { hour: 20, label: '8:00 PM (Dinner)' },
  { hour: 21, label: '9:00 PM' },
  { hour: 22, label: '10:00 PM (Couple call time)' },
  { hour: 23, label: '11:00 PM (Bedtime)' },
];
