/**
 * Verified Official National Emergency Numbers
 * Per safety guidelines, never invent emergency numbers.
 */

export interface CountryEmergencyData {
  country: string;
  code: string;
  general: string;
  police?: string;
  ambulance?: string;
  fire?: string;
  notes?: string;
}

export const VERIFIED_EMERGENCY_NUMBERS: Record<string, CountryEmergencyData> = {
  IN: {
    country: 'India',
    code: 'IN',
    general: '112', // India's unified national emergency number
    police: '100',
    ambulance: '102',
    fire: '101',
    notes: '112 is the single emergency response support system (ERSS) across India.',
  },
  US: {
    country: 'United States',
    code: 'US',
    general: '911',
    police: '911',
    ambulance: '911',
    fire: '911',
  },
  GB: {
    country: 'United Kingdom',
    code: 'GB',
    general: '999',
    police: '999',
    ambulance: '999',
    fire: '999',
    notes: '112 also routes to 999 on all UK networks.',
  },
  CA: {
    country: 'Canada',
    code: 'CA',
    general: '911',
  },
  AU: {
    country: 'Australia',
    code: 'AU',
    general: '000',
  },
  EU: {
    country: 'European Union',
    code: 'EU',
    general: '112',
  },
  DE: {
    country: 'Germany',
    code: 'DE',
    general: '112',
    police: '110',
    ambulance: '112',
  },
  FR: {
    country: 'France',
    code: 'FR',
    general: '112',
    police: '17',
    ambulance: '15',
    fire: '18',
  },
  JP: {
    country: 'Japan',
    code: 'JP',
    general: '110',
    police: '110',
    ambulance: '119',
    fire: '119',
  },
  SG: {
    country: 'Singapore',
    code: 'SG',
    general: '995',
    police: '999',
    ambulance: '995',
  },
  OTHER: {
    country: 'International Standard',
    code: 'OTHER',
    general: '112',
    notes: '112 is the global GSM mobile standard recognized by cell networks worldwide.',
  },
};

export function getEmergencyNumberForCountry(countryCode?: string): CountryEmergencyData {
  if (!countryCode) return VERIFIED_EMERGENCY_NUMBERS.OTHER;
  const upper = countryCode.toUpperCase();
  return VERIFIED_EMERGENCY_NUMBERS[upper] || VERIFIED_EMERGENCY_NUMBERS.OTHER;
}
