import { LocationCoordinates } from '@/types';
import { lookupLocation } from './imls-db';

// Earth radius in miles
const EARTH_RADIUS_MILES = 3958.8;

export function calculateDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_MILES * c;
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Geocodes any query nationwide:
 * 1. Checks the federal IMLS public library database index for instant (<1ms) city / ZIP resolution.
 * 2. Falls back to OpenStreetMap Nominatim for specific street addresses, landmarks, or parks.
 */
export async function geocodeLocation(query: string): Promise<LocationCoordinates | null> {
  const cleanQuery = query.trim();
  if (!cleanQuery) return null;

  // 1. Direct lookup from the federal IMLS database
  const dbMatch = lookupLocation(cleanQuery);
  if (dbMatch) {
    return dbMatch;
  }

  // 2. Fallback to OpenStreetMap Nominatim for arbitrary street addresses or specific locations
  try {
    const encoded = encodeURIComponent(cleanQuery);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&countrycodes=us&limit=1&q=${encoded}`,
      {
        headers: {
          'User-Agent': 'StorytimeRadar/1.0 (local-community-events-app)',
        },
        signal: AbortSignal.timeout(4000),
      }
    );

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const item = data[0];
        const parts = item.display_name.split(',').map((s: string) => s.trim());
        return {
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          displayName: parts.slice(0, 3).join(', '),
        };
      }
    }
  } catch (err) {
    console.warn('Nominatim geocode failed or timed out:', err);
  }

  return null;
}
